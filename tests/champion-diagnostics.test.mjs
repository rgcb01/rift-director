import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseChampionMatch,aggregateChampionDiagnostics}
 from '../benchmarks/champion-diagnostics.mjs';

const stats=(level,maxHp,attackDamage)=>({
 effectiveStats:{level,maxHp,attackDamage,armor:33,magicResist:30,attackSpeed:.68}
});
test('observed TTK uses actual recorded damage and never grants a synthetic kill',()=>{
 const match={events:[
  {minute:8,facts:{action:'lane_trade',impacts:[{id:'v',hpBefore:100,hpAfter:64,mitigation:.9}]}},
  {minute:10,facts:{action:'teamfight',impacts:[{id:'v',hpBefore:64,hpAfter:0,mitigation:.8}]}},
  {minute:12,facts:{action:'skirmish',targetId:'q',hpBefore:100,hpAfter:75,
   mitigation:1.1}}
 ],frames:[
  {minute:20,powerEconomy:{entries:{v:stats(9,1430,93),q:stats(9,1100,99)}}},
  {minute:49,powerEconomy:{entries:{v:stats(14,1950,114),q:stats(14,1600,119)}}}
 ]};
 const orig=JSON.stringify(match);
 const d=diagnoseChampionMatch(match);
 assert.equal(d.damage,125);
 assert.equal(d.observedTtkKills,1);
 assert.equal(d.observedTtkTotal,3);
 assert.equal(d.mitigationEvents,3);
 assert.equal(d.at20.maxHp,1265);
 assert.equal(d.atEnd.maxHp,1775);
 assert.equal(JSON.stringify(match),orig);
 const a=aggregateChampionDiagnostics([{championDiagnostics:d}]);
 assert.equal(a.hpDamagePerMatch,125);
 assert.equal(a.observedTtkMinutes,3);
 assert.equal(a.hp20,1265);
 assert.equal(a.hpEnd,1775);
});
test('historical matches without champion stats remain distinguishable',()=>{
 const d=diagnoseChampionMatch({events:[],frames:[{minute:40,powerEconomy:{entries:{}}}]});
 assert.equal(d.at20,null);
 assert.equal(d.atEnd,null);
 const a=aggregateChampionDiagnostics([{championDiagnostics:d}]);
 assert.equal(a.hp20,null);
 assert.equal(a.observedTtkMinutes,null);
});
