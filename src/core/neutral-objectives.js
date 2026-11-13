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
 strategicScore,objectiveTarget,activeCall,plan,movement,captureCandidates,audit
});
})(globalThis);
