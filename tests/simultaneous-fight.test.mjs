import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {boot} from './harness.mjs';
const setup=()=>{
 const {core}=boot({now:1731111111000});
 const context={RiftCore:core};
 vm.runInNewContext(readFileSync(new URL('../src/core/simultaneous-fight.js',import.meta.url),'utf8'),context);
 const players={};
 for(const side of ['blue','red'])for(let i=1;i<=5;i++){
  const id=side+i;
  players[id]={id,teamId:side,node:'mid_center',hp:100,alive:true,intent:'objective_setup'};
 }
 const S=core.SimultaneousFight;
 return {S,players,create:()=>S.create({id:'fight-1',at:1500,players})};
};
const hit=(actorId,targetId,damage)=>({actorId,targetId,damage});
const plain=x=>JSON.parse(JSON.stringify(x));
test('mutual kills in the same window are valid, regardless of input order',()=>{
 const {S,players,create}=setup();
 players.blue1.hp=35;players.red1.hp=35;
 const state=create(),actions=[hit('blue1','red1',40),hit('red1','blue1',40)];
 const result=S.resolve(state,actions),reverse=S.resolve(state,actions.slice().reverse());
 assert.deepEqual(plain(result),plain(reverse));
 assert.equal(result.state.players.blue1.hp,0);
 assert.equal(result.state.players.red1.hp,0);
 assert.equal(result.receipt.deaths.length,2);
 assert.equal(state.players.blue1.hp,35);
 assert.equal(result.receipt.to-result.receipt.from,5);
 assert.throws(()=>S.resolve(result.state,[hit('blue1','red2',5)]),/Illegal simultaneous strike/);
});
test('five simultaneous contributors conserve HP and do not award overkill damage',()=>{
 const {S,create}=setup(),state=create();
 const result=S.resolve(state,[1,2,3,4,5].map(i=>hit('blue'+i,'red1',30)));
 const impact=result.receipt.impacts[0],death=result.receipt.deaths[0];
 assert.equal(impact.damage,100);
 assert.equal(impact.credits.reduce((n,p)=>n+p.damage,0),100);
 assert.equal(death.killerId,'blue1');
 assert.equal(death.assistIds.length,4);
 assert.equal(result.state.players.red1.alive,false);
});
test('all ten champions can attack in a window without mutating the initial state',()=>{
 const {S,create}=setup(),state=create();
 const actions=[];
 for(let i=1;i<=5;i++){
  actions.push(hit('blue'+i,'red'+i,14),hit('red'+i,'blue'+i,14));
 }
 const result=S.resolve(state,actions);
 assert.equal(result.receipt.actions.length,10);
 assert.equal(result.receipt.impacts.length,10);
 assert.equal(Object.values(result.state.players).reduce((n,p)=>n+p.hp,0),860);
 assert.equal(Object.values(state.players).reduce((n,p)=>n+p.hp,0),1000);
 const next=S.resolve(result.state,actions);
 assert.equal(next.state.tick,2);
 assert.equal(next.state.at,1510);
 const audit=S.audit(state,[result.receipt,next.receipt]);
 assert.equal(audit.errors.length,0);
 assert.deepEqual(plain(audit.state),plain(next.state));
 const forged=plain(next.receipt);forged.impacts[0].hpAfter=99;
 assert.equal(S.audit(state,[result.receipt,forged]).errors.length,1);
});
test('duplicate actor, friendly fire, invalid damage, retreat and remote target are rejected',()=>{
 const {S,players,create}=setup(),state=create();
 for(const actions of [[hit('blue1','red1',5),hit('blue1','red2',5)],
  [hit('blue1','blue2',5)],[hit('blue1','red1',-1)],[hit('blue1','red1',121)]]){
  assert.throws(()=>S.resolve(state,actions),/Illegal simultaneous strike/);
 }
 const moved=plain(state);
 moved.players.red1.node='red_fountain';
 assert.throws(()=>S.resolve(moved,[hit('blue1','red1',5)]),/Illegal simultaneous strike/);
 moved.players.blue1.intent='retreat';
 assert.throws(()=>S.resolve(moved,[hit('blue1','red2',5)]),/Illegal simultaneous strike/);
 players.red1.node='red_fountain';
 assert.throws(create,/Isolated fighter/);
});

test('simultaneous shields and healing conserve life and cannot resurrect',()=>{
 const {S,players,create}=setup();players.blue1.hp=40;
 const state=create(),actions=[hit('red1','blue1',50)];
 const effects=[{actorId:'blue2',targetId:'blue1',kind:'heal',amount:8},
  {actorId:'blue3',targetId:'blue1',kind:'shield',amount:8}];
 const r=S.resolve(state,actions,effects),impact=r.receipt.impacts[0];
 assert.equal(impact.healed,8);assert.equal(impact.absorbed,8);
 assert.equal(impact.damage,42);assert.equal(r.state.players.blue1.hp,6);
 assert.equal(r.receipt.deaths.length,0);
 assert.equal(S.audit(state,[r.receipt]).errors.length,0);
 const dead=S.resolve(state,[hit('red1','blue1',80)]).state;
 assert.throws(()=>S.resolve(dead,[],[effects[0]]),/Illegal simultaneous effect/);
 assert.throws(()=>S.resolve(state,[],[{actorId:'red2',targetId:'blue1',kind:'heal',amount:8}]),/Illegal simultaneous effect/);
 const capped=S.resolve(state,[],[{actorId:'blue2',targetId:'blue3',kind:'heal',amount:8}]);
 assert.equal(capped.receipt.impacts[0].healed,0);
});
test('control is tied to a legal strike and has a bounded next-window effect',()=>{
 const {S,create}=setup(),state=create();
 const control={actorId:'blue1',targetId:'red1',kind:'control',amount:1};
 assert.throws(()=>S.resolve(state,[],[control]),/Illegal simultaneous effect/);
 const r=S.resolve(state,[hit('blue1','red1',12)],[control]);
 assert.equal(r.state.players.red1.controlUntil,1506);
 assert.equal(r.receipt.impacts[0].controlUntil,1506);
 assert.throws(()=>S.resolve(r.state,[],[{actorId:'red1',targetId:'red2',kind:'shield',amount:3}]),/Illegal simultaneous effect/);
 const forged=plain(r.receipt);forged.effects[0].amount=3;
 assert.equal(S.audit(state,[forged]).errors.length,1);
});
