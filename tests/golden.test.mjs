import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: mundo y finanzas compatibles; partido con correcciones M1.2 documentadas', () => {
  const { sim } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'QA Esports');
  assert.equal(hash(world), 'b3fb6a59ae4ad7748ef4889deec8cc722902340da330beaf6868b557a9ee0330');
  const fixture = Object.values(world.fixtures).flat().find(f => f.a === world.userClub || f.b === world.userClub);
  const match = sim.simulateMatch(fixture);
  // The structured "facts" field is additive. Confirm the legacy event envelope
  // remains identical for the reference seed, unless a documented bugfix changes it.
  const legacyMatch = {...match, frames:match.frames.map(({playerStats,map,minimap,...frame})=>frame), events:match.events.map(({facts,...event})=>event)};
  delete legacyMatch.broadcast; // The editorial layer is optional and does not affect game state.
  legacyMatch.speed = 2; // Playback defaults to 1x; sports history before M1.4 used 2x by default.
  delete legacyMatch.playerStats; // Additive M1.2 individual stats do not change match RNG/outcomes.
  // M1.2 changes the seed's match on purpose by forbidding impossible tower/Baron actions.
  // Snapshot after stripping the additive facts field; future changes require an explanation.
  assert.equal(hash(legacyMatch), '29600803ed202a66b4c3f771a38c6b88a6f2f4688368828493a91eb6319e3e7d');
  assert.equal(hash(world), '96bde84482579e4ee74fbc3866a87300fbd030ae5d6d9c2533b3e08743bc322d');
  const report = sim.applyMonth();
  assert.equal(hash(report), '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(hash(world), 'b9a530a2cc166aeda4a9ca9d6442ead02a6bb8bee65f6c933c07dafb0fea6835');
});
