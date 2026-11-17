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
function preview({group,nav,health,abilityState,sport,minute,maxWindows=3}){
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
 for(let i=0;i<Math.min(3,maxWindows)&&state.at+5<=(minute+1)*60;i++){
  const teams=new Set(Object.values(state.players).filter(p=>p.alive).map(p=>p.teamId));
  if(teams.size<2)break;
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
core.SimultaneousSport=Object.freeze({step,audit,preview,auditPreview});
})(globalThis);
