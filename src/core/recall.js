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
// Minute adapter: movement precedes channeling; all combat/participation
// in the coarse minute is treated conservatively as an interruption.
// Only a fully quiet minute permits the eight-second receipt to commit.
function involved(events,id){
 return events.some(e=>{
  const f=e.facts||{};
  return f.action==='nexus'||f.actorId===id||f.targetId===id||f.initiatorId===id||
   (f.participantIds||[]).includes(id)||(f.victimIds||[]).includes(id)||
   (f.impacts||[]).some(h=>h.id===id)||(f.abilityCasts||[]).some(c=>c.casterId===id||c.targetId===id);
 });
}
function safeNode(nav,agent){
 const N=core.Navigation,side=agent.teamId===nav.a?'blue':'red';
 // Only own territory, with no nearby rival. This deliberately avoids
 // speculative enemy movement or safety claims based on unseen future.
 if(!agent.node.startsWith(side+'_')||[side+'_fountain',side+'_nexus'].includes(agent.node))return false;
 return !Object.values(nav.agents).some(p=>p.teamId!==agent.teamId&&p.alive&&N.combatRange(agent.node,p.node,2));
}
function beginMinute(state,nav,health,abilityState,minute){
 const starts=[];
 for(const team of [nav.a,nav.b]){
  const choices=Object.values(nav.agents).filter(a=>a.teamId===team&&a.alive&&
   !['retreat','shop_recall','siege','siege_return','defend','recall_recover'].includes(a.intent)&&safeNode(nav,a))
   .map(a=>{
    const r=abilityState?.entries?.[a.id],type=core.ChampionKits?.DEFINITIONS[r?.championId]?.resourceType;
    const resource=r?core.ChampionKits.projected(r,minute*60):100;
    return {a,hp:health[a.id],resource,resourceType:type,
     why:reason({hp:health[a.id],resource,resourceType:type})};
   }).filter(x=>x.why).sort((a,b)=>a.hp-b.hp||a.resource-b.resource||a.a.id.localeCompare(b.a.id));
  for(const x of choices){
   const a=x.a,side=team===nav.a?'blue':'red';
   const receipt=start(state,{id:a.id,side,node:a.node,at:minute*60,alive:true,safe:true,
    hp:x.hp,resource:x.resource,resourceType:x.resourceType});
   if(!receipt)continue;
   starts.push({...receipt,hp:x.hp,resource:x.resource,resourceType:x.resourceType||null});
   a.intent='recall_channel';a.goal=a.node;a.route=[a.node];
   a.tacticReason=receipt.reason;
   break;
  }
 }
 return starts;
}
function settleMinute(state,nav,health,starts,events,minute,dead={}){
 const receipts=[];
 for(const s of starts){
  const a=nav.agents[s.id];
  const result=advance(state,{id:s.id,at:minute*60+59,node:a.node,alive:a.alive&&(dead[a.id]||0)<=minute,
   damageTaken:Math.max(0,s.hp-health[a.id]),actionInterrupted:involved(events,s.id)});
  if(!result)throw Error('Unresolved recall '+s.id);
  receipts.push(result);
  if(result.status==='completed'){
   a.node=result.to;a.goal=result.to;a.route=[result.to];a.intent='recall_recover';
   a.retreatGoal=null;a.retreatUntil=0;a.recallArrivedAt=minute;a.tacticReason='recall_completed';
  }else if(a.alive&&(dead[a.id]||0)<=minute&&a.intent==='recall_channel'){
   a.intent='recall_cancelled';a.tacticReason='recall_'+result.interruption;
  }
 }
 return receipts;
}
function audit(match){
 if(match.recallVersion!==1)return [];
 const errors=[],state=create();let previousCount=0,previousFrame=null;
 for(const frame of match.frames){
  const t=frame.minute,starts=frame.recall?.starts||[],receipts=frame.recall?.receipts||[];
  const events=match.events.slice(previousCount,frame.eventsCount);previousCount=frame.eventsCount;
  const before=frame.navigation?.before||{},after=frame.navigation?.after||{};
  const completed=new Set(),seen=new Set(),teams=new Set();
  if(starts.length!==receipts.length)errors.push('Recall receipt count '+t);
  for(let i=0;i<starts.length;i++){
   const s=starts[i],r=receipts[i],p=before[s.id],q=after[s.id];
   const side=p?.teamId===match.fixture.a?'blue':'red';
   if(!p?.alive||p.intent!=='recall_channel'||p.node!==s.from||s.side!==side||
    !q||seen.has(s.id)||teams.has(p.teamId)||s.startedAt!==t*60||
    s.completesAt!==t*60+CHANNEL_SECONDS||
    !safeNode({a:match.fixture.a,b:match.fixture.b,agents:before}, {...p,id:s.id})){
    errors.push('Invalid recall start '+t+' '+s.id);continue;
   }
   const previousHP=previousFrame?.health?.[s.id];
   const previousKit=previousFrame?.abilityState?.entries?.[s.id];
   const expectedHP=previousHP===0||previousHP===undefined?100:Math.min(100,previousHP+6);
   const expectedType=core.ChampionKits?.DEFINITIONS[previousKit?.championId]?.resourceType||null;
   const expectedResource=previousKit?core.ChampionKits.projected(previousKit,t*60):100;
   if(s.hp!==expectedHP||s.resource!==expectedResource||s.resourceType!==expectedType)
    errors.push('Recall resources do not match previous ledger '+t+' '+s.id);
   seen.add(s.id);teams.add(p.teamId);
   const expected=start(state,{id:s.id,side,node:p.node,at:t*60,alive:true,safe:true,
    hp:s.hp,resource:s.resource,resourceType:s.resourceType});
   if(!expected||expected.reason!==s.reason){errors.push('Invalid recall reason/cooldown '+s.id);continue;}
   // The actual node of a surviving channeler is unchanged before its
   // completion; death snapshots can already be at the fountain.
   const proof=advance(state,{id:s.id,at:t*60+59,node:q.alive?p.node:q.node,alive:q.alive,
    damageTaken:Math.max(0,s.hp-(frame.health?.[s.id]??s.hp)),actionInterrupted:involved(events,s.id)});
   if(JSON.stringify(proof)!==JSON.stringify(r))errors.push('Forged recall receipt '+t+' '+s.id);
   if(proof?.status==='completed'){
    completed.add(s.id);
    if(q.node!==side+'_fountain'||q.intent!=='recall_recover')errors.push('Recall destination '+s.id);
   }
  }
  for(const [id,p] of Object.entries(before)){
   const q=after[id];
   if(p.alive&&q?.alive&&p.node!==q.node&&!completed.has(id))
    errors.push('Unproved within-minute movement '+t+' '+id);
   if(p.intent==='recall_channel'&&!seen.has(id))errors.push('Channel without receipt '+t+' '+id);
  }
  previousFrame=frame;
 }
 return errors;
}
core.Recall=Object.freeze({CHANNEL_SECONDS,COOLDOWN_SECONDS,THRESHOLDS,create,reason,start,advance,snapshot,beginMinute,settleMinute,audit});
})(globalThis);
