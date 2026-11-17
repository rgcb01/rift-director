import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

test('mirrored regression 263 requires a causal Nexus finish with simultaneous combat',()=>{
 const batch=5,pair=263,seed=1135397554;
 const {sim,core}=boot({now:1731111111000+batch*41241211});
 const world=sim.newGame('balanced','QA Mirror '+batch);
 const fixtures=Object.values(world.fixtures).flat();
 const f=fixtures[(pair*13+batch*7)%fixtures.length];
 assert.equal(f.a,'c45');assert.equal(f.b,'c21');
 world.rng=seed;
 const m=sim.simulateMatch(f,{simultaneousCombat:true});
 if(!m.winner)console.log('SIMULTANEOUS_263_DIAG='+JSON.stringify({
  seed,fixture:f,tail:m.frames.slice(-12).map(f=>({minute:f.minute,siege:f.siegeDecision,
   health:f.health,lanes:f.laneEconomy.lanes,nexus:f.siege.hp,gold:f.gold,
   units:f.navigation.after})),events:m.events.slice(-15).map(e=>({minute:e.minute,facts:e.facts?.action,team:e.teamId}))
 }));
 assert.ok(m.winner,'No timeout winner permitted');
 assert.equal(m.events.at(-1)?.facts?.action,'nexus');
 assert.equal(core.auditMatch(m,world).length,0);
 assert.equal(core.Navigation.auditNavigation(m,world).length,0);
});
test('earned pressure cannot come from a tied fight or a dead winner',()=>{
 const {core}=boot({now:1731111111000});
 const players={a1:{id:'a1',teamId:'a',alive:true,hp:90,role:'ADC',node:'blue_bot_front',intent:'group'},
 a2:{id:'a2',teamId:'a',alive:true,hp:90,role:'SUP',node:'blue_bot_front',intent:'group'},
 b1:{id:'b1',teamId:'b',alive:false,hp:0,role:'ADC',node:'red_bot_front',intent:'dead'}};
 const nav={a:'a',b:'b',agents:players,counterPressure:{}};
 const world={gold:{a:10000,b:10000},lanes:{a:{TOP:0,MID:0,BOT:0},b:{TOP:0,MID:0,BOT:0}},dead:{b1:25},waves:core.LaneEconomy.create('a','b').lanes};
 const p={minute:22,receipts:[{awards:[{teamId:'a',killerId:'a1',victimId:'b1'}]}],final:{state:{players}}};
 const before=JSON.stringify(nav);
 const plan=core.SimultaneousSport.conversion(p,nav,world);
 assert.ok(plan);assert.equal(plan.teamId,'a');assert.equal(plan.lane,'BOT');assert.deepEqual(Array.from(plan.allowed).sort(),['a1','a2']);
 assert.equal(JSON.stringify(nav),before);
 p.receipts[0].awards.push({teamId:'b',killerId:'b1',victimId:'a1'});
 assert.equal(core.SimultaneousSport.conversion(p,nav,world),null);
 p.receipts[0].awards.pop();players.a1.alive=false;
 assert.equal(core.SimultaneousSport.conversion(p,nav,world),null);
});
