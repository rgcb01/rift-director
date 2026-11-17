import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Teamfight QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 return {core,sim,world,fixture};
}
test('shadow pilot uses actual group opportunities and leaves authoritative match unchanged',()=>{
 const {core,sim,world,fixture}=setup();
 let sample=0,windows=0,awards=0;
 for(let i=1;i<=80;i++){
  const seed=i*12571;
  world.rng=seed;const baseline=sim.simulateMatch(fixture);
  world.rng=seed;const experimental=sim.simulateMatch(fixture,{simultaneousPilot:true});
  const {simultaneousPilot,...authoritative}=experimental;
  assert.deepEqual(plain(authoritative),plain(baseline),'seed '+i);
  assert.equal(core.auditMatch(experimental,world).length,0);
  for(const p of simultaneousPilot){
   sample++;windows+=p.receipts.length;
   assert.equal(core.SimultaneousSport.auditPreview(p).length,0);
   assert.ok(baseline.events.some(e=>e.facts?.groupFight?.id===p.initial.state.id));
   const before=p.initial.sport,after=p.final.sport;
   const all=p.receipts.flatMap(r=>r.awards);awards+=all.length;
   for(const team of [fixture.a,fixture.b]){
    const own=all.filter(a=>a.teamId===team);
    assert.equal(after.kills[team]-before.kills[team],own.length);
    assert.equal(after.gold[team]-before.gold[team],own.reduce((n,a)=>n+a.gold,0));
   }
   for(const a of all){
    assert.equal(after.dead[a.victimId],a.respawnAt);
    assert.equal(p.final.state.players[a.victimId].hp,0);
   }
   const forged=plain(p);forged.final.sport.gold[fixture.a]++;
   assert.ok(core.SimultaneousSport.auditPreview(forged).length>0);
  }
 }
 console.log('SIMULTANEOUS_PILOT='+JSON.stringify({maps:80,sample,windows,awards}));
 assert.ok(sample>0,'Expected actual group opportunities');
 assert.ok(windows>=sample);
});
test('atomic mutual kills award both teams and terminate both streaks from the same snapshot',()=>{
 const {core,sim,world,fixture}=setup();let p=null;
 for(let i=1;i<=80&&!p;i++){
  world.rng=i*12571;
  p=sim.simulateMatch(fixture,{simultaneousPilot:true}).simultaneousPilot[0];
 }
 assert.ok(p);
 const input=plain(p.initial),actors=Object.values(input.state.players);
 // Place a legal 3v3 or larger formation at the same existing anchor.
 for(const a of actors){a.node='mid_center';a.offset={x:0,y:0};a.hp=1;input.sport.shutdowns.streaks[a.id]=3;}
 const r=core.SimultaneousSport.step({...input,minute:p.minute,positioning:false});
 const deaths=r.receipt.awards;
 assert.ok(deaths.some(a=>a.teamId===fixture.a));
 assert.ok(deaths.some(a=>a.teamId===fixture.b));
 assert.ok(deaths.every(a=>a.bountyGold===150));
 for(const a of deaths)assert.equal(r.sport.shutdowns.streaks[a.victimId],0);
 for(const team of [fixture.a,fixture.b]){
  const own=deaths.filter(a=>a.teamId===team);
  assert.equal(r.sport.kills[team]-input.sport.kills[team],own.length);
  assert.equal(r.sport.gold[team]-input.sport.gold[team],own.reduce((n,a)=>n+a.gold,0));
 }
 assert.equal(core.SimultaneousSport.audit({...input,minute:p.minute,positioning:false},r.receipt).length,0);
 const forged=plain(r.receipt);forged.awards[0].gold++;
 assert.ok(core.SimultaneousSport.audit({...input,minute:p.minute,positioning:false},forged).length>0);
});
