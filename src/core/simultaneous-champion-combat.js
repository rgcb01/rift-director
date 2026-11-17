/* Experimental adapter: derives simultaneous offensive packets from the
 * authoritative champion stats, legal target preferences and cast ledger.
 * No caller-provided damage. Pure preview; only returned copies change.
 * Defensive casts and bounded control are local to this prototype;
 * movement and sporting ledgers remain separate.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const active=p=>p.alive&&p.hp>0&&!['retreat','recall_channel','recall_recover','dead'].includes(p.intent);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function step({state,powerState,abilityState,focusByTeam={},positioning=false}){
 const P=core.FightPositioning;
 if(positioning&&!P)throw Error('Missing local positioning module');
 const movements=positioning?P.plan({state,powerState}):[];
 const moved=new Set(movements.map(m=>m.actorId));
 if(positioning)state=P.apply(state,movements);
 const reachable=(a,b)=>positioning?P.reach(a,b):core.Navigation.combatRange(a.node,b.node,2);
 const K=core.ChampionKits,S=core.ChampionScaling,F=core.SimultaneousFight;
 const catalog=[...core.PowerEconomy.ITEM_CATALOG,...core.PowerEconomy.COMPONENT_CATALOG];
 const fighters=Object.values(state.players).filter(active).sort((a,b)=>a.id.localeCompare(b.id));
 const health=Object.fromEntries(fighters.map(p=>[p.id,p.hp]));
 const nav={agents:state.players};
 const stats=Object.fromEntries(fighters.map(p=>{
  const row=powerState?.entries?.[p.id],kit=abilityState?.entries?.[p.id];
  if(!row?.championId||kit?.championId!==row.championId)throw Error('Missing champion ledger '+p.id);
  const s=S.effective(row,catalog);
  if(!s)throw Error('Unknown champion '+p.id);
  return [p.id,s];
 }));
 const actions=[],casts=[],decisions=[],effects=[];
 for(const actor of fighters){
  const allies=fighters.filter(p=>p.teamId===actor.teamId);
  const defenders=fighters.filter(p=>p.teamId!==actor.teamId);
  const targets=defenders.filter(target=>reachable(actor,target)).map(target=>({target,decision:core.TeamfightTactics.targetDecision({
   leader:actor,target,allies,defenders,health,powerState,focusIds:focusByTeam[actor.teamId]||[]
  })})).filter(x=>x.decision).sort((a,b)=>b.decision.score-a.decision.score||a.target.id.localeCompare(b.target.id));
  const a=stats[actor.id];
  const controlled=Math.min(F.WINDOW_SECONDS,Math.max(0,(actor.controlUntil||0)-state.at));
  const movementSeconds=moved.has(actor.id)?P.MOVE_SECONDS:0;
  const available=F.WINDOW_SECONDS-controlled-movementSeconds;
  const castAt=state.at+movementSeconds;
  let cast=null;
  // Supports may spend their single cast on an injured ally rather than
  // damage. Self-defense remains available to every champion.
  if(!controlled){
   const protectedAllies=allies.filter(p=>p.hp<=65&&reachable(actor,p))
    .sort((x,y)=>x.hp-y.hp||x.id.localeCompare(y.id));
   for(const ally of protectedAllies){
    cast=K.select(abilityState,powerState,nav,actor.id,ally.id,castAt,'teamfight','defense',['shield','heal'],true);
    if(cast)break;
   }
  }
  if(cast){casts.push(cast);effects.push({actorId:actor.id,targetId:cast.targetId,kind:cast.kind,amount:cast.amount});}
  if(!targets.length)continue;
  const {target,decision}=targets[0],b=stats[target.id];
  // Basic attacks use physical armor. A damage spell occupies one attack's
  // time, uses its existing percent-HP amount and the champion mitigation.
  if(!cast&&!controlled){
   cast=K.select(abilityState,powerState,nav,actor.id,target.id,castAt,'teamfight','attack',decision.intent==='peel'?['control']:['damage']);
   if(!cast)cast=K.select(abilityState,powerState,nav,actor.id,target.id,castAt,'teamfight','attack',['damage','control']);
   if(cast){casts.push(cast);if(cast.kind==='control')effects.push({actorId:actor.id,targetId:target.id,kind:'control',amount:cast.controlSeconds});}
  }
  const attacks=positioning&&!P.reach(actor,target,P.range(actor,powerState))?0:
   Math.max(0,Math.floor(a.attackSpeed*available)-(cast?1:0));
  const offensive=cast&&['damage','control'].includes(cast.kind);
  if(!attacks&&!offensive)continue;
  const basic=100*(attacks*a.attackDamage)/(b.maxHp*(1+b.armor/100));
  const spell=offensive?cast.amount*S.mitigation(powerState.entries[actor.id],powerState.entries[target.id],catalog):0;
  const passive=K.DEFINITIONS[a.championId].passive;
  const guard=K.DEFINITIONS[b.championId].passive;
  const damage=clamp(Math.round(basic+spell+(passive.kind==='damage'?passive.amount:0)-
   (guard.kind==='guard'?guard.amount:0)),1,120);
  actions.push({actorId:actor.id,targetId:target.id,damage});
  decisions.push({actorId:actor.id,targetId:target.id,priority:decision,
   attacks,controlledSeconds:controlled,movementSeconds,basic:+basic.toFixed(4),spell:+spell.toFixed(4),damage});
 }
 // Every cast uses the same pre-window ledger, with at most one per actor.
 const nextKits=K.snapshot(abilityState);
 K.commit(nextKits,casts);
 const result=F.resolve(state,actions,effects);
 return {state:result.state,abilityState:nextKits,receipt:{...result.receipt,decisions,casts,...(positioning?{movements}:{})}};
}
function audit({state,powerState,abilityState,receipt,focusByTeam={},positioning=false}){
 try{
  const expected=step({state,powerState,abilityState,focusByTeam,positioning});
  return JSON.stringify(expected.receipt)===JSON.stringify(receipt)?[]:['Invalid champion-derived combat receipt'];
 }catch(e){return [String(e.message)];}
}
core.SimultaneousChampionCombat=Object.freeze({step,audit});
})(globalThis);
