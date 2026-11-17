/* Defensive formation around a visible existing tower siege.
 * Only non-junglers with a legal short route and affordable lane exit.
 * No new siege call, no extra movement, no damage or guaranteed fight.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const unavailable=new Set(['retreat','recall_channel','recall_recover','shop_recall','dead','siege_return']);
const laneOf=p=>p.role==='ADC'||p.role==='SUP'?'BOT':p.role;
function plan({nav,world,minute,health={},dead={}}){
 const c=nav.siegeDecision,N=core.Navigation;
 if(minute<22||!c||c.stage<0||c.stage>=3||c.wave<.48)return null;
 const team=c.teamId===nav.a?nav.b:nav.a,side=team===nav.a?'blue':'red';
 if(world.lanes?.[team]?.[c.lane]!==c.stage||Object.values(world.lanes[team]).some(s=>s===3))return null;
 const goal=N.towerNode(side,c.lane,c.stage+1);
 const live=p=>p.alive&&(dead[p.id]||0)<=minute&&!unavailable.has(p.intent);
 const allies=Object.values(nav.agents).filter(p=>p.teamId===team&&live(p));
 const visible=Object.values(nav.agents).filter(p=>p.teamId===c.teamId&&live(p)&&
  c.escorts.includes(p.id)&&N.hops(p.node,goal)<=2&&
  (core.Vision.canSee(nav.vision,team,p.node,minute)||allies.some(q=>N.combatRange(q.node,p.node,1))));
 if(visible.length<2)return null;
 const waveModel={teamIds:[nav.a,nav.b],lanes:world.waves};
 const candidates=allies.filter(p=>p.role!=='JUN'&&(health[p.id]??100)>=65)
  .map(p=>({id:p.id,role:p.role,node:p.node,hp:health[p.id]??100,hops:N.hops(p.node,goal),
   wave:core.LaneEconomy.pressureFor(waveModel,team,laneOf(p))}))
  .filter(p=>p.hops<=3&&(laneOf(p)===c.lane||p.role==='SUP'||p.wave>=-.8))
  .sort((a,b)=>Number(laneOf(b)===c.lane)-Number(laneOf(a)===c.lane)||a.hops-b.hops||b.hp-a.hp||a.id.localeCompare(b.id));
 const members=candidates.slice(0,Math.min(4,visible.length+1));
 if(members.length<3||!members.some(p=>laneOf(p)===c.lane))return null;
 return {version:1,minute,teamId:team,lane:c.lane,stage:c.stage+1,goal,
  visibleRivals:visible.map(p=>p.id).sort(),members};
}
function movement(nav,agent,minute){
 const p=nav.structureDefense;
 if(!p||p.minute!==minute||p.teamId!==agent.teamId||!p.members.some(m=>m.id===agent.id))return null;
 return {goal:p.goal,intent:'defend',lane:p.lane,reason:'visible_siege_reinforcement',decisionVersion:7};
}
core.StructureFormation=Object.freeze({plan,movement});
})(globalThis);
