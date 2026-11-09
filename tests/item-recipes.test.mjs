import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';
const roster=()=>['TOP','JUN','MID','ADC','SUP'].flatMap((role,i)=>[
 {id:'a'+i,teamId:'a',role},{id:'b'+i,teamId:'b',role}
]);
const nav=(players)=>({a:'a',b:'b',agents:Object.fromEntries(players.map(p=>
 [p.id,{...p,alive:true,intent:'lane',node:p.teamId==='a'?'blue_fountain':'red_fountain'}]))});
test('15 complete items + 15 real components have distinct stable IDs and valid recipes',()=>{
 const {core}=boot();const e=core.PowerEconomy;
 assert.equal(e.ITEM_CATALOG.length,15);
 assert.equal(e.COMPONENT_CATALOG.length,15);
 const ids=[...e.ITEM_CATALOG,...e.COMPONENT_CATALOG].map(x=>x.id);
 assert.equal(new Set(ids).size,30);
 assert.deepEqual(Array.from(e.ITEM_CATALOG.slice(0,5),x=>x.cost),[1850,2700,2600,4050,4200]);
 for(const item of e.ITEM_CATALOG){
  assert.ok(item.cost>0&&item.attack>=0&&item.defense>=0&&item.tempo>=0);
  assert.equal(item.recipe.length,2);
  const used=e.COMPONENT_CATALOG.filter(c=>item.recipe.includes(c.id));
  assert.equal(used.length,2);
  assert.ok(used.reduce((n,c)=>n+c.cost,0)<item.cost);
 }
});
test('shopping only at own fountain, component receipts, upgrade credits and six slots',()=>{
 const {core}=boot();const e=core.PowerEconomy,players=roster(),model=e.create(players),n=nav(players);
 const p=n.agents.a3,row=model.entries.a3,world={gold:{a:12000,b:11000}};
 row.wallet=14000;row.earned=14000;
 p.node='blue_mid_front';
 assert.equal(e.purchase(model,n,p,4,world),null);
 p.node='blue_fountain';
 const first=e.purchase(model,n,p,4,world);
 assert.ok(first&&first.goldCost>0&&first.slot===1);
 assert.equal(first.itemKind,'complete');
 assert.equal(row.spent,first.goldCost);
 // Explicitly stage an upgrade from bought components on the same player.
 const target=e.ITEM_CATALOG.find(x=>x.id==='bow');
 const parts=target.recipe.map(id=>e.COMPONENT_CATALOG.find(x=>x.id===id));
 row.items=parts.map(p=>p.id);
 row.wallet=14000-parts.reduce((a,b)=>a+b.cost,0);
 row.spent=parts.reduce((a,b)=>a+b.cost,0);
 row.earned=14000;
 // Preserve role fitting: the target with already owned ingredients is viable.
 const buy=e.nextPurchase(model,p.id,0);
 assert.ok(buy);
 const finished=e.purchase(model,n,p,5,world);
 assert.equal(finished?.itemId,'bow');
 assert.equal(finished.itemKind,'complete');
 assert.deepEqual(Array.from(finished.consumedIds).sort(),Array.from(target.recipe).sort());
 assert.equal(row.wallet+row.spent,row.earned);
 assert.ok(row.items.length<=6);
 if(finished.itemKind==='complete'&&finished.consumedIds.length){
  assert.equal(finished.goldCost+finished.consumedIds.reduce((sum,id)=>
    sum+e.COMPONENT_CATALOG.find(c=>c.id===id).cost,0),
    e.ITEM_CATALOG.find(c=>c.id===finished.itemId).cost);
 }
 // Six completed items bar further purchases.
 row.items=e.ITEM_CATALOG.slice(0,6).map(x=>x.id);
 assert.equal(e.nextPurchase(model,p.id,0),null);
});
test('components occupy slots and completing a recipe never credits duplicate gold',()=>{
 const {core}=boot();const e=core.PowerEconomy,players=roster(),model=e.create(players),n=nav(players);
 const p=n.agents.a2,row=model.entries.a2,world={gold:{a:0,b:0}};
 row.wallet=800;row.earned=800;
 const buy=e.nextPurchase(model,p.id,0);
 assert.ok(buy);
 assert.equal(buy.itemKind,undefined);
 assert.equal(buy.kind,'component');
 const ticket=e.purchase(model,n,p,10,world);
 assert.equal(ticket.itemKind,'component');
 assert.equal(row.items.length,1);
 assert.equal(row.spent,ticket.goldCost);
 assert.equal(row.wallet+row.spent,row.earned);
 assert.equal(new Set(row.items).size,row.items.length);
});
test('role affinity leads to differentiated recipes without randomness',()=>{
 const {core}=boot(),e=core.PowerEconomy;
 const players=roster(),model=e.create(players);
 for(const x of Object.values(model.entries)){x.wallet=10000;x.earned=10000}
 const chosen=['a0','a2','a3','a4'].map(id=>e.nextPurchase(model,id,0)?.id);
 assert.ok(new Set(chosen).size>=2,JSON.stringify(chosen));
});
