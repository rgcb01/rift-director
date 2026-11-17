/* Read-only objective readiness evidence, captured before combat/capture.
 * This never issues an order, changes a timer or accesses future outcomes.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
function observe({nav,world,minute,health,abilityState}){
 if(minute<22)return [];
 const rows=[],N=core.Navigation;
 for(const teamId of [nav.a,nav.b]){
  const side=teamId===nav.a?'blue':'red',call=nav.neutralPlans?.[teamId];
  for(const [target,spawn] of [['dragon_pit',world.nextDragon],['baron_pit',world.nextBaron]]){
   if(!Number.isSafeInteger(spawn)||spawn-minute>6)continue;
   const matching=call?.target===target&&['take','contest'].includes(call.action)&&call.until>=minute;
   const assigned=new Set(matching?[...(call.reinforcementIds||[]),...(nav.fightFormations?.[teamId]?.members||[]).map(p=>p.id)]:[]);
   const members=Object.values(nav.agents).filter(p=>p.teamId===teamId).map(p=>{
    const hp=health[p.id]??0,entry=abilityState?.entries?.[p.id];
    const resource=entry?core.ChampionKits.projected(entry,minute*60):100;
    const type=core.ChampionKits.DEFINITIONS[entry?.championId]?.resourceType;
    const resetting=['retreat','recall_channel','recall_recover','shop_recall','siege_return'].includes(p.intent)||[side+'_fountain',side+'_nexus'].includes(p.node);
    const ready=p.alive&&!resetting&&hp>=55&&(type!=='mana'||resource>=20);
    const present=p.alive&&N.combatRange(p.node,target,2);
    return {id:p.id,role:p.role,node:p.node,goal:p.goal,intent:p.intent,alive:p.alive,hp,resource,
     ready,present,assigned:matching&&(assigned.has(p.id)||['JUN','SUP'].includes(p.role)),resetting};
   });
   rows.push({teamId,target,spawn,lead:spawn-minute,call:matching?call.action:null,
    members});
  }
 }
 return rows;
}
core.ObjectiveReadiness=Object.freeze({observe});
})(globalThis);
