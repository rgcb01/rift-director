import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Jungle Corridor QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
   f.a===world.userClub||f.b===world.userClub);
 return {...ctx,world,fixture};
};
const roles=(world,id)=>world.clubs.find(c=>c.id===id).lineup;

test('rutas de campamentos y accesos de emboscada no necesitan pasar por MID',()=>{
 const {core}=setup(),nav=core.Navigation;
 for(const side of ['blue','red']){
  const upper=side+'_jungle_upper',lower=side+'_jungle_lower';
  assert.equal(nav.adjacent(upper,lower),true);
  assert.deepEqual(JSON.parse(JSON.stringify(nav.path(upper,lower))),[upper,lower]);
  const permitted=node=>nav.jungleAllowed(side,node);
  const entries=[upper,lower,side+'_nexus',side+'_fountain',
   'upper_river','lower_river','baron_pit','dragon_pit',
   'blue_top_ambush','red_top_ambush','blue_bot_ambush','red_bot_ambush'];
  for(const from of entries)for(const to of entries){
   const route=nav.path(from,to,permitted);
   assert.equal(route[0],from);
   assert.equal(route.at(-1),to);
   for(const node of route){
    assert.equal(permitted(node),true);
    for(const lane of ['TOP','MID','BOT'])
     assert.equal(nav.isLaneNode(node,lane),false,
      side+' transitó por '+lane+' al buscar '+from+' -> '+to);
   }
  }
 }
});

test('minuto 8: los dos JUN siguen fuera de MID, aunque el historial hable de duelo central',()=>{
 const {sim,core,world,fixture}=setup();
 for(let seed=1;seed<=160;seed++){
  world.rng=seed*7433;
  const match=sim.simulateMatch(fixture),frame=match.frames.find(f=>f.minute===8);
  assert.ok(frame);
  const spots=[];
  for(const [side,id] of [['blue',fixture.a],['red',fixture.b]]){
   const jun=roles(world,id).JUN,p=frame.navigation.after[jun];
   if(!p.alive)continue;
   assert.ok(core.Navigation.jungleAllowed(side,p.node),'Seed '+seed+' JUN en '+p.node);
   assert.equal(core.Navigation.isLaneNode(p.node,'MID'),false,
      'Seed '+seed+' JUN se estacionó en MID: '+p.node);
   assert.notEqual(p.node,side+'_mid_front');
   spots.push(p.node);
  }
  if(spots.length===2&&spots[0]===spots[1]){
   // Both may contest the same river choke point during actual gank setup,
   // but never while they merely travel between camps.
   const blue=frame.navigation.after[roles(world,fixture.a).JUN];
   const red=frame.navigation.after[roles(world,fixture.b).JUN];
   assert.equal(blue.intent,'gank_setup','Rivales coinciden sin preparación táctica');
   assert.equal(red.intent,'gank_setup','Rivales coinciden sin preparación táctica');
  }
 }
});

test('340 semillas: todos los minutos y tipos de eventos respetan ubicación y escenario',()=>{
 const {sim,core,world,fixture}=setup();
 const nav=core.Navigation;
 const actions={gank:0,gank_avoided:0,teamfight:0,tower:0,dragon:0,baron:0,nexus:0};
 const routes=new Set(),intents=new Set();let inspected=0;
 for(let seed=1;seed<=340;seed++){
  world.rng=seed*22931;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Seed '+seed+' sin vencedor');
  assert.equal(nav.auditNavigation(match,world).length,0,'Navegación seed '+seed);
  assert.equal(core.auditMatch(match,world).length,0,'Marcador seed '+seed);
  assert.equal(core.auditMinimap(match,world).length,0,'Minimapa seed '+seed);
  assert.equal(core.MatchReplay.auditMoments(match,world).length,0,'Replay seed '+seed);
  assert.equal(core.auditBroadcast(match,world).length,0,'Narración seed '+seed);
  for(const frame of match.frames){
   for(const [side,teamId] of [['blue',fixture.a],['red',fixture.b]]){
    const id=roles(world,teamId).JUN,p=frame.navigation.after[id];
    if(frame.minute>=36||!p?.alive)continue;
    inspected++;
    assert.equal(nav.jungleAllowed(side,p.node),true,
      'JUN fuera de jungla seed '+seed+' minuto '+frame.minute+' node '+p.node);
    for(const lane of ['TOP','MID','BOT'])assert.equal(nav.isLaneNode(p.node,lane),false);
    intents.add(p.intent);
    if(p.intent==='gank_setup'){
     assert.ok(['TOP','MID','BOT'].includes(p.lane));
     assert.equal(nav.jungleAllowed(side,p.goal),true);
    }
   }
  }
  for(let k=0;k<match.events.length;k++){
   const event=match.events[k],facts=event.facts;
   if(!facts||!(facts.action in actions))continue;
   actions[facts.action]++;
   const before=match.moments[k].navigation.before;
   if(facts.action==='gank'||facts.action==='gank_avoided'){
    const attacker=before[facts.initiatorId];
    const targetId=facts.action==='gank'?facts.victimIds[0]:facts.targetId;
    const victim=before[targetId];
    assert.equal(facts.plannedGankVersion,1);
    assert.equal(attacker.intent,'gank_setup');
    assert.equal(attacker.lane,facts.lane);
    assert.equal(nav.combatRange(attacker.node,victim.node,2),true);
    assert.equal(nav.isLaneNode(victim.node,facts.lane),true);
    assert.equal(facts.route,nav.gankApproach(attacker.node,facts.lane));
    assert.equal(facts.initiatorNode,attacker.node);
    routes.add(facts.lane+':'+facts.route);
    const scene=core.MatchReplay.eventView(match,k);
    assert.ok(scene);
    assert.equal(scene.consistent,true);
    assert.equal(scene.legacyLocationWarning,false);
    assert.equal(scene.frame.minimap.players[facts.initiatorId].node,attacker.node);
    assert.equal(scene.frame.minimap.players[targetId].node,victim.node);
    assert.equal(scene.frame.minimap.players[targetId].fallen,facts.action==='gank');
   }else if(facts.action==='teamfight'){
    for(const victimId of facts.victimIds)
     assert.equal(nav.combatRange(before[facts.actorId].node,before[victimId].node,2),true);
   }
  }
 }
 assert.ok(inspected>12000,'No se auditaron suficientes snapshots');
 assert.ok(actions.gank>0&&actions.gank_avoided>0,'Sin ganks exitosos y fallidos');
 assert.ok(actions.teamfight>0&&actions.tower>0&&actions.nexus===340);
 assert.ok(routes.size>=3,'Poca diversidad de caminos de gank');
 assert.ok(intents.has('farm_jungle')&&intents.has('gank_setup')&&
  intents.has('objective_setup'),'Faltan fases de Jungla');
});

test('un JUN colocado artificialmente en MID durante fase de líneas falla auditoría',()=>{
 const {sim,core,world,fixture}=setup();
 world.rng=919191;
 const match=sim.simulateMatch(fixture);
 const tampered=JSON.parse(JSON.stringify(match)),frame=tampered.frames.find(f=>f.minute===8);
 const jungler=roles(world,fixture.a).JUN;
 frame.navigation.before[jungler].node='blue_mid_front';
 const errors=core.Navigation.auditNavigation(tampered,world);
 assert.ok(errors.some(e=>e.includes('JUN invadió un carril')),
  'El auditor ignoró la presencia ilegal: '+errors.join(' | '));
});

test('gank fallido no mata ni suma oro y puede verse en el historial',()=>{
 const {sim,core,minimapUI,world,fixture}=setup();
 let found;
 for(let seed=1;seed<=100;seed++){
  world.rng=seed*2371;
  const match=sim.simulateMatch(fixture);
  const i=match.events.findIndex(e=>e.facts?.action==='gank_avoided');
  if(i>=0){found={match,i};break}
 }
 assert.ok(found,'No ocurrió ningún gank fallido');
 const {match,i}=found,event=match.events[i],facts=event.facts,moment=match.moments[i];
 const previous=i>0?match.moments[i-1]:match.frames[0];
 const targetId=facts.targetId;
 assert.equal(moment.playerStats[targetId].deaths,previous.playerStats[targetId].deaths);
 assert.equal(core.MatchReplay.eventView(match,i).frame.minimap.players[targetId].fallen,false);
 const scene=core.MatchReplay.eventView(match,i);
 const svg=minimapUI.render(match,scene.frame,world,previous,event,scene);
 assert.match(svg,/data-focus-action="gank_avoided"/);
 assert.match(svg,/data-event-role="objetivo"/);
});
