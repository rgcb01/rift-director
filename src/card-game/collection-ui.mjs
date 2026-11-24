import {CHARACTER_BY_ID,RARITIES,TRAITS} from './catalog.mjs';
import {readCollection,openPack,craftCard,collectionProgress,fullCatalog,previewOdds,ownedCount,maxCopies,CRAFT_COSTS,PACK_PRICE} from './collection.mjs';

const root=document.getElementById('collection-app');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let notice='',filter='ALL',search='',results=null,reveal=0;
let state=null;
const glyph=card=>CHARACTER_BY_ID[card.id]?'♜':card.kind==='SPELL'?'✦':card.kind==='RESOURCE'?'⚡':'⚔';
function refresh(){try{state=readCollection();return true;}catch(error){notice=error.message;state=null;return false;}}
function top(){
 return `<header class="cc-head"><div><div class="kicker">RIFT DIRECTOR · CARD GAME 0.9.0</div><h1 class="cc-heading">EL <span>ARCHIVO</span> DEL VÍNCULO</h1><p class="small">Colección local · sobres de prueba · ninguna compra real</p></div>
 <div class="cc-nav"><a class="btn minor" href="./card-game.html">⚔ Jugar</a><a class="btn minor" href="./deck-builder.html">✦ Mis mazos</a></div></header>`;
}
function stats(){
 const progress=collectionProgress(state);
 return `<div class="cc-stats"><div class="cc-stat"><strong>◈ ${state.coins}</strong><span>Monedas del Vínculo</span></div>
 <div class="cc-stat"><strong>✦ ${state.fragments}</strong><span>Fragmentos para fabricar</span></div>
 <div class="cc-stat"><strong>${progress.distinct}/${progress.total}</strong><span>Cartas distintas obtenidas</span></div>
 <div class="cc-stat"><strong>${state.opened}</strong><span>Sobres abiertos</span></div></div>`;
}
function cardsInPack(){
 if(!results)return '';
 if(reveal>=results.cards.length){
   return `<div class="cc-finish"><div class="kicker">SOBRE DEL VÍNCULO</div><h3>¡Cinco cartas reveladas!</h3>
    <p class="small">Las cartas nuevas están en tu colección. Los duplicados al límite se transformaron en fragmentos.</p>
    <div class="cc-earned">+${results.cards.reduce((n,c)=>n+c.fragments,0)} fragmentos por duplicados${results.bonus?' · +'+results.bonus+' monedas por primer sobre':''}</div>
    <div class="cc-reveal-actions"><button class="btn primary" data-action="finish">Ver colección</button>
    <button class="btn" data-action="again" ${state.coins<PACK_PRICE?'disabled':''}>Abrir otro sobre</button></div></div>`;
 }
 const card=results.cards[reveal],rarity=RARITIES[card.rarity]?.name||card.rarity;
 return `<div class="cc-reveal" aria-live="polite"><div class="cc-reveal-counter">Carta ${reveal+1} de ${results.cards.length}</div>
 <div class="cc-reveal-card ${card.rarity}" key="${reveal}"><div class="cc-rarity">${escape(rarity)}</div>
 <span class="cc-big-symbol" aria-hidden="true">${glyph(card)}</span><strong>${escape(card.name)}</strong>
 <span class="cc-reveal-desc">${card.kind==='CHARACTER'?'Riftborn · Personaje':'Carta táctica'}</span>
 <span class="cc-duplicate">${card.duplicate?'Duplicado · +'+card.fragments+' fragmentos':'Nueva copia para tu colección'}</span></div>
 <div class="cc-reveal-actions"><button class="btn primary" data-action="reveal">${reveal===results.cards.length-1?'Finalizar apertura':'Siguiente carta'} →</button>
 <button class="btn minor" data-action="skip">Revelar todas</button></div></div>`;
}
function packPanel(){
 const odds=previewOdds();
 return `<section class="cc-panel"><h2>Sobre del Vínculo</h2><p>Cada sobre contiene 5 cartas: 3 comunes, 1 poco común o superior y 1 rara o superior. Las probabilidades se muestran antes de abrir.</p>
 <div class="cc-pack-wrap">${results?cardsInPack():`<div class="cc-pack"><small>RIFT DIRECTOR</small><span>✧</span><strong>EL VÍNCULO</strong><small>5 CARTAS</small></div>
 <button class="btn primary cc-open-button" data-action="open" ${state.coins<PACK_PRICE?'disabled':''}>◈ Abrir sobre · ${PACK_PRICE} monedas</button>
 <span class="cc-pack-foot">${state.coins<PACK_PRICE?'Juega partidas contra el bot para conseguir más monedas.':'Colección permanente en este navegador'}</span>`}</div>
 <div class="cc-odds"><strong class="kicker">PROBABILIDADES POR POSICIÓN</strong><p>${escape(odds.common)}</p><p>${escape(odds.uncommon)}</p><p>${escape(odds.rare)}</p><p>Se priorizan copias que todavía te falten dentro de la rareza seleccionada. Si ya tienes el máximo, el duplicado da fragmentos.</p></div></section>`;
}
function helpPanel(){
 return `<section class="cc-panel"><h2>Juega, colecciona, construye</h2>
 <p>Al empezar recibes 200 monedas y los dos mazos de bienvenida: Asedio y Jungla. Conservamos las cartas de tus mazos personalizados ya guardados.</p>
 <div class="cc-odds"><strong class="kicker">RECOMPENSAS CONTRA EL BOT</strong>
 <p>Victoria: <strong>40 monedas</strong>. Derrota: <strong>25 monedas</strong>. Empate: <strong>30 monedas</strong>.</p>
 <p>Primer combate completado: +50 monedas adicionales. Primera victoria: +75 monedas. Primer sobre: +25 monedas.</p>
 <p>Los duelos locales entre dos personas no generan monedas. Las monedas y los fragmentos son virtuales y no se pueden comprar con dinero real.</p>
 <p>Fabricar cartas consume fragmentos. Común: 20, Poco común: 45, Rara: 90, Épica: 180, Legendaria: 360.</p></div>
 <p style="margin-top:12px">Tus cartas, sobres y monedas se guardan únicamente en este dispositivo y navegador. No se sincronizan con otras cuentas. Puedes seguir jugando con los mazos preconstruidos gratuitos.</p>
 <div class="cc-nav" style="margin-top:13px"><a class="btn primary" href="./card-game.html">Ir a jugar</a><a class="btn" href="./deck-builder.html">Construir mazo</a></div></section>`;
}
function cardTile(c){
 const owned=ownedCount(state,c.id),max=maxCopies(c.id),canCraft=owned<max&&state.fragments>=CRAFT_COSTS[c.rarity];
 const desc=CHARACTER_BY_ID[c.id]?TRAITS[c.trait]?.description:c.description;
 return `<article class="cc-card ${c.rarity} ${owned?'':'locked'}">
 <div class="cc-card-head"><span class="cc-rarity">${escape(RARITIES[c.rarity]?.name||c.rarity)}</span><span class="cc-symbol" aria-hidden="true">${glyph(c)}</span></div>
 <h3>${escape(c.name)}</h3><p>${escape(desc||'')}</p>
 <div class="cc-card-tail"><small>${owned}/${max} copias</small>
 <button data-craft="${escape(c.id)}" ${canCraft?'':'disabled'} title="${owned>=max?'Colección completa': 'Fabricar una copia'}">${owned>=max?'Completa':'✦ '+CRAFT_COSTS[c.rarity]}</button></div></article>`;
}
function catalogPanel(){
 const cards=fullCatalog().filter(c=>(filter==='ALL'||filter==='OWNED'&&ownedCount(state,c.id)>0||
 filter==='MISSING'&&ownedCount(state,c.id)<maxCopies(c.id)||
 filter==='HERO'&&Boolean(CHARACTER_BY_ID[c.id])||filter==='TACTIC'&&!CHARACTER_BY_ID[c.id])&&
 (search===''||[c.name,c.description||'',c.rarity].join(' ').toLowerCase().includes(search.toLowerCase())));
 const tabs=[['ALL','Todas'],['OWNED','Obtenidas'],['MISSING','Por conseguir'],['HERO','Riftborn'],['TACTIC','Tácticas']];
 return `<section class="cc-panel cc-collection"><h2>Archivo de cartas</h2><p>Las cartas sin copias aparecen bloqueadas para construir mazos, pero puedes fabricarlas con fragmentos. Las rarezas indican disponibilidad, no superioridad automática.</p>
 <div class="cc-toolbar">${tabs.map(([k,label])=>`<button class="cc-filter ${filter===k?'active':''}" data-filter="${k}" aria-pressed="${filter===k}">${label}</button>`).join('')}
 <input id="cc-search" class="cc-search" placeholder="Buscar carta…" value="${escape(search)}" aria-label="Buscar colección"></div>
 <div class="cc-grid" id="cc-grid">${cards.length?cards.map(cardTile).join(''):'<div class="cc-empty">No hay cartas con ese filtro.</div>'}</div></section>`;
}
function render(){
 if(!state){
  root.innerHTML=top()+'<div class="cc-notice" role="alert">'+escape(notice||'Colección no disponible.')+'</div>';
  return;
 }
 root.innerHTML=top()+(notice?`<div class="cc-notice" role="status">${escape(notice)}</div>`:'')+stats()+
 `<div class="cc-layout">${packPanel()}${helpPanel()}${catalogPanel()}</div>`;
}
function attempt(fn){
 try{fn();notice='';refresh();}
 catch(error){notice=error?.message||'No se pudo completar la acción.';}
 render();
}
function open(){
 attempt(()=>{results=openPack();reveal=0;});
}
root.addEventListener('click',event=>{
 const target=event.target.closest('button');
 if(!target)return;
 const action=target.dataset.action;
 if(action==='open'||action==='again'){open();return;}
 if(action==='reveal'){reveal++;notice='';render();return;}
 if(action==='skip'){reveal=results?.cards.length||0;notice='';render();return;}
 if(action==='finish'){results=null;reveal=0;notice='';render();return;}
 if(target.dataset.filter){filter=target.dataset.filter;notice='';render();return;}
 if(target.dataset.craft){
  const id=target.dataset.craft;
  attempt(()=>{const item=craftCard(id);notice='';return item;});
  if(state)notice='Carta fabricada. Ya puedes añadirla a un mazo.';
  render();
 }
});
root.addEventListener('input',event=>{
 if(event.target.id!=='cc-search')return;
 search=event.target.value;
 // Update only the catalog so search focus remains in place.
 const c=document.getElementById('cc-grid');
 if(c&&state){
  const temp=document.createElement('div');
  temp.innerHTML=catalogPanel();
  c.innerHTML=temp.querySelector('#cc-grid').innerHTML;
 }
});
refresh();render();
