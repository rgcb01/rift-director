import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function setup(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Ward QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,
  core.ROLES.map(role=>world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,7169);
 return {sim,core,world,fixture,clubs,nav};
}
test('wards: solo JUN/SUP presentes, máximo dos por equipo, vida y expiración verificables',()=>{
 const {core,clubs,nav}=setup();
 const [a,b]=clubs;
 for(const agent of Object.values(nav.agents)){
  agent.node=agent.teamId===a.id?'blue_fountain':'red_fountain';
  agent.alive=true;agent.intent='lane';
 }
 nav.agents[a.lineup.SUP].node='lower_river';
 nav.agents[a.lineup.SUP].intent='ward_roam';
 nav.agents[b.lineup.JUN].node='upper_river';
 nav.agents[b.lineup.JUN].intent='objective_setup';
 assert.deepEqual(Array.from(core.Vision.advance(nav.vision,nav,14).map(w=>w.node)).sort(),
  ['lower_river','upper_river']);
 assert.equal(core.Vision.canSee(nav.vision,a.id,'lower_river',14),true);
 assert.equal(core.Vision.canSee(nav.vision,a.id,'upper_river',14),false);
 assert.equal(core.Vision.canSee(nav.vision,b.id,'lower_river',14),false);
 assert.equal(core.Vision.advance(nav.vision,nav,15).length,0);
 assert.equal(core.Vision.snapshot(nav.vision,21).wards.length,2);
 assert.equal(core.Vision.advance(nav.vision,nav,22).length,0);
 assert.equal(core.Vision.snapshot(nav.vision,22).wards.length,0);
 assert.equal(core.Vision.canSee(nav.vision,a.id,'lower_river',22),false);
});
test('40 mapas: wards con actor y equipo correctos, sin información histórica fabricada',()=>{
 const {sim,core,world,fixture}=setup();
 let count=0,withWard=0;
 for(let seed=1;seed<=40;seed++){
  world.rng=seed*14119;
  const match=sim.simulateMatch(fixture);
  const errors=[
   ...core.Vision.audit(match),...core.auditMatch(match,world),
   ...core.Navigation.auditNavigation(match,world),
   ...core.MatchReplay.auditMoments(match,world),
   ...core.TacticalAI.audit(match,world)
  ];
  assert.equal(errors.length,0,'Seed '+seed+': '+errors.slice(0,5).join(' | '));
  const placements=match.events.filter(e=>e.facts?.action==='ward_place');
  count+=placements.length;
  if(placements.length)withWard++;
  for(const e of placements){
   const idx=match.events.indexOf(e);
   const p=match.moments[idx].navigation.before[e.facts.actorId];
   assert.equal(p.node,e.facts.node);
   assert.equal(p.teamId,e.teamId);
  }
 }
 assert.ok(count>20&&withWard>10,'Debe existir actividad de visión causal en distintas seeds');
 console.log('WARD_SAMPLE='+JSON.stringify({count,withWard}));
});
