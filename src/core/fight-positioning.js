/* Local tactical positions. Map nodes remain authoritative anchors:
 * offsets are bounded to 18 map units and never create new graph paths.
 * Two seconds of a five-second window may be spent moving up to 8 units.
 * All decisions inspect the same snapshot; moving does not grant an attack.
 * This local open-space approximation does not model terrain collision.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const RADIUS=18,STEP=8,MOVE_SECONDS=2;
const active=p=>p?.alive&&p.hp>0&&!['retreat','recall_channel','recall_recover','dead'].includes(p.intent);
const kind=(p,power)=>core.ChampionScaling.definition(power.entries[p.id])?.archetype;
const carry=t=>['marksman','mage'].includes(t);
const front=t=>['tank','fighter'].includes(t);
const round=n=>Math.round(n*1000)/1000;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function point(p){
 const [x,y]=core.MiniGraph.nodes[p.node],o=p.offset||{x:0,y:0};
 if(!Number.isFinite(o.x)||!Number.isFinite(o.y)||Math.hypot(o.x,o.y)>RADIUS+.002)
  throw Error('Invalid local offset '+p.id);
 return {x:x+o.x,y:y+o.y};
}
function reach(a,b,limit=76){
 return core.Navigation.combatRange(a.node,b.node,2)&&dist(point(a),point(b))<=limit;
}
function range(p,power){
 const t=kind(p,power);
 return t==='marksman'?76:t==='mage'?68:t==='support'?62:35;
}
function propose(p,delta){
 const o=p.offset||{x:0,y:0};
 let x=o.x+delta.x,y=o.y+delta.y;
 const len=Math.hypot(x,y);if(len>RADIUS){x*=RADIUS/len;y*=RADIUS/len;}
 return {x:round(x),y:round(y)};
}
function plan({state,powerState}){
 const fighters=Object.values(state.players).filter(active).sort((a,b)=>a.id.localeCompare(b.id));
 const movements=[];
 for(const p of fighters){
  if((p.controlUntil||0)>state.at)continue;
  const here=point(p),type=kind(p,powerState);
  const foes=fighters.filter(q=>q.teamId!==p.teamId&&core.Navigation.combatRange(p.node,q.node,2));
  const allies=fighters.filter(q=>q.teamId===p.teamId&&q.id!==p.id);
  const nearest=foes.slice().sort((a,b)=>dist(here,point(a))-dist(here,point(b))||a.id.localeCompare(b.id))[0];
  if(!nearest)continue;
  const nearestPoint=point(nearest),d=dist(here,nearestPoint);
  let target=nearest,goal=null,reason=null;
  const allyCarry=allies.filter(q=>carry(kind(q,powerState))&&reach(p,q))
   .sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];
  if(p.hp<=25){
   reason='disengage';goal={x:here.x-(nearestPoint.x-here.x),y:here.y-(nearestPoint.y-here.y)};
  }else if(carry(type)&&d<range(p,powerState)*.60){
   reason='kite';goal={x:here.x-(nearestPoint.x-here.x),y:here.y-(nearestPoint.y-here.y)};
  }else if((type==='support'||type==='tank')&&allyCarry&&foes.some(q=>reach(q,allyCarry,35))){
   const threat=foes.filter(q=>reach(q,allyCarry,35)).sort((a,b)=>dist(point(a),point(allyCarry))-dist(point(b),point(allyCarry))||a.id.localeCompare(b.id))[0];
   const c=point(allyCarry),e=point(threat);target=threat;
   goal={x:(c.x+e.x)/2,y:(c.y+e.y)/2};reason='screen';
  }else if(type==='assassin'){
   const exposed=foes.filter(q=>carry(kind(q,powerState))&&!fighters.some(g=>g.teamId===q.teamId&&g.id!==q.id&&front(kind(g,powerState))&&reach(g,q,35)))
    .sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];
   if(exposed){target=exposed;const e=point(exposed);const dx=e.x-here.x,dy=e.y-here.y;
    const sign=p.id.localeCompare(exposed.id)<0?1:-1;
    goal={x:e.x-dy*.35*sign,y:e.y+dx*.35*sign};reason='flank';}
  }
  if(!goal&&d>range(p,powerState)*.85){goal=nearestPoint;reason='approach';}
  if(!goal)continue;
  let dx=goal.x-here.x,dy=goal.y-here.y,len=Math.hypot(dx,dy);
  if(len<.01){if(!['kite','disengage'].includes(reason))continue;
   // Coincident points have no direction; choose a stable team-facing axis.
   const first=fighters.find(q=>q.teamId!==p.teamId);
   dx=p.teamId.localeCompare(first.teamId)<0?-1:1;dy=0;len=1;
  }
  const to=propose(p,{x:dx/len*Math.min(STEP,len),y:dy/len*Math.min(STEP,len)});
  const from=p.offset||{x:0,y:0};
  if(dist(from,to)<.01)continue;
  movements.push({actorId:p.id,node:p.node,from:{...from},to,seconds:MOVE_SECONDS,reason,targetId:target.id});
 }
 return movements;
}
function apply(state,movements){
 const players=Object.fromEntries(Object.entries(state.players).map(([id,p])=>[id,{...p,offset:{...(p.offset||{x:0,y:0})}}]));
 const seen=new Set();
 for(const m of movements){
  const p=players[m.actorId];
  if(!active(p)||seen.has(m.actorId)||p.node!==m.node||(p.controlUntil||0)>state.at||
     m.seconds!==MOVE_SECONDS||!Number.isFinite(m.from?.x)||!Number.isFinite(m.from?.y)||dist(p.offset,m.from)>.001||
     !Number.isFinite(m.to?.x)||!Number.isFinite(m.to?.y)||
     Math.hypot(m.to.x,m.to.y)>RADIUS+.002||dist(m.from,m.to)>STEP+.002)
    throw Error('Illegal local movement '+m.actorId);
  seen.add(m.actorId);p.offset={...m.to};
 }
 return {...state,players};
}
core.FightPositioning=Object.freeze({RADIUS,STEP,MOVE_SECONDS,point,reach,range,plan,apply});
})(globalThis);
