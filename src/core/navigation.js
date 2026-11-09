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
   sideLane:null,siegeChecked:0,siegeUntil:0,minute:0,
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
function determineSiege(nav,worldState,t){
 if(nav.siegeChecked===t)return;
 nav.siegeChecked=t;
 if(t<30)return;
 // No global minute-36 order. Economic advantage and committed waves
 // trigger a reversible siege. Long games get an opportunity to break a
 // stalemate, but the leading team is still chosen by current game state.
 const score=id=>worldState.gold[id]+worldState.towers[id]*700+
   worldState.kills[id]*280+worldState.barons[id]*450;
 const delta=score(nav.a)-score(nav.b);
 const advantage=Math.abs(delta);
 if(!nav.siegeTeam&&t<44&&advantage<1100)return;
 const proposed=advantage<100?
   (seedHash(nav.seed,'siege',Math.floor(t/8))%2?nav.a:nav.b):
   delta>0?nav.a:nav.b;
 if(nav.siegeTeam&&t<(nav.siegeUntil||0))return;
 if(nav.siegeTeam&&t>=60)return; // preserve a long enough final push
 // The losing side can seize the initiative if its comeback actually
 // overtakes the opponent; do not ping-pong after tiny market fluctuations.
 if(nav.siegeTeam&&nav.siegeTeam!==proposed&&advantage<1600)return;
 nav.siegeTeam=proposed;
 nav.siegeLane=siegeLane(nav,worldState,proposed);
 nav.sideLane=secondaryLane(nav,worldState,proposed,nav.siegeLane);
 nav.siegeUntil=t+8;
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

 // Only actual economic or wave advantage commits an attacking team.
 // Junglers preserve their own corridors until minute 36, after which
 // they can join a coordinated push without teleportation.
 if(t>=24){
  determineSiege(nav,worldState,t);
 }
 if(nav.siegeTeam&&(role!=='JUN'||t>=36)){
  const main=nav.siegeLane,sideLane=nav.sideLane||'TOP';
  const sideRole=sideLane==='TOP'?'TOP':'MID';
  if(team===nav.siegeTeam){
   // A solo-laner can threaten a second line, but never teleport there:
   // their regular path is followed one edge per minute.
   if(role===sideRole&&worldState.lanes[foe][sideLane]<3){
    const stage=worldState.lanes[foe][sideLane]+1;
    return {goal:towerNode(getSide(nav,foe),sideLane,stage),
      intent:'splitpush',lane:sideLane,reason:'secondary_wave_pressure',
      decisionVersion:2};
   }
   const stage=worldState.lanes[foe][main]+1;
   return {goal:stage<=3?towerNode(getSide(nav,foe),main,stage):getSide(nav,foe)+'_nexus',
     intent:'siege',lane:main,reason:'primary_siege',decisionVersion:2};
  }
  if(role===sideRole&&worldState.lanes[foe][sideLane]<3){
   const wave=worldState.waves?.[sideLane];
   const enemyWave=core.LaneEconomy?.pressureFor(
     {teamIds:[nav.a,nav.b],lanes:worldState.waves},foe,sideLane)||0;
   const plateThreat=wave?.plates?.[team]?.[worldState.lanes[team][sideLane]]||0;
   // A defender responds to witnessed sustained pressure, not perfect
   // knowledge of an opponent's hidden path.
   const vision=worldState.map?.lanes?.[sideLane]?.vision?.[team]??50;
   const threatened=enemyWave>=1.35||plateThreat>=2&&vision>=58;
   if(threatened){
    const stage=worldState.lanes[team][sideLane]+1;
    return {goal:stage<=3?towerNode(side,sideLane,stage):side+'_nexus',
      intent:'counter_siege',lane:sideLane,reason:'protect_secondary_lane',
      decisionVersion:2};
   }
   const stage=worldState.lanes[foe][sideLane]+1;
   return {goal:towerNode(getSide(nav,foe),sideLane,stage),
     intent:'counterpush',lane:sideLane,reason:'trade_crossmap_pressure',
     decisionVersion:2};
  }
  const stage=worldState.lanes[team][main]+1;
  return {goal:stage<=3?towerNode(side,main,stage):side+'_nexus',
    intent:'defend',lane:main,reason:'defend_main_lane',decisionVersion:2};
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
 if(agent.role==='JUN'&&minute<36&&!jungleAllowed(side,goal))
  throw Error('Jungla no puede retirarse por un carril');
 const allowed=agent.role==='JUN'&&minute<36?node=>jungleAllowed(side,node):null;
 const steps=path(agent.node,goal,allowed);
 agent.retreatGoal=goal;
 agent.retreatUntil=minute+Math.max(4,steps.length+2);
 agent.goal=goal;agent.intent='retreat';
 return true;
}
function advance(nav,t,dead,worldState,context=null){
 if(t<=nav.minute)throw Error('Navigation minutes must advance');
 nav.minute=t;
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
  const safe=agent.role==='JUN'&&t<36 ?node=>jungleAllowed(side,node):null;
  agent.route=path(agent.node,agent.goal,safe);
  // One edge a minute; no position jumps to satisfy an event later.
  if(agent.route.length>1)agent.node=agent.route[1];
 }
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
 for(const frame of frames){
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
   if(before.role==='JUN'&&before.alive&&frame.minute<36){
    const side=before.teamId===match.fixture.a?'blue':'red';
    if(!jungleAllowed(side,before.node))
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
    if(f.action==='tower_damage')for(const id of f.defenderIds||[])
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
 towerNode,createNavigation,teamAgents,getAgent,at,participants,engagement,forceRetreat,
 gankPlanForLane,
 advance,snapshot,auditNavigation});
})(globalThis);
