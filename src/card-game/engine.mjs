/* Rift Director CCG prototype. Isolated from legacy RiftCore and save v2. */
export const LANES = Object.freeze(['TOP', 'MID', 'BOT']);
export const ROLE_SLOTS = Object.freeze(['TOP', 'MID', 'BOT', 'BOT', 'JUN']);
export const EFFECTS = Object.freeze(['PRESSURE', 'GUARD', 'IMPACT', 'ENERGY', 'DRAW', 'ROTATE', 'GANK', 'DIVE', 'BACK', 'HUNT', 'HEAL', 'SABOTAGE']);
const MAX_ACTIONS = 4;
const fail = message => { throw new Error(message); };
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const isLane = value => LANES.includes(value);
const clone = value => JSON.parse(JSON.stringify(value));
const isActive = unit => unit.status === 'active';
const baseEnergy = round => Math.min(7, round + 2);
export const combatAttack = (unit, round) => unit.attack + (round >= 10 ? 2 : round >= 7 ? 1 : 0);
export const OBJECTIVES = Object.freeze({
  minor: { name: 'Latido del Vínculo', unlock: 4, threshold: 4, margin: 2 },
  major: { name: 'Coloso del Umbral', unlock: 8, threshold: 4, margin: 2 }
});

export function validateDeck(deck) {
  if (!deck || !Array.isArray(deck.characters) || !Array.isArray(deck.tactics)) fail('Mazo inválido');
  if (deck.characters.length !== 5 || deck.tactics.length !== 20) fail('Se requieren 5 personajes y 20 tácticas');
  const slots = [...deck.characters.map(c => c.role)].sort();
  if (JSON.stringify(slots) !== JSON.stringify([...ROLE_SLOTS].sort())) fail('Roles inválidos');
  for (const c of deck.characters) {
    if (typeof c.id !== 'string' || !c.id || !integer(c.attack, 0, 9) || !integer(c.hp, 1, 20) ||
        (c.trait !== undefined && !['SIEGE','BULWARK','HARVEST','DUELIST','HUNTER','SCOUT'].includes(c.trait))) fail('Personaje inválido');
  }
  for (const card of deck.tactics) {
    if (!card || typeof card.id !== 'string' || !card.id || !integer(card.cost, 0, 7) ||
        !['ACTION', 'SPELL', 'RESOURCE'].includes(card.kind) || !card.effect ||
        !EFFECTS.includes(card.effect.type)) fail('Carta táctica inválida');
    if (!['ROTATE', 'GANK', 'DIVE', 'BACK'].includes(card.effect.type) &&
        !integer(card.effect.value, 1, 8)) fail('Valor de carta inválido');
  }
  return true;
}

function random(match) {
  let x = match.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  match.rng = x | 0;
  return (x >>> 0) / 4294967296;
}
function shuffle(match, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random(match) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}
function draw(match, player, count) {
  for (let n = 0; n < count && player.hand.length < 8; n++) {
    if (!player.deck.length && player.discard.length) {
      player.deck = player.discard.splice(0);
      shuffle(match, player.deck);
    }
    if (!player.deck.length) break;
    player.hand.push(player.deck.pop());
  }
}
function refill(match, player) { draw(match, player, Math.max(0, 6 - player.hand.length)); }
function addEvent(match, type, detail = {}) { match.log.push({ round: match.round, type, ...detail }); }
function makePlayer(side, deck) {
  const slotsSeen = { TOP: 0, MID: 0, BOT: 0, JUN: 0 };
  const characters = deck.characters.map((def, index) => {
    const lane = def.role === 'JUN' ? 'JUN' : def.role;
    const order = slotsSeen[lane]++;
    return {
      id: `p${side}:c${index}`, code: def.id, name: def.name || def.id, trait: def.trait || null, role: def.role, origin: lane, lane,
      rank: lane === 'BOT' && order === 1 ? 'rear' : 'front',
      attack: def.attack, hp: def.hp, maxHp: def.hp,
      status: 'active', readyRound: null, outReason: null, tapped: false
    };
  });
  return {
    name: deck.name || 'Escuadra '+(side+1), characters, deck: deck.tactics.map((c, i) => ({ ...clone(c), uid: `p${side}:t${i}` })),
    hand: [], discard: [], energy: 0, pendingFarm: 0, actions: 0, passed: false,
    keep: [], buffs: { TOP: 0, MID: 0, BOT: 0 },
    permanentPressure: { TOP: 0, MID: 0, BOT: 0 }, majorUntil: 0,
    objectivePressure: { minor: 0, major: 0 }, objectiveLane: 'MID',
    guards: { TOP: 0, MID: 0, BOT: 0 },
    dive: { TOP: false, MID: false, BOT: false },
    towers: { TOP: 6, MID: 6, BOT: 6 }, nexus: 12
  };
}

export function createMatch(decks, options = {}) {
  if (!Array.isArray(decks) || decks.length !== 2) fail('Se requieren dos mazos');
  decks.forEach(validateDeck);
  const firstPlayer = options.firstPlayer ?? 0;
  if (![0, 1].includes(firstPlayer)) fail('Primer jugador inválido');
  const match = {
    version: 1, rng: (options.seed ?? 123456) | 0 || 1,
    round: 1, firstPlayer, turn: firstPlayer, winner: null, phase: 'tactics',
    players: decks.map((deck, side) => makePlayer(side, deck)),
    objectives: {
      minor: { active: false, claimedBy: null },
      major: { active: false, claimedBy: null }
    }, log: []
  };
  for (const p of match.players) {
    shuffle(match, p.deck);
    refill(match, p);
    p.energy = 3;
  }
  match.players[1 - firstPlayer].energy++;
  addEvent(match, 'START', { firstPlayer });
  return match;
}

function requireTurn(match, side) {
  if (!match || match.phase !== 'tactics' || match.winner !== null || match.turn !== side ||
      ![0, 1].includes(side) || match.players[side].passed) fail('No es tu turno');
}
function character(match, side, id) {
  const unit = match.players[side].characters.find(u => u.id === id);
  if (!unit || !isActive(unit)) fail('Personaje no disponible');
  return unit;
}
function sendOut(match, side, unit, reason) {
  unit.status = reason === 'death' ? 'dead' : 'back';
  unit.outReason = reason;
  unit.readyRound = match.round + (reason === 'death' ? 3 : 2);
  unit.tapped = false;
  addEvent(match, reason.toUpperCase(), { side, unit: unit.id, readyRound: unit.readyRound });
}
function damageUnit(match, side, unit, amount) {
  unit.hp = Math.max(0, unit.hp - amount);
  if (unit.hp === 0 && isActive(unit)) sendOut(match, side, unit, 'death');
}
function resetTacticalBonuses(player) {
  player.buffs = { TOP: 0, MID: 0, BOT: 0 };
  player.guards = { TOP: 0, MID: 0, BOT: 0 };
  player.dive = { TOP: false, MID: false, BOT: false };
  player.objectivePressure = { minor: 0, major: 0 };
}
function applyEffect(match, side, card, target) {
  const p = match.players[side], other = match.players[1 - side];
  const { type, value = 0 } = card.effect;
  if (['PRESSURE', 'GUARD', 'GANK', 'DIVE', 'SABOTAGE'].includes(type) && !isLane(target?.lane)) fail('Carril objetivo inválido');
  if (type === 'PRESSURE') p.buffs[target.lane] += value;
  else if (type === 'GUARD') p.guards[target.lane] += value;
  else if (type === 'SABOTAGE') other.buffs[target.lane] -= value;
  else if (type === 'ENERGY') p.energy += value;
  else if (type === 'DRAW') draw(match, p, value);
  else if (type === 'IMPACT') {
    const targetUnit = character(match, 1 - side, target?.unitId);
    damageUnit(match, 1 - side, targetUnit, value);
  } else if (type === 'HEAL') {
    const unit = character(match, side, target?.unitId);
    unit.hp = Math.min(unit.maxHp, unit.hp + value);
    addEvent(match, 'HEAL', { side, unit: unit.id, amount: value, hp: unit.hp });
  } else if (type === 'BACK') {
    const unit = character(match, side, target?.unitId);
    sendOut(match, side, unit, 'back');
  } else if (type === 'ROTATE') {
    const unit = character(match, side, target?.unitId);
    if (unit.role === 'JUN' || !isLane(target?.lane) || unit.lane === target.lane) fail('Rotación ilegal');
    unit.lane = target.lane;
    unit.tapped = true;
  } else if (type === 'GANK') {
    const jungler = p.characters.find(u => u.role === 'JUN');
    if (!jungler || !isActive(jungler) || jungler.rank !== 'front' || jungler.tapped) fail('Jungla no disponible');
    jungler.tapped = true;
    p.buffs[target.lane] += jungler.attack + 1 + (jungler.trait === 'SCOUT' ? 1 : 0);
  } else if (type === 'DIVE') {
    if (!p.characters.some(u => isActive(u) && u.lane === target.lane && u.rank === 'front')) fail('Dive sin atacante');
    p.dive[target.lane] = true;
  } else if (type === 'HUNT') {
    const objective = target?.objective;
    if (!Object.hasOwn(OBJECTIVES, objective) || !match.objectives[objective].active) fail('Objetivo neutral no disponible');
    if (objective === 'minor' && !isLane(target?.lane)) fail('Selecciona un carril para el Latido');
    const jungler = p.characters.find(u => u.role === 'JUN');
    const assist = Boolean(jungler && isActive(jungler) && jungler.rank === 'front' && !jungler.tapped);
    if (assist) jungler.tapped = true;
    p.objectivePressure[objective] += value + (assist ? 2 + (jungler.trait === 'HUNTER' ? 1 : 0) : 0);
    if (objective === 'minor') p.objectiveLane = target.lane;
    addEvent(match, 'HUNT', { side, objective, amount: value + (assist ? 2 + (jungler.trait === 'HUNTER' ? 1 : 0) : 0), assisted: assist });
  } else fail('Efecto no implementado');
}
function advance(match, side) {
  const p = match.players[side];
  if (p.actions >= MAX_ACTIONS) p.passed = true;
  if (match.players.every(x => x.passed)) return resolveRound(match);
  match.turn = match.players[1 - side].passed ? side : 1 - side;
  return match;
}
export function playCard(match, side, uid, target = {}) {
  requireTurn(match, side);
  const p = match.players[side], i = p.hand.findIndex(c => c.uid === uid);
  if (i < 0) fail('Carta no está en mano');
  const card = p.hand[i];
  if (p.energy < card.cost) fail('Energía insuficiente');
  // Validate the complete move on a copy before committing to the authoritative state.
  const draft = clone(match);
  const dp = draft.players[side], dcard = dp.hand.find(c => c.uid === uid);
  dp.energy -= dcard.cost;
  applyEffect(draft, side, dcard, target);
  dp.hand.splice(dp.hand.findIndex(c => c.uid === uid), 1);
  dp.discard.push(dcard);
  dp.actions++;
  addEvent(draft, 'PLAY', { side, card: dcard.id, name: dcard.name || dcard.id, uid, target });
  advance(draft, side);
  Object.assign(match, draft);
  return match;
}
export function activate(match, side, unitId, order) {
  requireTurn(match, side);
  if (!['SWAP_RANK', 'BACK'].includes(order)) fail('Orden inválida');
  const draft = clone(match), p = draft.players[side], unit = character(draft, side, unitId);
  if (unit.tapped) fail('Personaje agotado');
  if (order === 'SWAP_RANK') {
    unit.rank = unit.rank === 'front' ? 'rear' : 'front';
    unit.tapped = true;
  } else sendOut(draft, side, unit, 'back');
  p.actions++;
  addEvent(draft, 'ACTIVATE', { side, unit: unitId, order });
  advance(draft, side);
  Object.assign(match, draft);
  return match;
}
export function chooseKeep(match, side, uids = []) {
  if (match.phase !== 'tactics' || ![0, 1].includes(side) ||
      !Array.isArray(uids) || uids.length > 2 || new Set(uids).size !== uids.length ||
      uids.some(id => !match.players[side].hand.some(c => c.uid === id))) fail('Selección de mano inválida');
  match.players[side].keep = [...uids];
  return match;
}
export function passTurn(match, side) {
  requireTurn(match, side);
  match.players[side].passed = true;
  addEvent(match, 'PASS', { side });
  advance(match, side);
  return match;
}

function spawnObjectives(match) {
  for (const [id, definition] of Object.entries(OBJECTIVES)) {
    const objective = match.objectives[id];
    if (match.round === definition.unlock && objective.claimedBy === null) {
      objective.active = true;
      addEvent(match, 'OBJECTIVE_SPAWN', { objective: id });
    }
  }
}
function resolveNeutralObjectives(match) {
  for (const [id, definition] of Object.entries(OBJECTIVES)) {
    if (!match.objectives[id].active) continue;
    const values = match.players.map(p => p.objectivePressure[id]);
    let winner = null;
    if (values[0] >= definition.threshold && values[0] - values[1] >= definition.margin) winner = 0;
    if (values[1] >= definition.threshold && values[1] - values[0] >= definition.margin) winner = 1;
    if (winner === null) {
      if (values[0] || values[1]) addEvent(match, 'OBJECTIVE_CONTEST', { objective: id, blue: values[0], red: values[1] });
      continue;
    }
    const player = match.players[winner];
    if (id === 'minor') player.permanentPressure[player.objectiveLane] += 1;
    else player.majorUntil = match.round + 3; // Captured in R8 => active R9–R11.
    match.objectives[id].active = false;
    match.objectives[id].claimedBy = winner;
    addEvent(match, 'OBJECTIVE_CAPTURE', {
      objective: id, side: winner, lane: id === 'minor' ? player.objectiveLane : null,
      blue: values[0], red: values[1], majorUntil: id === 'major' ? player.majorUntil : null
    });
  }
}

function resolveRound(match) {
  match.phase = 'resolution';
  const incoming = [new Map(), new Map()];
  for (const lane of LANES) {
    const front = match.players.map(p => p.characters.filter(u => isActive(u) && u.rank === 'front' && u.lane === lane));
    for (let side = 0; side < 2; side++) {
      for (const attacker of front[side]) {
        const target = [...front[1 - side]].sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
        if (target) incoming[1 - side].set(target.id, (incoming[1 - side].get(target.id) || 0) + combatAttack(attacker, match.round) + (attacker.trait === 'DUELIST' ? 1 : 0));
      }
    }
  }
  for (let side = 0; side < 2; side++) {
    for (const [id, amount] of incoming[side]) {
      const unit = match.players[side].characters.find(x => x.id === id);
      damageUnit(match, side, unit, amount);
      addEvent(match, 'HIT', { side, unit: id, amount });
    }
  }
  const hits = [];
  const majorSiegeUsed = [false, false];
  for (const lane of LANES) {
    const presence = match.players.map(p => p.characters.filter(u => isActive(u) && u.lane === lane && u.rank === 'front'));
    const pressure = match.players.map((p, i) =>
      presence[i].reduce((s, u) => s + u.attack + (u.trait === 'SIEGE' ? 1 : 0), 0) + p.buffs[lane] +
      p.permanentPressure[lane] + (p.majorUntil >= match.round ? 1 : 0) +
      (p.towers[lane] > 0 ? 1 : 0));
    for (let side = 0; side < 2; side++) {
      const delta = pressure[side] - pressure[1 - side];
      // A spell cannot siege a structure alone: at least one frontline Riftborn must survive.
      if (delta <= 0 || presence[side].length === 0) continue;
      const attacker = match.players[side], defender = match.players[1 - side];
      let amount = Math.min(3, Math.ceil(delta / 2));
      const frontlineGuard = attacker.dive[lane] ? 0 : (presence[1 - side].length ? 2 + (presence[1 - side].some(u=>u.trait === 'BULWARK') ? 1 : 0) : 0);
      amount = Math.max(0, amount - frontlineGuard - defender.guards[lane]);
      // Colossus improves only the first successful siege of this round, capped at 3.
      if (amount && attacker.majorUntil >= match.round && !majorSiegeUsed[side]) {
        amount = Math.min(3, amount + 1);
        majorSiegeUsed[side] = true;
      }
      if (amount) {
        const defenderAlive = defender.characters.some(u => isActive(u) && u.lane === lane);
        hits.push({ side, lane, amount, defenderAlive, dive: attacker.dive[lane], towerBefore: defender.towers[lane] });
      }
    }
    addEvent(match, 'PRESSURE', { lane, blue: pressure[0], red: pressure[1] });
  }
  // All structure hits derive from the same pre-siege board; no overflow to Nexus.
  for (const hit of hits) {
    const defender = match.players[1 - hit.side];
    if (hit.towerBefore > 0) {
      defender.towers[hit.lane] = Math.max(0, defender.towers[hit.lane] - hit.amount);
      addEvent(match, 'TOWER_HIT', { side: hit.side, lane: hit.lane, amount: hit.amount });
    } else {
      defender.nexus = Math.max(0, defender.nexus - hit.amount);
      addEvent(match, 'NEXUS_HIT', { side: hit.side, lane: hit.lane, amount: hit.amount });
    }
    // Attacking a defended living tower has a consequence even if the defender farms.
    // Dive increases tower retaliation from 1 to 2. An empty lane has no retaliation.
    const retaliation = hit.towerBefore > 0 ? (hit.dive ? 2 : hit.defenderAlive ? 1 : 0) : 0;
    if (retaliation) {
      const front = match.players[hit.side].characters.filter(u => isActive(u) && u.lane === hit.lane && u.rank === 'front');
      const recoil = front.sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
      if (recoil) {
        damageUnit(match, hit.side, recoil, retaliation);
        addEvent(match, 'TOWER_RETALIATION', { side: hit.side, lane: hit.lane, amount: retaliation, unit: recoil.id });
      }
    }
  }
  // Neutral rewards apply only after siege: they cannot change this round retroactively.
  if (match.players.every(p => p.nexus > 0)) resolveNeutralObjectives(match);
  for (const p of match.players) {
    p.pendingFarm = Math.min(2, p.characters.filter(u => isActive(u) && u.role !== 'JUN' && u.rank === 'rear')
      .reduce((total,u) => total + (u.trait === 'HARVEST' ? 2 : 1),0));
    const retained = p.hand.filter(c => p.keep.includes(c.uid));
    p.discard.push(...p.hand.filter(c => !p.keep.includes(c.uid)));
    p.hand = retained;
    p.keep = [];
    resetTacticalBonuses(p);
  }
  const dead = match.players.map(p => p.nexus <= 0);
  if (dead.some(Boolean)) {
    match.winner = dead[0] && dead[1] ? 'draw' : dead[0] ? 1 : 0;
    match.phase = 'finished';
    addEvent(match, 'FINISH', { winner: match.winner });
    return match;
  }
  match.round++;
  match.firstPlayer = 1 - match.firstPlayer;
  match.turn = match.firstPlayer;
  match.phase = 'tactics';
  for (const p of match.players) {
    p.actions = 0;
    p.passed = false;
    p.energy = baseEnergy(match.round) + p.pendingFarm;
    p.pendingFarm = 0;
    for (const unit of p.characters) {
      if (!isActive(unit) && unit.readyRound <= match.round) {
        unit.status = 'active';
        unit.outReason = null;
        unit.readyRound = null;
        unit.hp = unit.maxHp;
        unit.lane = unit.origin;
        unit.rank = 'rear';
      }
      if (isActive(unit)) unit.tapped = false;
    }
    refill(match, p);
  }
  addEvent(match, 'ROUND', { round: match.round, firstPlayer: match.firstPlayer });
  if ([7, 10].includes(match.round)) addEvent(match, 'LATE_POWER', { bonus: match.round === 7 ? 1 : 2 });
  spawnObjectives(match);
  return match;
}
