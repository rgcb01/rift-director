import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {boot} from './harness.mjs';
function setup(){
 const {core}=boot({now:1731111111000}),context={RiftCore:core};
 for(const name of ['simultaneous-fight','simultaneous-champion-combat'])
  vm.runInNewContext(readFileSync(new URL('../src/core/'+name+'.js',import.meta.url),'utf8'),context);
 const players={},entries={};
 const champs=['korvek','veyra','aeska','nyra','thessa'];
 const roles=['TOP','JUN','MID','ADC','SUP'];
 for(const team of ['blue','red'])for(let i=0;i<5;i++){
  const id=team+i;
  players[id]={id,teamId:team,role:roles[i],node:'mid_center',hp:100,alive:true,intent:'objective_setup'};
  entries[id]={id,role:roles[i],championId:champs[i],level:11,items:[]};
 }
 const powerState={entries},abilityState=core.ChampionKits.create(powerState);
 const state=core.SimultaneousFight.create({id:'test',at:1500,players});
 return {core,state,powerState,abilityState,combat:core.SimultaneousChampionCombat};
}
test('champion windows use actual stats, legal damaging casts and no external damage input',()=>{
 const x=setup(),before=JSON.stringify(x.state),kits=JSON.stringify(x.abilityState);
 const r=x.combat.step(x);
 assert.equal(r.receipt.actions.length,10);
 assert.ok(r.receipt.casts.length>0);
 assert.ok(r.receipt.casts.every(c=>c.kind==='damage'&&c.at===1500));
 assert.equal(new Set(r.receipt.casts.map(c=>c.casterId)).size,r.receipt.casts.length);
 assert.ok(r.receipt.decisions.every(d=>d.damage>=1&&d.damage<=120&&d.basic>=0));
 assert.equal(JSON.stringify(x.state),before);
 assert.equal(JSON.stringify(x.abilityState),kits);
 assert.equal(x.combat.audit({...x,receipt:r.receipt}).length,0);
 for(const cast of r.receipt.casts){
  assert.equal(r.abilityState.entries[cast.casterId].resource,cast.resourceAfter);
  assert.equal(r.abilityState.entries[cast.casterId].cooldowns[cast.slot],cast.cooldownUntil);
 }
 const next=x.combat.step({...x,state:r.state,abilityState:r.abilityState});
 for(const c of next.receipt.casts)
  assert.ok(!r.receipt.casts.some(p=>p.casterId===c.casterId&&p.slot===c.slot));
});
test('resource starvation prevents casts, while basic attacks remain possible',()=>{
 const x=setup();
 for(const p of Object.values(x.abilityState.entries)){p.resource=0;p.lastAt=x.state.at;}
 const r=x.combat.step(x);
 assert.equal(r.receipt.casts.length,0);
 assert.equal(r.receipt.actions.length,10);
 assert.ok(r.receipt.decisions.every(d=>d.spell===0));
});
test('auditor rejects damage, target and cast tampering rather than trusting packets',()=>{
 const x=setup(),r=x.combat.step(x);
 for(const field of ['actions','decisions','casts']){
  const forged=JSON.parse(JSON.stringify(r.receipt));
  if(field==='casts')forged.casts[0].cost++;
  else forged[field][0].damage++;
  assert.ok(x.combat.audit({...x,receipt:forged}).length>0);
 }
 const reversed={...x,state:{...x.state,players:Object.fromEntries(Object.entries(x.state.players).reverse())}};
 assert.equal(JSON.stringify(x.combat.step(reversed).receipt),JSON.stringify(r.receipt));
});
