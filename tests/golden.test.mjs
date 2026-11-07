import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: mismo mundo, partida y finanzas que Alpha 0.2', () => {
  const { sim } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'QA Esports');
  assert.equal(hash(world), 'b3fb6a59ae4ad7748ef4889deec8cc722902340da330beaf6868b557a9ee0330');
  const fixture = Object.values(world.fixtures).flat().find(f => f.a === world.userClub || f.b === world.userClub);
  const match = sim.simulateMatch(fixture);
  // The structured "facts" field is additive. Confirm the legacy event envelope
  // remains identical for the reference seed, unless a documented bugfix changes it.
  const legacyMatch = {...match, events:match.events.map(({facts,...event})=>event)};
  // Intentional M1.2 behavior fix diagnostic (one-time before updating the baseline).
  const diagnostic = {match:hash(legacyMatch), worldAfterMatch:hash(world)};
  const testReport = sim.applyMonth();
  diagnostic.report = hash(testReport);
  diagnostic.worldAfterMonth = hash(world);
  console.log('M1.2 actual golden fingerprints', JSON.stringify(diagnostic));
  assert.equal(hash(legacyMatch), 'bb59a991074616a93efe8898eb384593387cc6a8a607958636ecfc428e13bb3c');
  assert.equal(hash(world), '0ee3ee27809829f0da5d3ad375efd8689d9dd946f0486e887a4159d566a82d34');
  const report = sim.applyMonth();
  assert.equal(hash(report), '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(hash(world), '70973b273edaf9a3973effaa4a1b4ac5153d52600158407c995616f9c8bbb50a');
});
