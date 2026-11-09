import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';

test('15 original items with unique IDs, legacy costs, meaningful stats',()=>{
 const {core}=boot();
 const cat=core.PowerEconomy.ITEM_CATALOG;
 assert.equal(cat.length,15);
 assert.equal(new Set(cat.map(x=>x.id)).size,15);
 assert.deepEqual(cat.slice(0,5).map(x=>x.cost),[1850,2700,2600,4050,4200]);
 for(const item of cat){
  assert.ok(item.name&&item.cost>=1000&&item.unique&&item.shape&&item.color);
  assert.ok(Object.keys(item.stats).length);
 }
});
test('different roles rank different items, with six slot capacity',()=>{
 const {core}=boot();
 const econ=core.PowerEconomy;
 const players=['TOP','JUN','MID','ADC','SUP'].flatMap((role,i)=>[
  {id:'a'+i,teamId:'a',role},{id:'b'+i,teamId:'b',role}]);
 const model=econ.create(players);
 for(const p of players)model.entries[p.id].wallet=20000;
 const target={TOP:'a0',MID:'a2',ADC:'a3',SUP:'a4'};
 const picks=Object.values(target).map(id=>econ.nextPurchase(model,id)?.id);
 assert.ok(new Set(picks).size>=2,'Role-specific builds must differ');
 for(const p of players){
  model.entries[p.id].items=['boots','blade','mantle','focus','bulwark','spellbook'];
  assert.equal(econ.nextPurchase(model,p.id),null,'Full inventory cannot buy');
 }
});
