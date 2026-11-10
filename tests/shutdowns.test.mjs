import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

const roster=()=>['blue','red'].flatMap(teamId=>
 ['TOP','JUN','MID','ADC','SUP'].map(role=>
  ({id:teamId+'-'+role,teamId,role})));
const makeEvent=(actorId,victimIds)=>({facts:{action:'teamfight',actorId,victimIds}});
test('las recompensas de shutdown nacen de rachas de bajas; ninguna ventaja aparece gratis',()=>{
 const {core}=boot(),kill=core.Shutdowns;
 const state=kill.create(roster()),a='blue-ADC',b='red-MID';
 assert.equal(kill.bounty(0),0);
 assert.equal(kill.bounty(2),0);
 assert.equal(kill.bounty(3),150);
 assert.equal(kill.bounty(4),240);
 assert.equal(kill.bounty(20),420);
 for(let i=0;i<3;i++){
  const e=makeEvent(b,['blue-'+['TOP','MID','JUN'][i]]);
  assert.equal(kill.apply(state,e),0);
  assert.equal(e.facts.bountyGold,0);
 }
 assert.equal(state.streaks[b],3);
 const shutdown=makeEvent(a,[b]);
 assert.equal(kill.apply(state,shutdown),150);
 assert.deepEqual(JSON.parse(JSON.stringify(shutdown.facts.shutdowns)),[
  {victimId:b,streakBefore:3,bonusGold:150}]);
 assert.equal(state.streaks[b],0);
 assert.equal(state.streaks[a],1);
 assert.equal(kill.apply(state,makeEvent(a,[b])),0,
  'La recompensa no se puede cobrar otra vez por una muerte sin racha');
 const fake=makeEvent(a,[]);
 assert.equal(kill.apply(state,fake),0);
 assert.equal(fake.facts.bountyGold,undefined);
 const multi=kill.create(roster());
 for(let i=0;i<3;i++)kill.apply(multi,makeEvent(b,['blue-'+['TOP','JUN','MID'][i]]));
 const other='red-ADC';
 for(let i=0;i<4;i++)kill.apply(multi,makeEvent(other,['blue-'+['SUP','TOP','JUN','MID'][i]]));
 const double=makeEvent('blue-ADC',[b,other]);
 assert.equal(kill.apply(multi,double),150+240);
 assert.equal(double.facts.shutdowns.length,2);
 assert.throws(()=>kill.apply(multi,makeEvent('blue-ADC',[b,b])),/Duplicate/);
});
test('la recompensa de remontada exige una eliminación y déficit público real',()=>{
 const {core}=boot(),b=core.Shutdowns.comebackBounty;
 assert.equal(b(1499,1),0);
 assert.equal(b(1500,0),0);
 assert.equal(b(1500,1),300);
 assert.equal(b(3300,1),600);
 assert.equal(b(9000,1),1000);
 assert.equal(b(3300,2),1200);
 assert.equal(b(-5000,3),0,'El líder no cobra bonificación');
 assert.throws(()=>b(Infinity,1),/Invalid/);
});
test('replay, cartera y marcador tienen una única recompensa por shutdown verificable',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Shutdown QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 let shutdowns=0,paid=0,comebackPaid=0;
 for(let seed=1;seed<=110;seed++){
  world.rng=seed*68371;
  const match=sim.simulateMatch(fixture);
  const errors=[...core.Shutdowns.audit(match),
   ...core.PowerEconomy.audit(match),...core.auditMatch(match,world),
   ...core.Navigation.auditNavigation(match,world),
   ...core.MatchReplay.auditMoments(match,world)];
  assert.equal(errors.length,0,'Seed '+seed+': '+errors.slice(0,4).join(' | '));
  match.events.forEach((e,i)=>{
   comebackPaid+=e.facts?.comebackGold||0;
   if(!e.facts?.bountyGold)return;
   shutdowns+=e.facts.shutdowns.length;
   paid+=e.facts.bountyGold;
   assert.ok(e.facts.victimIds?.length);
   assert.ok(e.body.includes('Recompensa'));
   assert.ok(match.moments[i].shutdowns);
  });
 }
 assert.ok(paid>0,'No se observó ninguna recompensa en 110 partidas');
 assert.ok(comebackPaid>0,'No se observaron bajas reales del equipo rezagado');
 console.log('SHUTDOWN_SAMPLE='+JSON.stringify({shutdowns,paid}));
});
