/* Rift Director Alpha 0.7.6 — deterministic, role-aware reactive tactics.
 * Context is a start-of-minute position snapshot, HP and aggregate vision.
 * The AI never teleports, rolls gameplay RNG, or rewrites a past event.
 * A seen enemy is not omniscience: fog is approximated with seeded detection.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const graph=core.MiniGraph,LANES=['TOP','MID','BOT'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function hash(...parts){
 let h=2166136261>>>0;
 for(const v of parts)for(const ch of String(v)){
  h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;
 }
 return h;
}
const dist=(a,b)=>{
 const x=graph.nodes[a],y=graph.nodes[b];
 return x&&y?Math.hypot(x[0]-y[0],x[1]-y[1]):Infinity;
};
const laneOf=agent=>agent.role==='ADC'||agent.role==='SUP'?'BOT':
  agent.role==='JUN'?null:agent.role;
const laneFront=(side,lane)=>side+'_'+lane.toLowerCase()+'_front';
const laneInner=(side,lane)=>side+'_'+lane.toLowerCase()+'_inner';
function observe({nav,agent,minute,context}){
 const agents=context.positions||nav.agents;
 const here=agents[agent.id]||agent,side=agent.teamId===nav.a?'blue':'red';
 const other=agent.teamId===nav.a?nav.b:nav.a,lane=laneOf(agent);
 const map=context.map,vision=lane?map?.lanes?.[lane]?.vision?.[agent.teamId]:
   map?.riverVision?.[agent.teamId];
 const ownVision=clamp(Number.isFinite(vision)?vision:50,5,99);
 const opponents=[],allies=[];
 for(const target of Object.values(agents)){
  if(target.id===agent.id||!target.alive||dist(here.node,target.node)>106)continue;
  const hp=context.health?.[target.id]??100;
  if(target.teamId===agent.teamId){allies.push({target,hp});continue;}
  // Sight is limited by distance, abstract lane/river vision and seed.
  // At close range every enemy is known. At the outer 106-unit rim,
  // low vision can miss one enemy until an actual engagement occurs.
  const range=dist(here.node,target.node);
  const chance=clamp(.23+ownVision*.0074-(range/106)*.24,.22,.98);
  const detected=range<=42||hash(nav.seed,minute,agent.teamId,target.id,'sight')%1000<chance*1000;
  if(detected)opponents.push({target,hp});
 }
 return {agent,here,side,other,lane,ownVision,allies,opponents,
  visibleEnemies:opponents.length,localAllies:allies.length+1,
  hp:context.health?.[agent.id]??100,
  map};
}
const withReason=(plan,reason)=>({...plan,reason,decisionVersion:1});
function choose({nav,agent,minute,worldState,context,baseline}){
 if(!context?.health||!context?.positions||!context?.map)return baseline;
 if(minute>=36||!agent.alive)return baseline;
 if(['siege','defend','splitpush','counterpush','counter_siege'].includes(baseline?.intent))
  return withReason(baseline,'siege_commitment');
 const sight=observe({nav,agent,minute,context});
 const {side,lane,hp,opponents,allies,localAllies,ownVision}=sight;
 const ownJungle=side+'_jungle_lower';
 const safe=agent.role==='JUN'?ownJungle:laneInner(side,lane);
 const recovering=agent.recovering===true;
 // Emergency health is a commitment with hysteresis. Do not oscillate at
 // exactly the same threshold or give up recovery while travelling.
 const objectiveWindow=minute>=22&&minute<=29;
 const readyThreshold=objectiveWindow&&['JUN','SUP'].includes(agent.role)?62:76;
 if(hp<=36||recovering&&hp<readyThreshold){
  agent.recovering=true;
  return withReason({goal:safe,intent:'recover'},'low_health');
 }
 agent.recovering=false;
 const numericalThreat=opponents.length>localAllies;
 const riskHP=hp<77,pressure=opponents.some(x=>x.hp>55);
 if(lane&&numericalThreat&&riskHP&&pressure&&ownVision>=45){
  return withReason({goal:safe,intent:'fallback'},'outnumbered_visible');
 }
 // A weak ADC is protected by their SUP instead of abandoning lane for a
 // scheduled roam. The SUP does not know enemies outside vision range.
 if(agent.role==='SUP'){
  const partner=Object.values(context.positions).find(p=>
    p.teamId===agent.teamId&&p.role==='ADC'&&p.alive);
  const adcHP=partner?(context.health?.[partner.id]??100):100;
  if(partner&&adcHP<=58&&minute<=21){
   return withReason({goal:partner.node,intent:'escort'},'protect_injured_adc');
  }
 }
 if(agent.role==='JUN'){
  // Suppress scheduled ganks if local lanes offer no safe opening,
  // especially when the opponent has strong abstract vision.
  if(baseline.intent==='gank_setup'){
   const options=LANES.map(l=>{
    const ourVision=context.map.lanes[l].vision[agent.teamId];
    const enemyVision=context.map.lanes[l].vision[agent.teamId===nav.a?nav.b:nav.a];
    const ally=Object.values(context.positions).filter(p=>
      p.teamId===agent.teamId&&p.alive&&core.Navigation.isLaneNode(p.node,l));
    // Scouting does not reveal an enemy's HP merely because they exist in
    // the world state. A high-vision lane is readable; lower vision requires
    // an actual local sighting or a deterministic (not guaranteed) report.
    const discovered=p=>ourVision>=90||dist(agent.node,p.node)<=42||
      hash(nav.seed,minute,agent.teamId,p.id,l,'scout')%1000<
      clamp(.08+ourVision*.008,0.1,.87)*1000;
    const enemy=Object.values(context.positions).filter(p=>
      p.teamId!==agent.teamId&&p.alive&&
      core.Navigation.isLaneNode(p.node,l)&&discovered(p));
    const weak=enemy.filter(p=>(context.health?.[p.id]??100)<=66).length;
    const best=clamp(weak*32+(ally.length-enemy.length)*13+
      (ourVision-enemyVision)*.45+(enemyVision<68?9:-8),-100,100);
    return {lane:l,score:best,enemyVision,weak,enemyCount:enemy.length};
   }).filter(x=>x.enemyCount>0)
     .sort((a,b)=>b.score-a.score||LANES.indexOf(a.lane)-LANES.indexOf(b.lane));
   const planned=options.find(p=>p.lane===baseline.lane);
   const candidate=options[0];
   // Keep some seeded scouting attempts when no lane is yet weak, but
   // divert unsafe ganks with poor vision, no target or too little HP.
   if(hp<63||!planned||planned.enemyVision>=83&&planned.weak===0&&
      planned.score<6){
    return withReason({goal:ownJungle,intent:'farm_jungle'},'avoid_bad_gank');
   }
   // Pivot to a clearly better lane only if it is meaningfully vulnerable.
   if(candidate&&candidate.lane!==baseline.lane&&candidate.weak>0&&
      candidate.score>=planned.score+19){
    const changed=core.Navigation.gankPlanForLane(nav,agent,candidate.lane);
    return withReason(changed,'opportunity_gank');
   }
  }
  if(baseline.intent==='objective_setup'&&hp<52)
   return withReason({goal:ownJungle,intent:'farm_jungle'},'unsafe_objective');
  return withReason(baseline,'scheduled_jungle');
 }
 // Engage a healthier, locally stronger side; do not advance all 10 heads
 // to the same neutral tile. A push requires pressure and a real advantage.
 if(lane&&minute>=14&&minute<=32&&hp>=78&&
    localAllies>opponents.length&&opponents.length>0){
  const advantage=context.map.lanes[lane].pressure[agent.teamId];
  if(advantage>=62&&ownVision>=56&&
     (agent.role!=='SUP'||allies.some(x=>x.target.role==='ADC'))){
   const center={TOP:'top_center',MID:'mid_center',BOT:'bot_corner'}[lane];
   return withReason({goal:center,intent:'pressure_push'},'local_advantage');
  }
 }
 return withReason(baseline,'hold_role_plan');
}
function audit(match,world){
 const errors=[];
 for(const frame of match.frames||[]){
  const nav=frame.navigation?.before;
  if(!nav)continue;
  for(const [id,p] of Object.entries(nav)){
   if(!p.alive||p.decisionVersion!==1)continue;
   if(!graph.nodes[p.goal])errors.push('Destino táctico inválido: '+id);
   if(p.reason==='low_health'&&p.intent!=='recover')
    errors.push('Recuperación sin orden de recuperarse: '+id);
   if(p.reason==='outnumbered_visible'&&p.intent!=='fallback')
    errors.push('Inferioridad sin retroceso: '+id);
   if(p.reason==='protect_injured_adc'&&p.role!=='SUP')
    errors.push('Protección de ADC atribuida a otro rol: '+id);
   if(p.role==='JUN'&&frame.minute<36&&!core.Navigation.jungleAllowed(
      p.teamId===match.fixture.a?'blue':'red',p.goal))
    errors.push('IA ordena al jungla entrar en línea: '+id);
  }
 }
 return errors;
}
core.TacticalAI=Object.freeze({choose,observe,laneOf,hash,audit});
})(globalThis);
