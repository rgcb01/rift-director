import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function prepare(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Neutral QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>
  world.players.find(p=>p.id===c.lineup[r]))]));
 return {sim,core,world,fixture,clubs,teams};
}
function synthetic(ctx){
 const {core,clubs,teams}=ctx;
 const nav=core.Navigation.createNavigation(clubs,teams,173111111);
 const [a,b]=clubs.map(c=>c.id);
 const waves=core.LaneEconomy.create(a,b).lanes;
 const state={minute:11,gold:{[a]:11000,[b]:11000},
  kills:{[a]:0,[b]:0},towers:{[a]:0,[b]:0},
  dragons:{[a]:0,[b]:0},barons:{[a]:0,[b]:0},
  nextDragon:5,nextBaron:20,
  lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves,map:{riverVision:{[a]:80,[b]:48},lanes:Object.fromEntries(
   ['TOP','MID','BOT'].map(l=>[l,{pressure:{[a]:70,[b]:30},
    vision:{[a]:80,[b]:48}}]))}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 return {nav,state,health,a,b};
}
test('una llamada por Dragón usa visión, oleadas, salud y no cambia el RNG mundial',()=>{
 const ctx=prepare(),{core}=ctx;
 const {nav,state,health,a,b}=synthetic(ctx);
 const seed=nav.seed;
 assert.equal(core.NeutralObjectives.activeCall(nav,state,10,health),false);
 const decision=core.NeutralObjectives.plan(nav,state,11,health);
 assert.ok(['take','contest'].includes(decision[a].action));
 assert.ok(['trade','contest','take'].includes(decision[b].action));
 assert.equal(seed,nav.seed);
 const available=core.NeutralObjectives.movement(nav,
  Object.values(nav.agents).find(p=>p.teamId===a&&p.role==='JUN'),11,state);
 nav.neutralPlans=decision;
 const assigned=core.NeutralObjectives.movement(nav,
  Object.values(nav.agents).find(p=>p.teamId===a&&p.role==='JUN'),11,state);
 assert.equal(available,null,'La IA no debe usar llamadas no comunicadas');
 assert.equal(assigned.goal,'dragon_pit');
 assert.equal(assigned.reason,'dragon_'+decision[a].action);
 assert.equal(assigned.intent,'objective_setup');
 // Objective traded away can only produce physical TOP movement, no free tower.
 nav.neutralPlans[b]={action:'trade',reason:'dragon_trade',until:16};
 const solo=Object.values(nav.agents).find(p=>p.teamId===b&&p.role==='TOP');
 const goal=core.NeutralObjectives.movement(nav,solo,11,state);
 assert.equal(goal.intent,'splitpush');
 assert.equal(goal.lane,'TOP');
 assert.match(goal.goal,/blue_top_outer/);
});
test('objetivo disponible no reemite la misma llamada en cada minuto y se reinicia tras captura',()=>{
 const ctx=prepare(),{core}=ctx;
 const {nav,state,health,a}=synthetic(ctx);
 const first=core.NeutralObjectives.plan(nav,state,11,health)[a];
 const second=core.NeutralObjectives.plan(nav,state,12,health)[a];
 assert.equal(second.created,first.created);
 assert.equal(first.until-first.created,3,
  'La preparación no debe mantener al equipo fuera de líneas por seis minutos');
 assert.equal(first.cooldownUntil-first.created,12,
  'El objetivo obliga a reconsiderar el costo de oportunidad antes de insistir');
 const cooling=core.NeutralObjectives.plan(nav,state,17,health)[a];
 assert.equal(cooling.action,'hold');
 state.nextDragon=17;
 const next=core.NeutralObjectives.plan(nav,state,22,health)[a];
 assert.ok(['dragon_pit','baron_pit'].includes(next.target));
 assert.equal(next.targetSpawn,next.target==='baron_pit'?state.nextBaron:state.nextDragon);
 assert.equal(next.created,22);
});
test('100 mapas: ningún Dragón ni torre intercambiada nace fuera del mapa',()=>{
 const {sim,core,world,fixture}=prepare();
 let drag=0,contested=0,stolen=0,trade=0,planSteps=0;
 for(let seed=1;seed<=100;seed++){
  world.rng=seed*314159;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Partido sin ganador seed '+seed);
  const errors=[...core.Navigation.auditNavigation(match,world),
   ...core.NeutralObjectives.audit(match),...core.auditMatch(match,world),
   ...core.LaneEconomy.audit(match),...core.PowerEconomy.audit(match),
   ...core.Encounters.audit(match,world),...core.auditBroadcast(match,world),
   ...core.MatchReplay.auditMoments(match,world)];
  assert.equal(errors.length,0,'seed '+seed+': '+errors.slice(0,5).join(' | '));
  const drakes=match.events.filter(e=>e.facts?.action==='dragon');
  drag+=drakes.length;
  contested+=drakes.filter(e=>e.facts.contested).length;
  stolen+=drakes.filter(e=>e.facts.stolen).length;
  trade+=match.events.filter(e=>e.facts?.crossmapTrade).length;
  planSteps+=match.frames.reduce((n,fr)=>n+Object.values(fr.navigation.before)
   .filter(p=>/^dragon_(take|contest|trade)$/.test(p.reason||'')).length,0);
  for(const e of drakes){
   assert.equal(e.facts.objectiveVersion,2);
   assert.ok(e.facts.participantIds.length>=1);
   const frame=match.frames.find(f=>f.minute===e.minute);
   for(const id of e.facts.participantIds){
    assert.ok(frame.navigation.before[id].alive);
    assert.ok(core.Navigation.nearby(frame.navigation.before[id].node,'dragon_pit',1));
   }
  }
 }
 assert.ok(drag>12,'Demasiados mapas sin Dragón aun con decisiones físicas');
 assert.ok(planSteps>100,'No se observan llamadas estratégicas reales');
 console.log('NEUTRAL_SAMPLE='+JSON.stringify({drag,contested,stolen,trade,planSteps}));
});

test('Baron available between old rotation windows remains a real strategic option',()=>{
 const {core}=prepare();
 const {nav,state,health,a,b}=synthetic(prepare());
 state.nextDragon=40;
 state.nextBaron=30;
 state.lanes[b].TOP=2;
 state.towers[a]=2;
 nav.siegeTeam=a;
 // A deep lane is not an automatic veto on a neutral objective.
 assert.equal(core.NeutralObjectives.activeCall(nav,state,31,health),true);
 const plans=core.NeutralObjectives.plan(nav,state,31,health);
 const call=plans[a];
 assert.equal(call.target,'baron_pit');
 assert.ok(['take','contest'].includes(call.action));
 assert.ok(call.until-call.created>=3&&call.until-call.created<=6);
 nav.neutralPlans=plans;
 for(const role of ['JUN','SUP']){
  const agent=Object.values(nav.agents).find(p=>p.teamId===a&&p.role===role);
  const order=core.NeutralObjectives.movement(nav,agent,31,state);
  assert.equal(order.goal,'baron_pit');
  assert.equal(order.intent,'objective_setup');
 }
 assert.equal(state.barons[a],0,'Planning does not capture Baron');
 assert.equal(state.lanes[b].TOP,2,'Planning does not award towers');
});

test('healthy reinforcements form an objective squad without abandoning strong side waves',()=>{
 const {core}=prepare();
 const {nav,state,health,a,b}=synthetic(prepare());
 state.nextDragon=40;state.nextBaron=22;
 state.waves.TOP.front=2.4;
 for(const p of Object.values(nav.agents)){
  if(p.teamId!==a)continue;
  p.node='baron_pit';p.intent='lane';
 }
 const plans=core.NeutralObjectives.plan(nav,state,22,health);
 const call=plans[a];nav.neutralPlans=plans;
 const actor=role=>Object.values(nav.agents).find(p=>p.teamId===a&&p.role===role);
 assert.equal(call.target,'baron_pit');
 assert.ok(call.reinforcementIds.includes(actor('MID').id));
 assert.ok(call.reinforcementIds.includes(actor('ADC').id));
 assert.ok(!call.reinforcementIds.includes(actor('TOP').id),
  'A strong TOP wave remains an independent splitpush opportunity');
 for(const role of ['JUN','SUP','MID','ADC'])
  assert.equal(core.NeutralObjectives.movement(nav,actor(role),22,state)?.goal,'baron_pit');
 assert.equal(core.NeutralObjectives.movement(nav,actor('TOP'),22,state),null);
 assert.equal(state.barons[a],0);
 assert.equal(state.towers[a],0);
 // Newly unsafe lane cancels its reinforcement without gifting an objective.
 state.waves.BOT.front=-2.4;
 assert.equal(core.NeutralObjectives.movement(nav,actor('ADC'),23,state),null);
});

test('early objective staging uses a shared reachable squad and protects immediate priorities',()=>{
 const {core}=prepare(),{nav,state,health,a,b}=synthetic(prepare());
 state.nextDragon=30;state.nextBaron=40;
 state.map.riverVision[b]=80;
 for(const p of Object.values(nav.agents)){p.node='lower_river';p.intent='group';}
 const run=(minute=26)=>core.NeutralObjectives.preparation({nav,world:state,minute,health});
 const before=JSON.stringify(nav),p=run()[a];
 assert.ok(p);assert.equal(p.target,'dragon_pit');assert.equal(p.staging,'lower_river');assert.equal(p.lead,4);
 assert.equal(p.members.length,3);assert.equal(JSON.stringify(nav),before);
 assert.equal(run(27)[a],undefined);
 nav.objectivePreparation=run();
 for(const m of p.members)assert.equal(core.NeutralObjectives.preparationMovement(nav,nav.agents[m.id],26)?.goal,'lower_river');
 const j=p.members.find(m=>m.role==='JUN');health[j.id]=64;assert.equal(run()[a],undefined);health[j.id]=100;
 nav.neutralPlans={[a]:{action:'contest',target:'baron_pit',until:28}};assert.equal(run()[a],undefined);nav.neutralPlans={};
 state.lanes[a].MID=3;assert.equal(run()[a],undefined);state.lanes[a].MID=0;
 nav.siegeDecision={teamId:a,stage:2,wave:1,travel:2,escorts:p.members.map(m=>m.id)};assert.equal(run()[a],undefined);
});
test('early staging compares 120 paired maps without fabricating captures or outcomes',()=>{
 let plans=0,orders=0,baseReady=0,ready=0,baseFights=0,fights=0,issues=[];
 const count=m=>m.frames.flatMap(fr=>fr.objectiveReadiness||[]).filter(r=>r.lead<=0&&r.members.filter(p=>p.ready&&p.present).length>=3).length;
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,engagePolicy:true,skirmishReinforcements:true,neutralHp:true,objectiveDiagnostics:true};
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,objectivePreparation:true});
    baseReady+=count(base);ready+=count(m);
    baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    for(const fr of m.frames){
     plans+=Object.keys(fr.objectivePreparation||{}).length;
     orders+=Object.values(fr.navigation.before||{}).filter(a=>a.reason==='objective_prepare').length;
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),...core.NeutralHealth.audit(m),
     ...core.ChampionKits.audit(m),...core.PowerEconomy.audit(m),...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,650)});}
  }
 }
 console.log('OBJECTIVE_STAGING='+JSON.stringify({maps:120,plans,orders,baseReady,ready,baseFights,fights,issues:issues.slice(0,5)}));
 assert.ok(plans>0,'Expected actual early plans');
 assert.ok(orders>0,'Expected real staging movement');
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
