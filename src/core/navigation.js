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
      (role==='ADC'||role==='SUP'?'bot':role.toLowerCase())+'_outer';
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
 return Boolean(agent?.alive && nearby(agent.node,node,maxHops));
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
 const laneRole=role==='ADC'||role==='SUP'?'BOT':role;
 if(t>=36){
  determineSiege(nav,worldState);
  if(team===nav.siegeTeam){
   const lane=nav.siegeLane;
   const stage=worldState.lanes[foe][lane]+1;
   return {goal:stage<=3?towerNode(getSide(nav,foe),lane,stage):getSide(nav,foe)+'_nexus',intent:'siege'};
  }
  const target=nav.siegeLane,stage=worldState.lanes[team][target]+1;
  return {goal:stage<=3?towerNode(side,target,stage):side+'_nexus',intent:'defend'};
 }
 if(t<6){
  if(role==='JUN')return {goal:side+(t<3?'_jungle_upper':'_jungle_lower'),intent:'farm_jungle'};
  return {goal:side+'_'+laneRole.toLowerCase()+'_outer',intent:'lane'};
 }
 if(t<13){
  if(role==='JUN'){
   const route=seedHash(nav.seed,team,'first-gank')%3;
   const lane=route===0?'TOP':route===1?'BOT':'MID';
   return {goal:side+'_'+lane.toLowerCase()+'_outer',intent:'gank_setup'};
  }
  if(role==='SUP'&&t>=10)return {goal:'dragon_pit',intent:'objective'};
  if(role==='ADC')return {goal:t<9?side+'_bot_outer':'bot_center',intent:'push'};
  if(role==='TOP')return {goal:'top_center',intent:'push'};
  return {goal:'mid_center',intent:'push'};
 }
 if(t<25){
  const objective=t>=20&&t%9<5?'baron_pit':t%10<5?'dragon_pit':null;
  if(objective&&['JUN','SUP','MID'].includes(role))return {goal:objective,intent:'objective'};
  if(role==='TOP')return {goal:'top_center',intent:'splitpush'};
  if(role==='ADC'||role==='SUP')return {goal:'bot_center',intent:'push'};
  return {goal:'mid_center',intent:'rotation'};
 }
 if(t<36){
  const objective=t%11<5?'baron_pit':null;
  if(objective&&['JUN','SUP','MID'].includes(role))return {goal:objective,intent:'objective'};
  if(role==='TOP'&&seedHash(nav.seed,team,'side')%2===0)
   return {goal:'top_center',intent:'splitpush'};
  return {goal:'mid_center',intent:'group'};
 }
 return {goal:'mid_center',intent:'group'};
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
   const near=(id,node,d=1)=>active(id)&&nearby(positions[id].node,node,d);
   const together=(x,y,d=1)=>active(x)&&active(y)&&nearby(positions[x].node,positions[y].node,d);
   if(!active(f.actorId))errs.push('Actor muerto en evento: '+f.action);
   if(f.action==='gank'){
    const victim=f.victimIds[0];
    if(!together(f.initiatorId,victim,2)||!together(f.actorId,victim,2))
     errs.push('Gank sin jungla o asesino presente: '+e.minute);
    if(f.initiatorNode!==positions[f.initiatorId]?.node)
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
core.Navigation=Object.freeze({links,adjacency,path,hops,adjacent,nearby,
 towerNode,createNavigation,teamAgents,getAgent,at,participants,engagement,
 advance,snapshot,auditNavigation});
})(globalThis);
