/* Rift Director 0.7.12 — counterplay from observable, physical combat.
 * Teams may pursue a locally isolated, weakened or bountied visible rival.
 * Decisions never award a kill: Encounters still supplies damage and HP.
 * Earned kills can create a short wave-followup order, but plates and
 * structures still require real agents, lane waves and the tower audit.
 */
((root)=>{
 'use strict';
 const core=root.RiftCore||(root.RiftCore={});
 const navAPI=()=>core.Navigation;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const safe=(p,health)=>p.alive&&p.intent!=='retreat'&&(health[p.id]??100)>=34;
 const roleLane=role=>role==='ADC'||role==='SUP'?'BOT':role==='JUN'?null:role;
 function opportunities({nav,minute,health,map,gold,shutdowns}){
  if(minute<12||minute>=57)return [];
  const agents=Object.values(nav.agents),out=[];
  const positions=Object.fromEntries(agents.map(p=>[p.id,{...p}]));
  for(const actor of agents){
   if(!safe(actor,health)||(health[actor.id]??100)<62)continue;
   const sight=core.TacticalAI.observe({nav,agent:actor,minute,
    context:{health,map,positions}});
   for(const {target,hp} of sight.opponents){
    if(!target.alive||target.intent==='retreat'||hp<=0||
       !navAPI().combatRange(actor.node,target.node,2))continue;
    const attackers=agents.filter(p=>p.teamId===actor.teamId&&safe(p,health)&&
      navAPI().combatRange(p.node,actor.node,1)&&
      navAPI().combatRange(p.node,target.node,3));
    if(attackers.length<2)continue;
    // Only opponents actually seen by this initiator count as nearby defense.
    // A wounded enemy still counts as an opposing body until they flee
    // or die; low HP must not produce a fictitious extra ally advantage.
    const foes=sight.opponents.filter(o=>o.target.alive&&
      o.target.intent!=='retreat'&&(health[o.target.id]??100)>0&&
      navAPI().combatRange(o.target.node,target.node,3));
    const localEdge=attackers.length-foes.length;
    if(localEdge<0)continue;
    const allyHp=attackers.reduce((n,p)=>n+(health[p.id]??100),0)/attackers.length;
    const foe=actor.teamId===nav.a?nav.b:nav.a;
    const deficit=(gold?.[foe]||0)-(gold?.[actor.teamId]||0);
    const streak=shutdowns?.streaks?.[target.id]||0;
    const bounty=core.Shutdowns.bounty(streak);
    // Equal-number fights are viable against a visibly wounded rival,
    // not automatically avoided. The damage engine still decides the kill.
    if(localEdge===0&&(hp>72||allyHp<hp+22)&&bounty<150)continue;
    const score=14+localEdge*15+(100-hp)*.24+
      Math.min(10,Math.max(0,allyHp-hp)*.22)+Math.min(bounty/35,11)+
      (deficit>1200?Math.min(deficit/600,7):0)-
      Math.max(0,74-allyHp)*.16;
    if(score<30)continue;
    const reason=bounty>=150&&deficit>800?'shutdown_hunt':
      localEdge>=2?'isolated_pick':
      deficit>1200?'trailing_counterattack':'visible_advantage';
    // A group encounter can affect other actually visible enemies.
    // Include only opponents the initiator sees and can reach; pick a
    // primary target at least as vulnerable as any secondary target.
    const secondary=foes.filter(o=>o.target.id!==target.id&&
      o.hp>hp&&navAPI().combatRange(actor.node,o.target.node,2))
      .sort((a,b)=>a.hp-b.hp||a.target.id.localeCompare(b.target.id))
      .slice(0,2).map(o=>o.target.id);
    out.push({teamId:actor.teamId,actorId:actor.id,targetId:target.id,
     attackerIds:attackers.map(p=>p.id),targetIds:[target.id,...secondary],
     reason,score:+score.toFixed(2),localEdge,bounty,streak,
     observedHp:hp,observedNode:target.node,
     deficit:+deficit.toFixed(0)});
   }
  }
  return out.sort((a,b)=>b.score-a.score||
   a.teamId.localeCompare(b.teamId)||a.actorId.localeCompare(b.actorId)||
   a.targetId.localeCompare(b.targetId));
 }
 function choose({nav,minute,health,map,gold,shutdowns,previous=-10}){
  if(minute-previous<4)return null;
  const options=opportunities({nav,minute,health,map,gold,shutdowns});
  if(!options.length)return null;
  // Stateless deterministic check, so adding a scout event cannot alter
  // finances, transfers or a subsequent fixture's world-level RNG.
  // A declined first opportunity must not suppress every other visible
  // opening on the map. Try up to three distinct opponents, never unseen
  // ones, with stable per-opportunity hashes and no gameplay RNG.
  const seen=new Set();
  for(const candidate of options){
   if(seen.has(candidate.targetId))continue;
   seen.add(candidate.targetId);
   const r=core.TacticalAI.hash(nav.seed,minute,candidate.teamId,
    candidate.actorId,candidate.targetId,'counterplay')%1000;
   const chance=clamp(.24+(candidate.score-30)*.007,.23,.69);
   if(r<chance*1000)return candidate;
   if(seen.size>=3)break;
  }
  return null;
 }
 function pressureAfterKill(nav,facts,minute,worldState){
  if(!facts?.victimIds?.length||minute>=36)return null;
  const roster=facts.participantIds.map(id=>nav.agents[id]).filter(Boolean);
  const lanes=['BOT','MID','TOP'].filter(lane=>
   roster.filter(p=>roleLane(p.role)===lane).length>=
     (lane==='BOT'?2:1));
  const lane=lanes.find(lane=>{
   const enemy=facts.teamId===nav.a?nav.b:nav.a;
   const stage=worldState.lanes?.[enemy]?.[lane]??3;
   return stage<3;
  });
  if(!lane)return null;
  const allowed=roster.filter(p=>roleLane(p.role)===lane).map(p=>p.id);
  nav.counterPressure??={};
  const window={teamId:facts.teamId,lane,created:minute,
   until:minute+3,sourceId:facts.actorId,sourceVictims:[...facts.victimIds],
   allowed};
  nav.counterPressure[facts.teamId]=window;
  return window;
 }
 function followup(nav,agent,minute,worldState,context){
  const w=nav.counterPressure?.[agent.teamId];
  if(!w||minute>w.until||minute<=w.created||minute>=36||
    // ADC protection/roaming and early objective calls outrank opportunistic
    // turret pressure: a won fight never cancels the SUP's core assignment.
    agent.role==='SUP'&&minute<=29||
    !w.allowed.includes(agent.id)||!agent.alive||
    (context?.health?.[agent.id]??100)<67)return null;
  const foe=agent.teamId===nav.a?nav.b:nav.a;
  const stage=(worldState.lanes?.[foe]?.[w.lane]??3)+1;
  if(stage>3)return null;
  const wave=core.LaneEconomy.pressureFor(
    {teamIds:[nav.a,nav.b],lanes:worldState.waves},agent.teamId,w.lane);
  if(wave<.6)return null; // no magical wave after winning a fight
  const side=foe===nav.a?'blue':'red';
  return {goal:navAPI().towerNode(side,w.lane,stage),
   intent:'counterpush',lane:w.lane,reason:'earned_fight_pressure',
   decisionVersion:6};
 }
 function audit(match){
  const errors=[];
  for(let i=0;i<(match.events||[]).length;i++){
   const event=match.events[i],facts=event.facts;
   if(facts?.counterplayVersion!==1)continue;
   const p=facts.counterplay;
   const pre=match.moments[i]?.navigation?.before;
   if(!p||!pre||!['shutdown_hunt','isolated_pick',
      'trailing_counterattack','visible_advantage'].includes(p.reason)){
    errors.push('Counterplay missing documented decision at '+i);continue;
   }
   const attacker=pre[facts.actorId],defender=pre[facts.targetId];
   if(!attacker?.alive||!defender?.alive||
     attacker.teamId!==event.teamId||attacker.teamId===defender.teamId||
     facts.targetId!==p.targetId||
     !navAPI().combatRange(attacker.node,defender.node,2))
    errors.push('Counterplay without physical opponent '+i);
   if(!Array.isArray(facts.participantIds)||
      facts.participantIds.length<2||
      !Number.isFinite(p.score)||p.score<30||
      !Number.isSafeInteger(p.localEdge)||p.localEdge<0)
    errors.push('Counterplay without visible numerical opportunity '+i);
   if(facts.counterPressure){
    const w=facts.counterPressure;
    if(!facts.victimIds?.length||w.teamId!==event.teamId||
       w.created!==event.minute||w.until!==w.created+3||
       !['TOP','MID','BOT'].includes(w.lane)||
       !Array.isArray(w.allowed)||!w.allowed.length)
     errors.push('Pressure order without a real won fight '+i);
   }
  }
  return errors;
 }
 core.Counterplay=Object.freeze({opportunities,choose,pressureAfterKill,
  followup,audit});
})(globalThis);
