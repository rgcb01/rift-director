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
function strategicScore(nav,world,id,health){
 const foe=other(nav,id),vision=world.map?.riverVision?.[id]??50;
 const lane=world.map?.lanes?.BOT?.pressure?.[id]??50;
 const wave=world.waves?core.LaneEconomy.pressureFor(
  {teamIds:[nav.a,nav.b],lanes:world.waves},id,'BOT'):0;
 const lead=(world.gold?.[id]??0)-(world.gold?.[foe]??0);
 const drakeDebt=(world.dragons?.[foe]||0)-(world.dragons?.[id]||0);
 const hp=(healthy(nav,health,id,'JUN')+healthy(nav,health,id,'SUP'))/2;
 // Only public strategic signals; never the opponent's concealed route.
 return (vision-50)*.24+(lane-50)*.24+
  clamp(lead/950,-8,8)+clamp(wave,-2,2)*2.4+
  drakeDebt*2+clamp((hp-72)*.13,-7,4);
}
function activeCall(nav,world,minute,health){
 // First bot-lane setup completes before the support's 14–21 ward/escort
 // duties. Afterward, timing follows dragon availability and team choices.
 const roleWindow=minute>=11&&minute<=13||minute>=22&&minute<=29||
   minute>=36&&minute<=55;
 if(!roleWindow||minute<(world.nextDragon??Infinity)-3)return false;
 // A late siege is an opportunity cost, not a magical extra objective team.
 if(minute>=36&&nav.siegeTeam&&
    Object.values(world.lanes[other(nav,nav.siegeTeam)]||{})
      .some(stage=>stage>=2))return false;
 return true;
}
function plan(nav,world,minute,health){
 if(!nav.neutralCalls)nav.neutralCalls={};
 const out={};
 for(const id of [nav.a,nav.b]){
  const old=nav.neutralCalls[id];
  if(old&&old.targetSpawn!==(world.nextDragon??Infinity)){
   nav.neutralCalls[id]=null;
  }
  const existing=nav.neutralCalls[id];
  if(existing&&minute<=existing.until){
   out[id]=existing;continue;
  }
  if(existing&&minute<existing.cooldownUntil){
   out[id]={action:'hold',reason:'objective_cooldown',until:minute};continue;
  }
  if(!activeCall(nav,world,minute,health)){
   out[id]={action:'hold',reason:'no_dragon_opportunity',until:minute};continue;
  }
  const foe=other(nav,id),score=strategicScore(nav,world,id,health);
  const hpJ=healthy(nav,health,id,'JUN'),hpS=healthy(nav,health,id,'SUP');
  let action='take';
  if(hpJ<48||hpS<43)action='trade';
  else if(score<-5.2)action='trade';
  else if(score<-.5)action='contest';
  // The team choosing to cross-map actually sends TOP to earn plates
  // and possible towers; no event claims an exchange without earned damage.
  const call={action,reason:'dragon_'+action,target:'dragon_pit',
   targetSpawn:world.nextDragon,score:+score.toFixed(2),
   enemyId:foe,created:minute,until:minute+5,cooldownUntil:minute+10};
  nav.neutralCalls[id]=call;
  out[id]=call;
 }
 return out;
}
function movement(nav,agent,minute){
 const call=nav.neutralPlans?.[agent.teamId];
 if(!call||call.action==='hold'||minute>call.until)return null;
 if(call.action==='trade'){
  if(agent.role!=='TOP')return null;
  const foe=other(nav,agent.teamId);
  const stage=nav.objectiveState?.lanes?.[foe]?.TOP+1;
  if(!Number.isInteger(stage)||stage>3)return null;
  const side=foe===nav.a?'blue':'red';
  return {goal:core.Navigation.towerNode(side,'TOP',stage),
   intent:'splitpush',lane:'TOP',reason:'dragon_crossmap_trade',decisionVersion:4};
 }
 // JUN/SUP are the two required physical escorts. The caller does not
 // teleport ADC and can still lose the objective if they arrive injured.
 if(agent.role==='JUN'||agent.role==='SUP'){
  // Preserve early match test / role routing: no support Dragon call at t10,
  // and the 14–21 ward and ADC escort window remains protected.
  if(agent.role==='SUP'&&minute>=14&&minute<=21)return null;
  if(agent.role==='JUN'&&minute>=14&&minute<=19)return null;
  return {goal:'dragon_pit',intent:'objective_setup',
   reason:call.reason,decisionVersion:4};
 }
 return null;
}
function captureCandidates(nav,dead,minute,health,positioned,world){
 const teams=[nav.a,nav.b];
 return teams.map(id=>{
  const agents=positioned(id,'dragon_pit');
  const jungler=agents.find(p=>p.role==='JUN');
  const support=agents.find(p=>p.role==='SUP');
  const ready=agents.filter(p=>(health[p.id]??100)>=31);
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
  if(!['take','contest'].includes(f.plan))errors.push('Dragon without active caller plan');
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
 strategicScore,activeCall,plan,movement,captureCandidates,audit
});
})(globalThis);
