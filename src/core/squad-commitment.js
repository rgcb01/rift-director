/* Team-level objective allocation: one common pre-movement decision.
 * Reserve a reachable squad for an existing call, without taking a
 * required defender, abandoning an immediately actionable siege or
 * altering any objective timer, graph edge or combat result.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const unavailable=new Set(['retreat','recall_channel','recall_recover','shop_recall','dead','siege_return','recover']);
const laneOf=p=>p.role==='ADC'||p.role==='SUP'?'BOT':p.role;
const lanes=['TOP','MID','BOT'];
function plan({nav,world,minute,health={},dead={}}){
 const N=core.Navigation,out={};
 if(minute<22||minute>55||nav.siegeDecision?.stage===3)return out;
 for(const teamId of [nav.a,nav.b]){
  const call=nav.neutralPlans?.[teamId],side=teamId===nav.a?'blue':'red',foe=teamId===nav.a?nav.b:nav.a;
  if(!call||!['take','contest'].includes(call.action)||!['dragon_pit','baron_pit'].includes(call.target)||
     minute>call.until||Object.values(world.lanes?.[teamId]||{}).some(s=>s===3))continue;
  const spawn=call.target==='dragon_pit'?world.nextDragon:world.nextBaron;
  if(call.targetSpawn!==spawn||spawn>call.until||spawn>minute+3)continue;
  const vision=world.map?.riverVision?.[teamId]??50;
  if(vision<43)continue;
  const squad=Object.values(nav.agents).filter(p=>p.teamId===teamId);
  const model={teamIds:[nav.a,nav.b],lanes:world.waves};
  const siege=nav.siegeDecision?.teamId===teamId?nav.siegeDecision:null;
  const protectedIds=new Set();
  if(siege?.sidePlan?.actorId)protectedIds.add(siege.sidePlan.actorId);
  // Reserve two actual near-tower escorts when the wave can be hit now.
  // A distant siege proposal is not an automatic veto on a live objective.
  if(siege&&siege.wave>=.48&&siege.stage<3){
   const tower=N.towerNode(foe===nav.a?'blue':'red',siege.lane,siege.stage+1);
   const local=squad.filter(p=>p.alive&&siege.escorts.includes(p.id)&&
    !unavailable.has(p.intent)&&(health[p.id]??100)>=60&&N.combatRange(p.node,tower,1))
    .sort((a,b)=>N.hops(a.node,tower)-N.hops(b.node,tower)||a.id.localeCompare(b.id));
   if(local.length>=2)for(const p of local.slice(0,2))protectedIds.add(p.id);
  }
  for(const p of squad){
   if(nav.structureDefense?.members?.some(m=>m.id===p.id))protectedIds.add(p.id);
   const lane=laneOf(p);
   if(!lanes.includes(lane)||!world.waves?.[lane])continue;
   const wave=core.LaneEconomy.pressureFor(model,teamId,lane);
   if(p.intent==='defend'&&wave<=-.9||p.role==='TOP'&&wave>=1.45)protectedIds.add(p.id);
  }
  const candidates=[];
  for(const p of squad){
   const hp=health[p.id]??100,lane=laneOf(p);
   if(!p.alive||(dead[p.id]||0)>minute||unavailable.has(p.intent)||hp<60||protectedIds.has(p.id)||
      [side+'_fountain',side+'_nexus'].includes(p.node))continue;
   const wave=lanes.includes(lane)&&world.waves?.[lane]?core.LaneEconomy.pressureFor(model,teamId,lane):null;
   if(['TOP','MID','ADC'].includes(p.role)&&(wave===null||wave< -1.05))continue;
   if(p.role==='JUN'&&!N.jungleAllowed(side,p.node))continue;
   let hops;
   try{hops=N.path(p.node,call.target,p.role==='JUN'?node=>N.jungleAllowed(side,node):undefined).length-1;}
   catch(e){if(String(e.message).startsWith('Disconnected navigation graph'))continue;throw e;}
   if(hops>Math.min(4,call.until-minute+1))continue;
   candidates.push({id:p.id,role:p.role,node:p.node,hp,wave,hops});
  }
  const j=candidates.find(p=>p.role==='JUN'),s=candidates.find(p=>p.role==='SUP');
  const extra=candidates.filter(p=>['MID','ADC','TOP'].includes(p.role))
   .sort((a,b)=>a.hops-b.hops||b.wave-a.wave||a.id.localeCompare(b.id));
  if(!j||!s||!extra.length)continue;
  const members=[j,s,...extra.slice(0,2)];
  if(!members.some(p=>['MID','ADC'].includes(p.role)))continue;
  out[teamId]={version:1,teamId,minute,target:call.target,spawn,until:call.until,
   reason:call.reason,action:call.action,vision,protectedIds:[...protectedIds].sort(),members};
 }
 return out;
}
function movement(nav,agent,minute){
 const p=nav.squadCommitments?.[agent.teamId];
 if(!p||p.minute!==minute||!p.members.some(m=>m.id===agent.id))return null;
 return {goal:p.target,intent:'objective_setup',reason:p.reason,decisionVersion:4};
}
function audit(match){
 const errors=[];
 for(let i=1;i<match.frames.length;i++){
  const f=match.frames[i],prior=match.frames[i-1];
  for(const p of Object.values(f.squadCommitments||{})){
   const ids=p.members.map(m=>m.id);
   if(p.version!==1||p.minute!==f.minute||p.spawn>p.until||p.spawn>p.minute+3||
      !['dragon_pit','baron_pit'].includes(p.target)||!['take','contest'].includes(p.action)||
      ids.length<3||ids.length>4||new Set(ids).size!==ids.length||
      !p.members.some(m=>m.role==='JUN')||!p.members.some(m=>m.role==='SUP')||
      !p.members.some(m=>['MID','ADC'].includes(m.role))||f.siegeDecision?.stage===3)
    errors.push('Invalid squad commitment '+f.minute);
   for(const m of p.members){
    const before=prior.navigation.after[m.id],after=f.navigation.before[m.id];
    if(!before?.alive||before.teamId!==p.teamId||before.role!==m.role||before.node!==m.node||
       prior.health[m.id]!==m.hp||m.hp<60||p.protectedIds.includes(m.id)||
       !after?.alive||after.goal!==p.target&&after.intent!=='recall_channel')
     errors.push('Invalid squad member '+f.minute+' '+m.id);
   }
  }
 }
 return errors;
}
core.SquadCommitment=Object.freeze({plan,movement,audit});
})(globalThis);
