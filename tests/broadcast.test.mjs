import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
  const {sim,core,store}=boot({now:1731111111000});
  const world=sim.newGame('balanced','Narrative QA');
  const fixture=Object.values(world.fixtures).flat().find(f=>f.a===world.userClub||f.b===world.userClub);
  return {sim,core,store,world,fixture};
};

test('compatibilidad: los intervalos históricos siguen disponibles, sin manejar la reproducción',()=>{
 const {core}=setup();
 assert.equal(core.broadcastInterval(1),5000);
 assert.equal(core.broadcastInterval(2),2500);
 assert.equal(core.broadcastInterval(5),950);
 assert.ok(core.broadcastInterval(1)>=5*core.broadcastInterval(5));
});

test('más de 150 mapas: noticias contextuales diversas sin alterar ni una acción deportiva',()=>{
 const {sim,core,world,fixture}=setup();
 const topics=new Set(),headlines=new Set(),kindCount={insight:0,sports:0};
 let totalInsights=0,low=Infinity;
 for(let seed=1;seed<=150;seed++){
  world.rng=seed*12571;
  const match=sim.simulateMatch(fixture);
  const baseline=JSON.stringify({
    events:match.events,frames:match.frames.map(f=>({
      minute:f.minute,kills:f.kills,gold:f.gold,towers:f.towers,
      dragons:f.dragons,barons:f.barons,winner:f.winner
    })),winner:match.winner
  });
  assert.equal(core.auditBroadcast(match,world).length,0,'Narrative mismatched at seed '+seed);
  assert.equal(core.auditMatch(match,world).length,0,'Sports mismatched at seed '+seed);
  const feed=core.broadcastFeed(match);
  assert.ok(feed.length>match.events.length);
  let lastMinute=-1,lastTime='';
  for(const entry of feed){
   if(entry.minute===lastMinute)assert.ok(entry.time>=lastTime,'Timeline order broken');
   else assert.ok(entry.minute>lastMinute,'Timeline minutes not monotonic');
   lastMinute=entry.minute;lastTime=entry.time;
   assert.ok(typeof entry.title==='string'&&entry.title.length>=4);
   assert.ok(typeof entry.body==='string'&&entry.body.length>=10);
   if(entry.kind==='insight'){
    kindCount.insight++;
    topics.add(entry.topic);
    headlines.add(entry.title);
    assert.ok(entry.minute>0,'Insights should start after kickoff');
    assert.ok(entry.evidence&&typeof entry.evidence==='object');
    const frame=match.frames.find(f=>f.minute===entry.minute);
    assert.ok(frame && !frame.winner);
   }else kindCount.sports++;
  }
  const insightTotal=match.broadcast.insights.length;
  low=Math.min(low,insightTotal);
  totalInsights+=insightTotal;
  assert.equal(core.feedCountAt(match,match.frames.length-1),feed.length);
  const rebuilt=core.createBroadcast(match,world,match.broadcast.seed);
  assert.equal(JSON.stringify(rebuilt),JSON.stringify(match.broadcast));
  assert.equal(JSON.stringify({
    events:match.events,frames:match.frames.map(f=>({
      minute:f.minute,kills:f.kills,gold:f.gold,towers:f.towers,
      dragons:f.dragons,barons:f.barons,winner:f.winner
    })),winner:match.winner
  }),baseline,'Editorial generator changed gameplay history');
 }
 assert.ok(topics.size>=8,'Too few different editorial topics: '+[...topics]);
 assert.ok(headlines.size>=18,'Headlines repeat across maps');
 assert.ok(totalInsights/150>=8,'Broadcast adds too few strategic observations on average');
 assert.ok(kindCount.insight>kindCount.sports/3,'Too few strategy highlights');
});

test('narraciones falsificadas son detectadas, sin tocar los eventos deportivos',()=>{
 const {sim,core,world,fixture}=setup();
 const match=sim.simulateMatch(fixture);
 const clone=JSON.parse(JSON.stringify(match));
 assert.ok(clone.broadcast.insights.length);
 clone.broadcast.insights[0].evidence={fakeKills:99};
 assert.match(core.auditBroadcast(clone,world).join(' '),/no coincide/);
 assert.equal(core.auditMatch(clone,world).length,0);
});

test('Siguiente evento descubre una jugada por pulsación, sin alterar el resultado',()=>{
 const {sim,core,world,fixture}=setup();
 world.live=sim.simulateMatch(fixture);
 const match=world.live;
 const timeline=core.MatchReplay.timeline(match);
 let count=0;
 while(!match.finished&&count<400){
   const before=match.replayProgress;
   sim.tick();
   assert.equal(match.replayProgress,before+1);
   count++;
 }
 assert.equal(match.finished,true,'El historial debe alcanzar la jugada del nexo');
 assert.equal(match.replayProgress,timeline.length-1);
 assert.equal(world.matchReports.length,1);
 assert.equal(world.matchReports[0].win,match.winner===world.userClub);
 assert.equal(count,timeline.length-1);
});

test('avanzar, retroceder, terminar y revisar no alteran el resultado ni premios únicos',()=>{
 const {sim,core,world,fixture}=setup();
 world.live=sim.simulateMatch(fixture);
 const match=world.live;
 const before=JSON.stringify({events:match.events,frames:match.frames,seed:match.broadcast.seed});
 sim.tick();sim.tick();
 assert.equal(match.replayCursor,2);
 assert.equal(sim.seekReplay(0),true);
 assert.equal(match.replayCursor,0);
 sim.tick();
 assert.equal(match.replayCursor,1);
 sim.liveControl('instant');
 assert.equal(match.finished,true);
 assert.equal(match.replayProgress,core.MatchReplay.timeline(match).length-1);
 assert.equal(JSON.stringify({events:match.events,frames:match.frames,seed:match.broadcast.seed}),before);
 assert.equal(world.matchReports.length,1);
 const cash=sim.currentClub().cash;
 sim.seekReplay(0);sim.tick();
 assert.equal(world.matchReports.length,1);
 assert.equal(sim.currentClub().cash,cash);
 sim.finishMatch();
 assert.equal(sim.currentClub().cash,cash);
});

test('partidas v2 anteriores sin datos de retransmisión siguen funcionando',()=>{
 const {sim,core,world,fixture}=setup();
 const match=sim.simulateMatch(fixture);
 delete match.broadcast;
 delete match.visibleCount;
 world.live=match;match.running=false;
 const raw=JSON.stringify(world);
 const loaded=core.parseWorld(raw);
 assert.equal(loaded.v,2);
 assert.equal(JSON.stringify(loaded),raw);
 assert.equal(core.broadcastFeed(match).length,match.events.length);
 assert.equal(core.feedCountAt(match,match.frames.length-1),match.events.length);
 sim.liveControl('instant');
 assert.equal(match.finished,true);
});
