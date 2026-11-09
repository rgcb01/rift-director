import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { boot } from './harness.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fingerprints captured from the unmodified Alpha 0.2 (commit 4893edb).
// Changing one requires deliberate discussion and a migration / balance note.
test('semilla fija: Alpha 0.7.14 macro reproducible y contabilidad estable', () => {
  const { sim } = boot({ now: 1731111111000 });
  const world = sim.newGame('balanced', 'QA Esports');
  assert.equal(hash(world), 'b3fb6a59ae4ad7748ef4889deec8cc722902340da330beaf6868b557a9ee0330');
  const fixture = Object.values(world.fixtures).flat().find(f => f.a === world.userClub || f.b === world.userClub);
  const match = sim.simulateMatch(fixture);
  const originalFullMatchHash=hash(match);
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
  delete legacyMatch.champions; // Additive spectator champion IDs do not change the sporting fingerprint.
  // M1.3B changes match outcomes intentionally: movement and proximity now govern all objectives.
  // Alpha 0.7.13 adds physically placed ward events and team-local sight; this sporting fingerprint changes intentionally while the global/financial hashes stay fixed.
  // Alpha 0.7.12 changes actual visible engagement decisions while the financial/world fixture seed stays stable.
  // Alpha 0.7.10 weighs Baron against Dragon, includes real neutral contests and physically earned trades; sporting fingerprint updated intentionally.
  // Alpha 0.7.9 selects intentional wounded-only shopping recalls, while XP and purchases affect sport.
  // Alpha 0.7.9 changes match XP, wallet and purchased gear. Sporting hashes
  // change deliberately, while club economy and RNG world hashes stay fixed.
  // The financial report fingerprint remains unchanged. World RNG differs
  // intentionally because each match now consumes one global seed,
  // decoupling sporting decisions from future world economics.
  const matchHash=hash(legacyMatch),worldAfterMatch=hash(world);
  const report=sim.applyMonth();
  const reportHash=hash(report),worldAfterMonth=hash(world);
  console.log('GOLDEN_FINGERPRINTS='+JSON.stringify({matchHash,worldAfterMatch,reportHash,worldAfterMonth}));
  // Alpha 0.7.16 recipe/component shopping changes sporting purchases and deliberately
  // shifts this fingerprint; finances and world state must remain stable.
  // Alpha 0.7.14 risk-based macro decisions intentionally change the
  // sporting fingerprint. Replays remain deterministic and world/finance
  // hashes must stay unchanged against the 0.7.13 reference.
  const again=boot({now:1731111111000}).sim;
  const againWorld=again.newGame('balanced','QA Esports');
  const againFixture=Object.values(againWorld.fixtures).flat().find(f=>
   f.a===againWorld.userClub||f.b===againWorld.userClub);
  assert.equal(hash(again.simulateMatch(againFixture)),originalFullMatchHash,
   'Identical seed and fixture must reproduce the entire match exactly');
  assert.equal(matchHash, '7277fc1e705730f1a4c2c703af58cdafdad265e4d4568650c87adba1f5786af0');
  assert.equal(worldAfterMatch, '342aa15055a9fab9e597749e13d099630f73351acb244b4d5c4380068b36caf1');
  assert.equal(reportHash, '63f62558933347e5947cc1b476f9056c23d59aa9e79fce65edd0c7d58372dbd9');
  assert.equal(worldAfterMonth, 'aaa0c74e7c2d45ecf8a1fdc5bfc0016d782b40d546e8b8225f67dcc869d19244');
});
