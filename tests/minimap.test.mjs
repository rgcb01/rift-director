import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const setup=()=>{
  const {sim,core,minimapUI,store}=boot({now:1731111111000});
  const world=sim.newGame('balanced','Minimap QA');
  const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
  return {sim,core,minimapUI,store,world,fixture};
};
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));

test('grafo original: tres carriles, torres y nodos dentro del SVG',()=>{
  const {core}=setup(),graph=core.MiniGraph;
  assert.ok(Object.keys(graph.nodes).length>=30);
  assert.ok(graph.links.length>=30);
  for(const lane of ['TOP','MID','BOT']){
    same(graph.pointOnLane(lane,0),{x:42,y:298});
    same(graph.pointOnLane(lane,1),{x:298,y:42});
    for(const side of ['blue','red'])for(const stage of [1,2,3]){
      const p=graph.towerPoint(side,lane,stage);
      assert.ok(p.x>=10&&p.x<=330&&p.y>=10&&p.y<=330);
    }
  }
});

test('minuto 0: diez caras, cinco roles por equipo y nueve torres en pie cada uno',()=>{
  const {sim,core,world,fixture}=setup();
  const match=sim.simulateMatch(fixture),mini=match.frames[0].minimap;
  assert.equal(mini.minute,0);
  assert.equal(Object.keys(mini.players).length,10);
  for(const teamId of [fixture.a,fixture.b]){
    const side=teamId===fixture.a?'blue':'red';
    const roster=Object.values(world.clubs.find(c=>c.id===teamId).lineup);
    assert.equal(roster.length,5);
    assert.equal(new Set(roster.map(id=>mini.players[id].role)).size,5);
    assert.ok(roster.every(id=>mini.players[id].alive));
    assert.ok(roster.every(id=>mini.players[id].x>=12&&mini.players[id].x<=328));
    for(const lane of ['TOP','MID','BOT'])assert.equal(mini.structures[teamId][lane],0);
    const j=roster.find(id=>mini.players[id].role==='JUN');
    assert.ok(mini.players[j].node.includes('jungle'));
    const top=roster.find(id=>mini.players[id].role==='TOP');
    assert.equal(mini.players[top].node,side+'_top_front');
  }
  assert.equal(core.auditMinimap(match,world).length,0);
});

test('180 seeds: torres, muertos, territorio y asedio se reconstruyen de eventos',()=>{
  const {sim,core,world,fixture}=setup();
  let destruction=0,deadFrames=0,allAliveSieges=0;
  for(let seed=1;seed<=180;seed++){
    world.rng=seed*34159;
    const match=sim.simulateMatch(fixture);
    const problems=core.auditMinimap(match,world);
    assert.equal(problems.length,0,'Seed '+seed+' : '+problems.slice(0,3).join(' | '));
    assert.equal(core.auditMatch(match,world).length,0,'Match audit seed '+seed);
    const final=match.frames.at(-1);
    assert.equal(final.minimap.focus.action,'nexus');
    for(const f of match.frames){
      assert.equal(Object.keys(f.minimap.players).length,10);
      assert.ok(f.minimap.territory.TOP>=.05&&f.minimap.territory.TOP<=.95);
      const dead=Object.values(f.minimap.players).filter(p=>!p.alive);
      deadFrames+=dead.length;
      for(const p of dead){
        assert.equal(p.node,(p.teamId===fixture.a?'blue':'red')+'_fountain');
      }
      for(const teamId of [fixture.a,fixture.b]){
        const taken=Object.values(f.minimap.structures[teamId]).reduce((a,b)=>a+b,0);
        const scorer=teamId===fixture.a?fixture.b:fixture.a;
        assert.equal(taken,f.towers[scorer]);
      }
    }
    destruction+=final.towers[fixture.a]+final.towers[fixture.b];
    const winner=match.winner,target=winner===fixture.a?'red_nexus':'blue_nexus';
    const nexus=core.MiniGraph.pointAt(target);
    const winning=Object.values(final.minimap.players).filter(p=>p.teamId===winner&&p.alive);
    if(winning.length===5)allAliveSieges++;
    assert.ok(winning.length>=2);
    for(const p of winning){
      const distance=Math.hypot(p.x-nexus.x,p.y-nexus.y);
      assert.ok(distance<=70,'Ganador vivo no termina junto al nexo: '+distance);
    }
  }
  assert.ok(destruction>0);
  assert.ok(deadFrames>0);
  assert.ok(allAliveSieges>0);
});

test('SVG dibuja diez avatares, dieciocho torres y las bases sin fotografías',()=>{
  const {sim,minimapUI,world,fixture}=setup();
  const match=sim.simulateMatch(fixture);
  const start=minimapUI.render(match,match.frames[0],world);
  assert.match(start,/<svg /);
  assert.equal((start.match(/class="rift-mini-avatar/g)||[]).length,10);
  assert.equal((start.match(/class="rift-mini-tower/g)||[]).length,18);
  assert.equal((start.match(/class="rift-mini-nexus/g)||[]).length,2);
  assert.match(start,/data-minimap-minute="0"/);
  const final=match.frames.at(-1);
  const output=minimapUI.render(match,final,world,match.frames.at(-2));
  assert.match(output,/is-destroyed/);
  assert.match(output,/Asedio al nexo/);
  assert.ok(!output.includes('<img'));
});

test('minimapa no consume RNG y se puede regenerar exactamente',()=>{
  const {sim,core,world,fixture}=setup();
  const match=sim.simulateMatch(fixture),before=JSON.stringify(match),rng=world.rng;
  core.attachMinimap(match,world);
  assert.equal(JSON.stringify(match),before);
  assert.equal(world.rng,rng);
  const tampered=JSON.parse(before);
  tampered.frames[4].minimap.players[Object.keys(tampered.frames[4].minimap.players)[0]].x=1000;
  assert.ok(core.auditMinimap(tampered,world).length>0);
});

test('guardados v2 antiguos sin minimapa siguen mostrando el partido sin inventar movimiento',()=>{
  const {sim,core,minimapUI,world,fixture}=setup();
  const match=sim.simulateMatch(fixture);
  for(const frame of match.frames)delete frame.minimap;
  world.live=match;world.live.running=false;world.live.elapsed=5;
  const raw=JSON.stringify(world);
  assert.equal(JSON.stringify(core.parseWorld(raw)),raw);
  const fallback=minimapUI.render(match,match.frames[5],world);
  assert.match(fallback,/antes del minimapa/);
  sim.finishMatch();
  assert.equal(world.matchReports.length,1);
});

test('exhibición aislada muestra el SVG y conserva una partida guardada',()=>{
  const {sim,core,store}=boot({now:1731111111000});
  const original=sim.newGame('balanced','Old Club');
  const snapshot=JSON.stringify(original);sim.save();
  const saved=store.get(core.SAVE_KEY);
  sim.startDemoMatch();
  const demo=sim.getState();
  assert.ok(demo.live.frames[0].minimap);
  const screen=sim.renderMatch();
  assert.match(screen,/Minimapa táctico/);
  assert.match(screen,/rift-minimap/);
  sim.liveControl('instant');
  sim.exitDemoMatch();
  assert.equal(sim.getState(),original);
  assert.equal(JSON.stringify(original),snapshot);
  assert.equal(store.get(core.SAVE_KEY),saved);
});
