import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Gank Coherence QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
   f.a===world.userClub||f.b===world.userClub);
 return {...ctx,world,fixture};
};
const snapshot=v=>JSON.stringify(v);

test('combate: estar a dos saltos no basta si hay gran distancia física',()=>{
 const {core}=setup(),nav=core.Navigation;
 assert.equal(nav.isLaneNode('red_mid_front','MID'),true);
 assert.equal(nav.isLaneNode('red_bot_front','MID'),false);
 assert.equal(nav.isLaneNode('red_jungle_lower','MID'),false);
 assert.equal(nav.combatRange('red_bot_front','red_mid_front',2),false);
 assert.equal(nav.combatRange('red_jungle_lower','red_mid_front',2),true);
 assert.equal(nav.gankApproach('red_jungle_lower','MID'),'jungla');
 assert.equal(nav.gankApproach('upper_river','MID'),'rio');
 assert.equal(nav.gankApproach('red_mid_front','MID'),'flanco');
});

test('220 semillas: no se narran ganks desde bot cuando la víctima está en mid',()=>{
 const {sim,core,world,fixture}=setup();
 let total=0,mid=0;
 for(let seed=1;seed<=220;seed++){
  world.rng=seed*13131;
  const match=sim.simulateMatch(fixture);
  const navErrors=core.Navigation.auditNavigation(match,world);
  assert.equal(navErrors.length,0,'Navegación '+seed+': '+navErrors.slice(0,5).join(' / '));
  const matchErrors=core.auditMatch(match,world);
  assert.equal(matchErrors.length,0,'Match '+seed+': '+matchErrors.slice(0,5).join(' / '));
  const momentErrors=core.MatchReplay.auditMoments(match,world);
  assert.equal(momentErrors.length,0,'Moments '+seed+': '+momentErrors.slice(0,5).join(' / '));
  for(const [i,event] of match.events.entries()){
   const f=event.facts;
   if(f?.action!=='gank')continue;
   total++;
   if(f.lane==='MID')mid++;
   const before=match.moments[i].navigation.before;
   const attacker=before[f.initiatorId],victim=before[f.victimIds[0]];
   const killer=before[f.actorId];
   assert.equal(f.spatialVersion,2);
   assert.equal(core.Navigation.isLaneNode(victim.node,f.lane),true);
   assert.equal(core.Navigation.combatRange(attacker.node,victim.node,2),true);
   assert.equal(core.Navigation.combatRange(killer.node,victim.node,2),true);
   assert.equal(f.route,core.Navigation.gankApproach(attacker.node,f.lane));
   assert.equal(f.initiatorNode,attacker.node);
   assert.equal(f.victimNode,victim.node);
   const scene=core.MatchReplay.eventView(match,i);
   assert.ok(scene);
   assert.equal(scene.consistent,true);
   assert.equal(scene.frame.minimap.players[f.initiatorId].node,attacker.node);
   assert.equal(scene.frame.minimap.players[f.actorId].node,killer.node);
   assert.equal(scene.frame.minimap.players[f.victimIds[0]].node,victim.node);
   assert.equal(scene.frame.minimap.players[f.victimIds[0]].fallen,true);
  }
 }
 assert.ok(total>0,'No ganks to validate');
 assert.ok(mid>0,'No MID gank to validate');
});

test('al seleccionar gank el jungla se ve en su nodo real y la víctima cae donde ocurrió',()=>{
 const {sim,core,minimapUI,world,fixture}=setup();
 let match,index=-1;
 for(let seed=1;seed<=80;seed++){
  world.rng=seed*77441;
  match=sim.simulateMatch(fixture);
  index=match.events.findIndex(e=>e.facts?.action==='gank');
  if(index>=0)break;
 }
 assert.ok(index>=0);
 const f=match.events[index].facts,pre=match.moments[index].navigation.before;
 const saved=snapshot(match),scene=core.MatchReplay.eventView(match,index);
 assert.equal(scene.consistent,true);
 assert.deepEqual(scene.participants.includes(f.initiatorId),true);
 assert.equal(scene.frame.minimap.players[f.initiatorId].node,pre[f.initiatorId].node);
 assert.equal(scene.frame.minimap.players[f.victimIds[0]].node,pre[f.victimIds[0]].node);
 assert.equal(match.moments[index].minimap.players[f.victimIds[0]].node,
   pre[f.victimIds[0]].teamId===match.fixture.a?'blue_fountain':'red_fountain');
 const svg=minimapUI.render(match,scene.frame,world,match.moments[index-1],match.events[index],scene);
 assert.match(svg,/data-event-role="jungla"/);
 assert.match(svg,/data-event-role="victima"/);
 assert.match(svg,/is-fallen/);
 assert.match(svg,/data-focus-action="gank"/);
 assert.match(svg,/cayó aquí/);
 assert.equal(snapshot(match),saved,'Replay must not mutate match state');
});

test('una partida antigua incoherente genera aviso sin teletransportar jugadores',()=>{
 const {sim,core,world,fixture}=setup();
 let match,index=-1;
 for(let seed=1;seed<=70;seed++){
  world.rng=seed*9973;
  match=sim.simulateMatch(fixture);
  index=match.events.findIndex(e=>e.facts?.action==='gank');
  if(index>=0)break;
 }
 assert.ok(index>=0);
 const legacy=JSON.parse(JSON.stringify(match)),f=legacy.events[index].facts;
 delete f.spatialVersion;
 const pre=legacy.moments[index].navigation.before;
 pre[f.initiatorId].node='red_bot_front';
 f.initiatorNode='red_bot_front';
 const scene=core.MatchReplay.eventView(legacy,index);
 assert.equal(scene.consistent,false);
 assert.equal(scene.legacyLocationWarning,true);
 assert.equal(scene.frame.minimap.players[f.initiatorId].node,'red_bot_front');
 assert.notEqual(scene.frame.minimap.players[f.initiatorId].node,pre[f.victimIds[0]].node);
});

test('si se manipula la ubicación en el gank, el auditor deportivo lo rechaza',()=>{
 const {sim,core,world,fixture}=setup();
 let match,index=-1;
 for(let seed=1;seed<=70;seed++){
  world.rng=seed*44713;
  match=sim.simulateMatch(fixture);
  index=match.events.findIndex(e=>e.facts?.action==='gank');
  if(index>=0)break;
 }
 assert.ok(index>=0);
 const forged=JSON.parse(JSON.stringify(match)),e=forged.events[index];
 const frame=forged.frames.find(f=>f.minute===e.minute);
 frame.navigation.before[e.facts.initiatorId].node='red_bot_front';
 assert.match(core.Navigation.auditNavigation(forged,world).join(' '),/Gank imposible|Ruta de gank falsificada/);
});
