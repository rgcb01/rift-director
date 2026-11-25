import {renderCardFace,renderCardArt,installArtFallback} from './card-renderer.mjs';
import {planDrop} from './drag-rules.mjs';
import {TUTORIAL_LESSONS,tutorialStep,tutorialAllows,tutorialCompletedStep,createTutorialMatch} from './tutorial.mjs';
import {createMatch, playCard, activate, passTurn, chooseKeep, LANES, OBJECTIVES, combatAttack} from './engine.mjs';
import {STARTER_DECKS, EFFECT_NAMES} from './starter-decks.mjs';
import {botStep} from './simple-bot.mjs';
import {aiStep,AI_LEVELS,AI_STYLES} from './tactical-ai.mjs';
import {TRAITS} from './catalog.mjs';
import {listPlayableChoices,loadPlayable,readSelection,writeSelection} from './deck-library.mjs';
import {readCollection,awardMatch,MATCH_COINS} from './collection.mjs';

const app=document.getElementById('card-game-app');
installArtFallback(app);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelSide=s=>s===0?'Azul':'Rojo';
let mode=null,match=null,coin=null,selectedCard=null,selectedUnit=null,rotateSource=null,selectedObjective=null,curtain=false,notice='';
let deckChoices=readSelection();
let botDifficulty='tactical',botStyle='balanced';
let currentMatchId=null,matchReward=null;
let focusLane='MID',lastRenderedMatch=null,lastRenderedSide=null,handCollapsed=false;
let tutorial=null,logOpen=false,activeDrag=null,hoverDrop=null;
const desktopCanDrag=()=>Boolean(window.matchMedia?.('(min-width: 961px) and (pointer: fine)').matches);
function title(){return '<div class="topbar"><div><div class="kicker">CARD GAME · V0.9.2C · TABLERO TÁCTICO</div><div class="wordmark">RIFT <span>DIRECTOR</span></div></div><div class="nav-actions">'+(match?'<button class="btn smallbtn minor log-toggle" data-act="toggle-log" aria-expanded="'+logOpen+'" aria-controls="game-help">☷ Reglas y registro</button>':'<a class="btn smallbtn minor" href="./deck-builder.html">✦ Mis mazos</a><a class="btn smallbtn minor" href="./collection.html">◈ Sobres</a>')+'<button class="btn smallbtn minor" data-act="reset">Nueva partida</button></div></div>';}
function deckSelectors(){
 const choices=listPlayableChoices();
 return '<div class="deck-selectors">'+[0,1].map(side=>{
  const chosen=deckChoices[side];
  return '<div class="deck-pick"><label for="side-deck-'+side+'">'+(side===0?'TU MAZO (AZUL)':'MAZO RIVAL (ROJO)')+'</label>'+
   '<select class="deck-select" id="side-deck-'+side+'" data-deck-side="'+side+'" aria-label="Seleccionar mazo '+(side+1)+'">'+
   choices.map(d=>'<option value="'+escape(d.id)+'" '+(chosen===d.id?'selected':'')+'>'+escape(d.name)+'</option>').join('')+
   '</select></div>';
 }).join('')+'</div>';
}
function botSettings(){
 const select=(field,options,selected)=>'<select class="deck-select" data-ai="'+field+'" aria-label="'+(field==='difficulty'?'Dificultad':'Estrategia')+' del bot">'+
   Object.entries(options).map(([id,def])=>'<option value="'+id+'" '+(id===selected?'selected':'')+'>'+escape(def.name)+'</option>').join('')+'</select>';
 return '<div class="bot-settings"><div class="bot-option"><label>IA DEL RIVAL</label>'+
   select('difficulty',AI_LEVELS,botDifficulty)+'</div><div class="bot-option"><label>ESTRATEGIA DEL RIVAL</label>'+
   select('style',AI_STYLES,botStyle)+'</div></div>';
}
function intro(){
 return `${title()}<div class="intro"><section class="intro-hero"><div class="kicker">Domina la Convergencia</div><h1>Tres carriles.<br>Cuatro jugadas.<br>Una decisión decisiva.</h1><p>Dirige cinco Riftborn, defiende tus torres y abre camino hacia el Nexo rival. Todo el combate se resuelve con cartas, posiciones y presión.</p><div class="pill">5 personajes · 20 tácticas · 6 cartas en mano</div></section>${deckSelectors()}${botSettings()}<div class="intro-menu"><button class="mode tutorial-entry" data-setup="tutorial"><strong>✦ Aprende jugando</strong><small>Cinco lecciones cortas. Conoce una mecánica, practícala y descubre la siguiente. Rival pasivo y sin gastar monedas.</small></button><button class="mode" data-setup="bot"><strong>⚔ Contra un bot</strong><small>Enfrenta tu mazo contra un bot de dificultad y estrategia configurables. No conoce tu mano.</small></button><button class="mode" data-setup="hotseat"><strong>♟ Dos jugadores locales</strong><small>Alternad jugadas en el mismo dispositivo. La mano se oculta al pasar de jugador.</small></button></div><p class="small">Versión de pruebas: ya puedes disputar el Latido (R4) y el Coloso (R8) con cartas de Caza. Abre sobres con monedas ganadas contra el bot, fabrica cartas con fragmentos y crea nuevas estrategias en tu colección.</p></div>`;
}
function coinScreen(){
 const winner=coin.winner, botWon=coin.mode==='bot'&&winner===1;
 const winnerText=coin.mode==='bot'?(winner===0?'Ganaste el volado':'El bot ganó el volado'):('El jugador '+labelSide(winner)+' ganó el volado');
 const buttons=botWon?'<button class="btn primary" data-first="1">Comenzar: el bot primero</button>':
  `<button class="btn primary" data-first="${winner}">Elegir jugar primero</button><button class="btn" data-first="${1-winner}">Jugar segundo (+1 energía en R1)</button>`;
 return `${title()}<section class="result"><span class="coin">◉</span><div class="kicker">Sorteo inicial</div><h2>${winnerText}</h2><p class="small">El segundo jugador recibe +1 energía durante la primera ronda. Después la prioridad alterna cada ronda.</p><div class="choices">${buttons}</div></section>`;
}
function healthTrack(hp,max){
 const pct=Math.max(0,Math.min(100,Number(hp)/Math.max(1,Number(max))*100));
 return `<span class="health-track" aria-hidden="true" style="--health:${pct}%"></span>`;
}
function sideBanner(side,isEnemy){
 const p=match.players[side];
 return `<div class="side-banner ${isEnemy?'enemy':''}"><strong>${isEnemy?'RIVAL':'TÚ'} · ${escape(p.name)}</strong><span class="nexus ${side===0?'blue':'red'}">◈ NEXO ${p.nexus}/12${healthTrack(p.nexus,12)}</span><span>⚡ ${p.energy}</span></div>`;
}
function canTargetUnit(u,owner){
 if(!selectedCard||!match||match.phase!=='tactics')return false;
 const selected=match.players[match.turn].hand.find(c=>c.uid===selectedCard);
 if(!selected||u.status!=='active')return false;
 switch(selected.effect.type){
  case 'IMPACT':return owner!==match.turn;
  case 'HEAL':case 'BACK':return owner===match.turn;
  case 'ROTATE':return owner===match.turn&&u.role!=='JUN';
  default:return false;
 }
}
function zoneUnit(u,owner,isEnemy){
 return `<button class="unit ${isEnemy?'enemy':''} ${u.tapped?'tapped':''} ${selectedUnit===u.id?'active-target':''} ${canTargetUnit(u,owner)?'can-target':''}" title="${escape(characterName(u))} · ${escape(TRAITS[u.trait]?.description||'')} · ${u.hp}/${u.maxHp} PV · ${u.tapped?'Agotado':'Disponible'}" data-unit="${escape(u.id)}" data-owner="${owner}" draggable="${desktopCanDrag()&&owner===match.turn&&match.phase==='tactics'&&!curtain}">${renderCardFace(u.code,{variant:'board',attack:combatAttack(u,match.round),hp:u.hp,maxHp:u.maxHp})}${healthTrack(u.hp,u.maxHp)}</button>`;
}
function characterName(u){return u.name || u.code;}
function laneSlot(side,lane,rank,isEnemy){
 const units=match.players[side].characters.filter(u=>u.status==='active'&&u.lane===lane&&u.rank===rank);
 return `<div class="row-slot ${rank}" data-slot="${lane}" data-rank="${rank}" data-owner="${side}"><span class="slot-label">${rank==='front'?'ATAQUE':'FARM'}</span>${units.length?units.map(u=>zoneUnit(u,side,isEnemy)).join(''):`<span class="empty">${rank==='front'?'·':'—'}</span>`}</div>`;
}
function tower(side,lane){
 const hp=match.players[side].towers[lane];
 return `<button class="tower ${hp===0?'open':''}" data-lane="${lane}" title="Elegir carril ${lane}"><span>${hp>0?'♜ Torre':'⚑ BRECHA'}</span><strong>${hp}/6</strong>${healthTrack(hp,6)}</button>`;
}
function laneColumn(side,lane,isEnemy){
 return `<div class="lane ${isEnemy?'enemy':''} ${focusLane===lane?'focus-active':''}" data-lane-column="${lane}" data-owner="${side}"><div class="lane-name">${lane}<button class="lane-focus-btn" type="button" data-assign-lane="${lane}" title="Dirigir la bonificación del Latido a ${lane}" aria-label="Seleccionar ${lane} para la recompensa del Latido" aria-pressed="${focusLane===lane}">◎</button></div>${isEnemy?`${tower(side,lane)}${laneSlot(side,lane,'rear',isEnemy)}${laneSlot(side,lane,'front',isEnemy)}`:`${laneSlot(side,lane,'front',isEnemy)}${laneSlot(side,lane,'rear',isEnemy)}${tower(side,lane)}`}</div>`;
}
function jungle(side,isEnemy){
 const u=match.players[side].characters.find(u=>u.role==='JUN');
 return `<div class="jungle"><div class="jungle-label">♧ JUNGLA ${isEnemy?'RIVAL':'PROPIA'}</div>${u.status==='active'?zoneUnit(u,side,isEnemy):`<span class="empty">Jungla vacía · ${u.outReason==='death'?'Muerto':'Back'}</span>`}</div>`;
}
function reserve(side){
 const units=match.players[side].characters.filter(u=>u.status!=='active');
 if(!units.length)return '';
 return `<div class="reserve">${units.map(u=>`<span class="reserve-unit ${u.status==='dead'?'dead':''}">▨ ${escape(characterName(u))} · ${u.status==='dead'?'MUERTO':'BACK'} · vuelve R${u.readyRound}</span>`).join('')}</div>`;
}
function enemyBacks(side){
 const cards=match.players[side].hand.length;
 return `<div class="hand-backs" aria-label="El rival tiene ${cards} cartas ocultas">${Array.from({length:cards},()=>'<span class="back-card">✧</span>').join('')}${cards===0?'<span class="small">Sin cartas</span>':''}</div>`;
}
function neutralZone(){
 const pieces=Object.entries(OBJECTIVES).map(([id,definition])=>{
   const objective=match.objectives[id];
   const status=objective.claimedBy!==null?'Conquistado por '+labelSide(objective.claimedBy):
     objective.active?'DISPONIBLE':'Desbloquea R'+definition.unlock;
   const pressure=match.players.map(p=>p.objectivePressure[id]);
   const reward=id==='minor'?'+1 presión permanente al carril elegido':
     '+1 presión en todos los carriles y +1 asedio inicial, durante 3 rondas';
   return `<button class="objective-tile ${objective.active?'available':''} ${selectedCard&&selectedObjective===id?'selected':''}" data-objective="${id}" ${objective.active?'':'disabled'}><span class="objective-symbol">${id==='minor'?'✧':'♛'}</span><span class="objective-title">${escape(definition.name)}</span><span class="objective-state">${escape(status)}</span><span class="objective-score">Azul ${pressure[0]} · ${pressure[1]} Rojo</span><span class="objective-reward">${escape(reward)}</span></button>`;
 }).join('');
 return `<div class="neutral"><strong>✧ CONVERGENCIA · OBJETIVOS NEUTRALES</strong><div class="objective-grid">${pieces}</div><span>Para conquistarlos: 4+ presión neutral y ventaja de 2. Caza consume jugada y energía.</span></div>`;
}
function laneNavigator(viewSide){
 const me=match.players[viewSide],enemy=match.players[1-viewSide];
 return '<nav class="lane-navigator" aria-label="Seleccionar carril">'+LANES.map(lane=>{
  const mine=me.characters.filter(u=>u.status==='active'&&u.lane===lane&&u.rank==='front').length;
  const theirs=enemy.characters.filter(u=>u.status==='active'&&u.lane===lane&&u.rank==='front').length;
  const attackLane=me.towers[lane],enemyLane=enemy.towers[lane],focus=focusLane===lane;
  return `<button class="focus-tab ${focus?'active':''}" data-focus-lane="${lane}" aria-pressed="${focus}" aria-label="Ver carril ${lane}, mi torre ${attackLane} de 6, torre rival ${enemyLane} de 6">
   <strong>${lane}</strong><span>♜ ${enemyLane}/6 ↑</span><span>♜ ${attackLane}/6 ↓</span>
   <small>${mine} propio${mine===1?'':'s'} · ${theirs} rival${theirs===1?'':'es'}</small></button>`;
 }).join('')+'</nav>';
}
function board(viewSide){
 const rival=1-viewSide;
 return `<div class="field">${laneNavigator(viewSide)}<div class="board-side enemy">${sideBanner(rival,true)}${enemyBacks(rival)}${reserve(rival)}${jungle(rival,true)}<div class="lanes">${LANES.map(l=>laneColumn(rival,l,true)).join('')}</div></div>${neutralZone()}<div class="board-side"><div class="lanes">${LANES.map(l=>laneColumn(viewSide,l,false)).join('')}</div>${jungle(viewSide,false)}<button class="board-base-drop" data-base-drop="${viewSide}" aria-label="Regresar a base: suelta un Riftborn propio">⌂ BASE <small>Suelta aquí un Riftborn para recuperar PV</small></button>${sideBanner(viewSide,false)}${reserve(viewSide)}</div></div>`;
}
function prompt(viewSide){
 const current=match.turn===viewSide;
 if(!current||match.phase!=='tactics')return '<div class="panel"><h3>Estado del combate</h3><p>Se resuelve una jugada por turno. Ninguna carta interrumpe gratis y todos los efectos consumen una de tus cuatro jugadas.</p></div>';
 if(selectedCard){
   const card=match.players[viewSide].hand.find(c=>c.uid===selectedCard);
   if(!card){selectedCard=null;return '';}
   const t=card.effect.type;
   const label=t==='ROTATE'?(rotateSource?'Ahora selecciona la columna de destino':'Elige un personaje aliado para rotarlo'):
    t==='BACK'?'Elige el personaje que regresará a base':
    t==='IMPACT'?'Elige un personaje enemigo como objetivo':
    t==='HEAL'?'Elige un personaje aliado al que curar':
    t==='HUNT'?(selectedObjective==='minor'?'¿Qué carril recibirá +1 de presión permanente?':'Toca un objetivo disponible en el centro del tablero'):
    'Toca TOP, MID o BOT como destino';
   const wantsLane=['PRESSURE','GUARD','GANK','DIVE','SABOTAGE'].includes(t) ||
     (t==='ROTATE'&&rotateSource) || (t==='HUNT'&&selectedObjective==='minor');
   const laneActions=wantsLane?LANES.map(l=>`<button class="btn target-lane" data-lane="${l}">Usar en ${l}</button>`).join(''):'';
   const objectives=t==='HUNT'&&!selectedObjective?
     Object.entries(OBJECTIVES).filter(([id])=>match.objectives[id].active)
       .map(([id,def])=>`<button class="btn target-lane" data-objective="${id}">${escape(def.name)}</button>`).join(''):'';
   const needsUnit=['IMPACT','HEAL','BACK'].includes(t)||(t==='ROTATE'&&!rotateSource);
   const hint=needsUnit?'<span class="selection-hint">Toca un personaje resaltado. Cambia de carril con las pestañas.</span>':'';
   return `<section class="panel prompt" aria-label="Preparar acción"><div class="selected-card-detail">${renderCardArt(card.id,{compact:true,full:true,eager:true})}<div><h3>${escape(card.name)} <span class="card-preview-cost">⚡ ${card.cost}</span></h3><p class="card-effect-text">${escape(card.description)}</p></div></div><p><strong>${escape(label)}</strong></p><div class="prompt-btns">${laneActions}${objectives}${hint}<button class="btn smallbtn minor" data-act="cancel">Cancelar</button></div></section>`;
 }
 if(selectedUnit){
   const u=match.players[viewSide].characters.find(u=>u.id===selectedUnit);
   if(u&&u.status==='active'){
     return `<section class="panel prompt"><h3>${escape(characterName(u))}</h3><p>${u.rank==='front'?'Adelante · combate':'Atrás · farmeo'} · ${u.tapped?'ya actuó':'disponible'} · ${u.hp}/${u.maxHp} PV.</p><div class="prompt-btns"><button class="btn smallbtn" data-order="SWAP_RANK" ${u.tapped?'disabled':''}>↕ Cambiar de fila</button><button class="btn smallbtn red" data-order="BACK" ${u.tapped?'disabled':''}>⌂ Back</button><button class="btn smallbtn minor" data-act="cancel">Cerrar</button></div></section>`;
   }
 }
 return '<section class="panel"><h3>Tu decisión</h3><p>Arrastra una carta desde tu mano hacia el carril, Riftborn u objetivo. Arrastra un aliado entre filas, hacia otro carril (requiere Rotación) o hacia la base. También puedes hacer clic para jugar con el teclado.</p></section>';
}
function logText(ev){
 const who=ev.side===undefined?'':labelSide(ev.side)+' · ';
 if(ev.type==='START')return 'Volado: '+labelSide(ev.firstPlayer)+' empieza.';
 if(ev.type==='ROUND')return 'Nueva ronda '+ev.round+'. Empieza '+labelSide(ev.firstPlayer)+'.';
 if(ev.type==='PLAY')return who+'juega '+(ev.name||ev.card)+'.';
 if(ev.type==='PASS')return who+'pasa.';
 if(ev.type==='ACTIVATE')return who+(ev.order==='SWAP_RANK'?'cambia de fila':'backea')+'.';
 if(ev.type==='BACK')return who+'personaje en base hasta R'+ev.readyRound+'.';
 if(ev.type==='DEATH')return who+'personaje derrotado; regresa R'+ev.readyRound+'.';
 if(ev.type==='HIT')return who+'recibe '+ev.amount+' de daño en combate.';
 if(ev.type==='PRESSURE')return ev.lane+': presión '+ev.blue+' vs '+ev.red+'.';
 if(ev.type==='TOWER_HIT')return who+'daña torre '+ev.lane+' por '+ev.amount+'.';
 if(ev.type==='NEXUS_HIT')return who+'daña Nexo por '+ev.amount+' desde '+ev.lane+'.';
 if(ev.type==='HEAL')return who+'recupera PV de un aliado ('+ev.hp+' PV restantes).';
 if(ev.type==='HUNT')return who+'Caza: '+ev.amount+' de presión neutral ('+(ev.objective==='minor'?'Latido':'Coloso')+')'+(ev.assisted?' con ayuda del jungla.':'.');
 if(ev.type==='OBJECTIVE_SPAWN')return 'Aparece '+OBJECTIVES[ev.objective].name+'.';
 if(ev.type==='OBJECTIVE_CONTEST')return 'Disputa '+OBJECTIVES[ev.objective].name+': '+ev.blue+'–'+ev.red+'. Nadie conquista.';
 if(ev.type==='OBJECTIVE_CAPTURE')return who+'conquista '+OBJECTIVES[ev.objective].name+(ev.lane?' (+1 permanente en '+ev.lane+').': ' (hasta ronda '+ev.majorUntil+').');
 if(ev.type==='LATE_POWER')return 'Escalado global: +'+ev.bonus+' ATQ en combates.';
 if(ev.type==='LATE_SIEGE')return 'Convergencia intensificada: asedio máximo '+ev.cap+' y mitigación frontal base '+ev.mitigation+'.';
 if(ev.type==='LATE_MOMENTUM')return 'Resonancia de Convergencia: +'+ev.bonus+' presión de asedio por carril con un Riftborn vivo delante.';
 if(ev.type==='TOWER_RETALIATION')return 'La torre responde con '+ev.amount+' de daño al atacante '+labelSide(ev.side)+'.';
 if(ev.type==='FINISH')return 'Fin de partida: '+(ev.winner==='draw'?'empate':'gana '+labelSide(ev.winner))+'.';
 return ev.type;
}
function bonusSummary(viewSide){
 const sides=[viewSide,1-viewSide];
 return sides.map(side=>{
   const p=match.players[side];
   const active=LANES.filter(l=>p.permanentPressure[l]>0).map(l=>l+' +'+p.permanentPressure[l]);
   const major=p.majorUntil>=match.round?' · Coloso hasta R'+p.majorUntil:'';
   return '<p>'+labelSide(side)+': Latido '+(active.join(', ')||'sin bonificación')+major+'</p>';
 }).join('');
}
function sidePanel(viewSide){
 const log=[...match.log].slice(-15).reverse();
 return `<aside class="sidebar ${logOpen?'is-open':''}" id="game-help" aria-label="Reglas y registro del combate"><button class="btn minor sidebar-close" data-act="toggle-log">Cerrar panel ×</button><div class="panel"><h3>Reglas rápidas</h3><p>Delante combate, atrás farmea. Las cartas giradas ya actuaron. Back: una ronda fuera; muerte: dos. Rompe una torre para abrir una ruta al Nexo.</p><div class="bonus-list">${bonusSummary(viewSide)}</div><details><summary>Ver más</summary><p>4 jugadas por jugador y ronda. Presión ganadora → daño a estructura. Las cartas de 0 energía también consumen jugada. Desde R5 hay 7 de energía base. ATQ +1 en R7 y +2 en R10; el asedio máximo sube en R12 (4) y R17 (5), y la mitigación frontal baja en R10 y R16. Desde R14/R18 los supervivientes delante suman +1/+2 presión adicional al carril. Caza disputa Latido o Coloso. Un jungla listo añade +2 presión neutral pero se agota.</p></details></div><div class="panel"><h3>Registro de combate</h3><div class="log">${log.map(e=>`<div class="logline"><span>R${e.round}</span> · ${escape(logText(e))}</div>`).join('')}</div></div></aside>`;
}
function handPanel(side){
 const p=match.players[side];
 const active=p.hand;
 return `<section class="hand-panel ${handCollapsed?'is-collapsed':''}" aria-label="Mano de cartas"><div class="hand-heading"><div><h2>✦ Mano · ${labelSide(side)}</h2><p class="small">${active.length} cartas · conserva hasta 2 para la siguiente ronda</p></div><div class="nav-actions"><button class="btn minor hand-toggle" data-act="toggle-hand" aria-expanded="${!handCollapsed}" aria-controls="hand-card-list">${handCollapsed?'▴ Ver cartas':'▾ Ocultar mano'}</button><span class="pill">⚡ ${p.energy} energía</span><span class="pill">${p.actions}/4 jugadas</span><button class="btn primary" data-act="pass" ${match.turn!==side?'disabled':''}>Pasar turno</button></div></div><div class="cards-scroll" id="hand-card-list" aria-label="Cartas disponibles, desliza horizontalmente">${active.map(c=>`<div class="hand-card"><button class="tactic ${c.kind} ${selectedCard===c.uid?'selected':''}" data-card="${escape(c.uid)}" draggable="${desktopCanDrag()&&p.energy>=c.cost&&match.turn===side&&match.phase==='tactics'}" ${(p.energy<c.cost||match.turn!==side)?'disabled':''}>${renderCardFace(c.id,{variant:'hand'})}</button><button class="keep-btn ${p.keep.includes(c.uid)?'kept':''}" data-keep="${escape(c.uid)}">${p.keep.includes(c.uid)?'★ Reservada':'☆ Reservar'}</button></div>`).join('')}${active.length===0?'<p class="small">No tienes cartas en la mano.</p>':''}</div></section>`;
}
function outcome(){
 if(match.phase!=='finished')return '';
 const earned=matchReward?.awarded?
   '<p class="reward-earned">◈ +'+matchReward.coins+' monedas por partida'+(matchReward.bonus?' · +'+matchReward.bonus+' por logros':'')+'</p>':
   mode==='hotseat'?'<p class="small">Modo local: no hay recompensas de monedas.</p>':'';
 return `<section class="result"><div class="coin">✦</div><div class="kicker">Convergencia terminada</div><h2>${match.winner==='draw'?'Empate':match.winner===0?'Gana Azul':'Gana Rojo'}</h2><p class="small">La partida terminó en la ronda ${match.round}. Puedes iniciar otra y probar una estrategia distinta.</p><div class="reward-line">${earned}</div><div class="choices"><button class="btn primary" data-act="reset">Nueva partida</button><a class="btn" href="./collection.html">◈ Abrir sobres</a></div></section>`;
}

function tutorialGuide(){
 if(mode!=='tutorial'||!tutorial)return '';
 const lesson=TUTORIAL_LESSONS[tutorial.lesson],step=tutorialStep(tutorial.lesson,tutorial.step);
 const progress='<div class="tutorial-chapters" aria-label="Progreso de lecciones">'+TUTORIAL_LESSONS.map((l,i)=>
   '<span class="tutorial-chapter '+(i<tutorial.lesson?'passed':i===tutorial.lesson?'current':'')+'" title="'+escape(l.title)+'" aria-label="Lección '+(i+1)+' de 5"></span>').join('')+'</div>';
 if(!step)return `<section class="tutorial-guide tutorial-done" data-tutorial-complete="true" aria-live="polite">
  <div class="tutorial-topline"><span class="kicker">✦ LECCIÓN ${tutorial.lesson+1}/${TUTORIAL_LESSONS.length} · COMPLETADA</span>${progress}</div>
  <h2>¡Bien! ${escape(lesson.title)}</h2><p>${tutorial.lesson===TUTORIAL_LESSONS.length-1?'Ya conoces las bases: tus Riftborn, las cartas, las rotaciones, los objetivos y el Nexo.':'Terminaste esta práctica. La siguiente introduce una nueva decisión y usa el mismo motor de combate.'}</p>
  <div class="tutorial-actions"><button class="btn primary" data-act="tutorial-next">${tutorial.lesson===TUTORIAL_LESSONS.length-1?'⚔ Jugar contra la IA':'Continuar · Lección '+(tutorial.lesson+2)}</button><button class="btn minor" data-act="tutorial-replay">Repetir lección</button><button class="btn minor" data-act="tutorial-exit">Salir</button></div></section>`;
 return `<section class="tutorial-guide" aria-label="Tutorial guiado" aria-live="polite">
  <div class="tutorial-topline"><span class="kicker">✦ LECCIÓN ${tutorial.lesson+1}/${TUTORIAL_LESSONS.length} · PASO ${tutorial.step+1}/${lesson.steps.length}</span>${progress}</div>
  <h2>${escape(step.title)}</h2><p>${escape(step.body)}</p>
  <details class="tutorial-tip"><summary>¿Por qué importa?</summary><p>${escape(step.tip)}</p></details>
  <div class="tutorial-actions"><button class="btn minor" data-act="tutorial-skip">Saltar lección</button><button class="btn minor" data-act="tutorial-exit">Salir del tutorial</button></div></section>`;
}
function startTutorial(lesson=0){
 tutorial={lesson,step:0};
 mode='tutorial';coin=null;curtain=false;match=createTutorialMatch(lesson);
 selectedCard=null;selectedUnit=null;rotateSource=null;selectedObjective=null;
 focusLane=lesson===0?'MID':lesson===3?'MID':'TOP';
 handCollapsed=false;currentMatchId=null;matchReward=null;
 driveBot();
 notice='Practica sin recompensas ni cambios a tu colección.';
 render();
}
function nextTutorialLesson(){
 if(!tutorial)return;
 if(tutorial.lesson+1>=TUTORIAL_LESSONS.length){
   tutorial=null;botDifficulty='rookie';setup('bot');return;
 }
 startTutorial(tutorial.lesson+1);
}
function recordTutorialAction(event){
 if(mode!=='tutorial'||!tutorial)return;
 const step=tutorialStep(tutorial.lesson,tutorial.step);
 if(!tutorialCompletedStep(step,event,match))return;
 const currentId=step.id;
 tutorial.step++;
 if(currentId==='rotation')focusLane='MID';
 if(!tutorialStep(tutorial.lesson,tutorial.step)){
   notice='Lección completada. Puedes repetirla o continuar.';
   handCollapsed=false;
 }else{
   notice='';
   handCollapsed=false;
 }
}
function tutorialIntent(el){
 const act=el.dataset.act;
 if(act==='cancel'||act==='toggle-hand')return {kind:act};
 if(act==='pass')return {kind:'pass'};
 if(el.dataset.focusLane)return {kind:'focus',lane:el.dataset.focusLane};
 if(el.dataset.card){
   const card=match.players[match.turn].hand.find(c=>c.uid===el.dataset.card);
   return {kind:'card',id:card?.id};
 }
 if(el.dataset.lane)return {kind:'lane',lane:el.dataset.lane};
 if(el.dataset.objective)return {kind:'objective',objective:el.dataset.objective};
 if(el.dataset.unit){
   const side=Number(el.dataset.owner);
   const unit=match.players[side]?.characters.find(u=>u.id===el.dataset.unit);
   return {kind:'unit',side,code:unit?.code};
 }
 if(el.dataset.order)return {kind:'order',order:el.dataset.order};
 return null;
}
function markTutorialTarget(){
 if(mode!=='tutorial'||!tutorial)return;
 const step=tutorialStep(tutorial.lesson,tutorial.step);
 if(!step)return;
 const p=match.players[0];
 const cardUid=id=>p.hand.find(c=>c.id===id)?.uid;
 const unitUid=id=>p.characters.find(u=>u.code===id)?.id;
 const q=(selector)=>selector?app.querySelectorAll(selector):[];
 const attr=(name,value)=>'['+name+'="'+value+'"]';
 let selectors=[];
 switch(step.id){
  case 'focus':selectors=['[data-focus-lane="TOP"]'];break;
  case 'swap':selectors=selectedUnit?['[data-order="SWAP_RANK"]']:[attr('data-unit',unitUid('hero-centinela'))];break;
  case 'pressure':case 'final-pressure':selectors=selectedCard?['.target-lane[data-lane="TOP"]']:[attr('data-card',cardUid('wave-push'))];break;
  case 'rotation':selectors=rotateSource?['.target-lane[data-lane="MID"]']:selectedCard?[attr('data-unit',unitUid('hero-centinela'))]:[attr('data-card',cardUid('rotation'))];break;
  case 'back':selectors=selectedUnit?['[data-order="BACK"]']:[attr('data-unit',unitUid('hero-arcanista'))];break;
  case 'hunt':selectors=selectedObjective?['.target-lane[data-lane="MID"]']:selectedCard?['[data-objective="minor"]']:[attr('data-card',cardUid('hunt'))];break;
  case 'resolve':case 'recovery':case 'capture':case 'win':selectors=['[data-act="pass"]'];break;
 }
 for(const selector of selectors)for(const target of q(selector)){
   target.classList.add('tutorial-target');
   if(target.matches('.tactic')){
     const scroll=target.closest('.cards-scroll');
     if(scroll){const left=target.closest('.hand-card').offsetLeft-scroll.offsetLeft;scroll.scrollLeft=Math.max(0,left-16);}
   }
 }
}
function game(){
 const view=mode==='hotseat'?match.turn:0;
 const p=match.players[view];
 const play=match.phase==='tactics'&&match.turn===view;
 return `${title()}${notice?`<div class="notice" role="status">${escape(notice)}</div>`:''}<div class="turn-strip"><div><div class="kicker">Ronda ${match.round}</div><strong>${match.phase==='finished'?'Partida terminada':'Turno '+labelSide(match.turn)} ${play?'· tu jugada':''}</strong></div><div class="turn-meta"><span class="pill">⚡ ${p.energy}</span><span class="pill">${p.actions}/4 jugadas</span></div><div class="turn-meta"><span class="pill">↔ ${mode==='bot'?'IA '+AI_LEVELS[botDifficulty].name+' · '+AI_STYLES[botStyle].name:'2 locales'}</span></div></div>${mode==='tutorial'?tutorialGuide():''}${outcome()}<div class="decision-dock">${prompt(view)}</div><div class="arena-layout">${board(view)}${sidePanel(view)}</div>${handPanel(view)}<footer class="layout-footer">Rift Director · Card Game prototype · Las partidas no afectan los guardados del antiguo manager.</footer>${curtain&&mode==='hotseat'&&match.phase==='tactics'?`<div class="pass-screen"><div class="pass-card"><div class="coin">✦</div><h2>Pasa el dispositivo</h2><p class="small">Es turno del jugador ${labelSide(match.turn)}. La mano se mostrará cuando esté listo.</p><button class="btn primary" data-act="reveal">Mostrar mi mano</button></div></div>`:''}`;
}
function render(){
 const currentSide=match?(mode==='hotseat'?match.turn:0):null;
 const oldScroll=match&&match===lastRenderedMatch&&currentSide===lastRenderedSide?
   app.querySelector('.cards-scroll')?.scrollLeft:0;
 app.innerHTML=match?game():coin?coinScreen():intro();
 const newScroll=app.querySelector('.cards-scroll');
 if(newScroll&&oldScroll)newScroll.scrollLeft=oldScroll;
 if(logOpen)app.querySelector('#game-help')?.classList.add('is-open');
 markTutorialTarget();
 lastRenderedMatch=match;
 lastRenderedSide=currentSide;
}
function setup(nextMode){
 mode=nextMode;
 coin={mode:nextMode,winner:Math.random()<.5?0:1};
 match=null;curtain=false;notice='';render();
}
function begin(firstPlayer){
 let decks;
 try{
   decks=deckChoices.map(id=>loadPlayable(id));
 }catch(err){mode=null;coin=null;notice=err.message;render();return;}
 match=createMatch(decks,{seed:(Math.random()*2147483647)|0||1,firstPlayer});
 focusLane='MID';handCollapsed=false;
 currentMatchId='match-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
 matchReward=null;
 coin=null;clearSelection();
 notice=`Volado listo: empieza ${labelSide(firstPlayer)}; ${labelSide(1-firstPlayer)} recibe +1 energía.`;
 curtain=mode==='hotseat'&&firstPlayer!==0;
 if(mode==='bot')driveBot();
 grantIfFinished();
 render();
}
function clearSelection(){selectedCard=null;selectedUnit=null;rotateSource=null;selectedObjective=null;}
function driveBot(){
 if(mode==='tutorial'){
   while(match&&match.phase==='tactics'&&match.turn===1)passTurn(match,1);
   return;
 }
 let limit=12;
 while(match&&match.phase==='tactics'&&match.turn===1&&limit-->0){
   if(botDifficulty==='rookie')botStep(match,1);
   else aiStep(match,1,{difficulty:botDifficulty,style:botStyle});
 }
 if(limit<=0)notice='Se detuvo el bot por límite de seguridad.';
}
function grantIfFinished(){
 if(!match||match.phase!=='finished'||mode!=='bot'||matchReward)return;
 const result=match.winner==='draw'?'draw':match.winner===0?'win':'loss';
 try{
   matchReward=awardMatch(currentMatchId,result);
 }catch(error){
   notice='La partida terminó, pero no se pudo guardar la recompensa: '+error.message;
 }
}
function perform(fn,event=null){
 if(!match||match.phase!=='tactics')return;
 const before=match.round,prior=match.turn;
 try{
   fn();
   recordTutorialAction(event);
   clearSelection();
   handCollapsed=false;
   if(mode!=='tutorial'||tutorialStep(tutorial?.lesson,tutorial?.step))notice=match.round!==before?`Ronda ${before} resuelta. Revisa las torres y el registro.`:'Jugada registrada.';
   if(mode==='bot'||mode==='tutorial')driveBot();
   grantIfFinished();
   if(mode==='hotseat'&&match.phase==='tactics'&&match.turn!==prior)curtain=true;
 }catch(err){notice=err?.message||'Jugada no válida.';}
 render();
}
function useCard(uid){
 if(match.phase!=='tactics')return;
 const side=match.turn, card=match.players[side].hand.find(c=>c.uid===uid);
 if(!card)return;
 selectedUnit=null;
 if(['ENERGY','DRAW'].includes(card.effect.type)){
   perform(()=>playCard(match,side,uid,{}),{kind:'card',id:card.id});return;
 }
 selectedCard=selectedCard===uid?null:uid;rotateSource=null;selectedObjective=null;
 if(selectedCard)handCollapsed=true;
 notice='';render();
}
function chooseLane(lane){
 if(!selectedCard)return;
 const side=match.turn;
 const card=match.players[side].hand.find(c=>c.uid===selectedCard);
 if(!card)return;
 const t=card.effect.type;
 if(['PRESSURE','GUARD','GANK','DIVE','SABOTAGE'].includes(t))perform(()=>playCard(match,side,selectedCard,{lane}),{kind:'card',id:card.id,lane});
 else if(t==='ROTATE'&&rotateSource)perform(()=>playCard(match,side,selectedCard,{unitId:rotateSource,lane}),{kind:'card',id:card.id,lane});
 else if(t==='HUNT'&&selectedObjective==='minor')perform(()=>playCard(match,side,selectedCard,{objective:'minor',lane}),{kind:'card',id:card.id,objective:'minor',lane});
}
function chooseObjective(id){
 if(!selectedCard){notice='Para disputar este objetivo, selecciona una carta de Caza.';render();return;}
 const card=match.players[match.turn].hand.find(c=>c.uid===selectedCard);
 if(card?.effect.type!=='HUNT'){notice='Este objetivo requiere una carta de Caza.';render();return;}
 if(!match.objectives[id]?.active){notice='Este objetivo aún no está disponible.';render();return;}
 if(id==='minor'){
   selectedObjective='minor';notice='Elige el carril que recibirá la recompensa si ganas la disputa.';render();return;
 }
 perform(()=>playCard(match,match.turn,selectedCard,{objective:'major'}),{kind:'card',id:card.id,objective:'major'});
}
function pickUnit(owner,uid){
 const side=match.turn;
 const unit=match.players[owner].characters.find(u=>u.id===uid);
 if(!unit||unit.status!=='active')return;
 if(selectedCard){
   const card=match.players[side].hand.find(c=>c.uid===selectedCard);
   if(!card)return;
   const type=card.effect.type;
   if(type==='IMPACT'&&owner!==side)perform(()=>playCard(match,side,selectedCard,{unitId:uid}),{kind:'card',id:card.id});
   else if(type==='HEAL'&&owner===side)perform(()=>playCard(match,side,selectedCard,{unitId:uid}),{kind:'card',id:card.id});
   else if(type==='BACK'&&owner===side)perform(()=>playCard(match,side,selectedCard,{unitId:uid}),{kind:'card',id:card.id});
   else if(type==='ROTATE'&&owner===side&&unit.role!=='JUN'){
     rotateSource=uid;notice='Ahora selecciona el carril de destino.';render();
   }else if(['PRESSURE','GUARD','GANK','DIVE','SABOTAGE'].includes(type)&&LANES.includes(unit.lane)){
     chooseLane(unit.lane);
   }else{notice='Ese personaje no es un objetivo válido para esta carta.';render();}
   return;
 }
 if(owner!==side){notice=`${characterName(unit)} · ${unit.attack} ataque · ${unit.hp}/${unit.maxHp} PV.`;render();return;}
 selectedUnit=selectedUnit===uid?null:uid;notice='';render();
}

/* Desktop HTML drag-and-drop keeps the game's authoritative engine as its
   only execution path. Click/keyboard controls remain valid alternatives. */
function dropDescription(node){
 if(node.matches('.board-base-drop'))return {kind:'base',side:Number(node.dataset.baseDrop)};
 if(node.matches('.objective-tile'))return {kind:'objective',objective:node.dataset.objective};
 if(node.matches('.unit[data-unit]'))return {kind:'unit',side:Number(node.dataset.owner),uid:node.dataset.unit};
 if(node.matches('.row-slot'))return {kind:'row',side:Number(node.dataset.owner),lane:node.dataset.slot,rank:node.dataset.rank};
 if(node.matches('.lane'))return {kind:'lane',side:Number(node.dataset.owner),lane:node.dataset.laneColumn};
 if(node.matches('.field'))return {kind:'board'};
 return null;
}
function tutorialPermitsDrop(plan){
 if(!plan)return false;
 if(mode!=='tutorial')return true;
 const step=tutorialStep(tutorial?.lesson,tutorial?.step);
 if(!step)return false;
 if(plan.kind==='activate')return tutorialAllows(step,{kind:'order',order:plan.order});
 if(plan.kind==='select-rotation'){
  const unit=match.players[match.turn].characters.find(u=>u.id===plan.unitId);
  return tutorialAllows(step,{kind:'card',id:plan.cardId})&&
   tutorialAllows(step,{kind:'unit',side:match.turn,code:unit?.code});
 }
 if(plan.kind==='play'){
  if(!tutorialAllows(step,{kind:'card',id:plan.cardId}))return false;
  if(plan.target.lane&&!tutorialAllows(step,{kind:'lane',lane:plan.target.lane}))return false;
  if(plan.target.objective&&!tutorialAllows(step,{kind:'objective',objective:plan.target.objective}))return false;
  return true;
 }
 return false;
}
function plannedDrop(source,node){
 const destination=dropDescription(node);
 const plan=destination&&planDrop(match,source,destination,{focusLane,selectedCardUid:selectedCard});
 return tutorialPermitsDrop(plan)?plan:null;
}
function validDropFor(target){
 let el=target?.nodeType===1?target:target?.parentElement;
 while(el&&el!==app){
  if(el.matches?.('.board-base-drop,.objective-tile,.unit[data-unit],.row-slot,.lane,.field')){
   const plan=plannedDrop(activeDrag,el);
   if(plan)return {element:el,plan};
  }
  el=el.parentElement;
 }
 return null;
}
function clearDrag(){
 app.classList.remove('dragging-active');
 app.querySelectorAll('.drop-valid,.drop-hover,.dragging-card,.dragging-unit').forEach(el=>
  el.classList.remove('drop-valid','drop-hover','dragging-card','dragging-unit'));
 activeDrag=null;hoverDrop=null;
}
function beginDrag(event){
 if(!desktopCanDrag()||!match||match.phase!=='tactics'||curtain||match.turn!==(mode==='hotseat'?match.turn:0)){
  event.preventDefault();return;
 }
 const node=event.target.closest('button[data-card],button[data-unit]');
 if(!node||!app.contains(node)||node.disabled){event.preventDefault();return;}
 const isCard=Boolean(node.dataset.card);
 const source=isCard?{kind:'card',uid:node.dataset.card}:{kind:'unit',side:Number(node.dataset.owner),uid:node.dataset.unit};
 if(!isCard&&source.side!==match.turn){event.preventDefault();return;}
 if(mode==='tutorial'&&!tutorialStep(tutorial?.lesson,tutorial?.step)){event.preventDefault();return;}
 activeDrag=source;
 event.dataTransfer.effectAllowed='move';
 event.dataTransfer.setData('text/plain','RiftDirector:'+source.kind+':'+source.uid);
 node.classList.add(isCard?'dragging-card':'dragging-unit');
 app.classList.add('dragging-active');
 const candidates=isCard?app.querySelectorAll('.field,.lane,.unit[data-unit],.objective-tile'):
  app.querySelectorAll('.lane,.row-slot,.board-base-drop');
 for(const candidate of candidates){
  // Highlight only the actionable terminal surface, not its ancestor.
  if(candidate.matches('.field')&&isCard){
   const c=match.players[match.turn].hand.find(v=>v.uid===source.uid);
   if(!['ENERGY','DRAW'].includes(c?.effect.type))continue;
  }
  if(candidate.matches('.lane')&&isCard){
   const c=match.players[match.turn].hand.find(v=>v.uid===source.uid);
   if(!['PRESSURE','GUARD','GANK','DIVE','SABOTAGE'].includes(c?.effect.type))continue;
  }
  if(candidate.matches('.unit')&&isCard){
   const c=match.players[match.turn].hand.find(v=>v.uid===source.uid);
   if(!['IMPACT','HEAL','BACK','ROTATE'].includes(c?.effect.type))continue;
  }
  if(plannedDrop(source,candidate))candidate.classList.add('drop-valid');
 }
}
function finishDrop(plan){
 if(plan.kind==='select-rotation'){
  selectedCard=plan.uid;selectedUnit=null;rotateSource=plan.unitId;selectedObjective=null;
  handCollapsed=true;
  notice='Ahora arrastra ese Riftborn a otro carril, o elige un destino en el panel.';
  render();return;
 }
 if(plan.kind==='play'){
  perform(()=>playCard(match,match.turn,plan.uid,plan.target),
   {kind:'card',id:plan.cardId,...plan.target});
 }else if(plan.kind==='activate'){
  perform(()=>activate(match,match.turn,plan.unitId,plan.order),
   {kind:'order',order:plan.order});
 }
}
// Some desktop browser/scroll combinations can finish a mouse gesture without
// dispatching HTML5 drag events. Pointer fallback resolves the very same plan
// once the mouse moves enough; a plain click still follows the existing UI.
let pointerPending=null,suppressPointerClick=false;
app.addEventListener('pointerdown',event=>{
 if(event.button!==0||!desktopCanDrag()||!match||match.phase!=='tactics'||curtain||
   match.turn!==(mode==='hotseat'?match.turn:0))return;
 const node=event.target.closest('button[data-card],button[data-unit]');
 if(!node||node.disabled)return;
 const source=node.dataset.card?{kind:'card',uid:node.dataset.card}:
  {kind:'unit',side:Number(node.dataset.owner),uid:node.dataset.unit};
 if(source.kind==='unit'&&source.side!==match.turn)return;
 pointerPending={source,x:event.clientX,y:event.clientY,moved:false};
},true);
document.addEventListener('pointermove',event=>{
 if(!pointerPending||event.pointerType!=='mouse'||!(event.buttons&1))return;
 if(Math.hypot(event.clientX-pointerPending.x,event.clientY-pointerPending.y)>=9)
  pointerPending.moved=true;
},true);
document.addEventListener('pointerup',event=>{
 const pending=pointerPending;pointerPending=null;
 if(!pending?.moved||event.button!==0||!match||!desktopCanDrag())return;
 // Native dragstart already owns the gesture when available.
 if(activeDrag)return;
 activeDrag=pending.source;
 const target=validDropFor(document.elementFromPoint(event.clientX,event.clientY)||event.target);
 const plan=target?.plan;
 clearDrag();
 if(plan)finishDrop(plan);
 // Prevent a dragged button from also firing its click action.
 suppressPointerClick=true;
 setTimeout(()=>{suppressPointerClick=false;},0);
},true);
document.addEventListener('pointercancel',()=>{pointerPending=null;},true);
document.addEventListener('click',event=>{
 if(suppressPointerClick&&app.contains(event.target)){
  suppressPointerClick=false;event.preventDefault();event.stopImmediatePropagation();
 }
},true);
app.addEventListener('dragstart',event=>{pointerPending=null;beginDrag(event);});
app.addEventListener('dragover',event=>{
 if(!activeDrag)return;
 const target=validDropFor(event.target);
 if(hoverDrop!==target?.element){
  hoverDrop?.classList.remove('drop-hover');
  hoverDrop=target?.element||null;
  hoverDrop?.classList.add('drop-hover');
 }
 if(target){event.preventDefault();event.dataTransfer.dropEffect='move';}
});
app.addEventListener('drop',event=>{
 if(!activeDrag)return;
 const target=validDropFor(event.target);
 if(target)event.preventDefault();
 const plan=target?.plan;
 clearDrag();
 if(plan)finishDrop(plan);
});
app.addEventListener('dragend',clearDrag);
app.addEventListener('change',event=>{
 const ai=event.target.closest('[data-ai]');
 if(ai&&!match&&!coin){
   if(ai.dataset.ai==='difficulty'&&AI_LEVELS[ai.value])botDifficulty=ai.value;
   if(ai.dataset.ai==='style'&&AI_STYLES[ai.value])botStyle=ai.value;
   notice='';render();return;
 }
 const select=event.target.closest('[data-deck-side]');
 if(!select||match||coin)return;
 const side=Number(select.dataset.deckSide);
 if(![0,1].includes(side))return;
 const next=[...deckChoices];next[side]=select.value;
 try{writeSelection(next);deckChoices=next;notice='';}
 catch(err){notice=err.message;}
 render();
});
app.addEventListener('click',event=>{
 const el=event.target.closest('button');
 if(!el)return;
 if(el.dataset.setup==='tutorial'){startTutorial(0);return;}
 if(el.dataset.setup){tutorial=null;setup(el.dataset.setup);return;}
 if(el.dataset.first!==undefined){begin(Number(el.dataset.first));return;}
 const act=el.dataset.act;
 if(act==='reset'||act==='tutorial-exit'){tutorial=null;mode=null;match=null;coin=null;curtain=false;notice='';currentMatchId=null;matchReward=null;focusLane='MID';handCollapsed=false;logOpen=false;clearSelection();render();return;}
 if(act==='toggle-log'){logOpen=!logOpen;render();return;}
 if(mode==='tutorial'&&act==='tutorial-next'){nextTutorialLesson();return;}
 if(mode==='tutorial'&&act==='tutorial-replay'){startTutorial(tutorial.lesson);return;}
 if(mode==='tutorial'&&act==='tutorial-skip'){nextTutorialLesson();return;}
 if(act==='reveal'){curtain=false;render();return;}
 if(!match||curtain||match.phase==='finished')return;
 if(mode==='tutorial'){
   const step=tutorialStep(tutorial?.lesson,tutorial?.step);
   if(!tutorialAllows(step,tutorialIntent(el))){notice='Sigue el paso indicado en la guía para continuar.';render();return;}
 }
 if(act==='cancel'){clearSelection();handCollapsed=false;notice='';render();return;}
 if(act==='toggle-hand'){handCollapsed=!handCollapsed;render();return;}
 if(act==='pass'){perform(()=>passTurn(match,match.turn),{kind:'pass'});return;}
 if(el.dataset.focusLane){if(LANES.includes(el.dataset.focusLane)){focusLane=el.dataset.focusLane;notice='';recordTutorialAction({kind:'focus',lane:focusLane});render();}return;}
 if(el.dataset.assignLane){if(LANES.includes(el.dataset.assignLane)){focusLane=el.dataset.assignLane;notice='Latido del Vínculo: la bonificación irá a '+focusLane+'.';render();}return;}
 const view=mode==='hotseat'?match.turn:0;
 if(match.turn!==view)return;
 if(el.dataset.keep){
   const p=match.players[view],id=el.dataset.keep;
   const kept=p.keep.includes(id)?p.keep.filter(x=>x!==id):[...p.keep,id];
   try{chooseKeep(match,view,kept);notice='Cartas reservadas para la próxima ronda.';}catch(err){notice=err.message;}
   render();return;
 }
 if(el.dataset.card){useCard(el.dataset.card);return;}
 if(el.dataset.objective){chooseObjective(el.dataset.objective);return;}
 if(el.dataset.order&&selectedUnit){
   perform(()=>activate(match,view,selectedUnit,el.dataset.order),{kind:'order',order:el.dataset.order});return;
 }
 if(el.dataset.unit){pickUnit(Number(el.dataset.owner),el.dataset.unit);return;}
 if(el.dataset.lane){chooseLane(el.dataset.lane);return;}
});
render();
