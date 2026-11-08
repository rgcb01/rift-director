import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: balance Alpha 0.7.8 reproducible y contabilidad estable', () => {
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
  // Updated sports fingerprint for Alpha 0.7.8: splitpush, counter-rotations and
  // physically earned solo towers. Original world and finance snapshots unchanged.
  // World RNG and financial fingerprints remain identical to Alpha 0.7.6.
  const matchHash=hash(legacyMatch),worldAfterMatch=hash(world);
  const report=sim.applyMonth();
  const reportHash=hash(report),worldAfterMonth=hash(world);
  assert.equal(matchHash, '36f628978f5591f1c1600c52607c77b13ac3b9c3e9dd26a4b589fed0861903ca');
  assert.equal(worldAfterMatch, 'f7205d60b2892ae542131eeda06b944a1432573adf3b8d53760d6f0a70cfe53d');
  assert.equal(reportHash, '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(worldAfterMonth, '14c70950c833af2cbd130327f3642497eabfb222b37e46e85128a2a018ce4a65');
});
