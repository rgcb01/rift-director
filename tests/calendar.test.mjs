import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

function allGames(months) {
  return Object.values(months).flat();
}
function completeMonth(sim, world) {
  for (const fixture of world.fixtures[world.month] || []) {
    if (!fixture.played) sim.quickSeasonGame(fixture);
  }
  if (world.month === 9 && world.playoffsSetup) {
    for (const fixture of world.playoffs.filter(f => f.phase === 'semi' && !f.played)) {
      sim.quickPlayoffGame(fixture);
    }
    sim.makeFinalAfterSemis(true);
    for (const fixture of world.playoffs.filter(f => !f.played)) {
      sim.quickPlayoffGame(fixture);
    }
  }
  if (world.crisis) sim.resolveCrisis('audit');
  const old = { year: world.year, month: world.month };
  sim.closeMonth();
  assert.notDeepEqual([world.year, world.month], [old.year, old.month], 'No se avanzó el mes');
}

test('calendario de 8, 9 y 10 equipos: todos se enfrentan dos veces', () => {
  const { core } = boot();
  for (const count of [8, 9, 10]) {
    const ids = Array.from({ length: count }, (_, i) => 'c' + i);
    const scheduled = core.generateFixtures(ids);
    assert.deepEqual(Object.keys(scheduled), Array.from({ length: 12 }, (_, i) => String(i + 1)));
    const games = allGames(scheduled);
    assert.equal(games.length, count * (count - 1));
    const groups = new Map(), perRound = new Map();
    for (const f of games) {
      assert.notEqual(f.a, f.b);
      assert.equal(f.played, false);
      const pair = [f.a, f.b].sort().join(':');
      groups.set(pair, (groups.get(pair) || 0) + 1);
      const members = perRound.get(f.round) || new Set();
      assert.ok(!members.has(f.a) && !members.has(f.b), 'El club juega dos veces en una ronda');
      members.add(f.a); members.add(f.b);
      perRound.set(f.round, members);
    }
    assert.equal(groups.size, count * (count - 1) / 2);
    assert.ok([...groups.values()].every(n => n === 2));
  }
});

test('el calendario pasa de diciembre a enero y preserva fechas válidas', () => {
  const { core } = boot();
  assert.deepEqual(JSON.parse(JSON.stringify(core.nextDate(2037, 12))), { year: 2038, month: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(core.nextDate(2037, 4))), { year: 2037, month: 5 });
  for (const month of [0, 13, NaN]) assert.throws(() => core.nextDate(2037, month), /Fecha inválida/);
});

test('el validador detecta cruces inválidos, contratos y transacciones corruptas', () => {
  const { sim, core } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'Integrity Esports');
  assert.equal(core.validateWorld(world).length, 0);
  const broken = [
    w => { w.fixtures[2][0].a = w.clubs.find(c => c.region === 'Boreal').id; },
    w => { w.fixtures[2][0].winner = 'nadie'; },
    w => { w.fixtures[2][1].a = w.fixtures[2][0].a; },
    w => { delete w.fixtures[3]; },
    w => { w.standings[w.userClub].points = -3; },
    w => { w.players[0].contract = -1; },
    w => { w.players[0].teamId = 'c-fantasma'; },
    w => { w.clubs[0].roster.push(w.clubs[1].roster[0]); },
    w => { w.players[0].age = '18'; },
  ];
  for (const [index, mutate] of broken.entries()) {
    const sample = JSON.parse(JSON.stringify(world));
    mutate(sample);
    assert.ok(core.validateWorld(sample).length > 0, 'Corrupción sin detectar ' + index);
  }
  const withReport = JSON.parse(JSON.stringify(world));
  withReport.monthlyReports.push({ income: 10, expenses: 1, net: 100, cashBefore: 100, cashAfter: 200 });
  assert.match(core.validateWorld(withReport).join(' '), /Reporte financiero/);
});

test('24 meses completos: calendario, finanzas y rosters válidos', () => {
  const { sim, core } = boot({ now: 1731111111000 });
  const world = sim.newGame('rich', 'Longrun Esports');
  sim.currentClub().cash = 30_000_000; // Test liquidity reserve, not normal gameplay balance.
  for (let i = 0; i < 24; i++) {
    const expected = core.nextDate(world.year, world.month);
    completeMonth(sim, world);
    assert.equal(world.year, expected.year);
    assert.equal(world.month, expected.month);
    assert.equal(world.monthlyReports.length, Math.min(i + 1, 30));
    const problems = core.validateWorld(world);
    assert.equal(problems.length, 0, 'Estado inválido tras ' + (i+1) + ' meses: '+problems.join(' | '));
    const serialized = JSON.stringify(world);
    assert.equal(JSON.stringify(core.parseWorld(serialized)), serialized);
  }
  assert.equal(world.year, 2029);
  assert.equal(world.month, 1);
});

test('partida avanzada con transmisión pausada: importar y terminar sin duplicar premios', () => {
  const { sim, core, store } = boot({ now: 1731111111000 });
  const world = sim.newGame('rich', 'Legacy Advanced Esports');
  sim.currentClub().cash = 9_000_000;
  for (let i = 0; i < 14; i++) completeMonth(sim, world);
  const fixture = world.fixtures[world.month].find(f => !f.played && (f.a === world.userClub || f.b === world.userClub));
  assert.ok(fixture, 'Debe existir una partida pendiente en el mes 15');
  world.live = sim.simulateMatch(fixture);
  world.live.elapsed = Math.floor(world.live.frames.length / 2);
  world.live.running = false;
  assert.equal(core.validateWorld(world).length, 0);
  const saved = JSON.stringify(world);
  sim.save();
  assert.equal(store.get(core.SAVE_KEY), saved);
  world.live.elapsed = 0;
  world.clubs[0].cash = 1;
  assert.equal(sim.load(), true);
  const restored = sim.getState();
  assert.equal(JSON.stringify(restored), saved);
  assert.ok(restored.live.elapsed > 0);
  assert.equal(restored.live.finished, false);
  sim.finishMatch();
  assert.equal(sim.getState().matchReports.length, 1);
  const completed = sim.getState().fixtures[sim.getState().month].find(f => f.a === fixture.a && f.b === fixture.b);
  assert.equal(completed.played, true);
  const firstCash = sim.currentClub().cash;
  sim.finishMatch();
  assert.equal(sim.currentClub().cash, firstCash);
  const problems = core.validateWorld(sim.getState());
  assert.equal(problems.length, 0, problems.join(' | '));
  assert.equal(sim.getState().matchReports.length, 1);
});
