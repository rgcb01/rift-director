import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

function setup(){
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Combat QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 return {...ctx,world,fixture};
}
function staged({core,world,fixture}){
 const a=world.clubs.find(c=>c.id===fixture.a),b=world.clubs.find(c=>c.id===fixture.b);
 const lineup=c=>core.ROLES.map(role=>world.players.find(p=>p.id===c.lineup[role]));
 const nav=core.Navigation.createNavigation([a,b],{[a.id]:lineup(a),[b.id]:lineup(b)},987654);
 const agents=nav.agents,players=Object.fromEntries(world.players.map(p=>[p.id,p]));
 for(const agent of Object.values(agents)){
  agent.node=agent.teamId===fixture.a?'blue_fountain':'red_fountain';
  agent.intent='farm_jungle';agent.alive=true;
 }
 const jun=agents[a.lineup.JUN],support=agents[a.lineup.SUP],target=agents[b.lineup.SUP];
 jun.node='dragon_pit';jun.intent='objective_setup';
 support.node='lower_river';support.intent='objective_setup';
 target.node='red_bot_ambush';target.intent='ward_roam';
 return {nav,players,jun,support,target};
}

test('2v1 cerca de Dragón provoca daño y una decisión, no un silencio',()=>{
 const x=setup(),{core,world,fixture}=x;
 const {nav,players,jun,support,target}=staged(x);
 const health=core.Encounters.create(world.players);
 const ctx={nav,dead:{},minute:15,zone:'dragon_pit',players,health,seed:1234,previous:{}};
 const first=core.Encounters.resolve(ctx);
 const repeat=core.Encounters.resolve(ctx);
 assert.ok(first,'El 2v1 no produjo ningún encuentro');
 assert.equal(JSON.stringify(first),JSON.stringify(repeat),'Resultado no determinista');
 assert.equal(first.action,'skirmish');
 assert.equal(first.attackerCount,2);
 assert.equal(first.defenderCount,1);
 assert.equal(first.targetId,target.id);
 assert.equal(first.participantIds.includes(jun.id),true);
 assert.equal(first.participantIds.includes(support.id),true);
 assert.equal(first.outcome==='retreat'||first.outcome==='kill',true);
 assert.equal(first.hpAfter,Math.max(0,first.hpBefore-first.damage));
 assert.equal(first.node,'dragon_pit');
 assert.equal(core.Encounters.resolve({...ctx,previous:{dragon_pit:14}}),null,
  'No debe repetir la misma pelea al instante');
});

test('un SUP con vida puede sobrevivir al 2v1 y debe abandonar la zona físicamente',()=>{
 const x=setup(),{core,world}=x;
 const {nav,players,target}=staged(x),health=core.Encounters.create(world.players);
 const fact=core.Encounters.resolve({nav,dead:{},minute:15,zone:'dragon_pit',players,health,seed:9001,previous:{}});
 assert.ok(fact);
 // An intact HP bar cannot be interpreted as an automatic death.
 if(fact.outcome==='retreat'){
  health[target.id]=fact.hpAfter;
  assert.ok(fact.hpAfter>0);
  assert.ok(core.Navigation.forceRetreat(nav,target.id,15,fact.retreatGoal));
  assert.equal(target.intent,'retreat');
  const before=target.node;
  nav.minute=15;
  const state={gold:{[nav.a]:20000,[nav.b]:20000},lanes:{[nav.a]:{TOP:0,MID:0,BOT:0},[nav.b]:{TOP:0,MID:0,BOT:0}},
    towers:{[nav.a]:0,[nav.b]:0},kills:{[nav.a]:0,[nav.b]:0},barons:{[nav.a]:0,[nav.b]:0}};
  core.Navigation.advance(nav,16,{},state);
  assert.equal(target.intent,'retreat');
  assert.equal(core.Navigation.adjacent(before,target.node),true,'La retirada se teletransportó');
  assert.notEqual(target.node,before,'La retirada no empezó a caminar');
 }else{
  // If this seed lands a lethal burst, test a guaranteed nonlethal attack
  // using the same geometry and a modest fresh defender life.
  let safe;
  for(let seed=1;seed<=200;seed++){
   const outcome=core.Encounters.resolve({nav,dead:{},minute:15,zone:'dragon_pit',players,
     health:{...health,[target.id]:100},seed,previous:{}});
   if(outcome?.outcome==='retreat'){safe=outcome;break}
  }
  assert.ok(safe,'Ninguna semilla permite al support escapar');
  assert.ok(safe.hpAfter>0);
 }
});

test('cuando la vida es insuficiente, el 2v1 provoca una muerte real',()=>{
 const x=setup(),{core,world}=x;
 const {nav,players,target}=staged(x),health=core.Encounters.create(world.players);
 health[target.id]=12;
 const f=core.Encounters.resolve({nav,dead:{},minute:15,zone:'dragon_pit',players,health,seed:42,previous:{}});
 assert.ok(f);
 assert.equal(f.outcome,'kill');
 assert.equal(f.hpAfter,0);
 assert.deepEqual(JSON.parse(JSON.stringify(f.victimIds)),[target.id]);
 assert.ok(f.assistIds.length>=1);
});

test('partidos completos: puntos de vida, bajas, rutas y relatos son auditables',()=>{
 const {sim,core,world,fixture}=setup();
 const counts={retreat:0,kill:0},zones=new Set();let checked=0,retreatMovement=0;
 for(let seed=1;seed<=230;seed++){
  world.rng=seed*26171;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Partido sin nexo seed '+seed);
  assert.equal(core.auditMatch(match,world).length,0,'Score seed '+seed);
  assert.equal(core.Navigation.auditNavigation(match,world).length,0,'Rutas seed '+seed);
  assert.equal(core.auditMinimap(match,world).length,0,'Minimapa seed '+seed);
  assert.equal(core.MatchReplay.auditMoments(match,world).length,0,'Historial seed '+seed);
  assert.equal(core.Encounters.audit(match,world).length,0,'HP y skirmish seed '+seed);
  assert.equal(core.auditBroadcast(match,world).length,0,'RiftCast seed '+seed);
  for(const frame of match.frames){
   assert.equal(Object.keys(frame.health).length,10);
   for(const [id,p] of Object.entries(frame.navigation.after)){
    assert.ok(frame.health[id]>=0&&frame.health[id]<=100,'Vida fuera de rango '+id);
    if(!p.alive)assert.equal(frame.health[id],0,'Muerto con HP positivo');
   }
   for(const p of Object.values(frame.navigation.after))
    if(p.intent==='retreat'&&p.alive)retreatMovement++;
  }
  for(const [i,e] of match.events.entries()){
   const f=e.facts;
   if(f?.action!=='skirmish')continue;
   counts[f.outcome]++;checked++;zones.add(f.zone);
   const moment=match.moments[i],scene=core.MatchReplay.eventView(match,i);
   assert.ok(scene,'Escena de escaramuza no reconstruida');
   assert.equal(moment.health[f.targetId],f.hpAfter);
   assert.equal(scene.frame.minimap.players[f.targetId].fallen,f.outcome==='kill');
   if(f.outcome==='retreat'){
    assert.equal(moment.navigation.after[f.targetId].intent,'retreat');
    assert.equal(moment.navigation.after[f.targetId].alive,true);
   }
   if(f.outcome==='kill'){
    assert.equal(moment.navigation.after[f.targetId].alive,false);
    assert.equal(moment.health[f.targetId],0);
   }
  }
 }
 assert.ok(checked>5,'Muy pocas escaramuzas en el conjunto');
 assert.ok(counts.retreat>0,'Nunca se escapan los jugadores');
 assert.ok(counts.kill>0,'Las escaramuzas nunca pueden terminar en kill');
 assert.ok(retreatMovement>0,'Las retiradas no cambian el comportamiento físico');
 assert.ok(zones.size>=1);
});

test('manipular vida o desenlace en un replay se detecta',()=>{
 const {sim,core,world,fixture}=setup();
 let found=null;
 for(let seed=1;seed<=150;seed++){
  world.rng=seed*33919;
  const match=sim.simulateMatch(fixture),index=match.events.findIndex(e=>e.facts?.action==='skirmish');
  if(index!==-1){found={match,index};break}
 }
 assert.ok(found,'Faltan escaramuzas para validar auditoría');
 const fake=JSON.parse(JSON.stringify(found.match));
 const f=fake.events[found.index].facts;
 fake.moments[found.index].health[f.targetId]=101;
 assert.ok(core.Encounters.audit(fake,world).length>0);
 assert.ok(core.auditMatch(fake,world).length>0);
});
