/* Rift Director Alpha 0.7.10 — causal neutral-objective policy.
 * An objective call is a plan, never a guaranteed capture. All movement goes
 * through the existing graph and actual capture checks living players in reach.
 * Deterministic, no world RNG and no omniscient enemy-position queries.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const healthy=(nav,health,id,role)=>{
 const agent=Object.values(nav.agents).find(a=>a.teamId===id&&a.role===role);
 return agent?.alive?(health?.[agent.id]??100):0;
};
const other=(nav,id)=>id===nav.a?nav.b:nav.a;
function strategicScore(nav,world,id,health,objective='dragon'){
 const foe=other(nav,id),vision=world.map?.riverVision?.[id]??50;
 const objectiveLane=objective==='baron'?'TOP':'BOT';
 const lane=world.map?.lanes?.[objectiveLane]?.pressure?.[id]??50;
 const wave=world.waves?core.LaneEconomy.pressureFor(
  {teamIds:[nav.a,nav.b],lanes:world.waves},id,objectiveLane):0;
 const lead=(world.gold?.[id]??0)-(world.gold?.[foe]??0);
 const drakeDebt=objective==='baron'?
   (world.barons?.[foe]||0)-(world.barons?.[id]||0):
   (world.dragons?.[foe]||0)-(world.dragons?.[id]||0);
 const hp=(healthy(nav,health,id,'JUN')+healthy(nav,health,id,'SUP'))/2;
 // Only public strategic signals; never the opponent's concealed route.
 return (vision-50)*.24+(lane-50)*.24+
  clamp(lead/950,-8,8)+clamp(wave,-2,2)*2.4+
  drakeDebt*2+clamp((hp-72)*.13,-7,4);
}
function objectiveTarget(nav,world,id,minute){
 const foe=other(nav,id);
 const dragon=minute>=(world.nextDragon??Infinity)-3;
 const baron=minute>=20&&minute>=(world.nextBaron??Infinity)-3;
 if(!dragon&&!baron)return null;
 if(!baron)return 'dragon';
 if(!dragon)return 'baron';
 // Consider the real value of Baron for opening structures rather than
 // treating every live Dragon as automatically more important.
 const lead=(world.gold?.[id]||0)-(world.gold?.[foe]||0);
 const baronValue=5+(world.towers?.[id]||0)*.7+
   (lead>1700?1.8:0)+(world.barons?.[id]||0)*-.5;
 const dragonValue=3+(world.dragons?.[foe]||0)*1.6+
   ((world.dragons?.[id]||0)===0?1:0)+(lead< -1500?1.2:0);
 return baronValue>=dragonValue?'baron':'dragon';
}
function activeCall(nav,world,minute,health){
 // First bot-lane setup completes before the support's 14–21 ward/escort
 // duties. Afterward, timing follows dragon availability and team choices.
 const roleWindow=minute>=11&&minute<=13||minute>=22&&minute<=29||
   minute>=36&&minute<=55;
 // Once Baron is available, a credible objective call may be considered
 // outside the old rotation windows. An actual open Nexus still has its
 // own finishing priority; a two-tower lane is not a global Baron veto.
 const baronReady=minute>=22&&minute>=(world.nextBaron??Infinity)-3;
 if(!roleWindow&&!baronReady)return false;
 return [nav.a,nav.b].some(id=>objectiveTarget(nav,world,id,minute));
}
function plan(nav,world,minute,health){
 if(!nav.neutralCalls)nav.neutralCalls={};
 const out={};
 for(const id of [nav.a,nav.b]){
  const old=nav.neutralCalls[id];
  if(old&&old.targetSpawn!==
    (old.target==='baron_pit'?world.nextBaron:world.nextDragon)){
   nav.neutralCalls[id]=null;
  }
  // A stale Dragon commitment/cooldown cannot suppress a newly available
  // Baron. Do not interrupt a live call for minor score fluctuations.
  let existing=nav.neutralCalls[id];
  const targetNow=objectiveTarget(nav,world,id,minute);
  if(existing&&minute>=22&&targetNow==='baron'&&
     existing.target==='dragon_pit'&&minute>existing.until){
   nav.neutralCalls[id]=null;existing=null;
  }
  if(existing&&minute<=existing.until){
   out[id]=existing;continue;
  }
  if(existing&&minute<existing.cooldownUntil){
   out[id]={action:'hold',reason:'objective_cooldown',until:minute};continue;
  }
  if(!activeCall(nav,world,minute,health)){
   out[id]={action:'hold',reason:'no_dragon_opportunity',until:minute};continue;
  }
  const objective=objectiveTarget(nav,world,id,minute);
  if(!objective){out[id]={action:'hold',reason:'objective_not_ready',until:minute};continue}
  const foe=other(nav,id),score=strategicScore(nav,world,id,health,objective);
  const hpJ=healthy(nav,health,id,'JUN'),hpS=healthy(nav,health,id,'SUP');
  let action='take';
  if(objective==='dragon'&&(hpJ<48||hpS<43||score<-5.2))action='trade';
  else if(objective==='baron'&&(hpJ<48||hpS<43))action='hold';
  else if(score<-.5)action='contest';
  if(action==='hold'){
   out[id]={action:'hold',reason:'baron_unsafe',until:minute};continue;
  }
  // A threatened Dragon can be traded for actual TOP pressure; Baron
  // requires present jungler and support and competes for their time.
  const target=objective==='dragon'?'dragon_pit':'baron_pit';
  // A credible Baron setup lasts long enough for its actual escorts to
  // walk to the pit. This does not grant capture or override HP recovery.
  const escorts=Object.values(nav.agents).filter(p=>p.teamId===id&&
    p.alive&&['JUN','SUP'].includes(p.role));
  const travel=escorts.length===2?Math.max(...escorts.map(p=>
   core.Navigation.hops(p.node,target))):3;
  const commitment=objective==='baron'?clamp(travel+2,3,6):3;
  const call={action,reason:objective+'_'+action,target,
   targetSpawn:objective==='dragon'?world.nextDragon:world.nextBaron,
   score:+score.toFixed(2),
   enemyId:foe,created:minute,until:minute+commitment,
   cooldownUntil:minute+(objective==='baron'?commitment+3:12)};
  // From the midgame, prepare a formation rather than sending only
  // two escorts. Each reinforcement must have an affordable lane exit
  // and enough time to reach the pit. A strong side wave remains a
  // valid alternative, so the whole roster is never summoned blindly.
  if(minute>=22&&['take','contest'].includes(action)&&hpJ>=55&&hpS>=55&&
     (world.map?.riverVision?.[id]??50)>=43){
   const model={teamIds:[nav.a,nav.b],lanes:world.waves};
   const laneOf=p=>p.role==='ADC'?'BOT':p.role;
   const extra=Object.values(nav.agents).filter(p=>p.teamId===id&&
    ['MID','ADC','TOP'].includes(p.role)&&p.alive&&p.intent!=='retreat'&&
    (world.dead?.[p.id]||0)<=minute&&(health?.[p.id]??100)>=65&&
    world.waves?.[laneOf(p)]).map(p=>({p,
     wave:core.LaneEconomy.pressureFor(model,id,laneOf(p)),
     travel:core.Navigation.hops(p.node,target)}))
    .filter(x=>x.wave>=-1.05&&x.travel<=commitment+1&&
      !(x.p.role==='TOP'&&x.wave>=1.45))
    .sort((a,b)=>a.travel-b.travel||
      (a.p.role==='MID'?-1:b.p.role==='MID'?1:0)||a.p.id.localeCompare(b.p.id));
   call.reinforcementIds=extra.map(x=>x.p.id);
   // A real formation has a travel budget based on its furthest member.
   // The original early Dragon window remains unchanged.
   if(extra.length){
    const duration=clamp(Math.max(commitment,...extra.map(x=>x.travel+1)),3,6);
    call.until=minute+duration;
    call.cooldownUntil=minute+(objective==='baron'?duration+3:12);
   }
  }
  nav.neutralCalls[id]=call;
  out[id]=call;
 }
 return out;
}
function movement(nav,agent,minute,worldState){
 const call=nav.neutralPlans?.[agent.teamId];
 if(!call||call.action==='hold'||minute>call.until)return null;
 if(call.action==='trade'){
  if(agent.role!=='TOP')return null;
  const foe=other(nav,agent.teamId);
  const stage=(worldState.lanes?.[foe]?.TOP??3)+1;
  if(!Number.isInteger(stage)||stage>3)return null;
  const side=foe===nav.a?'blue':'red';
  return {goal:core.Navigation.towerNode(side,'TOP',stage),
   intent:'splitpush',lane:'TOP',reason:'dragon_crossmap_trade',decisionVersion:4};
 }
 // Named reinforcements keep their own lane-risk constraint. They can
 // walk to the objective with the original pair, not teleport to it.
 if(call.reinforcementIds?.includes(agent.id)&&
    ['take','contest'].includes(call.action)){
  const lane=agent.role==='ADC'?'BOT':agent.role;
  if(worldState.waves?.[lane]){
   const wave=core.LaneEconomy.pressureFor(
    {teamIds:[nav.a,nav.b],lanes:worldState.waves},agent.teamId,lane);
   if(wave>=-1.05&&!(agent.role==='TOP'&&wave>=1.45))
    return {goal:call.target,intent:'objective_setup',
     reason:call.reason,decisionVersion:4};
  }
 }
 // JUN/SUP are the two required physical escorts. The caller does not
 // teleport ADC and can still lose the objective if they arrive injured.
 if(agent.role==='JUN'||agent.role==='SUP'){
  // Preserve early match test / role routing: no support Dragon call at t10,
  // and the 14–21 ward and ADC escort window remains protected.
  if(agent.role==='SUP'&&minute>=14&&minute<=21)return null;
  if(agent.role==='JUN'&&minute>=14&&minute<=19)return null;
  return {goal:call.target,intent:'objective_setup',
   reason:call.reason,decisionVersion:4};
 }
 return null;
}
function captureCandidates(nav,dead,minute,health,positioned,world){
 const teams=[nav.a,nav.b];
 return teams.map(id=>{
  const agents=positioned(id,'dragon_pit');
  const ready=agents.filter(p=>(health[p.id]??100)>=31);
  const jungler=ready.find(p=>p.role==='JUN');
  const support=ready.find(p=>p.role==='SUP');
  const avgHp=ready.length?ready.reduce((n,p)=>n+(health[p.id]??100),0)/ready.length:0;
  const vision=world.map?.riverVision?.[id]??50;
  const score=ready.length*10+(jungler?8:0)+(support?3:0)+
   avgHp*.11+(vision-50)*.12;
  return {id,agents:ready,jungler,support,score,eligible:ready.length>=2,
   lanePressure:world.map?.lanes?.BOT?.pressure?.[id]??50};
 });
}
// Opt-in early staging, independent of live capture calls. The common
// snapshot chooses a reachable three-player squad; ordinary safety and
// siege decisions still have authority over the individual movement.
const prepUnavailable=new Set(['retreat','recover','recall_channel','recall_recover','shop_recall','dead','siege_return','siege','defend']);
function prepRoute(N,side,p,target){
 if(p.role==='JUN'&&(!N.jungleAllowed(side,p.node)||!N.jungleAllowed(side,target)))return null;
 try{return N.path(p.node,target,p.role==='JUN'?node=>N.jungleAllowed(side,node):undefined);}
 catch(e){if(String(e.message).startsWith('Disconnected navigation graph'))return null;throw e;}
}
function preparation({nav,world,minute,health={},dead={},abilityState}){
 const N=core.Navigation,out={};
 if(minute<22||minute>55||nav.siegeDecision?.stage===3||
    [nav.a,nav.b].some(id=>Object.values(world.lanes?.[id]||{}).some(s=>s===3)))return out;
 for(const teamId of [nav.a,nav.b]){
  const side=teamId===nav.a?'blue':'red',call=nav.neutralPlans?.[teamId];
  // An existing live call/trade, a credible siege, or a structure defense
  // must not be displaced by an objective that has not spawned.
  if(call&&call.until>=minute&&['take','contest','trade'].includes(call.action))continue;
  const siege=nav.siegeDecision?.teamId===teamId?nav.siegeDecision:null;
  if(siege&&siege.wave>=.48&&siege.escorts.length>=2&&siege.travel<=4)continue;
  const vision=world.map?.riverVision?.[teamId]??50;
  if(vision<43)continue;
  const upcoming=['dragon','baron'].map(kind=>({kind,spawn:kind==='dragon'?world.nextDragon:world.nextBaron,
   score:strategicScore(nav,world,teamId,health,kind)}))
   .filter(x=>Number.isInteger(x.spawn)&&x.spawn-minute>=4&&x.spawn-minute<=6&&x.score>=-5.2)
   .sort((a,b)=>a.spawn-b.spawn||b.score-a.score||a.kind.localeCompare(b.kind));
  for(const objective of upcoming){
   const {kind,spawn}=objective,target=kind+'_pit',staging=kind==='baron'?'upper_river':'lower_river',lead=spawn-minute;
   const candidates=[];
   for(const p of Object.values(nav.agents)){
    if(p.teamId!==teamId||!['JUN','SUP','MID','ADC'].includes(p.role)||!p.alive||(dead[p.id]||0)>minute||
       prepUnavailable.has(p.intent)||p.recovering===true||(health[p.id]??0)<65||
       [side+'_fountain',side+'_nexus'].includes(p.node)||
       siege?.escorts.includes(p.id)||siege?.sidePlan?.actorId===p.id||
       nav.structureDefense?.members?.some(m=>m.id===p.id))continue;
    const entry=abilityState?.entries?.[p.id],type=core.ChampionKits.DEFINITIONS[entry?.championId]?.resourceType;
    const resource=entry?core.ChampionKits.projected(entry,minute*60):100;
    if(type==='mana'&&resource<25)continue;
    const lane=p.role==='ADC'||p.role==='SUP'?'BOT':p.role;
    const wave=world.waves?.[lane]?core.LaneEconomy.pressureFor({teamIds:[nav.a,nav.b],lanes:world.waves},teamId,lane):null;
    if(p.role!=='JUN'&&(wave===null||wave<-.65))continue;
    const route=prepRoute(N,side,p,staging),tail=prepRoute(N,side,{...p,node:staging},target);
    if(!route||!tail||route.length+tail.length-2>lead)continue;
    const previous=nav.objectivePreparation?.[teamId];
    const continuing=previous?.spawn===spawn&&previous?.target===target&&previous.members.some(m=>m.id===p.id&&m.depart);
    const depart=Boolean(continuing||lead===4||route.length-1>=lead-3);
    candidates.push({id:p.id,role:p.role,node:p.node,hp:health[p.id],resource,wave,route,tail,depart});
   }
   const j=candidates.find(p=>p.role==='JUN'),s=candidates.find(p=>p.role==='SUP');
   const carry=candidates.filter(p=>['MID','ADC'].includes(p.role)).sort((a,b)=>a.route.length-b.route.length||b.wave-a.wave||a.id.localeCompare(b.id))[0];
   if(!j||!s||!carry)continue;
   const members=[j,s,carry];
   if(!members.some(m=>m.depart))continue;
   out[teamId]={version:1,teamId,minute,target,staging,spawn,lead,score:+objective.score.toFixed(2),vision,members};
   break;
  }
 }
 return out;
}
function preparationMovement(nav,agent,minute){
 const p=nav.objectivePreparation?.[agent.teamId];
 if(!p||p.minute!==minute||!p.members.some(m=>m.id===agent.id&&m.depart))return null;
 return {goal:p.staging,intent:'objective_setup',reason:'objective_prepare',decisionVersion:5};
}
function auditPreparation(match){
 const errors=[],N=core.Navigation;
 for(let i=1;i<match.frames.length;i++){
  const f=match.frames[i],prev=match.frames[i-1];
  for(const p of Object.values(f.objectivePreparation||{})){
   const side=p.teamId===match.fixture.a?'blue':'red',kind=p.target==='baron_pit'?'baron':'dragon';
   const ids=p.members.map(m=>m.id);
   if(p.version!==1||p.minute!==f.minute||p.lead!==p.spawn-p.minute||p.lead<4||p.lead>6||
      ![match.fixture.a,match.fixture.b].includes(p.teamId)||!['baron_pit','dragon_pit'].includes(p.target)||
      p.staging!==(kind==='baron'?'upper_river':'lower_river')||ids.length!==3||new Set(ids).size!==3||
      !p.members.some(m=>m.role==='JUN')||!p.members.some(m=>m.role==='SUP')||
      !p.members.some(m=>['MID','ADC'].includes(m.role))||!p.members.some(m=>m.depart)||
      f.siegeDecision?.stage===3||(prev.neutralHp&&prev.neutralHp.state.monsters[kind].spawn!==p.spawn))
    errors.push('Invalid objective preparation '+f.minute);
   for(const m of p.members){
    const before=prev.navigation.after[m.id],actual=f.navigation.before[m.id];
    if(!before?.alive||before.teamId!==p.teamId||before.role!==m.role||before.node!==m.node||
       prev.health[m.id]!==m.hp||m.hp<65||JSON.stringify(prepRoute(N,side,m,p.staging))!==JSON.stringify(m.route)||
       JSON.stringify(prepRoute(N,side,{...m,node:p.staging},p.target))!==JSON.stringify(m.tail)||
       m.route.length+m.tail.length-2>p.lead||
       actual?.reason==='objective_prepare'&&(!m.depart||actual.goal!==p.staging||actual.node!==(m.route[1]||m.node)))
     errors.push('Invalid preparation member '+f.minute+' '+m.id);
   }
  }
  for(const [id,a] of Object.entries(f.navigation.before||{}))if(a.alive&&a.reason==='objective_prepare'&&
   !f.objectivePreparation?.[a.teamId]?.members.some(m=>m.id===id&&m.depart))
    errors.push('Unassigned objective preparation '+f.minute+' '+id);
 }
 return errors;
}
function audit(match){
 const errors=[];
 for(const e of match.events||[]){
  const f=e.facts;
  if(f?.action!=='dragon'||f.objectiveVersion!==2)continue;
  if(!['take','contest','opportunistic'].includes(f.plan))
   errors.push('Dragon without physical opportunity or team call');
  if(!Number.isFinite(f.score)||f.score<0||
    !Array.isArray(f.participantIds)||!f.participantIds.length)
   errors.push('Dragon invalid capture strength');
  if(f.stolen&&(!f.smite||f.actorId!==f.smiteBy||
     f.initiatorTeamId===e.teamId))
   errors.push('Dragon stolen without opposing Smite and team');
  const frame=match.frames.find(fr=>fr.minute===e.minute);
  const at=frame?.navigation?.before?.[f.actorId];
  if(!at?.alive)errors.push('Dragon actor not alive at objective');
 }
 return errors;
}
core.NeutralObjectives=Object.freeze({
 strategicScore,objectiveTarget,activeCall,plan,movement,captureCandidates,audit,preparation,preparationMovement,auditPreparation
});
})(globalThis);
