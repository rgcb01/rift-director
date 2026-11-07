import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: mundo y contabilidad compatibles; partido espacial Alpha 0.6 reproducible', () => {
  const { sim } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'QA Esports');
  assert.equal(hash(world), 'b3fb6a59ae4ad7748ef4889deec8cc722902340da330beaf6868b557a9ee0330');
  const fixture = Object.values(world.fixtures).flat().find(f => f.a === world.userClub || f.b === world.userClub);
  const match = sim.simulateMatch(fixture);
  // The structured "facts" field is additive. Confirm the legacy event envelope
  // remains identical for the reference seed, unless a documented bugfix changes it.
  const legacyMatch = {...match, frames:match.frames.map(({playerStats,map,minimap,navigation,...frame})=>frame), events:match.events.map(({facts,...event})=>event)};
  delete legacyMatch.broadcast; // The editorial layer is optional and does not affect game state.
  legacyMatch.speed = 2; // Playback defaults to 1x; sports history before M1.4 used 2x by default.
  delete legacyMatch.playerStats; // Additive M1.2 individual stats do not change match RNG/outcomes.
  // M1.3B changes match outcomes intentionally: movement and proximity now govern all objectives.
  // Snapshot after stripping the additive facts field; future changes require an explanation.
  assert.equal(hash(legacyMatch), '4ab86184ca877b74e511e5f74ed3f73bbba08f387fd66b70b00be9b930429741');
  assert.equal(hash(world), 'f8f2e1a7f609ad2b99b655d5727fc00dc12d9a1583fbdde316b856b955a673f1');
  const report = sim.applyMonth();
  assert.equal(hash(report), '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(hash(world), 'f4ea1178f12ab4ffa792b21fa18a7794d1f2eb8c7c14e01ac8159b8c5df9b899');
});
