import {CHARACTER_BY_ID,TACTIC_BY_ID,RARITIES,TRAITS} from './catalog.mjs';
import {CARD_ART} from '../../assets/card-art/manifest.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={ACTION:'Acción',SPELL:'Hechizo',RESOURCE:'Recurso'};
const asset=path=>new URL('../../'+path,import.meta.url).href;
export function renderCardArt(id,{compact=false,full=false,eager=false}={}){
 const card=CHARACTER_BY_ID[id]||TACTIC_BY_ID[id];
 const glyph=CHARACTER_BY_ID[id]?'♜':card?.kind==='SPELL'?'✦':card?.kind==='RESOURCE'?'⚡':'⚔';
 const art=CARD_ART[id];
 return `<span class="card-art ${compact?'card-art-compact':''} ${full?'card-art-full':''}" data-art-id="${escape(id)}"><span class="card-art-fallback" aria-hidden="true">${glyph}</span>${art?`<img class="card-art-image" src="${asset(art.variants[compact?'192':'384'])}" srcset="${[192,384,768].map(w=>asset(art.variants[w])+' '+w+'w').join(', ')}" sizes="${compact?'(max-width: 620px) 150px, 119px':'(max-width: 600px) 44vw, (max-width: 1100px) 220px, 260px'}" width="768" height="1024" style="object-position:${art.focal.x*100}% ${art.focal.y*100}%" alt="${escape(art.alt)}" loading="${eager?'eager':'lazy'}" decoding="async">`:''}</span>`;
}
// Noninteractive face: callers own buttons/actions, so art cannot intercept play.
// Runtime stats are explicit; static identity/cost/rarity always come from catalog.
export function renderCardFace(id,{variant='catalog',attack,hp,maxHp}={}){
 const c=CHARACTER_BY_ID[id]||TACTIC_BY_ID[id];
 if(!c)return '';
 const hero=Boolean(CHARACTER_BY_ID[id]),compact=variant==='board'||variant==='hand';
 const stats=hero?`<span class="stats card-face-stats">⚔ ${escape(attack??c.attack)} · ♥ ${escape(hp??c.hp)}${maxHp===undefined?'':'/'+escape(maxHp)}</span>`:'';
 return `<span class="card-face card-face-${variant} rarity-${c.rarity}" data-card-id="${escape(id)}">${renderCardArt(id,{compact,full:variant==='reveal',eager:compact})}<span class="card-face-meta"><span class="kind name-role">${escape(hero?c.role:kinds[c.kind])}</span>${hero?'':`<span class="cost card-face-cost" title="Coste de energía">${c.cost}</span>`}</span><span class="card-face-copy"><${variant==='board'?'b':'strong'}>${escape(c.name)}</${variant==='board'?'b':'strong'}>${variant==='board'?'':`<span class="card-face-rarity">${escape(RARITIES[c.rarity].name)}${hero?' · '+escape(TRAITS[c.trait].name):''}</span><span class="description card-face-description">${escape(hero?TRAITS[c.trait].description:c.description)}</span>`}${stats}</span></span>`;
}
export function installArtFallback(root){
 // Capture works for lazy images and future innerHTML renders; error does not bubble.
 root.addEventListener('error',event=>{
  if(event.target.matches?.('.card-art-image'))event.target.remove();
 },true);
}
