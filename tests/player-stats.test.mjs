import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

function setup() {
  const {sim,core,store} = boot({now:1731111111000});
  const world=sim.newGame('balanced','Scorekeeper QA');
  const fixture=Object.values(world.fixtures).flat().find(f=>f.a===world.userClub||f.b===world.userClub);
  return {sim,core,store,world,fixture};
}
const teammates=(world,teamId)=>world.clubs.find(c=>c.id===teamId).lineup;
const sum=(rows,key,ids)=>ids.reduce((n,id)=>n+rows[id][key],0);

test('300 seeds: K/D/A, participaciones y pentas concuerdan con eventos en cada minuto',()=>{
  const {sim,core,world,fixture}=setup();
  let assisted=0, objectives=0, pentakills=0;
  for(let seed=1;seed<=300;seed++){
    world.rng=seed*68291;
    const match=sim.simulateMatch(fixture);
    const errors=core.auditMatch(match,world);
    assert.equal(errors.length,0,'Seed '+seed+': '+errors.slice(0,4).join(' | '));
    const idsA=Object.values(teammates(world,fixture.a));
    const idsB=Object.values(teammates(world,fixture.b));
    const finish=match.playerStats, last=match.frames.at(-1);
    assert.deepEqual(JSON.parse(JSON.stringify(last.playerStats)),JSON.parse(JSON.stringify(finish)));
    assert.equal(sum(finish,'kills',idsA),last.kills[fixture.a]);
    assert.equal(sum(finish,'kills',idsB),last.kills[fixture.b]);
    assert.equal(sum(finish,'deaths',idsA),last.kills[fixture.b]);
    assert.equal(sum(finish,'deaths',idsB),last.kills[fixture.a]);
    for(const e of match.events){
      if(e.facts?.assistIds?.length)assisted++;
      if(e.facts?.participantIds?.length)objectives++;
      if(e.title.includes('PENTAKILL')) {
        pentakills++;
        assert.equal(e.facts.action,'teamfight');
        assert.equal(e.facts.victimIds.length,5);
        assert.equal(e.facts.multiKill,5);
      }
    }
    const totalPentas=Object.values(finish).reduce((n,p)=>n+p.pentakills,0);
    assert.equal(totalPentas,match.events.filter(e=>e.title.includes('PENTAKILL')).length);
  }
  assert.ok(assisted>0 && objectives>0, 'Faltan asistencias y objetivos');
  // Spatial play makes pentakills much rarer; never manufacture a kill to meet a quota.
});

test('auditor rechaza asistentes muertos, KDA inventados y participantes ajenos',()=>{
  const {sim,core,world,fixture}=setup();
  let match,kill,objective;
  for(let seed=1;seed<=120;seed++){
    world.rng=seed*32519;
    const candidate=sim.simulateMatch(fixture);
    const fight=candidate.events.find(e=>e.facts?.action==='teamfight');
    const goal=candidate.events.find(e=>['tower','dragon','baron'].includes(e.facts?.action)&&e.facts?.participantIds?.length);
    if(fight&&goal){match=candidate;kill=fight;objective=goal;break}
  }
  const clone=x=>JSON.parse(JSON.stringify(x));
  assert.ok(kill&&objective,'Necesitamos una seed real con kill y objetivo, sin inventarlas');
  const fakeAssist=clone(match);
  const fakeKill=fakeAssist.events.find(e=>e.facts?.action==='teamfight');
  fakeKill.facts.assistIds=[fakeKill.facts.victimIds[0]];
  assert.match(core.auditMatch(fakeAssist,world).join(' '),/Asistencia falsa|jugador muerto/);
  const fakeStat=clone(match);
  const first=Object.keys(fakeStat.frames.at(-1).playerStats)[0];
  fakeStat.frames.at(-1).playerStats[first].kills+=7;
  assert.match(core.auditMatch(fakeStat,world).join(' '),/KDA\/objetivo individual/);
  const fakeObject=clone(match);
  const e=fakeObject.events.find(x=>['tower','dragon','baron'].includes(x.facts?.action)&&x.facts?.participantIds?.length);
  const rival=e.teamId===fixture.a?fixture.b:fixture.a;
  e.facts.participantIds.push(Object.values(teammates(world,rival))[0]);
  assert.match(core.auditMatch(fakeObject,world).join(' '),/Participación falsa|Atacante inválido en escaramuza/);
});

test('las cartas sólo acumulan mapas narrados, una vez por partido',()=>{
  const {sim,core,world,fixture}=setup();
  const match=sim.simulateMatch(fixture);
  world.live=match;
  const c=world.clubs.find(x=>x.id===world.userClub);
  const id=c.lineup.ADC;
  assert.equal(world.players.find(p=>p.id===id).broadcastStats,undefined);
  const expected=match.playerStats[id];
  sim.finishMatch();
  const p=world.players.find(p=>p.id===id);
  assert.equal(p.broadcastStats.games,1);
  for(const key of core.MATCH_STAT_FIELDS)assert.equal(p.broadcastStats[key],expected[key],key);
  const recorded=JSON.stringify(p.broadcastStats);
  sim.finishMatch();
  assert.equal(JSON.stringify(p.broadcastStats),recorded);
  assert.deepEqual(JSON.parse(JSON.stringify(world.matchReports[0].playerStats)),JSON.parse(JSON.stringify(match.playerStats)));
  assert.equal(core.validateWorld(world).length,0);
});

test('partida antigua sin KDA puede terminarse y guarda el formato v2',()=>{
  const {sim,core,world,fixture}=setup();
  const old=sim.simulateMatch(fixture);
  delete old.playerStats;
  for(const frame of old.frames)delete frame.playerStats;
  world.live=old;
  world.live.running=false;
  const raw=JSON.stringify(world);
  const restored=core.parseWorld(raw);
  assert.equal(restored.v,2);
  assert.equal(JSON.stringify(restored),raw);
  sim.finishMatch();
  assert.ok(!world.matchReports[0].playerStats);
  assert.ok(world.players.every(p=>!p.broadcastStats));
});

test('KDA muestra Perfecto cuando no hay muertes y nunca divide por cero',()=>{
  const {core}=setup();
  assert.equal(core.playerKda({kills:0,deaths:0,assists:0}),'—');
  assert.equal(core.playerKda({kills:5,deaths:0,assists:9}),'Perfecto');
  assert.equal(core.playerKda({kills:6,deaths:2,assists:3}),'4.50');
});
