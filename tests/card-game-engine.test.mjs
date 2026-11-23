import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMatch, validateDeck, playCard, activate, passTurn, chooseKeep } from '../src/card-game/engine.mjs';

function deck(prefix, effect = 'PRESSURE', overrides = {}) {
  const roles = ['TOP', 'MID', 'BOT', 'BOT', 'JUN'];
  return {
    characters: roles.map((role, i) => ({
      id: prefix + '-c' + i, role, attack: overrides[role]?.attack ?? 2,
      hp: overrides[role]?.hp ?? 5
    })),
    tactics: Array.from({ length: 20 }, (_, i) => ({
      id: prefix + '-t' + i, kind: 'ACTION', cost: 0,
      effect: { type: effect, value: 2 }
    }))
  };
}
const match = (a = deck('A'), b = deck('B'), firstPlayer = 0) =>
  createMatch([a, b], { seed: 42, firstPlayer });
function finishRound(m) {
  const start = m.round;
  while (m.round === start && m.phase === 'tactics') passTurn(m, m.turn);
}
test('exige exactamente cinco personajes, roles legales y veinte tácticas', () => {
  const d = deck('A');
  assert.equal(validateDeck(d), true);
  assert.throws(() => validateDeck({ ...d, tactics: d.tactics.slice(1) }), /20 tácticas/);
  assert.throws(() => validateDeck({ ...d, characters: d.characters.slice(1) }), /5 personajes/);
  const bad = structuredClone(d);
  bad.characters[0].role = 'JUN';
  assert.throws(() => validateDeck(bad), /Roles inválidos/);
});
test('semilla fija, seis cartas y moneda con compensación inicial', () => {
  const a = match(deck('A'), deck('B'), 1);
  const b = match(deck('A'), deck('B'), 1);
  assert.deepEqual(a, b);
  assert.equal(a.turn, 1);
  assert.deepEqual(a.players.map(p => p.energy), [4, 3]);
  assert.deepEqual(a.players.map(p => p.hand.length), [6, 6]);
  assert.equal(a.players[0].characters.length, 5);
  assert.equal(a.players[0].characters.filter(c => c.role === 'BOT').length, 2);
});
test('cada jugada cuenta, los turnos alternan y la energía escala', () => {
  const m = match();
  for (let i = 0; i < 8; i++) {
    const side = m.turn;
    const uid = m.players[side].hand[0].uid;
    playCard(m, side, uid, { lane: 'MID' });
  }
  assert.equal(m.round, 2);
  assert.equal(m.turn, 1);
  assert.deepEqual(m.players.map(p => p.energy), [5, 5]); // 4 base + un BOT trasero
  assert.deepEqual(m.players.map(p => p.actions), [0, 0]);
  assert.equal(m.players.every(p => p.hand.length === 6), true);
});
test('cartas fuera de turno o con objetivos inválidos no mutan el estado', () => {
  const m = match();
  const before = structuredClone(m);
  assert.throws(() => playCard(m, 1, m.players[1].hand[0].uid, { lane: 'TOP' }), /No es tu turno/);
  assert.deepEqual(m, before);
  assert.throws(() => playCard(m, 0, m.players[0].hand[0].uid, { lane: 'FAKE' }), /Carril objetivo inválido/);
  assert.deepEqual(m, before);
});
test('la selección de hasta dos cartas se conserva entre rondas', () => {
  const m = match();
  const kept = m.players[0].hand[0].uid;
  chooseKeep(m, 0, [kept]);
  assert.throws(() => chooseKeep(m, 0, [kept, kept]), /inválida/);
  finishRound(m);
  assert.ok(m.players[0].hand.some(c => c.uid === kept));
  assert.equal(m.players[0].hand.length, 6);
});
test('activar giro consume jugada y marca al personaje agotado', () => {
  const m = match();
  const top = m.players[0].characters[0];
  activate(m, 0, top.id, 'SWAP_RANK');
  assert.equal(m.players[0].characters[0].rank, 'rear');
  assert.equal(m.players[0].characters[0].tapped, true);
  assert.equal(m.players[0].actions, 1);
  passTurn(m, 1);
  assert.throws(() => activate(m, 0, top.id, 'SWAP_RANK'), /agotado/);
});
test('Back tarda una ronda completa fuera y reaparece atrás con toda la vida', () => {
  const m = match();
  const unit = m.players[0].characters[0];
  unit.hp = 1;
  activate(m, 0, unit.id, 'BACK');
  assert.equal(m.players[0].characters[0].readyRound, 3);
  finishRound(m);
  assert.equal(m.round, 2);
  assert.equal(m.players[0].characters[0].status, 'back');
  finishRound(m);
  assert.equal(m.round, 3);
  const returned = m.players[0].characters[0];
  assert.equal(returned.status, 'active');
  assert.equal(returned.rank, 'rear');
  assert.equal(returned.hp, returned.maxHp);
});
test('los ataques de dos personajes frontales ocurren simultáneamente', () => {
  const a = deck('A'), b = deck('B');
  a.characters[0].hp = 2; b.characters[0].hp = 2;
  finishRound((() => {
    const m = match(a, b);
    finishRound(m);
    assert.equal(m.players[0].characters[0].status, 'dead');
    assert.equal(m.players[1].characters[0].status, 'dead');
    assert.equal(m.players[0].characters[0].readyRound, 4);
    assert.equal(m.players[1].characters[0].readyRound, 4);
    return m;
  })());
});
test('un defensor vivo delante mitiga daño estructural', () => {
  const a = deck('A', 'PRESSURE', { TOP: { attack: 4, hp: 20 } });
  const b = deck('B', 'PRESSURE', { TOP: { attack: 0, hp: 20 } });
  const m = match(a, b);
  finishRound(m);
  assert.equal(m.players[1].towers.TOP, 6);
});
test('destruir torre abre el carril pero no pasa daño sobrante al Nexo', () => {
  const a = deck('A', 'PRESSURE', { TOP: { attack: 9, hp: 20 } });
  const b = deck('B', 'PRESSURE', { TOP: { attack: 0, hp: 1 } });
  const m = match(a, b);
  finishRound(m);
  assert.equal(m.players[1].towers.TOP, 3);
  assert.equal(m.players[1].nexus, 12);
  finishRound(m);
  assert.equal(m.players[1].towers.TOP, 0);
  assert.equal(m.players[1].nexus, 12);
  finishRound(m);
  assert.equal(m.players[1].nexus, 9);
  for (let i = 0; i < 3; i++) finishRound(m);
  assert.equal(m.phase, 'finished');
  assert.equal(m.winner, 0);
});
test('un gank usa al jungla y no permite activarlo dos veces en una ronda', () => {
  const m = match(deck('A', 'GANK'), deck('B'));
  playCard(m, 0, m.players[0].hand[0].uid, { lane: 'TOP' });
  assert.equal(m.players[0].characters[4].tapped, true);
  passTurn(m, 1);
  const old = structuredClone(m);
  assert.throws(() => playCard(m, 0, m.players[0].hand[0].uid, { lane: 'MID' }), /Jungla no disponible/);
  assert.deepEqual(m, old);
});
