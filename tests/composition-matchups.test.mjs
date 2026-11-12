import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';
import {COMPOSITIONS,ROLES,compositionDraft,runCompositionMatchups} from '../benchmarks/composition-matchups.mjs';

test('five composition hypotheses use unique valid role-locked drafts',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Composition QA');
 const team=world.clubs[0];
 assert.equal(Object.keys(COMPOSITIONS).length,5);
 assert.equal(new Set(Object.values(COMPOSITIONS).map(c=>JSON.stringify(c))).size,5);
 for(const name of Object.keys(COMPOSITIONS)){
  const draft=compositionDraft(world,core,team.id,name);
  assert.equal(Object.keys(draft).length,5);
  for(const role of ROLES)assert.equal(draft[team.lineup[role]],COMPOSITIONS[name][role]);
 }
 assert.throws(()=>compositionDraft(world,core,team.id,'unknown'),/Invalid composition/);
});

test('round robin swaps entire drafts across identical fixture and seed without dropping invalid pairs',()=>{
 const result=runCompositionMatchups({pairsPerMatchup:1});
 assert.equal(result.requestedPairs,10);
 assert.equal(result.validPairs,10,JSON.stringify(result.failures));
 assert.equal(result.failures.length,0);
 assert.equal(result.rows.length,10);
 assert.equal(result.summary.reduce((n,r)=>n+r.games,0),40);
 assert.equal(result.summary.reduce((n,r)=>n+r.wins,0),20);
 for(const {first,second,legs} of result.cases){
  assert.equal(legs.length,2);
  assert.equal(legs[0].blue,first);
  assert.equal(legs[0].red,second);
  assert.equal(legs[1].blue,second);
  assert.equal(legs[1].red,first);
  for(const leg of legs)assert.ok([first,second].includes(leg.winner));
 }
 for(const {paired} of result.rows){
  assert.equal(paired.firstSweep+paired.secondSweep+paired.split,1);
  assert.equal(paired.blueSweep+paired.redSweep,paired.split);
 }
});
