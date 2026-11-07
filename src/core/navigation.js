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
function path(from,to){
 if(!adjacency[from]||!adjacency[to])throw Error('Unknown navigation node: '+from+' / '+to);
 if(from===to)return [from];
 const previous=new Map([[from,null]]),queue=[from];
 for(let i=0;i<queue.length;i++){
  for(const neighbor of adjacency[queue[i]]){
   if(previous.has(neighbor))continue;
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
 return node===l+'_center'||node===l+'_corner'||
        node.startsWith('blue_'+l+'_')||node.startsWith('red_'+l+'_');
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
 return {a,b,agents,teams,seed,siegeTeam:null,siegeLane:null,minute:0};
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
 const our=teamAgents(nav,teamId).filter(a=>a.alive);
 const their=teamAgents(nav,enemy(nav,teamId)).filter(a=>a.alive);
 const candidates=[];
 for(const p of our){
  const foes=their.filter(x=>nearby(p.node,x.node,maxHops));
  if(foes.length) candidates.push({actor:p,foes});
 }
 return candidates.sort((x,y)=>y.foes.length-x.foes.length||x.actor.id.localeCompare(y.actor.id));
}
function siegeLane(nav,worldState){
 const opp=enemy(nav,nav.siegeTeam);
 const lanes=worldState.lanes[opp];
 return [...LANES].sort((x,y)=>lanes[y]-lanes[x]||
   seedHash(nav.seed,nav.siegeTeam,x)%3-seedHash(nav.seed,nav.siegeTeam,y)%3)[0];
}
function determineSiege(nav,worldState){
 if(nav.siegeTeam)return;
 // A tactical commitment: once the late-game siege starts, the trailing club
 // defends its base. It can still contest objectives or win fights in defense.
 const score=id=>worldState.gold[id]+worldState.towers[id]*950+
   worldState.kills[id]*420+worldState.barons[id]*480;
 const delta=score(nav.a)-score(nav.b);
 nav.siegeTeam=Math.abs(delta)<300?(
   seedHash(nav.seed,'siege')%2?nav.a:nav.b):(delta>0?nav.a:nav.b);
 nav.siegeLane=siegeLane(nav,worldState);
}
function chooseGoal(nav,agent,t,worldState){
 const side=getSide(nav,agent.teamId),team=agent.teamId;
 const foe=enemy(nav,team),role=agent.role;
 const anchor=lane=>side+'_'+lane.toLowerCase()+'_front';
 const lead=worldState.gold[team]-worldState.gold[foe];
 const partner=role==='SUP'?teamAgents(nav,team).find(p=>p.role==='ADC'&&p.alive):null;
 const followADC=()=>partner?.goal&&adjacency[partner.goal]?partner.goal:anchor('BOT');

 // Late game: everyone joins a *reachable* siege or base defense.
 // This remains after the lane phase so the game can still finish legally.
 if(t>=36){
  determineSiege(nav,worldState);
  if(team===nav.siegeTeam){
   const lane=nav.siegeLane,stage=worldState.lanes[foe][lane]+1;
   return {goal:stage<=3?towerNode(getSide(nav,foe),lane,stage):getSide(nav,foe)+'_nexus',intent:'siege'};
  }
  const lane=nav.siegeLane,stage=worldState.lanes[team][lane]+1;
  return {goal:stage<=3?towerNode(side,lane,stage):side+'_nexus',intent:'defend'};
 }

 if(role==='JUN'){
  // A jungler does not camp in a lane from minute 6 to 13: a gank is
  // a short planned rotation between jungle clears, followed by a reset.
  // All destinations are existing reachable nodes; advance() still permits
  // only one edge per minute.
  if(t<=2)return {goal:side+'_jungle_upper',intent:'farm_jungle'};
  if(t<=4)return {goal:side+'_jungle_lower',intent:'farm_jungle'};
  if(t<=8){
   const lane=['TOP','MID','BOT'][seedHash(nav.seed,team,'opening-gank')%3];
   return {goal:lane==='TOP'?'top_corner':lane==='BOT'?'bot_corner':anchor('MID'),
     intent:'gank_setup'};
  }
  if(t<=12)return {goal:side+'_jungle_lower',intent:'farm_jungle'};
  if(t<=15){
   const lane=['MID','BOT','TOP'][seedHash(nav.seed,team,'second-gank')%3];
   return {goal:lane==='TOP'?'top_corner':lane==='BOT'?'bot_corner':anchor('MID'),
     intent:'gank_setup'};
  }
  if(t<=19)return {goal:'dragon_pit',intent:'objective_setup'};
  if(t<=23)return {goal:side+'_jungle_upper',intent:'farm_jungle'};
  if(t<=27)return {goal:'baron_pit',intent:'objective_setup'};
  if(t<=32)return {goal:side+'_jungle_lower',intent:'farm_jungle'};
  return {goal:anchor('MID'),intent:'rotation'};
 }

 if(role==='SUP'){
  // During early laning the support must protect the allied ADC.
  // The first roam is a bounded river/dragon window, *not* a permanent
  // march to the objective or to the shared bot corner.
  if(t<=13)return {goal:followADC(),intent:'protect_adc'};
  if(t<=17)return {goal:'lower_river',intent:'ward_roam'};
  if(t<=23)return {goal:followADC(),intent:'protect_adc'};
  if(t<=27)return {goal:anchor('MID'),intent:'rotation'};
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
function advance(nav,t,dead,worldState){
 if(t<=nav.minute)throw Error('Navigation minutes must advance');
 nav.minute=t;
 for(const agent of Object.values(nav.agents)){
  const side=getSide(nav,agent.teamId),fountain=side+'_fountain';
  const wasDead=!agent.alive;
  agent.movedFrom=agent.node;
  agent.alive=(dead[agent.id]||0)<=t;
  if(!agent.alive){
   agent.node=fountain;agent.goal=fountain;agent.intent='dead';agent.route=[fountain];
   continue;
  }
  if(wasDead)agent.node=fountain;
  const plan=chooseGoal(nav,agent,t,worldState);
  agent.goal=plan.goal;agent.intent=plan.intent;
  agent.route=path(agent.node,agent.goal);
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
    from:agent.movedFrom,role:agent.role,teamId:agent.teamId};
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
   const together=(x,y,d=1)=>active(x)&&active(y)&&nearby(positions[x].node,positions[y].node,d);
   const inGankRange=(x,y)=>active(x)&&active(y)&&
     combatRange(positions[x].node,positions[y].node,2);
   if(!active(f.actorId))errs.push('Actor muerto en evento: '+f.action);
   if(f.action==='gank'){
    const victim=f.victimIds[0];
    const iNode=positions[f.initiatorId]?.node,vNode=positions[victim]?.node;
    if(!inGankRange(f.initiatorId,victim)||!inGankRange(f.actorId,victim)||
       !isLaneNode(vNode,f.lane))
     errs.push('Gank imposible: jungla lejos o víctima fuera de carril, minuto '+e.minute);
    if(f.initiatorNode!==iNode||f.victimNode!==vNode||
       !iNode||f.route!==gankApproach(iNode,f.lane))
     errs.push('Ruta de gank falsificada: '+e.minute);
   }else if(f.action==='teamfight'){
    for(const id of f.victimIds)if(!together(f.actorId,id,2))
      errs.push('Teamfight desde otra zona: '+e.minute+' / '+id);
   }else if(f.action==='tower'){
    const target=towerNode(other===match.fixture.a?'blue':'red',f.lane,f.stage);
    if(!near(f.actorId,target,1))errs.push('Torre derribada desde otra zona: '+e.minute);
    for(const id of f.participantIds)if(!near(id,target,1))
      errs.push('Participante de torre ausente: '+id);
   }else if(f.action==='dragon'||f.action==='baron'){
    const node=f.action==='dragon'?'dragon_pit':'baron_pit';
    for(const id of f.participantIds)if(!near(id,node,1))
      errs.push('Participante de objetivo ausente: '+id);
    if(f.stolen&&(!near(f.actorId,node,1)||f.actorId!==f.smiteBy))
      errs.push('Robo sin jungla presente.');
   }else if(f.action==='nexus'){
    const node=(other===match.fixture.a?'blue':'red')+'_nexus';
    if(!near(f.actorId,node,1))errs.push('Nexo destruido sin atacante presente.');
    const attackers=Object.keys(positions).filter(id=>positions[id].teamId===team&&near(id,node,1));
    if(attackers.length<2)errs.push('Nexo destruido sin asedio de dos atacantes.');
   }
   if(f.action==='gank'||f.action==='teamfight')
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
 towerNode,createNavigation,teamAgents,getAgent,at,participants,engagement,
 advance,snapshot,auditNavigation});
})(globalThis);
