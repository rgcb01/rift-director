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
].map(c=>Object.freeze({...c,portrait:`assets/champions/${c.id}-64.png`})));
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
 const skin={veyra:'#ddab9e',aeska:'#ddb4bc',elaris:'#e6cbba',nyra:'#e8b69a',velin:'#b3a0a8',thessa:'#d9bba6',hrodan:'#ad7961'}[c.id]||'#b7c6cf';
 const hair={veyra:'#8a92e8',aeska:'#633e99',elaris:'#cadbfa',nyra:'#c76f42',velin:'#2c334c',thessa:'#4eac77',hrodan:'#78482f'}[c.id]||c.tone;
 const armor=['korvek','drathos','sereth'].includes(c.id);
 const variants={
  veyra:{hair:'<path d="M6 20 4 11 12 4 25 4 32 11 30 26 24 19 24 10 11 10 10 24Z"/>',crest:'<path d="m6 10 4-7 5 4m11-3 5 6-5 1" fill="#dae8ff"/>',eye:'#5ce2f3'},
  hrodan:{hair:'<path d="M6 18 8 8 16 3 26 6 31 18 25 14 22 9 12 11 11 19Z"/><path d="M11 23 14 31 25 31 27 23 21 27 16 27Z"/>',crest:'<path d="m8 9-3-6 9 2m10-1 7-2-3 8" fill="#e4bb85"/>',eye:'#9ae4d0'},
  aeska:{hair:'<path d="M5 24 6 8 15 2 27 7 30 23 25 32 24 12 12 10 11 31Z"/>',crest:'<path d="m17 2 5 5-5 3-5-4Z" fill="#dbb6ff"/>',eye:'#cda8ff'},
  nyra:{hair:'<path d="M5 15 11 5 25 4 30 11 29 25 24 31 23 12 13 10 10 24Z"/>',crest:'<path d="M7 10 3 4 13 6m11 0 8-4-3 10" fill="#ffcd89"/>',eye:'#80daf4'},
  korvek:{hair:'<path d="M5 14 13 3 26 3 31 14 28 25 22 33 12 32 7 23Z" fill="#879ead"/>',crest:'<path d="M14 5h8l4 8-3 15H12L9 13Z" fill="#c2d5dc"/><path d="m10 17 5-3 3 3 4-3 4 3-3 4-5-1-5 1Z" fill="#163d50"/>',eye:'#50f5e2'},
  drathos:{hair:'<path d="M6 18 9 4 18 2 28 5 31 18 27 30 9 30Z" fill="#748093"/>',crest:'<path d="m16 4 4 7-2 9h-3l-2-9Z" fill="#d8b1ae"/><path d="m8 20 8-4 10 3-3 5-12 0Z" fill="#293345"/>',eye:'#ff657d'},
  sereth:{hair:'<path d="M5 17 12 4 22 3 31 13 29 23 24 32 13 30 5 24Z" fill="#29716e"/>',crest:'<path d="m5 12 6-9 4 7m11-6 7 7-8 0m-18 13 6 6 10 0 7-6" fill="#86e0bc"/>',eye:'#f78f8f'},
  elaris:{hair:'<path d="M4 17 9 6 18 2 28 7 30 22 24 29 25 13 19 9 10 15 10 28Z"/>',crest:'<path d="m12 8 9-6 6 6-10 4Z" fill="#ecf1ff"/>',eye:'#78dcf9'},
  velin:{hair:'<path d="M5 15 9 7 24 5 31 15 28 28 8 28Z"/>',crest:'<path d="M3 11 12 5h16l5 7-2 4H6Z" fill="#42415e"/><path d="M3 13h30v3H3Z" fill="#a7a7d8"/>',eye:'#ff9fa2'},
  thessa:{hair:'<path d="M5 25 7 9 16 4 27 7 30 26 25 31 24 13 14 12 11 29Z"/>',crest:'<path d="m7 8-3-5 8 2m14 1 7-3-3 8m-13-5 4 6-5 3-4-4Z" fill="#aaf5a9"/>',eye:'#78edda'}
 };
 const v=variants[c.id]||variants.veyra;
 const face=armor?'<path d="m12 12 12 0 2 14-8 7-9-8Z" fill="#9fb2c1"/>':
  '<path d="M11 11 25 12 26 22 22 30 15 31 10 23Z" fill="'+skin+'"/>';
 const eyes='<path d="m12 19 5-1 0 3-4 1Z m6-1 5 1-1 3-4-1Z" fill="'+v.eye+'"/>';
 const dark='<path d="M0 36 4 27 11 25 18 31 26 25 33 27 36 36Z" fill="'+c.secondary+'"/>';
 return '<svg viewBox="0 0 36 36" role="img" aria-label="Campeón '+escape(c.name)+'">'+
  '<rect width="36" height="36" rx="5" fill="#0c1928"/>'+
  '<path d="M2 32 5 12 13 5 26 5 33 17 34 34Z" fill="'+c.secondary+'"/>'+
  '<path d="M7 17 11 7 23 5 29 14 27 27 22 33 12 30Z" fill="'+hair+'"/>'+
  face+'<g fill="'+hair+'">'+v.hair+'</g>'+v.crest+eyes+
  '<path d="m16 25 3 1 3-1" stroke="#684c54" stroke-width=".8" fill="none"/>'+
  dark+'<path d="M1 1h34v34H1Z" fill="none" stroke="'+c.tone+'" stroke-opacity=".8" stroke-width="1.5"/></svg>';
}
function itemSlot(itemId,index){
 const fallback=Object.hasOwn(ITEMS,itemId)?ITEMS[itemId]:null;
 const art=root.RiftItemArt?.get(itemId)||root.RiftItemArt?.get(itemId,'components');
 const item=root.RiftCore?.PowerEconomy?.ITEM_CATALOG.find(x=>x.id===itemId)||
  root.RiftCore?.PowerEconomy?.COMPONENT_CATALOG?.find(x=>x.id===itemId)||fallback||art;
 const title=item?item.name+(item.cost?' · '+item.cost+' oro':''):
  (itemId?'Objeto desconocido: '+itemId:'Espacio vacío');
 return `<span class="tab-item ${item?'filled':'vacant'}" title="${escape(title)}" aria-label="Objeto ${index+1}: ${escape(title)}">${item?emblem(fallback?.shape||'orb',fallback?.color||'#9baac8')+(root.RiftItemArt?.image(itemId)||''):''}</span>`;
}
function row(p,championId,frame){
 const c=BY_ID[championId],stats=frame.playerStats?.[p.id];
 const progress=frame.powerEconomy?.entries?.[p.id];
 const level=Number.isInteger(progress?.level)?progress.level:null;
 const items=Array.isArray(progress?.items)?progress.items.slice(0,6):[];
 const ability=frame.abilityState?.entries?.[p.id];
 const at=(frame.minute||0)*60+45;
 const resource=ability&&root.RiftCore?.ChampionKits?
  root.RiftCore.ChampionKits.projected(ability,at):ability?.resource;
 const abilityLine=ability?'<small class="rift-tab-effective" aria-label="Habilidades y recursos activos">'+
  'Recurso '+resource+'/100 · '+
  ['Q','W','E','R'].map(slot=>slot+':'+(ability.cooldowns?.[slot]>at?
   Math.ceil((ability.cooldowns[slot]-at)/60)+'m':'lista')).join(' · ')+
  '</small>':'';
 const effective=progress?.effectiveStats;
 const statsLine=effective?'<small class="rift-tab-effective" aria-label="Atributos efectivos">'+
  'HP '+Math.round(effective.maxHp)+' · DA '+Math.round(effective.attackDamage)+
  ' · Arm '+Math.round(effective.armor)+' · RM '+Math.round(effective.magicResist)+
  ' · VA '+Number(effective.attackSpeed).toFixed(2)+
  (effective.abilityPower?' · AP '+Math.round(effective.abilityPower):'')+'</small>':'';
 const kda=stats?`${stats.kills} / ${stats.deaths} / ${stats.assists}`:'— / — / —';
 return `<div class="rift-tab-player" role="row">
 <span class="rift-tab-role" role="cell">${escape(p.role)}</span>
 <span class="rift-tab-portrait" role="cell">${portrait(c)}<img class="rift-tab-portrait-image" src="${escape(c.portrait)}" width="64" height="64" alt="" aria-hidden="true" onerror="this.remove()"><span class="rift-tab-level" title="Nivel">${level??'—'}</span></span>
 <span class="rift-tab-ident" role="cell"><strong>${escape(c.name)}</strong><small title="${escape(p.name)}">${escape(p.name)}</small>${statsLine}${abilityLine}</span>
 <span class="rift-tab-kda num" role="cell" title="Kills / muertes / asistencias">${kda}</span>
 <span class="rift-tab-items" role="cell" aria-label="Inventario de ${escape(c.name)}">${Array.from({length:6},(_,i)=>itemSlot(items[i],i)).join('')}</span>
 </div>`;
}
function championFor(match,professional){
 const assigned=match?.champions?.entries?.[professional?.id];
 if(BY_ID[assigned])return BY_ID[assigned];
 // Historical replays have no champion selection; derive visual identity only.
 // This is NOT a historical pick and never writes back to the match.
 const options=CHAMPIONS.filter(c=>c.role===professional?.role);
 return professional?.id&&options.length?options[hash(professional.id)%options.length]:null;
}
function portraitFor(match,professional){
 const c=championFor(match,professional);
 return c?portrait(c):'';
}
function render({match,frame,teams,renderCrest=(team,size)=>root.RiftBranding?.club(team,size)||''}){
 if(!frame || !Array.isArray(teams))return '';
 const rows=teams.map((team,i)=>`<section class="rift-tab-team ${i===0?'blue':'red'}" aria-label="${escape(team.name)}"><h3>${renderCrest(team,24)}${escape(team.name)}</h3><div role="table" aria-label="Estadísticas de ${escape(team.name)}">${team.players.map(p=>{
  const selected=championFor(match,p);if(!selected)return '';
  return row(p,selected.id,frame);
 }).join('')}</div></section>`).join('');
 return `<section class="panel rift-tab-panel" aria-label="Tabla de campeones y objetos del partido">
 <div class="panel-head"><h2>Campeones y builds</h2><span class="chip">TAB · espectador</span></div>
 <p class="helper">Datos del momento seleccionado · ${match?.champions?.entries?'Campeones asignados al partido.':'Replay histórico: identidad de campeón reconstruida únicamente para la presentación.'} Los componentes y objetos usan compras reales; los atributos escalan con XP y compras en las partidas nuevas. Las habilidades Q/W/E/R se activan con recursos, alcance y enfriamientos; sus efectos quedan registrados en las peleas.</p>
 <div class="rift-tab-grid">${rows}</div></section>`;
}
root.RiftMatchTab=Object.freeze({assign,render,itemSlot,championFor,portraitFor,CHAMPIONS,ITEMS});
})(globalThis);
