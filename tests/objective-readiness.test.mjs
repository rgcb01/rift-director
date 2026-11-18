import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
test('objective readiness samples do not alter match facts or random outcome',()=>{
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Readiness QA'),fixtures=Object.values(world.fixtures).flat();
 let samples=0;
 for(let i=0;i<12;i++){
  const f=fixtures[(i*13)%fixtures.length],seed=i*12571+1;
  world.rng=seed;const a=sim.simulateMatch(f,{simultaneousCombat:true,structureTeamfights:true});
  world.rng=seed;const b=sim.simulateMatch(f,{simultaneousCombat:true,structureTeamfights:true,objectiveDiagnostics:true});
  assert.equal(JSON.stringify(a.events),JSON.stringify(b.events));
  assert.equal(a.winner,b.winner);
  for(const fr of b.frames)for(const r of fr.objectiveReadiness||[]){
   samples++;assert.equal(r.members.length,5);assert.equal(r.spawn-fr.minute,r.lead);
   assert.ok(r.lead<=6);assert.ok(fr.minute>=22);
   for(const p of r.members){
    assert.equal(p.node,fr.navigation.before[p.id].node);
    assert.equal(p.present,p.alive&&core.Navigation.combatRange(p.node,r.target,2));
    if(p.ready)assert.ok(p.alive&&!p.resetting&&p.hp>=55);
    if(p.assigned)assert.ok(r.call);
   }
  }
 }
 assert.ok(samples>0);
});
