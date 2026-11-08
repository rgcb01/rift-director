/* Rift Director Alpha 0.7.14 — committed, causal map-resource choices.
 * A lane professional can farm, escort a wave, or rotate to an actually
 * announced neutral objective. Nothing in this policy awards gold, XP, kills
 * or structures; the existing physical ledgers remain authoritative.
 * Only public map, own HP, wave and documented objective calls are observed.
 * Deterministic; no RNG, timers, DOM or hidden enemy positions.
 */
((root)=>{
 'use strict';
 const core=root.RiftCore||(root.RiftCore={});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const roles=['TOP','MID'];
 const round=n=>Math.round(n*100)/100;
 const other=(nav,id)=>id===nav.a?nav.b:nav.a;
 const side=(nav,id)=>id===nav.a?'blue':'red';
 // Score risk only from information the agent can actually possess:
 // own/team positions and health, visible rivals, local vision and real
 // wards. A rival's unseen position or HP is never consulted here.
 function observableRisk(nav,world,agent,minute,health,goal){
  const positions=Object.fromEntries(Object.values(nav.agents).map(p=>[
   p.id,{...p,alive:world.dead?(world.dead[p.id]||0)<=minute:p.alive}
  ]));
  const sight=core.TacticalAI.observe({nav,agent,minute,
   context:{positions,health,map:world.map}});
  const allies=sight.allies.filter(p=>p.hp>=48).length;
  const enemies=sight.opponents.filter(p=>p.hp>=34);
  const weakened=enemies.filter(p=>p.hp<=62).length;
  const wardCover=core.Vision.canSee(nav.vision,agent.teamId,goal,minute);
  const inDanger=Math.max(0,enemies.length-1-allies);
  return {visibleEnemies:enemies.length,nearbyAllies:allies,
   woundedVisibleEnemies:weakened,wardCover,
   outnumbered:inDanger,
   safePick:weakened>0&&inDanger===0,
   rivalHpIsVisibleOnly:true};
 }
 function evaluate(nav,world,agent,minute,health){
  if(!roles.includes(agent.role))return null;
  const id=agent.teamId,opponent=other(nav,id),lane=agent.role;
  const source=world.map?.lanes?.[lane];
  if(!source||!world.waves?.[lane])return null;
  const wave=core.LaneEconomy.pressureFor(
   {teamIds:[nav.a,nav.b],lanes:world.waves},id,lane);
  const pressure=source.pressure?.[id]??50;
  const vision=source.vision?.[id]??50;
  const hp=health?.[agent.id]??100;
  const deficit=(world.gold?.[opponent]??0)-(world.gold?.[id]??0);
  // When behind, declining every visible opportunity can surrender the map.
  // The underdog may commit to a real fight for territory or a neutral
  // objective; it receives no artificial gold, damage or comeback roll.
  const underdog=clamp(deficit/700,0,6);
  const call=nav.neutralPlans?.[id];
  const eligible=lane==='MID'&&['take','contest'].includes(call?.action)&&
   call?.until>=minute&&['dragon_pit','baron_pit'].includes(call.target)&&hp>=66;
  const travel=eligible?core.Navigation.hops(agent.node,call.target):0;
  // Committed waves need a safe, symmetrical TOP staging node. Only a real
  // escort and sustained momentum can carry them into enemy structures.
  // Advancing deeper without cover is an avoidable risk, not a free bonus.
  const pushGoal=lane==='TOP'?
   (side(nav,id)==='blue'?'top_corner':'top_center'):'mid_center';
  const risk=observableRisk(nav,world,agent,minute,health,pushGoal);
  const fogRisk=risk.wardCover?0:clamp((67-vision)*.38,0,18);
  const overextendRisk=fogRisk+risk.outnumbered*17+
   (risk.nearbyAllies===0&&risk.visibleEnemies>0?7:0)+
   clamp(72-hp,0,72)*.32+clamp(-wave,0,3)*6;
  // Only an observed wounded opponent with adequate nearby cover offers
  // the chance to punish an overextension. Never inspect invisible HP.
  const visiblePick=risk.safePick?(6+risk.woundedVisibleEnemies*4):0;
  const farming=45+clamp(-wave,0,2)*11+
   underdog*.35+clamp(100-hp,0,50)*.12+
   clamp(50-vision,0,30)*.16;
  // Defending a wave is a deliberate resource decision, not identical to
  // last-hitting for gold. It only exists while a publicly observed enemy
  // wave threatens a surviving friendly tower.
  const threatened=wave<=-.9&&(world.lanes?.[id]?.[lane]??3)<3;
  const towerStage=world.lanes?.[id]?.[lane]??0;
  const damaged=world.waves?.[lane]?.plates?.[id]?.[towerStage]??0;
  const defendScore=threatened?45+clamp(-wave,0,3)*12+
   clamp((world.map?.lanes?.[lane]?.pressure?.[opponent]??50)-50,0,40)*.2+
   damaged*2-risk.outnumbered*12-clamp(66-hp,0,66)*.38: null;
  const pushing=32+clamp(wave,0,3)*14+
   (pressure-50)*.62+(vision-50)*.12-(100-hp)*.20+
   visiblePick+underdog*.65-overextendRisk;
  // Objective preparation requires real allies able to approach. A losing
  // team takes a *calculated* risk only if a coordinated call is credible.
  const escort=eligible?Object.values(nav.agents).filter(p=>
   p.teamId===id&&p.id!==agent.id&&p.alive&&
   (health?.[p.id]??100)>=55&&
   core.Navigation.hops(p.node,call.target)<=3).length:0;
  const riverSight=world.map?.riverVision?.[id]??50;
  const objectiveRisk=clamp(60-riverSight,0,40)*.27+
   Math.max(0,2-escort)*5+clamp(75-hp,0,75)*.23;
  const comebackOpportunity=escort>0&&riverSight>=48?
    underdog*2.2:0;
  const rotating=eligible?58+clamp(call.score??0,-25,25)*.35-
    Math.max(0,travel-1)*3.7-clamp(-wave,0,3)*5+
    (world.dragons?.[opponent]??0)*.5+
    escort*3+comebackOpportunity-objectiveRisk:-Infinity;
  const scores={farm:round(farming),defend:threatened?round(defendScore):null,
   pressure:round(pushing),objective:eligible?round(rotating):null};
  const priority=['farm','defend','pressure','objective'];
  const action=priority.filter(k=>scores[k]!==null)
   .sort((a,b)=>scores[b]-scores[a]||priority.indexOf(a)-priority.indexOf(b))[0];
  const goal=(action==='farm'||action==='defend')?
   side(nav,id)+'_'+lane.toLowerCase()+'_front':
   action==='pressure'?pushGoal:call.target;
  return {version:1,teamId:id,actorId:agent.id,role:agent.role,lane,
   created:minute,until:minute+2,action,goal,scores,
   evidence:{wave:round(wave),lanePressure:pressure,vision,
    goldDeficit:deficit,hp,objectiveCall:eligible?call.reason:null,
    travelHops:travel,overextendRisk:round(overextendRisk),
    objectiveRisk:eligible?round(objectiveRisk):null,
    objectiveEscortCount:escort,
    visibleEnemies:risk.visibleEnemies,nearbyAllies:risk.nearbyAllies,
    woundedVisibleEnemies:risk.woundedVisibleEnemies,
    wardCover:risk.wardCover}};
 }
 function plan(nav,world,minute,health,dead={}){
  if(!nav.macroCalls)nav.macroCalls={};
  const selected={};
  if(minute<14||minute>29||nav.siegeTeam)return selected;
  for(const id of [nav.a,nav.b]){
   for(const role of roles){
    const actor=Object.values(nav.agents).find(a=>a.teamId===id&&a.role===role);
    if(!actor||!((dead[actor.id]??0)<=minute))continue;
    const old=nav.macroCalls[actor.id],call=nav.neutralPlans?.[id];
    const stillObjective=old?.action!=='objective'||(
     ['take','contest'].includes(call?.action)&&
     call?.target===old.goal&&call?.until>=minute);
    if(old&&old.until>=minute&&stillObjective){
     selected[actor.id]=old;continue;
    }
    const option=evaluate(nav,world,actor,minute,health);
    if(!option)continue;
    nav.macroCalls[actor.id]=option;selected[actor.id]=option;
   }
  }
  return selected;
 }
 function movement(nav,agent,minute){
  const p=nav.macroPlans?.[agent.id];
  if(!p||p.actorId!==agent.id||p.teamId!==agent.teamId||
     minute<p.created||minute>p.until)return null;
  return {goal:p.goal,lane:p.lane,intent:'macro_'+p.action,
   reason:'macro_'+p.action,decisionVersion:5};
 }
 function snapshot(nav,minute){
  const plans={};
  for(const [id,p] of Object.entries(nav.macroPlans||{})){
   if(p.created<=minute&&p.until>=minute)
    plans[id]={...p,scores:{...p.scores},evidence:{...p.evidence}};
  }
  return {version:1,plans};
 }
 function audit(match){
  const errors=[];
  for(const frame of match.frames||[]){
   const plans=frame.macro?.plans||{};
   for(const [id,p] of Object.entries(plans)){
    const agent=frame.navigation?.before?.[id];
    if(p.version!==1||!agent||!roles.includes(p.role)||
       p.actorId!==id||p.teamId!==agent.teamId||p.role!==agent.role||
       p.lane!==agent.role||!['farm','defend','pressure','objective'].includes(p.action)||
       !core.Navigation.adjacency[p.goal]||p.created>frame.minute||
       p.until<frame.minute||p.until-p.created!==2||
       !Number.isFinite(p.scores?.farm)||!Number.isFinite(p.scores?.pressure)||
       (p.action==='defend'&&!Number.isFinite(p.scores?.defend))||
       (p.action==='objective'&&!Number.isFinite(p.scores?.objective))||
       !Number.isFinite(p.evidence?.wave)||
       !Number.isFinite(p.evidence?.goldDeficit)||
       !Number.isFinite(p.evidence?.overextendRisk)||
       !Number.isSafeInteger(p.evidence?.visibleEnemies)||
       !Number.isSafeInteger(p.evidence?.nearbyAllies)||
       !Number.isSafeInteger(p.evidence?.objectiveEscortCount))
      errors.push('Plan macro inválido: '+id+' min '+frame.minute);
   }
   for(const [id,a] of Object.entries(frame.navigation?.before||{})){
    // Dead players may retain historical tactic metadata in legacy snapshots,
    // but cannot be executing a new macro order while in the fountain.
    if(!a.alive||!a.reason?.startsWith('macro_'))continue;
    const p=plans[id];
    if(!p||a.reason!=='macro_'+p.action||
       a.intent!==a.reason||a.goal!==p.goal||
       a.lane!==p.lane)
     errors.push('Orden macro sin decisión física registrada: '+id+' min '+frame.minute+
       ' actual='+JSON.stringify({reason:a.reason,intent:a.intent,goal:a.goal,lane:a.lane})+
       ' plan='+JSON.stringify(p&&{action:p.action,goal:p.goal,lane:p.lane,created:p.created,until:p.until}));
   }
  }
  return errors;
 }
 core.MacroPolicy=Object.freeze({evaluate,plan,movement,snapshot,audit});
})(globalThis);
