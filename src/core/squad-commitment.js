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
   // A base tower opens the actual Nexus route. Preserve its credible
   // approaching escorts, not just those already standing at the tower.
   const local=squad.filter(p=>p.alive&&(dead[p.id]||0)<=minute&&siege.escorts.includes(p.id)&&
    !unavailable.has(p.intent)&&(health[p.id]??100)>=60&&
    (siege.stage===2?N.hops(p.node,tower)<=3:N.combatRange(p.node,tower,1)))
    .sort((a,b)=>N.hops(a.node,tower)-N.hops(b.node,tower)||a.id.localeCompare(b.id));
   if(local.length>=2){
    // Completing an already opened attack on the last tower has greater
    // strategic value than a fresh neutral call. Keep the entire existing
    // reachable assault together; never assign damage or a winner here.
    if(siege.stage===2)continue;
    for(const p of local.slice(0,2))protectedIds.add(p.id);
   }
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

// Shotcaller v1: actual mid control between objective calls. Choose from the
// common pre-movement snapshot, not the order of individual movement.
// A 3/4-player group is a resource commitment, not a granted engagement.
const shotUnavailable=new Set([...unavailable,'fallback','siege','defend','counter_siege']);
function shotPath(N,side,p,goal){
 if(p.role==='JUN'&&(!N.jungleAllowed(side,p.node)||!N.jungleAllowed(side,goal)))return null;
 try{return N.path(p.node,goal,p.role==='JUN'?node=>N.jungleAllowed(side,node):undefined);}
 catch(e){if(String(e.message).startsWith('Disconnected navigation graph'))return null;throw e;}
}
// Full allocation is optional; a side order must be independently safe.
// This selector never creates combat or moves anyone.
function selectFormation({central,side,visible,lead}){
 const byRole=(xs,r)=>xs.find(p=>p.role===r);
 const mid=byRole(central,'MID'),sup=byRole(central,'SUP'),jun=byRole(central,'JUN'),
  adc=byRole(central,'ADC'),top=byRole(central,'TOP'),sideTop=byRole(side,'TOP'),sideADC=byRole(side,'ADC');
 if(!mid||!sup||!jun)return null;
 const core=[mid,sup,jun],pack=(formation,members,sides=[])=>({formation,members:[
  ...members.map(p=>({...p,assignment:'central'})),...sides.map(p=>({...p,assignment:'side'}))]});
 if(visible>=3&&lead>=-2500&&adc&&top)return pack('5-0',[...core,adc,top]);
 if(visible<=2&&lead>=0&&sideTop&&sideADC)return pack('1-3-1',core,[sideTop,sideADC]);
 if(visible<=4&&(visible<4||lead>=0)&&adc&&sideTop)return pack('4-1',[...core,adc],[sideTop]);
 return null;
}
function shotcaller({nav,world,minute,health={},dead={},abilityState,dynamicFormations=false}){
 const N=core.Navigation,out={};
 // Never divert an opened base route in either direction.
 if(minute<18||minute>55||nav.siegeDecision?.stage>=2||
  [nav.a,nav.b].some(id=>Object.values(world.lanes?.[id]||{}).some(s=>s===3)))return out;
 if(![nav.a,nav.b].some(id=>Object.values(world.lanes?.[id]||{}).some(s=>s>=1)))return out;
 const positions=Object.fromEntries(Object.values(nav.agents).map(p=>[p.id,{...p,alive:p.alive&&(dead[p.id]||0)<=minute}]));
 for(const teamId of [nav.a,nav.b]){
  const side=teamId===nav.a?'blue':'red',foe=teamId===nav.a?nav.b:nav.a,call=nav.neutralPlans?.[teamId];
  const old=nav.shotcallerMemory?.[teamId],continuing=old&&minute<=old.until;
  if(old&&!continuing&&minute<old.cooldownUntil)continue;
  if(call&&call.until>=minute&&['take','contest','trade'].includes(call.action)||
     nav.squadCommitments?.[teamId]||nav.skirmishReinforcements?.[teamId])continue;
  const siege=nav.siegeDecision?.teamId===teamId?nav.siegeDecision:null;
  if(siege&&siege.wave>=.48&&siege.escorts.length>=2&&siege.travel<=4)continue;
  const vision=world.map?.riverVision?.[teamId]??50;
  const midVision=world.map?.lanes?.MID?.vision?.[teamId]??50;
  if(Math.max(vision,midVision)<47||!world.waves?.MID)continue;
  const model={teamIds:[nav.a,nav.b],lanes:world.waves};
  const midWave=core.LaneEconomy.pressureFor(model,teamId,'MID');
  const own=Object.values(positions).filter(p=>p.teamId===teamId&&p.alive);
  const visible=new Map(),seenAll=new Map();
  for(const p of own){
   const sight=core.TacticalAI.observe({nav,agent:p,minute,context:{positions,health,map:world.map}});
   for(const e of sight.opponents){
    const row={id:e.target.id,node:e.target.node,hp:e.hp};seenAll.set(row.id,row);
    if(N.combatRange(row.node,'mid_center',2))visible.set(row.id,row);
   }
  }
  // A contested central wave or visible concentration motivates control.
  // With neither signal, do not summon players just because time passed.
  if(midWave<-.85||visible.size<2&&midWave<.35)continue;
  const lead=(world.gold?.[teamId]??0)-(world.gold?.[foe]??0);
  if(lead<-4500&&visible.size>=3)continue;
  const candidates=[],sideCandidates=[];
  for(const p of own){
   if(shotUnavailable.has(p.intent)||p.recovering===true||(health[p.id]??0)<68||
      [side+'_fountain',side+'_nexus'].includes(p.node)||
      siege?.escorts.includes(p.id)||siege?.sidePlan?.actorId===p.id||
      nav.structureDefense?.members?.some(m=>m.id===p.id))continue;
   const lane=laneOf(p),wave=world.waves?.[lane]?core.LaneEconomy.pressureFor(model,teamId,lane):null;
   const entry=abilityState?.entries?.[p.id],type=core.ChampionKits.DEFINITIONS[entry?.championId]?.resourceType;
   const resource=entry?core.ChampionKits.projected(entry,minute*60):100;
   if(type==='mana'&&resource<25)continue;
   if(continuing&&!old.memberIds.includes(p.id))continue;
   if(dynamicFormations&&['TOP','ADC'].includes(p.role)){
    const laneVision=world.map?.lanes?.[lane]?.vision?.[teamId]??0;
    const goal=lane==='TOP'?'top_center':'bot_center';
    const route=shotPath(N,side,p,goal),hp=health[p.id];
    const threats=[...seenAll.values()].filter(e=>e.hp>=35&&N.combatRange(e.node,goal,2));
    if(wave>=1.25&&laneVision>=(p.role==='ADC'?70:62)&&hp>=(p.role==='ADC'?80:75)&&
       route&&route.length<=4&&!threats.length)
     sideCandidates.push({id:p.id,role:p.role,node:p.node,hp,resource,wave,goal,route,lane,laneVision,visibleThreats:0});
   }
   if(p.role!=='JUN'&&(wave===null||wave<-.8||p.role==='TOP'&&wave>=1.45))continue;
   const goals=p.role==='JUN'?['upper_river','lower_river']:['mid_center'];
   const routes=goals.map(goal=>({goal,route:shotPath(N,side,p,goal)})).filter(x=>x.route)
    .sort((a,b)=>a.route.length-b.route.length||a.goal.localeCompare(b.goal));
   const r=routes[0];if(!r||r.route.length-1>3)continue;
   if(continuing&&!old.memberIds.includes(p.id))continue;
   candidates.push({id:p.id,role:p.role,node:p.node,hp:health[p.id],resource,wave,goal:r.goal,route:r.route});
  }
  const mid=candidates.find(p=>p.role==='MID'),sup=candidates.find(p=>p.role==='SUP');
  if(!mid||!sup)continue;
  const extra=candidates.filter(p=>!['MID','SUP'].includes(p.role))
   .sort((a,b)=>a.route.length-b.route.length||a.id.localeCompare(b.id));
  const allocation=dynamicFormations?selectFormation({central:candidates,side:sideCandidates,visible:visible.size,lead}):null;
  const members=allocation?.members||[mid,sup,...extra.slice(0,2)];
  const central=members.filter(m=>m.assignment!=='side');
  if(central.length<3||!central.some(p=>['JUN','ADC'].includes(p.role)))continue;
  if(visible.size>central.length&&lead<1500)continue;
  out[teamId]={version:allocation?2:1,...(allocation?{formation:allocation.formation}:{}),teamId,minute,created:continuing?old.created:minute,
   until:continuing?old.until:minute+2,cooldownUntil:continuing?old.cooldownUntil:minute+5,
   action:visible.size>=2?'contest_mid':'control_mid',midWave,vision,midVision,lead,
   visible:[...visible.values()].sort((a,b)=>a.id.localeCompare(b.id)),members};
 }
 return out;
}
function shotMovement(nav,agent,minute){
 const p=nav.shotcallerPlans?.[agent.teamId],m=p?.members.find(m=>m.id===agent.id);
 if(!m||p.minute!==minute)return null;
 return {goal:m.goal,intent:m.assignment==='side'?'pressure_push':'group',...(m.assignment==='side'?{lane:m.lane}:{}),reason:'shotcaller_'+p.action,decisionVersion:5};
}
function auditShotcaller(match){
 const errors=[],N=core.Navigation;
 for(let i=1;i<match.frames.length;i++){
  const f=match.frames[i],prev=match.frames[i-1];
  for(const p of Object.values(f.shotcallerPlans||{})){
   const side=p.teamId===match.fixture.a?'blue':'red',ids=p.members.map(m=>m.id);
   const central=p.members.filter(m=>m.assignment!=='side'),sides=p.members.filter(m=>m.assignment==='side');
   const validFormation=p.version===1?ids.length>=3&&ids.length<=4&&!p.formation&&!sides.length:
    p.version===2&&ids.length===5&&p.members.every(m=>['central','side'].includes(m.assignment))&&
    ['5-0','4-1','1-3-1'].includes(p.formation)&&central.length===({'5-0':5,'4-1':4,'1-3-1':3}[p.formation])&&
    (!sides.length||sides.some(m=>m.role==='TOP'))&&central.some(m=>m.role==='JUN')&&
    (p.formation==='5-0'?p.visible.length>=3&&p.lead>=-2500:p.formation==='4-1'?p.visible.length<=4&&(p.visible.length<4||p.lead>=0):p.visible.length<=2&&p.lead>=0&&sides.some(m=>m.role==='ADC'));
   if(!validFormation||p.minute!==f.minute||p.created>p.minute||p.until!==p.created+2||p.minute>p.until||
      p.cooldownUntil!==p.created+5||![match.fixture.a,match.fixture.b].includes(p.teamId)||
      !['contest_mid','control_mid'].includes(p.action)||p.midWave<-.85||
      (p.action==='contest_mid'?p.visible.length<2:p.visible.length>=2||p.midWave<.35)||
      new Set(ids).size!==ids.length||
      !central.some(m=>m.role==='MID')||!central.some(m=>m.role==='SUP')||
      !central.some(m=>['JUN','ADC'].includes(m.role))||f.siegeDecision?.stage>=2)
    errors.push('Invalid shotcaller plan '+f.minute);
   for(const m of p.members){
    const before=prev.navigation.after[m.id],actual=f.navigation.before[m.id];
    if(!before?.alive||before.teamId!==p.teamId||before.role!==m.role||before.node!==m.node||
       prev.health[m.id]!==m.hp||m.hp<68||m.route.length>4||
       (m.assignment==='side'?(!['TOP','ADC'].includes(m.role)||m.lane!==(m.role==='TOP'?'TOP':'BOT')||m.goal!==(m.role==='TOP'?'top_center':'bot_center')||m.wave<1.25||m.visibleThreats!==0||m.hp<(m.role==='ADC'?80:75)||m.laneVision<(m.role==='ADC'?70:62)):
        (m.role==='JUN'?!['upper_river','lower_river'].includes(m.goal):m.goal!=='mid_center'))||
       JSON.stringify(shotPath(N,side,m,m.goal))!==JSON.stringify(m.route)||
       actual?.reason?.startsWith('shotcaller_')&&(actual.goal!==m.goal||actual.node!==(m.route[1]||m.node)))
     errors.push('Invalid shotcaller member '+f.minute+' '+m.id);
   }
  }
  for(const [id,a] of Object.entries(f.navigation.before||{}))if(a.alive&&a.reason?.startsWith('shotcaller_')&&
   !f.shotcallerPlans?.[a.teamId]?.members.some(m=>m.id===id&&a.reason==='shotcaller_'+f.shotcallerPlans[a.teamId].action))
    errors.push('Unassigned shotcaller movement '+f.minute+' '+id);
 }
 return errors;
}
core.SquadCommitment=Object.freeze({plan,movement,audit,shotcaller,shotMovement,auditShotcaller,selectFormation});
})(globalThis);
