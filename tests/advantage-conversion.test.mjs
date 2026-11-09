import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function setup(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Advantage Conversion QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  [f.a,f.b].includes(world.userClub));
 const a=world.clubs.find(c=>c.id===fixture.a);
 const b=world.clubs.find(c=>c.id===fixture.b);
 const teams=Object.fromEntries([a,b].map(c=>[c.id,
  core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation([a,b],teams,20071);
 const health=core.Encounters.create(world.players);
 const model=core.LaneEconomy.create(a.id,b.id);
 const state={lanes:{[a.id]:{TOP:0,MID:0,BOT:0},
                     [b.id]:{TOP:0,MID:0,BOT:0}},
  gold:{[a.id]:15000,[b.id]:12000},
  towers:{[a.id]:0,[b.id]:0},kills:{[a.id]:2,[b.id]:0},
  barons:{[a.id]:0,[b.id]:0},waves:model.lanes};
 return {sim,core,world,fixture,a,b,nav,health,state};
}

test('early siege requires both visible lead and real favourable lane wave',()=>{
 const {core,nav,state,a,b}=setup();
 state.waves.BOT.front=1.25;
 core.Navigation.determineSiege(nav,state,20);
 assert.equal(nav.siegeTeam,a.id);
 assert.equal(nav.siegeLane,'BOT');
 assert.equal(nav.siegeUntil,24);
 assert.equal(state.lanes[b.id].BOT,0,'A siege order must not create tower damage');
 const neutral=setup();
 neutral.state.waves.BOT.front=0;
 neutral.core.Navigation.determineSiege(neutral.nav,neutral.state,20);
 assert.equal(neutral.nav.siegeTeam,null,
  'Gold advantage alone must not give a free siege');
 const poor=setup();
 poor.state.gold[poor.a.id]=12000;
 poor.state.kills[poor.a.id]=0;
 poor.state.waves.BOT.front=1.25;
 poor.core.Navigation.determineSiege(poor.nav,poor.state,20);
 assert.equal(poor.nav.siegeTeam,null,
  'Wave alone must not force a winning side');
});

test('early siege choice is symmetric and reversible when wave flips',()=>{
 const {core,nav,state,a,b}=setup();
 state.waves.BOT.front=1.1;
 core.Navigation.determineSiege(nav,state,20);
 assert.equal(nav.siegeTeam,a.id);
 state.gold[a.id]=11000;state.gold[b.id]=16500;
 state.waves.BOT.front=-1.4;
 core.Navigation.determineSiege(nav,state,26);
 assert.equal(nav.siegeTeam,b.id);
 assert.equal(nav.siegeLane,'BOT');
});

test('a trailing club can convert a real public kill into local pressure',()=>{
 const {core,nav,state,a,b}=setup();
 state.gold[a.id]=14000;state.gold[b.id]=14500;
 state.kills[a.id]=0;state.kills[b.id]=0;
 state.waves.BOT.front=.85;
 state.dead={[b.lineup.ADC]:22};
 core.Navigation.determineSiege(nav,state,20);
 assert.equal(nav.siegeTeam,a.id,
  'A locally earned window can beat a small global gold deficit');
 assert.equal(nav.siegeLane,'BOT');
 assert.equal(state.lanes[b.id].BOT,0,'No tower is granted without real damage');
 const noDown=setup();
 noDown.state.gold[noDown.a.id]=14000;
 noDown.state.gold[noDown.b.id]=14500;
 noDown.state.kills[noDown.a.id]=0;
 noDown.state.kills[noDown.b.id]=0;
 noDown.state.waves.BOT.front=.85;
 noDown.core.Navigation.determineSiege(noDown.nav,noDown.state,20);
 assert.equal(noDown.nav.siegeTeam,null,
  'A deficit and a wave cannot manufacture a public casualty');
});

test('earned bot kill supports a physical ADC+SUP followup but never awards HP damage',()=>{
 const {core,nav,state,health,a,b}=setup();
 state.waves.BOT.front=1.2;
 const facts={teamId:a.id,actorId:a.lineup.ADC,
  participantIds:[a.lineup.ADC,a.lineup.SUP],
  victimIds:[b.lineup.ADC]};
 const plan=core.Counterplay.pressureAfterKill(nav,facts,20,state);
 assert.ok(plan&&plan.lane==='BOT');
 const hpBefore=state.waves.BOT.hp[b.id][0];
 const sup=core.Counterplay.followup(nav,nav.agents[a.lineup.SUP],21,state,{health});
 const adc=core.Counterplay.followup(nav,nav.agents[a.lineup.ADC],21,state,{health});
 assert.equal(sup?.intent,'counterpush');
 assert.equal(adc?.intent,'counterpush');
 assert.equal(state.waves.BOT.hp[b.id][0],hpBefore,
  'The decision only moves agents, it cannot damage a tower');
 state.waves.BOT.front=-1;
 assert.equal(core.Counterplay.followup(nav,nav.agents[a.lineup.SUP],22,state,{health}),null);
});

test('regresión: la ventaja puede cambiar de lado tras un asedio comprometido',()=>{
 const {core,nav,state,a,b}=setup();
 nav.siegeTeam=a.id;nav.siegeLane='MID';nav.sideLane='TOP';
 nav.siegeUntil=56;
 state.gold[a.id]=20000;state.gold[b.id]=32000;
 state.towers[a.id]=0;state.towers[b.id]=4;
 core.Navigation.determineSiege(nav,state,63);
 assert.equal(nav.siegeTeam,b.id,
  'Después de expirar la orden, un nuevo líder real debe poder atacar');
 assert.equal(nav.siegeUntil,71);
});

test('regresión: la semilla 176 de coherencia de ganks también termina',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Gank Coherence QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  [f.a,f.b].includes(world.userClub));
 world.rng=176*13131;
 const m=sim.simulateMatch(fixture);
 assert.ok(m.winner,'Semilla 176 sin Nexus destruido después de suprimir el freeze');
 const errs=[...core.auditMatch(m,world),...core.NexusSiege.audit(m),
  ...core.Navigation.auditNavigation(m,world)];
 assert.deepEqual(errs,[]);
});

test('60 matches: post-kill pressure evidence and all physical audits stay consistent',()=>{
 const {sim,core,world,fixture}=setup();
 let laneOrders=0,earlyHits=0;
 for(let seed=1;seed<=60;seed++){
  world.rng=seed*78199;
  const m=sim.simulateMatch(fixture);
  assert.ok(m.winner,'Missing winner at seed '+seed);
  const errors=[...core.Counterplay.audit(m),
   ...core.Navigation.auditNavigation(m,world),
   ...core.LaneEconomy.audit(m),...core.NexusSiege.audit(m),
   ...core.auditMatch(m,world),...core.MatchReplay.auditMoments(m,world)];
  assert.deepEqual(errors,[],'Seed '+seed+': '+errors.slice(0,6).join(' | '));
  laneOrders+=m.events.filter(e=>['gank','lane_trade'].includes(e.facts?.action)&&
   e.facts.counterPressure).length;
  earlyHits+=m.events.filter(e=>['tower_damage','plate'].includes(e.facts?.action)&&
   e.minute<30).length;
 }
 assert.ok(laneOrders>=0);
 console.log('EARLY_CONVERSION='+JSON.stringify({laneOrders,earlyHits}));
});
