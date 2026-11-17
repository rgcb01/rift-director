import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx={};
vm.runInNewContext(readFileSync(new URL('../src/core/reset-coordination.js',import.meta.url),'utf8'),ctx);
const C=ctx.RiftCore.ResetCoordination;
const fixture=()=>({teamId:'a',minute:20,players:['TOP','JUN','MID','ADC','SUP'].map(role=>({
 id:role,role,teamId:'a',alive:true,inField:true,resetting:false,safe:true,canStart:true,
 reason:null,hp:100,returnMinutes:4,waveSafe:true
}))});
const set=(f,role,opts)=>Object.assign(f.players.find(p=>p.role===role),opts);
const ids=r=>Array.from(r.ids);
test('bot resets synchronize only when two independently justified and covered',()=>{
 const f=fixture();set(f,'ADC',{hp:40,reason:'low_health'});
 assert.deepEqual(ids(C.select(f)),['ADC']);
 set(f,'SUP',{reason:'low_mana'});
 const pair=C.select(f);
 assert.equal(pair.kind,'bot_sync');assert.deepEqual(ids(pair),['ADC','SUP']);
 assert.equal(pair.evidence.fieldAfter,3);
 set(f,'SUP',{waveSafe:false});
 assert.deepEqual(ids(C.select(f)),['ADC']);
});
test('critical health has priority over a discretionary pair',()=>{
 const f=fixture();set(f,'ADC',{hp:40,reason:'low_health'});set(f,'SUP',{reason:'low_mana'});
 set(f,'TOP',{hp:15,reason:'critical_health'});
 assert.deepEqual(ids(C.select(f)),['TOP']);
});
test('existing resets, deaths and commitments consume map availability',()=>{
 const f=fixture();set(f,'ADC',{hp:40,reason:'low_health'});set(f,'SUP',{reason:'low_mana'});
 set(f,'TOP',{resetting:true});assert.equal(C.select(f).kind,'staggered');
 set(f,'MID',{alive:false});assert.equal(C.select(f).kind,'hold');
 set(f,'MID',{alive:true});set(f,'ADC',{siegeEscort:true});
 assert.deepEqual(ids(C.select(f)),['SUP']);
});
test('objective escort with insufficient return window and assigned defenders cannot reset',()=>{
 const f=fixture();set(f,'JUN',{hp:40,reason:'low_health'});
 set(f,'SUP',{hp:45,reason:'low_health'});
 f.objective={action:'contest',target:'baron_pit',until:23,requiredIds:['JUN','SUP']};
 assert.equal(C.select(f).kind,'hold');
 f.objective.until=26;assert.deepEqual(ids(C.select(f)),['JUN']);
 set(f,'JUN',{baseDefender:true});f.baseThreat=true;
 assert.equal(C.select(f).kind,'hold');
 set(f,'SUP',{hp:15,reason:'critical_health'});assert.deepEqual(ids(C.select(f)),['SUP']);
});
test('selection is deterministic, non-mutating, and rejects malformed teams',()=>{
 const f=fixture();set(f,'MID',{hp:40,reason:'low_health'});
 const prior=JSON.stringify(f);assert.equal(JSON.stringify(C.select(f)),JSON.stringify(C.select(f)));
 assert.equal(JSON.stringify(f),prior);
 f.players[0].role='JUN';assert.throws(()=>C.select(f),/Invalid team/);
});
