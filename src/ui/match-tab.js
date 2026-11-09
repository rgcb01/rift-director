/* Alpha 0.7.15 preview: spectator TAB. Rendering only: champion identities do not
 * grant abilities, damage, stats or extra purchases. No RNG or mutable globals.
 * The match stores its selected champion IDs so replays don't reroll on review.
 */
((root)=>{
'use strict';
const ROLES=['TOP','JUN','MID','ADC','SUP'];
const CHAMPIONS=Object.freeze([
 {id:'hrodan',name:'Hrodan',role:'TOP',archetype:'Luchador',tone:'#c89053',secondary:'#60422f',symbol:'axe'},
 {id:'korvek',name:'Korvek',role:'TOP',archetype:'Tanque',tone:'#70bed0',secondary:'#3f5977',symbol:'shield'},
 {id:'sereth',name:'Sereth',role:'JUN',archetype:'Cazador',tone:'#65c0a1',secondary:'#27564a',symbol:'fang'},
 {id:'veyra',name:'Veyra',role:'JUN',archetype:'Asesina',tone:'#a6a2f6',secondary:'#42356e',symbol:'blade'},
 {id:'aeska',name:'Aeska',role:'MID',archetype:'Maga',tone:'#b48af8',secondary:'#573a85',symbol:'star'},
 {id:'elaris',name:'Elaris',role:'MID',archetype:'Mago',tone:'#8ac8ed',secondary:'#315e83',symbol:'orb'},
 {id:'nyra',name:'Nyra',role:'ADC',archetype:'Tiradora',tone:'#e4aa78',secondary:'#795035',symbol:'arrow'},
 {id:'velin',name:'Velin',role:'ADC',archetype:'Tirador',tone:'#adadce',secondary:'#404b73',symbol:'cross'},
 {id:'thessa',name:'Thessa',role:'SUP',archetype:'Encantadora',tone:'#9ddd90',secondary:'#3e6f52',symbol:'leaf'},
 {id:'drathos',name:'Drathos',role:'SUP',archetype:'Guardián',tone:'#d4989e',secondary:'#67414b',symbol:'shield'}
]);
const BY_ID=Object.fromEntries(CHAMPIONS.map(c=>[c.id,c]));
const ITEMS=Object.freeze({
 boots:{name:'Botas de desplazamiento',color:'#579edf',shape:'boots'},
 blade:{name:'Filo del duelista',color:'#e29475',shape:'blade'},
 mantle:{name:'Manto protector',color:'#78bbac',shape:'shield'},
 focus:{name:'Foco de precisión',color:'#be9bec',shape:'orb'},
 bulwark:{name:'Baluarte táctico',color:'#e6bd78',shape:'shield'}
});
const escape=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(value){let h=2166136261>>>0;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function assign(players){
 const entries={};
 for(const p of players){
  if(!p||typeof p.id!=='string'||!ROLES.includes(p.role)||entries[p.id])throw Error('Invalid champion assignment');
  const options=CHAMPIONS.filter(c=>c.role===p.role);
  entries[p.id]=options[hash(p.id)%options.length].id;
 }
 return {version:1,entries};
}
function iconShape(kind,color){
 const fill=escape(color);
 switch(kind){
 case 'shield':return `<path d="M16 4 27 8v9c0 8-7 11-11 13C12 28 5 25 5 17V8Z" fill="${fill}" stroke="#e5f5fd" stroke-width="1.4"/><path d="M16 9v15M9 15h14" stroke="#19293f" stroke-width="2"/>`;
 case 'axe':return `<path d="M8 27 22 8" stroke="#d5bd99" stroke-width="3"/><path d="m18 6 10 4-8 10-8-6Z" fill="${fill}" stroke="#fff1d0" stroke-width="1.2"/>`;
 case 'blade':return `<path d="M8 27 24 5 27 8 12 29Z" fill="${fill}" stroke="#e6e5ff" stroke-width="1.2"/><path d="m6 20 11 7" stroke="#e6e5ff" stroke-width="2"/>`;
 case 'boots':return `<path d="M9 7h9v10l6 4v5H5v-6l4-3Z" fill="${fill}" stroke="#dcefff" stroke-width="1.5"/><path d="M7 22h17" stroke="#234561" stroke-width="2"/>`;
 case 'orb':return `<circle cx="16" cy="16" r="11" fill="${fill}" stroke="#ecdbff" stroke-width="1.6"/><path d="m10 17 5-10 8 8-8 9Z" fill="#e8e8ff" opacity=".7"/>`;
 case 'fang':return `<path d="M9 5 24 7l-4 10-9 12-2-12Z" fill="${fill}" stroke="#d3fff0" stroke-width="1.4"/>`;
 case 'star':return `<path d="m16 3 4 10 10 3-10 4-4 10-4-10-10-4 10-3Z" fill="${fill}" stroke="#e9d9ff"/>`;
 case 'arrow':return `<path d="M5 27 26 6" stroke="${fill}" stroke-width="3"/><path d="m16 5 11 0v11" fill="none" stroke="#ffead7" stroke-width="2.5"/>`;
 case 'cross':return `<path d="M7 8 24 25M25 7 8 24" stroke="${fill}" stroke-width="4"/><circle cx="16" cy="16" r="4" fill="#e5eaff"/>`;
 case 'leaf':return `<path d="M7 26C5 12 14 6 27 5c0 14-5 21-20 21Z" fill="${fill}" stroke="#e4ffe3" stroke-width="1.5"/><path d="M8 25 24 10" stroke="#365443" stroke-width="2"/>`;
 default:return `<circle cx="16" cy="16" r="11" fill="${fill}"/>`;
 }
}
function emblem(kind,color){return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${iconShape(kind,color)}</svg>`;}
function portrait(champion){
 const c=champion;
 // Distinct geometric headwear, hair and crest; inline SVG stays offline and low-weight.
 const isArmored=['shield','axe','fang'].includes(c.symbol);
 const face=isArmored?'<path d="m12 11 8 0 3 7-3 9h-8l-3-9Z" fill="#bac9d2"/>':'<path d="m12 12 8 0 3 8-3 7h-8l-3-7Z" fill="#e2bda8"/>';
 return `<svg viewBox="0 0 36 36" role="img" aria-label="Campeón ${escape(c.name)}"><rect width="36" height="36" rx="6" fill="#0b1a2a"/><path d="M0 34 8 25 16 29 26 24 36 33v3H0Z" fill="${escape(c.secondary)}"/><path d="M5 17 10 6 17 3 25 7 31 19l-8-6-11-1Z" fill="${escape(c.tone)}"/>${face}<path d="M13 19h3m4 0h3" stroke="#122538" stroke-width="1.5"/><path d="m13 25 4 2 4-2" fill="none" stroke="#784b57" stroke-width="1"/><path d="m4 32 8-5 6 5 6-5 8 5" fill="none" stroke="${escape(c.tone)}" stroke-width="2"/><path d="M1 1h34v34H1Z" fill="none" stroke="${escape(c.tone)}" stroke-opacity=".5" stroke-width="2"/></svg>`;
}
function itemSlot(itemId,index){
 const item=ITEMS[itemId];
 const title=item?item.name:(itemId?'Objeto desconocido: '+itemId:'Espacio vacío');
 return `<span class="tab-item ${item?'filled':'vacant'}" title="${escape(title)}" aria-label="Objeto ${index+1}: ${escape(title)}">${item?emblem(item.shape,item.color):''}</span>`;
}
function row(p,championId,frame){
 const c=BY_ID[championId],stats=frame.playerStats?.[p.id];
 const progress=frame.powerEconomy?.entries?.[p.id];
 const level=Number.isInteger(progress?.level)?progress.level:null;
 const items=Array.isArray(progress?.items)?progress.items.slice(0,6):[];
 const kda=stats?`${stats.kills} / ${stats.deaths} / ${stats.assists}`:'— / — / —';
 return `<div class="rift-tab-player" role="row">
 <span class="rift-tab-role" role="cell">${escape(p.role)}</span>
 <span class="rift-tab-portrait" role="cell">${portrait(c)}<span class="rift-tab-level" title="Nivel">${level??'—'}</span></span>
 <span class="rift-tab-ident" role="cell"><strong>${escape(c.name)}</strong><small title="${escape(p.name)}">${escape(p.name)}</small></span>
 <span class="rift-tab-kda num" role="cell" title="Kills / muertes / asistencias">${kda}</span>
 <span class="rift-tab-items" role="cell" aria-label="Inventario de ${escape(c.name)}">${Array.from({length:6},(_,i)=>itemSlot(items[i],i)).join('')}</span>
 </div>`;
}
function render({match,frame,teams}){
 if(!match?.champions?.entries || !frame || !Array.isArray(teams))return '';
 const rows=teams.map((team,i)=>`<section class="rift-tab-team ${i===0?'blue':'red'}" aria-label="${escape(team.name)}"><h3>${escape(team.name)}</h3><div role="table" aria-label="Estadísticas de ${escape(team.name)}">${team.players.map(p=>{
  const chosen=match.champions.entries[p.id];if(!BY_ID[chosen])return '';
  return row(p,chosen,frame);
 }).join('')}</div></section>`).join('');
 return `<section class="panel rift-tab-panel" aria-label="Tabla de campeones y objetos del partido">
 <div class="panel-head"><h2>Campeones y builds</h2><span class="chip">TAB · espectador</span></div>
 <p class="helper">Datos del momento seleccionado · Iconos y campeones originales. Los kits y objetos escalados llegarán en próximas versiones.</p>
 <div class="rift-tab-grid">${rows}</div></section>`;
}
root.RiftMatchTab=Object.freeze({assign,render,CHAMPIONS,ITEMS});
})(globalThis);
