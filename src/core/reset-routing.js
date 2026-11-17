/* 0.7.19C — role-aware reset departure. Uses public waves, allied positions,
 * current team calls and graph travel. Does not award any map outcome.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const laneOf=role=>role==='ADC'||role==='SUP'?'BOT':role==='JUN'?null:role;
const sides=(nav,team)=>team===nav.a?'blue':'red';
const protectedIntents=new Set(['siege','defend','counter_siege','counterpush','splitpush','shop_recall']);
const wave=(nav,world,team,lane)=>world.waves?.[lane]?
 core.LaneEconomy.pressureFor({teamIds:[nav.a,nav.b],lanes:world.waves},team,lane):0;
function choose({nav,agent,minute,world,health={},baseline}){
 const N=core.Navigation,team=agent.teamId,side=sides(nav,team),lane=laneOf(agent.role);
 const hp=health[agent.id]??100;
 if(!agent.alive||hp<90||protectedIntents.has(baseline?.intent))return null;
 const allies=Object.values(nav.agents).filter(p=>p.teamId===team&&p.id!==agent.id&&
  p.alive&&(world.dead?.[p.id]||0)<=minute);
 const call=nav.neutralPlans?.[team];
 const front=l=>side+'_'+l.toLowerCase()+'_front';
 const vision=l=>world.map?.lanes?.[l]?.vision?.[team]??50;
 const plan=(goal,intent,reason,evidence={},targetLane=null)=>{
  const hops=N.hops(agent.node,goal);
  if(!Number.isFinite(hops)||agent.role==='JUN'&&!N.jungleAllowed(side,goal))return null;
  return {version:1,created:minute,until:minute+Math.max(1,hops)+1,goal,intent,
   reason,lane:targetLane,evidence:{...evidence,hp,travelHops:hops}};
 };
 if(agent.role==='SUP'&&['ward_roam','objective_setup'].includes(baseline?.intent))return null;
 const ownWave=lane?wave(nav,world,team,lane):0;
 const threatened=lane&&ownWave<=-.9&&(world.lanes?.[team]?.[lane]??3)<3;
 if(threatened){
  const goal=N.towerNode(side,lane,world.lanes[team][lane]+1);
  return plan(goal,agent.role==='SUP'?'protect_adc':'lane','reset_defend_wave',{ownWave},lane);
 }
 // An actual team call must survive the travel estimate; role restrictions
 // from NeutralObjectives.movement still apply (no unsolicited support roam).
 const objective=core.NeutralObjectives?.movement(nav,agent,minute,world);
 if(objective?.intent==='objective_setup'&&['take','contest'].includes(call?.action)&&
    call.target===objective.goal&&minute+N.hops(agent.node,call.target)<=call.until&&
    (world.map?.riverVision?.[team]??50)>=54)
  return plan(call.target,'objective_setup','reset_objective',
   {callReason:call.reason,callUntil:call.until,ownWave},null);
 if(agent.role==='JUN'){
  // Retain a genuine pre-existing objective/gank order rather than invent
  // an unrecorded camp. Otherwise select the nearest allied jungle node.
  if(['objective_setup','gank_setup'].includes(baseline?.intent))return null;
  const goal=[side+'_jungle_upper',side+'_jungle_lower'].sort((a,b)=>
   N.hops(agent.node,a)-N.hops(agent.node,b)||a.localeCompare(b))[0];
  return plan(goal,'farm_jungle','reset_jungle');
 }
 if(agent.role==='SUP'){
  if(['objective_setup','ward_roam'].includes(baseline?.intent))return null;
  const adc=allies.find(p=>p.role==='ADC');
  // Only follow an allied carry outside base with a legal actual node.
  const goal=adc&&(N.isLaneNode(adc.node,'BOT')||minute>=26&&N.isLaneNode(adc.node,'MID'))?
   adc.node:front('BOT');
  return plan(goal,'protect_adc','reset_rejoin_adc',{adcId:adc?.id||null},'BOT');
 }
 if(agent.role==='MID'&&minute>=14&&ownWave>=.8){
  const options=['TOP','BOT'].map(l=>({lane:l,w:wave(nav,world,team,l),vision:vision(l),
   ally:allies.find(p=>laneOf(p.role)===l&&N.hops(p.node,front(l))<=2&&(health[p.id]??100)>=55)}))
   .filter(x=>x.w<=-.8&&x.vision>=58&&x.ally&&(world.lanes?.[team]?.[x.lane]??3)<3)
   .sort((a,b)=>a.w-b.w||a.lane.localeCompare(b.lane));
  const target=options[0];
  if(target)return plan(front(target.lane),'rotation','reset_cover_side',
   {ownWave,targetWave:target.w,vision:target.vision,allyId:target.ally.id},target.lane);
 }
 if(agent.role==='ADC'&&minute>=14&&(world.lanes?.[team]?.BOT??0)>=1&&ownWave>=0&&
    vision('MID')>=58&&allies.some(p=>p.role==='SUP'&&N.hops(p.node,front('MID'))<=2))
  return plan(front('MID'),'rotation','reset_adc_mid',{ownWave,midVision:vision('MID')},'MID');
 return plan(front(lane),'lane','reset_return_lane',{ownWave},lane);
}
function continuation({nav,agent,minute,world,health={},baseline,route}){
 if(!route||agent.node===route.goal||minute>route.until||
    (health[agent.id]??100)<55||protectedIntents.has(baseline?.intent))return null;
 if(['ward_roam','gank_setup','objective_setup'].includes(baseline?.intent)&&route.intent!==baseline.intent)return null;
 if(route.reason==='reset_objective'){
  const c=nav.neutralPlans?.[agent.teamId];
  if(!['take','contest'].includes(c?.action)||c.target!==route.goal||
     minute+core.Navigation.hops(agent.node,route.goal)>c.until)return null;
 }
 const own=laneOf(agent.role);
 if(route.intent==='rotation'&&own&&wave(nav,world,agent.teamId,own)<=-.9)return null;
 return route;
}
function audit(match){
 const errors=[];let prior=null;
 for(const f of match.frames||[]){
  const before=f.navigation?.before||{};
  for(const [id,p] of Object.entries(before)){
   const r=p.resetRoute;
   if(!p.alive||p.decisionVersion!==9)continue;
   const old=prior?.navigation?.after?.[id],side=p.teamId===match.fixture.a?'blue':'red';
   if(!r||r.version!==1||r.goal!==p.goal||r.reason!==p.reason||
      r.intent!==p.intent||!Number.isInteger(r.created)||r.created>f.minute||
      f.minute>r.until||!Number.isFinite(r.evidence?.travelHops)||
      r.evidence.travelHops<0||r.evidence.hp<90)
    {errors.push('Invalid reset route '+id+' minute '+f.minute+' '+JSON.stringify({p,r}));continue;}
   if(r.created===f.minute){
    if(old?.node!==side+'_fountain'||old.intent!=='recall_recover'||
       r.evidence.travelHops!==core.Navigation.hops(old.node,r.goal))
     errors.push('Reset departure without own fountain proof '+id);
   }else if(JSON.stringify(old?.resetRoute)!==JSON.stringify(r))
    errors.push('Unproved reset route continuation '+id);
   if(p.role==='JUN'&&!core.Navigation.jungleAllowed(side,p.goal))
    errors.push('Reset jungle corridor '+id);
   if(r.reason==='reset_cover_side'&&(p.role!=='MID'||r.evidence.ownWave<.8||
      r.evidence.targetWave>-.8||r.evidence.vision<58||!r.evidence.allyId))
    errors.push('Reset side rotation without evidence '+id);
  }
  prior=f;
 }
 return errors;
}
core.ResetRouting=Object.freeze({choose,continuation,audit});
})(globalThis);
