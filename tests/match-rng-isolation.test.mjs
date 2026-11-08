import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

test('azar deportivo aislado: cada partido consume exactamente una semilla global',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','RNG Isolation QA');
 const fixtures=Object.values(world.fixtures).flat();
 for(let seed=1;seed<=24;seed++){
  for(const f of [fixtures[0],fixtures[1],fixtures[fixtures.length-1]]){
   const original=(seed*97991)>>>0;
   const reference={rng:original};
   core.nextRandom(reference);
   world.rng=original;
   const match=sim.simulateMatch(f);
   assert.ok(match.winner,'Fixture sin ganador');
   assert.equal(world.rng,reference.rng,
    'El resultado o número de eventos alteró el RNG del mundo: seed '+seed);
   assert.equal(core.auditMatch(match,world).length,0);
  }
 }
});

test('igual estado inicial y semilla producen exactamente los mismos hechos y winner',()=>{
 const {sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','RNG Repeat QA');
 const fixture=Object.values(world.fixtures).flat()[0];
 world.rng=928173;
 const first=sim.simulateMatch(fixture);
 world.rng=928173;
 const second=sim.simulateMatch(fixture);
 assert.deepEqual(first.events,second.events);
 assert.deepEqual(first.frames,second.frames);
 assert.equal(first.winner,second.winner);
});
