import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function scene(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Opportunity QA');
 const fixture=Object.values(world.fixtures).flat().find(x=>[x.a,x.b].includes(world.userClub));
 const clubs=[world.clubs.find(c=>c.id===fixture.a),world.clubs.find(c=>c.id===fixture.b)];
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(role=>
  world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,93211);
 const economy=core.LaneEconomy.create(clubs[0].id,clubs[1].id);
 const [a,b]=clubs;
 const state={gold:{[a.id]:16000,[b.id]:12500},
  kills:{[a.id]:2,[b.id]:0},towers:{[a.id]:0,[b.id]:0},
  barons:{[a.id]:0,[b.id]:0},lanes:{
   [a.id]:{TOP:0,MID:0,BOT:0},
   [b.id]:{TOP:0,MID:0,BOT:0}},
  waves:economy.lanes,dead:{},map:{lanes:Object.fromEntries(
   ['TOP','MID','BOT'].map(l=>[l,{pressure:{[a.id]:50,[b.id]:50},
     vision:{[a.id]:65,[b.id]:65}}]))}};
 return {sim,core,world,fixture,a,b,nav,state};
}
test('siege decision depends on physical wave/escort rather than match minute',()=>{
 for(const minute of [8,21,41,63]){
  const x=scene();
  x.state.waves.BOT.front=1.4;
  const before=JSON.stringify({gold:x.state.gold,lanes:x.state.lanes});
  x.core.Navigation.determineSiege(x.nav,x.state,minute);
  assert.equal(x.nav.siegeTeam,x.a.id,'minute '+minute);
  assert.equal(x.nav.siegeLane,'BOT');
  assert.ok(x.nav.siegeDecision?.escorts.length>=2);
  assert.equal(x.nav.siegeDecision.minute,minute);
  assert.equal(JSON.stringify({gold:x.state.gold,lanes:x.state.lanes}),before);
  const blank=scene();blank.state.waves.BOT.front=0;
  blank.core.Navigation.determineSiege(blank.nav,blank.state,minute);
  assert.equal(blank.nav.siegeTeam,null,'No free siege in minute '+minute);
 }
});
test('an earned open Nexus remains a physical objective when defenders outnumber the escorts',()=>{
 const {core,nav,state,a,b}=scene();
 state.lanes[b.id].MID=3;
 state.waves.MID.front=1.3;
 // Five actual defenders near their Nexus are not an automatic veto.
 // They reduce damage through NexusSiege rather than making the team's
 // already earned route disappear from the tactical opportunity list.
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===a.id?'red_mid_base':'red_nexus';
  p.intent='lane';
 }
 const before=JSON.stringify({gold:state.gold,lanes:state.lanes,
  wave:state.waves.MID.front});
 core.Navigation.determineSiege(nav,state,42);
 assert.equal(nav.siegeTeam,a.id);
 assert.equal(nav.siegeLane,'MID');
 assert.equal(nav.siegeDecision.stage,3);
 assert.ok(nav.siegeDecision.escorts.length>=2);
 assert.equal(JSON.stringify({gold:state.gold,lanes:state.lanes,
  wave:state.waves.MID.front}),before,
  'Choosing to contest an open Nexus cannot award damage, kills or gold');
});

test('winning the wave is always required for real tower damage, even late',()=>{
 const {core}=scene(),model=core.LaneEconomy.create('a','b');
 for(const minute of [8,35,48,63,74]){
  model.lanes.TOP.front=-.9;
  assert.equal(core.LaneEconomy.damageTower(model,{teamId:'a',
   defenderId:'b',lane:'TOP',stage:1,minute,
   attackers:5,defenders:0}),null);
 }
 model.lanes.TOP.front=1;
 assert.ok(core.LaneEconomy.damageTower(model,{teamId:'a',
  defenderId:'b',lane:'TOP',stage:1,minute:8,attackers:2,defenders:0}));
});
test('diagnostic: record first sieges and first tower timing without changing games',()=>{
 const {sim,world,fixture}=scene();
 for(const seed of [5,19,27]){
  world.rng=seed*28187;
  const m=sim.simulateMatch(fixture);
  const plans=(m.frames||[]).filter(f=>f.siegeDecision);
  const firstTower=m.events.find(e=>e.facts?.action==='tower')?.minute??null;
  const firstSiege=plans[0]?.minute??null;
  console.log('OPPORTUNITY_DIAG='+JSON.stringify({seed,winner:m.winner,
   duration:m.frames.at(-1)?.minute,firstSiege,firstTower,
   towers:m.frames.at(-1)?.towers,
   planMinutes:plans.length,lastPlans:plans.slice(-6).map(f=>({
    minute:f.minute,lane:f.siegeDecision.lane,team:f.siegeDecision.teamId,
    wave:f.siegeDecision.wave,stage:f.siegeDecision.stage,score:f.siegeDecision.score
   }))}));
  assert.equal(m.frames[0].minute,0);
 }
});

test('after a repelled base attack, escorts regroup on a cleared lane and release together',()=>{
 const {core,nav,state,a,b}=scene();
 state.lanes[b.id].MID=3;
 state.waves.MID.front=3.8;
 nav.nexusRegroup={[a.id]:{created:39}};
 const rallyNode='red_mid_inner';
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===a.id?'red_mid_base':'red_fountain';
  p.intent='lane';
 }
 const healthy=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 core.Navigation.determineSiege(nav,state,40,{health:healthy});
 assert.equal(nav.siegeDecision.stage,3);
 assert.equal(nav.siegeDecision.rally?.goal,rallyNode);
 assert.equal(nav.siegeDecision.rally?.created,39);
 for(const role of ['TOP','MID','ADC'])nav.agents[a.lineup[role]].node=rallyNode;
 core.Navigation.determineSiege(nav,state,41,{health:healthy});
 assert.equal(nav.siegeDecision.stage,3);
 assert.equal(nav.siegeDecision.rally,undefined,
  'A physical three-player formation releases the assault');
 assert.equal(nav.nexusRegroup[a.id],undefined);
 assert.equal(state.lanes[b.id].MID,3,'A regroup awards no structural progress');
});

test('previous benchmark mirror pair 158 finishes through causal Nexus damage',()=>{
 const batch=3,pair=158,seed=3050264979;
 const {sim,core}=boot({now:1731111111000+batch*41241211});
 const world=sim.newGame('balanced','QA Mirror '+batch);
 const fixtures=Object.values(world.fixtures).flat();
 const f=fixtures[(pair*13+batch*7)%fixtures.length];
 assert.equal(f.a,'c27');assert.equal(f.b,'c21');
 for(const [a,b] of [[f.a,f.b],[f.b,f.a]]){
  world.rng=seed;
  const m=sim.simulateMatch({...f,a,b});
  assert.ok(m.winner,'Exact benchmark failure must finish: '+a+' vs '+b);
  const errors=core.NexusSiege.audit(m);
  assert.equal(errors.length,0,'Nexus audit: '+errors.join(' | '));
  assert.ok(m.events.some(e=>e.facts?.action==='nexus'),
   'No timer-based winner is permitted');
 }
});

for(const [batch,pair,seed] of [[5,288,4130985195],[8,400,3405975574]]){
 test('previous benchmark mirror pair '+pair+' finishes through causal Nexus damage',()=>{
  const {sim,core}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Mirror '+batch);
  const fixtures=Object.values(world.fixtures).flat();
  const f=fixtures[(pair*13+batch*7)%fixtures.length];
  for(const [a,b] of [[f.a,f.b],[f.b,f.a]]){
   world.rng=seed;
   const m=sim.simulateMatch({...f,a,b});
   assert.ok(m.winner,'Exact benchmark pair '+pair+' must finish: '+a+' vs '+b);
   const errors=core.NexusSiege.audit(m);
   assert.equal(errors.length,0,'Nexus audit: '+errors.join(' | '));
   assert.ok(m.events.some(e=>e.facts?.action==='nexus'));
  }
 });
}

test('integrated kits: standard seed 307 does not abandon a viable siege for Baron',()=>{
 const batch=3,i=307,seed=2869273992;
 const {sim,core}=boot({now:1731111111000+batch*41241211});
 const world=sim.newGame('balanced','QA Balance '+batch);
 const fixtures=Object.values(world.fixtures).flat();
 const f=fixtures[(i*13+batch*7)%fixtures.length];
 world.rng=seed;
 const m=sim.simulateMatch(f);
 assert.ok(m.winner,'Exact standard regression must have a winner');
 const errors=[...core.auditMatch(m,world),...core.NexusSiege.audit(m),
  ...core.Encounters.audit(m,world),...core.ChampionKits.audit(m)];
 assert.equal(errors.length,0,errors.join(' | '));
 assert.ok(m.events.some(e=>e.facts?.action==='nexus'));
});
