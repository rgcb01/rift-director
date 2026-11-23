import {CHARACTER_CATALOG,CHARACTER_BY_ID,TACTIC_CATALOG,TACTIC_BY_ID,RARITIES,TRAITS} from './catalog.mjs';
import {SLOTS,MAX_DECKS,templateDraft,emptyDraft,assignHero,addTactic,removeTactic,validateDraft,
  readLibrary,saveDraft,deleteSavedDeck,readSelection,writeSelection} from './deck-library.mjs';

const root=document.getElementById('deck-builder-app');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved=readLibrary();
let draft=templateDraft('siege');
let focusSlot=0,filter='ALL',query='',notice='';
const activeSelection=readSelection();
const currentSaved=saved.find(d=>d.id===activeSelection[0]);
if(currentSaved)draft=JSON.parse(JSON.stringify(currentSaved));
const roleLabel=slot=>SLOTS[slot]==='JUN'?'JUNGLA':SLOTS[slot];
const tally=()=>Object.fromEntries([...new Set(draft.tactics)].map(id=>[id,draft.tactics.filter(v=>v===id).length]));
const displayRarity=id=>RARITIES[id]?.name||id;
const complete=()=>validateDraft(draft).length===0;
function banner(){
 return `<header class="db-topbar">
  <div><div class="kicker">RIFT DIRECTOR · CARD GAME 0.8.3</div><h1 class="db-title">CONSTRUCTOR <em>DE MAZOS</em></h1>
  <p class="db-breadcrumb">Colección de prueba · todas las cartas disponibles · sin compras</p></div>
  <div class="db-actions"><a class="btn minor" href="./card-game.html">← Volver a Jugar</a><span class="pill">✦ ${TACTIC_CATALOG.length} tácticas · ${CHARACTER_CATALOG.length} Riftborn</span></div>
 </header>`;
}
function summaryStats(){
 const roles=draft.characters.filter(Boolean).length, tactical=draft.tactics.length,unique=new Set(draft.tactics).size;
 return `<div class="db-progress"><div class="db-stat"><strong>${roles}/5</strong> Personajes</div>
 <div class="db-stat"><strong>${tactical}/20</strong> Tácticas</div>
 <div class="db-stat"><strong>${unique}</strong> Diferentes</div></div>`;
}
function toolbar(){
 return `<section class="db-toolbar"><div class="db-panel"><label for="deck-name" class="db-label">NOMBRE DEL MAZO</label>
 <input id="deck-name" class="db-input" value="${escape(draft.name)}" maxlength="38" aria-label="Nombre del mazo">
 <p class="db-help">La estrategia depende exclusivamente de estas cinco cartas de personaje y tus veinte tácticas. Sin niveles ni equipo.</p></div>
 <div class="db-panel">${summaryStats()}</div></section>`;
}
function heroSlots(){
 return `<div class="db-slots">${SLOTS.map((slot,i)=>{
 const hero=CHARACTER_BY_ID[draft.characters[i]];
 return `<button class="db-slot ${i===focusSlot?'active':''}" data-slot="${i}" aria-pressed="${i===focusSlot}">
 <span><span class="db-slot-role">${roleLabel(i)} ${slot==='BOT'?(i===2?'· 1':'· 2'):''}</span>
 <span class="db-slot-hero">${hero?escape(hero.name):'+ Seleccionar'}</span>
 <span class="db-slot-trait">${hero?escape(TRAITS[hero.trait].name):'Sin personaje'}</span></span>
 <span class="db-slot-stats">${hero?'⚔ '+hero.attack+' ♥ '+hero.hp:'○'}</span></button>`;
 }).join('')}</div>`;
}
function heroPicker(){
 const role=SLOTS[focusSlot];
 return `<div class="db-hero-preview">Selecciona un personaje para <strong>${roleLabel(focusSlot)}</strong>. Puedes cambiarlo antes de guardar. Cada uno aporta una habilidad pasiva durante la partida.</div>
 <div class="db-choice-list">${CHARACTER_CATALOG.filter(c=>c.role===role).map(c=>{
 const chosen=draft.characters[focusSlot]===c.id;
 const elsewhere=draft.characters.some((x,i)=>i!==focusSlot&&x===c.id);
 const trait=TRAITS[c.trait];
 return `<button class="db-choice ${chosen?'active':''}" data-hero="${c.id}" ${elsewhere?'disabled':''} title="${escape(trait.description)}">
 <span><b>${escape(c.name)}</b><small><span class="db-rarity ${c.rarity}">${displayRarity(c.rarity)}</span> · ${escape(trait.name)}</small><small>${escape(trait.description)}</small></span>
 <span class="db-stat-pill">⚔ ${c.attack} · ♥ ${c.hp}</span>
 </button>`;
 }).join('')}</div>`;
}
function libraryActions(){
 return `<div class="db-panel"><h2>Mis mazos · ${saved.length}/${MAX_DECKS}</h2>
 <label class="db-label" for="db-saved-select">ABRIR UN MAZO GUARDADO</label>
 <select class="db-select" id="db-saved-select" aria-label="Mazos guardados"><option value="">Seleccionar guardado…</option>
 ${saved.map(d=>`<option value="${escape(d.id)}" ${draft.id===d.id?'selected':''}>${escape(d.name)} ${validateDraft(d).length?'(borrador)':'✓'}</option>`).join('')}
 </select>
 <div class="db-library-actions"><button class="btn minor" data-template="siege">Plantilla Asedio</button><button class="btn minor" data-template="jungle">Plantilla Jungla</button>
 <button class="btn minor" data-action="empty">Mazo vacío</button><button class="btn minor" data-action="duplicate">Duplicar actual</button></div>
 </div>`;
}
function heroPanel(){
 return `<section class="db-characters">${libraryActions()}<div class="db-panel"><h2>1 · Cinco Riftborn</h2>
 <p class="db-lead">Un TOP, un MID, dos BOT y un JUN. Sus posiciones se eligen durante la partida.</p>
 ${heroSlots()}${heroPicker()}</div></section>`;
}
function catalogFilters(){
 const tabs=[['ALL','Todas'],['ACTION','Acciones'],['SPELL','Hechizos'],['RESOURCE','Recursos']];
 return `<div class="db-filter-row">${tabs.map(([id,title])=>`<button class="db-filter ${filter===id?'active':''}" data-filter="${id}" aria-pressed="${filter===id}">${title}</button>`).join('')}</div>`;
}
function tacticalCards(){
 const counts=tally();
 const matches=TACTIC_CATALOG.filter(c=>(filter==='ALL'||c.kind===filter)&&
   (!query||[c.name,c.description,c.effect.type,c.rarity].some(v=>v.toLowerCase().includes(query.toLowerCase()))));
 if(!matches.length)return '<p class="db-empty">No hay cartas con ese filtro.</p>';
 return matches.map(c=>{
   const count=counts[c.id]||0;
   const cap=RARITIES[c.rarity].max;
   return `<article class="db-card ${c.kind}" data-catalog-card="${c.id}">
     <div class="db-card-head"><div><span class="db-rarity ${c.rarity}">${displayRarity(c.rarity)}</span>
     <div class="db-card-name">${escape(c.name)}</div></div><span class="db-cost" title="Coste de energía">${c.cost}</span></div>
     <div class="db-card-desc">${escape(c.description)}</div>
     <div class="db-counter"><button class="db-icon-button" data-remove="${c.id}" aria-label="Quitar una copia de ${escape(c.name)}" ${count===0?'disabled':''}>−</button>
     <span>${count} / ${cap}</span><button class="db-icon-button" data-add="${c.id}" aria-label="Agregar una copia de ${escape(c.name)}" ${count>=cap||draft.tactics.length>=20?'disabled':''}>+</button></div>
   </article>`;
 }).join('');
}
function tacticPanel(){
 return `<section class="db-catalog"><div class="db-panel"><h2>2 · Colección táctica</h2>
 <p class="db-lead">Añade cartas con + y elimina copias con −. Las rarezas limitan la cantidad por mazo, no la potencia.</p>
 ${catalogFilters()}<input class="db-input" id="catalog-search" placeholder="Buscar cartas por nombre o efecto…" aria-label="Buscar cartas" value="${escape(query)}">
 <div class="db-card-grid" id="catalog-grid" style="margin-top:10px">${tacticalCards()}</div></div></section>`;
}
function deckList(){
 const counts=tally();
 const sorted=Object.keys(counts).sort((a,b)=>TACTIC_BY_ID[a].cost-TACTIC_BY_ID[b].cost||TACTIC_BY_ID[a].name.localeCompare(TACTIC_BY_ID[b].name));
 return `<div class="db-deck-list">${sorted.length?sorted.map(id=>{
 const c=TACTIC_BY_ID[id];return `<div class="db-line"><strong><em>${counts[id]}×</em> ${escape(c.name)}</strong><span class="db-inline"><span>⚡${c.cost}</span><button class="db-icon-button" data-remove="${id}" title="Quitar copia" aria-label="Quitar ${escape(c.name)}">−</button></span></div>`;
 }).join(''):'<div class="db-empty">El mazo está vacío. Añade 20 cartas de la colección.</div>'}</div>`;
}
function readiness(){
 const errors=validateDraft(draft);
 if(!errors.length)return '<div class="db-complete">✓ Mazo legal y listo para jugar</div>';
 return `<div class="db-errors">${errors.slice(0,7).map(e=>`<div class="db-error">${escape(e)}</div>`).join('')}${errors.length>7?`<p class="small">…y ${errors.length-7} observaciones más</p>`:''}</div>`;
}
function deckPanel(){
 return `<section class="db-summary"><div class="db-panel"><h2>3 · Tu mazo</h2>
 <p class="db-lead">Puedes guardar borradores incompletos. Para jugar necesitas un mazo válido de 5 + 20.</p>
 ${deckList()}${readiness()}
 <div class="db-save-buttons"><button class="btn primary" data-action="play" ${complete()?'':'disabled'}>⚔ Guardar y jugar</button>
 <button class="btn" data-action="save">✦ Guardar mazo</button>
 <button class="btn red" data-action="delete" ${draft.id?'':'disabled'}>Eliminar guardado</button></div>
 <p class="db-help">Tus mazos se guardan solo en este navegador. Todavía no existe sincronización, mercado ni sobres.</p>
 </div></section>`;
}
function render(){
 saved=readLibrary();
 root.innerHTML=banner()+(notice?`<div role="status" class="db-notice">${escape(notice)}</div>`:'')+
 toolbar()+`<div class="db-layout">${heroPanel()}${tacticPanel()}${deckPanel()}</div>`;
}
function apply(fn){
 try{draft=fn();notice='';}catch(error){notice=error?.message||'No fue posible completar la acción.';}
 render();
}
function loadTemplate(key){draft=templateDraft(key);focusSlot=0;filter='ALL';query='';notice='Plantilla cargada. Puedes editarla y guardarla con tu propio nombre.';render();}
function play(){
 try{
   if(validateDraft(draft).length)throw new Error('Completa el mazo antes de jugar.');
   draft=saveDraft(draft);
   const chosen=readSelection();writeSelection([draft.id,chosen[1]]);
   window.location.href='./card-game.html';
 }catch(error){notice=error.message;render();}
}
root.addEventListener('click',event=>{
 const btn=event.target.closest('button');
 if(!btn)return;
 const d=btn.dataset;
 if(d.slot!==undefined){focusSlot=Number(d.slot);notice='';render();return;}
 if(d.hero){apply(()=>assignHero(draft,focusSlot,d.hero));return;}
 if(d.add){apply(()=>addTactic(draft,d.add));return;}
 if(d.remove){apply(()=>removeTactic(draft,d.remove));return;}
 if(d.filter){filter=d.filter;notice='';render();return;}
 if(d.template){loadTemplate(d.template);return;}
 if(d.action==='empty'){draft=emptyDraft();notice='Nuevo borrador vacío.';focusSlot=0;render();return;}
 if(d.action==='duplicate'){draft={...draft,id:'',name:(draft.name+' copia').slice(0,38)};notice='Copia sin guardar; elige un nombre distinto.';render();return;}
 if(d.action==='save'){
   try{draft=saveDraft(draft);notice='Mazo guardado localmente.';}catch(error){notice=error.message;}
   render();return;
 }
 if(d.action==='play'){play();return;}
 if(d.action==='delete'){
   if(!draft.id)return;
   if(window.confirm('¿Eliminar el mazo guardado «'+draft.name+'»?')){
     deleteSavedDeck(draft.id);draft=templateDraft('siege');notice='Mazo eliminado del almacenamiento local.';render();
   }
 }
});
root.addEventListener('input',event=>{
 if(event.target.id==='deck-name'){draft.name=event.target.value;return;}
 if(event.target.id==='catalog-search'){
   query=event.target.value;
   const grid=document.getElementById('catalog-grid');
   if(grid)grid.innerHTML=tacticalCards();
 }
});
root.addEventListener('change',event=>{
 if(event.target.id==='db-saved-select'&&event.target.value){
   const deck=readLibrary().find(d=>d.id===event.target.value);
   if(deck){draft=JSON.parse(JSON.stringify(deck));notice='Mazo guardado cargado.';focusSlot=0;render();}
 }
});
render();
