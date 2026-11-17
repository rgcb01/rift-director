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
// A target preference never authorizes a hit outside the existing graph range.
const carry=t=>['marksman','mage'].includes(t);
const active=p=>p?.alive&&!['retreat','recall_channel','recall_recover','dead'].includes(p.intent);
const reach=(a,b)=>core.Navigation.combatRange(a.node,b.node,2);
function targetDecision({leader,target,allies,defenders,health,powerState,focusIds=[]}){
 if(!active(leader)||!active(target)||leader.teamId===target.teamId||!reach(leader,target))return null;
 const type=kind(leader,powerState),targetType=kind(target,powerState);
 const hp=health[target.id]??100,distance=core.Navigation.hops(leader.node,target.node);
 const coverIds=defenders.filter(p=>active(p)&&p.id!==target.id&&reach(p,target)&&
  (front(kind(p,powerState))||kind(p,powerState)==='support')).map(p=>p.id).sort();
 const threatenedCarryIds=allies.filter(p=>active(p)&&p.id!==leader.id&&carry(kind(p,powerState))&&
  reach(target,p)&&reach(leader,p)).map(p=>p.id).sort();
 const clusterIds=defenders.filter(p=>active(p)&&p.id!==target.id&&reach(p,target)).map(p=>p.id).sort();
 const focused=focusIds.includes(target.id);
 let score=(100-hp)*.55-distance*9+(focused?18:0),intent=focused?'focus':'finish';
 if(type==='assassin'&&carry(targetType)&&coverIds.length===0){
  score+=36;intent='dive_exposed';
 }else if(type==='assassin'&&carry(targetType)){
  score-=coverIds.length*12;intent='covered_target';
 }else if(type==='marksman'&&front(targetType)){
  score+=20;intent='front_to_back';
 }else if((type==='support'||type==='tank')&&threatenedCarryIds.length){
  score+=28+threatenedCarryIds.length*12+(targetType==='assassin'?14:0);intent='peel';
 }else if(type==='mage'&&clusterIds.length){
  score+=clusterIds.length*5;intent='cluster';
 }else if(type==='marksman'){
  score-=coverIds.length*5;
 }
 const reason=({dive_exposed:'exposed_carry',covered_target:'covered_carry',peel:'protect_ally',cluster:'clustered_enemies',finish:'finish_vulnerable',focus:'finish_vulnerable'})[intent]||intent;
 return {version:1,intent,reason,score:+score.toFixed(2),actorArchetype:type||null,
  targetArchetype:targetType||null,targetId:target.id,hp,distance,focused,
  coverIds,threatenedCarryIds,clusterIds};
}
function auditTargetDecisions(match){
 const errors=[],memory=new Map();
 for(const [index,e] of (match.events||[]).entries()){
  const f=e.facts,g=f?.groupFight;
  if(!g||g.version!==3)continue;
  if(f.targetPolicyVersion!==1||f.impacts?.length!==1){errors.push('Missing individual fight receipt '+index);continue;}
  const moment=match.moments[index],prior=match.moments[index-1];
  const live=prior?.minute===e.minute?prior.navigation.after:moment.navigation.before;
  const key=g.id+'|'+e.teamId,focusIds=memory.get(key)||[];
  const foe=e.teamId===match.fixture.a?match.fixture.b:match.fixture.a;
  const allies=g.groups[e.teamId].map(id=>({...live[id],id})).filter(active);
  const defenders=g.groups[foe].map(id=>({...live[id],id})).filter(active);
  const actor={...live[f.actorId],id:f.actorId};
  const powerState=moment.powerEconomy;
  for(const hit of f.impacts||[]){
   const target={...live[hit.id],id:hit.id};
   const expected=targetDecision({leader:actor,target,allies,defenders,
    health:{[hit.id]:hit.hpBefore},powerState,focusIds});
   if(JSON.stringify(expected)!==JSON.stringify(hit.targetPriority))
    errors.push('Invalid individual teamfight decision '+index+' '+hit.id);
  }
  if((f.assistIds||[]).some(id=>(f.victimIds||[]).some(v=>
   !live[id]?.alive||!live[v]?.alive||!reach(live[id],live[v]))))
   errors.push('Teamfight assist outside victim range '+index);
  memory.set(key,(f.impacts||[]).map(h=>h.id));
 }
 return errors;
}
core.TeamfightTactics=Object.freeze({leader,strength,physicallyCommitted,targetDecision,auditTargetDecisions,MAX_ROUNDS:4});
})(globalThis);
