/* Rift Director Alpha 0.7: replay by recorded moments, no playback timers.
 * New games store post-event snapshots. Old v2 matches fall back to minute frames.
 * Review position and unlocked progress are deliberately separate.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function attachReplay(match,world){
 if(Array.isArray(match.moments)&&match.moments.length===match.events.length){
  const reconstruction={fixture:match.fixture,events:match.events,frames:match.moments};
  core.attachMinimap(reconstruction,world);
 }
 match.replayCursor=0;
 match.replayProgress=0;
 match.running=false;
 return match;
}
function timeline(match){
 if(!match?.frames?.length)return [];
 const feed=core.broadcastFeed(match);
 return feed.map((event,index)=>{
  const moment=event.source==='match'&&Number.isInteger(event.eventIndex)?
    match.moments?.[event.eventIndex]:null;
  const frame=moment||match.frames.find(x=>x.minute===event.minute)||
    match.frames[Math.max(0,match.frames.findIndex(x=>x.minute>event.minute)-1)]||
    match.frames.at(-1);
  return {index,event,frame,precise:Boolean(moment)};
 });
}
function ensure(match) {
 const list=timeline(match);
 if(!list.length)return {list,cursor:0,progress:0};
 const end=list.length-1;
 if(!Number.isInteger(match.replayProgress)){
  const elapsed=Math.max(0,Math.min(match.frames.length-1,match.elapsed||0));
  const cutoff=match.frames[elapsed]?.minute??0;
  const sourceLimit=Number.isInteger(match.visibleCount)?match.visibleCount:
    core.feedCountAt(match,elapsed);
  match.replayProgress=match.finished?end:
    clamp(Math.min(end,sourceLimit-1),0,end);
  // Old saves do not have per-event moments, so their older minute-level
  // visibility is the best available place from which to resume.
  if(match.replayProgress===0 && elapsed>0)
    match.replayProgress=clamp(list.filter(x=>x.event.minute<=cutoff).length-1,0,end);
 }
 match.replayProgress=clamp(match.replayProgress,0,end);
 if(match.finished)match.replayProgress=end;
 if(!Number.isInteger(match.replayCursor))match.replayCursor=match.replayProgress;
 match.replayCursor=clamp(match.replayCursor,0,match.replayProgress);
 return {list,cursor:match.replayCursor,progress:match.replayProgress};
}
function seek(match,index){
 const {list,progress}=ensure(match);
 if(!Number.isInteger(index)||index<0||index>progress||index>=list.length)
  return false;
 match.replayCursor=index;
 return true;
}
function next(match){
 const {list,cursor,progress}=ensure(match);
 if(!list.length)return false;
 const target=Math.min(cursor+1,list.length-1);
 match.replayCursor=target;
 match.replayProgress=Math.max(progress,target);
 return target===list.length-1;
}
function complete(match){
 const list=timeline(match);
 if(!list.length)return false;
 match.replayProgress=list.length-1;
 match.replayCursor=list.length-1;
 return true;
}
// Event-centric scene: use the original pre-combat navigation nodes, NEVER
// move a player to the narration's claimed location. A kill's victim is
// pictured fallen at the fight, even though the post-event state is fountain.
function eventView(match,eventIndex){
 const event=match?.events?.[eventIndex],moment=match?.moments?.[eventIndex];
 const f=event?.facts,pre=moment?.navigation?.before,map=moment?.minimap;
 if(!f||!pre||!map?.players)return null; // old v2 replay: no invented coordinates
 const ids=[...new Set([f.initiatorId,f.actorId,f.supportId,f.targetId,
   ...(f.assistIds||[]),...(f.participantIds||[]),...(f.victimIds||[])]
   .filter(Boolean))];
 const participants=ids.filter(id=>pre[id]&&map.players[id]);
 if(!participants.length)return null;
 const offsets=[[0,-10],[13,7],[-13,7],[14,-11],[-14,-11],[0,17]];
 const perNode=new Map(),players={...map.players};
 for(const id of participants){
  const node=pre[id].node;
  if(!core.MiniGraph.nodes[node])return null;
  const slot=perNode.get(node)||0;
  perNode.set(node,slot+1);
  const [dx,dy]=offsets[slot%offsets.length],p=core.MiniGraph.pointAt(node);
  const fallen=Boolean(f.victimIds?.includes(id));
  players[id]={...map.players[id],
    x:Math.min(328,Math.max(12,p.x+dx)),
    y:Math.min(328,Math.max(12,p.y+dy)),
    node,fallen,alive:fallen?false:pre[id].alive,sceneRole:
       fallen?'victima':id===f.initiatorId?'jungla':
       id===f.targetId?'objetivo':id===f.actorId?'asesino': 'apoyo'};
 }
 const attempted=f.action==='gank'||f.action==='gank_avoided';
 const targetId=f.action==='gank_avoided'?f.targetId:f.victimIds?.[0];
 const i=pre[f.initiatorId],v=pre[targetId];
 const consistent=!attempted||Boolean(i&&v&&
   core.Navigation?.combatRange?.(i.node,v.node,2)&&
   core.Navigation?.isLaneNode?.(v.node,f.lane)&&
   (f.initiatorNode===undefined||f.initiatorNode===i.node)&&
   ((f.action==='gank_avoided'?f.targetNode:f.victimNode)===undefined||
    (f.action==='gank_avoided'?f.targetNode:f.victimNode)===v.node));
 return {
  frame:{...moment,minimap:{...map,players}},
  participants,
  consistent,
  action:f.action,
  focusNode:attempted?v?.node:f.node||null,
  // For old sports histories with inconsistent locations, show a warning
  // instead of teleporting the jungler into a place he never occupied.
  legacyLocationWarning:attempted&&!consistent
 };
}
function auditMoments(match,world){
 if(!match?.moments)return [];
 const faults=[];
 if(match.moments.length!==match.events.length)return ['Cantidad de instantáneas por jugada incorrecta'];
 for(let i=0;i<match.events.length;i++){
  const m=match.moments[i],e=match.events[i];
  if(m.minute!==e.minute||m.time!==e.time||m.eventsCount!==i+1)
    faults.push('Momento y evento no coinciden: '+i);
  if(!m.minimap||Object.keys(m.minimap.players||{}).length!==10)
    faults.push('Minimapa incompleto en jugada '+i);
 }
 const clones=match.moments.map(f=>({...f}));
 try{
  core.attachMinimap({fixture:match.fixture,events:match.events,frames:clones},world);
  for(let i=0;i<clones.length;i++)
   if(JSON.stringify(clones[i].minimap)!==JSON.stringify(match.moments[i].minimap))
    faults.push('Minimapa alterado en jugada '+i);
 }catch(error){faults.push('Error al auditar la jugada: '+error.message);}
 return faults;
}
core.MatchReplay=Object.freeze({attachReplay,timeline,ensure,seek,next,complete,eventView,auditMoments});
})(globalThis);
