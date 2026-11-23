// Starter lists are now built from the same canonical collection as player decks.
import {templateDeck} from './catalog.mjs';
export const STARTER_DECKS=Object.freeze({
  siege:templateDeck('siege'),
  jungle:templateDeck('jungle')
});
export const KIND_NAMES=Object.freeze({ACTION:'Acción',SPELL:'Hechizo',RESOURCE:'Recurso'});
export const EFFECT_NAMES=Object.freeze({
  PRESSURE:'Presión',GUARD:'Guardia',IMPACT:'Impacto',ENERGY:'Energía',DRAW:'Robo',
  ROTATE:'Rotación',GANK:'Gank',DIVE:'Dive',BACK:'Recall',HUNT:'Caza neutral',
  HEAL:'Curación',SABOTAGE:'Sabotaje'
});
