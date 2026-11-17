import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

test('benchmark regression 511: a physical Nexus finish survives tactical resets',()=>{
 const batch=5,i=511,seed=74110522;
 const {sim,core}=boot({now:1731111111000+batch*41241211});
 const world=sim.newGame('balanced','QA Balance '+batch);
 const fixtures=Object.values(world.fixtures).flat();
 const fixture=fixtures[(i*13+batch*7)%fixtures.length];
 world.rng=seed;
 const match=sim.simulateMatch(fixture);
 const tail=match.frames.slice(-20).map(f=>({
  minute:f.minute,siege:f.siegeDecision,health:f.health,recall:f.recall,
  agents:Object.fromEntries(Object.entries(f.navigation.after).map(([id,p])=>[id,
   {node:p.node,goal:p.goal,intent:p.intent,reason:p.reason,alive:p.alive}])),
  lanes:f.laneEconomy?.lanes,nexus:f.nexusIntegrity,gold:f.gold
 }));
 if(!match.winner)console.log('RECALL_511_DIAG='+JSON.stringify({fixture,seed,tail}));
 assert.ok(match.winner,'Benchmark regression 511 must have a causal winner');
 assert.equal(match.events.at(-1)?.facts?.action,'nexus');
 assert.deepEqual(Array.from(core.auditMatch(match,world)),[]);
 assert.deepEqual(Array.from(core.Navigation.auditNavigation(match,world)),[]);
});
