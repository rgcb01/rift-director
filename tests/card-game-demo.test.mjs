import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatch, playCard, passTurn, validateDeck} from '../src/card-game/engine.mjs';
import {STARTER_DECKS} from '../src/card-game/starter-decks.mjs';
import {botStep} from '../src/card-game/simple-bot.mjs';

test('los dos mazos preconstruidos tienen cinco personajes y veinte tácticas válidas',()=>{
  for(const deck of Object.values(STARTER_DECKS)){
    assert.equal(validateDeck(deck),true);
    assert.equal(deck.characters.length,5);
    assert.equal(deck.tactics.length,20);
    assert.equal(deck.characters.filter(c=>c.role==='JUN').length,1);
  }
});
test('un hechizo de presión no derriba torres si no hay nadie delante',()=>{
  const m=createMatch([STARTER_DECKS.siege,STARTER_DECKS.jungle],{seed:2468});
  for(const p of m.players)for(const u of p.characters)u.rank='rear';
  let count=0;
  while(m.round===1&&count++<15){
    const side=m.turn;
    const card=m.players[side].hand.find(c=>c.effect.type==='PRESSURE'&&c.cost<=m.players[side].energy);
    if(card)playCard(m,side,card.uid,{lane:'TOP'});
    else passTurn(m,side);
  }
  assert.equal(m.round,2);
  assert.equal(m.players[0].towers.TOP,6);
  assert.equal(m.players[1].towers.TOP,6);
});
test('el bot puede jugar varias rondas sin saltarse turnos ni crear cartas',()=>{
  const m=createMatch([STARTER_DECKS.siege,STARTER_DECKS.jungle],{seed:1234,firstPlayer:0});
  let steps=0;
  while(m.round<5&&m.phase==='tactics'&&steps<120){
    assert.equal(botStep(m,m.turn),true);
    steps++;
  }
  assert.ok(m.round>=5||m.phase==='finished','el bot se estancó antes de la ronda 5');
  assert.ok(m.log.some(e=>e.type==='PLAY'));
  assert.ok(m.log.every(e=>e.round>=1));
  for(const p of m.players){
    const allCards=[...p.deck,...p.hand,...p.discard];
    assert.equal(allCards.length,20,'no debe duplicar o perder cartas tácticas');
  }
});
