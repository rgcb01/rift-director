import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Unified Combat QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 const a=world.clubs.find(c=>c.id===fixture.a),b=world.clubs.find(c=>c.id===fixture.b);
 const teams=Object.fromEntries([a,b].map(c=>[c.id,
  ctx.core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 return {...ctx,world,fixture,a,b,teams,
  nav:ctx.core.Navigation.createNavigation([a,b],teams,123456789),
  players:Object.fromEntries(world.players.map(p=>[p.id,p]))};
};
const clone=x=>JSON.parse(JSON.stringify(x));

test('intercambio en TOP/BOT tiene alcance de línea, no inventa muerte ni mueve iconos',()=>{
 const x=setup(),{core,nav,a,b,players,world}=x,health=core.Encounters.create(world.players);
 for(const [lane,role] of [['TOP','TOP'],['MID','MID'],['BOT','ADC']]){
  const blue=nav.agents[a.lineup[role]],red=nav.agents[b.lineup[role]];
  assert.equal(core.Encounters.laneRange(blue,red,lane),true,
    'Líneas '+lane+' no pueden intercambiar desde posiciones iniciales');
  const saved=JSON.stringify({health,agentA:blue,agentB:red});
  const f=core.Encounters.resolveCombat({
   nav,dead:{},minute:5,players,health,seed:777,mode:'lane',teamId:a.id,
   attackerIds:[blue.id],targetIds:[red.id],lane
  });
  assert.ok(f,'Sin intercambio en '+lane);
  assert.equal(f.targetId,red.id);assert.equal(f.actorId,blue.id);
  assert.equal(f.combatVersion,1);assert.equal(f.mode,'lane');
  assert.equal(f.impacts.length,1);
  assert.equal(f.impacts[0].hpBefore,100);
  assert.ok(f.impacts[0].hpAfter>0,'Un solo poke desde vida máxima no debería matar');
  assert.equal(f.victimIds.length,0);
  assert.equal(JSON.stringify({health,agentA:blue,agentB:red}),saved,
   'Resolución pura no puede mover ni curar jugadores');
 }
});

test('gank compartido: herida, retirada o baja dependen del HP real',()=>{
 const x=setup(),{core,nav,a,b,players,world}=x,health=core.Encounters.create(world.players);
 const j=nav.agents[a.lineup.JUN],mid=nav.agents[a.lineup.MID],
  enemy=nav.agents[b.lineup.MID];
 j.node='upper_river';j.intent='gank_setup';j.lane='MID';
 assert.equal(core.Navigation.combatRange(j.node,enemy.node,2),true);
 assert.equal(core.Navigation.combatRange(mid.node,enemy.node,2),true);
 const args={nav,dead:{},minute:7,players,health,mode:'gank',teamId:a.id,
  attackerIds:[j.id,mid.id],targetIds:[enemy.id],lane:'MID'};
 let survivor=null;
 for(let seed=1;seed<=100;seed++){
  const f=core.Encounters.resolveCombat({...args,seed});
  if(f?.outcome==='retreat'){survivor=f;break}
 }
 assert.ok(survivor,'Nadie logra escapar del 2v1 con HP completo');
 assert.equal(survivor.actorId,j.id);
 assert.equal(survivor.victimIds.length,0);
 assert.ok(survivor.impacts[0].hpAfter>0);
 assert.ok(survivor.impacts[0].retreatGoal);
 health[enemy.id]=16;
 const slain=core.Encounters.resolveCombat({...args,seed:2});
 assert.equal(slain.outcome,'kill');
 assert.equal(slain.impacts[0].hpAfter,0);
 assert.deepEqual(clone(slain.victimIds),[enemy.id]);
 assert.ok(slain.assistIds.includes(mid.id));
 const far=core.Encounters.resolveCombat({...args,
  attackerIds:[j.id],targetIds:[nav.agents[b.lineup.ADC].id],seed:8});
 assert.equal(far,null,'Gank desde MID a BOT no puede hacer daño remoto');
});

test('una pelea daña varios objetivos pero no concede kills sin vida cero',()=>{
 const x=setup(),{core,nav,a,b,players,world}=x,health=core.Encounters.create(world.players);
 const j=nav.agents[a.lineup.JUN],mid=nav.agents[a.lineup.MID],
  rival=nav.agents[b.lineup.MID];
 j.node='upper_river';
 const living=core.Encounters.resolveCombat({
  nav,dead:{},minute:17,players,health,seed:53,mode:'teamfight',teamId:a.id,
  attackerIds:[j.id,mid.id],targetIds:[rival.id]
 });
 assert.ok(living);
 assert.equal(living.combatVersion,1);
 assert.ok(living.impacts.length>=1);
 for(const hit of living.impacts){
  assert.equal(hit.hpAfter,Math.max(0,hit.hpBefore-hit.damage));
  assert.equal(living.victimIds.includes(hit.id),hit.hpAfter===0);
 }
 const repeat=core.Encounters.resolveCombat({
  nav,dead:{},minute:17,players,health,seed:53,mode:'teamfight',teamId:a.id,
  attackerIds:[j.id,mid.id],targetIds:[rival.id]
 });
 assert.equal(JSON.stringify(living),JSON.stringify(repeat));
});

test('200 partidos: auditorías del daño/HP, historial, roles y score por acción',()=>{
 const {sim,core,world,fixture}=setup();
 const actions={lane_trade:0,gank:0,gank_avoided:0,teamfight:0,clash:0,skirmish:0};
 const modes=new Set(),lanes=new Set(),outcomes=new Set();
 let validated=0,fallens=0,retreated=0;
 for(let seed=1;seed<=200;seed++){
  world.rng=seed*25907;
  const match=sim.simulateMatch(fixture);
  const checks=[
   ...core.auditMatch(match,world),...core.Navigation.auditNavigation(match,world),
   ...core.Encounters.audit(match,world),...core.auditMinimap(match,world),
   ...core.MatchReplay.auditMoments(match,world),...core.auditBroadcast(match,world)
  ];
  assert.equal(checks.length,0,'Seed '+seed+': '+checks.slice(0,5).join(' | '));
  assert.ok(match.winner);
  for(const [i,e] of match.events.entries()){
   const f=e.facts;if(!f)continue;
   if(f.action in actions)actions[f.action]++;
   if(f.combatVersion!==1)continue;
   validated++;modes.add(f.mode);outcomes.add(f.outcome);
   if(f.mode==='lane')lanes.add(f.lane);
   assert.equal(match.moments[i].navigation.before[f.actorId].node,f.actorNode);
   assert.equal(f.victimIds.length,f.impacts.filter(hit=>hit.hpAfter===0).length);
   for(const hit of f.impacts){
    const scene=core.MatchReplay.eventView(match,i);
    assert.ok(scene);
    const p=scene.frame.minimap.players[hit.id];
    assert.equal(p.hp,hit.hpAfter);
    assert.equal(p.fallen,hit.hpAfter===0);
    if(hit.hpAfter===0)fallens++;
    if(hit.retreat)retreated++;
   }
  }
 }
 assert.ok(validated>100);
 assert.ok(actions.lane_trade>20,'No intercambios de línea en partidas reales');
 assert.ok(actions.gank>0,'No ganks letales en ninguna seed');
 assert.ok(actions.gank_avoided>0,'No ganks no letales');
 assert.ok(actions.teamfight>0,'No peleas de equipo letales');
 assert.ok(actions.clash>0,'No peleas no letales');
 assert.ok(actions.skirmish>0,'Objetivos dejaron de resolver 2v1');
 assert.deepEqual([...modes].sort(),['gank','lane','teamfight']);
 assert.deepEqual([...lanes].sort(),['BOT','MID','TOP']);
 assert.ok(outcomes.has('kill')&&outcomes.has('trade')&&outcomes.has('retreat'));
 assert.ok(fallens>0&&retreated>0);
});

test('salud y muerte inventadas son detectadas por auditoría de partida y replay',()=>{
 const {sim,core,world,fixture}=setup();
 let example=null;
 for(let seed=1;seed<=30;seed++){
  world.rng=seed*8133;
  const match=sim.simulateMatch(fixture);
  const i=match.events.findIndex(e=>e.facts?.combatVersion===1);
  if(i>=0){example={match,i};break}
 }
 assert.ok(example);
 const bad=clone(example.match),f=bad.events[example.i].facts;
 bad.moments[example.i].health[f.targetId]=101;
 assert.ok(core.Encounters.audit(bad,world).length>0);
 assert.ok(core.auditMatch(bad,world).length>0);
 const badDamage=clone(example.match),facts=badDamage.events[example.i].facts;
 facts.impacts[0].damage=0;
 assert.ok(core.Encounters.audit(badDamage,world).length>0);
});
