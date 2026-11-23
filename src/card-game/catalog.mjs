// Rift Director CCG v0.8.3 — initial unlocked sandbox collection.
// Catalogue definitions are immutable in gameplay: a deck carries copies, never levels or equipment.
export const RARITIES = Object.freeze({
  COMMON: { name: 'Común', max: 3, rank: 0 },
  UNCOMMON: { name: 'Poco común', max: 2, rank: 1 },
  RARE: { name: 'Rara', max: 2, rank: 2 },
  EPIC: { name: 'Épica', max: 1, rank: 3 },
  LEGENDARY: { name: 'Legendaria', max: 1, rank: 4 }
});
export const TRAITS = Object.freeze({
  SIEGE: { name: 'Asedio', description: '+1 presión al atacar desde la fila delantera.' },
  BULWARK: { name: 'Baluarte', description: 'Mientras esté delante, su carril mitiga 1 daño estructural adicional.' },
  HARVEST: { name: 'Cosecha', description: 'Farmea como dos personajes cuando está atrás (límite global +2).' },
  DUELIST: { name: 'Duelista', description: '+1 de daño cuando ataca a otro personaje en combate.' },
  HUNTER: { name: 'Cazador', description: 'Como jungla, aporta +1 presión adicional cuando participa en Caza.' },
  SCOUT: { name: 'Explorador', description: 'Como jungla, aporta +1 presión adicional al hacer Gank.' }
});
const hero=(id,name,role,attack,hp,trait,rarity='COMMON',flavor='')=>
  ({id,name,role,attack,hp,trait,rarity,flavor});
export const CHARACTER_CATALOG=Object.freeze([
  hero('hero-centinela','Centinela','TOP',3,6,'BULWARK','COMMON','Mantiene la primera línea frente a cualquier amenaza.'),
  hero('hero-baluarte','Baluarte','TOP',2,7,'BULWARK','COMMON','Los muros resisten mientras él permanezca firme.'),
  hero('hero-vanguardia','Vanguardia','TOP',4,5,'SIEGE','UNCOMMON','La ofensiva empieza al romper la formación.'),
  hero('hero-asceta','Asceta','TOP',2,6,'HARVEST','RARE','La paciencia es su arma de conquista.'),
  hero('hero-arcanista','Arcanista','MID',3,4,'DUELIST','COMMON','Transforma el Vínculo en precisión mortal.'),
  hero('hero-tejedora','Tejedora','MID',3,4,'SIEGE','UNCOMMON','Cada hilo del Vínculo conecta una brecha.'),
  hero('hero-astral','Astral','MID',2,5,'HARVEST','RARE','Escucha la corriente antes de convocarla.'),
  hero('hero-ejecutora','Ejecutora','MID',4,3,'DUELIST','EPIC','Una sola apertura decide la pelea.'),
  hero('hero-arbalesta','Arbalesta','BOT',3,4,'SIEGE','COMMON','Hostiga torres a distancia.'),
  hero('hero-custodia','Custodia','BOT',1,7,'BULWARK','COMMON','Ni un paso atrás.'),
  hero('hero-duelista','Duelista','BOT',3,5,'DUELIST','COMMON','Entra a la línea buscando la ventaja.'),
  hero('hero-oraculo','Oráculo','BOT',1,6,'HARVEST','UNCOMMON','Ve el combate antes de que suceda.'),
  hero('hero-lancera','Lancera','BOT',4,3,'SIEGE','RARE','Una lanza en la brecha basta.'),
  hero('hero-escudero','Escudero','BOT',2,6,'BULWARK','UNCOMMON','Protege a quienes no pueden retroceder.'),
  hero('hero-rastreadora','Rastreadora','JUN',2,5,'SCOUT','COMMON','Domina las rutas del Vínculo.'),
  hero('hero-acechador','Acechador','JUN',3,4,'HUNTER','COMMON','Donde cae la presa, el mundo cambia.'),
  hero('hero-cazavinculos','Cazavínculos','JUN',2,6,'HUNTER','RARE','Sigue el pulso de las fracturas.'),
  hero('hero-sombra','Sombra Errante','JUN',4,3,'SCOUT','EPIC','La emboscada comienza antes de verla.')
]);
const tactic=(id,name,kind,cost,type,value,rarity,description,flavor='')=>({
 id,name,kind,cost,rarity,description,flavor,effect:{type,...(value===null?{}:{value})}
});
export const TACTIC_CATALOG=Object.freeze([
 tactic('wave-push','Empuje de oleada','ACTION',1,'PRESSURE',2,'COMMON','+2 presión en un carril.'),
 tactic('siege-march','Marcha de asedio','ACTION',2,'PRESSURE',3,'UNCOMMON','+3 presión en un carril.'),
 tactic('battle-standard','Estandarte del Vínculo','ACTION',3,'PRESSURE',4,'RARE','+4 presión en un carril.'),
 tactic('breakthrough','Abrir brecha','ACTION',4,'PRESSURE',5,'EPIC','+5 presión para rematar un carril.'),
 tactic('skirmish-push','Escaramuza táctica','ACTION',0,'PRESSURE',1,'COMMON','+1 presión en un carril; ocupa una jugada.'),
 tactic('flank-pressure','Flanqueo','ACTION',2,'PRESSURE',3,'UNCOMMON','Desestabiliza una línea enemiga.'),
 tactic('line-guard','Guardia de línea','SPELL',1,'GUARD',2,'COMMON','Mitiga hasta 2 de daño estructural de un carril.'),
 tactic('fortress-ward','Barrera del Bastión','SPELL',2,'GUARD',3,'UNCOMMON','Mitiga hasta 3 de daño estructural.'),
 tactic('final-stand','Última defensa','SPELL',3,'GUARD',4,'RARE','Protección excepcional para una línea crítica.'),
 tactic('pocket-shield','Cobertura','SPELL',0,'GUARD',1,'COMMON','Mitiga 1 daño estructural; ocupa una jugada.'),
 tactic('precise-strike','Golpe preciso','ACTION',2,'IMPACT',2,'COMMON','Inflige 2 de daño a un personaje enemigo.'),
 tactic('fatal-blow','Ruptura arcana','SPELL',3,'IMPACT',3,'UNCOMMON','Inflige 3 de daño a un personaje enemigo.'),
 tactic('execution','Ejecución','ACTION',5,'IMPACT',5,'RARE','Inflige 5 de daño a un personaje enemigo.'),
 tactic('spark-dart','Dardo del Vínculo','SPELL',1,'IMPACT',1,'COMMON','Inflige 1 de daño a un personaje enemigo.'),
 tactic('energy-pulse','Pulso de energía','RESOURCE',0,'ENERGY',2,'COMMON','Gana 2 de energía; consume una jugada.'),
 tactic('power-channel','Canalización','RESOURCE',1,'ENERGY',3,'UNCOMMON','Invierte una jugada para ganar 3 de energía.'),
 tactic('surge-crystal','Cristal inestable','RESOURCE',2,'ENERGY',4,'RARE','Gana 4 de energía para una combinación tardía.'),
 tactic('map-reading','Lectura del mapa','SPELL',1,'DRAW',2,'COMMON','Roba hasta 2 cartas.'),
 tactic('foresight','Presagio','SPELL',2,'DRAW',3,'UNCOMMON','Roba hasta 3 cartas.'),
 tactic('ancient-knowledge','Archivo arcano','SPELL',3,'DRAW',4,'RARE','Roba hasta 4 cartas.'),
 tactic('rotation','Rotación','ACTION',1,'ROTATE',null,'COMMON','Mueve un personaje entre TOP, MID y BOT.'),
 tactic('forced-march','Marcha forzada','ACTION',2,'ROTATE',null,'UNCOMMON','Traslada a un personaje a otro carril.'),
 tactic('gank','Gank','ACTION',2,'GANK',null,'COMMON','El jungla añade su ATQ +1 de presión y se agota.'),
 tactic('predator-route','Ruta depredadora','ACTION',3,'GANK',null,'RARE','Fuerza una intervención en otro carril.'),
 tactic('dive','Dive','ACTION',2,'DIVE',null,'UNCOMMON','Ignora la protección frontal, pero la torre responde.'),
 tactic('risky-assault','Asalto temerario','ACTION',1,'DIVE',null,'RARE','Un Dive barato a cambio del mismo riesgo.'),
 tactic('recall','Recall','ACTION',1,'BACK',null,'COMMON','Retira un aliado a base para sanar y regresar.'),
 tactic('safe-retreat','Retirada segura','SPELL',0,'BACK',null,'UNCOMMON','Back sin coste de energía, consume una jugada.'),
 tactic('hunt','Caza del Vínculo','ACTION',2,'HUNT',3,'UNCOMMON','+3 presión neutral; jungla lista aporta +2.'),
 tactic('big-hunt','Gran cacería','ACTION',3,'HUNT',4,'RARE','+4 presión neutral; jungla lista aporta +2.'),
 tactic('mend','Restauración','SPELL',1,'HEAL',2,'COMMON','Restaura hasta 2 PV a un aliado activo.'),
 tactic('vitality','Renovación','SPELL',3,'HEAL',4,'RARE','Restaura hasta 4 PV a un aliado activo.'),
 tactic('sabotage','Sabotaje','ACTION',2,'SABOTAGE',2,'UNCOMMON','Resta 2 de presión al enemigo en un carril.'),
 tactic('disrupt','Distorsión','SPELL',3,'SABOTAGE',3,'RARE','Resta 3 de presión al rival en un carril.')
]);
export const CHARACTER_BY_ID=Object.freeze(Object.fromEntries(CHARACTER_CATALOG.map(c=>[c.id,c])));
export const TACTIC_BY_ID=Object.freeze(Object.fromEntries(TACTIC_CATALOG.map(c=>[c.id,c])));
const TEMPLATE_BLUEPRINTS={
 control:{
   name:'Control del Vínculo',heroes:['hero-centinela','hero-astral','hero-oraculo','hero-arbalesta','hero-cazavinculos'],
   tactics:{'line-guard':2,'fortress-ward':1,'precise-strike':2,'fatal-blow':1,'mend':2,
     'sabotage':2,'hunt':2,'wave-push':3,'siege-march':2,'battle-standard':1,'map-reading':1,'energy-pulse':1}
 },
 siege:{
   name:'Asedio del Bastión',heroes:['hero-centinela','hero-arcanista','hero-arbalesta','hero-custodia','hero-rastreadora'],
   tactics:{'wave-push':3,'siege-march':2,'battle-standard':2,'line-guard':2,'precise-strike':2,'energy-pulse':2,'map-reading':1,'rotation':2,'gank':1,'dive':2,'hunt':1}
 },
 jungle:{
   name:'Rutas del Umbral',heroes:['hero-baluarte','hero-tejedora','hero-duelista','hero-oraculo','hero-acechador'],
   tactics:{'gank':3,'hunt':2,'wave-push':2,'line-guard':2,'map-reading':2,'energy-pulse':2,'precise-strike':2,'rotation':1,'fatal-blow':1,'recall':1,'sabotage':2}
 }
};
export function listTemplates(){return Object.keys(TEMPLATE_BLUEPRINTS);}
export function templateDeck(key){
 const spec=TEMPLATE_BLUEPRINTS[key];
 if(!spec)throw Error('Plantilla no disponible');
 return {name:spec.name,characters:spec.heroes.map(id=>({...CHARACTER_BY_ID[id]})),
  tactics:Object.entries(spec.tactics).flatMap(([id,n])=>Array.from({length:n},()=>({...TACTIC_BY_ID[id],effect:{...TACTIC_BY_ID[id].effect}})))};
}
