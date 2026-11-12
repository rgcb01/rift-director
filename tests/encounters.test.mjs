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

test('autor de una baja o retirada debe estar en alcance de golpe, no solo cerca del objetivo',()=>{
 const x=setup(),{core,world}=x;
 const {nav,players,jun,support,target}=staged(x);
 target.node='red_bot_front'; // 84 units from Dragon: inside the local encounter.
 support.node='red_bot_ambush'; // Direct striker, 34 units away.
 jun.node='dragon_pit'; // Ally provides numerical pressure but cannot hit from 84.
 const health=core.Encounters.create(world.players);
 const f=core.Encounters.resolve({nav,dead:{},minute:15,zone:'dragon_pit',
   players,health,seed:98231,previous:{}});
 assert.ok(f,'The staged 2v1 should resolve');
 assert.equal(core.Navigation.combatRange(jun.node,target.node,3),false);
 assert.equal(core.Navigation.combatRange(support.node,target.node,3),true);
 assert.equal(f.actorId,support.id,'Do not award a distant jungler the finishing blow');
 assert.equal(f.participantIds.includes(jun.id),true,'Nearby teammate may contribute pressure');
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

test('a real 3v3 at Baron permits two exchanges; remote players cannot join',()=>{
 const x=setup(),{core,world,fixture}=x;
 const {nav,players}=staged(x);
 const health=core.Encounters.create(world.players);
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===fixture.a?'blue_fountain':'red_fountain';
  p.intent='lane';
  if(['MID','JUN','SUP'].includes(p.role)){
   p.node='baron_pit';p.intent='objective_setup';
  }
 }
 const ctx={nav,dead:{},minute:24,players,health,seed:32,
  world:{nextDragon:29,nextBaron:20}};
 const group=core.Encounters.groupOpportunity(ctx);
 assert.equal(group?.zone,'baron_pit');
 assert.equal(group.groups[fixture.a].length,3);
 assert.equal(group.groups[fixture.b].length,3);
 assert.equal(core.Encounters.groupOpportunity({...ctx,previous:23}),null);
 const first=group.firstTeam,second=first===fixture.a?fixture.b:fixture.a;
 const resolve=(teamId,other)=>core.Encounters.resolveCombat({
  ...ctx,mode:'teamfight',teamId,attackerIds:group.groups[teamId],
  targetIds:group.groups[other],groupExchange:true});
 const hit=resolve(first,second);
 assert.ok(hit?.impacts.length);
 for(const impact of hit.impacts){
  health[impact.id]=impact.hpAfter;
  if(impact.hpAfter===0)ctx.dead[impact.id]=28;
  else if(impact.retreat)nav.agents[impact.id].intent='retreat';
 }
 const remaining=group.groups[second].filter(id=>!ctx.dead[id]&&
  nav.agents[id].intent!=='retreat');
 const response=resolve(second,first);
 if(remaining.length){
  assert.ok(response);
  assert.ok(response.participantIds.every(id=>remaining.includes(id)));
 }else assert.equal(response,null);
 for(const p of Object.values(nav.agents).filter(p=>p.teamId===second))
  p.node='red_fountain';
 assert.equal(core.Encounters.groupOpportunity(ctx),null,
  'remote defenders cannot become a teamfight');
});

test('drafted frontline and support protect nearby carries; assassins exploit isolation',()=>{
 const x=setup(),{core,fixture}=x;
 const {nav}=staged(x);
 const pick=(team,role)=>Object.values(nav.agents).find(p=>p.teamId===team&&p.role===role);
 const adc=pick(fixture.a,'ADC'),tank=pick(fixture.a,'TOP'),sup=pick(fixture.a,'SUP');
 const target=pick(fixture.b,'ADC'),guard=pick(fixture.b,'TOP'),assassin=pick(fixture.a,'JUN');
 for(const p of [adc,tank,sup,target,guard,assassin])p.node='baron_pit';
 const entries=Object.fromEntries([[adc,'nyra'],[tank,'korvek'],[sup,'thessa'],
  [target,'velin'],[guard,'korvek'],[assassin,'veyra']].map(([p,championId])=>
   [p.id,{championId,role:p.role}]));
 const effect=(leader,allies,defenders)=>core.Encounters.compositionEffect({
  leader,target,allies,defenders,powerState:{entries}});
 assert.equal(effect(adc,[adc,tank,sup],[target]).multiplier,1.10);
 assert.equal(effect(adc,[adc,tank,sup],[target,guard]).multiplier,1.03);
 assert.equal(effect(assassin,[assassin],[target]).multiplier,1.12);
 assert.equal(effect(assassin,[assassin],[target,guard]).multiplier,.93);
 guard.node='red_fountain';tank.node='blue_fountain';sup.node='blue_fountain';
 assert.equal(effect(adc,[adc,tank,sup],[target,guard]).multiplier,1,
  'Remote champions cannot provide cover');
});
