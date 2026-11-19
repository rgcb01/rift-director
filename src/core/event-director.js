/* Event Director: presentation-only relevance. Authoritative events/moments
 * and all sporting audits remain unchanged. Classification is deterministic
 * and uses only facts available at the event, never future outcomes.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const LEVEL=Object.freeze({routine:0,record:1,tactical:2,major:3,decisive:4});
const routine=new Set(['recall_start','recall_complete','recall_cancel','fountain_recovery','return_to_lane','rotation','farm','move','resource_regen']);
const count=x=>Array.isArray(x)?x.length:0;
function classify(event,{first=false}={}){
 const f=event?.facts||{},a=f.action;
 if(first||a==='nexus'||event?.kind==='end')return LEVEL.decisive;
 if(f.stolen||f.ace||count(f.victimIds)>=3||f.bountyGold>0||
    f.simultaneous?.receipts?.some(r=>r.awards.some(x=>x.bountyGold>0)))return LEVEL.decisive;
 if(count(f.victimIds)>0||f.outcome==='kill'||['gank','teamfight','simultaneous_fight','tower','dragon','baron'].includes(a))return LEVEL.major;
 if(a==='recall_cancel'&&f.interruption==='damage')return LEVEL.tactical;
 if(routine.has(a))return LEVEL.routine;
 if(a==='item_purchase'){
  const catalog=core.PowerEconomy?.ITEM_CATALOG||[];
  const full=catalog.some(x=>x.id===f.itemId);
  return full?LEVEL.tactical:LEVEL.record;
 }
 if(a==='ward_place'||a==='tower_damage')return LEVEL.record;
 if(a==='plate')return f.plate===1?LEVEL.tactical:LEVEL.record;
 if(a==='nexus_damage')return f.after<=25?LEVEL.major:LEVEL.tactical;
 if(event?.kind==='insight')return LEVEL.tactical;
 if(f.combatVersion===1||['gank_avoided','skirmish','clash','lane_trade'].includes(a)){
  const dangerous=(f.impacts||[]).some(x=>x.retreat&&x.hpAfter<=30)||
   (f.outcome==='retreat'&&f.hpAfter<=30);
  const group=f.mode==='teamfight'&&(f.attackerCount||0)>=3&&(f.defenderCount||0)>=3;
  return group?LEVEL.major:dangerous?LEVEL.tactical:LEVEL.record;
 }
 // Unknown legacy facts remain visible rather than silently hiding milestones.
 return a?LEVEL.tactical:event?.kind==='normal'?LEVEL.record:LEVEL.tactical;
}
function select(feed){
 const last=new Map(),seenGroups=new Set();
 return feed.map((event,index)=>{
  const importance=classify(event,{first:index===0});
  const f=event.facts||{};
  // Important actions are never rate limited. Tactical chatter is spaced by
  // topic/team/lane or actor, without looking at later frames.
  const key=[event.source==='insight'?event.topic:f.action,event.teamId,f.lane,
   f.action==='item_purchase'?f.actorId:null].join('|');
  const prior=last.get(key)??-Infinity;
  const groupId=f.simultaneous?.encounter?.id||f.groupFight?.id;
  const repeatedGroup=groupId&&seenGroups.has(groupId);
  if(groupId)seenGroups.add(groupId);
  // Keep the first engagement and every real kill; suppress subsequent
  // nonlethal exchanges of the same fight without looking ahead.
  const visible=(!repeatedGroup||count(f.victimIds)>0||importance===LEVEL.decisive||f.simultaneous?.encounter&&f.groupFight?.round===1)&&(importance>=LEVEL.major||
   importance===LEVEL.tactical&&event.minute-prior>=3);
  if(visible)last.set(key,event.minute);
  return {...event,importance,narrativeVisible:visible};
 });
}
core.EventDirector=Object.freeze({LEVEL,classify,select});
})(globalThis);
