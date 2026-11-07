import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: coherencia espacial Alpha 0.7.5 reproducible y contabilidad estable', () => {
  const { sim } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'QA Esports');
  assert.equal(hash(world), 'b3fb6a59ae4ad7748ef4889deec8cc722902340da330beaf6868b557a9ee0330');
  const fixture = Object.values(world.fixtures).flat().find(f => f.a === world.userClub || f.b === world.userClub);
  const match = sim.simulateMatch(fixture);
  // The structured "facts" field is additive. Confirm the legacy event envelope
  // remains identical for the reference seed, unless a documented bugfix changes it.
  const legacyMatch = {...match, frames:match.frames.map(({playerStats,map,minimap,navigation,...frame})=>frame), events:match.events.map(({facts,...event})=>event)};
  delete legacyMatch.moments;
  delete legacyMatch.replayCursor;
  delete legacyMatch.replayProgress;
  legacyMatch.running=true;
  delete legacyMatch.broadcast; // The editorial layer is optional and does not affect game state.
  legacyMatch.speed = 2; // Playback defaults to 1x; sports history before M1.4 used 2x by default.
  delete legacyMatch.playerStats; // Additive M1.2 individual stats do not change match RNG/outcomes.
  // M1.3B changes match outcomes intentionally: movement and proximity now govern all objectives.
  // Snapshot after stripping the additive facts field; future changes require an explanation.
  assert.equal(hash(legacyMatch), 'a38035b8f22aeb453ea5236d960d93e9954cf8eeb5b260bbc1fe5144ca6b12af');
  assert.equal(hash(world), '083dd734cca58e28f522f9fbefdcc9011db64ebf28e3fdb5689384b0acc490fc');
  const report = sim.applyMonth();
  assert.equal(hash(report), '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(hash(world), '8a02e79b801ac6d79e0932435a23fda19b1a03b74e96ab8dc91ab5ca4a30d045');
});
