/* Alpha 0.7.19D — deterministic team reset admission.
 * Isolated policy; no movement, gold, HP, RNG, timers or broadcast changes.
 * Caller supplies a common pre-channel snapshot, including credible team
 * commitments and return-time estimates, before committing any recall.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const reasons=new Set(['critical_health','low_health','low_mana','item_spike']);
const roles=new Set(['TOP','JUN','MID','ADC','SUP']);
const urgency={critical_health:4,low_health:3,low_mana:2,item_spike:1};
function select({teamId,minute,players,objective=null,baseThreat=false,minimumField=3}){
 if(!Number.isInteger(minute)||!Array.isArray(players)||players.length!==5||
    new Set(players.map(p=>p.id)).size!==5||
    new Set(players.map(p=>p.role)).size!==5||
    players.some(p=>!roles.has(p.role)||p.teamId!==teamId))
  throw Error('Invalid team reset snapshot');
 const field=players.filter(p=>p.alive&&p.inField&&!p.resetting);
 const max=Math.max(0,field.length-Math.max(3,minimumField));
 const engaged=objective&&['take','contest'].includes(objective.action)&&
  Number.isInteger(objective.until)&&objective.until>=minute;
 const protectedIds=new Set(engaged?(objective.requiredIds||[]):[]);
 const eligible=field.filter(p=>p.safe===true&&p.canStart===true&&reasons.has(p.reason)&&
  Number.isFinite(p.hp)&&p.hp>=1&&p.hp<=100&&
  Number.isFinite(p.returnMinutes)&&p.returnMinutes>=1&&
  // Never abandon an assigned siege or base defense for discretionary reset.
  !p.siegeEscort&&!p.baseDefender&&
  (!engaged||!protectedIds.has(p.id)||minute+p.returnMinutes<objective.until)&&
  (!baseThreat||p.reason==='critical_health'))
  .sort((a,b)=>urgency[b.reason]-urgency[a.reason]||a.hp-b.hp||a.id.localeCompare(b.id));
 const make=(selected,kind)=>({version:1,teamId,minute,kind,ids:selected.map(p=>p.id),
  evidence:{fieldBefore:field.length,fieldAfter:field.length-selected.length,
   minimumField:Math.max(3,minimumField),baseThreat:Boolean(baseThreat),
   objective:engaged?{target:objective.target,until:objective.until,
    requiredIds:[...protectedIds]}:null,
   candidates:selected.map(p=>({id:p.id,role:p.role,reason:p.reason,hp:p.hp,
    returnMinutes:p.returnMinutes}))}});
 if(!eligible.length||max===0)return make([],'hold');
 const first=eligible[0];
 // Synchronize bot resets only when both independently have a valid reason,
 // both can actually leave, and the wave is favorable for both. No free
 // healthy recall, no forced sync, no skipping a critical player elsewhere.
 if(max>=2&&['ADC','SUP'].includes(first.role)&&first.waveSafe===true&&
    !baseThreat&&!engaged){
  const partner=eligible.find(p=>p.role===(first.role==='ADC'?'SUP':'ADC')&&p.waveSafe===true);
  if(partner)return make([first,partner],'bot_sync');
 }
 return make([first],'staggered');
}
core.ResetCoordination=Object.freeze({select});
})(globalThis);
