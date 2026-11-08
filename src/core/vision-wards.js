/* Rift Director Alpha 0.7.13 — physical, expiring team wards.
 * Placement is caused by JUN/SUP presence in contested map nodes.
 * Wards reveal only opponents inside a local radius; no hidden HP, global
 * positions or winner are exposed to the decision model.
 * No global RNG, timers or DOM access.
 */
((root)=>{
 'use strict';
 const core=root.RiftCore||(root.RiftCore={});
 const graph=core.MiniGraph;
 const spots=new Set([
  'upper_river','lower_river','dragon_pit','baron_pit',
  'blue_top_ambush','red_top_ambush','blue_bot_ambush','red_bot_ambush'
 ]);
 const range=70,ttl=8,cooldown=9,limit=2;
 const distance=(a,b)=>{
  if(!graph.nodes[a]||!graph.nodes[b])return Infinity;
  const x=graph.pointAt(a),y=graph.pointAt(b);
  return Math.hypot(x.x-y.x,x.y-y.y);
 };
 function create(teamIds){
  return {version:1,teamIds:[...teamIds],wards:[],lastPlaced:{}};
 }
 function canSee(state,teamId,node,minute){
  return Boolean(state?.wards?.some(w=>w.teamId===teamId&&
   w.placed<=minute&&w.expires>minute&&distance(w.node,node)<=range));
 }
 function advance(state,nav,minute){
  if(!state||!Number.isSafeInteger(minute)||minute<1)return [];
  state.wards=state.wards.filter(w=>w.expires>minute);
  const placed=[];
  for(const p of Object.values(nav.agents).sort((a,b)=>a.id.localeCompare(b.id))){
   if(!p.alive||p.intent==='retreat'||!['JUN','SUP'].includes(p.role)||
      !spots.has(p.node)||minute-(state.lastPlaced[p.id]??-99)<cooldown)continue;
   const active=state.wards.filter(w=>w.teamId===p.teamId);
   if(active.length>=limit||active.some(w=>w.node===p.node))continue;
   const ward={id:p.id+':'+minute,teamId:p.teamId,actorId:p.id,
    node:p.node,placed:minute,expires:minute+ttl};
   state.wards.push(ward);
   state.lastPlaced[p.id]=minute;
   placed.push({...ward});
  }
  return placed;
 }
 function snapshot(state,minute){
  return {version:1,wards:(state?.wards||[])
    .filter(w=>w.placed<=minute&&w.expires>minute)
    .map(w=>({...w}))};
 }
 function audit(match){
  const errors=[];
  for(let i=0;i<(match.events||[]).length;i++){
   const e=match.events[i],f=e.facts;
   if(f?.action!=='ward_place')continue;
   const before=match.moments?.[i]?.navigation?.before;
   const p=before?.[f.actorId],ward=match.moments?.[i]?.vision?.wards
    ?.find(w=>w.id===f.wardId);
   if(f.visionVersion!==1||!p?.alive||
      !['JUN','SUP'].includes(p.role)||p.node!==f.node||
      p.teamId!==e.teamId||!spots.has(f.node))
    errors.push('Ward without physically present actor at event '+i);
   if(!ward||ward.teamId!==e.teamId||ward.actorId!==f.actorId||
      ward.node!==f.node||ward.placed!==e.minute||
      ward.expires!==e.minute+ttl)
    errors.push('Ward not found in immutable event snapshot '+i);
  }
  for(const frame of match.frames||[]){
   for(const ward of frame.vision?.wards||[]){
    if(!spots.has(ward.node)||ward.placed>frame.minute||
       ward.expires<=frame.minute||!match.fixture||
       ![match.fixture.a,match.fixture.b].includes(ward.teamId))
      errors.push('Expired or invalid ward in frame '+frame.minute);
   }
  }
  return errors;
 }
 core.Vision=Object.freeze({create,advance,canSee,snapshot,audit,range,ttl});
})(globalThis);
