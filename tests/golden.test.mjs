import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: balance Alpha 0.7.10 reproducible y contabilidad estable', () => {
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
  // Alpha 0.7.10 changes strategically earned Dragons, contests and crossmap pressure; this sports hash changes intentionally.
  // Alpha 0.7.9 selects intentional wounded-only shopping recalls, while XP and purchases affect sport.
  // Alpha 0.7.9 changes match XP, wallet and purchased gear. Sporting hashes
  // change deliberately, while club economy and RNG world hashes stay fixed.
  // The financial report fingerprint remains unchanged. World RNG differs
  // intentionally because each match now consumes one global seed,
  // decoupling sporting decisions from future world economics.
  const matchHash=hash(legacyMatch),worldAfterMatch=hash(world);
  const report=sim.applyMonth();
  const reportHash=hash(report),worldAfterMonth=hash(world);
  assert.equal(matchHash, 'a9660232d72ef4411d8a9c949073215a0a7e8fc7e6e260f174074e9c6869c762');
  assert.equal(worldAfterMatch, '342aa15055a9fab9e597749e13d099630f73351acb244b4d5c4380068b36caf1');
  assert.equal(reportHash, '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(worldAfterMonth, 'aaa0c74e7c2d45ecf8a1fdc5bfc0016d782b40d546e8b8225f67dcc869d19244');
});
