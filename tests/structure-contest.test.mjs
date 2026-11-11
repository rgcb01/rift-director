import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function setup(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Structural Contest QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  [f.a,f.b].includes(world.userClub));
 return {sim,core,world,fixture};
}

test('a Nexus cannot lose HP while its real defenders still contest the route',()=>{
 const {core,world,fixture}=setup();
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(role=>
  world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,551);
 const model=core.NexusSiege.create(fixture.a,fixture.b);
 const economy=core.LaneEconomy.create(fixture.a,fixture.b);
 const [blue,red]=clubs;
 const state={lanes:{[blue.id]:{TOP:0,MID:0,BOT:0},
  [red.id]:{TOP:0,MID:3,BOT:0}},waves:economy.lanes,
  baronBuff:{[blue.id]:0,[red.id]:0}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===blue.id?'blue_fountain':'red_fountain';
  p.alive=true;p.intent='lane';
 }
 for(const role of ['ADC','MID']){
  const p=nav.agents[blue.lineup[role]];
  p.node='red_nexus';p.intent='siege';
 }
 nav.agents[red.lineup.TOP].node='red_nexus';
 nav.agents[red.lineup.TOP].intent='defend';
 const candidates=core.NexusSiege.candidates(nav,state,35,health,{});
 assert.equal(candidates.length,1,'the raw candidate is physically reachable');
 assert.equal(candidates[0].defenderIds.length,1,'a defender is actually present');
 assert.equal(core.NexusSiege.advance(model,nav,state,35,health,{},[blue.id]).length,0);
 assert.equal(model.hp[red.id],core.NexusSiege.MAX_HP,
  'no HP may be granted through an unresolved local contest');
 nav.agents[red.lineup.TOP].intent='retreat';
 assert.equal(core.NexusSiege.advance(model,nav,state,36,health,{},[]).length,1,
  'after a genuine retreat the same wave may attack');
});

test('actual structural fights and damage replay from physical positions',()=>{
 const {sim,core,world,fixture}=setup();
 let contests=0,damage=0;
 for(let seed=1;seed<=30;seed++){
  world.rng=seed*88219;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'unfinished seed '+seed);
  const faults=[...core.auditMatch(match,world),
   ...core.Navigation.auditNavigation(match,world),
   ...core.Encounters.audit(match,world),
   ...core.NexusSiege.audit(match),
   ...core.MatchReplay.auditMoments(match,world)];
  assert.deepEqual(faults,[],'seed '+seed+': '+faults.slice(0,4).join(' | '));
  for(const [i,event] of match.events.entries()){
   const facts=event.facts;
   if(!facts)continue;
   const before=match.moments[i]?.navigation?.before;
   const after=match.moments[i]?.navigation?.after;
   if(facts.structureContest?.version===1){
    assert.ok(['TOP','MID','BOT','NEXUS'].includes(facts.structureContest.lane));
    assert.equal(facts.combatVersion,1);
    assert.ok(core.Navigation.combatRange(before[facts.actorId].node,
     before[facts.targetId].node,2),'an encounter must be in real range');
    assert.equal(facts.multiKill,facts.victimIds.length);
    contests++;
   }
   if(!['plate','tower_damage','nexus_damage','nexus'].includes(facts.action))continue;
   for(const id of facts.defenderIds||[]){
    const defender=after[id];
    if(!defender?.alive||defender.intent==='retreat')continue;
    for(const attackerId of facts.participantIds||[]){
     const p=after[attackerId];
     assert.ok(!p?.alive||!core.Navigation.combatRange(p.node,defender.node,2),
      'tower/Nexus HP passed through an active defender at seed '+seed);
    }
   }
   damage++;
  }
 }
 assert.ok(contests>0,'at least one structural defense must be fought on the map');
 assert.ok(damage>0,'the test must inspect real structural damage');
});

test('only the allied fountain rapidly heals; Nexus combat does not',()=>{
 const {core,world,fixture}=setup();
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(role=>
  world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,817);
 const id=clubs[0].lineup.ADC,agent=nav.agents[id];
 const health=core.Encounters.create(world.players);
 health[id]=20;
 agent.node='red_nexus';agent.intent='siege';
 core.Encounters.recover(health,nav,{},25);
 assert.equal(health[id],26,'enemy Nexus does not count as a healing fountain');
 agent.node='blue_nexus';
 core.Encounters.recover(health,nav,{},26);
 assert.equal(health[id],32,'own Nexus is combat territory, not the fountain');
 agent.node='blue_fountain';
 core.Encounters.recover(health,nav,{},27);
 assert.equal(health[id],67,'the real allied fountain heals rapidly');
});
