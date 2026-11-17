/* 0.7.19G simultaneous combat kernel (isolated prototype).
 * Every attack is authorized from the SAME start-of-window snapshot.
 * No live map, HP, KDA, RNG or ability ledger is mutated by this module.
 * Damage packets must be computed by a future authoritative combat adapter.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const WINDOW_SECONDS=5;
const active=p=>p.alive&&p.hp>0&&!['retreat','recall_channel','recall_recover','dead'].includes(p.intent);
const clone=players=>Object.fromEntries(Object.entries(players).map(([id,p])=>[id,{...p}]));
function create({id,at,players}){
 if(typeof id!=='string'||!id||!Number.isSafeInteger(at)||at<0||!players||
    ![6,7,8,9,10].includes(Object.keys(players).length))throw Error('Invalid fight start');
 const teams=new Map();
 for(const [key,p] of Object.entries(players)){
  if(p.id!==key||typeof p.teamId!=='string'||!p.teamId||
     !Number.isSafeInteger(p.hp)||p.hp<1||p.hp>100||!active(p)||
     !core.Navigation.adjacency[p.node])throw Error('Invalid fighter '+key);
  teams.set(p.teamId,(teams.get(p.teamId)||0)+1);
 }
 if(teams.size!==2||[...teams.values()].some(n=>n<3||n>5))throw Error('Invalid opposing formations');
 for(const p of Object.values(players)){
  if(!Object.values(players).some(q=>q.teamId!==p.teamId&&core.Navigation.combatRange(p.node,q.node,2)))
   throw Error('Isolated fighter '+p.id);
 }
 return {version:1,id,at,tick:0,players:clone(players)};
}
function resolve(state,actions){
 if(!Array.isArray(actions))throw Error('Invalid fight actions');
 const before=state.players,seen=new Set(),incoming=new Map(),accepted=[];
 // At most one strike per actor in a window. Deaths are NOT evaluated
 // until all packets have been collected and checked.
 for(const action of actions){
  const {actorId,targetId,damage}=action;
  const actor=before[actorId],target=before[targetId];
  if(seen.has(actorId)||!actor||!target||!active(actor)||!active(target)||
     actor.teamId===target.teamId||!core.Navigation.combatRange(actor.node,target.node,2)||
     !Number.isSafeInteger(damage)||damage<1||damage>120)
    throw Error('Illegal simultaneous strike '+actorId+' -> '+targetId);
  seen.add(actorId);
  const packet={actorId,targetId,damage};
  accepted.push(packet);
  const hits=incoming.get(targetId)||[];hits.push(packet);incoming.set(targetId,hits);
 }
 accepted.sort((a,b)=>a.actorId.localeCompare(b.actorId));
 const after=clone(before),impacts=[],deaths=[];
 for(const [id,hits] of [...incoming.entries()].sort(([a],[b])=>a.localeCompare(b))){
  // Deterministic overkill allocation: proportional to each packet's
  // contribution, then largest remainder, then stable actor ID.
  const hp=before[id].hp,total=hits.reduce((n,h)=>n+h.damage,0),loss=Math.min(hp,total);
  const credits=hits.map(h=>({actorId:h.actorId,rawDamage:h.damage,
   damage:Math.floor(loss*h.damage/total),remainder:(loss*h.damage)%total}))
   .sort((a,b)=>b.remainder-a.remainder||a.actorId.localeCompare(b.actorId));
  let residual=loss-credits.reduce((n,h)=>n+h.damage,0);
  for(const h of credits){if(residual>0){h.damage++;residual--;}delete h.remainder;}
  credits.sort((a,b)=>b.damage-a.damage||a.actorId.localeCompare(b.actorId));
  const hpAfter=hp-loss;
  after[id].hp=hpAfter;
  if(hpAfter===0){
   after[id].alive=false;after[id].intent='dead';
   deaths.push({victimId:id,killerId:credits[0].actorId,
    assistIds:credits.slice(1).filter(h=>h.damage>0).map(h=>h.actorId)});
  }
  impacts.push({targetId:id,hpBefore:hp,hpAfter,damage:loss,credits});
 }
 const next={...state,at:state.at+WINDOW_SECONDS,tick:state.tick+1,players:after};
 return {state:next,receipt:{version:1,id:state.id,tick:next.tick,
  from:state.at,to:next.at,actions:accepted,impacts,deaths}};
}
function audit(initial,receipts){
 let state=initial;const errors=[];
 for(const receipt of receipts){
  try{
   const next=resolve(state,receipt.actions);
   if(JSON.stringify(next.receipt)!==JSON.stringify(receipt))errors.push('Forged simultaneous receipt '+receipt.tick);
   state=next.state;
  }catch(e){errors.push(String(e.message));break;}
 }
 return {errors,state};
}
core.SimultaneousFight=Object.freeze({WINDOW_SECONDS,create,resolve,audit});
})(globalThis);
