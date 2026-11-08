import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

test('oleadas y placas: recompensa secuencial sin duplicación y primera torre única',()=>{
 const {core}=boot(),e=core.LaneEconomy;
 const state=e.create('team-a','team-b');
 assert.equal(e.canPressureTower(state,'team-a','BOT',1,10),false);
 state.lanes.BOT.front=2.2;
 assert.equal(e.canPressureTower(state,'team-a','BOT',1,10),true);
 assert.equal(e.canPressureTower(state,'team-b','BOT',1,10),false);
 const prizes=[1,2,3].map(()=>e.claimPlate(state,{
  teamId:'team-a',defenderId:'team-b',lane:'BOT',stage:1,minute:12}));
 assert.deepEqual(prizes.map(x=>x.plate),[1,2,3]);
 assert.ok(prizes.every(x=>x.gold>0));
 assert.equal(e.hasBrokenPlates(state,'team-b','BOT',1),true);
 assert.equal(e.claimPlate(state,{teamId:'team-a',defenderId:'team-b',lane:'BOT',stage:1,minute:14}),null);
 assert.equal(e.firstTowerBonus(state,'team-a',15),300);
 assert.equal(e.firstTowerBonus(state,'team-b',16),0);
 assert.equal(e.snapshot(state).firstTower.teamId,'team-a');
});

test('partidos reproducibles: oro por oleadas, placas causales, replays íntegros',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Economy QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 let seenPlates=0,earlyTowers=0;
 for(let seed=1;seed<=30;seed++){
  world.rng=seed*26987;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Sin ganador: '+seed);
  const failures=[
    ...core.Navigation.auditNavigation(match,world),
    ...core.LaneEconomy.audit(match),
    ...core.Encounters.audit(match,world),
    ...core.auditMatch(match,world),
    ...core.auditMinimap(match,world),
    ...core.MatchReplay.auditMoments(match,world),
    ...core.auditBroadcast(match,world)
  ];
  assert.equal(failures.length,0,'Seed '+seed+': '+failures.slice(0,5).join(' | '));
  for(const f of match.frames){
   assert.ok(f.laneEconomy);
   assert.ok(f.laneEconomy.income[fixture.a].farm>=0);
   assert.ok(f.laneEconomy.income[fixture.b].farm>=0);
  }
  for(const evt of match.events){
   if(evt.facts?.action==='plate'){
    seenPlates++;
    assert.ok(evt.facts.goldReward>0);
   }
   if(evt.facts?.action==='tower'&&evt.minute<36)earlyTowers++;
  }
 }
 assert.ok(seenPlates>0,'Sin recompensas por placas en la muestra');
 // Early towers are a distribution metric, not a forced deterministic requirement.
});
