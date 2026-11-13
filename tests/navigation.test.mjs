import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const bootMatch = () => {
  const context=boot({now:1731111111000});
  const world=context.sim.newGame('balanced','Movement QA');
  const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
  return {...context,world,fixture};
};
const json=v=>JSON.parse(JSON.stringify(v));

test('grafo conectado: una arista por minuto y fuentes conectadas a las bases',()=>{
  const {core}=bootMatch(),nav=core.Navigation;
  const graph=core.MiniGraph;
  for(const from of Object.keys(graph.nodes))for(const to of Object.keys(graph.nodes)){
    const route=nav.path(from,to);
    assert.equal(route[0],from);
    assert.equal(route.at(-1),to);
    for(let i=1;i<route.length;i++)assert.equal(nav.adjacent(route[i-1],route[i]),true);
  }
  assert.equal(nav.adjacent('blue_fountain','blue_nexus'),true);
  assert.equal(nav.adjacent('red_fountain','red_nexus'),true);
});

test('partida nueva arranca con diez profesionales en las líneas y junglas',()=>{
  const {sim,core,world,fixture}=bootMatch();
  const match=sim.simulateMatch(fixture),frame=match.frames[0];
  assert.equal(Object.keys(frame.navigation.before).length,10);
  assert.equal(Object.keys(frame.navigation.after).length,10);
  for(const id of [fixture.a,fixture.b]){
    const team=world.clubs.find(c=>c.id===id);
    const side=id===fixture.a?'blue':'red';
    for(const role of core.ROLES){
      const node=frame.navigation.after[team.lineup[role]].node;
      assert.equal(node,role==='JUN'?side+'_jungle_upper':side+'_'+
        (role==='ADC'||role==='SUP'?'bot':role.toLowerCase())+'_front');
    }
  }
});

test('250 seeds: movimiento causal y auditores deportivo/minimapa concuerdan',()=>{
  const {sim,core,world,fixture}=bootMatch();
  const num={gank:0,tower:0,dragon:0,baron:0,teamfight:0,nexus:0};
  let totalMinutes=0;
  for(let seed=1;seed<=250;seed++){
    world.rng=seed*38291;
    const match=sim.simulateMatch(fixture);
    if(!match.winner){
      const last=match.frames.at(-1);
      const names=Object.fromEntries(world.players.map(p=>[p.id,p.role]));
      const t=last.minute;
      console.log('NAV_STALL='+JSON.stringify({
       seed,t,winner:match.winner,nexus:last.siege?.hp,
       towers:last.towers,lanes:match.events.filter(e=>e.facts?.action==='tower')
        .map(e=>({m:e.minute,team:e.teamId,lane:e.facts.lane,stage:e.facts.stage})).slice(-12),
       recent:match.frames.filter(x=>x.minute>=t-12&&x.minute%2===0)
        .map(fr=>({t:fr.minute,plan:fr.siegeDecision,
         waves:Object.fromEntries(['TOP','MID','BOT'].map(l=>[l,fr.laneEconomy?.lanes?.[l]?.front])),
         attackers:Object.entries(fr.navigation?.before||{})
          .filter(([id,p])=>p.intent==='siege'||p.intent==='splitpush')
          .map(([id,p])=>({r:names[id],t:p.teamId,node:p.node,goal:p.goal}))}))
      }));
    }
    assert.ok(match.winner,'Seed '+seed+' sin ganador');
    assert.ok(match.frames.length<79);
    const report=core.Navigation.auditNavigation(match,world);
    assert.equal(report.length,0,'Navegación seed '+seed+': '+report.slice(0,8).join(' / '));
    const sport=core.auditMatch(match,world);
    assert.equal(sport.length,0,'Deporte seed '+seed+': '+sport.slice(0,5).join(' / '));
    const mini=core.auditMinimap(match,world);
    assert.equal(mini.length,0,'Minimapa seed '+seed+': '+mini.slice(0,4).join(' / '));
    const final=match.frames.at(-1);
    for(const e of match.events)if(num[e.facts?.action]!==undefined)num[e.facts.action]++;
    for(const f of match.frames){
      for(const [id,p] of Object.entries(f.navigation.after)){
        const onMap=f.minimap.players[id];
        assert.equal(onMap.node,p.node);
        assert.equal(onMap.alive,p.alive);
        assert.ok(core.MiniGraph.nodes[p.node]);
      }
    }
    totalMinutes+=final.minute;
  }
  assert.ok(totalMinutes/250>25);
  for(const type of ['tower','teamfight','nexus'])assert.ok(num[type]>0,type+' nunca ocurre');
  assert.equal(num.nexus,250);
  // Ganks, dragon and baron are probabilistic and may be rare when routes are risky.
});

test('torres y nexo requieren presencia de jugadores vivos (datos falsos rechazados)',()=>{
  const {sim,core,world,fixture}=bootMatch();
  let match,goal;
  for(let seed=1;seed<=20;seed++){
    world.rng=seed*19191;
    match=sim.simulateMatch(fixture);
    goal=match.events.find(e=>e.facts?.action==='tower');
    if(goal)break;
  }
  assert.ok(goal,'Ninguna torre para alterar');
  const forged=json(match),fake=forged.events.find(e=>e.facts?.action==='tower');
  const frame=forged.frames.find(f=>f.minute===fake.minute);
  frame.navigation.before[fake.facts.actorId].node='blue_fountain';
  assert.ok(core.Navigation.auditNavigation(forged,world).some(e=>/Torre|Teletransporte/.test(e)));
  const finale=json(match);
  const nexus=finale.events.find(e=>e.facts?.action==='nexus');
  assert.ok(nexus);
  finale.frames.at(-1).navigation.before[nexus.facts.actorId].node=
    nexus.teamId===fixture.a?'blue_fountain':'red_fountain';
  assert.ok(core.Navigation.auditNavigation(finale,world).length>0);
});

test('un asesinado reaparece en su fuente y no avanza mientras está muerto',()=>{
 const {sim,core,world,fixture}=bootMatch();
 let match;
 for(let seed=1;seed<=20;seed++){
  world.rng=seed*73;match=sim.simulateMatch(fixture);
  if(match.events.some(e=>['gank','teamfight'].includes(e.facts?.action)))break;
 }
 const death=match.events.find(e=>['gank','teamfight'].includes(e.facts?.action));
 assert.ok(death);
 const id=death.facts.victimIds[0];
 const team=world.players.find(p=>p.id===id).teamId;
 const fountain=(team===fixture.a?'blue':'red')+'_fountain';
 const frame=match.frames.find(f=>f.minute===death.minute);
 assert.equal(frame.navigation.after[id].alive,false);
 assert.equal(frame.navigation.after[id].node,fountain);
 const respawn=match.frames.find(f=>f.minute>=death.minute+4);
 assert.ok(respawn);
 assert.equal(respawn.navigation.after[id].alive,true);
});

test('revisar jugadas y terminar mantiene la navegación y la demo no cambia el guardado',()=>{
 const {sim,core,world,fixture,store}=bootMatch();
 const match=sim.simulateMatch(fixture);
 world.live=match;
 const before=JSON.stringify(match.frames.map(f=>f.navigation));
 sim.tick();sim.tick();
 const progress=match.replayProgress;
 assert.equal(progress,2);
 sim.seekReplay(0);
 assert.equal(match.replayProgress,progress);
 sim.liveControl('instant');
 assert.equal(JSON.stringify(match.frames.map(f=>f.navigation)),before);
 assert.equal(world.matchReports.length,1);
 const saved=JSON.stringify(world);sim.save();
 sim.startDemoMatch();
 assert.ok(sim.getState().live.frames[0].navigation);
 sim.liveControl('instant');sim.exitDemoMatch();
 assert.equal(JSON.stringify(world),saved);
 assert.equal(store.get(core.SAVE_KEY),saved);
});
