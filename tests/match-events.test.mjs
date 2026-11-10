import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const prepared = () => {
  const { sim, core } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'Caster QA');
  const fixture = Object.values(world.fixtures).flat().find(f => f.a === world.userClub || f.b === world.userClub);
  return { sim, core, world, fixture };
};

test('350 partidos: narración, objetivos, bajas, roles y score son coherentes', () => {
  const { sim, core, world, fixture } = prepared();
  const counts = { gank:0, tower:0, dragon:0, baron:0, teamfight:0, nexus:0, steal:0, pentakill:0 };
  for (let seed = 1; seed <= 350; seed++) {
    world.rng = seed * 37771;
    const match = sim.simulateMatch(fixture);
    const problems = core.auditMatch(match, world);
    if(!match.winner){
      const last=match.frames.at(-1),a=fixture.a,b=fixture.b;
      const opens=Object.fromEntries([a,b].map(id=>[id,last.towers[id]]));
      const recent=match.frames.slice(-15).filter(fr=>fr.minute%3===1)
       .map(fr=>{
        const agents=Object.values(fr.navigation.before);
        const at=(id,node)=>agents.filter(p=>p.teamId===id&&p.alive&&
         core.Navigation.nearby(p.node,node,1)).map(p=>p.role);
        const waves=Object.fromEntries(['TOP','MID','BOT'].map(l=>[l,
         core.LaneEconomy.pressureFor({
          teamIds:[a,b],lanes:fr.laneEconomy.lanes},a,l)]));
        return {t:fr.minute,hp:fr.siege.hp,waves,
         blueAttackers:at(a,'red_nexus'),redAttackers:at(b,'blue_nexus'),
         blueDefenders:at(a,'blue_nexus'),redDefenders:at(b,'red_nexus')};
       });
      console.log('NEXUS_STALL='+JSON.stringify({
       seed,ends:last.minute,health:last.siege.hp,
       towers:last.towers,lanes:match.events.filter(e=>e.facts?.action==='tower')
        .slice(-10).map(e=>({t:e.minute,team:e.teamId,lane:e.facts.lane,stage:e.facts.stage})),
       hits:match.events.filter(e=>['nexus','nexus_damage'].includes(e.facts?.action)).length,
       recent,opens}));
    }
    assert.equal(problems.length, 0, 'Seed '+seed+': '+problems.slice(0,8).join(' | '));
    for (const e of match.events) {
      if (e.facts?.action) counts[e.facts.action]++;
      if (e.facts?.stolen) counts.steal++;
      if (e.title.includes('PENTAKILL')) counts.pentakill++;
    }
    assert.ok(match.frames.at(-1).minute <= 76, 'El partido no terminó dentro del tiempo de seguridad');
  }
  for (const key of ['gank','tower','dragon','baron','teamfight','nexus','steal']) {
    assert.ok(counts[key] > 0, 'No se observó '+key);
  }
  assert.equal(counts.nexus, 350, 'Exactamente un nexo por partida');
});

test('detecta Smite en MID, víctimas duplicadas y narrativa falsa', () => {
  const { sim, core, world, fixture } = prepared();
  let foundBaron, foundKill, foundTower;
  for (let seed = 1; seed <= 120 && !(foundBaron && foundKill && foundTower); seed++) {
    world.rng = seed * 37771;
    const match=sim.simulateMatch(fixture);
    if(!foundBaron && match.events.some(e=>e.facts?.action==='baron'))foundBaron=match;
    if(!foundKill && match.events.some(e=>e.facts?.action==='teamfight'))foundKill=match;
    if(!foundTower && match.events.some(e=>e.facts?.action==='tower'))foundTower=match;
  }
  assert.ok(foundBaron && foundKill && foundTower);
  const forgedSmite=clone(foundBaron);
  const boss=forgedSmite.events.find(e=>e.facts?.action==='baron');
  boss.facts.stolen=true;boss.facts.smite=true;
  boss.facts.initiatorTeamId = boss.teamId===fixture.a?fixture.b:fixture.a;
  const mid=world.players.find(p=>p.teamId===boss.teamId && p.role==='MID' &&
    world.clubs.find(c=>c.id===boss.teamId).lineup.MID===p.id);
  boss.facts.actorId=mid.id;
  assert.match(core.auditMatch(forgedSmite,world).join(' '),/Smite|jungla/);

  const repeated=clone(foundKill);
  const fight=repeated.events.find(e=>e.facts?.action==='teamfight');
  fight.facts.victimIds.push(fight.facts.victimIds[0]);
  assert.match(core.auditMatch(repeated,world).join(' '),/repetidas/);

  const missing=clone(foundTower);
  delete missing.events.find(e=>e.facts?.action==='tower').facts;
  assert.match(core.auditMatch(missing,world).join(' '),/evidencia/);

  const falseWinner=clone(foundTower);
  falseWinner.winner = falseWinner.winner === fixture.a ? fixture.b : fixture.a;
  assert.ok(core.auditMatch(falseWinner,world).length > 0);
});

test('un mapa pausado conserva sus evidencias al exportar e importar v2', () => {
  const { sim, core, world, fixture } = prepared();
  world.rng = 453566;
  world.live = sim.simulateMatch(fixture);
  world.live.elapsed = Math.floor(world.live.frames.length / 2);
  world.live.running=false;
  const raw=JSON.stringify(world);
  const restored=core.parseWorld(raw);
  assert.equal(JSON.stringify(restored),raw);
  assert.equal(core.auditMatch(restored.live,restored).length,0);
  assert.equal(restored.live.elapsed,world.live.elapsed);
});
