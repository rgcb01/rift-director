import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CHARACTER_CATALOG,TACTIC_CATALOG,templateDeck} from '../src/card-game/catalog.mjs';
import {readCollection,openPack,awardMatch,craftCard,missingForDeck,ownsDeck,ownedCount,maxCopies,
 PACK_PRICE,CRAFT_COSTS,DUPLICATE_FRAGMENTS,COLLECTION_KEY,collectionProgress,fullCatalog,previewOdds} from '../src/card-game/collection.mjs';
import {saveDraft,readLibrary,templateDraft,listPlayableChoices,loadPlayable,SELECTION_KEY,writeSelection} from '../src/card-game/deck-library.mjs';
function storage(){
 const items=new Map();
 return {getItem:key=>items.get(key)??null,setItem:(key,val)=>items.set(key,String(val)),removeItem:key=>items.delete(key)};
}
function chance(){
 let count=0;
 return ()=>{count++;return (count%6)/10;};
}
test('el Archivo inicia con monedas y dos mazos gratuitos, y preserva la progresión del antiguo manager',()=>{
 const st=storage();st.setItem('rift-director-save-v2','LEGACY');
 const data=readCollection(st);
 assert.equal(data.coins,200);
 assert.equal(data.fragments,0);
 assert.equal(data.opened,0);
 assert.equal(data.matches,0);
 assert.equal(st.getItem('rift-director-save-v2'),'LEGACY');
 assert.equal(ownsDeck(templateDraft('siege'),data),true);
 assert.equal(ownsDeck(templateDraft('jungle'),data),true);
 assert.ok(ownedCount(data,'hero-vanguardia')>=1);
 assert.ok(collectionProgress(data).distinct<fullCatalog().length);
 assert.equal(readCollection(st).coins,200);
});

test('la migración protege mazos completos anteriores a abrir el Archivo',()=>{
 const st=storage();
 const draft=templateDraft('siege');
 draft.characters[0]='hero-ancla';
 draft.tactics[0]='great-convergence';
 const saved=saveDraft(draft,st);
 const data=readCollection(st);
 assert.equal(ownedCount(data,'hero-ancla'),1);
 assert.equal(ownedCount(data,'great-convergence'),1);
 assert.equal(loadPlayable(saved.id,st).name,draft.name);
 assert.ok(listPlayableChoices(st).some(x=>x.id===saved.id));
});

test('el primer sobre tiene cinco cartas, ranuras garantizadas, monedas y bonus único',()=>{
 const st=storage();
 const result=openPack(st,chance());
 assert.equal(result.cards.length,5);
 assert.ok(result.cards.slice(0,3).every(c=>c.rarity==='COMMON'));
 assert.ok(['UNCOMMON','RARE','EPIC','LEGENDARY'].includes(result.cards[3].rarity));
 assert.ok(['RARE','EPIC','LEGENDARY'].includes(result.cards[4].rarity));
 assert.equal(result.spent,PACK_PRICE);
 assert.equal(result.bonus,25);
 assert.equal(result.state.coins,125);
 const second=openPack(st,chance());
 assert.equal(second.state.coins,25);
 assert.equal(second.bonus,0);
 assert.equal(second.state.opened,2);
 assert.ok(previewOdds().rare.includes('3%'));
});

test('los sobres aplican protección de duplicados dentro de su misma rareza y transforman excedentes en fragmentos',()=>{
 const st=storage(),init=readCollection(st);
 const maxed={...init,coins:1000,owned:{...init.owned}};
 for(const card of fullCatalog())if(card.rarity==='COMMON')maxed.owned[card.id]=maxCopies(card.id);
 st.setItem(COLLECTION_KEY,JSON.stringify(maxed));
 const pack=openPack(st,()=>0.5);
 assert.equal(pack.cards.slice(0,3).every(card=>card.duplicate),true);
 assert.equal(pack.cards.slice(0,3).reduce((sum,c)=>sum+c.fragments,0),15);
 assert.ok(pack.state.fragments>=15);
 assert.ok(pack.state.owned[pack.cards[3].id]>0);
 assert.ok(pack.state.owned[pack.cards[4].id]>0);
 assert.equal(DUPLICATE_FRAGMENTS.COMMON,5);
});

test('crafteo compra exactamente una copia que falta; rechaza duplicados al límite y falta de fragmentos',()=>{
 const st=storage(),init=readCollection(st);
 const card=TACTIC_CATALOG.find(c=>c.id==='breakthrough');
 assert.equal(ownedCount(init,card.id),0);
 assert.throws(()=>craftCard(card.id,st),/Faltan/);
 init.fragments=CRAFT_COSTS[card.rarity];
 st.setItem(COLLECTION_KEY,JSON.stringify(init));
 const crafted=craftCard(card.id,st);
 assert.equal(crafted.state.fragments,0);
 assert.equal(ownedCount(crafted.state,card.id),1);
 assert.throws(()=>craftCard(card.id,st),/todas las copias/);
});

test('recompensas por combate completado son locales, idempotentes y conceden logros una sola vez',()=>{
 const st=storage();readCollection(st);
 const first=awardMatch('match-sample-123','win',st);
 assert.equal(first.awarded,true);
 assert.equal(first.coins,40);
 assert.equal(first.bonus,125);
 assert.equal(first.state.coins,365);
 const repeat=awardMatch('match-sample-123','win',st);
 assert.equal(repeat.awarded,false);
 assert.equal(repeat.state.coins,365);
 const second=awardMatch('match-sample-456','loss',st);
 assert.equal(second.coins,25);
 assert.equal(second.bonus,0);
 assert.equal(second.state.coins,390);
 assert.equal(second.state.matches,2);
 assert.equal(second.state.wins,1);
 assert.throws(()=>awardMatch('x','win',st),/Identificador/);
 assert.throws(()=>awardMatch('match-valid','victory',st),/Resultado/);
});

test('los mazos propios no se pueden usar con copias sin conseguir; las plantillas siguen jugables',()=>{
 const st=storage(),starter=readCollection(st);
 const draft=templateDraft('siege');
 draft.tactics[0]='great-convergence';
 assert.equal(ownsDeck(draft,starter),false);
 assert.ok(missingForDeck(draft,starter)[0].includes('Gran Convergencia'));
 const saved=saveDraft(draft,st);
 assert.ok(!listPlayableChoices(st).some(x=>x.id===saved.id));
 assert.throws(()=>loadPlayable(saved.id,st),/No tienes/);
 assert.equal(loadPlayable('control',st).characters.length,5);
});

test('colecciones locales dañadas no se sobrescriben, ni producen monedas nuevas sin pago',()=>{
 const st=storage();st.setItem(COLLECTION_KEY,'{bad');
 assert.throws(()=>readCollection(st),/dañada/);
 assert.equal(st.getItem(COLLECTION_KEY),'{bad');
 st.setItem(COLLECTION_KEY,JSON.stringify({version:1,coins:-40}));
 assert.throws(()=>readCollection(st),/no son válidos/);
 assert.throws(()=>openPack(st,Math.random),/no son válidos/);
});

test('los cuatro legendarios están disponibles en el pool de un sobre y el límite es una copia',()=>{
 const rarities=fullCatalog().filter(c=>c.rarity==='LEGENDARY');
 assert.equal(rarities.length,4);
 assert.equal(rarities.filter(c=>c.role).length,2);
 assert.ok(rarities.every(c=>maxCopies(c.id)===1));
 const st=storage(),init=readCollection(st);
 init.coins=600;
 st.setItem(COLLECTION_KEY,JSON.stringify(init));
 const pack=openPack(st,()=>0.999);
 assert.equal(pack.cards[3].rarity,'LEGENDARY');
 assert.equal(pack.cards[4].rarity,'LEGENDARY');
});
