import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const env={};
vm.runInNewContext(readFileSync(new URL('../src/core/recall.js',import.meta.url),'utf8'),env);
const R=env.RiftCore.Recall;
const input={id:'p1',side:'blue',node:'blue_mid_inner',at:60,alive:true,hp:25,resource:90,resourceType:'mana',safe:true};
const check={id:'p1',node:input.node,alive:true};
test('recall by health without purchase: eight seconds, own fountain, no mutation of input',()=>{
 const state=R.create();
 assert.equal(R.start(state,input).reason,'low_health');
 assert.equal(R.advance(state,{...check,at:67}),null);
 const receipt=R.advance(state,{...check,at:68});
 assert.equal(receipt.status,'completed');
 assert.equal(receipt.to,'blue_fountain');
 assert.equal(receipt.endedAt,68);
 assert.equal(input.node,'blue_mid_inner');
 assert.equal(R.advance(state,{...check,at:69}),null);
});
test('mana and energy are distinct; purchase requires safe wave and no impending objective',()=>{
 assert.equal(R.reason({hp:100,resource:10,resourceType:'mana'}),'low_mana');
 assert.equal(R.reason({hp:100,resource:10,resourceType:'energy'}),null);
 assert.equal(R.reason({hp:100,canBuy:true,waveSafe:true,objectiveSoon:true}),null);
 assert.equal(R.reason({hp:100,canBuy:true,waveSafe:true}),'item_spike');
});
test('recall is cancelled by damage, movement, death or an interrupting action',()=>{
 for(const [delta,reason] of [[{damageTaken:1},'damage'],[{node:'blue_nexus'},'movement'],[{alive:false},'death'],[{actionInterrupted:true},'action']]){
  const state=R.create();R.start(state,input);
  const result=R.advance(state,{...check,at:68,...delta});
  assert.equal(result.status,'cancelled');assert.equal(result.interruption,reason);
  assert.equal(result.to,undefined);
 }
});
test('unsafe, dead, healthy and already in fountain players cannot start; cooldown is enforced',()=>{
 for(const delta of [{safe:false},{alive:false},{hp:100},{node:'blue_fountain'}])
  assert.equal(R.start(R.create(),{...input,...delta}),null);
 const s=R.create();R.start(s,input);
 assert.equal(R.start(s,{...input,at:61}),null);
 R.advance(s,{...check,at:68});
 assert.equal(R.start(s,{...input,at:127}),null);
 assert.equal(R.start(s,{...input,at:128}).status,'channeling');
});
test('clock cannot rewind and snapshots cannot change live state',()=>{
 const s=R.create();R.start(s,input);
 R.advance(s,{...check,at:64});
 assert.equal(R.advance(s,{...check,at:63,damageTaken:1}),null);
 const snap=R.snapshot(s);snap.entries.p1.status='completed';
 assert.equal(s.entries.p1.status,'channeling');
});

import {boot} from './harness.mjs';
test('live minute adapter holds the original node, interrupts on action, and only completes in own fountain',()=>{
 const {core}=boot({now:1731111111000});
 const p={id:'p',teamId:'a',role:'MID',node:'blue_mid_inner',goal:'blue_mid_front',intent:'lane',alive:true};
 const nav={a:'a',b:'b',agents:{p}},health={p:25},kits={entries:{}};
 const state=core.Recall.create(),starts=core.Recall.beginMinute(state,nav,health,kits,10);
 assert.equal(starts.length,1);assert.equal(p.node,'blue_mid_inner');
 assert.equal(p.intent,'recall_channel');
 const receipts=core.Recall.settleMinute(state,nav,health,starts,[],10);
 assert.equal(receipts[0].status,'completed');assert.equal(p.node,'blue_fountain');
 assert.equal(p.intent,'recall_recover');
 const q={...p,node:'blue_mid_inner',intent:'lane'};
 const other={a:'a',b:'b',agents:{p:q}},s=core.Recall.create();
 const again=core.Recall.beginMinute(s,other,health,kits,10);
 const cancelled=core.Recall.settleMinute(s,other,health,again,[{facts:{actorId:'p'}}],10);
 assert.equal(cancelled[0].status,'cancelled');assert.equal(q.node,'blue_mid_inner');
});
test('fountain restore is restricted to recalled mana users and preserves cooldowns',()=>{
 const {core}=boot({now:1731111111000});
 const model=core.ChampionKits.create({entries:{p:{id:'p',championId:'aeska'},q:{id:'q',championId:'veyra'}}});
 model.entries.p.resource=12;model.entries.p.cooldowns.Q=700;
 model.entries.q.resource=12;
 const nav={a:'a',b:'b',agents:{p:{id:'p',teamId:'a',alive:true,node:'red_fountain',intent:'recall_recover'},q:{id:'q',teamId:'a',alive:true,node:'blue_fountain',intent:'recall_recover'}}};
 assert.equal(core.ChampionKits.fountainRestore(model,nav,2).length,0);
 nav.agents.p.node='blue_fountain';
 assert.equal(core.ChampionKits.fountainRestore(model,nav,2).length,1);
 assert.equal(model.entries.p.resource,100);assert.equal(model.entries.p.cooldowns.Q,700);
 assert.equal(model.entries.q.resource,12);
});
test('integrated recall receipts are technical records and causal audits reject forgery',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Recall QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 let example=null,total=0;
 for(let seed=1;seed<=20;seed++){
  world.rng=seed*12571;
  const match=sim.simulateMatch(fixture);
  assert.equal(core.Recall.audit(match).length,0,'recall seed '+seed+' '+core.Recall.audit(match).join('; '));
  assert.equal(core.ChampionKits.audit(match).length,0,'kit seed '+seed);
  assert.equal(core.Navigation.auditNavigation(match,world).length,0,'navigation seed '+seed);
  assert.equal(core.auditMatch(match,world).length,0,'sports seed '+seed);
  assert.equal(match.events.some(e=>e.facts?.action?.startsWith('recall')),false);
  const frame=match.frames.find(f=>f.recall.receipts.some(r=>r.status==='completed'));
  if(frame){total++;example??={match,minute:frame.minute};}
 }
 assert.ok(total>0,'At least one real recall in sample');
 const forged=JSON.parse(JSON.stringify(example.match));
 const receipt=forged.frames.find(f=>f.minute===example.minute).recall.receipts.find(r=>r.status==='completed');
 receipt.to='red_nexus';
 assert.ok(core.Recall.audit(forged).length>0);
});
