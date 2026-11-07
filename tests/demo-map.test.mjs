import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const make = () => {
  const context=boot({now:1731111111000});
  const {sim,core}=context;
  const world=sim.newGame('balanced','Tactics QA');
  const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
  return {...context,world,fixture};
};

test('modo exhibición sin partida: crea mapa y no escribe localStorage',()=>{
  const {sim,core,store}=boot({now:1731111111000});
  assert.equal(sim.getState(),null);
  assert.equal(store.size,0);
  sim.startDemoMatch();
  assert.equal(sim.getDemoActive(),true);
  const demo=sim.getState();
  assert.ok(demo.live?.frames.length>10);
  assert.equal(sim.getView(),'match');
  assert.equal(core.auditMatch(demo.live,demo).length,0);
  assert.equal(store.size,0);
  sim.liveControl('instant');
  assert.equal(demo.live.finished,true);
  assert.equal(demo.live.committed,true);
  assert.equal(demo.matchReports.length,0,'Una demo no debe registrar resultados');
  assert.equal(demo.history.filter(h=>h.kind==='premio').length,0);
  sim.replayDemoMatch();
  assert.equal(demo.live.finished,false);
  assert.equal(store.size,0);
  sim.exitDemoMatch();
  assert.equal(sim.getDemoActive(),false);
  assert.equal(sim.getState(),null);
  assert.equal(store.size,0);
});

test('exhibición con partida existente: al salir restaura estado y JSON idénticos',()=>{
  const {sim,core,store}=make();
  const original=sim.getState();
  original.month=4;
  sim.save();
  const json=store.get(core.SAVE_KEY),snapshot=JSON.stringify(original);
  const currentView=sim.getView();
  sim.startDemoMatch();
  assert.notEqual(sim.getState(),original);
  assert.equal(store.get(core.SAVE_KEY),json);
  sim.liveControl('speed-1');
  sim.liveControl('pause');
  sim.liveControl('resume');
  sim.liveControl('instant');
  sim.replayDemoMatch();
  sim.liveControl('instant');
  sim.exitDemoMatch();
  assert.equal(sim.getState(),original);
  assert.equal(sim.getView(),currentView);
  assert.equal(JSON.stringify(original),snapshot);
  assert.equal(store.get(core.SAVE_KEY),json);
  assert.equal(sim.getDemoActive(),false);
});

test('exhibición no cambia un partido oficial pausado',()=>{
  const {sim,core,store,world,fixture}=make();
  world.live=sim.simulateMatch(fixture);
  world.live.elapsed=7;
  world.live.running=false;
  sim.save();
  const before=JSON.stringify(world);
  sim.startDemoMatch();
  sim.liveControl('instant');
  sim.exitDemoMatch();
  assert.equal(JSON.stringify(world),before);
  assert.equal(sim.getState().live.elapsed,7);
  assert.equal(store.get(core.SAVE_KEY),before);
});

test('visión y presión son deterministas, válidas y no consumen RNG',()=>{
  const {sim,core,world,fixture}=make();
  const rng=world.rng;
  const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
  const teams=Object.fromEntries(clubs.map(c=>[c.id,sim.teamPlayers(c)]));
  const data={clubs,teams,gold:{[fixture.a]:15000,[fixture.b]:14500},lanes:{
    [fixture.a]:{TOP:0,MID:1,BOT:0},[fixture.b]:{TOP:1,MID:0,BOT:0}
  },minute:15,userClub:world.userClub,style:'objectives'};
  const a=core.computeMapState(data), b=core.computeMapState(data);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(world.rng,rng);
  for(const lane of core.LANES){
    assert.equal(a.lanes[lane].pressure[fixture.a]+a.lanes[lane].pressure[fixture.b],100);
    for(const id of [fixture.a,fixture.b]){
      assert.ok(a.lanes[lane].vision[id]>=5 && a.lanes[lane].vision[id]<=99);
      assert.ok(a.lanes[lane].pressure[id]>=5 && a.lanes[lane].pressure[id]<=95);
    }
  }
  const cloned=core.cloneMapState(a);
  cloned.lanes.MID.pressure[fixture.a]=1;
  assert.notEqual(a.lanes.MID.pressure[fixture.a],1);
  assert.equal(world.rng,rng);
});

test('mejor visión defensiva reduce la probabilidad de un gank',()=>{
  const {core}=make();
  const attacker='a',defender='b';
  const ctx={pressure:{a:56,b:44},vision:{a:60,b:20}};
  const favorable=core.gankChance(.45,ctx,attacker,defender);
  ctx.vision.b=95;
  const defended=core.gankChance(.45,ctx,attacker,defender);
  assert.ok(favorable>defended);
  assert.ok(defended>=.15&&favorable<=.81);
  assert.equal(core.gankRoute('MID',ctx,'a','b'),'flanco');
});

test('150 mapas: ganks sólo narran rutas y valores presentes en sus frames',()=>{
  const {sim,core,world,fixture}=make();
  let ganks=0;
  for(let seed=1;seed<=150;seed++){
    world.rng=seed*17891;
    const match=sim.simulateMatch(fixture);
    const errs=core.auditMatch(match,world);
    assert.equal(errs.length,0,'Seed '+seed+': '+errs.slice(0,6).join('; '));
    for(const ev of match.events.filter(e=>e.facts?.action==='gank')){
      ganks++;
      const frame=match.frames.find(f=>f.minute===ev.minute);
      assert.ok(frame?.map?.lanes[ev.facts.lane]);
      assert.equal(ev.facts.attackerPressure,frame.map.lanes[ev.facts.lane].pressure[ev.teamId]);
      const defending=ev.teamId===fixture.a?fixture.b:fixture.a;
      assert.equal(ev.facts.defenderVision,frame.map.lanes[ev.facts.lane].vision[defending]);
    }
  }
  assert.ok(ganks>0,'Se esperaban ganks que auditar');
  const match=sim.simulateMatch(fixture);
  const ev=match.events.find(e=>e.facts?.action==='gank');
  if(ev){
    const fake=JSON.parse(JSON.stringify(match));
    fake.events.find(e=>e.facts?.action==='gank').facts.defenderVision=400;
    assert.match(core.auditMatch(fake,world).join(' '),/ruta, presión o visión/);
  }
});
