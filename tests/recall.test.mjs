import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const env={};
vm.runInNewContext(readFileSync(new URL('../src/core/recall.js',import.meta.url),'utf8'),env);
const R=env.RiftCore.Recall;
const input={id:'p1',side:'blue',node:'blue_mid_inner',at:60,alive:true,hp:25,resource:90,resourceType:'mana',safe:true};
const check={id:'p1',node:input.node,alive:true};
test('recall by health without purchase: eight seconds, own fountain, no mutation of input',()=>{
 const state=R.create();
 assert.equal(R.start(state,input).reason,'low_health');
 assert.equal(R.advance(state,{...check,at:67}),null);
 const receipt=R.advance(state,{...check,at:68});
 assert.equal(receipt.status,'completed');
 assert.equal(receipt.to,'blue_fountain');
 assert.equal(receipt.endedAt,68);
 assert.equal(input.node,'blue_mid_inner');
 assert.equal(R.advance(state,{...check,at:69}),null);
});
test('mana and energy are distinct; purchase requires safe wave and no impending objective',()=>{
 assert.equal(R.reason({hp:100,resource:10,resourceType:'mana'}),'low_mana');
 assert.equal(R.reason({hp:100,resource:10,resourceType:'energy'}),null);
 assert.equal(R.reason({hp:100,canBuy:true,waveSafe:true,objectiveSoon:true}),null);
 assert.equal(R.reason({hp:100,canBuy:true,waveSafe:true}),'item_spike');
});
test('recall is cancelled by damage, movement, death or an interrupting action',()=>{
 for(const [delta,reason] of [[{damageTaken:1},'damage'],[{node:'blue_nexus'},'movement'],[{alive:false},'death'],[{actionInterrupted:true},'action']]){
  const state=R.create();R.start(state,input);
  const result=R.advance(state,{...check,at:68,...delta});
  assert.equal(result.status,'cancelled');assert.equal(result.interruption,reason);
  assert.equal(result.to,undefined);
 }
});
test('unsafe, dead, healthy and already in fountain players cannot start; cooldown is enforced',()=>{
 for(const delta of [{safe:false},{alive:false},{hp:100},{node:'blue_fountain'}])
  assert.equal(R.start(R.create(),{...input,...delta}),null);
 const s=R.create();R.start(s,input);
 assert.equal(R.start(s,{...input,at:61}),null);
 R.advance(s,{...check,at:68});
 assert.equal(R.start(s,{...input,at:127}),null);
 assert.equal(R.start(s,{...input,at:128}).status,'channeling');
});
test('clock cannot rewind and snapshots cannot change live state',()=>{
 const s=R.create();R.start(s,input);
 R.advance(s,{...check,at:64});
 assert.equal(R.advance(s,{...check,at:63,damageTaken:1}),null);
 const snap=R.snapshot(s);snap.entries.p1.status='completed';
 assert.equal(s.entries.p1.status,'channeling');
});
