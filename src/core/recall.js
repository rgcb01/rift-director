/* Alpha 0.7.19A: deterministic recall state machine.
 * Pure transition API: caller owns position, HP, clocks and replay.
 * A completion receipt is NOT permission to mutate navigation without audit.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const CHANNEL_SECONDS=8;
const COOLDOWN_SECONDS=60;
const THRESHOLDS=Object.freeze({criticalHP:20,lowHP:45,lowMana:15,readyHP:90,readyMana:90});
const validTime=t=>Number.isSafeInteger(t)&&t>=0;
const finitePercent=x=>Number.isFinite(x)&&x>=0&&x<=100;
const fountainFor=side=>side+'_fountain';
function create(){return {version:1,entries:{}};}
function reason({hp,resource,resourceType,canBuy=false,waveSafe=false,objectiveSoon=false}){
 if(!finitePercent(hp))return null;
 if(hp<=THRESHOLDS.criticalHP)return 'critical_health';
 if(resourceType==='mana'&&finitePercent(resource)&&resource<=THRESHOLDS.lowMana)return 'low_mana';
 if(hp<=THRESHOLDS.lowHP)return 'low_health';
 if(canBuy&&waveSafe&&!objectiveSoon)return 'item_spike';
 return null;
}
function start(state,{id,side,node,at,alive,hp,resource,resourceType,safe,canBuy,waveSafe,objectiveSoon}){
 if(typeof id!=='string'||!id||!['blue','red'].includes(side)||typeof node!=='string'||
  !validTime(at)||alive!==true||safe!==true||node===fountainFor(side))return null;
 const prior=state.entries[id];
 if(prior?.status==='channeling'||(prior&&at<prior.endedAt+COOLDOWN_SECONDS))return null;
 const why=reason({hp,resource,resourceType,canBuy,waveSafe,objectiveSoon});
 if(!why)return null;
 const row={id,side,from:node,startedAt:at,completesAt:at+CHANNEL_SECONDS,
  checkedAt:at,status:'channeling',reason:why};
 state.entries[id]=row;
 return {...row};
}
function advance(state,{id,at,node,alive,damageTaken=0,actionInterrupted=false}){
 const row=state.entries[id];
 if(!row||row.status!=='channeling'||!validTime(at)||at<row.checkedAt||
    !Number.isFinite(damageTaken)||damageTaken<0)return null;
 row.checkedAt=at;
 // Caller must deliver interruptions in chronological order, before a
 // completion at the same timestamp. A coarse tick cannot prove an 8s channel.
 const interruption=alive!==true?'death':node!==row.from?'movement':
  damageTaken>0?'damage':actionInterrupted?'action':null;
 if(interruption){
  row.status='cancelled';row.endedAt=at;row.interruption=interruption;
  return {...row};
 }
 if(at<row.completesAt)return null;
 row.status='completed';row.endedAt=row.completesAt;row.to=fountainFor(row.side);
 return {...row};
}
function snapshot(state){return {version:1,entries:Object.fromEntries(
 Object.entries(state.entries).map(([id,row])=>[id,{...row}]))};}
core.Recall=Object.freeze({CHANNEL_SECONDS,COOLDOWN_SECONDS,THRESHOLDS,create,reason,start,advance,snapshot});
})(globalThis);
