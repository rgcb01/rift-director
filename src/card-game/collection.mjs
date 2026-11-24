// Rift Director v0.9.0 — offline, local-only collectible card economy.
// No real payments, accounts, internet, or server-authoritative ownership.
import {CHARACTER_CATALOG,TACTIC_CATALOG,CHARACTER_BY_ID,TACTIC_BY_ID,RARITIES,templateDeck} from './catalog.mjs';
import {readLibrary} from './deck-library.mjs';

export const COLLECTION_KEY='rift-director-ccg-collection-v1';
export const PACK_PRICE=100;
export const MATCH_COINS=Object.freeze({win:40,loss:25,draw:30});
export const DUPLICATE_FRAGMENTS=Object.freeze({COMMON:5,UNCOMMON:12,RARE:25,EPIC:60,LEGENDARY:120});
export const CRAFT_COSTS=Object.freeze({COMMON:20,UNCOMMON:45,RARE:90,EPIC:180,LEGENDARY:360});
export const PACK_SLOTS=Object.freeze(['COMMON','COMMON','COMMON','UNCOMMON_PLUS','RARE_PLUS']);
const catalog=Object.freeze([...CHARACTER_CATALOG,...TACTIC_CATALOG]);
const byId=Object.freeze(Object.fromEntries(catalog.map(c=>[c.id,c])));
const allowed=new Set(catalog.map(c=>c.id));
const limit=id=>CHARACTER_BY_ID[id]?1:RARITIES[byId[id].rarity].max;
const copy=data=>JSON.parse(JSON.stringify(data));
const cap=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const unique=(arr,max)=>Array.isArray(arr)&&arr.length<=max&&arr.every(s=>typeof s==='string'&&s.length<=90);
function grantDeck(owned,deck){
 const heroes=new Set(deck.characters.map(c=>c.id));
 for(const id of heroes)owned[id]=Math.max(owned[id]||0,1);
 const tactical={};
 for(const card of deck.tactics)tactical[card.id]=(tactical[card.id]||0)+1;
 for(const [id,n] of Object.entries(tactical))owned[id]=Math.max(owned[id]||0,Math.min(n,limit(id)));
}
function freshState(storage){
 const owned={};
 grantDeck(owned,templateDeck('siege'));
 grantDeck(owned,templateDeck('jungle'));
 // Welcome alternate TOP card also preserves earlier editor practice builds.
 owned['hero-vanguardia']=1;
 // Grandfather all previously saved custom decks. No user's earlier cards disappear.
 for(const deck of readLibrary(storage)){
   for(const id of deck.characters)if(allowed.has(id))owned[id]=Math.max(owned[id]||0,1);
   const tally={};
   for(const id of deck.tactics)if(allowed.has(id))tally[id]=(tally[id]||0)+1;
   for(const [id,n] of Object.entries(tally))owned[id]=Math.max(owned[id]||0,Math.min(n,limit(id)));
 }
 return {version:1,coins:200,fragments:0,opened:0,matches:0,wins:0,
  owned,achievements:[],recentMatches:[]};
}
function validState(s){
 if(!s||s.version!==1||!cap(s.coins,1_000_000_000)||!cap(s.fragments,1_000_000_000)||
  !cap(s.opened,1_000_000)||!cap(s.matches,1_000_000)||!cap(s.wins,1_000_000)||
  s.wins>s.matches||!unique(s.achievements,15)||!unique(s.recentMatches,80)||
  !s.owned||typeof s.owned!=='object'||Array.isArray(s.owned))return false;
 return Object.entries(s.owned).every(([id,count])=>allowed.has(id)&&cap(count,limit(id)));
}
function persist(storage,state){
 try{storage.setItem(COLLECTION_KEY,JSON.stringify(state));}
 catch{throw new Error('No se pudo guardar la colección local en este navegador.');}
}
export function readCollection(storage=globalThis.localStorage){
 let raw;
 try{raw=storage.getItem(COLLECTION_KEY);}
 catch{throw new Error('El almacenamiento local está bloqueado.');}
 if(raw===null){
   const starter=freshState(storage);
   persist(storage,starter);
   return starter;
 }
 let data;
 try{data=JSON.parse(raw);}catch{throw new Error('La colección guardada está dañada. No se sobrescribirá automáticamente.');}
 if(!validState(data))throw new Error('Los datos de colección no son válidos. No se sobrescribirán.');
 return copy(data);
}
export const ownedCount=(state,id)=>state.owned[id]||0;
export const maxCopies=id=>byId[id]?limit(id):0;
export function missingForDeck(draft,state){
 if(!draft||!Array.isArray(draft.characters)||!Array.isArray(draft.tactics))return ['Mazo inválido'];
 const errors=[];
 for(const id of new Set(draft.characters.filter(Boolean))){
  if(byId[id] && ownedCount(state,id)<1)errors.push('Falta el personaje '+byId[id].name);
 }
 const tally={};
 for(const id of draft.tactics)tally[id]=(tally[id]||0)+1;
 for(const [id,count] of Object.entries(tally)){
  if(byId[id] && ownedCount(state,id)<count)
   errors.push('Necesitas '+count+' copias de '+byId[id].name+' (tienes '+ownedCount(state,id)+')');
 }
 return errors;
}
export const ownsDeck=(draft,state)=>missingForDeck(draft,state).length===0;
export function canAddCopy(state,id,alreadyInDraft=0){
 if(!byId[id])return false;
 return ownedCount(state,id)>alreadyInDraft;
}
function sample(items,rng){
 if(!items.length)throw Error('No hay cartas disponibles en este grupo.');
 const n=rng();
 if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1)throw Error('Generador aleatorio inválido');
 return items[Math.floor(n*items.length)];
}
function pickSlot(pool,rarities,owned,rng){
 const eligible=pool.filter(card=>rarities.includes(card.rarity));
 const remaining=eligible.filter(card=>(owned[card.id]||0)<limit(card.id));
 // Prevent duplicates when there are still cards of the same rarity pool to collect.
 return sample(remaining.length?remaining:eligible,rng);
}
function chooseRarity(slot,rng){
 if(slot==='COMMON')return ['COMMON'];
 const value=rng();
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>=1)throw Error('Generador aleatorio inválido');
 if(slot==='UNCOMMON_PLUS')
  return value<.80?['UNCOMMON']:value<.95?['RARE']:value<.99?['EPIC']:['LEGENDARY'];
 return value<.80?['RARE']:value<.97?['EPIC']:['LEGENDARY'];
}
export function previewOdds(){
 return {
  common:'3 cartas comunes garantizadas',
  uncommon:'1 carta poco común o superior: 80% poco común, 15% rara, 4% épica, 1% legendaria',
  rare:'1 carta rara o superior: 80% rara, 17% épica, 3% legendaria'
 };
}
export function openPack(storage=globalThis.localStorage,rng=Math.random){
 const state=readCollection(storage);
 if(state.coins<PACK_PRICE)throw Error('Necesitas '+PACK_PRICE+' monedas para abrir un sobre.');
 const draft=copy(state);
 const results=[];
 for(const slot of PACK_SLOTS){
  const rarity=chooseRarity(slot,rng);
  const picked=pickSlot(catalog,rarity,draft.owned,rng);
  const previous=draft.owned[picked.id]||0;
  const duplicate=previous>=limit(picked.id);
  if(duplicate)draft.fragments+=DUPLICATE_FRAGMENTS[picked.rarity];
  else draft.owned[picked.id]=previous+1;
  results.push({id:picked.id,name:picked.name,rarity:picked.rarity,
    kind:CHARACTER_BY_ID[picked.id]?'CHARACTER':picked.kind,
    duplicate,fragments:duplicate?DUPLICATE_FRAGMENTS[picked.rarity]:0});
 }
 draft.coins-=PACK_PRICE;
 draft.opened++;
 if(draft.opened===1&&!draft.achievements.includes('firstPack')){
   draft.achievements.push('firstPack');
   draft.coins+=25;
 }
 persist(storage,draft);
 return {cards:results,spent:PACK_PRICE,bonus:draft.opened===1?25:0,state:draft};
}
export function craftCard(id,storage=globalThis.localStorage){
 const card=byId[id];if(!card)throw Error('Carta no encontrada.');
 const state=readCollection(storage);
 if(ownedCount(state,id)>=limit(id))throw Error('Ya tienes todas las copias que necesitas.');
 const cost=CRAFT_COSTS[card.rarity];
 if(state.fragments<cost)throw Error('Faltan '+(cost-state.fragments)+' fragmentos para fabricar '+card.name+'.');
 const next=copy(state);
 next.fragments-=cost;next.owned[id]=(next.owned[id]||0)+1;
 persist(storage,next);
 return {card,cost,state:next};
}
export function awardMatch(matchId,result,storage=globalThis.localStorage){
 if(typeof matchId!=='string'||!/^[a-zA-Z0-9:_-]{6,90}$/.test(matchId))throw Error('Identificador de partida inválido.');
 if(!Object.hasOwn(MATCH_COINS,result))throw Error('Resultado de partida inválido.');
 const state=readCollection(storage);
 if(state.recentMatches.includes(matchId))return {awarded:false,coins:0,bonus:0,state};
 const next=copy(state);
 let bonus=0;
 if(!next.achievements.includes('firstMatch')){
  next.achievements.push('firstMatch');bonus+=50;
 }
 if(result==='win'&&!next.achievements.includes('firstVictory')){
  next.achievements.push('firstVictory');bonus+=75;
 }
 next.coins+=MATCH_COINS[result]+bonus;
 next.matches++;if(result==='win')next.wins++;
 next.recentMatches=[...next.recentMatches,matchId].slice(-80);
 persist(storage,next);
 return {awarded:true,coins:MATCH_COINS[result],bonus,state:next};
}
export function collectionProgress(state){
 const collected=catalog.filter(c=>ownedCount(state,c.id)>0);
 return {distinct:collected.length,total:catalog.length,
   heroes:collected.filter(c=>Boolean(CHARACTER_BY_ID[c.id])).length,
   tactics:collected.filter(c=>Boolean(TACTIC_BY_ID[c.id])).length,
   allCopies:catalog.reduce((sum,c)=>sum+ownedCount(state,c.id),0)};
}
export function fullCatalog(){return catalog;}
