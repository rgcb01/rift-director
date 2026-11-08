/* Rift Director — Alpha 0.7.7: lane pressure and economic incentives.
 * Small deterministic strategic model; not a per-minion physics simulator.
 * All writes are match-local. No DOM, no timers and no gameplay RNG.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const LANES=['TOP','MID','BOT'];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const roleLane=r=>r==='ADC'||r==='SUP'?'BOT':r==='TOP'||r==='MID'?r:null;
const lanesOf=ids=>Object.fromEntries(LANES.map(l=>[l,{
  front:0,
  // Each defending team owns up to three physical structures per lane.
  // Their plates are a local measure of partial structural damage.
  plates:Object.fromEntries(ids.map(id=>[id,[0,0,0]])),
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
function advance(model,{minute,nav,map,health,gold}){
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
  // Both actions require physical presence: a defended incoming wave loses
  // momentum, while a solo push has less momentum than a squad siege.
  const escortDelta=(escort(a)-escort(b))*.36+
    (macroEscort(a)-macroEscort(b))*.16+
    (defenseEscort(a)-defenseEscort(b))*.12;
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
 // A crashing wave or a genuinely prolonged map siege enables damage.
 // This is not a guaranteed kill/tower: agents must still be present.
 return momentum>=.65||(minute>=48&&momentum>=-1.25);
}
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
  firstTower:model.firstTower?{...model.firstTower}:null,
  lanes:Object.fromEntries(LANES.map(l=>[l,{
   front:model.lanes[l].front,
   plates:Object.fromEntries(model.teamIds.map(id=>[id,[...model.lanes[l].plates[id]]])),
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
   for(const plates of Object.values(v?.plates||{}))
    if(!Array.isArray(plates)||plates.length!==3||
       plates.some(p=>!Number.isInteger(p)||p<0||p>3))
     errors.push('Placas inválidas: '+lane+' min '+frame.minute);
  }
 }
 return errors;
}
core.LaneEconomy=Object.freeze({create,advance,presence,pressureFor,
 canPressureTower,claimPlate,hasBrokenPlates,firstTowerBonus,snapshot,audit});
})(globalThis);
