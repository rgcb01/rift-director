/* Art Pack 2: presentation metadata only. Never registers purchases or recipes. */
((root)=>{
'use strict';
const live=root.RiftCore?.PowerEconomy?.ITEM_CATALOG||[];
const definitions={
 items:[
  ['boots'],['blade'],['mantle'],['focus'],['bulwark'],
  ['spellbook','Códice astral'],['arcane_orb','Orbe de mareas'],
  ['spear','Lanza de ceniza'],['reaver','Guantelete voraz'],['wardstone','Piedra del vigía'],
  ['sun_charm','Talismán solar'],['aegis','Égida espectral'],['bow','Arco de tormenta'],
  ['hourglass','Reloj de arena'],['crystal','Cristal del horizonte']
 ],
 components:[
  ['leather_boots','Botas simples'],['iron_dagger','Daga de hierro'],
  ['chain_vest','Chaleco de malla'],['oak_shield','Escudo básico'],['magic_page','Página arcana'],
  ['mana_orb','Esfera de maná'],['ruby_shard','Fragmento carmesí'],['azure_crystal','Cristal azul'],
  ['hunter_string','Cuerda reforzada'],['sun_fragment','Fragmento solar'],
  ['ward_totem','Tótem de visión'],['bronze_handle','Empuñadura de bronce'],
  ['tempered_plate','Placa templada'],['focus_lens','Lente focal'],['green_charm','Amuleto vital']
 ]
};
const catalogs=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([kind,rows])=>[
 kind,Object.freeze(rows.map(([id,name],i)=>{
  const existing=kind==='items'?live.find(item=>item.id===id):null;
  return Object.freeze({id,name:existing?.name||name||id,
   x:i%5*128,y:Math.floor(i/5)*128,width:128,height:128,
   atlas:`assets/inventory/${kind}_atlas.png`,
   icon128:`assets/inventory/${kind}/${id}.png`,
   icon64:`assets/inventory/${kind}/64/${id}.png`,
   icon32:`assets/inventory/${kind}/32/${id}.png`,
   visualOnly:!existing});
 }))
])));
function get(id,kind='items'){
 return (kind==='items'||kind==='components')?catalogs[kind].find(item=>item.id===id):undefined;
}
// The caller owns the accessible label and keeps its SVG under this overlay.
function image(id,kind='items'){
 const art=get(id,kind);
 return art?`<img class="rift-item-image" src="${art.icon32}" srcset="${art.icon64} 2x" width="32" height="32" alt="" aria-hidden="true" onerror="this.remove()">`:'';
}
root.RiftItemArt=Object.freeze({catalogs,get,image});
})(globalThis);
