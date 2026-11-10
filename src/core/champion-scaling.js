/* Alpha 0.7.17 — champion-specific, match-local statistical growth.
 * Distinct from a professional's human skill and the six-slot item ledger.
 * All attributes derive solely from champion ID, earned XP/level and bought
 * items. Ability ranks are allocated but NOT cast until the ability milestone.
 * Health is still represented as 0–100% in historical replays and UI.
 */
((root)=>{
 'use strict';
 const core=root.RiftCore||(root.RiftCore={});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const rows=[
  // id, role, archetype, damage type, base [HP,AD,armor,MR,AS],
  // growth per level [HP,AD,armor,MR,AS], skill priority.
  ['hrodan','TOP','fighter','physical',[665,68,37,31,.66],[98,3.8,4.1,1.8,.024],'QWE'],
  ['korvek','TOP','tank','physical',[735,60,44,36,.57],[113,3.2,5.0,2.2,.018],'EWQ'],
  ['sereth','JUN','fighter','physical',[660,65,35,32,.67],[92,3.6,3.8,1.8,.027],'QEW'],
  ['veyra','JUN','assassin','physical',[585,72,30,30,.71],[84,4.1,3.3,1.5,.033],'QEW'],
  ['aeska','MID','mage','magic',[570,54,29,32,.62],[84,2.9,3.2,1.8,.019],'QEW'],
  ['elaris','MID','mage','magic',[605,52,31,35,.60],[90,2.7,3.4,1.9,.018],'EWQ'],
  ['nyra','ADC','marksman','physical',[580,64,29,30,.68],[86,4.0,3.3,1.4,.033],'QWE'],
  ['velin','ADC','marksman','physical',[600,62,31,30,.66],[91,3.8,3.4,1.5,.029],'QEW'],
  ['thessa','SUP','support','magic',[615,51,32,35,.61],[95,2.6,3.8,1.9,.019],'WEQ'],
  ['drathos','SUP','tank','magic',[710,55,42,37,.58],[109,3.0,4.8,2.1,.017],'EWQ']
 ];
 const STAT_KEYS=['maxHp','attackDamage','armor','magicResist','attackSpeed'];
 const DEFINITIONS=Object.freeze(Object.fromEntries(rows.map(([id,role,archetype,damageType,base,growth,priority])=>
  [id,Object.freeze({id,role,archetype,damageType,priority,
   base:Object.freeze(Object.fromEntries(STAT_KEYS.map((k,i)=>[k,base[i]]))),
   growth:Object.freeze(Object.fromEntries(STAT_KEYS.map((k,i)=>[k,growth[i]])))})])));
 const FALLBACK=Object.freeze({TOP:'hrodan',JUN:'sereth',MID:'aeska',ADC:'nyra',SUP:'thessa'});
 const ORDER='QWEQQRQWQWRWWEE REE'.replace(/\s/g,'');
 function skillRanks(level,priority='QWE'){
  const result={Q:0,W:0,E:0,R:0};
  const order=clamp(level,1,18);
  for(let i=0;i<order;i++){
   const key=ORDER[i]==='R'?'R':priority['QWE'.indexOf(ORDER[i])];
   result[key]++;
  }
  return result;
 }
 function definition(row){
  const id=row?.championId||FALLBACK[row?.role];
  return DEFINITIONS[id]||null;
 }
 function effective(row,catalog=[]){
  const champ=definition(row);
  if(!champ)return null;
  const level=clamp(Number.isSafeInteger(row?.level)?row.level:1,1,18);
  const items=Array.isArray(row?.items)?row.items:[];
  const lookup=Object.fromEntries(catalog.map(item=>[item.id,item]));
  const bonus={maxHp:0,attackDamage:0,abilityPower:0,armor:0,magicResist:0,attackSpeed:0};
  for(const id of items){
   const item=lookup[id];if(!item)continue;
   const attack=item.attack||0,defense=item.defense||0,tempo=item.tempo||0;
   const magical=champ.damageType==='magic'&&item.archetype!=='physical'&&
    item.archetype!=='marksman'&&item.archetype!=='bruiser';
   bonus.attackDamage+=magical?0:attack*3.5;
   bonus.abilityPower+=magical?attack*5:0;
   bonus.maxHp+=defense*22;
   bonus.armor+=defense*1.7;
   bonus.magicResist+=defense*1.3;
   bonus.attackSpeed+=tempo*.02;
  }
  const stats={championId:champ.id,level,archetype:champ.archetype,
   damageType:champ.damageType,abilityRanks:skillRanks(level,champ.priority)};
  for(const key of STAT_KEYS)stats[key]=+(
   champ.base[key]+champ.growth[key]*(level-1)+(bonus[key]||0)).toFixed(3);
  stats.abilityPower=bonus.abilityPower;
  stats.attackSpeed=Math.min(1.8,stats.attackSpeed);
  return stats;
 }
 // A symmetric, modest combat adapter, replacing (not stacking) the old
 // level-and-gear boost for champion-bearing players.
 function combatBoost(row,kind,catalog=[]){
  const stats=effective(row,catalog);if(!stats)return null;
  const champ=DEFINITIONS[stats.championId],levels=stats.level-1;
  if(kind==='attack'){
   const gainedAD=stats.attackDamage-champ.base.attackDamage-
    champ.growth.attackDamage*levels;
   const gearAs=stats.attackSpeed-champ.base.attackSpeed-
    champ.growth.attackSpeed*levels;
   const gear=clamp(gainedAD*.55+stats.abilityPower*.22+
    gearAs*12,0,40);
   return levels*1.18+gear+(champ.base.attackDamage-61)*.19;
  }
  const gearArmor=stats.armor-champ.base.armor-champ.growth.armor*levels;
  const gearHp=stats.maxHp-champ.base.maxHp-champ.growth.maxHp*levels;
  return levels*1.18+clamp(gearArmor*.56+gearHp*.025,0,20)+
   (champ.base.maxHp-650)*.021;
 }
 // Convert effective max HP and defenses to a bounded percent-HP damage
 // modifier. No HP is created, healed or teleported by the calculation.
 function mitigation(attackerRow,defenderRow,catalog=[]){
  // Historical/synthetic ledgers without explicit champion IDs preserve
  // their old combat contract, even when their role happens to match one.
  if(!attackerRow?.championId||!defenderRow?.championId)return 1;
  const target=effective(defenderRow,catalog);
  const attack=effective(attackerRow,catalog);
  if(!target||!attack)return 1;
  const baselineHp=650+95*(target.level-1);
  const hpFactor=clamp(baselineHp/target.maxHp,.77,1.19);
  const defense=attack.damageType==='magic'?target.magicResist:target.armor;
  const expected=(attack.damageType==='magic'?32+1.8*(target.level-1):
   35+3.8*(target.level-1));
  return +clamp(hpFactor*(1-(defense-expected)*.0027),.72,1.25).toFixed(4);
 }
 core.ChampionScaling=Object.freeze({DEFINITIONS,FALLBACK,STAT_KEYS,
  skillRanks,definition,effective,combatBoost,mitigation});
})(globalThis);
