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
// Live admission: emergencies may use the existing safe recall path even
// when the field budget is exhausted. Discretionary resets may not.
function admit(input){
 const emergency=input.players.filter(p=>p.alive&&p.inField&&!p.resetting&&p.safe&&p.canStart&&p.reason==='critical_health')
  .sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];
 if(emergency){
  const field=input.players.filter(p=>p.alive&&p.inField&&!p.resetting).length;
  return {version:1,teamId:input.teamId,minute:input.minute,kind:'emergency',ids:[emergency.id],
   evidence:{fieldBefore:field,fieldAfter:field-1}};
 }
 return select(input);
}
function build({nav,world,minute,team,health,choices}){
 const N=core.Navigation,side=team===nav.a?'blue':'red',fountain=side+'_fountain';
 const call=nav.neutralPlans?.[team];
 const required=new Set([...(call?.reinforcementIds||[]),...(nav.fightFormations?.[team]?.members||[]).map(p=>p.id)]);
 const players=Object.values(nav.agents).filter(p=>p.teamId===team).map(p=>{
  const x=choices.find(x=>x.a.id===p.id),lane=p.role==='ADC'||p.role==='SUP'?'BOT':p.role;
  const inField=p.node!==fountain&&p.node!==side+'_nexus'&&p.intent!=='shop_recall';
  const resetting=['recall_channel','recall_recover','retreat','shop_recall'].includes(p.intent);
  if(['JUN','SUP'].includes(p.role))required.add(p.id);
  const destination=required.has(p.id)&&call?.target?call.target:p.node;
  const path=N.path(fountain,destination,p.role==='JUN'?node=>N.jungleAllowed(side,node):undefined);
  const returnMinutes=path.at(-1)===destination?3+path.length-1:99;
  const waveSafe=world.waves?.[lane]?core.LaneEconomy.pressureFor({teamIds:[nav.a,nav.b],lanes:world.waves},team,lane)>=.35:false;
  return {id:p.id,role:p.role,teamId:team,alive:p.alive,inField,resetting,safe:Boolean(x),canStart:Boolean(x?.canStart),
   reason:x?.why||null,hp:health[p.id]??100,returnMinutes,waveSafe,
   siegeEscort:nav.siegeDecision?.teamId===team&&nav.siegeDecision.escorts.includes(p.id),
   baseDefender:p.intent==='defend'};
 });
 const objective=call&&['take','contest'].includes(call.action)?{action:call.action,target:call.target,until:call.until,requiredIds:[...required]}:null;
 const baseThreat=Object.values(world.lanes?.[team]||{}).some(s=>s===3);
 return {teamId:team,minute,players,objective,baseThreat};
}
core.ResetCoordination=Object.freeze({select,admit,build});
})(globalThis);
