import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const fixture=()=>{
 const {core}=boot({now:1731111111000});
 const agent={id:'mid',teamId:'a',role:'MID',node:'blue_fountain',alive:true};
 const ally={id:'top',teamId:'a',role:'TOP',node:'blue_top_front',alive:true};
 const nav={a:'a',b:'b',agents:{mid:agent,top:ally},neutralPlans:{}};
 const world={dead:{},lanes:{a:{TOP:0,MID:0,BOT:0},b:{TOP:0,MID:0,BOT:0}},
  waves:{TOP:{front:-1.2},MID:{front:1},BOT:{front:0}},
  map:{lanes:{TOP:{vision:{a:65}},MID:{vision:{a:65}},BOT:{vision:{a:65}}},riverVision:{a:65}}};
 const args={nav,agent,world,minute:18,health:{mid:100,top:100},baseline:{intent:'lane'}};
 return {core,agent,nav,world,args};
};
test('MID leaves fountain toward a threatened side only when own wave and cover permit',()=>{
 const {core,world,args}=fixture();
 const r=core.ResetRouting.choose(args);
 assert.equal(r.reason,'reset_cover_side');assert.equal(r.goal,'blue_top_front');
 assert.equal(r.evidence.allyId,'top');
 world.waves.MID.front=-1;
 const d=core.ResetRouting.choose(args);
 assert.equal(d.reason,'reset_defend_wave');
 assert.equal(d.goal,'blue_mid_outer');
 world.waves.MID.front=.2;
 assert.equal(core.ResetRouting.choose(args).goal,'blue_mid_front');
});
test('protected siege/defense and low HP outrank departure; stale routes are cancelled',()=>{
 const {core,args,world}=fixture();
 assert.equal(core.ResetRouting.choose({...args,health:{mid:50}}),null);
 assert.equal(core.ResetRouting.choose({...args,baseline:{intent:'siege'}}),null);
 const r=core.ResetRouting.choose(args);
 assert.equal(core.ResetRouting.continuation({...args,route:r,minute:19}).goal,r.goal);
 world.waves.MID.front=-1;
 assert.equal(core.ResetRouting.continuation({...args,route:r,minute:19}),null);
 assert.equal(core.ResetRouting.continuation({...args,route:r,minute:r.until+1}),null);
});
test('support rejoins its ADC and jungler remains on its own corridor',()=>{
 const {core,args,agent,nav,world}=fixture();
 agent.role='SUP';nav.agents.adc={id:'adc',teamId:'a',role:'ADC',alive:true,node:'blue_bot_front'};
 const s=core.ResetRouting.choose(args);
 assert.equal(s.reason,'reset_rejoin_adc');assert.equal(s.goal,'blue_bot_front');
 agent.role='JUN';const j=core.ResetRouting.choose(args);
 assert.equal(j.reason,'reset_jungle');assert.ok(core.Navigation.jungleAllowed('blue',j.goal));
});
test('live reset routing uses graph travel and records auditable departure',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Reset Routing QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 let sample=null;
 for(let seed=1;seed<=30;seed++){
  world.rng=seed*12571;const m=sim.simulateMatch(fixture);
  const errors=core.ResetRouting.audit(m);
  assert.equal(errors.length,0,'seed '+seed+' '+errors.join('; '));
  assert.equal(core.Recall.audit(m).length,0);
  assert.equal(core.Navigation.auditNavigation(m,world).length,0);
  const frame=m.frames.find(f=>Object.values(f.navigation.before).some(p=>p.decisionVersion===9));
  if(frame)sample??={m,minute:frame.minute};
 }
 assert.ok(sample,'Expected live reset departure');
 const forged=JSON.parse(JSON.stringify(sample.m));
 const p=Object.values(forged.frames.find(f=>f.minute===sample.minute).navigation.before).find(p=>p.decisionVersion===9);
 p.resetRoute.goal='red_nexus';
 assert.ok(core.ResetRouting.audit(forged).length>0);
});
