import {test} from 'node:test';
import assert from 'node:assert/strict';
import {equipmentAt,diagnoseMatch,aggregateDiagnostics} from '../benchmarks/economy-diagnostics.mjs';
const catalogue=[{id:'blade',attack:5,defense:0},{id:'mantle',attack:0,defense:6}];
const frame=(minute,goldA,goldB,spentA,spentB,itemsA,itemsB)=>({
 minute,gold:{a:goldA,b:goldB},
 powerEconomy:{entries:{
  p1:{teamId:'a',spent:spentA,wallet:1000,items:itemsA},
  p2:{teamId:'b',spent:spentB,wallet:2000,items:itemsB}
 }}
});
test('equipamiento histórico mide recursos gastados y sin gastar por separado',()=>{
 const x=equipmentAt(frame(20,5000,7000,2700,2600,['blade'],['mantle']),'a',catalogue);
 assert.deepEqual(x,{spent:2700,wallet:1000,completed:1,attack:5,defense:0});
});
test('remontadas condicionales y shutdown posterior sin inventar objetivos',()=>{
 const m={winner:'a',frames:[
  frame(20,5000,7100,2700,2600,['blade'],['mantle']),
  frame(22,5500,7400,2700,2600,['blade'],['mantle']),
  frame(27,6300,7800,2700,2600,['blade'],['mantle']),
  frame(30,7000,7900,2700,2600,['blade'],['mantle'])
 ],events:[
  {minute:22,teamId:'a',facts:{action:'kill',bountyGold:300}},
  {minute:24,teamId:'a',facts:{action:'tower'}},
  {minute:24,teamId:'b',facts:{action:'dragon'}},
  {minute:30,teamId:'a',facts:{action:'dragon'}}
 ]};
 const d=diagnoseMatch(m,{a:'a',b:'b'},catalogue);
 assert.equal(d.deficit,'a');assert.equal(d.comeback,true);
 assert.equal(d.underdogShutdowns,1);
 assert.equal(d.shutdownObjectives,1);assert.equal(d.shutdownTowers,1);
 const x=aggregateDiagnostics([{economyDiagnosis:d}]);
 assert.equal(x.eligibleComebacks20,1);
 assert.equal(x.conditionalComebackRate,1);
 assert.equal(x.underdogShutdownToObjective5Rate,1);
 assert.equal(x.earlyGoldGapMean,2100);
});
test('sin eventos shutdown no se reportan conversiones inventadas',()=>{
 const m={winner:'b',frames:[frame(20,5000,5200,2000,2000,[],[])],events:[]};
 const d=diagnoseMatch(m,{a:'a',b:'b'},catalogue);
 const result=aggregateDiagnostics([{economyDiagnosis:d}]);
 assert.equal(result.shutdownToObjective5Rate,null);
 assert.equal(result.conditionalComebackRate,null);
});
