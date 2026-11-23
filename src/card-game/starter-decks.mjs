// Two starter decks for the card-game visual prototype. No loot, account or manager dependencies.
const effect = (id, name, kind, cost, type, value, description, count) => ({id,name,kind,cost,effect:{type,...(value==null?{}:{value})},description,count});
const siegeCards = [
 effect('push','Empuje de oleada','ACTION',1,'PRESSURE',2,'+2 presión en el carril elegido.',3),
 effect('bastion','Guardia de línea','SPELL',1,'GUARD',2,'Reduce hasta 2 de daño estructural en un carril.',2),
 effect('duel','Escaramuza','ACTION',2,'IMPACT',2,'Inflige 2 de daño a un personaje rival.',3),
 effect('surge','Pulso de energía','RESOURCE',0,'ENERGY',2,'Gana 2 de energía. Consume una jugada.',2),
 effect('scout','Lectura de mapa','SPELL',1,'DRAW',2,'Roba hasta 2 cartas tácticas.',2),
 effect('rotate','Rotación','ACTION',1,'ROTATE',null,'Mueve un personaje entre carriles.',2),
 effect('gank','Gank','ACTION',2,'GANK',null,'Tu jungla apoya un carril con ATQ +1 de presión.',1),
 effect('dive','Dive','ACTION',2,'DIVE',null,'Ignora protección frontal; recibes daño de torre.',2),
 effect('recall','Recall','ACTION',1,'BACK',null,'Retira un personaje a base para recuperarse.',1),
 effect('hunt','Caza del Vínculo','ACTION',2,'HUNT',3,'Compromete 3 presión neutral. Con jungla disponible: +2 y la agota.',2)
];
const jungleCards = [
 effect('push','Presión lateral','ACTION',1,'PRESSURE',2,'+2 presión en el carril elegido.',3),
 effect('ward','Visión avanzada','SPELL',1,'GUARD',2,'Reduce daño estructural de un carril.',2),
 effect('skirmish','Emboscada','ACTION',2,'IMPACT',2,'Inflige 2 de daño a un personaje rival.',2),
 effect('camp','Campamento','RESOURCE',0,'ENERGY',2,'Gana 2 de energía para maniobrar.',2),
 effect('route','Rutas ocultas','SPELL',1,'DRAW',2,'Roba hasta 2 cartas tácticas.',2),
 effect('rotate','Rotación','ACTION',1,'ROTATE',null,'Mueve un personaje entre carriles.',1),
 effect('gank','Gank','ACTION',2,'GANK',null,'Tu jungla apoya un carril con ATQ +1 de presión.',3),
 effect('dive','Dive','ACTION',2,'DIVE',null,'Ignora protección frontal; recibes daño de torre.',1),
 effect('recall','Recall','ACTION',1,'BACK',null,'Retira un personaje a base para recuperarse.',2),
 effect('hunt','Caza Mayor','ACTION',2,'HUNT',3,'Obtén presión neutral en una disputa del centro.',2)
];
function build(id, chars, groups) {
  const tactics=groups.flatMap(group=>Array.from({length:group.count},(_,i)=>{
    const {count,...rest}=group;
    return {...rest,id:id+'-'+group.id+'-'+(i+1),effect:{...rest.effect}};
  }));
  return {id,characters:chars.map(([name,role,attack,hp],i)=>({id:id+'-c'+i,name,role,attack,hp})),tactics};
}
export const STARTER_DECKS={
  siege:build('siege',[
    ['Centinela','TOP',3,6],['Arcanista','MID',3,4],['Arbalesta','BOT',3,4],['Custodia','BOT',1,7],['Rastreadora','JUN',2,5]
  ],siegeCards),
  jungle:build('jungle',[
    ['Baluarte','TOP',2,7],['Tejedora','MID',3,4],['Duelista','BOT',3,5],['Oráculo','BOT',1,6],['Acechador','JUN',3,4]
  ],jungleCards)
};
export const KIND_NAMES={ACTION:'Acción',SPELL:'Hechizo',RESOURCE:'Recurso'};
export const EFFECT_NAMES={PRESSURE:'Presión',GUARD:'Guardia',IMPACT:'Impacto',ENERGY:'Energía',DRAW:'Robo',ROTATE:'Rotación',GANK:'Gank',DIVE:'Dive',BACK:'Recall',HUNT:'Caza neutral'};
