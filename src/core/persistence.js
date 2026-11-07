/* Rift Director: v2 persistence contract. No mutations or migrations on load. */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const KEY = 'rift_director_v02_save';
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isInt = v => Number.isSafeInteger(v);
  const validId = v => typeof v === 'string' && v.length > 0;
  const fields = ['clubs','players','news','history','monthlyReports','matchReports','offers','playoffs','rumors','usedNames'];
  const maps = ['fixtures','otherFixtures','standings','otherStandings','plan'];
  function validateWorld(world) {
    const errors = [];
    if (!isRecord(world)) return ['La partida no contiene un objeto de mundo.'];
    if (world.v !== 2) errors.push('Versión de guardado incompatible (se necesita v2).');
    if (!isInt(world.rng) || world.rng < -2147483648 || world.rng > 4294967295) errors.push('RNG inválido.');
    if (!isInt(world.nextId) || world.nextId < 0) errors.push('Contador de IDs inválido.');
    if (!isInt(world.year) || world.year < 2027 || !isInt(world.month) || world.month < 1 || world.month > 12) errors.push('Fecha inválida.');
    if (!isInt(world.season) || world.season < 1) errors.push('Temporada inválida.');
    for (const field of fields) if (!Array.isArray(world[field])) errors.push('Falta la lista ' + field + '.');
    for (const field of maps) if (!isRecord(world[field])) errors.push('Falta el objeto ' + field + '.');
    if (!validId(world.userClub)) errors.push('Falta la organización del jugador.');
    if (typeof world.over !== 'boolean') errors.push('Estado de partida inválido.');
    if (world.live != null && !isRecord(world.live)) errors.push('Partido en curso inválido.');
    if (errors.length) return errors;
    const clubs = new Map();
    for (const club of world.clubs) {
      if (!isRecord(club) || !validId(club.id) || clubs.has(club.id) || !Array.isArray(club.roster) || !isRecord(club.lineup) || !Number.isFinite(club.cash)) {
        errors.push('Club inválido o duplicado.'); break;
      }
      clubs.set(club.id, club);
    }
    if (!clubs.has(world.userClub)) errors.push('La organización del jugador no existe.');
    const players = new Map();
    for (const p of world.players) {
      if (!isRecord(p) || !validId(p.id) || players.has(p.id) || !core.ROLES.includes(p.role) || !isRecord(p.a) || !isRecord(p.beh) || !Number.isFinite(p.wage)) {
        errors.push('Profesional inválido o duplicado.'); break;
      }
      players.set(p.id, p);
    }
    if (errors.length) return errors;
    for (const c of world.clubs) {
      const inRoster = new Set();
      for (const id of c.roster) {
        const p = players.get(id);
        if (!p || inRoster.has(id) || p.teamId !== c.id) { errors.push('Plantilla inconsistente: ' + c.id + '.'); break; }
        inRoster.add(id);
      }
      for (const role of core.ROLES) {
        const id = c.lineup[role];
        const p = players.get(id);
        if (!p || !inRoster.has(id) || p.role !== role) { errors.push('Alineación inválida: ' + c.id + ' / ' + role + '.'); break; }
      }
    }
    return errors;
  }
  function parseWorld(json) {
    const value = JSON.parse(json);
    const problems = validateWorld(value);
    if (problems.length) throw new Error('Guardado inválido: ' + problems[0]);
    return value;
  }
  function loadWorld(storage) {
    const json = storage.getItem(KEY);
    return json == null ? null : parseWorld(json);
  }
  function saveWorld(storage, world) { storage.setItem(KEY, JSON.stringify(world)); }
  core.SAVE_KEY = KEY;
  core.validateWorld = validateWorld;
  core.parseWorld = parseWorld;
  core.loadWorld = loadWorld;
  core.saveWorld = saveWorld;
})(globalThis);
