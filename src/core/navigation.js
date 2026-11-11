/* Rift Director Alpha 0.6 — spatial agents & causal movement.
 * Every professional travels one graph edge per simulated minute. Events use
 * the pre-combat positions; dead players are returned to the fountain.
 * No DOM, timers, mutable globals, or gameplay RNG consumed by this module.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={}),graph=core.MiniGraph;
const ROLES=['TOP','JUN','MID','ADC','SUP'],LANES=['TOP','MID','BOT'];
const EXTRA=[
 ['blue_fountain','blue_nexus'],['red_fountain','red_nexus'],
 ['blue_jungle_upper','blue_top_outer'],['blue_jungle_lower','blue_mid_outer'],
 ['red_jungle_lower','red_bot_outer'],['red_jungle_upper','red_mid_outer'],
 ['upper_river','blue_top_outer'],['lower_river','red_bot_outer'],
 ['upper_river','red_top_outer'],['lower_river','blue_bot_outer'],
 ['blue_jungle_upper','blue_mid_outer'],['red_jungle_lower','red_mid_outer'],
 ['blue_jungle_lower','lower_river'],['red_jungle_upper','upper_river'],
 ['dragon_pit','lower_river'],['baron_pit','upper_river'],
 ['blue_gate','blue_nexus'],['red_gate','red_nexus']
];
const links=[...graph.links,...EXTRA];
const adjacency={};
for(const node of Object.keys(graph.nodes))adjacency[node]=new Set();
for(const [left,right] of links){
 if(!adjacency[left]||!adjacency[right])throw Error('Invalid navigation edge '+left+' -> '+right);
 adjacency[left].add(right);adjacency[right].add(left);
}
const getSide=(nav,id)=>id===nav.a?'blue':id===nav.b?'red':null;
const enemy=(nav,id)=>id===nav.a?nav.b:nav.a;
function path(from,to,allowed=null){
 if(!adjacency[from]||!adjacency[to])throw Error('Unknown navigation node: '+from+' / '+to);
 if(from===to)return [from];
 const previous=new Map([[from,null]]),queue=[from];
 for(let i=0;i<queue.length;i++){
  for(const neighbor of adjacency[queue[i]]){
   if(previous.has(neighbor)||(allowed&&!allowed(neighbor)))continue;
   previous.set(neighbor,queue[i]);queue.push(neighbor);
   if(neighbor===to){
    const answer=[to];let cur=to;
    while(previous.get(cur)!==null){cur=previous.get(cur);answer.push(cur)}
    return answer.reverse();
   }
  }
 }
 throw Error('Disconnected navigation graph: '+from+' / '+to);
}
function hops(from,to){return path(from,to).length-1}
function adjacent(a,b){return Boolean(adjacency[a]?.has(b))}
function nearby(a,b,maxHops=1){return hops(a,b)<=maxHops}
function combatRange(a,b,maxHops=2){
 if(!adjacency[a]||!adjacency[b]||!nearby(a,b,maxHops))return false;
 const p=graph.pointAt(a),q=graph.pointAt(b);
 return Math.hypot(p.x-q.x,p.y-q.y)<=76;
}
function isLaneNode(node,lane){
 if(!['TOP','MID','BOT'].includes(lane)||!adjacency[node])return false;
 const l=lane.toLowerCase();
 if(node===l+'_center'||node===l+'_corner')return true;
 // An ambush staging point is in the jungle even when its name has top/bot.
 return ['blue','red'].some(side=>['base','inner','outer','front']
   .some(part=>node===side+'_'+l+'_'+part));
}
function gankApproach(node,lane){
 if(!adjacency[node])throw Error('Nodo desconocido para gank: '+node);
 if(node.includes('river')||node.endsWith('_pit'))return 'rio';
 if(lane==='BOT'&&node==='bot_corner')return 'tribush';
 if(node.includes('jungle'))return 'jungla';
 return 'flanco';
}
function seedHash(...values){
 let x=2166136261>>>0;
 for(const value of values){for(const ch of String(value)){x^=ch.charCodeAt(0);x=Math.imul(x,16777619)>>>0}}
 return x>>>0;
}
function towerNode(side,lane,stage){
 if(!LANES.includes(lane)||stage<1||stage>3)throw Error('Invalid tower target');
 return side+'_'+lane.toLowerCase()+'_'+['outer','inner','base'][stage-1];
}
function createNavigation(clubs,teams,seed){
 const [a,b]=clubs.map(c=>c.id);
 const agents={};
 for(const [index,c] of clubs.entries()){
  const side=index===0?'blue':'red';
  for(const role of ROLES){
   const p=teams[c.id].find(x=>x.role===role);
   if(!p||agents[p.id])throw Error('Invalid lineup for navigation');
   const node=role==='JUN'?side+'_jungle_upper':side+'_'+
      (role==='ADC'||role==='SUP'?'bot':role.toLowerCase())+'_front';
   agents[p.id]={id:p.id,teamId:c.id,role,node,goal:node,
     intent:'lane',alive:true,route:[node],movedFrom:node};
  }
 }
 return {a,b,agents,teams,seed,siegeTeam:null,siegeLane:null,
   sideLane:null,siegeChecked:-1,siegeUntil:0,siegeDecision:null,minute:0,
   vision:core.Vision?.create([a,b])||null};
}
function teamAgents(nav,id){return Object.values(nav.agents).filter(x=>x.teamId===id)}
function getAgent(nav,id){return nav.agents[id]||null}
function at(nav,id,node,maxHops=1){
 const agent=nav.agents[id];
 if(!agent?.alive||!nearby(agent.node,node,maxHops))return false;
 const source=graph.pointAt(agent.node),target=graph.pointAt(node);
 // A path edge alone may span 100+ SVG units. Being one graph hop away
 // does not mean you are physically standing next to a structure.
 return Math.hypot(source.x-target.x,source.y-target.y)<=64;
}
function participants(nav,teamId,node,maxHops=1){
 return teamAgents(nav,teamId).filter(a=>at(nav,a.id,node,maxHops)).sort((a,b)=>{
  const priority={JUN:0,SUP:1,ADC:2,MID:3,TOP:4};
  return priority[a.role]-priority[b.role]||a.id.localeCompare(b.id);
 });
}
function engagement(nav,teamId,maxHops=1) {
 const our=teamAgents(nav,teamId).filter(a=>a.alive&&a.intent!=='retreat');
 const their=teamAgents(nav,enemy(nav,teamId)).filter(a=>a.alive&&a.intent!=='retreat');
 const candidates=[];
 for(const p of our){
  const foes=their.filter(x=>combatRange(p.node,x.node,maxHops));
  if(foes.length) candidates.push({actor:p,foes});
 }
 return candidates.sort((x,y)=>y.foes.length-x.foes.length||x.actor.id.localeCompare(y.actor.id));
}
function siegeLane(nav,worldState,team){
 const opp=enemy(nav,team),lanes=worldState.lanes[opp];
 const wave=worldState.waves||{};
 const rank=lane=>lanes[lane]*4+
   (core.LaneEconomy?.pressureFor({teamIds:[nav.a,nav.b],lanes:wave},team,lane)||0)*1.6+
   (wave[lane]?.plates?.[opp]?.[lanes[lane]]||0)*1.2;
 return [...LANES].sort((x,y)=>rank(y)-rank(x)||
   seedHash(nav.seed,team,x)%3-seedHash(nav.seed,team,y)%3)[0];
}
function secondaryLane(nav,worldState,team,primary){
 // Solo-lane pressure is a strategic allocation: TOP/MID may contest a
 // different physical structure, while ADC/SUP keep the coordinated siege.
 const other=enemy(nav,team);
 const choices=['TOP','MID'].filter(lane=>lane!==primary);
 return choices.sort((a,b)=>{
  const rank=lane=>{
   const progress=worldState.lanes[other][lane];
   const wave=worldState.waves?.[lane];
   const pressure=core.LaneEconomy?.pressureFor(
     {teamIds:[nav.a,nav.b],lanes:worldState.waves},team,lane)||0;
   const plates=wave?.plates?.[other]?.[progress]||0;
   return (progress>=3?-100:0)+plates*2+pressure*1.2+progress;
  };
  return rank(b)-rank(a)||a.localeCompare(b);
 })[0]||'TOP';
}
// A siege is an investment of actual travel, farm and safety, not a
// "minute >= 44" phase transition. Evaluate the same snapshot for BOTH
// teams before anyone moves, with no gameplay RNG or hidden enemy HP.
function siegeOpportunities(nav,world,t,context=null){
 const teams=[nav.a,nav.b],out=[];
 const waveModel={teamIds:teams,lanes:world.waves};
 const hp=context?.health||{};
 const alive=p=>p.alive&&(world.dead?.[p.id]||0)<=t&&
   p.intent!=='retreat'&&p.intent!=='dead'&&(hp[p.id]??100)>=38;
 const offensivePower=p=>{
  const row=world.powerEconomy?.entries?.[p.id];
  return row?(core.PowerEconomy?.boost(world.powerEconomy,p.id,'attack')||0):0;
 };
 for(const team of teams){
  const foe=enemy(nav,team),ours=teamAgents(nav,team).filter(alive),
   theirs=teamAgents(nav,foe).filter(alive);
  const powerEdge=ours.length&&theirs.length?
   (ours.reduce((sum,p)=>sum+offensivePower(p),0)/ours.length-
    theirs.reduce((sum,p)=>sum+offensivePower(p),0)/theirs.length):0;
  const deadEnemies=teamAgents(nav,foe).filter(p=>
   (world.dead?.[p.id]||0)>t).length;
  const lead=(world.gold?.[team]||0)-(world.gold?.[foe]||0);
  const finished=new Set((core.PowerEconomy?.ITEM_CATALOG||[]).map(i=>i.id));
  const completed=ours.reduce((n,p)=>n+(world.powerEconomy?.entries?.[p.id]?.items||[])
   .filter(id=>finished.has(id)).length,0);
  for(const lane of LANES){
   const stage=world.lanes?.[foe]?.[lane];
   if(!Number.isInteger(stage)||stage<0||stage>3||
      !world.waves?.[lane])continue;
   const goal=stage===3?getSide(nav,foe)+'_nexus':
    towerNode(getSide(nav,foe),lane,stage+1);
   const wave=core.LaneEconomy.pressureFor(waveModel,team,lane);
   // An advanced lane needs less push momentum than an untouched outer
   // tower, but a losing wave never creates a free tower/nexus attempt.
   const committed=nav.siegeTeam===team&&nav.siegeLane===lane&&nav.siegeUntil>t;
   const minimumWave=committed?-.20:stage===3?-.20:stage>0?.35:.48;
   if(wave<minimumWave)continue;
   // Neither a stopwatch nor a tiny early wave authorizes abandoning lanes.
   // An untouched outer tower requires an earned kill, a substantial lead
   // alongside the wave, or bought equipment able to convert into pressure.
   const earned=deadEnemies>0||lead>=2200&&wave>=1.05||
    completed>=2&&wave>=.85||completed>=4&&wave>=.45;
   if(stage===0&&!earned)continue;
   // Distance is graph travel, NOT a global asiedio timer. A nearby
   // competent pair can rotate before a rich but distant team.
   const escorts=ours.map(p=>({id:p.id,hops:hops(p.node,goal),
    lanePresent:isLaneNode(p.node,lane)}))
    .filter(p=>p.hops<=7&&(stage===3||p.role!=='JUN')).sort((a,b)=>a.hops-b.hops||
     a.id.localeCompare(b.id));
   if(escorts.length<2||escorts[0].hops>5)continue;
   const local=escorts.filter(p=>p.lanePresent||p.hops<=3).length;
   const travel=(escorts[0].hops+escorts[1].hops)/2;
   // Never read invisible opponent positions to choose a push.
   // The team's own vision determines how risky an unknown defense is.
   const vision=world.map?.lanes?.[lane]?.vision?.[team]??50;
   const revealed=vision>=58;
   const defenders=revealed?theirs.filter(p=>hops(p.node,goal)<=2).length:0;
   const fogCost=revealed?0:1.0;
   const nearbyPower=Math.max(-2,Math.min(2,powerEdge*.075));
   const localEdge=escorts.length-defenders;
   const structuralProgress=stage*1.5+(stage===3?3:0);
   const position=local*.85+Math.min(3,escorts.length)*.4-
    travel*.24;
   const score=wave*2.25+position+structuralProgress+
    nearbyPower+Math.min(2,deadEnemies)*1.35-
    defenders*.9-fogCost;
   // Victory route and actual eliminated defenders matter, but neither
   // a gold lead nor an absolute minute may authorize a push on its own.
   const required=stage===3?1.6:stage>0?2.4:3.2;
   // On an already opened Nexus route, numerical inferiority is a
   // combat risk, not an absolute ban on a physical assault. The Nexus
   // damage ledger still requires a real wave, two living attackers
   // at the base and applies the actual defenders' damage reduction.
   if(score<required||(stage<3&&localEdge<1&&!deadEnemies))continue;
   out.push({team,lane,goal,stage,wave,score,escorts:escorts.map(p=>p.id),
    travel,local,defenders,vision,powerEdge,deadEnemies,
    required,minimumWave});
  }
 }
 return out.sort((x,y)=>y.score-x.score||
   y.stage-x.stage||x.travel-y.travel||
   LANES.indexOf(x.lane)-LANES.indexOf(y.lane)||
   x.team.localeCompare(y.team));
}
function determineSiege(nav,worldState,t,context=null){
 if(nav.siegeChecked===t)return;
 nav.siegeChecked=t;
 const options=siegeOpportunities(nav,worldState,t,context);
 const old=options.find(p=>p.team===nav.siegeTeam&&
  p.lane===nav.siegeLane);
 const best=options[0]||null;
 // Commitment lasts only while the physical advantage continues. Avoid
 // changing lanes for tiny score variations; never guarantee an eight-minute
 // siege just because the clock reached a particular phase.
 // On a real opened Nexus route, finishing is worth more than repeatedly
 // restarting unrelated outer-tower marches. A major opposing earned
 // opportunity can still interrupt the current plan.
 const endgame=options.find(p=>p.team===nav.siegeTeam&&p.stage===3&&
  p.wave>=-.20&&p.escorts.length>=2);
 const top=endgame||best;
 // Once attackers have a real viable wave and local escorts, sustain
 // their push rather than re-assigning them to TOP/MID/BOT on consecutive
 // minutes. Only an open Nexus route or a substantially stronger opposing
 // opportunity should dislodge an earned commitment.
 const continuing=old&&old.escorts.length>=2&&
  old.wave>=.30&&old.score>=old.required-1.0;
 const urgent=top&&top.team===old?.team&&top.stage===3&&
  top.lane!==old.lane;
 const lostInitiative=old&&top&&top.team!==old.team&&
  top.score>=old.score+6.0&&top.deadEnemies>0;
 const chosen=continuing&&!urgent&&!lostInitiative?old:
   old&&nav.siegeUntil>t&&
     (!top||top.team===old.team&&top.stage!==3&&
      top.score<old.score+5.5||
      top.team!==old.team&&top.score<old.score+4.2)?
     old:top;
 if(!chosen){
  // A broken lane is a physically earned path to victory. A momentary
  // absence of a fresh lane proposal must not pull its two travelling
  // attackers away from the Nexus every alternate minute.
  const team=nav.siegeTeam,foe=team&&enemy(nav,team),lane=nav.siegeLane;
  if(team&&lane&&nav.siegeUntil>t&&worldState.lanes?.[foe]?.[lane]===3){
   const wave=core.LaneEconomy.pressureFor(
    {teamIds:[nav.a,nav.b],lanes:worldState.waves},team,lane);
   const goal=getSide(nav,foe)+'_nexus';
   const escorts=teamAgents(nav,team).filter(p=>p.alive&&
    (worldState.dead?.[p.id]||0)<=t&&
    p.intent!=='retreat'&&hops(p.node,goal)<=8);
   if(wave>=-.25&&escorts.length>=2){
    nav.siegeDecision={version:1,minute:t,teamId:team,lane,stage:3,
     score:nav.siegeDecision?.score??0,wave,
     travel:Math.min(...escorts.map(p=>hops(p.node,goal))),
     escorts:escorts.map(p=>p.id),defenders:0,vision:50,
     powerEdge:0,reason:'continue_open_nexus_route'};
    return;
   }
  }
  nav.siegeTeam=null;nav.siegeLane=null;nav.sideLane=null;
  nav.siegeUntil=0;nav.siegeDecision=null;
  return;
 }
 const same=chosen.team===nav.siegeTeam&&chosen.lane===nav.siegeLane;
 nav.siegeTeam=chosen.team;
 nav.siegeLane=chosen.lane;
 nav.sideLane=secondaryLane(nav,worldState,chosen.team,chosen.lane);
 // A plan's budget is its estimated graph journey, not the match clock;
 // it is reviewed again every simulated minute against the real wave.
 if(!same||nav.siegeUntil<=t||continuing)
  nav.siegeUntil=t+Math.max(3,Math.min(8,Math.ceil(chosen.travel)+2));
 nav.siegeDecision={version:1,minute:t,teamId:chosen.team,lane:chosen.lane,
  stage:chosen.stage,score:+chosen.score.toFixed(2),wave:chosen.wave,
  travel:+chosen.travel.toFixed(2),escorts:[...chosen.escorts],
  defenders:chosen.defenders,vision:chosen.vision,
  powerEdge:+chosen.powerEdge.toFixed(2)};
}
// Only these regions belong to the JUN's travel network before teamfights.
// Gank staging nodes are off-lane; simply being in a node adjacent to a lane
// never permits the pathfinder to wander into the lane en route to camps.
const JUNGLE_COMMON=new Set([
 'upper_river','lower_river','baron_pit','dragon_pit',
 'blue_top_ambush','red_top_ambush','blue_bot_ambush','red_bot_ambush'
]);
function jungleAllowed(side,node){
 return JUNGLE_COMMON.has(node)||[
  side+'_fountain',side+'_nexus',side+'_jungle_upper',side+'_jungle_lower'
 ].includes(node);
}
function gankPlanForLane(nav,agent,lane){
 const side=getSide(nav,agent.teamId);
 if(!LANES.includes(lane))throw Error('Invalid gank lane');
 const goal=lane==='MID'?(side==='blue'?'upper_river':'lower_river'):
   lane==='TOP'?(side==='blue'?'red_top_ambush':'blue_top_ambush'):
   (side==='blue'?'red_bot_ambush':'blue_bot_ambush');
 return {goal,intent:'gank_setup',lane};
}
function gankPlan(nav,agent,slot){
 const lane=LANES[seedHash(nav.seed,agent.teamId,slot+'-lane')%LANES.length];
 return gankPlanForLane(nav,agent,lane);
}
function jungleGoal(nav,agent,t){
 const side=getSide(nav,agent.teamId);
 const first=5+seedHash(nav.seed,agent.teamId,'opening-window')%3;
 const second=14+seedHash(nav.seed,agent.teamId,'second-window')%3;
 const own=node=>side+'_jungle_'+node;
 if(t<=2)return {goal:own('upper'),intent:'farm_jungle'};
 if(t<=4)return {goal:own('lower'),intent:'farm_jungle'};
 if(t>=first&&t<=first+3)return gankPlan(nav,agent,'opening');
 if(t<second)return {goal:own(t%4<2?'upper':'lower'),intent:'farm_jungle'};
 if(t<=second+3)return gankPlan(nav,agent,'second');
 if(t<=19)return {goal:own('lower'),intent:'farm_jungle'};
 if(t<=22)return {goal:'dragon_pit',intent:'objective_setup'};
 if(t<=24)return {goal:own('upper'),intent:'farm_jungle'};
 if(t<=28)return {goal:'baron_pit',intent:'objective_setup'};
 if(t<=32)return {goal:own('lower'),intent:'farm_jungle'};
 return {goal:own(t%4<2?'upper':'lower'),intent:'farm_jungle'};
}
function chooseGoal(nav,agent,t,worldState,context=null){
 const side=getSide(nav,agent.teamId),team=agent.teamId;
 const foe=enemy(nav,team),role=agent.role;
 const anchor=lane=>side+'_'+lane.toLowerCase()+'_front';
 const lead=worldState.gold[team]-worldState.gold[foe];
 const partner=role==='SUP'?teamAgents(nav,team).find(p=>p.role==='ADC'&&p.alive):null;
 const followADC=()=>partner?.goal&&adjacency[partner.goal]?partner.goal:anchor('BOT');

 // An affordable power spike can justify physically returning to base.
 // A single professional per squad may recall; there is no teleport/instant buy.
 if(worldState.powerEconomy&&
    core.PowerEconomy.shouldRecall(worldState.powerEconomy,nav,agent,t,worldState,context))
  return {goal:side+'_nexus',intent:'shop_recall',
    reason:'affordable_item_spike',decisionVersion:3};

 // An already opened, physically escorted path to the enemy Nexus
 // takes priority over another neutral objective timer. Players still
 // traverse one real graph edge per minute; this grants zero structure HP.
 const finish=nav.siegeDecision?.stage===3&&
  nav.siegeDecision?.teamId===nav.siegeTeam;
 const siegeEscort=nav.siegeDecision?.teamId===team&&
  nav.siegeDecision.escorts.includes(agent.id);
 // A Nexus finish can rally defenders, but an attacking jungler needs
 // personal proof of assignment before leaving its corridor.
 if(finish&&(team!==nav.siegeTeam||role!=='JUN'||siegeEscort)){
  const goal=(team===nav.siegeTeam?getSide(nav,foe):side)+'_nexus';
  return {goal,intent:team===nav.siegeTeam?'siege':'defend',
   lane:nav.siegeLane,
   reason:team===nav.siegeTeam?'earned_nexus_finish':'defend_open_nexus',
   decisionVersion:2};
 }

 // An earned attacking group commits its actual escorts. Unassigned
 // professionals keep their lane/farm/objective responsibilities, instead
 // of a global siege call redirecting all ten agents to one tower.
 if(team===nav.siegeTeam&&siegeEscort&&nav.siegeDecision.stage<3){
  const lane=nav.siegeLane,stage=worldState.lanes[foe][lane]+1;
  return {goal:stage<=3?towerNode(getSide(nav,foe),lane,stage):
    getSide(nav,foe)+'_nexus',intent:'siege',lane,
    reason:'earned_siege_escort',decisionVersion:3};
 }

 // Defenders of the threatened lane answer an observed push instead of
 // remaining idle while their tower takes damage. They must travel along
 // graph edges and actually encounter attackers. Distant hidden HP and
 // enemy positions never authorize this call.
 const ownLane=role==='ADC'||role==='SUP'?'BOT':
  role==='TOP'||role==='MID'?role:null;
 if(ownLane&&worldState.lanes?.[team]?.[ownLane]<3){
  const stage=worldState.lanes[team][ownLane]+1;
  const goal=towerNode(side,ownLane,stage);
  const foeWave=core.LaneEconomy.pressureFor(
   {teamIds:[nav.a,nav.b],lanes:worldState.waves},foe,ownLane);
  const vision=worldState.map?.lanes?.[ownLane]?.vision?.[team]??50;
  const nearbyAllies=teamAgents(nav,team).filter(p=>p.alive);
  const threat=teamAgents(nav,foe).some(p=>p.alive&&
   (worldState.dead?.[p.id]||0)<=t&&p.intent!=='retreat'&&
   hops(p.node,goal)<=3&&
   (vision>=58||nearbyAllies.some(ally=>hops(ally.node,p.node)<=3))&&
   (['siege','splitpush','counterpush','macro_pressure'].includes(p.intent)||
    foeWave>=.48));
  if(threat&&foeWave>=.35)
   return {goal,intent:'defend',lane:ownLane,
    reason:'visible_structure_defense',decisionVersion:7};
 }

 // Neutral objectives are a real opportunity cost: the two escorts must
 // travel to Dragon, or a splitpusher can pressure TOP instead. This is a
 // per-team decision made before any agent moves, never turn-order magic.
 const dragonPlan=core.NeutralObjectives?.movement(nav,agent,t,worldState);
 if(dragonPlan)return dragonPlan;

 // A won local fight creates a short opportunity to push a wave, not a
 // plate/tower entitlement. Actual structures still need attackers & waves.
 const pressure=core.Counterplay?.followup(nav,agent,t,worldState,context);
 if(pressure)return pressure;

 // Earned farm, wave pressure and optional MID rotation compete for the
 // same professional's travel time. No outcome is assigned by this order.
 const resourceChoice=core.MacroPolicy?.movement(nav,agent,t);
 if(resourceChoice)return resourceChoice;

 // The strategic plan was evaluated once from a common pre-movement
 // snapshot in advance(). No player is able to choose an easier opportunity
 // just because an earlier teammate moved first.
 // Support keeps the ADC-protection/roaming contract during early lane
 // phase; it may join an *earned* BOT counterpush via Counterplay above.
 // A generic gold advantage is not permission to abandon the carry.
 // An independently favourable secondary wave may justify a solo split.
 // Unlike the old global siege, this does not order every other teammate
 // or defender to abandon their own lanes.
 if(nav.siegeTeam&&nav.siegeDecision?.stage<3){
  const sideLane=nav.sideLane||'TOP';
  const sideRole=sideLane==='TOP'?'TOP':'MID';
  if(role===sideRole&&worldState.lanes[foe][sideLane]<3){
   const wave=core.LaneEconomy.pressureFor(
    {teamIds:[nav.a,nav.b],lanes:worldState.waves},team,sideLane);
   const stage=worldState.lanes[foe][sideLane]+1;
   const enemyWave=core.LaneEconomy.pressureFor(
    {teamIds:[nav.a,nav.b],lanes:worldState.waves},nav.siegeTeam,sideLane);
   const visible=(worldState.map?.lanes?.[sideLane]?.vision?.[team]??50)>=58;
   if(team!==nav.siegeTeam&&visible&&enemyWave>=1.35&&
      worldState.lanes[team][sideLane]<3)
    return {goal:towerNode(side,sideLane,worldState.lanes[team][sideLane]+1),
     intent:'counter_siege',lane:sideLane,reason:'protect_secondary_lane',
     decisionVersion:3};
   if(team===nav.siegeTeam&&wave>=.35)
    return {goal:towerNode(getSide(nav,foe),sideLane,stage),
     intent:'splitpush',lane:sideLane,reason:'secondary_wave_pressure',
     decisionVersion:3};
   if(team!==nav.siegeTeam&&wave>=.35&&
      (worldState.map?.lanes?.[sideLane]?.vision?.[team]??50)>=58)
    return {goal:towerNode(getSide(nav,foe),sideLane,stage),
     intent:'counterpush',lane:sideLane,reason:'visible_crossmap_trade',
     decisionVersion:3};
  }
 }

 if(role==='JUN')return jungleGoal(nav,agent,t);

 if(role==='SUP'){
  // During early laning the support must protect the allied ADC.
  // The first roam is a bounded river/dragon window, *not* a permanent
  // march to the objective or to the shared bot corner.
  if(t<=13)return {goal:followADC(),intent:'protect_adc'};
  if(t<=17)return {goal:'lower_river',intent:'ward_roam'};
  if(t<=21)return {goal:followADC(),intent:'protect_adc'};
  if(t<=28)return {goal:'baron_pit',intent:'objective_setup'};
  if(t<=30)return {goal:'lower_river',intent:'ward_roam'};
  return {goal:anchor('MID'),intent:'group'};
 }

 if(role==='ADC'){
  // Blue and red cannot both stand at bot_corner during lane phase.
  // Only the side with a meaningful advantage may take the central bend.
  if(t<=14)return {goal:anchor('BOT'),intent:'lane'};
  if(t<=25)return {goal:lead>1900?'bot_corner':anchor('BOT'),intent:lead>1900?'push':'lane'};
  if(t<=29)return {goal:anchor('MID'),intent:'rotation'};
  return {goal:lead>1000?'mid_center':anchor('MID'),intent:'group'};
 }

 if(role==='TOP'){
  if(t<=13)return {goal:anchor('TOP'),intent:'lane'};
  if(t<=28)return {goal:lead>1400?'top_corner':anchor('TOP'),
    intent:lead>1400?'splitpush':'lane'};
  if(t<=32)return {goal:anchor('TOP'),intent:'reset'};
  return {goal:anchor('MID'),intent:'group'};
 }

 // MID holds their own half instead of both midlaners sharing mid_center
 // from minute six. Pressure can move the winning side forward later.
 if(t<=13)return {goal:anchor('MID'),intent:'lane'};
 if(t<=25)return {goal:lead>1600?'mid_center':anchor('MID'),
   intent:lead>1600?'push':'lane'};
 return {goal:lead>900?'mid_center':anchor('MID'),intent:'group'};
}
function forceRetreat(nav,id,minute,goal){
 const agent=nav.agents[id];
 if(!agent?.alive||!adjacency[goal])return false;
 const side=getSide(nav,agent.teamId);
 if(agent.role==='JUN'&&!jungleAllowed(side,goal)&&
    !(nav.siegeDecision?.teamId===agent.teamId&&
      nav.siegeDecision.stage===3&&nav.siegeDecision.escorts.includes(id)))
  throw Error('Jungla no puede retirarse por un carril');
 // Survival decisions always use legal graph edges. A previously committed
 // jungler may be outside its ordinary corridor when it must retreat.
 const steps=path(agent.node,goal);
 agent.retreatGoal=goal;
 agent.retreatUntil=minute+Math.max(4,steps.length+2);
 agent.goal=goal;agent.intent='retreat';
 return true;
}
function advance(nav,t,dead,worldState,context=null){
 if(t<=nav.minute)throw Error('Navigation minutes must advance');
 nav.minute=t;
 // Decide pressure from the SAME unmodified positions for both sides.
 determineSiege(nav,{...worldState,dead},t,context);
 nav.neutralPlans=core.NeutralObjectives?.plan(nav,worldState,t,context?.health)||null;
 nav.macroPlans=core.MacroPolicy?.plan(nav,worldState,t,context?.health,dead)||{};
 // All tactics inspect the same initial positions (no turn-order advantage).
 const positions=Object.fromEntries(Object.entries(nav.agents).map(([id,a])=>
  [id,{id:a.id,node:a.node,teamId:a.teamId,role:a.role,
   alive:(dead[id]||0)<=t,intent:a.intent}]));
 const tacticalContext=context?{...context,positions}:null;
 for(const agent of Object.values(nav.agents)){
  const side=getSide(nav,agent.teamId),fountain=side+'_fountain';
  const wasDead=!agent.alive;
  agent.movedFrom=agent.node;
  agent.alive=(dead[agent.id]||0)<=t;
  if(!agent.alive){
   agent.node=fountain;agent.goal=fountain;agent.intent='dead';agent.route=[fountain];
   continue;
  }
  if(wasDead){agent.node=fountain;agent.retreatUntil=0;agent.retreatGoal=null;}
  const escaping=agent.retreatGoal&&agent.node!==agent.retreatGoal&&
    (agent.retreatUntil||0)>=t;
  const baseline=escaping?null:chooseGoal(nav,agent,t,worldState,context);
  const plan=escaping?{goal:agent.retreatGoal,intent:'retreat',reason:'damage_retreat'}:
    core.TacticalAI?.choose({nav,agent,minute:t,worldState,
      context:tacticalContext,baseline})||baseline;
  if(!escaping){agent.retreatUntil=0;agent.retreatGoal=null;}
  agent.goal=plan.goal;agent.intent=plan.intent;agent.lane=plan.lane||null;
  agent.tacticReason=plan.reason||null;
  agent.decisionVersion=plan.decisionVersion||null;
  // Only a specifically selected Nexus escort may leave the jungle.
  // Generic team siege/defense orders never grant movement permissions.
  const assigned=agent.role==='JUN'&&
   nav.siegeDecision?.teamId===agent.teamId&&
   nav.siegeDecision.stage===3&&
   nav.siegeDecision.escorts.includes(agent.id);
  if(agent.role==='JUN'&&!assigned){
   if(!jungleAllowed(side,agent.goal)){
    agent.goal=side+'_jungle_lower';
    agent.intent='farm_jungle';
    agent.tacticReason='jungle_corridor';
   }
   if(!jungleAllowed(side,agent.node)){
    // A previously selected escort exits the lane through real edges.
    agent.intent='siege_return';
    agent.tacticReason='return_to_jungle';
    agent.route=path(agent.node,agent.goal);
   }else{
    agent.route=path(agent.node,agent.goal,node=>jungleAllowed(side,node));
   }
  }else{
   agent.route=path(agent.node,agent.goal);
  }
  // One edge a minute; no position jumps to satisfy an event later.
  if(agent.route.length>1)agent.node=agent.route[1];
 }
}
// Nexus victory is based on an opened route, physically present attackers,
// a surviving wave and local defenders, never a minute-indexed coin flip.
function nexusOpportunity(nav,{teamId,lanes,waves,health={},dead={},minute=nav.minute}){
 const foe=enemy(nav,teamId),foeSide=getSide(nav,foe),node=foeSide+'_nexus';
 const opened=['TOP','MID','BOT'].filter(lane=>(lanes?.[foe]?.[lane]||0)>=3);
 if(!opened.length)return null;
 const healthy=(p,min)=>p.alive&&(dead[p.id]||0)<=minute&&
   (health[p.id]??100)>=min&&at(nav,p.id,node,1);
 const attackers=teamAgents(nav,teamId).filter(p=>p.intent!=='retreat'&&healthy(p,40));
 // Fountain residents are safe at spawn but not automatically stationed at
 // the attacked Nexus. They must physically move out to defend it.
 const defenders=teamAgents(nav,foe).filter(p=>p.node!==foeSide+'_fountain'&&healthy(p,25));
 if(attackers.length<2)return null;
 const candidates=opened.map(lane=>({lane,wave:core.LaneEconomy.pressureFor(
  {teamIds:[nav.a,nav.b],lanes:waves},teamId,lane)}))
  .sort((a,b)=>b.wave-a.wave||a.lane.localeCompare(b.lane));
 if(!candidates.length)return null;
 return {teamId,node,lane:candidates[0].lane,wave:candidates[0].wave,
  attackers:attackers.map(p=>p.id),defenders:defenders.map(p=>p.id)};
}
// Physical siege damage accounts for real defenders and wave momentum.
// Even a defended Nexus can sustain gradual damage from a persistent siege,
// but weak/isolated attackers cannot damage it at all.
function nexusSiegeDamage(plan,baronBuff=0){
 if(!plan||plan.attackers.length<2)return 0;
 const edge=plan.attackers.length-plan.defenders.length;
 const wave=Math.max(-.5,Math.min(.5,plan.wave*.15));
 const value=1+edge*.45+wave+(baronBuff>0?.4:0);
 return Math.max(.25,Math.min(3,Math.round(value*4)/4));
}
function snapshot(nav,dead,t){
 const out={};
 for(const agent of Object.values(nav.agents)){
  const alive=(dead[agent.id]||0)<=t;
  const node=alive?agent.node:getSide(nav,agent.teamId)+'_fountain';
  out[agent.id]={node,alive,goal:agent.goal,intent:alive?agent.intent:'dead',
    from:agent.movedFrom,role:agent.role,teamId:agent.teamId,
    ...(agent.lane?{lane:agent.lane}:{}),
    ...(agent.tacticReason?{reason:agent.tacticReason}:{}),
    ...(agent.decisionVersion?{decisionVersion:agent.decisionVersion}:{})};
 }
 return out;
}
function auditNavigation(match,world){
 const errs=[],frames=match.frames,events=match.events;
 if(!frames?.[0]?.navigation)return ['Falta navegación de los frames'];
 const roster=Object.fromEntries(world.players.map(p=>[p.id,p]));
 const agentIds=Object.keys(frames[0].navigation.after||{});
 if(agentIds.length!==10)errs.push('La partida no tiene diez agentes.');
 let prior=null,eventIndex=0;
 const deadUntil={};
 // A jungler's early crossing is legal only if a real siege opportunity
 // was registered recently. The short grace is graph-travel clearance
 // after the call expires, NOT a match-clock unlock.
 const siegeTravelProof=Object.fromEntries(agentIds.map(id=>[id,-100]));
 for(const frame of frames){
  const call=frame.siegeDecision;
  if(call?.version===1&&call.minute===frame.minute&&
     [match.fixture.a,match.fixture.b].includes(call.teamId)&&
     LANES.includes(call.lane)&&Number.isFinite(call.wave)&&
     Number.isFinite(call.score)&&call.stage===3&&
     call.escorts?.length>=2){
   for(const id of call.escorts)if(
    frame.navigation?.before?.[id]?.teamId===call.teamId&&
    frame.navigation.before[id].role==='JUN')
    siegeTravelProof[id]=frame.minute;
  }
  const nav=frame.navigation;
  if(!nav?.before||!nav?.after){errs.push('Frame sin estado de navegación: '+frame.minute);continue}
  for(const id of agentIds){
   const before=nav.before[id],after=nav.after[id],prev=prior?.after?.[id];
   if(!before||!after||!roster[id]){errs.push('Agente inválido '+id);continue}
   if(!adjacency[before.node]||!adjacency[after.node]){errs.push('Nodo desconocido '+id);continue}
   if(prev&&prev.alive&&before.alive&&!nearby(prev.node,before.node,1))
    errs.push('Teletransporte entre minutos: '+id+' minuto '+frame.minute);
   if(prev&&!prev.alive&&before.alive&&!nearby(prev.node,before.node,1))
    errs.push('Respawn con salto ilegal: '+id+' minuto '+frame.minute);
   const shouldLive=(deadUntil[id]||0)<=frame.minute;
   if(before.alive!==shouldLive)errs.push('Estado vivo/muerto incoherente: '+id+' minuto '+frame.minute);
   if(before.role==='JUN'&&before.alive){
    const side=before.teamId===match.fixture.a?'blue':'red';
    const authorized=frame.minute-siegeTravelProof[id]<=8&&
     ['siege','siege_return','retreat'].includes(before.intent);
    if(!jungleAllowed(side,before.node)&&!authorized)
      errs.push('JUN invadió un carril sin ser evento: '+id+' minuto '+frame.minute);
    if(before.intent==='gank_setup'&&!LANES.includes(before.lane))
      errs.push('JUN prepara gank sin carril válido: '+id+' minuto '+frame.minute);
   }
   if(!before.alive&&before.node!== (before.teamId===match.fixture.a?'blue':'red')+'_fountain')
    errs.push('Muerto fuera de la fuente: '+id);
  }
  while(eventIndex<frame.eventsCount){
   const e=events[eventIndex++],f=e?.facts;if(!f)continue;
   const team=e.teamId,other=team===match.fixture.a?match.fixture.b:match.fixture.a;
   const positions=nav.before;
   const active=id=>Boolean(positions[id]?.alive&&(deadUntil[id]||0)<=e.minute);
   const near=(id,node,d=1)=>{
     if(!active(id)||!nearby(positions[id].node,node,d))return false;
     const source=graph.pointAt(positions[id].node),target=graph.pointAt(node);
     return Math.hypot(source.x-target.x,source.y-target.y)<=64;
   };
   const together=(x,y,d=1)=>active(x)&&active(y)&&combatRange(positions[x].node,positions[y].node,d);
   const inGankRange=(x,y)=>active(x)&&active(y)&&
     combatRange(positions[x].node,positions[y].node,2);
   if(!active(f.actorId))errs.push('Actor muerto en evento: '+f.action);
   if((f.action==='gank'||f.action==='gank_avoided')&&f.plannedGankVersion===1){
    const starter=positions[f.initiatorId];
    if(!starter||starter.intent!=='gank_setup'||starter.lane!==f.lane)
      errs.push('Gank sin plan de jungla correspondiente: '+e.minute);
   }
   // Modern combat facts are tied to the recorded positions of every target.
   if(f.combatVersion===1){
    const actor=positions[f.actorId];
    if(!actor||!active(f.actorId)||actor.node!==f.actorNode)
     errs.push('Ataque con actor ausente o movido: '+e.minute);
    for(const hit of f.impacts||[]){
     const p=positions[hit.id];
     if(!p||!active(hit.id)||p.teamId===team||p.node!==hit.node||
        !actor||!core.Encounters.hitRange(actor,p,f.mode,f.lane))
       errs.push('Daño imposible desde otro carril: '+e.minute+' / '+hit.id);
    }
   }
   if(f.action==='gank'){
    const victim=f.victimIds[0];
    const iNode=positions[f.initiatorId]?.node,vNode=positions[victim]?.node;
    if(!inGankRange(f.initiatorId,victim)||!inGankRange(f.actorId,victim)||
       !isLaneNode(vNode,f.lane))
     errs.push('Gank imposible: jungla lejos o víctima fuera de carril, minuto '+e.minute);
    if(f.initiatorNode!==iNode||f.victimNode!==vNode||
       !iNode||f.route!==gankApproach(iNode,f.lane))
     errs.push('Ruta de gank falsificada: '+e.minute);
   }else if(f.action==='gank_avoided'){
    const iNode=positions[f.initiatorId]?.node,vNode=positions[f.targetId]?.node;
    if(!inGankRange(f.initiatorId,f.targetId)||!isLaneNode(vNode,f.lane))
     errs.push('Gank fallido desde posición imposible: '+e.minute);
    if(f.actorId!==f.initiatorId||f.initiatorNode!==iNode||
       f.targetNode!==vNode||!iNode||f.route!==gankApproach(iNode,f.lane))
     errs.push('Datos de emboscada fallida falsificados: '+e.minute);
   }else if(f.action==='skirmish'){
    const target=positions[f.targetId],actor=positions[f.actorId];
    const inZone=id=>near(id,f.zone,3)||
      (active(id)&&f.zone&&graph.nodes[f.zone]&&
       Math.hypot(graph.pointAt(positions[id].node).x-graph.pointAt(f.zone).x,
                  graph.pointAt(positions[id].node).y-graph.pointAt(f.zone).y)<=99);
    if(!target?.alive||!actor?.alive||!['dragon_pit','baron_pit'].includes(f.zone)||
       !inZone(f.targetId)||!inZone(f.actorId))
      errs.push('Escaramuza sin jugadores en el objetivo: '+e.minute);
    let direct=false;
    for(const id of f.participantIds||[]){
     if(!active(id)||positions[id]?.teamId!==team||!inZone(id)||
        !positions[f.targetId]||!combatRange(positions[id].node,target.node,3)&&
        (Math.hypot(graph.pointAt(positions[id].node).x-graph.pointAt(target.node).x,
                    graph.pointAt(positions[id].node).y-graph.pointAt(target.node).y)>112))
       errs.push('Atacante de escaramuza demasiado lejos: '+e.minute);
     if(positions[id]&&target&&combatRange(positions[id].node,target.node,3))direct=true;
    }
    if(!direct||!actor||!target||!combatRange(actor.node,target.node,3))
     errs.push('Autor de escaramuza fuera de rango de golpe: '+e.minute);
   }else if(f.action==='plate'||f.action==='tower_damage'){
    const node=towerNode(other===match.fixture.a?'blue':'red',f.lane,f.stage);
    if(!near(f.actorId,node,1))
      errs.push('Placa cobrada desde otra zona: '+e.minute);
    for(const id of f.participantIds||[])
     if(!near(id,node,1))errs.push('Torre o placa con participante ausente: '+id);
    if((f.action==='tower_damage'||f.towerVersion===1))for(const id of f.defenderIds||[])
     if(!near(id,node,1)||positions[id]?.teamId!==other)
      errs.push('Torre con defensor ausente: '+id);
   }else if(f.action==='teamfight'){
    for(const id of f.victimIds)if(!together(f.actorId,id,2))
      errs.push('Teamfight desde otra zona: '+e.minute+' / '+id);
   }else if(f.action==='tower'){
    const target=towerNode(other===match.fixture.a?'blue':'red',f.lane,f.stage);
    if(f.soloSplitpush){
     const actor=positions[f.actorId];
     if(!actor||!['splitpush','counterpush'].includes(actor.intent)||
        actor.lane!==f.lane||(f.participantIds||[]).length!==1||
        typeof f.wave!=='number'||f.wave<1.45)
      errs.push('Splitpush sin oleada real y especialista en el carril: '+e.minute);
     // A physically nearby enemy who is already retreating cannot contest
     // tower damage. Match the live event eligibility filter exactly.
     const nearbyDefenders=Object.keys(positions).filter(id=>
       positions[id].teamId===other&&positions[id].intent!=='retreat'&&
       active(id)&&near(id,target,1));
     if(nearbyDefenders.length)
      errs.push('Splitpush solitario declarado con un defensor presente: '+e.minute+
        ' / '+JSON.stringify({team,other,node:target,actor:f.actorId,blockers:
          nearbyDefenders.map(id=>({id,position:positions[id],
            deadUntil:deadUntil[id]||0})),participants:f.participantIds}));
    }
    if(!near(f.actorId,target,1))errs.push('Torre derribada desde otra zona: '+e.minute);
    for(const id of f.participantIds)if(!near(id,target,1))
      errs.push('Participante de torre ausente: '+id);
   }else if(f.action==='dragon'||f.action==='baron'){
    const node=f.action==='dragon'?'dragon_pit':'baron_pit';
    for(const id of f.participantIds)if(!near(id,node,1))
      errs.push('Participante de objetivo ausente: '+id);
    if(f.stolen&&(!near(f.actorId,node,1)||f.actorId!==f.smiteBy))
      errs.push('Robo sin jungla presente.');
   }else if(f.action==='nexus'||f.action==='nexus_damage'){
    const node=(other===match.fixture.a?'blue':'red')+'_nexus';
    if(!near(f.actorId,node,1))errs.push('Nexo atacado sin autor presente.');
    const attackers=Object.keys(positions).filter(id=>positions[id].teamId===team&&near(id,node,1));
    if(attackers.length<2)errs.push('Nexo atacado sin asedio de dos atacantes.');
    for(const id of f.participantIds||[])
      if(!near(id,node,1))errs.push('Nexo atacado por jugador ausente: '+id);
    for(const id of f.defenderIds||[])
      if(!near(id,node,1)||positions[id]?.teamId!==other)
        errs.push('Defensor del Nexo inexistente o fuera de rango: '+id);
   }
   if(f.action==='gank'||f.action==='teamfight'||
      (f.action==='lane_trade'&&f.outcome==='kill')||
      (f.action==='skirmish'&&f.outcome==='kill'))
    for(const id of f.victimIds)deadUntil[id]=e.minute+(e.minute<16?2:e.minute<29?3:4);
  }
  for(const id of agentIds){
   const p=nav.after[id],v=(deadUntil[id]||0)<=frame.minute;
   if(p.alive!==v)errs.push('Snapshot después de combate incorrecto: '+id);
   if(!v&&p.node!==(p.teamId===match.fixture.a?'blue':'red')+'_fountain')
    errs.push('Víctima no regresó a fuente: '+id);
  }
  prior=nav;
 }
 return errs;
}
core.Navigation=Object.freeze({links,adjacency,path,hops,adjacent,nearby,combatRange,isLaneNode,gankApproach,
 jungleAllowed,gankPlan,jungleGoal,
 towerNode,siegeOpportunities,determineSiege,createNavigation,teamAgents,getAgent,at,participants,engagement,forceRetreat,
 gankPlanForLane,
 advance,snapshot,nexusOpportunity,nexusSiegeDamage,auditNavigation});
})(globalThis);
