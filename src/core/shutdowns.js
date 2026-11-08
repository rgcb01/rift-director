/* Rift Director Alpha 0.7.11 — earned shutdown rewards.
 * Bounties are liabilities generated exclusively by consecutive kills since
 * the last death. Nobody receives a comeback roll or a synthetic kill.
 * Events, personal gold and team gold share one auditable receipt.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const MAX_STREAK=12;
function bounty(streak){
 if(!Number.isSafeInteger(streak)||streak<0)throw Error('Invalid kill streak');
 return streak<3?0:Math.min(420,150+(streak-3)*90);
}
function create(players){
 const streaks={};
 for(const p of players){
  if(!p?.id||Object.prototype.hasOwnProperty.call(streaks,p.id))throw Error('Duplicate shutdown player');
  streaks[p.id]=0;
 }
 if(Object.keys(streaks).length!==10)throw Error('Shutdowns require 10 professionals');
 return {version:1,streaks};
}
function apply(state,event){
 const f=event?.facts;
 if(!f||!Array.isArray(f.victimIds)||!f.victimIds.length)return 0;
 if(!Object.prototype.hasOwnProperty.call(state.streaks,f.actorId))throw Error('Unknown shutdown killer');
 if(new Set(f.victimIds).size!==f.victimIds.length)
  throw Error('Duplicate shutdown victims');
 const receipts=[];
 for(const victimId of f.victimIds){
  if(!Object.prototype.hasOwnProperty.call(state.streaks,victimId)||victimId===f.actorId)
   throw Error('Invalid shutdown victim');
  const before=state.streaks[victimId],bonus=bounty(before);
  if(bonus)receipts.push({victimId,streakBefore:before,bonusGold:bonus});
  state.streaks[victimId]=0;
  state.streaks[f.actorId]=Math.min(MAX_STREAK,state.streaks[f.actorId]+1);
 }
 f.shutdowns=receipts;
 f.bountyGold=receipts.reduce((n,r)=>n+r.bonusGold,0);
 return f.bountyGold;
}
function snapshot(model){return {version:model.version,streaks:{...model.streaks}};}
function audit(match){
 const errors=[];
 if(!match?.moments?.length)return errors;
 const starting=match.frames?.[0]?.navigation?.after||{};
 const ids=Object.keys(starting);
 if(ids.length!==10)return ['Shutdown ledger does not have 10 initial players'];
 const ledger={version:1,streaks:Object.fromEntries(ids.map(id=>[id,0]))};
 let previousKillGold=Object.fromEntries(ids.map(id=>[id,0]));
 for(let i=0;i<match.events.length;i++){
  const event=match.events[i],f=event.facts;
  const moment=match.moments[i];
  if(!moment) {errors.push('Missing shutdown moment '+i);continue;}
  const victims=f?.victimIds;
  if(Array.isArray(victims)&&victims.length){
   try{
    apply(expected,{facts:{actorId:f.actorId,victimIds:victims}});
    const replica={facts:{actorId:f.actorId,victimIds:victims}};
    apply(ledger,replica);
    if(JSON.stringify(replica.facts.shutdowns)!==JSON.stringify(f.shutdowns)||
       replica.facts.bountyGold!==f.bountyGold)
     errors.push('Forged or missing shutdown receipt at event '+i);
    const winner=moment.powerEconomy?.entries?.[f.actorId];
    const expectedGold=320*victims.length+replica.facts.bountyGold;
    if(winner&&winner.killGold-previousKillGold[f.actorId]!==expectedGold)
     errors.push('Shutdown payout missing or duplicated from personal wallet '+i);
   }catch(e){errors.push('Invalid shutdown ledger at event '+i+': '+e.message);}
  }else if(f?.bountyGold||f?.shutdowns?.length){
   errors.push('Bounty without a real kill '+i);
  }
  const actual=moment.shutdowns?.streaks;
  if(!actual||JSON.stringify(actual)!==JSON.stringify(ledger.streaks))
   errors.push('Shutdown replay diverged at event '+i);
  const power=moment.powerEconomy?.entries;
  if(power)for(const id of ids)previousKillGold[id]=power[id]?.killGold??previousKillGold[id];
 }
 return errors;
}
core.Shutdowns=Object.freeze({create,bounty,apply,snapshot,audit});
})(globalThis);
