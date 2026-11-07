import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import vm from 'node:vm';

const file = fileURLToPath(new URL('../game.js', import.meta.url));
const source = readFileSync(file, 'utf8');

// Puente temporal SOLO para testing. No se añade ninguna API global al juego distribuido.
const exposed = source.replace(/\}\)\(\);\s*$/, `globalThis.__riftSmoke = {
  newGame, simulateMatch, teamPlayers, currentClub,
  save, load, applyMonth, getState: () => s
};})();`);
assert.notEqual(exposed, source, 'No se encontró el cierre esperado de game.js; actualizar harness.');

function boot() {
  const store = new Map();
  const app = { innerHTML: '' };
  const env = {
    document: {
      addEventListener() {},
      getElementById() { return app; },
    },
    localStorage: {
      getItem(k) { return store.get(k) ?? null; },
      setItem(k, v) { store.set(k, v); },
      removeItem(k) { store.delete(k); },
    },
    Date, console, setInterval, clearInterval, setTimeout, clearTimeout,
  };
  vm.runInNewContext(exposed, env, { timeout: 10000 });
  return env.__riftSmoke;
}

test('universo inicial: equipos, roles y calendario válidos', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  assert.equal(s.v, 2);
  assert.equal(s.clubs.length, 16);
  assert.equal(s.year, 2027);
  assert.equal(s.month, 1);
  assert.equal(Object.keys(s.fixtures).length, 12);
  for (const club of s.clubs) {
    const players = sim.teamPlayers(club);
    assert.equal(players.length, 5, `Plantilla incompleta: ${club.name}`);
    assert.equal(new Set(players.map(p => p.role)).size, 5, `Roles repetidos: ${club.name}`);
  }
});

test('un partido termina con ganador, nexo y eventos cronológicos', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  const fixture = Object.values(s.fixtures).flat().find(f => f.a === s.userClub || f.b === s.userClub);
  assert.ok(fixture, 'No se encontró un partido del usuario');
  for (let seed = 1; seed <= 20; seed++) {
    s.rng = seed * 1777;
    const match = sim.simulateMatch(fixture);
    assert.ok([fixture.a, fixture.b].includes(match.winner), 'Ganador inválido');
    assert.ok(match.frames.length > 0, 'Sin snapshots de partido');
    assert.ok(match.events.length > 0, 'Sin narración');
    assert.match(match.events.at(-1).title, /NEXO/, 'No se narró la destrucción del nexo');
    for (let i = 1; i < match.events.length; i++) {
      assert.ok(match.events[i].minute >= match.events[i - 1].minute, 'Evento fuera de orden');
    }
  }
});

test('misma partida y semilla producen el mismo partido', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  const fixture = Object.values(s.fixtures).flat()[0];
  s.rng = 12783;
  const a = sim.simulateMatch(fixture);
  s.rng = 12783;
  const b = sim.simulateMatch(fixture);
  assert.equal(JSON.stringify({winner:a.winner,events:a.events,frames:a.frames}),
               JSON.stringify({winner:b.winner,events:b.events,frames:b.frames}));
});

test('cierre mensual: ingresos - gastos = variación de caja', () => {
  const sim = boot();
  sim.newGame('balanced', 'QA Esports');
  const cash = sim.currentClub().cash;
  const report = sim.applyMonth();
  assert.equal(report.cashBefore, cash);
  assert.equal(report.income - report.expenses, report.net);
  assert.equal(report.cashAfter, cash + report.net);
});

test('insolvencia: caja se trunca en cero y partida termina', () => {
  const sim = boot();
  sim.newGame('balanced', 'QA Esports');
  sim.currentClub().cash = 1;
  sim.currentClub().staff = 10000;
  sim.applyMonth();
  assert.equal(sim.currentClub().cash, 0);
  assert.equal(sim.getState().over, true);
});

test('persistencia local: save/load restaura mes y caja', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  s.month = 6;
  s.rng = 87654;
  const cash = sim.currentClub().cash;
  sim.save();
  s.month = 9;
  sim.currentClub().cash = -3;
  assert.equal(sim.load(), true);
  assert.equal(sim.getState().month, 6);
  assert.equal(sim.getState().rng, 87654);
  assert.equal(sim.currentClub().cash, cash);
});
