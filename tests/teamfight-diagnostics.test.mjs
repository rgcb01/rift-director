import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
import {diagnoseTeamfights,aggregateTeamfights} from '../benchmarks/teamfight-diagnostics.mjs';
const s=(nearBoth,reachableBoth)=>({nearBoth,reachableBoth,best:null});
test('diagnostics distinguish absent formation, contact, early attrition and cooldown',()=>{
 const frame=(minute,before,after,selected=null,cooldown=false)=>({minute,teamfightDiagnostic:{before,after,selected,cooldown}});
 const match={frames:[
  frame(14,s(false,false),s(false,false)),
  frame(15,s(true,false),s(true,false)),
  frame(16,s(true,true),s(false,false)),
  frame(17,s(true,true),s(true,true),null,true),
  frame(18,s(true,true),s(true,true),'baron_pit'),
  frame(19,s(true,true),s(true,true))
 ],events:[{facts:{groupFight:{id:'18:baron_pit',zone:'baron_pit',groups:{a:['1','2','3'],b:['4','5','6','7']}}}}]};
 const d=diagnoseTeamfights(match);
 assert.equal(d.sampledMinutes,6);
 for(const key of ['noFormation','noContact','lostBeforeGroup','cooldown','selected','unexplained'])assert.equal(d[key],1);
 assert.equal(d.formations['3v4'],1);assert.equal(d.rounds[1],1);
 assert.equal(aggregateTeamfights([d,d]).sampledMinutes,12);
 assert.equal(diagnoseTeamfights({frames:[{minute:14}]}).sampledMinutes,0);
});
test('40 real maps report exactly one diagnostic category per mature minute',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Teamfight QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const rows=[];
 for(let i=1;i<=40;i++){
  world.rng=i*12571;const m=sim.simulateMatch(fixture);
  assert.ok(m.winner);
  const d=diagnoseTeamfights(m);rows.push(d);
  assert.equal(d.sampledMinutes,d.noFormation+d.noContact+d.lostBeforeGroup+d.cooldown+d.selected+d.unexplained);
  assert.equal(d.unexplained,0);
  const starts=m.events.filter(e=>e.minute>=14&&e.facts?.groupFight?.round===1);
  assert.equal(d.selected,starts.length);
  assert.equal(core.Encounters.audit(m,world).length,0);
 }
 console.log('TEAMFIGHT_FORMATION_DIAGNOSTIC='+JSON.stringify(aggregateTeamfights(rows)));
});
