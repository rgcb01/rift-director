import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
  const {sim,core,store}=boot({now:1731111111000});
  const world=sim.newGame('balanced','Narrative QA');
  const fixture=Object.values(world.fixtures).flat().find(f=>f.a===world.userClub||f.b===world.userClub);
  return {sim,core,store,world,fixture};
};

test('1× es legible: 5 segundos por paso, 5× equivale al repaso rápido',()=>{
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
  assert.deepEqual(core.auditBroadcast(match,world),[],'Narrative mismatched at seed '+seed);
  assert.deepEqual(core.auditMatch(match,world),[],'Sports mismatched at seed '+seed);
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

test('en 1× las novedades se revelan de una en una, sin cambiar el marcador final',()=>{
 const {sim,core,world,fixture}=setup();
 world.live=sim.simulateMatch(fixture);
 const match=world.live;
 match.speed=1;match.visibleCount=core.feedCountAt(match,0);
 let last=match.visibleCount,count=0,withMultiple=false;
 for(let i=0;i<400&&!match.finished;i++){
  sim.tick();
  const now=match.visibleCount;
  assert.ok(now>=last&&now-last<=1,'La retransmisión lenta saltó más de una novedad');
  if(match.elapsed>0){
   const prior=core.feedCountAt(match,match.elapsed-1),end=core.feedCountAt(match,match.elapsed);
   if(end-prior>1 && now<end)withMultiple=true;
  }
  last=now;count++;
 }
 assert.equal(match.finished,true,'Partido sin terminar en pasos de 1×');
 assert.ok(withMultiple,'No apareció un minuto con varias novedades');
 assert.equal(match.visibleCount,core.broadcastFeed(match).length);
 assert.equal(world.matchReports.length,1);
 assert.equal(world.matchReports[0].win,match.winner===world.userClub);
 assert.ok(count>=match.frames.length);
});

test('5×, pausa e instantáneo conservan todas las jugadas y premios únicos',()=>{
 const {sim,core,world,fixture,store}=setup();
 world.live=sim.simulateMatch(fixture);
 const match=world.live;
 match.visibleCount=core.feedCountAt(match,0);
 const before=JSON.stringify({events:match.events,frames:match.frames,seed:match.broadcast.seed});
 sim.liveControl('speed-5');
 assert.equal(match.speed,5);
 sim.tick();sim.tick();
 const progress=match.elapsed;
 sim.liveControl('pause');
 assert.equal(match.running,false);
 sim.tick();
 assert.equal(match.elapsed,progress,'El mapa avanzó estando pausado');
 sim.liveControl('resume');
 sim.liveControl('instant');
 assert.equal(match.finished,true);
 assert.equal(match.visibleCount,core.broadcastFeed(match).length);
 assert.equal(JSON.stringify({events:match.events,frames:match.frames,seed:match.broadcast.seed}),before);
 assert.equal(world.matchReports.length,1);
 const cash=sim.currentClub().cash;
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
