// Rift Director — guided onboarding. Only the scenario fixture is prepared;
// all player moves, rounds, objectives and victory are resolved by the real engine.
import {createMatch,passTurn} from './engine.mjs';
import {templateDeck} from './catalog.mjs';

export const TUTORIAL_LESSONS=Object.freeze([
 {id:'map',title:'Conoce la Convergencia',subtitle:'Mapa y formación',steps:[
  {id:'focus',title:'Explora un carril',body:'En TOP luchan los personajes de la primera fila. Toca TOP para enfocarlo. Los otros dos carriles siguen existiendo.',tip:'TOP es la ruta superior; MID es central y BOT, inferior.'},
  {id:'swap',title:'Cambia de posición',body:'Toca a tu Centinela en TOP y elige «Cambiar de fila». Delante combate; atrás farmea y aporta energía en la siguiente ronda.',tip:'Una orden de personaje consume una jugada. El personaje queda agotado hasta la ronda siguiente.'}
 ]},
 {id:'cards',title:'Órdenes y energía',subtitle:'Jugar cartas y resolver',steps:[
  {id:'pressure',title:'Tu primera carta',body:'En tu mano busca «Empuje de oleada», selecciónalo y elige «Usar en TOP». Cuesta 1 de energía y añade presión.',tip:'Todas las cartas gastan una de tus cuatro jugadas, incluso las que cuestan 0 de energía.'},
  {id:'resolve',title:'La presión se convierte en daño',body:'Pulsa «Pasar turno». El rival de entrenamiento también pasará: al cerrar la ronda se calcula la presión y la torre recibirá daño.',tip:'Las cartas no destruyen torres automáticamente: necesitas un Riftborn vivo delante y ventaja real de presión.'}
 ]},
 {id:'movement',title:'Rotar y recuperarse',subtitle:'Mover aliados y volver a base',steps:[
  {id:'rotation',title:'Una rotación táctica',body:'Selecciona «Rotación», toca a tu Centinela en TOP y envíalo a MID.',tip:'Rotar cuesta una carta y una jugada. El aliado trasladado queda agotado hasta la próxima ronda.'},
  {id:'back',title:'Regresar a la base',body:'Toca a tu Arcanista en MID y elige «Back». Recuperará toda su vida antes de regresar.',tip:'Un Back ordenado consume una jugada y mantiene al personaje fuera hasta R3. Una derrota tarda más.'},
  {id:'recovery',title:'Vuelve a tu equipo',body:'Pulsa «Pasar turno» las veces necesarias hasta llegar a R3. Tu Arcanista reaparecerá curado en la fila trasera.',tip:'Al cerrar cada ronda, los personajes atrás generan energía para la próxima.'}
 ]},
 {id:'objectives',title:'El Latido del Vínculo',subtitle:'Jungla y objetivos neutrales',steps:[
  {id:'hunt',title:'Disputa el Latido',body:'Estás en R4, cuando aparece el Latido. Juega «Caza del Vínculo», toca el Latido y elige MID para recibir su bonificación.',tip:'Un jungla disponible aporta presión neutral extra, pero se agota. Hay que superar 4 de presión y aventajar al rival por 2.'},
  {id:'capture',title:'Confirma la conquista',body:'Pulsa «Pasar turno» para resolver la disputa. Verás la bonificación permanente de presión en MID.',tip:'El Coloso aparece desde R8: otorga presión temporal a todos los carriles y mejora un asedio.'}
 ]},
 {id:'victory',title:'Abre camino al Nexo',subtitle:'Condición de victoria',steps:[
  {id:'final-pressure',title:'Un carril con brecha',body:'En esta práctica la torre rival de TOP ya cayó y su Nexo tiene 3 PV. Juega «Empuje de oleada» en TOP.',tip:'Una brecha permite que el daño estructural del carril llegue directamente al Nexo.'},
  {id:'win',title:'Cierra la partida',body:'Pulsa «Pasar turno». Tu Centinela vivo delante y la presión extra deben destruir los 3 PV restantes del Nexo rival.',tip:'El tutorial prepara escenarios didácticos. En una partida normal debes abrir la brecha jugando desde el comienzo.'}
 ]}
]);

export function tutorialStep(lessonIndex,stepIndex){
 return TUTORIAL_LESSONS[lessonIndex]?.steps[stepIndex]||null;
}

// Unrestricted player choices remain available in normal matches; only guided
// tutorial stages constrain the current move so lessons cannot be accidentally skipped.
export function tutorialAllows(step,intent){
 if(!step||!intent)return false;
 if(['cancel','toggle-hand'].includes(intent.kind))return true;
 switch(step.id){
  case 'focus':return intent.kind==='focus'&&intent.lane==='TOP';
  case 'swap':return intent.kind==='unit'&&intent.side===0&&intent.code==='hero-centinela' ||
    intent.kind==='order'&&intent.order==='SWAP_RANK';
  case 'pressure':case 'final-pressure':return intent.kind==='card'&&intent.id==='wave-push' ||
    intent.kind==='lane'&&intent.lane==='TOP';
  case 'resolve':case 'recovery':case 'capture':case 'win':return intent.kind==='pass';
  case 'rotation':return intent.kind==='card'&&intent.id==='rotation' ||
    intent.kind==='unit'&&intent.side===0&&intent.code==='hero-centinela' ||
    intent.kind==='lane'&&intent.lane==='MID';
  case 'back':return intent.kind==='unit'&&intent.side===0&&intent.code==='hero-arcanista' ||
    intent.kind==='order'&&intent.order==='BACK';
  case 'hunt':return intent.kind==='card'&&intent.id==='hunt' ||
    intent.kind==='objective'&&intent.objective==='minor' ||
    intent.kind==='lane'&&intent.lane==='MID';
  default:return false;
 }
}
export function tutorialCompletedStep(step,event,match){
 if(!step||!event||!match)return false;
 switch(step.id){
  case 'focus':return event.kind==='focus'&&event.lane==='TOP';
  case 'swap':return event.kind==='order'&&event.order==='SWAP_RANK';
  case 'pressure':case 'final-pressure':return event.kind==='card'&&event.id==='wave-push'&&event.lane==='TOP';
  case 'resolve':return event.kind==='pass'&&match.round>=2;
  case 'rotation':return event.kind==='card'&&event.id==='rotation'&&event.lane==='MID';
  case 'back':return event.kind==='order'&&event.order==='BACK';
  case 'recovery':return event.kind==='pass'&&match.round>=3&&
    match.players[0].characters.some(u=>u.code==='hero-arcanista'&&u.status==='active'&&u.hp===u.maxHp);
  case 'hunt':return event.kind==='card'&&event.id==='hunt'&&event.objective==='minor'&&event.lane==='MID';
  case 'capture':return event.kind==='pass'&&match.objectives.minor.claimedBy===0;
  case 'win':return event.kind==='pass'&&match.phase==='finished'&&match.winner===0;
  default:return false;
 }
}
function guaranteeInHand(player,ids){
 for(const id of ids){
  const current=player.hand.findIndex(c=>c.id===id);
  if(current>=0){[player.hand[0],player.hand[current]]=[player.hand[current],player.hand[0]];continue;}
  const bag=[player.deck,player.discard].find(cards=>cards.some(c=>c.id===id));
  if(!bag)throw Error('Falta carta del tutorial: '+id);
  const from=bag.findIndex(c=>c.id===id);
  [bag[from],player.hand[0]]=[player.hand[0],bag[from]];
 }
}
// Fixed, clearly identified training fixtures. No engine shortcuts are used
// for actual tactical actions, claims, damage, returns or match victory.
export function createTutorialMatch(lessonIndex){
 if(!TUTORIAL_LESSONS[lessonIndex])throw Error('Lección desconocida');
 const match=createMatch([templateDeck('siege'),templateDeck('jungle')],{seed:19074+lessonIndex,firstPlayer:0,secondPlayerBonus:0});
 // A passive opponent demonstrates rules without overwhelming a new player.
 for(const u of match.players[1].characters)if(u.role!=='JUN')u.rank='rear';
 if(lessonIndex===1||lessonIndex===4)guaranteeInHand(match.players[0],['wave-push']);
 if(lessonIndex===2)guaranteeInHand(match.players[0],['rotation']);
 if(lessonIndex===3){
  // Advance through genuine no-action rounds so R4 and the objective spawn
  // are produced by the engine, not by editing match.round.
  for(const p of match.players)for(const u of p.characters)if(u.role!=='JUN')u.rank='rear';
  for(let r=0;r<3;r++){passTurn(match,match.turn);passTurn(match,match.turn);}
  if(match.round!==4||!match.objectives.minor.active)throw Error('Escenario de objetivos inválido');
  guaranteeInHand(match.players[0],['hunt']);
 }
 if(lessonIndex===4){
  // Controlled endgame: the breach and Nexo HP are the scenario's opening
  // conditions. Only real pressure, round resolution and siege can win it.
  match.players[1].towers.TOP=0;
  match.players[1].nexus=3;
 }
 return match;
}
