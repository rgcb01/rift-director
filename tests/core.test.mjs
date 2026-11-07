import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const legacyRandom = initial => {
  let x = initial | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return { rng: x | 0, value: (x >>> 0) / 4294967296 };
};

test('RNG conserva exactamente la secuencia de Alpha 0.2', () => {
  const { core } = boot();
  for (const seed of [1, 12783, -1, 0x6a1d92eb, 0x7fffffff, 0xffffffff]) {
    const s = { rng: seed };
    for (let i = 0; i < 150; i++) {
      const expected = legacyRandom(s.rng);
      const actual = core.nextRandom(s);
      assert.equal(actual, expected.value);
      assert.equal(s.rng, expected.rng);
    }
  }
});

test('factory v2 conserva campos, defaults y semilla inicial', () => {
  const { core } = boot();
  const timestamp = 1731111111000;
  const a = core.createInitialState('academy', timestamp);
  const b = core.createInitialState('academy', timestamp);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.v, 2);
  assert.equal(a.challenge, 'academy');
  assert.equal(a.rng, ((timestamp >>> 0) ^ 0x6a1d92eb) || 1);
  assert.equal(a.month, 1);
  assert.equal(a.year, 2027);
  assert.equal(a.plan.scrims, 2);
});

test('guardado v2: roundtrip conserva bytes y no migra campos', () => {
  const { sim, core, store } = boot({ now: 1731111111000 });
  const original = sim.newGame('balanced', 'Legacy Esports');
  original.month = 8;
  original.rng = -92817297;
  original.customLegacyField = { a: 17 };
  const json = JSON.stringify(original);
  const restored = core.parseWorld(json);
  assert.equal(JSON.stringify(restored), json);
  core.saveWorld({ setItem(k,v) { store.set(k,v); } }, restored);
  assert.equal(store.get(core.SAVE_KEY), json);
  assert.equal(core.loadWorld({ getItem(k) { return store.get(k); } }).customLegacyField.a, 17);
});

test('guardados corruptos se rechazan sin modificar datos locales', () => {
  const { sim, core, store } = boot();
  const original = sim.newGame('balanced', 'Safe Esports');
  sim.save();
  const key = core.SAVE_KEY;
  const saved = store.get(key);
  for (const edit of [
    w => { w.v = 999; },
    w => { w.userClub = 'missing'; },
    w => { w.month = 13; },
    w => { w.clubs[0].lineup.MID = w.clubs[0].lineup.TOP; },
    w => { w.players[0].role = 'SMITE KING'; },
    w => { w.players[0].wage = 'NaN'; },
    w => { w.clubs[0].roster.push(w.clubs[0].roster[0]); },
  ]) {
    const corrupted = JSON.parse(JSON.stringify(original));
    edit(corrupted);
    assert.throws(() => core.parseWorld(JSON.stringify(corrupted)), /Guardado inválido/);
    assert.equal(store.get(key), saved, 'Se alteró el guardado local con un import inválido');
  }
  assert.throws(() => core.parseWorld('no es JSON'), e => e.name === 'SyntaxError');
  assert.equal(core.loadWorld({ getItem: () => null }), null);
});

test('registro de equipos y roles válido tras un avance anual', () => {
  const { sim, core } = boot();
  const world = sim.newGame('balanced', 'QA Esports');
  for (let i = 0; i < 11; i++) {
    sim.applyMonth();
    sim.simulateWorld();
    assert.equal(core.validateWorld(world).length, 0, 'Invalid world after month ' + (i + 1));
  }
  sim.nextYear();
  assert.equal(world.year, 2028);
  assert.equal(world.month, 1);
  assert.equal(core.validateWorld(world).length, 0);
});
