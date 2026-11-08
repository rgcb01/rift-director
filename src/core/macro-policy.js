/* Rift Director Alpha 0.7.14 — committed, causal map-resource choices.
 * A lane professional can farm, escort a wave, or rotate to an actually
 * announced neutral objective. Nothing in this policy awards gold, XP, kills
 * or structures; the existing physical ledgers remain authoritative.
 * Only public map, own HP, wave and documented objective calls are observed.
 * Deterministic; no RNG, timers, DOM or hidden enemy positions.
 */
((root)=>{
 'use strict';
 const core=root.RiftCore||(root.RiftCore={});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const roles=['TOP','MID'];
 const round=n=>Math.round(n*100)/100;
 const other=(nav,id)=>id===nav.a?nav.b:nav.a;
 const side=(nav,id)=>id===nav.a?'blue':'red';
 function evaluate(nav,world,agent,minute,health){
  if(!roles.includes(agent.role))return null;
  const id=agent.teamId,opponent=other(nav,id),lane=agent.role;
  const source=world.map?.lanes?.[lane];
  if(!source||!world.waves?.[lane])return null;
  const wave=core.LaneEconomy.pressureFor(
   {teamIds:[nav.a,nav.b],lanes:world.waves},id,lane);
  const pressure=source.pressure?.[id]??50;
  const vision=source.vision?.[id]??50;
  const hp=health?.[agent.id]??100;
  const deficit=(world.gold?.[opponent]??0)-(world.gold?.[id]??0);
  const call=nav.neutralPlans?.[id];
  const eligible=lane==='MID'&&['take','contest'].includes(call?.action)&&
   call?.until>=minute&&['dragon_pit','baron_pit'].includes(call.target)&&hp>=66;
  const travel=eligible?core.Navigation.hops(agent.node,call.target):0;
  const farming=45+clamp(-wave,0,2)*11+
   clamp(deficit/750,0,9)+clamp(100-hp,0,50)*.12+
   clamp(50-vision,0,30)*.16;
  const pushing=32+clamp(wave,0,3)*14+
   (pressure-50)*.62+(vision-50)*.12-(100-hp)*.20;
  // A real objective call is worth sacrificing lane income only when its
  // local opportunity exceeds the farm or wave-push alternatives.
  const rotating=eligible?58+clamp(call.score??0,-25,25)*.35-
    Math.max(0,travel-1)*3.7-clamp(-wave,0,3)*5+
    (world.dragons?.[opponent]??0)*.5:-Infinity;
  const scores={farm:round(farming),pressure:round(pushing),
   objective:eligible?round(rotating):null};
  const action=['farm','pressure',...(eligible?['objective']:[])]
   .sort((a,b)=>scores[b]-scores[a]||
      ['farm','pressure','objective'].indexOf(a)-
      ['farm','pressure','objective'].indexOf(b))[0];
  const goal=action==='farm'?side(nav,id)+'_'+lane.toLowerCase()+'_front':
   action==='pressure'?(lane==='TOP'?'top_corner':'mid_center'):
   call.target;
  return {version:1,teamId:id,actorId:agent.id,role:agent.role,lane,
   created:minute,until:minute+2,action,goal,scores,
   evidence:{wave:round(wave),lanePressure:pressure,vision,
    goldDeficit:deficit,hp,objectiveCall:eligible?call.reason:null,
    travelHops:travel}};
 }
 function plan(nav,world,minute,health,dead={}){
  if(!nav.macroCalls)nav.macroCalls={};
  const selected={};
  if(minute<14||minute>29||nav.siegeTeam)return selected;
  for(const id of [nav.a,nav.b]){
   for(const role of roles){
    const actor=Object.values(nav.agents).find(a=>a.teamId===id&&a.role===role);
    if(!actor||!((dead[actor.id]??0)<=minute))continue;
    const old=nav.macroCalls[actor.id],call=nav.neutralPlans?.[id];
    const stillObjective=old?.action!=='objective'||(
     ['take','contest'].includes(call?.action)&&
     call?.target===old.goal&&call?.until>=minute);
    if(old&&old.until>=minute&&stillObjective){
     selected[actor.id]=old;continue;
    }
    const option=evaluate(nav,world,actor,minute,health);
    if(!option)continue;
    nav.macroCalls[actor.id]=option;selected[actor.id]=option;
   }
  }
  return selected;
 }
 function movement(nav,agent,minute){
  const p=nav.macroPlans?.[agent.id];
  if(!p||p.actorId!==agent.id||p.teamId!==agent.teamId||
     minute<p.created||minute>p.until)return null;
  return {goal:p.goal,lane:p.lane,intent:'macro_'+p.action,
   reason:'macro_'+p.action,decisionVersion:5};
 }
 function snapshot(nav,minute){
  const plans={};
  for(const [id,p] of Object.entries(nav.macroPlans||{})){
   if(p.created<=minute&&p.until>=minute)
    plans[id]={...p,scores:{...p.scores},evidence:{...p.evidence}};
  }
  return {version:1,plans};
 }
 function audit(match){
  const errors=[];
  for(const frame of match.frames||[]){
   const plans=frame.macro?.plans||{};
   for(const [id,p] of Object.entries(plans)){
    const agent=frame.navigation?.before?.[id];
    if(p.version!==1||!agent||!roles.includes(p.role)||
       p.actorId!==id||p.teamId!==agent.teamId||p.role!==agent.role||
       p.lane!==agent.role||!['farm','pressure','objective'].includes(p.action)||
       !core.Navigation.adjacency[p.goal]||p.created>frame.minute||
       p.until<frame.minute||p.until-p.created!==2||
       !Number.isFinite(p.scores?.farm)||!Number.isFinite(p.scores?.pressure)||
       (p.action==='objective'&&!Number.isFinite(p.scores?.objective))||
       !Number.isFinite(p.evidence?.wave)||
       !Number.isFinite(p.evidence?.goldDeficit))
      errors.push('Plan macro inválido: '+id+' min '+frame.minute);
   }
   for(const [id,a] of Object.entries(frame.navigation?.before||{})){
    if(!a.reason?.startsWith('macro_'))continue;
    const p=plans[id];
    if(!p||a.reason!=='macro_'+p.action||
       a.intent!==a.reason||a.goal!==p.goal||
       a.lane!==p.lane)
     errors.push('Orden macro sin decisión física registrada: '+id+' min '+frame.minute);
   }
  }
  return errors;
 }
 core.MacroPolicy=Object.freeze({evaluate,plan,movement,snapshot,audit});
})(globalThis);
