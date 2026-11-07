/* Rift Director — match-event audit. No DOM, RNG or changes to saved games.
 * Events from pre-M1.2 saves may lack facts; the audit is only required for new matches.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const roles = new Set(core.ROLES);
  const counters = ['kills', 'towers', 'dragons', 'barons'];
  const integer = n => Number.isSafeInteger(n) && n >= 0;

  function auditMatch(match, world, { allowLegacy = false } = {}) {
    const errors = [];
    const fail = (message) => errors.push(message);
    const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
    if (!isRecord(match) || !isRecord(match.fixture) || !Array.isArray(match.events) || !Array.isArray(match.frames)) {
      return ['Partido sin fixture, eventos o frames válidos.'];
    }
    const { a, b } = match.fixture;
    if (!a || !b || a === b || ![a,b].includes(match.winner)) fail('Ganador o equipos inválidos.');
    const clubs = new Map(world.clubs.map(c => [c.id, c]));
    const players = new Map(world.players.map(p => [p.id, p]));
    if (!clubs.has(a) || !clubs.has(b)) fail('Club del partido inexistente.');
    if (errors.length) return errors;
    const totals = Object.fromEntries(counters.map(k => [k, {[a]:0,[b]:0}]));
    const lanes = {[a]:{TOP:0,MID:0,BOT:0}, [b]:{TOP:0,MID:0,BOT:0}};
    const dead = new Map();
    let nextDragon = 5, nextBaron = 20, nextEvent = 0, previousMinute = -1;
    let nexusCount = 0, lastEventMinute = 0;

    function alive(p, t) { return p && (dead.get(p.id) ?? 0) <= t; }
    function actor(facts, event, minute) {
      const p = players.get(facts.actorId);
      if (!p || !roles.has(p.role) || p.teamId !== event.teamId) fail('Actor fuera del equipo o rol inválido: ' + facts.actorId);
      else if (!alive(p, minute)) fail('Un jugador muerto realiza una acción: ' + p.id);
      return p;
    }
    function recordKills(event, facts, minute) {
      const killer = actor(facts, event, minute);
      const victims = facts.victimIds;
      if (!Array.isArray(victims) || !victims.length || new Set(victims).size !== victims.length) {
        fail('Victimas inválidas o repetidas.'); return;
      }
      for (const id of victims) {
        const victim = players.get(id);
        if (!victim || victim.teamId !== (event.teamId === a ? b : a)) {
          fail('Una baja no pertenece al rival: ' + id); continue;
        }
        if (!alive(victim, minute)) fail('La misma víctima muere sin reaparecer: ' + id);
        dead.set(id, minute + (minute < 16 ? 2 : minute < 29 ? 3 : 4));
        totals.kills[event.teamId]++;
      }
      if (facts.action === 'gank') {
        const j = players.get(facts.initiatorId);
        if (!j || j.role !== 'JUN' || j.teamId !== event.teamId || !alive(j, minute)) fail('Gank sin jungla vivo.');
        if (victims.length !== 1) fail('Gank con múltiples victimas no modeladas.');
      }
      if (facts.action === 'teamfight') {
        if (facts.ace !== undefined) {
          const defeated = event.teamId === a ? b : a;
          const wiped = [...players.values()].filter(p => p.teamId === defeated && clubs.get(defeated).lineup[p.role] === p.id)
            .every(p => !alive(p, minute));
          if (Boolean(facts.ace) !== wiped) fail('Exterminio narrado sin cinco enemigos muertos.');
        }
        if (event.title.includes('PENTAKILL') && victims.length !== 5) fail('Pentakill sin cinco bajas.');
      }
      if (!killer) fail('Falta el autor de una eliminación.');
    }

    function applyEvent(event) {
      if (!isRecord(event) || !integer(event.minute) || !isRecord(event.facts)) return;
      const { facts } = event, t = event.minute;
      if (![a,b].includes(event.teamId)) { fail('Equipo del evento inexistente.'); return; }
      if (facts.action === 'gank' || facts.action === 'teamfight') {
        recordKills(event, facts, t);
      } else if (facts.action === 'tower') {
        actor(facts, event, t);
        const target = event.teamId === a ? b : a;
        if (!['TOP','MID','BOT'].includes(facts.lane)) fail('Línea de torre inválida.');
        else {
          lanes[target][facts.lane]++;
          if (lanes[target][facts.lane] > 3 || facts.stage !== lanes[target][facts.lane]) fail('Torre fuera de orden.');
          totals.towers[event.teamId]++;
        }
      } else if (facts.action === 'dragon') {
        actor(facts, event, t);
        if (t < nextDragon) fail('Dragón antes de su aparición/reaparición.');
        nextDragon = t + 5;
        totals.dragons[event.teamId]++;
        if (facts.ordinal !== totals.dragons[event.teamId]) fail('Número de dragón incoherente.');
      } else if (facts.action === 'baron') {
        const p = actor(facts, event, t);
        if (t < nextBaron) fail('Barón antes de aparecer o reaparecer.');
        nextBaron = t + 7;
        totals.barons[event.teamId]++;
        if (facts.stolen && (!p || p.role !== 'JUN' || facts.smite !== true)) fail('Robo con Smite atribuido a alguien que no es jungla.');
        if (facts.smite && (!p || p.role !== 'JUN')) fail('Uso inválido de Smite.');
        if (facts.stolen && (!facts.initiatorTeamId || facts.initiatorTeamId === event.teamId)) fail('Robo sin equipo rival iniciador.');
      } else if (facts.action === 'nexus') {
        actor(facts, event, t);
        const target = event.teamId === a ? b : a;
        if (!Object.values(lanes[target]).some(n => n === 3)) fail('Nexo destruido sin una línea abierta.');
        if (match.winner !== event.teamId) fail('Equipo destructor no coincide con ganador.');
        nexusCount++;
      } else {
        fail('Tipo de acción desconocido: ' + facts.action);
      }
    }

    for (const frame of match.frames) {
      if (!isRecord(frame) || !integer(frame.minute) || frame.minute < previousMinute) {
        fail('Frames en orden inválido.'); continue;
      }
      previousMinute = frame.minute;
      while (nextEvent < match.events.length && match.events[nextEvent].minute <= frame.minute) {
        const e = match.events[nextEvent++];
        if (!isRecord(e) || !integer(e.minute) || e.minute < lastEventMinute || e.minute > frame.minute) {
          fail('Evento fuera de orden.'); continue;
        }
        lastEventMinute = e.minute;
        if (e.facts) applyEvent(e);
        else if (!allowLegacy && ['goal','fight','end'].includes(e.kind)) fail('Falta evidencia estructurada para: ' + e.title);
      }
      if (frame.eventsCount !== nextEvent) fail('Número de eventos del frame incoherente.');
      for (const k of counters) {
        for (const id of [a,b]) {
          if (!isRecord(frame[k]) || !integer(frame[k][id]) || frame[k][id] !== totals[k][id]) {
            fail('Marcador no coincide con eventos: ' + k + ' ' + id + ' min ' + frame.minute);
          }
        }
      }
    }
    if (nextEvent !== match.events.length) fail('Eventos sin frame asociado.');
    if (match.frames.length < 2 || match.frames[0].minute !== 0) fail('Partido sin comienzo.');
    if (match.frames.at(-1)?.winner !== match.winner) fail('Frame final sin ganador.');
    if (!allowLegacy && (nexusCount !== 1 || match.events.at(-1)?.facts?.action !== 'nexus')) {
      fail('Partido sin un único nexo destruido al final.');
    }
    return errors;
  }

  core.auditMatch = auditMatch;
})(globalThis);
