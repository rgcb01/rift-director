import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatch,validateDeck} from '../src/card-game/engine.mjs';
import {templateDeck} from '../src/card-game/catalog.mjs';
import {aiStep,AI_LEVELS,AI_STYLES} from '../src/card-game/tactical-ai.mjs';
import {simulateGame,runTournament,DEFAULT_FIXTURES} from '../src/card-game/balance.mjs';

test('los tres arquetipos contienen mazos válidos y no requieren cartas ocultas',()=>{
 for(const name of ['siege','jungle','control']){
   const deck=templateDeck(name);
   assert.equal(validateDeck(deck),true);
   assert.equal(deck.characters.length,5);
   assert.equal(deck.tactics.length,20);
 }
 assert.deepEqual(Object.keys(AI_LEVELS),['rookie','tactical','director']);
 assert.deepEqual(Object.keys(AI_STYLES),['balanced','siege','control','jungle']);
});

test('las decisiones de IA se reproducen con la misma semilla y perfil',()=>{
 const a=simulateGame('siege','control',{seed:105,firstPlayer:0,maxRounds:13,styles:['siege','control']});
 const b=simulateGame('siege','control',{seed:105,firstPlayer:0,maxRounds:13,styles:['siege','control']});
 assert.deepEqual(a,b);
 assert.equal(a.halfTurns>0,true);
 assert.equal(a.cardsPlayed>=0,true);
});

test('la IA táctica no usa la mano ni el mazo ocultos del adversario para su primer turno',()=>{
 const a=createMatch([templateDeck('siege'),templateDeck('jungle')],{seed:139,firstPlayer:0});
 const b=structuredClone(a);
 b.players[1].hand.reverse();
 b.players[1].deck.reverse();
 b.players[1].hand.forEach(card=>card.name='CARTA SECRETA');
 assert.equal(aiStep(a,0,{difficulty:'director',style:'balanced'}),true);
 assert.equal(aiStep(b,0,{difficulty:'director',style:'balanced'}),true);
 const emitted=m=>m.log.find(e=>['PLAY','ACTIVATE','PASS'].includes(e.type));
 assert.deepEqual(emitted(a),emitted(b));
});

test('cada perfil puede jugar sin acciones fuera de turno',()=>{
 for(const difficulty of ['rookie','tactical','director']){
  for(const style of ['balanced','siege','control','jungle']){
   const outcome=simulateGame('siege','jungle',{seed:37,difficulty,maxRounds:5,styles:[style,style]});
   assert.ok(outcome.rounds>=1);
   assert.ok(outcome.halfTurns>0);
  }
 }
});

test('el torneo invierte lados e iniciativa sin perder partidas',()=>{
 const report=runTournament({seeds:2,maxRounds:10,fixtures:DEFAULT_FIXTURES.slice(0,2)});
 assert.equal(report.totals.games,16);
 assert.equal(report.fixtures.length,2);
 for(const row of report.fixtures){
   assert.equal(row.winsA+row.winsB+row.draws+row.timeouts,row.games);
   assert.equal(row.finished+row.timeouts,row.games);
   assert.ok(row.avgCardsPlayed>=0);
   assert.ok(row.captureRates.minor>=0);
   assert.ok(row.captureRates.major<=100);
 }
});

test('una partida que supera el límite se informa como incompleta, no como empate',()=>{
 const result=simulateGame('control','control',{seed:99,maxRounds:1,firstPlayer:0,styles:['control','control']});
 assert.equal(result.timedOut,true);
 assert.equal(result.completed,false);
 assert.equal(result.winner,null);
 assert.equal(result.rounds,1);
});

test('el runner rechaza entradas arbitrarias y no realiza simulaciones ilimitadas',()=>{
 assert.throws(()=>runTournament({seeds:0}),/Semillas/);
 assert.throws(()=>simulateGame('siege','jungle',{maxRounds:0}),/Límite/);
 assert.throws(()=>simulateGame('siege','jungle',{difficulty:'omniscient'}),/IA desconocida/);
});
