import {createMatch, playCard, activate, passTurn, chooseKeep, LANES, OBJECTIVES, combatAttack} from './engine.mjs';
import {STARTER_DECKS, KIND_NAMES, EFFECT_NAMES} from './starter-decks.mjs';
import {botStep} from './simple-bot.mjs';
import {aiStep,AI_LEVELS,AI_STYLES} from './tactical-ai.mjs';
import {TRAITS} from './catalog.mjs';
import {listPlayableChoices,loadPlayable,readSelection,writeSelection} from './deck-library.mjs';

const app=document.getElementById('card-game-app');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconFor={PRESSURE:'⚔',GUARD:'◈',IMPACT:'✹',ENERGY:'⚡',DRAW:'✦',ROTATE:'↔',GANK:'✣',DIVE:'⌁',BACK:'⌂',HUNT:'☄',HEAL:'♥',SABOTAGE:'⚑'};
const labelSide=s=>s===0?'Azul':'Rojo';
let mode=null,match=null,coin=null,selectedCard=null,selectedUnit=null,rotateSource=null,selectedObjective=null,curtain=false,notice='';
let deckChoices=readSelection();
let botDifficulty='tactical',botStyle='balanced';
function title(){return '<div class="topbar"><div><div class="kicker">CARD GAME · PROTOTIPO 0.8.5</div><div class="wordmark">RIFT <span>DIRECTOR</span></div></div><div class="nav-actions"><span class="pill live">♧ Rework táctico</span><a class="btn smallbtn minor" href="./deck-builder.html">✦ Mis mazos</a><button class="btn smallbtn minor" data-act="reset">Nueva partida</button></div></div>';}
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
 return `${title()}<div class="intro"><section class="intro-hero"><div class="kicker">Domina la Convergencia</div><h1>Tres carriles.<br>Cuatro jugadas.<br>Una decisión decisiva.</h1><p>Dirige cinco Riftborn, defiende tus torres y abre camino hacia el Nexo rival. Todo el combate se resuelve con cartas, posiciones y presión.</p><div class="pill">5 personajes · 20 tácticas · 6 cartas en mano</div></section>${deckSelectors()}${botSettings()}<div class="intro-menu"><button class="mode" data-setup="bot"><strong>⚔ Contra un bot</strong><small>Enfrenta tu mazo contra un bot de dificultad y estrategia configurables. No conoce tu mano.</small></button><button class="mode" data-setup="hotseat"><strong>♟ Dos jugadores locales</strong><small>Alternad jugadas en el mismo dispositivo. La mano se oculta al pasar de jugador.</small></button></div><p class="small">Versión de pruebas: ya puedes disputar el Latido (R4) y el Coloso (R8) con cartas de Caza. Ya puedes construir y guardar mazos. Sobres y economía llegarán después.</p></div>`;
}
function coinScreen(){
 const winner=coin.winner, botWon=coin.mode==='bot'&&winner===1;
 const winnerText=coin.mode==='bot'?(winner===0?'Ganaste el volado':'El bot ganó el volado'):('El jugador '+labelSide(winner)+' ganó el volado');
 const buttons=botWon?'<button class="btn primary" data-first="1">Comenzar: el bot primero</button>':
  `<button class="btn primary" data-first="${winner}">Elegir jugar primero</button><button class="btn" data-first="${1-winner}">Jugar segundo (+1 energía en R1)</button>`;
 return `${title()}<section class="result"><span class="coin">◉</span><div class="kicker">Sorteo inicial</div><h2>${winnerText}</h2><p class="small">El segundo jugador recibe +1 energía durante la primera ronda. Después la prioridad alterna cada ronda.</p><div class="choices">${buttons}</div></section>`;
}
function sideBanner(side,isEnemy){
 const p=match.players[side];
 return `<div class="side-banner ${isEnemy?'enemy':''}"><strong>${isEnemy?'RIVAL':'TÚ'} · ${escape(p.name)}</strong><span class="nexus ${side===0?'blue':'red'}">◈ NEXO ${p.nexus}/12</span><span>⚡ ${p.energy}</span></div>`;
}
function zoneUnit(u,owner,isEnemy){
 return `<button class="unit ${isEnemy?'enemy':''} ${u.tapped?'tapped':''} ${selectedUnit===u.id?'active-target':''}" title="${escape(characterName(u))} · ${escape(TRAITS[u.trait]?.description||'')} · ${u.hp}/${u.maxHp} PV · ${u.tapped?'Agotado':'Disponible'}" data-unit="${escape(u.id)}" data-owner="${owner}"><span class="name-role">${escape(u.role)}${u.trait?' · ✦':''}</span><b>${escape(characterName(u))}</b><span class="stats">⚔ ${combatAttack(u,match.round)} &nbsp;♥ ${u.hp}/${u.maxHp}</span></button>`;
}
function characterName(u){return u.name || u.code;}
function laneSlot(side,lane,rank,isEnemy){
 const units=match.players[side].characters.filter(u=>u.status==='active'&&u.lane===lane&&u.rank===rank);
 return `<div class="row-slot ${rank}" data-slot="${lane}"><span class="slot-label">${rank==='front'?'ATAQUE':'FARM'}</span>${units.length?units.map(u=>zoneUnit(u,side,isEnemy)).join(''):`<span class="empty">${rank==='front'?'·':'—'}</span>`}</div>`;
}
function tower(side,lane){
 const hp=match.players[side].towers[lane];
 return `<button class="tower ${hp===0?'open':''}" data-lane="${lane}" title="Elegir carril ${lane}"><span>${hp>0?'♜ Torre':'⚑ BRECHA'}</span><strong>${hp}/6</strong></button>`;
}
function laneColumn(side,lane,isEnemy){
 return `<div class="lane ${isEnemy?'enemy':''}"><div class="lane-name">${lane}</div>${isEnemy?`${tower(side,lane)}${laneSlot(side,lane,'rear',isEnemy)}${laneSlot(side,lane,'front',isEnemy)}`:`${laneSlot(side,lane,'front',isEnemy)}${laneSlot(side,lane,'rear',isEnemy)}${tower(side,lane)}`}</div>`;
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
function board(viewSide){
 const rival=1-viewSide;
 return `<div class="field"><div class="board-side">${sideBanner(rival,true)}${enemyBacks(rival)}${reserve(rival)}${jungle(rival,true)}<div class="lanes">${LANES.map(l=>laneColumn(rival,l,true)).join('')}</div></div>${neutralZone()}<div class="board-side"><div class="lanes">${LANES.map(l=>laneColumn(viewSide,l,false)).join('')}</div>${jungle(viewSide,false)}${sideBanner(viewSide,false)}${reserve(viewSide)}</div></div>`;
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
   const lanes=t==='HUNT'&&selectedObjective==='minor'?LANES.map(l=>`<button class="btn smallbtn" data-lane="${l}">${l}</button>`).join(''):'';
   return `<section class="panel prompt"><h3>Seleccionando: ${escape(card.name)}</h3><p><strong>${escape(label)}</strong></p><div class="prompt-btns">${lanes}<button class="btn smallbtn minor" data-act="cancel">Cancelar</button></div></section>`;
 }
 if(selectedUnit){
   const u=match.players[viewSide].characters.find(u=>u.id===selectedUnit);
   if(u&&u.status==='active'){
     return `<section class="panel prompt"><h3>${escape(characterName(u))}</h3><p>${u.rank==='front'?'Adelante · combate':'Atrás · farmeo'} · ${u.tapped?'ya actuó':'disponible'} · ${u.hp}/${u.maxHp} PV.</p><div class="prompt-btns"><button class="btn smallbtn" data-order="SWAP_RANK" ${u.tapped?'disabled':''}>↕ Cambiar de fila</button><button class="btn smallbtn red" data-order="BACK" ${u.tapped?'disabled':''}>⌂ Back</button><button class="btn smallbtn minor" data-act="cancel">Cerrar</button></div></section>`;
   }
 }
 return '<section class="panel"><h3>Tu decisión</h3><p>Juega una carta, selecciona un personaje para cambiar de fila o hacer Back, o pasa para terminar tus jugadas. La presión y los combates se resuelven al cerrar la ronda.</p></section>';
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
 return `<aside class="sidebar">${prompt(viewSide)}<div class="panel"><h3>Reglas rápidas</h3><p>Delante combate, atrás farmea. Las cartas giradas ya actuaron. Back: una ronda fuera; muerte: dos. Rompe una torre para abrir una ruta al Nexo.</p><div class="bonus-list">${bonusSummary(viewSide)}</div><details><summary>Ver más</summary><p>4 jugadas por jugador y ronda. Presión ganadora → daño a estructura. Las cartas de 0 energía también consumen jugada. Desde R5 hay 7 de energía base. ATQ +1 en R7 y +2 en R10; el asedio máximo sube en R12 (4) y R17 (5), y la mitigación frontal baja en R10 y R16. Desde R14/R18 los supervivientes delante suman +1/+2 presión adicional al carril. Caza disputa Latido o Coloso. Un jungla listo añade +2 presión neutral pero se agota.</p></details></div><div class="panel"><h3>Registro de combate</h3><div class="log">${log.map(e=>`<div class="logline"><span>R${e.round}</span> · ${escape(logText(e))}</div>`).join('')}</div></div></aside>`;
}
function handPanel(side){
 const p=match.players[side];
 const active=p.hand;
 return `<section class="hand-panel"><div class="hand-heading"><div><h2>✦ Mano · ${labelSide(side)}</h2><p class="small">${active.length} cartas · conserva hasta 2 para la siguiente ronda</p></div><div class="nav-actions"><span class="pill">⚡ ${p.energy} energía</span><span class="pill">${p.actions}/4 jugadas</span><button class="btn primary" data-act="pass" ${match.turn!==side?'disabled':''}>Pasar turno</button></div></div><div class="cards-scroll">${active.map(c=>`<div class="hand-card"><button class="tactic ${c.kind} ${selectedCard===c.uid?'selected':''}" data-card="${escape(c.uid)}" ${(p.energy<c.cost||match.turn!==side)?'disabled':''}><span class="kind">${escape(KIND_NAMES[c.kind])}</span><span class="cost">${c.cost}</span><span class="art" aria-hidden="true">${escape(iconFor[c.effect.type]||'✦')}</span><strong>${escape(c.name)}</strong><span class="description">${escape(c.description)}</span></button><button class="keep-btn ${p.keep.includes(c.uid)?'kept':''}" data-keep="${escape(c.uid)}">${p.keep.includes(c.uid)?'★ Reservada':'☆ Reservar'}</button></div>`).join('')}${active.length===0?'<p class="small">No tienes cartas en la mano.</p>':''}</div></section>`;
}
function outcome(){
 if(match.phase!=='finished')return '';
 return `<section class="result"><div class="coin">✦</div><div class="kicker">Convergencia terminada</div><h2>${match.winner==='draw'?'Empate':match.winner===0?'Gana Azul':'Gana Rojo'}</h2><p class="small">La partida terminó en la ronda ${match.round}. Puedes iniciar otra y probar una estrategia distinta.</p><button class="btn primary" data-act="reset">Nueva partida</button></section>`;
}
function game(){
 const view=mode==='hotseat'?match.turn:0;
 const p=match.players[view];
 const play=match.phase==='tactics'&&match.turn===view;
 return `${title()}${notice?`<div class="notice" role="status">${escape(notice)}</div>`:''}<div class="turn-strip"><div><div class="kicker">Ronda ${match.round}</div><strong>${match.phase==='finished'?'Partida terminada':'Turno '+labelSide(match.turn)} ${play?'· tu jugada':''}</strong></div><div class="turn-meta"><span class="pill">⚡ ${p.energy}</span><span class="pill">${p.actions}/4 jugadas</span></div><div class="turn-meta"><span class="pill">↔ ${mode==='bot'?'IA '+AI_LEVELS[botDifficulty].name+' · '+AI_STYLES[botStyle].name:'2 locales'}</span></div></div>${outcome()}<div class="arena-layout">${board(view)}${sidePanel(view)}</div>${handPanel(view)}<footer class="layout-footer">Rift Director · Card Game prototype · Las partidas no afectan los guardados del antiguo manager.</footer>${curtain&&mode==='hotseat'&&match.phase==='tactics'?`<div class="pass-screen"><div class="pass-card"><div class="coin">✦</div><h2>Pasa el dispositivo</h2><p class="small">Es turno del jugador ${labelSide(match.turn)}. La mano se mostrará cuando esté listo.</p><button class="btn primary" data-act="reveal">Mostrar mi mano</button></div></div>`:''}`;
}
function render(){
 app.innerHTML=match?game():coin?coinScreen():intro();
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
 coin=null;clearSelection();
 notice=`Volado listo: empieza ${labelSide(firstPlayer)}; ${labelSide(1-firstPlayer)} recibe +1 energía.`;
 curtain=mode==='hotseat'&&firstPlayer!==0;
 if(mode==='bot')driveBot();
 render();
}
function clearSelection(){selectedCard=null;selectedUnit=null;rotateSource=null;selectedObjective=null;}
function driveBot(){
 let limit=12;
 while(match&&match.phase==='tactics'&&match.turn===1&&limit-->0){
   if(botDifficulty==='rookie')botStep(match,1);
   else aiStep(match,1,{difficulty:botDifficulty,style:botStyle});
 }
 if(limit<=0)notice='Se detuvo el bot por límite de seguridad.';
}
function perform(fn){
 if(!match||match.phase!=='tactics')return;
 const before=match.round,prior=match.turn;
 try{
   fn();
   clearSelection();
   notice=match.round!==before?`Ronda ${before} resuelta. Revisa las torres y el registro.`:'Jugada registrada.';
   if(mode==='bot')driveBot();
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
   perform(()=>playCard(match,side,uid,{}));return;
 }
 selectedCard=selectedCard===uid?null:uid;rotateSource=null;selectedObjective=null;
 notice='';render();
}
function chooseLane(lane){
 if(!selectedCard)return;
 const side=match.turn;
 const card=match.players[side].hand.find(c=>c.uid===selectedCard);
 if(!card)return;
 const t=card.effect.type;
 if(['PRESSURE','GUARD','GANK','DIVE','SABOTAGE'].includes(t))perform(()=>playCard(match,side,selectedCard,{lane}));
 else if(t==='ROTATE'&&rotateSource)perform(()=>playCard(match,side,selectedCard,{unitId:rotateSource,lane}));
 else if(t==='HUNT'&&selectedObjective==='minor')perform(()=>playCard(match,side,selectedCard,{objective:'minor',lane}));
}
function chooseObjective(id){
 if(!selectedCard){notice='Para disputar este objetivo, selecciona una carta de Caza.';render();return;}
 const card=match.players[match.turn].hand.find(c=>c.uid===selectedCard);
 if(card?.effect.type!=='HUNT'){notice='Este objetivo requiere una carta de Caza.';render();return;}
 if(!match.objectives[id]?.active){notice='Este objetivo aún no está disponible.';render();return;}
 if(id==='minor'){
   selectedObjective='minor';notice='Elige el carril que recibirá la recompensa si ganas la disputa.';render();return;
 }
 perform(()=>playCard(match,match.turn,selectedCard,{objective:'major'}));
}
function pickUnit(owner,uid){
 const side=match.turn;
 const unit=match.players[owner].characters.find(u=>u.id===uid);
 if(!unit||unit.status!=='active')return;
 if(selectedCard){
   const card=match.players[side].hand.find(c=>c.uid===selectedCard);
   if(!card)return;
   const type=card.effect.type;
   if(type==='IMPACT'&&owner!==side)perform(()=>playCard(match,side,selectedCard,{unitId:uid}));
   else if(type==='HEAL'&&owner===side)perform(()=>playCard(match,side,selectedCard,{unitId:uid}));
   else if(type==='BACK'&&owner===side)perform(()=>playCard(match,side,selectedCard,{unitId:uid}));
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
 if(el.dataset.setup){setup(el.dataset.setup);return;}
 if(el.dataset.first!==undefined){begin(Number(el.dataset.first));return;}
 const act=el.dataset.act;
 if(act==='reset'){mode=null;match=null;coin=null;curtain=false;notice='';clearSelection();render();return;}
 if(act==='reveal'){curtain=false;render();return;}
 if(!match||curtain||match.phase==='finished')return;
 if(act==='cancel'){clearSelection();notice='';render();return;}
 if(act==='pass'){perform(()=>passTurn(match,match.turn));return;}
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
   perform(()=>activate(match,view,selectedUnit,el.dataset.order));return;
 }
 if(el.dataset.unit){pickUnit(Number(el.dataset.owner),el.dataset.unit);return;}
 if(el.dataset.lane){chooseLane(el.dataset.lane);return;}
});
render();
