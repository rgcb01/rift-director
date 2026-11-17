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
 assert.ok(r.receipt.casts.every(c=>['damage','control'].includes(c.kind)&&c.at===1500));
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

test('support spends an actual cast on a nearby injured ally and cannot cast twice',()=>{
 const x=setup();x.state.players.blue3.hp=40;
 const r=x.combat.step(x);
 const cast=r.receipt.casts.find(c=>c.casterId==='blue4');
 assert.ok(cast);assert.equal(cast.kind,'heal');assert.equal(cast.targetId,'blue3');
 const effect=r.receipt.effects.find(e=>e.actorId==='blue4');
 assert.equal(effect.amount,cast.amount);assert.equal(effect.targetId,'blue3');
 assert.ok(r.receipt.impacts.find(i=>i.targetId==='blue3').healed>0);
 assert.equal(r.receipt.casts.filter(c=>c.casterId==='blue4').length,1);
 assert.equal(x.combat.audit({...x,receipt:r.receipt}).length,0);
 const far={...x,state:JSON.parse(JSON.stringify(x.state))};
 far.state.players.blue3.node='blue_fountain';
 const distant=x.combat.step(far);
 assert.ok(!distant.receipt.effects.some(e=>e.actorId==='blue4'&&e.targetId==='blue3'));
});
test('control limits the next interval and prevents a cast until expiry',()=>{
 const x=setup();x.state.players.blue3.controlUntil=x.state.at+1;
 const r=x.combat.step(x),d=r.receipt.decisions.find(d=>d.actorId==='blue3');
 assert.ok(d);assert.equal(d.controlledSeconds,1);
 assert.ok(!r.receipt.casts.some(c=>c.casterId==='blue3'));
 assert.equal(d.attacks,Math.floor(x.core.ChampionScaling.effective(x.powerState.entries.blue3).attackSpeed*4));
});
