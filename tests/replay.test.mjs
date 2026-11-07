import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Replay QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 return {...ctx,world,fixture};
};

test('posiciones iniciales: TOP, MID y BOT comienzan adelantados y equilibrados',()=>{
 const {sim,core,world,fixture}=setup();
 const match=sim.simulateMatch(fixture),start=match.frames[0].navigation.after;
 for(const [teamId,side] of [[fixture.a,'blue'],[fixture.b,'red']]){
  const lineup=world.clubs.find(c=>c.id===teamId).lineup;
  for(const [role,lane] of [['TOP','top'],['MID','mid'],['ADC','bot'],['SUP','bot']]){
   const p=start[lineup[role]];
   assert.equal(p.node,side+'_'+lane+'_front',role+' arranca adelantado');
   const close=core.MiniGraph.pointAt(p.node),back=core.MiniGraph.pointAt(side+'_'+lane+'_outer');
   const neutral=core.MiniGraph.pointAt({top:'top_corner',mid:'mid_center',bot:'bot_corner'}[lane]);
   const dist=(x,y)=>Math.hypot(x.x-y.x,x.y-y.y);
   assert.ok(dist(close,neutral)<dist(back,neutral),'La línea está más cerca del centro');
  }
 }
 const b=core.MiniGraph.pointAt('blue_mid_front'),r=core.MiniGraph.pointAt('red_mid_front');
 assert.ok(Math.abs(b.x-r.x)<80 && Math.abs(b.y-r.y)<80);
});

test('120 partidos: una instantánea exacta por evento, sin falsificar el marcador',()=>{
 const {sim,core,world,fixture}=setup();
 let sameMinute=0,towers=0,fights=0;
 for(let seed=1;seed<=120;seed++){
  world.rng=seed*12791;
  const match=sim.simulateMatch(fixture);
  assert.equal(match.moments.length,match.events.length);
  assert.equal(core.MatchReplay.auditMoments(match,world).length,0,'Moments seed '+seed);
  assert.equal(core.auditMatch(match,world).length,0,'Sports seed '+seed);
  assert.equal(core.Navigation.auditNavigation(match,world).length,0,'Spatial seed '+seed);
  const steps=core.MatchReplay.timeline(match);
  assert.equal(steps.length,core.broadcastFeed(match).length);
  for(const e of match.events){
   if(e.facts?.action==='tower')towers++;
   if(e.facts?.action==='teamfight')fights++;
  }
  for(let i=0;i<match.events.length;i++){
   const e=match.events[i],m=match.moments[i];
   assert.equal(m.eventsCount,i+1);
   assert.equal(m.time,e.time);
   assert.ok(m.minimap);
   if(i&&match.events[i-1].minute===e.minute){
    sameMinute++;
    assert.notEqual(m.eventsCount,match.moments[i-1].eventsCount);
   }
  }
 }
 assert.ok(towers>20&&fights>5);
 assert.ok(sameMinute>0,'No hay ninguna pareja de eventos en el mismo minuto');
});

test('en la exhibición Siguiente evento solo avanza una jugada y el historial permite retroceder',()=>{
 const {sim,core,store}=boot({now:1731111111000});
 sim.startDemoMatch();
 const live=sim.getState().live,steps=core.MatchReplay.timeline(live);
 assert.ok(steps.length>5);
 assert.equal(live.replayCursor,0);
 assert.equal(live.replayProgress,0);
 assert.equal(store.size,0,'Modo prueba sin save');
 const initialHTML=sim.renderMatch();
 assert.match(initialHTML,/Siguiente evento/);
 assert.match(initialHTML,/Terminar partida/);
 assert.doesNotMatch(initialHTML,/speed-5/);
 sim.nextReplay();
 assert.equal(live.replayCursor,1);
 assert.equal(live.replayProgress,1);
 sim.nextReplay();
 assert.equal(live.replayCursor,2);
 assert.equal(live.replayProgress,2);
 assert.equal(sim.seekReplay(0),true);
 assert.equal(live.replayCursor,0);
 assert.equal(live.replayProgress,2);
 assert.equal(sim.seekReplay(10),false,'No permite ver jugadas futuras antes de terminarlas');
 sim.nextReplay();
 assert.equal(live.replayCursor,1);
 assert.equal(live.replayProgress,2);
 const past=sim.renderMatch();
 assert.match(past,/data-action="replay-seek" data-index="0"/);
 assert.match(past,/class="event replay-event/);
 assert.equal(store.size,0);
 sim.exitDemoMatch();
 assert.equal(sim.getState(),null);
});

test('Terminar partida entrega historial completo, permite rebobinar y no paga dos veces',()=>{
 const {sim,core,world,fixture}=setup();
 world.live=sim.simulateMatch(fixture);
 const live=world.live,steps=core.MatchReplay.timeline(live);
 const original=JSON.stringify(live.frames.map(f=>f.navigation));
 sim.liveControl('instant');
 assert.equal(live.finished,true);
 assert.equal(live.committed,true);
 assert.equal(live.replayCursor,steps.length-1);
 assert.equal(live.replayProgress,steps.length-1);
 assert.equal(world.matchReports.length,1);
 const winnings=sim.currentClub().cash;
 assert.equal(sim.seekReplay(0),true);
 assert.equal(live.replayCursor,0);
 assert.match(sim.renderMatch(),/Historial de jugadas/);
 assert.match(sim.renderMatch(),/MAPA · 00:00/);
 assert.doesNotMatch(sim.renderMatch(),/Duración: .*minutos/);
 assert.equal(world.matchReports.length,1);
 sim.nextReplay();
 assert.equal(live.replayCursor,1);
 assert.equal(world.matchReports.length,1);
 assert.equal(sim.currentClub().cash,winnings);
 sim.liveControl('instant');
 assert.equal(live.replayCursor,steps.length-1);
 assert.equal(sim.currentClub().cash,winnings);
 assert.equal(JSON.stringify(live.frames.map(f=>f.navigation)),original);
});

test('un evento concreto muestra torres, bajas y lugar de combate justo después de la acción',()=>{
 const {sim,core,minimapUI,world,fixture}=setup();
 const match=sim.simulateMatch(fixture);
 const goalIndex=match.events.findIndex(e=>e.facts?.action==='tower');
 const fightIndex=match.events.findIndex(e=>['gank','teamfight'].includes(e.facts?.action));
 assert.ok(goalIndex>=0&&fightIndex>=0);
 const towerEvent=match.events[goalIndex],moment=match.moments[goalIndex],prior=match.moments[goalIndex-1];
 assert.equal(moment.towers[towerEvent.teamId],prior.towers[towerEvent.teamId]+1);
 const svg=minimapUI.render(match,moment,world,prior,towerEvent);
 assert.match(svg,/data-focus-action="tower"/);
 assert.match(svg,/just-fallen/);
 const fightEvent=match.events[fightIndex];
 const battleSvg=minimapUI.render(match,match.moments[fightIndex],world,match.moments[fightIndex-1],fightEvent);
 assert.match(battleSvg,/data-focus-action="(?:gank|teamfight)"/);
});

test('última repetición sigue disponible después de salir y cargar un save v2',()=>{
 const {sim,core,world,fixture,store}=setup();
 world.live=sim.simulateMatch(fixture);
 sim.liveControl('instant');
 const played=world.live,expected=JSON.stringify(played.moments);
 sim.handleClick({target:{closest:()=>({dataset:{action:'leave-match'}})}});
 assert.equal(world.live,null);
 assert.equal(world.lastReplay,played);
 assert.match(sim.renderMatch(),/Revisar último partido/);
 sim.handleClick({target:{closest:()=>({dataset:{action:'reopen-replay'}})}});
 assert.equal(world.live,played);
 assert.equal(world.live.finished,true);
 assert.equal(sim.seekReplay(0),true);
 sim.save();
 const serialized=store.get(core.SAVE_KEY);
 const reloaded=core.parseWorld(serialized);
 assert.equal(reloaded.lastReplay.finished,true);
 assert.equal(JSON.stringify(reloaded.lastReplay.moments),expected);
});

test('partida antigua v2 sin momentos: historial navegable por minuto y fin de partida válido',()=>{
 const {sim,core,world,fixture}=setup();
 const match=sim.simulateMatch(fixture);
 delete match.moments;
 delete match.replayCursor;
 delete match.replayProgress;
 world.live=match;match.finished=false;match.committed=false;match.elapsed=5;
 const before=JSON.stringify(world);
 const loaded=core.parseWorld(before);
 assert.equal(JSON.stringify(loaded),before);
 const replay=core.MatchReplay.ensure(match);
 assert.ok(replay.progress>=0);
 assert.equal(replay.list.some(x=>x.precise),false);
 sim.liveControl('instant');
 assert.equal(world.matchReports.length,1);
 assert.equal(match.finished,true);
 assert.equal(sim.seekReplay(0),true);
});
