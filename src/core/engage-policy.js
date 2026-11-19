/* Local tactical decision BEFORE group combat.
 * Only allies' actual resources and enemies observed through the existing
 * sight model are used. No hidden enemy cooldowns, RNG draws or free hits.
 * An engage receipt is permission to attempt combat, never a result.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
const active=p=>p?.alive&&!['retreat','recall_channel','recall_recover','dead','shop_recall'].includes(p.intent);
const round=n=>+n.toFixed(2);
function decide(e){
 const score=round((e.allies.length-e.enemies.length)*14+(e.ownHP-e.enemyHP)*.25+
  e.controlReady.length*3+e.ultimateReady.length*2+
  (e.frontline&&e.carry?4:0)+(e.vulnerable.length?8:0)+
  (e.objective?10:0)+(e.risk-50)*.12+(e.communication-50)*.08-
  (e.vision<43?6:0));
 let action='wait',reason='no_clear_opening';
 if(!e.enemies.length)reason='no_observed_target';
 else if(e.ownHP<45||e.enemies.length-e.allies.length>=2){action='disengage';reason='unsafe_local_fight';}
 else if(e.objective&&score>=5){action='contest';reason='live_objective';}
 else if(score>=15&&(e.controlReady.length||e.vulnerable.length||e.allies.length>e.enemies.length)){
  action='engage';reason=e.vulnerable.length?'visible_vulnerable_target':e.allies.length>e.enemies.length?'local_numbers':'ready_initiation';
 }else if(e.reinforcements.length&&score<15){action='wait';reason='await_reinforcements';}
 else if(e.carry&&score>=0){action='poke';reason='ranged_pressure';}
 else if(score< -8){action='disengage';reason='unfavorable_exchange';}
 return {action,reason,score};
}
function assess({nav,group,teamId,minute,players,health,powerState,abilityState,world}){
 const N=core.Navigation,K=core.ChampionKits,foe=teamId===nav.a?nav.b:nav.a;
 const own=group.groups[teamId].map(id=>nav.agents[id]).filter(active);
 const enemies=group.groups[foe].map(id=>nav.agents[id]).filter(active);
 const positions=Object.fromEntries([...own,...enemies].map(p=>[p.id,p]));
 const observed=new Map();
 for(const p of own){
  const sight=core.TacticalAI.observe({nav,agent:p,minute,context:{positions,health,map:world.map}});
  for(const v of sight.opponents)observed.set(v.target.id,v.hp);
 }
 const catalog=[...core.PowerEconomy.ITEM_CATALOG,...core.PowerEconomy.COMPONENT_CATALOG];
 const controlReady=[],ultimateReady=[],archetypes=[];
 for(const p of own){
  const row=powerState?.entries?.[p.id],entry=abilityState?.entries?.[p.id],def=K.DEFINITIONS[entry?.championId];
  const stats=row?core.ChampionScaling.effective(row,catalog):null;
  archetypes.push(core.ChampionScaling.definition(row)?.archetype||null);
  if(!entry||!def||!stats)continue;
  // The actual combat window cannot begin before previous casts.
  const at=Math.max(minute*60+36,entry.lastAt);
  const ready=slot=>stats.abilityRanks[slot]>0&&(entry.cooldowns[slot]||0)<=at&&K.projected(entry,at)>=def.abilities[slot].cost;
  if(ready('E'))controlReady.push(p.id);
  if(ready('R'))ultimateReady.push(p.id);
 }
 const call=nav.neutralPlans?.[teamId];
 const targetSpawn=group.zone==='dragon_pit'?world.nextDragon:group.zone==='baron_pit'?world.nextBaron:null;
 const objective=Number.isFinite(targetSpawn)&&targetSpawn<=minute&&
  call?.target===group.zone&&['take','contest'].includes(call.action)&&call.until>=minute;
 const reinforcements=Object.values(nav.agents).filter(p=>p.teamId===teamId&&active(p)&&!positions[p.id]&&
  (health[p.id]??0)>=60&&p.goal===group.zone&&N.hops(p.node,group.zone)<=3).map(p=>p.id).sort();
 const seen=[...observed.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 const evidence={allies:own.map(p=>p.id).sort(),enemies:seen.map(([id,hp])=>({id,hp})),
  ownHP:round(mean(own.map(p=>health[p.id]??100))),enemyHP:round(mean(seen.map(([,hp])=>hp))),
  controlReady:controlReady.sort(),ultimateReady:ultimateReady.sort(),
  frontline:archetypes.some(a=>['tank','fighter'].includes(a)),carry:archetypes.some(a=>['mage','marksman'].includes(a)),
  vulnerable:seen.filter(([,hp])=>hp<=50).map(([id])=>id),reinforcements,
  objective,vision:world.map?.riverVision?.[teamId]??50,
  risk:round(mean(own.map(p=>players[p.id]?.beh?.risk??50))),
  communication:round(mean(own.map(p=>players[p.id]?.a?.comm??50)))};
 return {teamId,...decide(evidence),evidence};
}
function evaluate(args){
 const decisions=[args.nav.a,args.nav.b].map(teamId=>assess({...args,teamId}));
 const initiators=decisions.filter(d=>['engage','contest'].includes(d.action))
  .sort((a,b)=>b.score-a.score||a.teamId.localeCompare(b.teamId));
 return {version:1,minute:args.minute,zone:args.group.zone,groups:args.group.groups,
  decisions,firstTeam:initiators[0]?.teamId||null};
}
function audit(match){
 const errors=[];
 for(const frame of match.frames||[]){
  for(const r of frame.engageDecisions||[]){
   if(r.version!==1||r.minute!==frame.minute||!core.MiniGraph.nodes[r.zone]||r.decisions.length!==2){errors.push('Invalid engage header '+frame.minute);continue;}
   for(const d of r.decisions){
    const expected=decide(d.evidence);
    if(expected.action!==d.action||expected.reason!==d.reason||expected.score!==d.score||
       d.evidence.allies.some(id=>!r.groups[d.teamId]?.includes(id))||
       d.evidence.enemies.some(e=>!Object.entries(r.groups).some(([id,ids])=>id!==d.teamId&&ids.includes(e.id)))||
       [...d.evidence.controlReady,...d.evidence.ultimateReady].some(id=>!d.evidence.allies.includes(id)))
      errors.push('Invalid engage decision '+frame.minute);
   }
   const first=r.decisions.filter(d=>['engage','contest'].includes(d.action)).sort((a,b)=>b.score-a.score||a.teamId.localeCompare(b.teamId))[0]?.teamId||null;
   if(first!==r.firstTeam)errors.push('Invalid engage initiative '+frame.minute);
  }
 }
 return errors;
}
core.EngagePolicy=Object.freeze({decide,assess,evaluate,audit});
})(globalThis);
