import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatch,validateDeck,maxStructuralDamage,frontalMitigation,lateLaneMomentum,passTurn} from '../src/card-game/engine.mjs';
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

test('la fase tardía sube el daño de asedio sin dejar torres ni Nexo sin protección antes de abrir brecha',()=>{
 assert.deepEqual([1,9,10,11,12,16,17,24].map(maxStructuralDamage),[3,3,3,3,4,4,5,5]);
 assert.deepEqual([1,9,10,11,12,15,16,17].map(frontalMitigation),[2,2,1,1,1,1,0,0]);
});

test('el bono inicial es parametrizable para experimentos sin alterar el +1 predeterminado',()=>{
 const decks=[templateDeck('siege'),templateDeck('jungle')];
 const defaultMatch=createMatch(decks,{seed:17,firstPlayer:0});
 assert.deepEqual(defaultMatch.players.map(x=>x.energy),[3,4]);
 const noBonus=createMatch(decks,{seed:17,firstPlayer:0,secondPlayerBonus:0});
 assert.deepEqual(noBonus.players.map(x=>x.energy),[3,3]);
 const doubleBonus=createMatch(decks,{seed:17,firstPlayer:1,secondPlayerBonus:2});
 assert.deepEqual(doubleBonus.players.map(x=>x.energy),[5,3]);
 assert.throws(()=>createMatch(decks,{secondPlayerBonus:-1}),/Bono/);
 assert.throws(()=>createMatch(decks,{secondPlayerBonus:3}),/Bono/);
});

test('estudio de iniciativa cambia una sola variable y conserva semilla, asientos y límite',()=>{
 const common={seeds:2,maxRounds:8,fixtures:DEFAULT_FIXTURES.slice(0,2)};
 const withZero=runTournament({...common,secondPlayerBonus:0});
 const withOne=runTournament({...common,secondPlayerBonus:1});
 assert.equal(withZero.totals.games,16);
 assert.equal(withOne.totals.games,16);
 assert.equal(withZero.config.secondPlayerBonus,0);
 assert.equal(withOne.config.secondPlayerBonus,1);
 for(const result of [withZero,withOne]){
  assert.equal(result.totals.firstWins+result.totals.secondWins+result.totals.draws+result.totals.timeouts,result.totals.games);
 }
});

test('la IA no abandona un carril abierto solo porque su atacante esté herido',()=>{
 const decks=[templateDeck('siege'),templateDeck('jungle')];
 const match=createMatch(decks,{seed:192,firstPlayer:0});
 const top=match.players[0].characters.find(c=>c.role==='TOP');
 top.hp=1;
 for(const enemy of match.players[1].characters.filter(c=>c.role==='TOP'))enemy.rank='rear';
 const startPosition=top.rank;
 aiStep(match,0,{difficulty:'tactical',style:'siege'});
 const now=match.players[0].characters.find(c=>c.id===top.id);
 assert.equal(startPosition,'front');
 assert.equal(now.rank,'front','no debe retirar sin amenaza un atacante del carril');
});

test('resonancia de asedio es optativa y solo mejora presión con supervivientes desde R14',()=>{
 assert.deepEqual([1,13,14,17,18,24].map(lateLaneMomentum),[0,0,1,1,2,2]);
 const once=enabled=>{
  const m=createMatch([templateDeck('siege'),templateDeck('jungle')],{seed:73,secondPlayerBonus:1,siegeMomentum:enabled});
  m.round=14;
  for(const p of m.players)for(const unit of p.characters)unit.rank='rear';
  m.players[0].characters.find(u=>u.role==='TOP').rank='front';
  passTurn(m,m.turn);passTurn(m,m.turn);
  return m.log.find(e=>e.type==='PRESSURE'&&e.lane==='TOP'&&e.round===14).blue;
 };
 assert.equal(once(true)-once(false),1);
 const defaultMatch=createMatch([templateDeck('siege'),templateDeck('jungle')]);
 assert.equal(defaultMatch.rules.siegeMomentum,false);
});
