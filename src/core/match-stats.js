/* Rift Director — individual match statistics (M1.2).
 * One source of truth: structured match events; no RNG, DOM or world mutations.
 * Optional additive data in v2 saves; legacy matches have no per-player stats.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const FIELDS = ['kills','deaths','assists','pentakills','towers','dragons','barons'];
  const empty = () => ({ kills:0, deaths:0, assists:0, pentakills:0, towers:0, dragons:0, barons:0 });

  function createPlayerStats(teamPlayers) {
    const stats = {};
    for (const p of teamPlayers) {
      if (typeof p?.id !== 'string' || Object.prototype.hasOwnProperty.call(stats,p.id))
        throw new Error('Participantes duplicados o inválidos');
      stats[p.id] = empty();
    }
    return stats;
  }
  function clonePlayerStats(stats) {
    return Object.fromEntries(Object.entries(stats).map(([id, row]) => [id, {...row}]));
  }
  function applyPlayerEvent(stats, event) {
    const facts = event?.facts;
    if (!facts) return stats;
    const row = stats[facts.actorId];
    if (!row) throw new Error('Autor no forma parte de la partida: '+facts.actorId);
    if (facts.action === 'gank' || facts.action === 'teamfight') {
      if (!Array.isArray(facts.victimIds) || !facts.victimIds.length) throw new Error('Eliminaciones sin víctimas');
      const assistants = facts.assistIds || [];
      if (!Array.isArray(assistants) || new Set(assistants).size !== assistants.length ||
          assistants.includes(facts.actorId)) throw new Error('Asistentes duplicados o autor asistiendo su kill');
      for (const id of facts.victimIds) {
        if (!stats[id]) throw new Error('Víctima fuera de la partida: '+id);
        stats[id].deaths++;
        row.kills++;
        for (const helper of assistants) {
          if (!stats[helper]) throw new Error('Asistente fuera de la partida: '+helper);
          stats[helper].assists++;
        }
      }
      if (facts.action === 'teamfight' && facts.victimIds.length === 5) row.pentakills++;
    } else if (['tower','dragon','baron'].includes(facts.action)) {
      const participants = facts.participantIds || [facts.actorId];
      if (!Array.isArray(participants) || !participants.includes(facts.actorId) ||
          new Set(participants).size !== participants.length) throw new Error('Participantes inválidos');
      const field = {tower:'towers',dragon:'dragons',baron:'barons'}[facts.action];
      for (const id of participants) {
        if (!stats[id]) throw new Error('Participante no inscrito: '+id);
        stats[id][field]++;
      }
    }
    return stats;
  }
  function kda(stats) {
    if (!stats) return '—';
    const numerator = stats.kills + stats.assists;
    if (!stats.deaths) return numerator ? 'Perfecto' : '—';
    return (numerator / stats.deaths).toFixed(2);
  }
  function addBroadcastGame(player, stats) {
    if (!stats) return;
    const prior = player.broadcastStats;
    if (prior && (!Number.isSafeInteger(prior.games) || FIELDS.some(k => !Number.isSafeInteger(prior[k]))))
      throw new Error('Estadísticas acumuladas corruptas');
    const result = prior ? {...prior} : {games:0,...empty()};
    result.games++;
    for (const field of FIELDS) result[field] += stats[field];
    player.broadcastStats = result;
  }
  core.MATCH_STAT_FIELDS = Object.freeze(FIELDS);
  core.createPlayerStats = createPlayerStats;
  core.clonePlayerStats = clonePlayerStats;
  core.applyPlayerEvent = applyPlayerEvent;
  core.playerKda = kda;
  core.addBroadcastGame = addBroadcastGame;
})(globalThis);
