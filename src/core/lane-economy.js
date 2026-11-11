/* Rift Director — Alpha 0.7.7: lane pressure and economic incentives.
 * Small deterministic strategic model; not a per-minion physics simulator.
 * All writes are match-local. No DOM, no timers and no gameplay RNG.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const LANES=['TOP','MID','BOT'];
// A tower yields three plates as it actually loses its three thirds of HP.
const TOWER_HP=Object.freeze([60,72,84]);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const roleLane=r=>r==='ADC'||r==='SUP'?'BOT':r==='TOP'||r==='MID'?r:null;
const lanesOf=ids=>Object.fromEntries(LANES.map(l=>[l,{
  front:0,
  // Each defending team owns up to three physical structures per lane.
  // Their plates are a local measure of partial structural damage.
  plates:Object.fromEntries(ids.map(id=>[id,[0,0,0]])),
  hp:Object.fromEntries(ids.map(id=>[id,[...TOWER_HP]])),
  farm:Object.fromEntries(ids.map(id=>[id,0]))
}]));
function create(a,b){
 return {version:1,teamIds:[a,b],lanes:lanesOf([a,b]),firstTower:null,
  income:{[a]:{farm:0,plates:0,firstTower:0},[b]:{farm:0,plates:0,firstTower:0}}};
}
function pressureFor(model,id,lane){
 const [a,b]=model.teamIds;
 const front=model.lanes[lane].front;
 return id===a?front:id===b?-front:0;
}
function presence(nav,team,lane,health){
 return Object.values(nav.agents).filter(p=>p.teamId===team&&p.alive&&
  (roleLane(p.role)===lane||
   ['siege','splitpush','counterpush','counter_siege'].includes(p.intent))&&
  core.Navigation.isLaneNode(p.node,lane)&&
  (health[p.id]??100)>=26).length;
}
function advance(model,{minute,nav,map,health,gold,structures=null}){
 const [a,b]=model.teamIds;
 const earnings=[];
 for(const lane of LANES){
  const record=model.lanes[lane],vision=map.lanes[lane];
  const va=presence(nav,a,lane,health),vb=presence(nav,b,lane,health);
  const pa=vision.pressure[a],pb=vision.pressure[b];
  // Every living member physically escorting a siege contributes to
  // pushing a minion wave, regardless of their assigned lane role.
  // A teamfight that kills the escorts stops this pressure immediately.
  const escort=id=>Object.values(nav.agents).filter(p=>p.alive&&
    p.teamId===id&&['siege','splitpush','counterpush'].includes(p.intent)&&
    core.Navigation.isLaneNode(p.node,lane)).length;
  const macroEscort=id=>Object.values(nav.agents).filter(p=>p.alive&&
    p.teamId===id&&p.intent==='macro_pressure'&&
    core.Navigation.isLaneNode(p.node,lane)).length;
  const defenseEscort=id=>Object.values(nav.agents).filter(p=>p.alive&&
    p.teamId===id&&p.intent==='macro_defend'&&
    core.Navigation.isLaneNode(p.node,lane)).length;
  // Once all three towers of a specific lane are gone, an attacking
  // squad physically holding the enemy Nexus is still escorting *that*
  // lane's wave. The old lane-node-only model incorrectly forgot these
  // four professionals when they entered the opponent's base.
  // No gold is generated for being at the Nexus: farm still depends on
  // being in the lane itself. This only affects physically earned momentum.
  const nexusEscort=id=>{
   const foe=id===a?b:a;
   if(structures?.[foe]?.[lane]!==3)return 0;
   const target=(foe===a?'blue':'red')+'_nexus';
   const present=core.Navigation.participants(nav,id,target,1).filter(p=>
    p.alive&&(health[p.id]??100)>=26&&
    ['siege','splitpush','counterpush'].includes(p.intent));
   return present.length>=2?present.length:0;
  };
  const escortDelta=(escort(a)-escort(b))*.36+
    (macroEscort(a)-macroEscort(b))*.16+
    (defenseEscort(a)-defenseEscort(b))*.12+
    (nexusEscort(a)-nexusEscort(b))*.29;
  const difference=(pa-pb)*.035+(va-vb)*.65+escortDelta;
  const momentum=clamp(difference,-1.35,1.35);
  // Dissipating momentum: a wave cannot remain permanently won when its
  // pushing team abandons the lane or a defender returns.
  record.front=Math.round(clamp(record.front*.82+momentum,-3.8,3.8)*100)/100;
  for(const [id,units] of [[a,va],[b,vb]]){
   if(!units)continue;
   const advantage=pressureFor(model,id,lane);
   const lastHit=clamp(Math.round(38+pa*.0+
      (id===a?pa:pb)*.45+advantage*13),35,115);
   const amount=Math.round(lastHit*(units>1?1.08:1));
   gold[id]+=amount;
   record.farm[id]+=amount;
   model.income[id].farm+=amount;
   earnings.push({lane,teamId:id,gold:amount});
  }
 }
 return earnings;
}
function canPressureTower(model,id,lane,stage,minute){
 if(!LANES.includes(lane)||stage<1||stage>3)return false;
 const momentum=pressureFor(model,id,lane);
 // A moderately favourable wave lets players physically chip tower HP,
 // instead of waiting for a fully crashed wave before any structural damage.
 // Plates still demand crossing one-third of real HP with agents present.
 // A structurally valid wave is required at every stage of the match.
 // No time-based licence to hit a tower with a losing wave.
 return momentum>=.25;
}
// Match-local deterministic HP loss; the caller proves physical presence.
function damageValue({stage,attackers,defenders,wave,baron}){
 if(!Number.isInteger(stage)||stage<1||stage>3||
    !Number.isInteger(attackers)||attackers<1||attackers>5||
    !Number.isInteger(defenders)||defenders<0||defenders>5||
    !Number.isFinite(wave))return 0;
 return Math.max(0,Math.min(TOWER_HP[stage-1]/3,
  Math.round(8+attackers*9+Math.max(0,Math.min(2.5,wave))*4+
   (baron?7:0)-defenders*6)));
}
function damageTower(model,{teamId,defenderId,lane,stage,minute,
 attackers,defenders,soloAllowed=false,baron=false}){
 if(!model.teamIds.includes(teamId)||!model.teamIds.includes(defenderId)||
    teamId===defenderId||!LANES.includes(lane)||stage<1||stage>3||
    !Number.isInteger(attackers)||attackers<1||attackers>5||
    !Number.isInteger(defenders)||defenders<0||defenders>5||
    !canPressureTower(model,teamId,lane,stage,minute))return null;
 const hp=model.lanes[lane].hp[defenderId],plates=model.lanes[lane].plates[defenderId];
 const before=hp[stage-1],maximum=TOWER_HP[stage-1];
 if(before<=0)return null;
 const wave=pressureFor(model,teamId,lane);
 const rawDamage=damageValue({stage,attackers,defenders,wave,baron});
 if(rawDamage<=0)return null;
 // A solo player can chip tower HP; finishing it requires an escorted push
 // or a bona fide uncontested splitpush with a strong crashing wave.
 const mayFinish=attackers>=2||Boolean(soloAllowed);
 const after=Math.max(mayFinish?0:1,before-rawDamage);
 const damage=before-after;
 if(damage<=0)return null;
 hp[stage-1]=after;
 const plate=Math.min(3,Math.floor((maximum-after)*3/maximum));
 const awarded=plate>plates[stage-1];
 if(awarded&&plate!==plates[stage-1]+1)
  throw Error('Tower took more than one plate of damage in one tick');
 if(awarded)plates[stage-1]=plate;
 const goldReward=awarded?Math.max(55,125-Math.max(0,minute-14)*2):0;
 model.income[teamId].plates+=goldReward;
 return {before,after,damage,rawDamage,plate:awarded?plate:null,
  goldReward,destructible:mayFinish,destroyed:after===0,wave,baron};
}
// Legacy helper for prior economic unit tests; the live match uses damageTower.
function claimPlate(model,{teamId,defenderId,lane,stage,minute}){
 if(!canPressureTower(model,teamId,lane,stage,minute))return null;
 const count=model.lanes[lane].plates[defenderId][stage-1];
 if(count>=3)return null;
 const plate=count+1;
 model.lanes[lane].plates[defenderId][stage-1]=plate;
 const gold=Math.max(55,125-Math.max(0,minute-14)*2);
 model.income[teamId].plates+=gold;
 return {plate,gold};
}
function hasBrokenPlates(model,defender,lane,stage){
 return model.lanes[lane].plates[defender][stage-1]>=3;
}
function firstTowerBonus(model,teamId,minute){
 if(model.firstTower)return 0;
 model.firstTower={teamId,minute};
 model.income[teamId].firstTower+=300;
 return 300;
}
function snapshot(model){
 return {version:model.version,
  towerMaxHp:[...TOWER_HP],
  firstTower:model.firstTower?{...model.firstTower}:null,
  lanes:Object.fromEntries(LANES.map(l=>[l,{
   front:model.lanes[l].front,
   plates:Object.fromEntries(model.teamIds.map(id=>[id,[...model.lanes[l].plates[id]]])),
   hp:Object.fromEntries(model.teamIds.map(id=>[id,[...model.lanes[l].hp[id]]])),
   farm:{...model.lanes[l].farm}
  }])),
  income:Object.fromEntries(model.teamIds.map(id=>[id,{...model.income[id]}]))};
}
function audit(match){
 const errors=[];
 for(const frame of match.frames||[]){
  const l=frame.laneEconomy;
  if(!l)continue; // legacy v2 match without economy is accepted.
  for(const lane of LANES){
   const v=l.lanes?.[lane];
   if(!v||!Number.isFinite(v.front)||Math.abs(v.front)>3.8)
    errors.push('Oleada inválida: '+lane+' min '+frame.minute);
   for(const hp of Object.values(v?.hp||{}))
    if(!Array.isArray(hp)||hp.length!==3||
       hp.some((n,i)=>!Number.isSafeInteger(n)||n<0||n>TOWER_HP[i]))
     errors.push('Vida de torre inválida: '+lane+' min '+frame.minute);
   for(const plates of Object.values(v?.plates||{}))
    if(!Array.isArray(plates)||plates.length!==3||
       plates.some(p=>!Number.isInteger(p)||p<0||p>3))
     errors.push('Placas inválidas: '+lane+' min '+frame.minute);
  }
 }
 return errors;
}
core.LaneEconomy=Object.freeze({TOWER_HP,create,advance,presence,pressureFor,
 canPressureTower,damageValue,damageTower,claimPlate,hasBrokenPlates,firstTowerBonus,snapshot,audit});
})(globalThis);
