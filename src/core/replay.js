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
core.MatchReplay=Object.freeze({attachReplay,timeline,ensure,seek,next,complete,auditMoments});
})(globalThis);
