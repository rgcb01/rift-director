import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {boot} from './harness.mjs';
function setup(){
 const {core}=boot({now:1731111111000}),ctx={RiftCore:core};
 for(const name of ['fight-positioning','simultaneous-fight','simultaneous-champion-combat'])
  vm.runInNewContext(readFileSync(new URL('../src/core/'+name+'.js',import.meta.url),'utf8'),ctx);
 const players={},entries={};
 const champs=['korvek','veyra','aeska','nyra','thessa'];
 const roles=['TOP','JUN','MID','ADC','SUP'];
 for(const team of ['blue','red'])for(let i=0;i<5;i++){
  const id=team+i;
  players[id]={id,teamId:team,role:roles[i],node:'mid_center',hp:100,alive:true,intent:'objective_setup',offset:{x:team==='blue'?-10:10,y:0}};
  entries[id]={id,role:roles[i],championId:champs[i],level:11,items:[]};
 }
 const powerState={entries},abilityState=core.ChampionKits.create(powerState);
 const state=core.SimultaneousFight.create({id:'position',at:1500,players});
 return {core,state,powerState,abilityState,P:core.FightPositioning,combat:core.SimultaneousChampionCombat,positioning:true};
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('ranged carries kite away while a support can screen an injured ally',()=>{
 const x=setup(),p=x.state.players;
 p.blue3.hp=60;p.blue4.offset={x:-17,y:0};
 const before=JSON.stringify(x.state),moves=x.P.plan(x);
 const kite=moves.find(m=>m.actorId==='blue3'),screen=moves.find(m=>m.actorId==='blue4');
 assert.equal(kite.reason,'kite');assert.ok(kite.to.x<kite.from.x);
 assert.equal(screen.reason,'screen');assert.ok(screen.to.x>screen.from.x);
 const next=x.P.apply(x.state,moves);
 assert.equal(JSON.stringify(x.state),before);
 for(const [id,row] of Object.entries(next.players)){
  assert.equal(row.node,p[id].node);
  assert.ok(Math.hypot(row.offset.x,row.offset.y)<=x.P.RADIUS+.002);
 }
 assert.ok(x.P.reach(next.players.blue3,next.players.red1));
});
test('an exposed carry creates a lateral assassin approach, not a teleport',()=>{
 const x=setup(),p=x.state.players;
 p.red3.offset={x:18,y:0};p.red3.hp=70;
 p.red0.offset={x:-18,y:0}; // beyond the local frontline protection radius
 p.blue1.offset={x:-10,y:-5};
 const m=x.P.plan(x).find(m=>m.actorId==='blue1');
 assert.equal(m.reason,'flank');assert.equal(m.targetId,'red3');
 assert.ok(m.to.y!==m.from.y);
 assert.ok(Math.hypot(m.to.x-m.from.x,m.to.y-m.from.y)<=x.P.STEP+.002);
});
test('movement respects control, node anchors and bounded travel',()=>{
 const x=setup();x.state.players.blue3.controlUntil=1501;
 const moves=x.P.plan(x);assert.ok(!moves.some(m=>m.actorId==='blue3'));
 const move=moves.find(m=>m.actorId==='red3');assert.ok(move);
 assert.throws(()=>x.P.apply(x.state,[{...move,node:'red_fountain'}]),/Illegal local movement/);
 assert.throws(()=>x.P.apply(x.state,[{...move,to:{x:100,y:0}}]),/Illegal local movement/);
 assert.throws(()=>x.P.apply(x.state,[move,move]),/Illegal local movement/);
 const forged={...move,actorId:'blue3',from:x.state.players.blue3.offset};
 assert.throws(()=>x.P.apply(x.state,[forged]),/Illegal local movement/);
});
test('positioned windows consume attack time, enforce local range and audit exact receipts',()=>{
 const x=setup(),r=x.combat.step(x);
 assert.ok(r.receipt.movements.length>0);
 const moved=r.receipt.decisions.filter(d=>d.movementSeconds===2);
 assert.ok(moved.length>0);
 for(const d of moved){
  const row=x.core.ChampionScaling.effective(x.powerState.entries[d.actorId]);
  assert.ok(d.attacks<=Math.floor(row.attackSpeed*3));
 }
 for(const a of r.receipt.actions){
  assert.ok(x.P.reach(r.state.players[a.actorId],r.state.players[a.targetId]));
 }
 assert.equal(x.combat.audit({...x,receipt:r.receipt}).length,0);
 const forged=plain(r.receipt);forged.movements[0].to.x+=1;
 assert.ok(x.combat.audit({...x,receipt:forged}).length>0);
 const reverse={...x,state:{...x.state,players:Object.fromEntries(Object.entries(x.state.players).reverse())}};
 assert.equal(JSON.stringify(x.combat.step(reverse).receipt),JSON.stringify(r.receipt));
});
test('local coordinates can deny a hit even if graph anchors are in range',()=>{
 const x=setup(),p=x.state.players;
 p.blue3.node='mid_center';p.blue3.offset={x:-18,y:0};
 p.red3.node='red_mid_front';p.red3.offset={x:18,y:0};
 assert.ok(x.core.Navigation.combatRange(p.blue3.node,p.red3.node,2));
 assert.equal(x.P.reach(p.blue3,p.red3,35),false);
});
