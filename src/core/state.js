/* Rift Director: Alpha 0.2 world-state factory. Do not change v2 fields without a migration. */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  core.ROLES = Object.freeze(['TOP', 'JUN', 'MID', 'ADC', 'SUP']);
  core.createInitialState = (chosen = 'balanced', now = Date.now()) => ({
    v: 2, rng: ((now >>> 0) ^ 0x6a1d92eb) || 1, nextId: 0, usedNames: [],
    year: 2027, month: 1, clubs: [], players: [], userClub: null,
    fixtures: {}, otherFixtures: {}, standings: {}, otherStandings: {},
    news: [], history: [], season: 1, monthlyReports: [], matchReports: [],
    meta: 'balanced', style: 'balanced',
    plan: { scrims: 2, development: 1, rest: 1, content: 1, community: 1, scout: 1 },
    focus: null, offers: [], playoffs: [], playoffsSetup: false,
    live: null, over: false, leagueHype: 60,
    leagueName: 'Liga Aurora', otherName: 'Circuito Boreal',
    rumors: [], scoutLevel: 1, challenge: chosen,
  });
})(globalThis);
