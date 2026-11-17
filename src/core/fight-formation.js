/* Objective formation pilot: an actual, already issued objective call can
 * reserve a small squad from a common pre-movement snapshot. The policy
 * does not issue objectives, change their timers, move players or grant wins.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const lanes=['TOP','MID','BOT'];
const laneOf=p=>p.role==='ADC'?'BOT':p.role;
const unavailable=new Set(['retreat','recall_channel','recall_recover','shop_recall','dead','siege_return']);
function plan({nav,world,minute,health={},dead={}}){
 const N=core.Navigation,out={};
 if(minute<22||nav.siegeDecision?.stage===3)return out;
 // A threatened base or an active offensive siege retains priority.
 for(const team of [nav.a,nav.b]){
  const call=nav.neutralPlans?.[team],side=team===nav.a?'blue':'red';
  if(!call||!['take','contest'].includes(call.action)||!['dragon_pit','baron_pit'].includes(call.target)||
     minute>call.until||(world.map?.riverVision?.[team]??50)<43||
     nav.siegeDecision?.teamId===team||lanes.some(l=>world.lanes?.[team]?.[l]===3))continue;
  const spawn=call.target==='dragon_pit'?world.nextDragon:world.nextBaron;
  if(!Number.isFinite(spawn)||call.targetSpawn!==spawn||spawn>call.until)continue;
  const allied=Object.values(nav.agents).filter(p=>p.teamId===team&&p.alive&&
   (dead[p.id]||0)<=minute&&!unavailable.has(p.intent)&&(health[p.id]??100)>=65);
  const budget=call.until-minute+1;
  const waveModel={teamIds:[nav.a,nav.b],lanes:world.waves};
  const candidates=allied.map(p=>{
   const permitted=p.role!=='JUN'||N.jungleAllowed(side,p.node);
   const route=permitted?N.path(p.node,call.target,p.role==='JUN'?node=>N.jungleAllowed(side,node):undefined):[];
   const hops=route.length&&route.at(-1)===call.target?route.length-1:Infinity;
   const lane=laneOf(p);
   const wave=lanes.includes(lane)&&world.waves?.[lane]?
    core.LaneEconomy.pressureFor(waveModel,team,lane):null;
   return {id:p.id,role:p.role,hp:health[p.id]??100,node:p.node,hops,wave};
  }).filter(p=>p.hops<=budget&&
    (p.role==='JUN'||p.role==='SUP'||p.wave!==null&&p.wave>=-.65&&!(p.role==='TOP'&&p.wave>=1.45)));
  const jungler=candidates.find(p=>p.role==='JUN'),support=candidates.find(p=>p.role==='SUP');
  if(!jungler||!support)continue;
  const reinforcements=candidates.filter(p=>['MID','ADC','TOP'].includes(p.role))
   .sort((a,b)=>a.hops-b.hops||b.wave-a.wave||a.id.localeCompare(b.id));
  if(!reinforcements.length)continue;
  const members=[jungler,support,...reinforcements.slice(0,2)];
  // A team needs at least one potential damage dealer. Preserve TOP's
  // strong side wave, and never pull all five players by default.
  if(!members.some(p=>['ADC','MID'].includes(p.role)))continue;
  out[team]={version:1,minute,teamId:team,target:call.target,spawn,until:call.until,
   action:call.action,members,vision:world.map?.riverVision?.[team]??50};
 }
 return out;
}
function movement(nav,agent,minute){
 const p=nav.fightFormations?.[agent.teamId];
 if(!p||p.minute!==minute||!p.members.some(m=>m.id===agent.id))return null;
 return {goal:p.target,intent:'objective_setup',reason:p.target==='baron_pit'?'baron_formation':'dragon_formation',decisionVersion:10};
}
core.FightFormation=Object.freeze({plan,movement});
})(globalThis);
