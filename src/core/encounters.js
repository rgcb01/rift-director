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
  const nearBase=agent.node.endsWith('_fountain')||agent.node.endsWith('_nexus');
  const retreat=agent.intent==='retreat';
  health[agent.id]=clamp(health[agent.id]+(nearBase?35:retreat?17:6),1,100);
 }
}
const point=node=>graph.pointAt(node);
const distance=(a,b)=>Math.hypot(point(a).x-point(b).x,point(a).y-point(b).y);
const nearZone=(agent,zone)=>distance(agent.node,zone)<=99;
const threat=(nav,a,b)=>{
 if(!a?.alive||!b?.alive)return false;
 return nav.hops(a.node,b.node)<=3&&distance(a.node,b.node)<=112;
};
const reachable=(nav,a,b)=>nav.combatRange(a.node,b.node,3);
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
function power(player){
 const a=player?.a||{},b=player?.beh||{};
 return (a.mech||50)*.45+(a.macro||50)*.19+
   (a.comm||50)*.14+(a.vision||50)*.09+(b.agg||50)*.08+(b.team||50)*.05;
}
function candidate(nav,health,players,side,enemy,zone){
 // Find a defender with at least two threatening opponents, including
 // at least one actually within striking range. No invisible long-range kill.
 const candidates=[];
 for(const defender of enemy){
  const attackers=side.filter(a=>threat(nav,a,defender));
  const striking=attackers.filter(a=>reachable(nav,a,defender));
  const nearbyAllies=enemy.filter(a=>a.id!==defender.id&&threat(nav,a,defender));
  if(attackers.length<2||!striking.length)continue;
  const groupPower=attackers.reduce((sum,a)=>sum+power(players[a.id]),0);
  const defenderPower=power(players[defender.id]);
  const edge=attackers.length-nearbyAllies.length-1;
  if(edge<=0)continue;
  candidates.push({defender,attackers,nearbyAllies,
   score:edge*100+groupPower/attackers.length-defenderPower+ (100-health[defender.id])*.2});
 }
 return candidates.sort((a,b)=>b.score-a.score||a.defender.id.localeCompare(b.defender.id))[0]||null;
}
function resolve({nav,dead,minute,zone,players,health,seed,previous={}}){
 if(!['dragon_pit','baron_pit'].includes(zone))return null;
 if(minute-(previous[zone]??-20)<4)return null;
 const groups=locate(nav,dead,minute,zone);
 const first=candidate(nav,health,players,groups[nav.a],groups[nav.b],zone);
 const second=candidate(nav,health,players,groups[nav.b],groups[nav.a],zone);
 const chosen=!first?second:!second?first:
   first.score===second.score?(hash(seed,zone,minute)%2?first:second):
   first.score>second.score?first:second;
 if(!chosen)return null;
 const {defender,attackers,nearbyAllies}=chosen;
 const lead=attackers[0].teamId,player=players[defender.id];
 const attackersBySkill=attackers.slice().sort((a,b)=>
    power(players[b.id])-power(players[a.id])||a.id.localeCompare(b.id));
 const killer=attackersBySkill[0];
 const quality=attackers.reduce((n,p)=>n+power(players[p.id]),0)/attackers.length;
 const defence=power(player);
 const before=health[defender.id]??100;
 // More attackers and weak/low-health defenders suffer more pressure.
 // A lucky burst can kill, but a fresh, vigilant support can disengage.
 const burst=(hash(seed,minute,zone,defender.id,'burst')%1000)/1000;
 const damage=clamp(Math.round(39+attackers.length*12+
   (quality-defence)*.3+(burst>.84?27:0)+burst*13),18,120);
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
  damage,hpBefore:before,hpAfter:after,retreatGoal,
  healthVersion:1};
}
function audit(match,world){
 const errs=[],players=Object.fromEntries(world.players.map(x=>[x.id,x]));
 if(!match.moments?.length)return errs; // v2 pre-0.7 replay fallback
 for(let index=0;index<match.events.length;index++){
  const event=match.events[index],f=event.facts;
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
  if(!direct)errs.push('Sin ningún atacante en rango de golpe: '+index);
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
core.Encounters=Object.freeze({create,recover,locate,resolve,power,distance,nearZone,threat,audit});
})(globalThis);
