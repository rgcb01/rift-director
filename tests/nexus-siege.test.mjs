import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function setup(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Nexus Siege QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(role=>
  world.players.find(p=>p.id===c.lineup[role]))]));
 const [a,b]=clubs.map(c=>c.id);
 const nav=core.Navigation.createNavigation(clubs,teams,3173);
 const economy=core.LaneEconomy.create(a,b);
 const state={lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves:economy.lanes,baronBuff:{[a]:0,[b]:0}};
 const health=Object.fromEntries(Object.values(nav.agents).map(p=>[p.id,100]));
 const dead={};
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===a?'blue_top_front':'red_top_front';
  p.alive=true;p.intent='siege';
 }
 return {sim,core,world,fixture,clubs,nav,state,health,dead,a,b};
}

test('el Nexo no recibe daño sin tres torres caídas, escolta y dos atacantes vivos',()=>{
 const {core,nav,state,health,dead,a,b,clubs}=setup();
 const model=core.NexusSiege.create(a,b);
 const attackers=clubs[0].lineup;
 nav.agents[attackers.ADC].node='red_nexus';
 nav.agents[attackers.MID].node='red_nexus';
 assert.equal(core.NexusSiege.advance(model,nav,state,29,health,dead).length,0);
 state.lanes[b].MID=3;
 nav.agents[attackers.MID].node='blue_top_front';
 assert.equal(core.NexusSiege.advance(model,nav,state,30,health,dead).length,0);
 nav.agents[attackers.MID].node='red_nexus';
 health[attackers.MID]=0;
 assert.equal(core.NexusSiege.advance(model,nav,state,31,health,dead).length,0);
 health[attackers.MID]=100;
 assert.equal(core.NexusSiege.advance(model,nav,state,32,health,dead).length,1);
 assert.ok(model.hp[b]<core.NexusSiege.MAX_HP);
 assert.equal(model.hp[a],core.NexusSiege.MAX_HP);
});

test('Nexo dañado requiere daño, se defiende y el Barón potencia solo un asedio real',()=>{
 const {core,nav,state,health,dead,a,b,clubs}=setup();
 state.lanes[b].MID=3;
 const adc=nav.agents[clubs[0].lineup.ADC];
 const mid=nav.agents[clubs[0].lineup.MID];
 adc.node='red_nexus';mid.node='red_nexus';
 const normal=core.NexusSiege.candidates(nav,state,36,health,dead)[0];
 assert.ok(normal&&normal.damage>0);
 const defender=nav.agents[clubs[1].lineup.TOP];
 defender.node='red_nexus';
 const contested=core.NexusSiege.candidates(nav,state,36,health,dead)[0];
 assert.ok(contested.damage<normal.damage);
 state.baronBuff[a]=3;
 const buffed=core.NexusSiege.candidates(nav,state,36,health,dead)[0];
 assert.ok(buffed.damage>contested.damage);
 adc.node='blue_fountain';mid.node='blue_fountain';
 assert.equal(core.NexusSiege.candidates(nav,state,36,health,dead).length,0,
  'Barón por sí solo no puede atacar desde la fuente');
});

test('escuadra en el Nexo mantiene la oleada de la línea abierta sin farm gratuito',()=>{
 const {core,nav,state,health,a,b,clubs}=setup();
 const adc=nav.agents[clubs[0].lineup.ADC],mid=nav.agents[clubs[0].lineup.MID];
 adc.node='red_nexus';mid.node='red_nexus';
 const map={lanes:Object.fromEntries(['TOP','MID','BOT'].map(l=>[l,
  {pressure:{[a]:50,[b]:50},vision:{[a]:65,[b]:65}}]))};
 const closed=core.LaneEconomy.create(a,b);
 const opened=core.LaneEconomy.create(a,b);
 state.lanes[b].MID=3;
 const goldClosed={[a]:0,[b]:0},goldOpened={[a]:0,[b]:0};
 core.LaneEconomy.advance(closed,{minute:40,nav,map,health,gold:goldClosed});
 core.LaneEconomy.advance(opened,{minute:40,nav,map,health,
  gold:goldOpened,structures:state.lanes});
 assert.ok(opened.lanes.MID.front>closed.lanes.MID.front,
  'El asedio físicamente presente vuelve a escoltar la oleada abierta');
 assert.equal(goldOpened[a],goldClosed[a],
  'La presión desde el Nexo no entrega oro de farm sin ocupar la línea');
 adc.node='blue_fountain';
 const solo=core.LaneEconomy.create(a,b),goldSolo={[a]:0,[b]:0};
 core.LaneEconomy.advance(solo,{minute:40,nav,map,health,
  gold:goldSolo,structures:state.lanes});
 assert.equal(solo.lanes.MID.front,closed.lanes.MID.front,
  'Un atacante aislado no escolta una oleada sin compañeros');
});

test('la vida del Nexo cae por golpes acumulados, nunca por un minuto o tirada',()=>{
 const {core,nav,state,health,dead,a,b,clubs}=setup();
 state.lanes[b].MID=3;
 nav.agents[clubs[0].lineup.ADC].node='red_nexus';
 nav.agents[clubs[0].lineup.MID].node='red_nexus';
 const model=core.NexusSiege.create(a,b);
 const hits=[];
 for(let minute=25;minute<=40&&model.hp[b]>0;minute++){
  const h=core.NexusSiege.advance(model,nav,state,minute,health,dead);
  assert.equal(h.length,1);
  assert.equal(h[0].before-h[0].after,h[0].damage);
  hits.push(h[0]);
 }
 assert.equal(model.hp[b],0);
 assert.ok(hits.length>=2);
 assert.equal(hits.at(-1).after,0);
 const replay=core.NexusSiege.snapshot(model);
 assert.equal(replay.hits,hits.length);
 assert.equal(replay.hp[b],0);
 assert.equal(replay.hp[a],core.NexusSiege.MAX_HP);
});

test('60 semillas: asedio físico termina con ganador y ledger consistente',()=>{
 const {sim,core,world,fixture}=setup();
 let damageEvents=0,withWinner=0;
 for(let seed=1;seed<=60;seed++){
  world.rng=seed*90721;
  const m=sim.simulateMatch(fixture);
  const e=[...core.NexusSiege.audit(m),...core.Navigation.auditNavigation(m,world),
   ...core.auditMatch(m,world),...core.MatchReplay.auditMoments(m,world)];
  assert.deepEqual(e,[],'seed '+seed+': '+e.slice(0,5).join(' | '));
  assert.ok(m.winner,'Ganador ausente en seed '+seed);
  const hits=m.events.filter(e=>['nexus_damage','nexus'].includes(e.facts?.action));
  assert.ok(hits.length>0);
  damageEvents+=hits.length;withWinner++;
 }
 console.log('NEXUS_SAMPLE='+JSON.stringify({damageEvents,withWinner}));
});
