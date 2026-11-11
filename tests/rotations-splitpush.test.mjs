import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function setup(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Splitpush QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const a=world.clubs.find(c=>c.id===fixture.a),b=world.clubs.find(c=>c.id===fixture.b);
 const teams={
  [a.id]:core.ROLES.map(r=>world.players.find(p=>p.id===a.lineup[r])),
  [b.id]:core.ROLES.map(r=>world.players.find(p=>p.id===b.lineup[r]))
 };
 const nav=core.Navigation.createNavigation([a,b],teams,173111111);
 const economy=core.LaneEconomy.create(a.id,b.id);
 const map={
  lanes:Object.fromEntries(['TOP','MID','BOT'].map(l=>[l,{
   pressure:{[a.id]:50,[b.id]:50},
   vision:{[a.id]:70,[b.id]:70}
  }])),
  riverVision:{[a.id]:60,[b.id]:60}
 };
 const state={
  gold:{[a.id]:12500,[b.id]:10000},
  towers:{[a.id]:0,[b.id]:0},
  kills:{[a.id]:0,[b.id]:0},
  barons:{[a.id]:0,[b.id]:0},
  lanes:{[a.id]:{TOP:0,MID:0,BOT:0},[b.id]:{TOP:0,MID:0,BOT:0}},
  waves:economy.lanes,map
 };
 const health=Object.fromEntries([...teams[a.id],...teams[b.id]].map(p=>[p.id,100]));
 return {sim,core,world,fixture,a,b,nav,state,economy,health};
}

test('asignación estratégica: splitpush en segunda línea y contraataque en la misma',()=>{
 const {core,a,b,nav,state,health}=setup();
 state.waves.BOT.front=3.1;
 state.waves.TOP.front=.75;
 core.Navigation.advance(nav,37,{},state,{health,map:state.map});
 assert.equal(nav.siegeTeam,a.id);
 assert.ok(['TOP','MID'].includes(nav.sideLane));
 assert.notEqual(nav.sideLane,nav.siegeLane);
 const attackers=Object.values(nav.agents).filter(x=>x.teamId===a.id);
 const defender=Object.values(nav.agents).filter(x=>x.teamId===b.id);
 assert.equal(nav.siegeLane,'BOT');
 const splits=attackers.filter(x=>x.intent==='splitpush');
 assert.ok(splits.length<=1,'Nunca dividir más de un solo laner');
 assert.ok(attackers.filter(x=>x.intent==='siege').length>=2,
  'El asedio principal debe tener una escolta física');
 for(const p of defender.filter(x=>x.intent==='defend')){
  assert.equal(p.tacticReason,'visible_structure_defense',
   'Solo la defensa local de una torre observada puede reaccionar');
  assert.equal(p.lane,p.role==='ADC'||p.role==='SUP'?'BOT':p.role);
  assert.ok(p.goal.startsWith('red_'+p.lane.toLowerCase()+'_'),
   'La defensa no puede dirigirse a una estructura remota');
 }
 for(const p of splits)assert.equal(p.lane,nav.sideLane);
 assert.ok(attackers.every(x=>x.route.length>=1));
});

test('presión lateral visible activa contraasedio, sin órdenes teletransportadas',()=>{
 const {core,a,b,nav,state,health}=setup();
 state.waves.BOT.front=3.1;
 state.waves.TOP.front=.75;
 core.Navigation.advance(nav,37,{},state,{health,map:state.map});
 const lane=nav.sideLane;
 state.waves.BOT.front=3.8;
 state.waves[lane].front=nav.siegeTeam===a.id?2.4:-2.4;
 // Stage a visible, physically present opposing side-laner. A wave number
 // alone is not evidence that a player can react to a splitpush.
 const splitRole=lane==='TOP'?'TOP':'MID';
 const attacker=Object.values(nav.agents).find(x=>
  x.teamId===a.id&&x.role===splitRole);
 attacker.node='red_'+lane.toLowerCase()+'_outer';
 attacker.intent='splitpush';
 core.Navigation.advance(nav,38,{},state,{health,map:state.map});
 const defender=Object.values(nav.agents).filter(x=>x.teamId===b.id);
 const p=defender.find(x=>x.intent==='defend'&&
  x.tacticReason==='visible_structure_defense'&&x.lane===lane);
 console.log('COUNTER_SIEGE_DIAG='+JSON.stringify({
  attackingTeam:nav.siegeTeam,main:nav.siegeLane,side:nav.sideLane,
  wave:state.waves[lane].front,
  defenders:defender.map(q=>({role:q.role,intent:q.intent,reason:q.tacticReason,goal:q.goal})),
  attackers:Object.values(nav.agents).filter(q=>q.teamId===nav.siegeTeam)
   .map(q=>({role:q.role,intent:q.intent,goal:q.goal}))
 }));
 assert.ok(p,'La presión lateral con rival visible debe convocar una defensa local');
 assert.equal(p.lane,lane);
 assert.ok(core.Navigation.adjacent(p.movedFrom,p.node)||p.movedFrom===p.node,
  'Rotación sin recorrer aristas');
});

test('100 partidos de estrategia lateral preservan posición, KDA y replays',()=>{
 const {sim,core,world,fixture}=setup();
 let splitTurns=0,soloTowers=0,multiple=0;
 for(let seed=1;seed<=100;seed++){
  world.rng=seed*39007;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Sin nexo en seed '+seed);
  const faults=[
   ...core.Navigation.auditNavigation(match,world),
   ...core.auditMatch(match,world),
   ...core.LaneEconomy.audit(match),
   ...core.Encounters.audit(match,world),
   ...core.auditMinimap(match,world),
   ...core.MatchReplay.auditMoments(match,world),
   ...core.auditBroadcast(match,world)
  ];
  assert.equal(faults.length,0,'Seed '+seed+': '+faults.slice(0,4).join(' | '));
  for(const frame of match.frames)
   for(const a of Object.values(frame.navigation.before||{}))
    if(a.intent==='splitpush'||a.intent==='counterpush')splitTurns++;
  const towers=match.events.filter(e=>e.facts?.action==='tower');
  soloTowers+=towers.filter(e=>e.facts.soloSplitpush).length;
  if(new Set(towers.map(e=>e.facts.lane)).size>=2)multiple++;
 }
 assert.ok(splitTurns>100,'Los agentes nunca deciden splitpush o contraataque');
 console.log('SPLIT_SAMPLE='+JSON.stringify({splitTurns,soloTowers,multiLaneGames:multiple}));
});
