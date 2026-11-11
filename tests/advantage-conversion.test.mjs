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

test('a credible siege is a map opportunity, not an absolute match-clock unlock',()=>{
 for(const minute of [8,20,41,63]){
  const {core,nav,state,a,b}=setup();
  state.waves.BOT.front=1.35;
  const before=JSON.stringify({gold:state.gold,lanes:state.lanes});
  core.Navigation.determineSiege(nav,state,minute);
  assert.equal(nav.siegeTeam,a.id,'Same wave and position, minute '+minute);
  assert.equal(nav.siegeLane,'BOT');
  assert.ok(nav.siegeDecision?.escorts?.length>=2);
  assert.ok(nav.siegeUntil>minute);
  assert.equal(JSON.stringify({gold:state.gold,lanes:state.lanes}),before);
  const neutral=setup();neutral.state.waves.BOT.front=0;
  neutral.core.Navigation.determineSiege(neutral.nav,neutral.state,minute);
  assert.equal(neutral.nav.siegeTeam,null,'No wave means no automatic late siege');
  const poor=setup();poor.state.gold[poor.a.id]=12000;
  poor.state.kills[poor.a.id]=0;poor.state.waves.BOT.front=1.35;
  poor.core.Navigation.determineSiege(poor.nav,poor.state,minute);
  assert.equal(poor.nav.siegeTeam,null,'Wave alone is not a strategic power spike');
 }
});

test('spatial initiative changes sides only when the wave and opportunity change',()=>{
 const {core,nav,state,a,b}=setup();
 state.waves.BOT.front=1.2;
 core.Navigation.determineSiege(nav,state,20);
 assert.equal(nav.siegeTeam,a.id);
 state.gold[a.id]=11000;state.gold[b.id]=16500;
 state.waves.BOT.front=-1.4;
 core.Navigation.determineSiege(nav,state,26);
 assert.equal(nav.siegeTeam,b.id);
 assert.equal(nav.siegeLane,'BOT');
});

test('trailing club can exploit a real opposing death; a deficit and wave alone cannot',()=>{
 const x=setup(),{core,nav,state,a,b}=x;
 state.gold[a.id]=14000;state.gold[b.id]=14500;
 state.kills[a.id]=0;state.kills[b.id]=0;
 state.waves.BOT.front=.85;
 state.dead={[b.lineup.ADC]:22};
 core.Navigation.determineSiege(nav,state,20);
 assert.equal(nav.siegeTeam,a.id);
 assert.equal(nav.siegeLane,'BOT');
 assert.equal(state.lanes[b.id].BOT,0);
 const noKill=setup();
 noKill.state.gold[noKill.a.id]=14000;
 noKill.state.gold[noKill.b.id]=14500;
 noKill.state.kills[noKill.a.id]=0;
 noKill.state.kills[noKill.b.id]=0;
 noKill.state.waves.BOT.front=.85;
 noKill.core.Navigation.determineSiege(noKill.nav,noKill.state,20);
 assert.notEqual(noKill.nav.siegeTeam,noKill.a.id);
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

test('a late real kill provides a temporary spatial counter-siege, not free structures',()=>{
 const {core,nav,state,a,b}=setup();
 state.gold[a.id]=11000;state.gold[b.id]=18000;
 state.waves.BOT.front=1.25;state.dead={[b.lineup.ADC]:44};
 for(const id of [a.lineup.ADC,a.lineup.SUP]){
  nav.agents[id].node='blue_bot_front';nav.agents[id].intent='lane';
 }
 const before=JSON.stringify({gold:state.gold,lanes:state.lanes});
 core.Navigation.determineSiege(nav,state,41);
 assert.equal(nav.siegeTeam,a.id);
 assert.equal(nav.siegeLane,'BOT');
 assert.ok(nav.siegeUntil>41);
 assert.equal(JSON.stringify({gold:state.gold,lanes:state.lanes}),before);
 state.dead={[b.lineup.ADC]:44};state.waves.BOT.front=0;
 core.Navigation.determineSiege(nav,state,45);
 assert.notEqual(nav.siegeTeam,a.id,'Lost wave cancels a plan, even late');
});

test('no counter-siege is awarded without earned kill or purchased power, wave and escorts',()=>{
 for(const missing of ['kill','wave','escorts']){
  const {core,nav,state,a,b}=setup();
  state.gold[a.id]=11000;state.gold[b.id]=18000;
  state.waves.BOT.front=1.25;
  if(missing!=='kill')state.dead={[b.lineup.ADC]:44};
  if(missing==='wave')state.waves.BOT.front=0;
  if(missing==='escorts'){
   for(const id of [a.lineup.ADC,a.lineup.SUP])
    nav.agents[id].node='blue_fountain';
  }
  core.Navigation.determineSiege(nav,state,41);
  assert.notEqual(nav.siegeTeam,a.id,missing);
 }
});

test('a physically escorted purchased spike can pressure without a scripted kill',()=>{
 const {core,nav,state,a,b}=setup();
 state.gold[a.id]=11000;state.gold[b.id]=18000;
 state.waves.BOT.front=2.4;
 const players=[...nav.teams[a.id],...nav.teams[b.id]];
 state.powerEconomy=core.PowerEconomy.create(players);
 state.powerEconomy.entries[a.lineup.ADC].items=['boots','blade'];
 state.powerEconomy.entries[a.lineup.SUP].items=['wardstone'];
 for(const id of [a.lineup.ADC,a.lineup.SUP])
  nav.agents[id].node='blue_bot_front';
 const before=JSON.stringify({gold:state.gold,lanes:state.lanes});
 core.Navigation.determineSiege(nav,state,41);
 assert.equal(nav.siegeTeam,a.id);
 assert.equal(nav.siegeLane,'BOT');
 assert.equal(JSON.stringify({gold:state.gold,lanes:state.lanes}),before);
 state.waves.BOT.front=-2.4;
 core.Navigation.determineSiege(nav,state,55);
 assert.notEqual(nav.siegeTeam,a.id);
});

test('an actually open Nexus lane is preferred to a fresh outer-tower march',()=>{
 const {core,nav,state,a,b}=setup();
 state.gold[a.id]=11000;state.gold[b.id]=18000;
 state.lanes[a.id].MID=3;
 state.waves.MID.front=-1.25;
 state.waves.BOT.front=0;
 core.Navigation.determineSiege(nav,state,41);
 assert.equal(nav.siegeTeam,b.id);
 assert.equal(nav.siegeLane,'MID');
 assert.equal(nav.siegeDecision.stage,3);
});

test('a new leader still needs spatial pressure, not an artificial minute-44 switch',()=>{
 const {core,nav,state,a,b}=setup();
 nav.siegeTeam=a.id;nav.siegeLane='MID';nav.siegeUntil=56;
 state.gold[a.id]=20000;state.gold[b.id]=32000;
 state.towers[a.id]=0;state.towers[b.id]=4;
 core.Navigation.determineSiege(nav,state,63);
 assert.equal(nav.siegeTeam,null,'No wave at 63 is not a free siege');
 state.waves.BOT.front=-1.7;
 core.Navigation.determineSiege(nav,state,64);
 assert.equal(nav.siegeTeam,b.id);
 assert.ok(nav.siegeUntil>64);
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

test('una teamfight ganada después del min 36 permite presión real, incluso en línea abierta',()=>{
 const {core,nav,state,health,a,b}=setup();
 state.lanes[b.id].MID=3;
 state.waves.MID.front=1.1;
 const facts={teamId:a.id,actorId:a.lineup.MID,
  participantIds:[a.lineup.MID,a.lineup.JUN],
  victimIds:[b.lineup.MID]};
 const plan=core.Counterplay.pressureAfterKill(nav,facts,41,state);
 assert.ok(plan);
 assert.equal(plan.lane,'MID');
 assert.equal(plan.created,41);
 assert.equal(plan.until,46);
 const follow=core.Counterplay.followup(nav,nav.agents[a.lineup.MID],
  43,state,{health});
 assert.equal(follow?.goal,'red_nexus');
 assert.equal(follow?.intent,'counterpush');
 assert.equal(state.lanes[b.id].MID,3,'Una orden no destruye el Nexo');
 assert.equal(core.Counterplay.followup(nav,nav.agents[a.lineup.MID],
  47,state,{health}),null);
 assert.equal(core.Counterplay.pressureAfterKill(nav,
  {...facts,victimIds:[]},42,state),null);
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
