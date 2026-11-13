import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

const setup=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Tactical QA');
 const fixture=Object.values(world.fixtures).flat().find(x=>[x.a,x.b].includes(world.userClub));
 const a=world.clubs.find(c=>c.id===fixture.a),b=world.clubs.find(c=>c.id===fixture.b);
 const teams=Object.fromEntries([a,b].map(c=>[c.id,
  ctx.core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=ctx.core.Navigation.createNavigation([a,b],teams,13451);
 const health=ctx.core.Encounters.create(world.players);
 const gold={[a.id]:500,[b.id]:500};
 const lanes=Object.fromEntries([a,b].map(c=>[c.id,{TOP:0,MID:0,BOT:0}]));
 const map=ctx.core.computeMapState({clubs:[a,b],teams,gold,lanes,
  minute:10,userClub:a.id,style:'balanced'});
 const positions=Object.fromEntries(Object.entries(nav.agents).map(([id,p])=>[id,{...p}]));
 const context={health,map,positions};
 const state={gold,lanes,towers:{[a.id]:0,[b.id]:0},
  kills:{[a.id]:0,[b.id]:0},barons:{[a.id]:0,[b.id]:0}};
 return {...ctx,world,fixture,a,b,teams,nav,context,state,health};
};
const decide=(x,agent,t,baseline)=>x.core.TacticalAI.choose({
 nav:x.nav,agent,minute:t,context:x.context,worldState:x.state,baseline
});

test('baja vida: todos los roles escogen recuperación sin saltos y con histéresis',()=>{
 const x=setup();
 for(const role of x.core.ROLES){
  const agent=x.nav.agents[x.a.lineup[role]];
  x.context.health[agent.id]=27;
  const baseline={goal:agent.node,intent:'lane'};
  const plan=decide(x,agent,10,baseline);
  assert.equal(plan.reason,'low_health');
  assert.equal(plan.intent,'recover');
  assert.ok(x.core.Navigation.adjacency[plan.goal]);
  if(role==='JUN')assert.ok(x.core.Navigation.jungleAllowed('blue',plan.goal));
  x.context.health[agent.id]=60;
  assert.equal(decide(x,agent,11,baseline).reason,'low_health',
   'No cambiar de decisión con 60% por oscilar cerca de umbral');
  x.context.health[agent.id]=82;
  assert.notEqual(decide(x,agent,12,baseline).reason,'low_health');
 }
});

test('SUP abandona roaming programado para escoltar ADC herido',()=>{
 const x=setup(),sup=x.nav.agents[x.a.lineup.SUP],adc=x.nav.agents[x.a.lineup.ADC];
 x.context.health[adc.id]=51;
 const plan=decide(x,sup,15,{goal:'lower_river',intent:'ward_roam'});
 assert.equal(plan.intent,'escort');
 assert.equal(plan.reason,'protect_injured_adc');
 assert.equal(plan.goal,adc.node);
 x.context.health[adc.id]=100;
 assert.equal(decide(x,sup,15,{goal:'lower_river',intent:'ward_roam'}).intent,'ward_roam');
});

test('JUN evita gank a línea saludable con demasiada visión enemiga',()=>{
 const x=setup(),jun=x.nav.agents[x.a.lineup.JUN];
 const baseline=x.core.Navigation.gankPlanForLane(x.nav,jun,'TOP');
 x.context.map.lanes.TOP.vision[x.b.id]=96;
 x.context.map.lanes.TOP.vision[x.a.id]=44;
 const selected=decide(x,jun,7,baseline);
 assert.equal(selected.reason,'avoid_bad_gank');
 assert.equal(selected.goal,'blue_jungle_lower');
 assert.equal(selected.intent,'farm_jungle');
 assert.equal(x.core.Navigation.jungleAllowed('blue',selected.goal),true);
});

test('JUN reorienta gank a carril vulnerable por vida real',()=>{
 const x=setup(),jun=x.nav.agents[x.a.lineup.JUN];
 const baseline=x.core.Navigation.gankPlanForLane(x.nav,jun,'TOP');
 x.context.map.lanes.TOP.vision[x.b.id]=60;
 x.context.map.lanes.MID.vision[x.a.id]=12;
 x.context.map.lanes.MID.vision[x.b.id]=49;
 x.context.health[x.b.lineup.MID]=32;
 const unscouted=decide(x,jun,7,baseline);
 assert.notEqual(unscouted.reason,'opportunity_gank',
  'JUN no debe conocer HP distante de una línea sin visión');
 x.context.map.lanes.MID.vision[x.a.id]=96;
 const goal=decide(x,jun,7,baseline);
 assert.equal(goal.reason,'opportunity_gank');
 assert.equal(goal.lane,'MID');
 assert.ok(x.core.Navigation.jungleAllowed('blue',goal.goal));
});

test('un 2v1 detectado provoca retroceso, pero el 1v1 igualado no',()=>{
 const x=setup(),mid=x.nav.agents[x.a.lineup.MID];
 x.context.health[mid.id]=70;
 const baseline={goal:'blue_mid_front',intent:'lane'};
 const equal=decide(x,mid,10,baseline);
 assert.equal(equal.intent,'lane');
 x.context.positions[x.a.lineup.JUN].node='blue_fountain';
 const enemyJUN=x.context.positions[x.b.lineup.JUN];
 enemyJUN.node='mid_center'; // Visible proximity to blue MID; never teleport actual game.
 const enemyMID=x.context.positions[x.b.lineup.MID];
 enemyMID.node='blue_mid_front';
 x.context.map.lanes.MID.vision[x.a.id]=99;
 let caught=false;
 for(let seed=1;seed<=50;seed++){
  x.nav.seed=seed;
  const plan=decide(x,mid,10,baseline);
  if(plan.reason==='outnumbered_visible'){
   assert.equal(plan.intent,'fallback');
   assert.equal(plan.goal,'blue_mid_inner');
   caught=true;break;
  }
 }
 assert.ok(caught,'La superioridad visible debe poder alterar la decisión');
});

test('sin visión no se revela siempre el segundo enemigo distante',()=>{
 const x=setup(),mid=x.nav.agents[x.a.lineup.MID];
 x.context.positions[x.b.lineup.JUN].node='upper_river';
 const seen=new Set();
 for(let seed=1;seed<=80;seed++){
  x.nav.seed=seed;
  x.context.map.lanes.MID.vision[x.a.id]=20;
  const low=x.core.TacticalAI.observe({nav:x.nav,agent:mid,minute:7,context:x.context}).visibleEnemies;
  x.context.map.lanes.MID.vision[x.a.id]=97;
  const high=x.core.TacticalAI.observe({nav:x.nav,agent:mid,minute:7,context:x.context}).visibleEnemies;
  assert.ok(high>=low,'Mejor visión no debe reducir detección con misma seed');
  seen.add(low+'/'+high);
 }
 assert.ok([...seen].some(v=>v.split('/')[0]!==v.split('/')[1]),
  'La visión no afectó ninguna detección');
});

test('después del minuto 36 no modifica el asedio legal del nexo',()=>{
 const x=setup(),mid=x.nav.agents[x.a.lineup.MID];
 x.context.health[mid.id]=12;
 const baseline={goal:'red_nexus',intent:'siege'};
 const planned=decide(x,mid,44,baseline);
 assert.equal(planned,baseline);
});

test('90 partidas: decisiones reproducibles, movimientos legales y replays auditados',()=>{
 const x=setup(),{sim,core,world,fixture}=x;
 const seen=new Set(),reasons=new Set();
 for(let seed=1;seed<=90;seed++){
  world.rng=seed*11939;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner);
  const errors=[
   ...core.Navigation.auditNavigation(match,world),
   ...core.TacticalAI.audit(match,world),
   ...core.Encounters.audit(match,world),
   ...core.auditMatch(match,world),
   ...core.auditMinimap(match,world),
   ...core.MatchReplay.auditMoments(match,world),
   ...core.auditBroadcast(match,world)
  ];
  assert.equal(errors.length,0,'Seed '+seed+': '+errors.slice(0,5).join(' / '));
  for(const frame of match.frames){
   if(frame.minute===0||frame.minute>=36)continue;
   for(const [id,p] of Object.entries(frame.navigation.before)){
    if(!p.alive)continue;
    assert.ok(p.reason,'No tactical reason for '+id);
    if(p.decisionVersion===1)seen.add(p.role);
    if(p.reason)reasons.add(p.reason);
    if(p.role==='JUN'){
     const authorized=frame.siegeDecision?.stage===3&&
      frame.siegeDecision?.teamId===p.teamId&&
      frame.siegeDecision?.escorts?.includes(id);
     assert.ok(core.Navigation.jungleAllowed(
      p.teamId===fixture.a?'blue':'red',p.goal)||authorized,
      'JUN sin una orden individual de cierre: '+id);
    }
   }
  }
 }
 assert.equal(seen.size,5);
 assert.ok(reasons.has('low_health'));
 assert.ok(reasons.has('scheduled_jungle'));
 assert.ok(reasons.has('hold_role_plan'));
});
