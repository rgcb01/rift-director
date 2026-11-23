import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatch, playCard, passTurn, combatAttack, OBJECTIVES} from '../src/card-game/engine.mjs';
import {STARTER_DECKS} from '../src/card-game/starter-decks.mjs';
import {botStep} from '../src/card-game/simple-bot.mjs';

function neutralMatch(seed=9423) {
  const m=createMatch([STARTER_DECKS.siege,STARTER_DECKS.jungle],{seed,firstPlayer:0});
  for (const p of m.players) for (const u of p.characters)
    if (u.role!=='JUN')u.rank='rear';
  return m;
}
function finishRound(m) {
  const n=m.round;
  let safety=0;
  while(m.round===n && m.phase==='tactics' && safety++<12) passTurn(m,m.turn);
  assert.ok(safety<=12,'El turno no se resolvió');
}
function until(m,n) {
  let safety=0;
  while(m.round<n && m.phase==='tactics' && safety++<30) finishRound(m);
  assert.equal(m.round,n,'No se pudo avanzar hasta R'+n);
}
function ensureHand(m,side,type) {
  const p=m.players[side];
  let card=p.hand.find(c=>c.effect.type===type);
  if(card)return card;
  const source=[p.deck,p.discard].find(zone=>zone.some(c=>c.effect.type===type));
  if(!source)throw Error('Missing '+type);
  const idx=source.findIndex(c=>c.effect.type===type);
  card=source.splice(idx,1)[0];
  p.hand.push(card);
  return card;
}
function hunt(m,side,objective, lane='TOP'){
  const card=ensureHand(m,side,'HUNT');
  playCard(m,side,card.uid,objective==='minor'?{objective,lane}:{objective});
}

test('los objetivos están bloqueados antes de su ronda y no gastan carta en una jugada ilegal',()=>{
 const m=neutralMatch();
 assert.equal(m.objectives.minor.active,false);
 assert.equal(m.objectives.major.active,false);
 const card=ensureHand(m,0,'HUNT');
 const old=structuredClone(m);
 assert.throws(()=>playCard(m,0,card.uid,{objective:'minor',lane:'MID'}),/no disponible/);
 assert.deepEqual(m,old);
 until(m,4);
 assert.equal(m.objectives.minor.active,true);
 assert.equal(m.objectives.major.active,false);
 assert.ok(m.log.some(e=>e.type==='OBJECTIVE_SPAWN'&&e.objective==='minor'&&e.round===4));
});

test('Caza con jungla gana +5 neutral, la agota y el Latido otorga +1 persistente desde la ronda siguiente',()=>{
 const m=neutralMatch();
 until(m,4);
 hunt(m,0,'minor','BOT');
 assert.equal(m.players[0].objectivePressure.minor,5);
 assert.equal(m.players[0].characters.find(c=>c.role==='JUN').tapped,true);
 assert.equal(m.players[0].actions,1);
 finishRound(m);
 assert.equal(m.objectives.minor.claimedBy,0);
 assert.equal(m.objectives.minor.active,false);
 assert.equal(m.players[0].permanentPressure.BOT,1);
 assert.equal(m.players[0].permanentPressure.TOP,0);
 const resolved=m.log.find(e=>e.type==='PRESSURE'&&e.lane==='BOT'&&e.round===4);
 assert.equal(resolved.blue,1,'El Latido no mejora el asedio de la ronda en que se captura');
 finishRound(m);
 const next=m.log.find(e=>e.type==='PRESSURE'&&e.lane==='BOT'&&e.round===5);
 assert.equal(next.blue,2,'Recompensa aplicada en la ronda posterior');
});

test('sin jungla disponible una Caza aporta solo 3 y no alcanza el umbral 4',()=>{
 const m=neutralMatch();
 until(m,4);
 m.players[0].characters.find(c=>c.role==='JUN').tapped=true;
 hunt(m,0,'minor','TOP');
 assert.equal(m.players[0].objectivePressure.minor,3);
 finishRound(m);
 assert.equal(m.objectives.minor.active,true);
 assert.equal(m.objectives.minor.claimedBy,null);
 assert.equal(m.players[0].objectivePressure.minor,0,'La presión neutral se limpia entre rondas');
});

test('si ambos equipos generan 5 de presión neutral, nadie conquista el objetivo',()=>{
 const m=neutralMatch();
 until(m,4);
 hunt(m,0,'minor','TOP');
 hunt(m,1,'minor','MID');
 finishRound(m);
 assert.equal(m.objectives.minor.active,true);
 assert.equal(m.objectives.minor.claimedBy,null);
 assert.equal(m.players[0].permanentPressure.TOP,0);
 assert.equal(m.players[1].permanentPressure.MID,0);
 assert.ok(m.log.some(e=>e.type==='OBJECTIVE_CONTEST'&&e.blue===5&&e.red===5));
});

test('el Coloso aparece en R8, dura R9-R11, sin mejorar la captura retroactivamente',()=>{
 const m=neutralMatch();
 until(m,8);
 assert.equal(m.objectives.major.active,true);
 hunt(m,0,'major');
 finishRound(m);
 assert.equal(m.objectives.major.claimedBy,0);
 assert.equal(m.players[0].majorUntil,11);
 assert.equal(m.round,9);
 for(const round of [9,10,11,12]){
   finishRound(m);
   const record=m.log.find(e=>e.type==='PRESSURE'&&e.round===round&&e.lane==='TOP');
   assert.equal(record.blue,round<=11?2:1,'Presión inesperada en R'+round);
 }
});

test('ataque a una torre con defensor vivo en fila trasera causa represalia 1 al atacante',()=>{
 const m=neutralMatch();
 const top=m.players[0].characters.find(u=>u.role==='TOP');
 top.rank='front'; top.attack=9; top.hp=20; top.maxHp=20;
 finishRound(m);
 assert.equal(m.players[1].towers.TOP,3);
 assert.equal(m.players[0].characters.find(u=>u.role==='TOP').hp,19);
 assert.ok(m.log.some(e=>e.type==='TOWER_RETALIATION'&&e.amount===1&&e.side===0));
});

test('un ataque a una torre sin defensor no recibe represalia',()=>{
 const m=neutralMatch();
 const top=m.players[0].characters.find(u=>u.role==='TOP');
 top.rank='front'; top.attack=9; top.hp=20; top.maxHp=20;
 const defender=m.players[1].characters.find(u=>u.role==='TOP');
 defender.status='dead'; defender.readyRound=4; defender.outReason='death';
 finishRound(m);
 assert.equal(m.players[1].towers.TOP,3);
 assert.equal(m.players[0].characters.find(u=>u.role==='TOP').hp,20);
});

test('escalado global de combate aumenta ATQ en R7 y R10, sin alterar valor impreso',()=>{
 const unit={attack:3};
 assert.equal(combatAttack(unit,1),3);
 assert.equal(combatAttack(unit,6),3);
 assert.equal(combatAttack(unit,7),4);
 assert.equal(combatAttack(unit,9),4);
 assert.equal(combatAttack(unit,10),5);
 assert.equal(unit.attack,3);
 assert.equal(OBJECTIVES.minor.unlock,4);
 assert.equal(OBJECTIVES.major.unlock,8);
});

test('el bot puede avanzar hasta la aparición de ambos objetivos sin acciones ilegales',()=>{
 const m=neutralMatch(3030);
 let count=0;
 while(m.phase==='tactics'&&m.round<9&&count++<200) botStep(m,m.turn);
 assert.ok(m.round>=9,'La partida del bot se estancó');
 assert.ok(m.log.some(e=>e.type==='OBJECTIVE_SPAWN'&&e.objective==='major'));
 assert.ok(m.log.some(e=>e.type==='HUNT'),'El bot no disputó ningún neutral');
});
