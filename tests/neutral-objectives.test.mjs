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
