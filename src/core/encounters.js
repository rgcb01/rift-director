/* Alpha 0.7.4 — causal contested-objective skirmishes.
 * Self-contained, deterministic, no DOM and no extra gameplay RNG.
 * Read positions first; decisions are grounded in health, distance, numbers,
 * skill, objectives and reproducible seed. A 2v1 never silently persists.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const graph=core.MiniGraph;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function hash(...parts){
 let x=2166136261>>>0;
 for(const part of parts)for(const c of String(part)){
  x^=c.charCodeAt(0);x=Math.imul(x,16777619)>>>0;
 }
 return x>>>0;
}
function create(players){
 return Object.fromEntries(players.map(p=>[p.id,100]));
}
function recover(health,nav,dead,minute){
 for(const agent of Object.values(nav.agents)){
  if((dead[agent.id]||0)>minute){health[agent.id]=0;continue;}
  // A professional leaving the death timer returns at full life.
  if(health[agent.id]===0||health[agent.id]===undefined){
   health[agent.id]=100;continue;
  }
  // The healing zone is the fountain, never the contested Nexus.
  // In particular, attackers at the ENEMY Nexus cannot regenerate as if
  // they were shopping safely in their own base.
  const side=agent.teamId===nav.a?'blue':'red';
  const inFountain=agent.node===side+'_fountain';
  const retreat=agent.intent==='retreat';
  health[agent.id]=clamp(health[agent.id]+(inFountain?35:retreat?17:6),1,100);
 }
}
const point=node=>graph.pointAt(node);
const distance=(a,b)=>Math.hypot(point(a).x-point(b).x,point(a).y-point(b).y);
const nearZone=(agent,zone)=>distance(agent.node,zone)<=99;
const threat=(nav,a,b)=>{
 if(!a?.alive||!b?.alive)return false;
 return core.Navigation.hops(a.node,b.node)<=3&&distance(a.node,b.node)<=112;
};
const reachable=(nav,a,b)=>core.Navigation.combatRange(a.node,b.node,3);
function locate(nav,dead,minute,zone){
 const result={[nav.a]:[],[nav.b]:[]};
 for(const p of Object.values(nav.agents)){
  if(!p.alive||(dead[p.id]||0)>minute||!nearZone(p,zone))continue;
  // Characters already fleeing should not be treated as fighters or
  // defenders of an objective while still on the first graph edge.
  if(p.intent==='retreat')continue;
  result[p.teamId].push(p);
 }
 return result;
}
function power(player,powerState=null,kind='attack'){
 const a=player?.a||{},b=player?.beh||{};
 const intrinsic=(a.mech||50)*.45+(a.macro||50)*.19+
   (a.comm||50)*.14+(a.vision||50)*.09+(b.agg||50)*.08+(b.team||50)*.05;
 return intrinsic+(core.PowerEconomy?.boost(powerState,player?.id,kind)||0);
}
function candidate(nav,health,players,side,enemy,zone,powerState=null){
 // Find a defender with at least two threatening opponents, including
 // at least one actually within striking range. No invisible long-range kill.
 const candidates=[];
 for(const defender of enemy){
  const attackers=side.filter(a=>threat(nav,a,defender));
  const striking=attackers.filter(a=>reachable(nav,a,defender));
  const nearbyAllies=enemy.filter(a=>a.id!==defender.id&&threat(nav,a,defender));
  if(attackers.length<2||!striking.length)continue;
  const groupPower=attackers.reduce((sum,a)=>sum+power(players[a.id],powerState,'attack'),0);
  const defenderPower=power(players[defender.id],powerState,'defense');
  const edge=attackers.length-nearbyAllies.length-1;
  if(edge<=0)continue;
  candidates.push({defender,attackers,striking,nearbyAllies,
   score:edge*100+groupPower/attackers.length-defenderPower+ (100-health[defender.id])*.2});
 }
 return candidates.sort((a,b)=>b.score-a.score||a.defender.id.localeCompare(b.defender.id))[0]||null;
}
function resolve({nav,dead,minute,zone,players,health,seed,previous={},powerState=null}){
 if(!['dragon_pit','baron_pit'].includes(zone))return null;
 if(minute-(previous[zone]??-20)<4)return null;
 const groups=locate(nav,dead,minute,zone);
 const first=candidate(nav,health,players,groups[nav.a],groups[nav.b],zone,powerState);
 const second=candidate(nav,health,players,groups[nav.b],groups[nav.a],zone,powerState);
 const chosen=!first?second:!second?first:
   first.score===second.score?(hash(seed,zone,minute)%2?first:second):
   first.score>second.score?first:second;
 if(!chosen)return null;
 const {defender,attackers,striking,nearbyAllies}=chosen;
 const lead=attackers[0].teamId,player=players[defender.id];
 const attackBySkill=members=>members.slice().sort((a,b)=>
    power(players[b.id],powerState,'attack')-power(players[a.id],powerState,'attack')||a.id.localeCompare(b.id));
 // Damage can benefit from nearby support; the finisher MUST be close enough
 // to strike personally, not merely the highest-rated player in the zone.
 const killer=attackBySkill(striking)[0];
 const attackersBySkill=[killer,...attackBySkill(attackers.filter(a=>a.id!==killer.id))];
 const quality=attackers.reduce((n,p)=>n+power(players[p.id],powerState,'attack'),0)/attackers.length;
 const defence=power(player,powerState,'defense');
 const before=health[defender.id]??100;
 // More attackers and weak/low-health defenders suffer more pressure.
 // A lucky burst can kill, but a fresh, vigilant support can disengage.
 const burst=(hash(seed,minute,zone,defender.id,'burst')%1000)/1000;
 const rawDamage=39+attackers.length*12+
   (quality-defence)*.3+(burst>.84?27:0)+burst*13;
 const mitigation=core.ChampionScaling?.mitigation(
   powerState?.entries?.[killer.id],powerState?.entries?.[defender.id],
   [...(core.PowerEconomy?.ITEM_CATALOG||[]),...(core.PowerEconomy?.COMPONENT_CATALOG||[])])??1;
 const damage=clamp(Math.round(rawDamage*mitigation),18,120);
 const after=Math.max(0,before-damage);
 const killed=after<=0;
 const side=defender.teamId===nav.a?'blue':'red';
 const retreatGoal=defender.role==='JUN'?side+'_jungle_lower':
   defender.role==='SUP'||defender.role==='ADC'?side+'_bot_front':
   side+'_nexus';
 const participants=attackersBySkill.map(x=>x.id);
 return {action:'skirmish',outcome:killed?'kill':'retreat',
  zone,node:zone,teamId:lead,actorId:killer.id,
  participantIds:participants,targetId:defender.id,
  victimIds:killed?[defender.id]:[],assistIds:killed?participants.slice(1,3):[],
  opponentIds:nearbyAllies.map(x=>x.id),
  attackerCount:attackers.length,defenderCount:1+nearbyAllies.length,
  damage,mitigation,hpBefore:before,hpAfter:after,retreatGoal,
  healthVersion:1};
}
// Alpha 0.7.5 — One damage and retreat contract for lanes, ganks and fights.
function laneRange(a,b,lane){
 if(!a?.alive||!b?.alive||!core.Navigation.isLaneNode(a.node,lane)||
   !core.Navigation.isLaneNode(b.node,lane))return false;
 return core.Navigation.hops(a.node,b.node)<=3&&distance(a.node,b.node)<=112;
}
function hitRange(a,b,mode,lane){
 return mode==='lane'?laneRange(a,b,lane):
   core.Navigation.combatRange(a.node,b.node,2);
}
function retreatDestination(nav,agent,minute){
 const side=agent.teamId===nav.a?'blue':'red';
 if(agent.role==='JUN')return minute<36?side+'_jungle_lower':side+'_nexus';
 if(minute>=36)return side+'_nexus';
 const lane=agent.role==='ADC'||agent.role==='SUP'?'bot':agent.role.toLowerCase();
 return side+'_'+lane+'_inner';
}
// A genuine group fight needs opposing formations, not merely a pick
// labelled "teamfight". Every member must be alive, close to the arena
// and able to reach at least one member of the opposite group.
function groupOpportunity({nav,dead,minute,players,health,seed,world,powerState=null,previous=-10}){
 if(minute-previous<3)return null;
 const zones=[];
 if(minute>=world.nextDragon)zones.push('dragon_pit');
 if(minute>=world.nextBaron)zones.push('baron_pit');
 zones.push('mid_center');
 const choices=[];
 for(const zone of zones){
  const groups={};
  for(const team of [nav.a,nav.b])groups[team]=Object.values(nav.agents).filter(p=>
   p.teamId===team&&p.alive&&(dead[p.id]||0)<=minute&&
   p.intent!=='retreat'&&(health[p.id]??0)>=34&&
   core.Navigation.hops(p.node,zone)<=2&&nearZone(p,zone));
  const first=groups[nav.a],second=groups[nav.b];
  const a=first.filter(p=>second.some(q=>hitRange(p,q,'teamfight')));
  const b=second.filter(p=>first.some(q=>hitRange(p,q,'teamfight')));
  if(a.length<3||b.length<3)continue;
  const strength=ps=>ps.reduce((n,p)=>n+
   power(players[p.id],powerState,'attack')*.65+(health[p.id]??100)*.35,0);
  const edge=strength(a)-strength(b);
  const initiative=edge+(hash(seed,minute,zone,'group-initiative')%31-15);
  const firstTeam=initiative>=0?nav.a:nav.b;
  choices.push({zone,firstTeam,groups:{[nav.a]:a.map(p=>p.id),
   [nav.b]:b.map(p=>p.id)},score:a.length+b.length+(zone==='mid_center'?0:2)});
 }
 return choices.sort((x,y)=>y.score-x.score||x.zone.localeCompare(y.zone))[0]||null;
}
function resolveCombat({nav,dead,minute,players,health,seed,mode,teamId,attackerIds,targetIds,lane=null,powerState=null,groupExchange=false}){
 if(!['lane','gank','teamfight'].includes(mode)||![nav.a,nav.b].includes(teamId))
  throw Error('Invalid combat mode/team');
 const get=id=>nav.agents[id],alive=id=>get(id)?.alive&&
   (dead[id]||0)<=minute&&get(id).intent!=='retreat';
 const attackers=[...new Set(attackerIds||[])].filter(id=>alive(id)&&get(id).teamId===teamId)
   .map(get);
 const defenders=[...new Set(targetIds||[])].filter(id=>alive(id)&&get(id).teamId!==teamId)
   .map(get);
 if(!attackers.length||!defenders.length)return null;
 const targets=defenders.filter(d=>attackers.some(a=>hitRange(a,d,mode,lane)));
 if(!targets.length)return null;
 const viable=attackers.filter(a=>targets.some(d=>hitRange(a,d,mode,lane)));
 const rank=(a,b)=>power(players[b.id],powerState,'attack')-power(players[a.id],powerState,'attack')||a.id.localeCompare(b.id);
 const leader=mode==='gank'&&viable.some(a=>a.id===attackerIds[0])?
   viable.find(a=>a.id===attackerIds[0]):viable.sort(rank)[0];
 // In teamfight mode one author can deal damage to several nearby targets.
 // Nonlethal damage is retained and replayed, not turned into fake kills.
 const chosen=(mode==='teamfight'?targets.filter(d=>hitRange(leader,d,mode,lane))
   .sort((a,b)=>(health[a.id]??100)-(health[b.id]??100)||a.id.localeCompare(b.id)).slice(0,3)
   :targets.sort((a,b)=>(health[a.id]??100)-(health[b.id]??100)||a.id.localeCompare(b.id)).slice(0,1));
 if(!chosen.length)return null;
 const comrades=attackers.filter(a=>chosen.some(d=>
   threat(null,a,d)||hitRange(a,d,mode,lane))).sort(rank);
 const participants=[leader.id,...comrades.filter(a=>a.id!==leader.id).map(a=>a.id)];
 const impacts=[];
 for(const target of chosen){
  if(!hitRange(leader,target,mode,lane))continue;
  const allies=attackers.filter(a=>threat(null,a,target)||hitRange(a,target,mode,lane));
  const before=health[target.id]??100;
  const variance=(hash(seed,minute,mode,leader.id,target.id)%1000)/1000;
  const base={lane:21,gank:52,teamfight:42}[mode];
  // In a group engagement, enemies can cover one another. Equal-sized
  // groups exchange damage rather than treating each rival as an isolated
  // 3v1. Picks, ganks and structure contests retain their existing rules.
  const outnumber=clamp(groupExchange?allies.length-defenders.length:allies.length-1,0,3);
  const delta=power(players[leader.id],powerState,'attack')-power(players[target.id],powerState,'defense');
  const burst=variance>.88?(mode==='lane'?12:26):0;
  const rawDamage=base+outnumber*(mode==='lane'?8:19)+
    delta*.28+variance*16+burst;
  const mitigation=core.ChampionScaling?.mitigation(
    powerState?.entries?.[leader.id],powerState?.entries?.[target.id],
    [...(core.PowerEconomy?.ITEM_CATALOG||[]),...(core.PowerEconomy?.COMPONENT_CATALOG||[])])??1;
  const damage=clamp(Math.round(rawDamage*mitigation),12,120);
  const after=Math.max(0,before-damage);
  const retreat=after>0&&(after<48||(allies.length>defenders.length&&after<72));
  impacts.push({id:target.id,node:target.node,hpBefore:before,hpAfter:after,
   damage,mitigation,retreat,retreatGoal:retreat?retreatDestination(nav,target,minute):null});
 }
 if(!impacts.length)return null;
 const victims=impacts.filter(p=>p.hpAfter===0).map(p=>p.id);
 const outcome=victims.length?'kill':impacts.some(p=>p.retreat)?'retreat':'trade';
 return {
  combatVersion:1,mode,outcome,actorId:leader.id,actorNode:leader.node,
  teamId,participantIds:participants,assistIds:victims.length?
   participants.filter(id=>id!==leader.id).slice(0,2):[],
  victimIds:victims,impacts,targetId:impacts[0].id,targetNode:impacts[0].node,
  attackerCount:participants.length,defenderCount:defenders.length,
  ...(lane?{lane}:{}),
 };
}
function audit(match,world){
 const errs=[],players=Object.fromEntries(world.players.map(x=>[x.id,x]));
 const groupStarts=new Map();
 if(!match.moments?.length)return errs; // v2 pre-0.7 replay fallback
 for(let index=0;index<match.events.length;index++){
  const event=match.events[index],f=event.facts;
  if(f?.combatVersion===1){
   const moment=match.moments[index],positions=moment?.navigation?.before,after=moment?.navigation?.after;
   if(!positions||!after||!moment?.health){errs.push('Combate sin fotograma: '+index);continue;}
   const actor=positions[f.actorId],mode=f.mode;
   if(f.groupFight){
    const g=f.groupFight,teams=[match.fixture.a,match.fixture.b];
    const prior=match.moments[index-1];
    const live=prior?.minute===event.minute?prior.navigation.after:positions;
    const group=g.groups?.[event.teamId]||[];
    const foe=teams.find(id=>id!==event.teamId);
    const enemies=g.groups?.[foe]||[];
    const valid=g.version===1&&g.id===event.minute+':'+g.zone&&
     ['dragon_pit','baron_pit','mid_center'].includes(g.zone)&&
     teams.includes(g.firstTeam)&&mode==='teamfight'&&
     [1,2].includes(g.round)&&group.length>=3&&enemies.length>=3&&
     new Set([...group,...enemies]).size===group.length+enemies.length&&
     group.every(id=>positions[id]?.teamId===event.teamId)&&
     enemies.every(id=>positions[id]?.teamId===foe)&&
     (f.participantIds||[]).every(id=>group.includes(id)&&live[id]?.alive&&
      live[id].intent!=='retreat')&&
     (f.impacts||[]).every(hit=>enemies.includes(hit.id)&&live[hit.id]?.alive&&
      live[hit.id].intent!=='retreat');
    if(!valid){errs.push('Teamfight sin formación o respuesta verificable: '+index);}
    if(g.round===1){
     const both=[...group,...enemies];
     if(groupStarts.has(g.id)||g.firstTeam!==event.teamId||
        both.some(id=>!live[id]?.alive||live[id].intent==='retreat'||
         !nearZone(live[id],g.zone)||core.Navigation.hops(live[id].node,g.zone)>2)||
        !group.every(id=>enemies.some(other=>hitRange(live[id],live[other],'teamfight')))||
        !enemies.every(id=>group.some(other=>hitRange(live[id],live[other],'teamfight'))))
      errs.push('Teamfight inicial sin tres rivales físicos por lado: '+index);
     groupStarts.set(g.id,{...g,responded:false});
    }else{
     const start=groupStarts.get(g.id);
     if(!start||start.responded||event.teamId===start.firstTeam||
        JSON.stringify(g.groups)!==JSON.stringify(start.groups))
      errs.push('Respuesta de teamfight sin intercambio previo: '+index);
     if(start)start.responded=true;
    }
   }
   if(!['lane','gank','teamfight'].includes(mode)||!actor?.alive||
      actor.node!==f.actorNode||event.teamId!==actor.teamId)
     errs.push('Iniciador del combate falso: '+index);
   if(!Array.isArray(f.participantIds)||!f.participantIds.includes(f.actorId)||
      new Set(f.participantIds).size!==f.participantIds.length||
      !Array.isArray(f.impacts)||!f.impacts.length||f.combatVersion!==1)
     errs.push('Participantes o impactos de combate incompletos: '+index);
   const impacts=f.impacts||[],kills=[];
   for(const p of impacts){
    const target=positions[p.id];
    if(!target?.alive||target.node!==p.node||target.teamId===event.teamId||
       !actor||!hitRange(actor,target,mode,f.lane))
      errs.push('Impacto sin rival en alcance: '+index+' / '+p.id);
    if(!Number.isSafeInteger(p.hpBefore)||p.hpBefore<1||p.hpBefore>100||
       !Number.isSafeInteger(p.damage)||p.damage<12||p.damage>120||
       p.hpAfter!==Math.max(0,p.hpBefore-p.damage))
      errs.push('Daño incompatible con HP: '+index+' / '+p.id);
    if(moment.health[p.id]!==p.hpAfter||
       moment.minimap?.players?.[p.id]?.hp!==p.hpAfter)
      errs.push('Vida histórica no coincide con el daño: '+index+' / '+p.id);
    if(p.hpAfter===0){
     kills.push(p.id);
     if(after[p.id]?.alive!==false)errs.push('Muerto aún aparece vivo: '+index);
    }else if(p.retreat){
     if(!p.retreatGoal||after[p.id]?.intent!=='retreat'||
        !core.Navigation.adjacency[p.retreatGoal])
      errs.push('Herido no recibió ruta de retirada: '+index);
    }else if(p.retreatGoal)errs.push('Retirada sin necesidad: '+index);
   }
   const predicted=kills.length?'kill':impacts.some(x=>x.retreat)?'retreat':'trade';
   if(f.outcome!==predicted||JSON.stringify(kills)!==JSON.stringify(f.victimIds)||
      f.targetId!==impacts[0]?.id||f.targetNode!==impacts[0]?.node)
    errs.push('Eliminación o resultado sin fundamento: '+index);
   for(const id of f.participantIds||[]){
    const agent=positions[id];
    if(!agent?.alive||agent.teamId!==event.teamId||
       !impacts.some(hit=>threat(core.Navigation,agent,positions[hit.id])||
           hitRange(agent,positions[hit.id],mode,f.lane)))
     errs.push('Ayudante fuera de alcance: '+index+' / '+id);
   }
   if(new Set(f.assistIds||[]).size!==(f.assistIds||[]).length||
      (f.assistIds||[]).some(id=>id===f.actorId||!f.participantIds.includes(id))||
      (!kills.length&&(f.assistIds||[]).length))
     errs.push('Asistencia inventada en combate: '+index);
   continue;
  }
  if(f?.action!=='skirmish')continue;
  const moment=match.moments[index],pre=moment?.navigation?.before;
  if(!pre||!moment.health){errs.push('Escaramuza sin instantánea: '+index);continue;}
  const attacker=pre[f.actorId],defender=pre[f.targetId];
  if(!attacker?.alive||!defender?.alive||attacker.teamId===defender.teamId||
     attacker.teamId!==event.teamId)errs.push('Escaramuza sin rivales vivos: '+index);
  if(!['baron_pit','dragon_pit'].includes(f.zone)||
     f.node!==f.zone||f.healthVersion!==1)errs.push('Zona de escaramuza inválida: '+index);
  if(!Array.isArray(f.participantIds)||f.participantIds.length<2||
     new Set(f.participantIds).size!==f.participantIds.length||
     !f.participantIds.includes(f.actorId))errs.push('Dos atacantes no confirmados: '+index);
  let direct=false;
  for(const id of f.participantIds||[]){
   const p=pre[id];
   if(!p?.alive||p.teamId!==attacker?.teamId||!nearZone(p,f.zone)||
      !threat(core.Navigation,p,defender))errs.push('Atacante fuera de alcance: '+index);
   if(p&&defender&&reachable(core.Navigation,p,defender))direct=true;
  }
  if(!direct||!attacker||!defender||!reachable(core.Navigation,attacker,defender))
   errs.push('El autor de la escaramuza no estaba a distancia de golpe: '+index);
  if(!defender||!nearZone(defender,f.zone))errs.push('Objetivo no estaba en el foso: '+index);
  if(!Number.isSafeInteger(f.damage)||f.damage<18||f.damage>120||
     !Number.isSafeInteger(f.hpBefore)||f.hpBefore<1||f.hpBefore>100||
     f.hpAfter!==Math.max(0,f.hpBefore-f.damage))errs.push('Daño o vida incoherente: '+index);
  if(moment.health[f.targetId]!== (f.outcome==='kill'?0:f.hpAfter))
   errs.push('Vida después de la escaramuza falsificada: '+index);
  if(f.outcome==='kill'){
   if(f.hpAfter!==0||f.victimIds?.length!==1||f.victimIds[0]!==f.targetId||
      moment.navigation.after[f.targetId]?.alive!==false)
     errs.push('Baja no respaldada por daño: '+index);
  }else if(f.outcome==='retreat'){
   if(f.hpAfter<=0||f.victimIds?.length||moment.navigation.after[f.targetId]?.intent!=='retreat')
     errs.push('Retirada sin superviviente: '+index);
  }else errs.push('Desenlace de escaramuza inválido: '+index);
  if(!players[f.actorId]||!players[f.targetId])errs.push('Jugador ajeno al partido: '+index);
 }
 return errs;
}
core.Encounters=Object.freeze({create,recover,locate,resolve,groupOpportunity,resolveCombat,laneRange,hitRange,retreatDestination,power,distance,nearZone,threat,audit});
})(globalThis);
