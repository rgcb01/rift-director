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
 core.Navigation.advance(nav,37,{},state,{health,map:state.map});
 assert.equal(nav.siegeTeam,a.id);
 assert.ok(['TOP','MID'].includes(nav.sideLane));
 assert.notEqual(nav.sideLane,nav.siegeLane);
 const attackers=Object.values(nav.agents).filter(x=>x.teamId===a.id);
 const defender=Object.values(nav.agents).filter(x=>x.teamId===b.id);
 assert.equal(attackers.filter(x=>x.intent==='splitpush').length,1);
 assert.equal(attackers.filter(x=>x.intent==='siege').length,4);
 assert.equal(defender.filter(x=>x.intent==='counterpush').length,1);
 assert.equal(defender.filter(x=>x.intent==='defend').length,4);
 assert.equal(attackers.find(x=>x.intent==='splitpush').lane,nav.sideLane);
 assert.equal(defender.find(x=>x.intent==='counterpush').lane,nav.sideLane);
 assert.ok(attackers.every(x=>x.route.length>=1));
});

test('presión lateral visible activa contraasedio, sin órdenes teletransportadas',()=>{
 const {core,a,b,nav,state,health}=setup();
 core.Navigation.advance(nav,37,{},state,{health,map:state.map});
 const lane=nav.sideLane;
 state.waves[lane].front=nav.siegeTeam===a.id?2.4:-2.4;
 core.Navigation.advance(nav,38,{},state,{health,map:state.map});
 const defender=Object.values(nav.agents).filter(x=>x.teamId===b.id);
 const p=defender.find(x=>x.intent==='counter_siege');
 assert.ok(p,'Sin contraasedio pese a oleada visible');
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
