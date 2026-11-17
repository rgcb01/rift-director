/* Atomic sporting projection for an experimental simultaneous fight.
 * Runs on copies of the real match ledgers. A receipt is derived from the
 * authoritative champion window, never from caller-supplied kill awards.
 * Both teams' rewards use the same pre-window snapshot.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
function copySport(s){
 return {gold:{...s.gold},kills:{...s.kills},dead:{...s.dead},
  playerStats:core.clonePlayerStats(s.playerStats),
  powerEconomy:core.PowerEconomy.snapshot(s.powerEconomy),
  shutdowns:core.Shutdowns.snapshot(s.shutdowns)};
}
function step({state,abilityState,sport,minute,focusByTeam={},positioning=true}){
 if(!Number.isSafeInteger(minute)||Math.floor(state.at/60)!==minute||
    state.at+core.SimultaneousFight.WINDOW_SECONDS>(minute+1)*60)
  throw Error('Simultaneous window outside match minute');
 const combat=core.SimultaneousChampionCombat.step({state,powerState:sport.powerEconomy,abilityState,focusByTeam,positioning});
 const next=copySport(sport),awards=[],victims=new Set(combat.receipt.deaths.map(d=>d.victimId));
 const earned={};
 // Every victim and contributor must be alive at the same window start,
 // including a contributor who dies in this window.
 for(const d of combat.receipt.deaths){
  const killer=state.players[d.killerId],victim=state.players[d.victimId];
  if(!killer?.alive||!victim?.alive||killer.teamId===victim.teamId||
     [d.killerId,d.victimId,...d.assistIds].some(id=>!next.playerStats[id]||
      !next.powerEconomy.entries[id]||(sport.dead[id]||0)>minute||!state.players[id]?.alive))
   throw Error('Invalid atomic kill participants');
  if(d.assistIds.some(id=>state.players[id].teamId!==killer.teamId))throw Error('Invalid atomic assist');
  const team=killer.teamId,foe=victim.teamId;
  const bountyGold=core.Shutdowns.bounty(sport.shutdowns.streaks[d.victimId]);
  const comebackDeficit=sport.gold[foe]-sport.gold[team];
  const comebackGold=core.Shutdowns.comebackBounty(comebackDeficit,1);
  const gold=320+bountyGold+comebackGold;
  const respawnAt=minute+(minute<16?2:minute<29?3:4);
  const facts={action:'teamfight',actorId:d.killerId,victimIds:[d.victimId],
   assistIds:d.assistIds,bountyGold,comebackGold};
  core.applyPlayerEvent(next.playerStats,{teamId:team,facts});
  core.PowerEconomy.rewardEvent(next.powerEconomy,{teamId:team,facts});
  next.gold[team]+=gold;next.kills[team]++;next.dead[d.victimId]=respawnAt;
  earned[d.killerId]=(earned[d.killerId]||0)+1;
  awards.push({...d,teamId:team,gold,bountyGold,comebackGold,comebackDeficit,respawnAt});
 }
 // A death ends the previous streak even if its owner landed a lethal
 // attack simultaneously. No ordering advantage or posthumous streak.
 for(const id of Object.keys(next.shutdowns.streaks))
  next.shutdowns.streaks[id]=victims.has(id)?0:Math.min(12,sport.shutdowns.streaks[id]+(earned[id]||0));
 next.powerEconomy=core.PowerEconomy.snapshot(next.powerEconomy);
 return {state:combat.state,abilityState:combat.abilityState,sport:next,
  receipt:{combat:combat.receipt,awards}};
}
function audit(input,receipt){
 try{return JSON.stringify(step(input).receipt)===JSON.stringify(receipt)?[]:['Invalid simultaneous sporting receipt'];}
 catch(e){return [String(e.message)];}
}
function preview({group,nav,health,abilityState,sport,minute,maxWindows=4}){
 const ids=Object.values(group.groups).flat();
 const players=Object.fromEntries(ids.map(id=>{
  const p=nav.agents[id];return [id,{id,teamId:p.teamId,role:p.role,node:p.node,
   alive:p.alive,intent:p.intent,hp:health[id]}];
 }));
 const at=Math.max(minute*60+36,...ids.map(id=>(abilityState.entries[id]?.lastAt||0)+1));
 if(at+5>(minute+1)*60)return null;
 let state=core.SimultaneousFight.create({id:minute+':'+group.zone,at,players});
 const initial={state,abilityState:core.ChampionKits.snapshot(abilityState),sport:copySport(sport)};
 let kits=initial.abilityState,ledger=initial.sport,focusByTeam={};const receipts=[];
 for(let i=0;i<Math.min(4,maxWindows)&&state.at+5<=(minute+1)*60;i++){
  const teams=new Set(Object.values(state.players).filter(p=>p.alive).map(p=>p.teamId));
  if(teams.size<2)break;
  if(i>0){
   const alive=Object.values(state.players).filter(p=>p.alive);
   if(!alive.some(a=>alive.some(b=>a.teamId!==b.teamId&&core.FightPositioning.reach(a,b))))break;
  }
  const r=step({state,abilityState:kits,sport:ledger,minute,focusByTeam});
  receipts.push(r.receipt);state=r.state;kits=r.abilityState;ledger=r.sport;
  focusByTeam={};
  for(const a of r.receipt.combat.actions){
   const team=state.players[a.actorId].teamId;
   (focusByTeam[team]??=[]).push(a.targetId);
  }
 }
 return {version:1,minute,zone:group.zone,initial,receipts,final:{state,abilityState:kits,sport:ledger}};
}
function auditPreview(p){
 let {state,abilityState,sport}=p.initial,focusByTeam={};const errors=[];
 for(const receipt of p.receipts){
  const input={state,abilityState,sport,minute:p.minute,focusByTeam};
  const e=audit(input,receipt);if(e.length){errors.push(...e);break;}
  const r=step(input);({state,abilityState,sport}=r);focusByTeam={};
  for(const a of r.receipt.combat.actions)(focusByTeam[state.players[a.actorId].teamId]??=[]).push(a.targetId);
 }
 if(JSON.stringify({state,abilityState,sport})!==JSON.stringify(p.final))errors.push('Simultaneous pilot final ledger mismatch');
 return errors;
}
function eventFacts(p,group){
 const awards=p.receipts.flatMap(r=>r.awards);
 const ids=Object.keys(p.initial.state.players);
 return {action:'simultaneous_fight',simultaneousVersion:1,actorId:group.groups[group.firstTeam][0],
  participantIds:ids,victimIds:awards.map(a=>a.victimId),node:p.zone,
  groupFight:{version:4,id:p.initial.state.id,zone:p.zone,round:1,firstTeam:group.firstTeam,groups:group.groups},
  simultaneous:p};
}
function auditEvent(match,index){
 const e=match.events[index],f=e.facts,p=f.simultaneous,m=match.moments[index];
 try{
  if(f.simultaneousVersion!==1||p.minute!==e.minute||p.zone!==f.node||
     f.groupFight.firstTeam!==e.teamId||!p.receipts.length||p.receipts.length>4)
   throw Error('Invalid simultaneous event header');
  const expected=eventFacts(p,f.groupFight);
  if(JSON.stringify(expected)!==JSON.stringify(f))throw Error('Invalid simultaneous event facts');
  const errs=auditPreview(p);if(errs.length)return errs;
  const prior=match.moments[index-1],pre=prior?.minute===e.minute?prior.navigation.after:m.navigation.before;
  for(const [id,a] of Object.entries(p.initial.state.players)){
   if(!pre[id]?.alive||pre[id].node!==a.node||pre[id].teamId!==a.teamId||
      pre[id].intent!==a.intent||a.hp<34||!core.Encounters.nearZone(a,p.zone))
    throw Error('Invalid simultaneous initial participant '+id);
   if(prior?.minute===e.minute&&prior.health[id]!==a.hp)throw Error('Initial combat HP mismatch '+id);
  }
  if(prior?.minute===e.minute){
   for(const k of ['gold','kills','playerStats','powerEconomy','shutdowns'])
    if(JSON.stringify(prior[k])!==JSON.stringify(p.initial.sport[k]))throw Error('Initial sporting ledger mismatch '+k);
   if(JSON.stringify(prior.abilityState)!==JSON.stringify(p.initial.abilityState))throw Error('Initial cast ledger mismatch');
  }
  for(const k of ['gold','kills','playerStats','powerEconomy','shutdowns'])
   if(JSON.stringify(m[k])!==JSON.stringify(p.final.sport[k]))throw Error('Final sporting ledger mismatch '+k);
  if(JSON.stringify(m.abilityState)!==JSON.stringify(p.final.abilityState))throw Error('Final cast ledger mismatch');
  for(const [id,a] of Object.entries(p.final.state.players)){
   if(m.health[id]!==a.hp||m.navigation.after[id].alive!==a.alive)
    throw Error('Final HP/death mismatch '+id);
  }
  return [];
 }catch(err){return [String(err.message)];}
}
core.SimultaneousSport=Object.freeze({step,audit,preview,auditPreview,eventFacts,auditEvent});
})(globalThis);
