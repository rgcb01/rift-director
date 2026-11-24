// Local-only deck library for v0.8.3. No account, currency, or packs yet.
import {CHARACTER_BY_ID,TACTIC_BY_ID,RARITIES,templateDeck} from './catalog.mjs';
import {readCollection,ownsDeck} from './collection.mjs';
export const LIBRARY_KEY='rift-director-ccg-decks-v1';
export const SELECTION_KEY='rift-director-ccg-selected-v1';
export const SLOTS=Object.freeze(['TOP','MID','BOT','BOT','JUN']);
export const MAX_DECKS=12;
const cleanName=value=>String(value??'').trim().slice(0,38);
const copy=value=>JSON.parse(JSON.stringify(value));
export const emptyDraft=(name='Nuevo mazo')=>({id:'',name,characters:[null,null,null,null,null],tactics:[]});
export function templateDraft(key){
 const d=templateDeck(key);
 return {id:'',name:d.name,characters:d.characters.map(c=>c.id),tactics:d.tactics.map(c=>c.id)};
}
export function validateDraft(draft){
 const errors=[];
 if(!draft || !Array.isArray(draft.characters)||!Array.isArray(draft.tactics))return ['Formato de mazo inválido'];
 if(!cleanName(draft.name))errors.push('Escribe un nombre para el mazo');
 if(draft.characters.length!==5)errors.push('El mazo necesita exactamente 5 espacios de personaje');
 else {
   const used=new Set();
   draft.characters.forEach((id,slot)=>{
     const c=CHARACTER_BY_ID[id];
     if(!c)errors.push('Selecciona un personaje para '+SLOTS[slot]+' (espacio '+(slot+1)+')');
     else {
       if(c.role!==SLOTS[slot])errors.push('El personaje '+c.name+' no puede ocupar '+SLOTS[slot]);
       if(used.has(id))errors.push('No puedes repetir al personaje '+c.name);
       used.add(id);
     }
   });
 }
 if(draft.tactics.length!==20)errors.push('Selecciona exactamente 20 cartas tácticas ('+draft.tactics.length+'/20)');
 const tally=new Map();
 draft.tactics.forEach(id=>{
   const c=TACTIC_BY_ID[id];
   if(!c)errors.push('Carta táctica desconocida');
   else tally.set(id,(tally.get(id)||0)+1);
 });
 for(const [id,count] of tally){
   if(count>RARITIES[TACTIC_BY_ID[id].rarity].max)
     errors.push('Límite de copias excedido: '+TACTIC_BY_ID[id].name);
 }
 return errors;
}
export function toPlayableDeck(draft){
 const errors=validateDraft(draft);
 if(errors.length)throw new Error(errors.join(' · '));
 return {
   id:draft.id||'custom',name:cleanName(draft.name),
   characters:draft.characters.map(id=>copy(CHARACTER_BY_ID[id])),
   tactics:draft.tactics.map(id=>copy(TACTIC_BY_ID[id]))
 };
}
export function assignHero(draft,slot,heroId){
 if(!Number.isInteger(slot)||slot<0||slot>=SLOTS.length)throw new Error('Espacio inválido');
 const hero=CHARACTER_BY_ID[heroId];
 if(!hero||hero.role!==SLOTS[slot])throw new Error('Personaje incompatible con '+SLOTS[slot]);
 if(draft.characters.some((id,i)=>i!==slot&&id===heroId))throw new Error('Ese personaje ya está en el mazo');
 const next=copy(draft);next.characters[slot]=heroId;return next;
}
export function addTactic(draft,id){
 const card=TACTIC_BY_ID[id];
 if(!card)throw new Error('Carta no encontrada');
 const count=draft.tactics.filter(value=>value===id).length;
 if(count>=RARITIES[card.rarity].max)throw new Error('Límite de copias: '+RARITIES[card.rarity].max);
 if(draft.tactics.length>=20)throw new Error('El mazo ya contiene 20 tácticas');
 const next=copy(draft);next.tactics.push(id);return next;
}
export function removeTactic(draft,id){
 const index=draft.tactics.lastIndexOf(id);
 if(index<0)throw new Error('No tienes esa carta en el mazo');
 const next=copy(draft);next.tactics.splice(index,1);return next;
}
function validRecord(record){
 return record&&typeof record.id==='string'&&/^[a-zA-Z0-9_-]{3,48}$/.test(record.id)&&
 Array.isArray(record.characters)&&record.characters.length===5&&
 Array.isArray(record.tactics)&&record.tactics.length<=20&&record.tactics.every(x=>Boolean(TACTIC_BY_ID[x]))&&
 record.characters.every((x,i)=>x===null||Boolean(CHARACTER_BY_ID[x]&&CHARACTER_BY_ID[x].role===SLOTS[i]))&&
 typeof record.name==='string'&&record.name.length<=38;
}
export function readLibrary(storage=globalThis.localStorage){
 try{
   const raw=JSON.parse(storage.getItem(LIBRARY_KEY)||'null');
   if(!raw||raw.v!==1||!Array.isArray(raw.decks))return [];
   const seen=new Set();
   return raw.decks.filter(d=>{
     if(!validRecord(d)||seen.has(d.id))return false;
     seen.add(d.id);return true;
   }).slice(0,MAX_DECKS).map(copy);
 }catch{return [];}
}
function writeLibrary(storage,decks){
 try{
   storage.setItem(LIBRARY_KEY,JSON.stringify({v:1,decks}));
 }catch{throw new Error('No fue posible guardar en este navegador. Revisa el almacenamiento disponible.');}
}
function newId(decks){
 let id;
 do{id='deck-'+Math.floor(Math.random()*0xFFFFFFFF).toString(36)+'-'+Math.floor(Math.random()*0xFFFFFF).toString(36);}
 while(decks.some(d=>d.id===id));
 return id;
}
export function saveDraft(draft,storage=globalThis.localStorage){
 if(!draft||!Array.isArray(draft.characters)||!Array.isArray(draft.tactics))throw new Error('Mazo inválido');
 const name=cleanName(draft.name);
 if(!name)throw new Error('Escribe un nombre para el mazo');
 const decks=readLibrary(storage);
 const next={id:draft.id&&decks.some(d=>d.id===draft.id)?draft.id:newId(decks),
   name,characters:[...draft.characters],tactics:[...draft.tactics]};
 if(!validRecord(next))throw new Error('El mazo contiene cartas incompatibles');
 const counts={};
 for(const id of next.tactics){counts[id]=(counts[id]||0)+1;if(counts[id]>RARITIES[TACTIC_BY_ID[id].rarity].max)throw new Error('Demasiadas copias de '+TACTIC_BY_ID[id].name);}
 const existing=decks.findIndex(d=>d.id===next.id);
 if(existing>=0)decks[existing]=next;
 else{
   if(decks.length>=MAX_DECKS)throw new Error('Límite de '+MAX_DECKS+' mazos guardados');
   decks.push(next);
 }
 writeLibrary(storage,decks);return copy(next);
}
export function deleteSavedDeck(id,storage=globalThis.localStorage){
 const decks=readLibrary(storage).filter(d=>d.id!==id);
 writeLibrary(storage,decks);
 const sel=readSelection(storage);
 for(const side of [0,1])if(sel[side]===id)sel[side]=side===0?'siege':'jungle';
 writeSelection(sel,storage);
 return decks;
}
function playableCustom(storage){
 const collection=readCollection(storage);
 return readLibrary(storage).filter(d=>validateDraft(d).length===0&&ownsDeck(d,collection));
}
export function readSelection(storage=globalThis.localStorage){
 try{
  const data=JSON.parse(storage.getItem(SELECTION_KEY)||'null');
  if(!Array.isArray(data)||data.length!==2)return ['siege','jungle'];
  const known=new Set(['siege','jungle','control',...playableCustom(storage).map(d=>d.id)]);
  return data.map((id,i)=>known.has(id)?id:i===0?'siege':'jungle');
 }catch{return ['siege','jungle'];}
}
export function writeSelection(selection,storage=globalThis.localStorage){
 const known=new Set(['siege','jungle','control',...playableCustom(storage).map(d=>d.id)]);
 if(!Array.isArray(selection)||selection.length!==2||selection.some(x=>!known.has(x)))throw new Error('Selecciona un mazo completo');
 try{storage.setItem(SELECTION_KEY,JSON.stringify(selection));}
 catch{throw new Error('No fue posible guardar la selección de mazos.');}
 return selection;
}
export function loadPlayable(id,storage=globalThis.localStorage){
 if(id==='siege'||id==='jungle'||id==='control')return templateDeck(id);
 const deck=readLibrary(storage).find(d=>d.id===id);
 if(!deck)throw new Error('Mazo no encontrado');
 if(!ownsDeck(deck,readCollection(storage)))throw new Error('No tienes todas las cartas de este mazo. Consíguelas en la colección.');
 return toPlayableDeck(deck);
}
export function listPlayableChoices(storage=globalThis.localStorage){
 return [
   {id:'siege',name:templateDeck('siege').name},
   {id:'jungle',name:templateDeck('jungle').name},
   {id:'control',name:templateDeck('control').name},
   ...playableCustom(storage).map(d=>({id:d.id,name:d.name}))
 ];
}
