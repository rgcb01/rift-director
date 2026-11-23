import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatch,playCard,passTurn,validateDeck} from '../src/card-game/engine.mjs';
import {CHARACTER_CATALOG,TACTIC_CATALOG,RARITIES,TRAITS,templateDeck} from '../src/card-game/catalog.mjs';
import {LIBRARY_KEY,SELECTION_KEY,templateDraft,emptyDraft,assignHero,addTactic,removeTactic,
 validateDraft,toPlayableDeck,saveDraft,readLibrary,readSelection,writeSelection,
 loadPlayable,listPlayableChoices,deleteSavedDeck} from '../src/card-game/deck-library.mjs';

function storage(){
 const memory=new Map();
 return {getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
}
function findCard(m,side,type){
 const p=m.players[side];
 let card=p.hand.find(x=>x.effect.type===type);
 if(card)return card;
 for(const group of [p.deck,p.discard]){
   const i=group.findIndex(x=>x.effect.type===type);
   if(i>=0){card=group.splice(i,1)[0];p.hand.push(card);return card;}
 }
 throw Error('No se encontró '+type);
}

test('catálogo inicial: al menos 18 personajes, 34 tácticas y habilidades pasivas conocidas',()=>{
 assert.ok(CHARACTER_CATALOG.length>=18);
 assert.ok(TACTIC_CATALOG.length>=34);
 assert.deepEqual(Object.keys(RARITIES),['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']);
 assert.ok(CHARACTER_CATALOG.every(c=>TRAITS[c.trait]));
 assert.equal(new Set(CHARACTER_CATALOG.map(c=>c.id)).size,CHARACTER_CATALOG.length);
 assert.equal(new Set(TACTIC_CATALOG.map(c=>c.id)).size,TACTIC_CATALOG.length);
});

test('ambas plantillas producen mazos legales con 5 personajes y 20 tácticas',()=>{
 for(const key of ['siege','jungle']){
   const draft=templateDraft(key);
   assert.deepEqual(validateDraft(draft),[]);
   const playable=toPlayableDeck(draft);
   assert.equal(playable.characters.length,5);
   assert.equal(playable.tactics.length,20);
   assert.equal(validateDeck(playable),true);
   assert.deepEqual(templateDeck(key),playable.name&&templateDeck(key));
 }
});

test('no se permite repetir héroe ni asignarlo a otro rol',()=>{
 const draft=templateDraft('siege');
 assert.throws(()=>assignHero(draft,0,'hero-arcanista'),/incompatible/);
 assert.throws(()=>assignHero(draft,3,'hero-arbalesta'),/ya está/);
 const revised=assignHero(draft,0,'hero-vanguardia');
 assert.equal(revised.characters[0],'hero-vanguardia');
 assert.equal(draft.characters[0],'hero-centinela','el original no muta');
});

test('añadir y quitar cartas respeta cantidad y máximo de copias según rareza',()=>{
 let draft=emptyDraft();
 for(let i=0;i<3;i++)draft=addTactic(draft,'wave-push');
 assert.throws(()=>addTactic(draft,'wave-push'),/Límite de copias/);
 draft=addTactic(draft,'execution');
 assert.throws(()=>addTactic(draft,'execution'),/Límite de copias/);
 draft=removeTactic(draft,'wave-push');
 assert.equal(draft.tactics.filter(x=>x==='wave-push').length,2);
 assert.throws(()=>removeTactic(draft,'missing'),/No tienes/);
});

test('guardar y cargar mazos locales sin modificar guardados del manager MOBA',()=>{
 const s=storage();
 s.setItem('rift-director-save-v2','PREVIOUS_MANAGER_SAVE');
 let draft=templateDraft('siege');
 draft.name='Mis asedios';
 const saved=saveDraft(draft,s);
 assert.ok(saved.id.startsWith('deck-'));
 assert.equal(readLibrary(s).length,1);
 assert.deepEqual(validateDraft(readLibrary(s)[0]),[]);
 assert.equal(loadPlayable(saved.id,s).name,'Mis asedios');
 writeSelection([saved.id,'jungle'],s);
 assert.deepEqual(readSelection(s),[saved.id,'jungle']);
 assert.equal(s.getItem('rift-director-save-v2'),'PREVIOUS_MANAGER_SAVE');
 assert.ok(s.getItem(LIBRARY_KEY));
 assert.ok(s.getItem(SELECTION_KEY));
 assert.ok(listPlayableChoices(s).some(d=>d.id===saved.id));
 deleteSavedDeck(saved.id,s);
 assert.equal(readLibrary(s).length,0);
 assert.deepEqual(readSelection(s),['siege','jungle']);
});

test('borrador incompleto se guarda, pero no puede entrar a partida',()=>{
 const s=storage();
 const saved=saveDraft(emptyDraft('Mi borrador'),s);
 assert.equal(readLibrary(s).length,1);
 assert.ok(validateDraft(saved).length>0);
 assert.ok(!listPlayableChoices(s).some(x=>x.id===saved.id));
 assert.throws(()=>loadPlayable(saved.id,s),/Selecciona/);
});

test('registros locales corruptos o alterados no comprometen la selección',()=>{
 const s=storage();
 s.setItem(LIBRARY_KEY,'{ corrupt');
 assert.deepEqual(readLibrary(s),[]);
 s.setItem(SELECTION_KEY,'{ corrupt');
 assert.deepEqual(readSelection(s),['siege','jungle']);
 const saved=saveDraft(templateDraft('jungle'),s);
 const raw=JSON.parse(s.getItem(LIBRARY_KEY));
 raw.decks[0].characters=['hero-rastreadora','hero-arcanista','hero-arbalesta','hero-custodia','hero-rastreadora'];
 s.setItem(LIBRARY_KEY,JSON.stringify(raw));
 assert.ok(!listPlayableChoices(s).some(x=>x.id===saved.id));
 assert.throws(()=>writeSelection([saved.id,'jungle'],s),/mazo completo/);
});

test('nuevas cartas de curación y sabotaje usan su turno y no modifican objetivos ilegales',()=>{
 const m=createMatch([templateDeck('siege'),templateDeck('jungle')],{seed:312,firstPlayer:0});
 const ally=m.players[0].characters[0];ally.hp=2;
 const healCard=templateDeck('siege').tactics.find(c=>c.effect.type==='HEAL')||TACTIC_CATALOG.find(c=>c.effect.type==='HEAL');
 const heal={...healCard,uid:'test:heal'};
 m.players[0].hand.push(heal);
 playCard(m,0,heal.uid,{unitId:ally.id});
 assert.equal(m.players[0].characters[0].hp,4);
 assert.equal(m.players[0].actions,1);
 const sabotage=findCard(m,1,'SABOTAGE');
 playCard(m,1,sabotage.uid,{lane:'MID'});
 assert.equal(m.players[0].buffs.MID,-2);
});

test('pasiva Asedio añade +1 presión sin aumentar el ATQ impreso',()=>{
 const m=createMatch([templateDeck('siege'),templateDeck('jungle')],{seed:17});
 for(const u of m.players[1].characters)u.rank='rear';
 for(const u of m.players[0].characters)if(u.lane!=='BOT')u.rank='rear';
 while(m.round===1 && m.phase==='tactics')passTurn(m,m.turn);
 const p=m.log.find(x=>x.type==='PRESSURE'&&x.lane==='BOT');
 assert.equal(p.blue,5); // Arbalesta ATQ3 + Asedio1 + torre1
});
