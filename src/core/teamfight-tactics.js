/* 0.7.19G — group combat tactics. No movement, damage or RNG mutation.
 * Choose from physically reachable candidates, with role, readiness and
 * previous contribution as preferences rather than automatic outcomes.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const kind=(p,state)=>core.ChampionScaling?.definition(state?.entries?.[p.id])?.archetype;
const front=p=>['tank','fighter'].includes(p);
function leader({viable,targets,players,health,powerState,abilityState,minute,usedIds=[],round=1}){
 const used=new Set(usedIds),candidates=viable.filter(p=>!used.has(p.id));
 if(!candidates.length)return null;
 const score=p=>{
  const a=players[p.id]?.a||{},type=kind(p,powerState);
  const hp=health[p.id]??100;
  const reachable=targets.filter(q=>core.Encounters.hitRange(p,q,'teamfight')).length;
  const entry=abilityState?.entries?.[p.id];
  const def=core.ChampionKits?.DEFINITIONS[entry?.championId];
  const ready=entry&&def&&core.ChampionKits.projected(entry,minute*60+36)>=def.abilities.E.cost&&
   (entry.cooldowns.E||0)<=minute*60+36;
  const opening=round<=2;
  const roleBonus=opening?(front(type)?12:type==='support'?6:0):
   (['marksman','mage','assassin'].includes(type)?10:0);
  return (a.fight??50)*.32+(a.comm??50)*.12+hp*.24+
   core.Encounters.power(players[p.id],powerState,'attack')*.24+
   reachable*7+roleBonus+(ready?4:0);
 };
 return candidates.slice().sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0];
}
function strength({group,players,health,powerState,zone}){
 const average=group.reduce((n,p)=>{
  const a=players[p.id]?.a||{};
  const position=core.Navigation.hops(p.node,zone);
  return n+(a.fight??50)*.32+(a.comm??50)*.15+
   core.Encounters.power(players[p.id],powerState,'attack')*.30+
   (health[p.id]??100)*.23-Math.min(3,position)*3;
 },0);
 const frontline=group.some(p=>front(kind(p,powerState)));
 const carry=group.some(p=>['marksman','mage'].includes(kind(p,powerState)));
 const support=group.some(p=>kind(p,powerState)==='support');
 return average+(frontline&&carry?7:0)+(support&&carry?4:0);
}
// During a committed non-final siege, distant nominal escorts are not a
// reason to deny a coordinated objective call; two actual nearby escorts
// and a viable wave justify keeping that commitment.
function physicallyCommitted(nav,call){
 if(!call||call.stage===3||call.wave<.48)return false;
 const goal=core.Navigation.towerNode(nav.a===call.teamId?'red':'blue',call.lane,call.stage+1);
 return call.escorts.filter(id=>nav.agents[id]?.alive&&
  core.Navigation.hops(nav.agents[id].node,goal)<=2).length>=2;
}
core.TeamfightTactics=Object.freeze({leader,strength,physicallyCommitted,MAX_ROUNDS:4});
})(globalThis);
