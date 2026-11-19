/* Escalation v1: a real local skirmish can trigger a short allied
 * reinforcement call. No invented encounter, revived fighter, extra edge,
 * damage or hidden global opponent data. The normal group scanner decides
 * whether the converging squads actually qualify for a larger fight.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const lanes=['TOP','MID','BOT'];
const laneOf=p=>p.role==='ADC'||p.role==='SUP'?'BOT':p.role;
const unavailable=new Set(['retreat','recall_channel','recall_recover','shop_recall','dead','siege_return','recover']);
function source(e){
 const f=e?.facts,x=f?.simultaneous?.encounter;
 if(x&&Object.values(x.groups).every(ids=>ids.length>=2))return {zone:x.zone,encounter:x,witnesses:team=>x.groups[team]||[]};
 if(f?.action==='skirmish'&&f.attackerCount>=2&&f.defenderCount>=2)
  return {zone:f.zone,encounter:null,witnesses:team=>e.teamId===team?f.participantIds:[f.targetId,...(f.opponentIds||[])]};
 return null;
}
function plan({nav,world,minute,health={},dead={}}){
 const N=core.Navigation,out={};
 if(minute<22||minute>55||nav.siegeDecision?.stage===3)return out;
 const events=world.events||[];
 // Only an actual recent contested skirmish, not a pick of a lone player.
 const sources=[];
 for(let i=events.length-1;i>=0;i--){
  const e=events[i],f=source(e);
  if(e.minute<minute-2)break;
  if(e.minute>=minute||!f||
     !['dragon_pit','baron_pit'].includes(f.zone))continue;
  if(f.encounter&&(e.minute!==minute-1||minute-f.encounter.started>=3||
     f.encounter.spawn!==(f.zone==='dragon_pit'?world.nextDragon:world.nextBaron)))continue;
  // Once a larger fight has happened, this old call cannot restart it.
  if(events.slice(i+1).some(x=>x.facts?.groupFight?.zone===f.zone))continue;
  sources.push({index:i,event:e});
 }
 const model={teamIds:[nav.a,nav.b],lanes:world.waves};
 for(const teamId of [nav.a,nav.b]){
  if(Object.values(world.lanes?.[teamId]||{}).some(s=>s===3))continue;
  const side=teamId===nav.a?'blue':'red';
  const own=Object.values(nav.agents).filter(p=>p.teamId===teamId);
  const live=p=>p.alive&&(dead[p.id]||0)<=minute&&!unavailable.has(p.intent)&&
   !(p.retreatGoal&&p.node!==p.retreatGoal&&(p.retreatUntil||0)>=minute)&&
   (p.role!=='JUN'||N.jungleAllowed(side,p.node))&&(health[p.id]??0)>=60&&
   ![side+'_fountain',side+'_nexus'].includes(p.node);
  const siege=nav.siegeDecision?.teamId===teamId?nav.siegeDecision:null;
  if(siege&&siege.wave>=.48&&siege.escorts.length>=2&&siege.travel<=4)continue;
  for(const {index,event} of sources){
   const f=source(event),target=f.zone;
   const squad=nav.squadCommitments?.[teamId];
   if(squad&&squad.target!==target)continue;
   const call=nav.neutralPlans?.[teamId];
   if(['take','contest'].includes(call?.action)&&call.target!==target&&call.until>=minute)continue;
   const witnessed=f.witnesses(teamId);
   const witnesses=own.filter(p=>witnessed.includes(p.id)&&live(p)&&N.combatRange(p.node,target,2));
   if(!witnesses.length)continue;
   // Each anchor must still observe at least one enemy in direct local
   // combat range. No information about distant enemy health/cooldowns.
   const rivals=Object.values(nav.agents).filter(p=>p.teamId!==teamId&&p.alive&&
    (dead[p.id]||0)<=minute&&!unavailable.has(p.intent)&&N.combatRange(p.node,target,2)&&
    witnesses.some(q=>N.combatRange(q.node,p.node,1)));
   const anchors=witnesses.filter(q=>rivals.some(p=>N.combatRange(q.node,p.node,1)));
   if(!anchors.length)continue;
   const local=own.filter(p=>live(p)&&N.combatRange(p.node,target,2));
   if(local.length>=3)continue;
   const protectedIds=new Set([...(siege?.escorts||[]),...(nav.structureDefense?.members||[]).map(m=>m.id)]);
   if(siege?.sidePlan?.actorId)protectedIds.add(siege.sidePlan.actorId);
   const candidates=[];
   for(const p of own){
    if(!live(p)||local.includes(p)||protectedIds.has(p.id)||p.intent==='defend')continue;
    const lane=laneOf(p),wave=lanes.includes(lane)&&world.waves?.[lane]?core.LaneEconomy.pressureFor(model,teamId,lane):null;
    if(['TOP','MID','ADC'].includes(p.role)&&(wave===null||wave<-.8||p.role==='TOP'&&wave>=1.45))continue;
    if(p.role==='JUN'&&!N.jungleAllowed(side,p.node))continue;
    let hops;try{hops=N.path(p.node,target,p.role==='JUN'?n=>N.jungleAllowed(side,n):undefined).length-1;}
    catch(e){if(String(e.message).startsWith('Disconnected navigation graph'))continue;throw e;}
    if(hops>3)continue;
    candidates.push({id:p.id,role:p.role,node:p.node,hp:health[p.id],wave,hops});
   }
   candidates.sort((a,b)=>a.hops-b.hops||b.hp-a.hp||a.id.localeCompare(b.id));
   const recruits=candidates.slice(0,Math.min(2,3-local.length));
   if(local.length+recruits.length<3||!recruits.length)continue;
   // Keep the local fighters on site as well as the incoming recruits,
   // but never override an assigned defender or a protected siege escort.
   const staying=local.filter(p=>!protectedIds.has(p.id)&&p.intent!=='defend');
   if(staying.length+recruits.length<3||!staying.some(p=>anchors.includes(p)))continue;
   out[teamId]={version:1,minute,teamId,target,sourceIndex:index,sourceMinute:event.minute,
    witnessIds:anchors.map(p=>p.id).sort(),visibleRivalIds:rivals.map(p=>p.id).sort(),
    stayingIds:staying.map(p=>p.id).sort(),recruits};
   break;
  }
 }
 return out;
}
function movement(nav,agent,minute){
 const p=nav.skirmishReinforcements?.[agent.teamId];
 if(!p||p.minute!==minute||!p.stayingIds.includes(agent.id)&&!p.recruits.some(r=>r.id===agent.id))return null;
 return {goal:p.target,intent:'objective_setup',reason:p.target==='dragon_pit'?'dragon_contest':'baron_contest',decisionVersion:4};
}
function audit(match){
 const errors=[];
 for(let i=1;i<match.frames.length;i++){
  const fr=match.frames[i],prev=match.frames[i-1];
  for(const p of Object.values(fr.skirmishReinforcements||{})){
   const e=match.events[p.sourceIndex],f=source(e);
   const witnesses=f?.witnesses(p.teamId)||[];
   if(p.version!==1||p.minute!==fr.minute||!e||e.minute!==p.sourceMinute||
    e.minute>=fr.minute||e.minute<fr.minute-2||!f||f.zone!==p.target||
    p.sourceIndex>=prev.eventsCount||
    !p.witnessIds.length||p.witnessIds.some(id=>!witnesses.includes(id))||
    p.recruits.length<1||p.recruits.length>2||p.stayingIds.length+p.recruits.length<3)
     errors.push('Invalid skirmish reinforcement source '+fr.minute);
   for(const r of p.recruits){
    const before=prev.navigation.after[r.id],after=fr.navigation.before[r.id];
    if(!before?.alive||before.teamId!==p.teamId||before.node!==r.node||
     prev.health[r.id]!==r.hp||r.hp<60||r.hops>3||
     !after?.alive||after.goal!==p.target&&after.intent!=='recall_channel')
      errors.push('Invalid skirmish reinforcement route '+fr.minute+' '+r.id);
   }
   for(const id of p.witnessIds){
    const w=prev.navigation.after[id];
    if(!w?.alive||w.teamId!==p.teamId||!p.visibleRivalIds.some(rid=>{
     const rival=prev.navigation.after[rid];
     return rival?.alive&&rival.teamId!==p.teamId&&core.Navigation.combatRange(w.node,rival.node,1);
    }))errors.push('Unobserved skirmish continuation '+fr.minute);
   }
  }
 }
 return errors;
}
core.SkirmishReinforcements=Object.freeze({plan,movement,audit});
})(globalThis);
