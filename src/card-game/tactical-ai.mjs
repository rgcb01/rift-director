// Rift Director v0.8.4 — tactical AI with PUBLIC-state decisions.
// Only reads the acting player's hand; never inspects rival hand, deck or future RNG.
// No hidden reaction cards: it acts exclusively during its own legal turn.
import {LANES, playCard, activate, chooseKeep, passTurn, combatAttack, maxStructuralDamage, frontalMitigation} from './engine.mjs';
import {botStep as rookieStep} from './simple-bot.mjs';

export const AI_LEVELS=Object.freeze({
  rookie:{name:'Aprendiz',description:'Prioriza acciones fáciles y errores perdonables.'},
  tactical:{name:'Táctico',description:'Defiende brechas y prepara ataques por carril.'},
  director:{name:'Director',description:'Evalúa amenazas, letalidad y objetivos neutrales.'}
});
export const AI_STYLES=Object.freeze({
  balanced:{name:'Equilibrado',description:'Combina presión, defensa y objetivos.'},
  siege:{name:'Asedio',description:'Busca abrir un carril y terminar por el Nexo.'},
  control:{name:'Control',description:'Protege torres, elimina enemigos y gana por desgaste.'},
  jungle:{name:'Jungla',description:'Prioriza ganks y el control de objetivos.'}
});
const active=u=>u.status==='active';
const open=u=>active(u)&&u.rank==='front';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ownFront=(m,side,lane)=>m.players[side].characters.filter(u=>open(u)&&u.lane===lane);
const allFront=(m,side)=>m.players[side].characters.filter(open);
const laneAttack=(m,side,lane)=>ownFront(m,side,lane).reduce((v,u)=>v+u.attack+(u.trait==='SIEGE'?1:0),0);
function weights(style){
 if(style==='siege')return {offense:1.42,defense:.8,objective:.72,utility:.85};
 if(style==='control')return {offense:.82,defense:1.6,objective:.8,utility:1.15};
 if(style==='jungle')return {offense:1.0,defense:.9,objective:1.45,utility:1.1};
 return {offense:1,defense:1.1,objective:1.05,utility:1};
}
function perLane(m,s,lane){
 const p=m.players[s],r=m.players[1-s];
 const a=laneAttack(m,s,lane),b=laneAttack(m,1-s,lane);
 const own=a+p.buffs[lane]+p.permanentPressure[lane]+(p.towers[lane]>0?1:0)+(p.majorUntil>=m.round?1:0);
 const enemy=b+r.buffs[lane]+r.permanentPressure[lane]+(r.towers[lane]>0?1:0)+(r.majorUntil>=m.round?1:0);
 const ours=ownFront(m,s,lane),theirs=ownFront(m,1-s,lane);
 const unguarded=theirs.length===0;
 const threat=enemy-own;
 const target=r.towers[lane];
 const shield=theirs.length?frontalMitigation(m.round)+(theirs.some(u=>u.trait==='BULWARK')?1:0):0;
 const defShield=ours.length?frontalMitigation(m.round)+(ours.some(u=>u.trait==='BULWARK')?1:0):0;
 const breachValue=target===0?2.4:target<=3?1.5:1;
 const lossValue=p.towers[lane]===0?2.5:p.towers[lane]<=3?1.7:1;
 return {a,b,own,enemy,ours,theirs,threat,target,shield,defShield,breachValue,lossValue,unguarded,cap:maxStructuralDamage(m.round)};
}
function hitValue(amount,l){
 return l.target===0?amount*5.8:amount*(l.target<=3?4.3:2.6);
}
function estimatedSiege(l,bonus=0,shield=l.shield){
 if(!l.ours.length)return 0;
 const d=l.own+bonus-l.enemy;
 return d>0?Math.max(0,Math.min(l.cap,Math.ceil(d/2))-shield):0;
}
function scorePressure(m,s,lane,amount,style){
 const l=perLane(m,s,lane);
 if(!l.ours.length)return -20;
 const before=estimatedSiege(l);
 const after=estimatedSiege(l,amount);
 const towerDamage=hitValue(after-before,l);
 const pressureEdge=clamp(l.own+amount-l.enemy,-3,6);
 // Avoid burning a card when the attack is already at the 3-damage cap.
 if(before>=l.cap&&after===before)return 0.8;
 // Pressure may be worth stacking for a second tactical card, but not endlessly.
 const setup=after===0?(pressureEdge>0?3.5:1.1):3;
 return weights(style).offense*(towerDamage*1.5 + setup+pressureEdge*.45+
   (after>0&&l.target===0?3:0)+(l.unguarded?1:0))-(l.target>0&&l.theirs.length?1:0);
}
function scoreGuard(m,s,lane,amount,style){
 const l=perLane(m,s,lane);
 const before=l.enemy-l.own, after=Math.max(0,Math.min(l.cap,Math.ceil(Math.max(0,before)/2)))-l.defShield;
 const useful=Math.max(0,Math.min(amount,Math.max(0,after-m.players[s].guards[lane])));
 return weights(style).defense*(useful*4*l.lossValue+(l.threat>0?1:0))-1;
}
function targets(m,s,c,style){
 const p=m.players[s],o=m.players[1-s],t=c.effect.type,v=c.effect.value||0,W=weights(style);
 const out=[];
 const push=(target,score)=>{if(Number.isFinite(score))out.push({kind:'card',uid:c.uid,target,score,cost:c.cost});};
 const actionSpace=4-p.actions;
 for(const lane of LANES){
   const l=perLane(m,s,lane);
   if(t==='PRESSURE')push({lane},scorePressure(m,s,lane,v,style)-c.cost*.55);
   if(t==='GUARD')push({lane},scoreGuard(m,s,lane,v,style)-c.cost*.45);
   if(t==='SABOTAGE'){
     const incoming=scoreGuard(m,s,lane,v,style);
     push({lane},W.defense*(incoming+(l.theirs.length?2:0))-.75*c.cost);
   }
   if(t==='GANK'){
     const j=p.characters.find(u=>u.role==='JUN');
     if(j&&open(j)&&!j.tapped) {
       const amount=j.attack+1+(['SCOUT','HUNTER'].includes(j.trait)?1:0);
       push({lane},scorePressure(m,s,lane,amount,style)+1.3*W.offense-
        ((m.objectives.minor.active||m.objectives.major.active)&&style==='jungle'?6:0)-c.cost*.5);
     }
   }
   if(t==='DIVE'&&l.ours.length){
     const before=estimatedSiege(l,0,l.shield);
     const after=estimatedSiege(l,0,0);
     push({lane},W.offense*(hitValue(after-before,l)*1.7+(l.theirs.length?2:0))-
       (l.target>0?2.5:0)-c.cost*.55);
   }
 }
 if(t==='IMPACT')for(const u of o.characters.filter(active)){
   const lane=LANES.includes(u.lane)?perLane(m,s,u.lane):null;
   const ko=u.hp<=v,damage=Math.min(u.hp,v);
   const front=u.rank==='front'&&u.role!=='JUN';
   const score=W.utility*(damage*1.2 + (ko?6+(front?5:0):0)+
     (front&&lane?.ours.length?4:0)+(u.role==='JUN'&&(m.objectives.minor.active||m.objectives.major.active)?5:0))-
     c.cost*.65;
   push({unitId:u.id},score);
 }
 if(t==='HEAL')for(const u of p.characters.filter(active)){
   const missing=u.maxHp-u.hp;
   if(missing<=0)continue;
   const front=open(u)&&u.role!=='JUN';
   const score=W.defense*(Math.min(missing,v)*1.9+(front?3:0)+(u.hp<=combatAttack(u,m.round)?2:0))-c.cost*.55;
   push({unitId:u.id},score);
 }
 if(t==='BACK')for(const u of p.characters.filter(active)){
   const hurt=u.maxHp-u.hp,weak=u.hp<=Math.max(2,combatAttack(u,m.round));
   push({unitId:u.id},(weak?8:0)+hurt*.45-(open(u)?4:0)-c.cost*.55-3);
 }
 if(t==='ROTATE')for(const u of p.characters.filter(u=>active(u)&&u.role!=='JUN')){
   for(const lane of LANES){
     if(u.lane===lane)continue;
     const dest=perLane(m,s,lane),src=perLane(m,s,u.lane);
     const urgency=dest.lossValue*clamp(dest.threat,0,5)+(dest.target===0?3:0);
     const sacrifice=src.lossValue*Math.max(0,src.threat);
     const score=W.utility*(urgency-sacrifice+(u.rank==='front'&&dest.unguarded?3:0))-c.cost*.6-2;
     push({unitId:u.id,lane},score);
   }
 }
 if(t==='ENERGY'){
   const gained=Math.min(v,Math.max(0,8-p.energy));
   push({},gained>0&&actionSpace>=2?(p.energy<=1?11:5)+(gained*.8)-c.cost: -20);
 }
 if(t==='DRAW'){
   const slots=Math.max(0,8-p.hand.length+1);
   push({},slots>0&&actionSpace>=2?W.utility*(p.hand.length<=2?12:p.hand.length<=4?6:2)-c.cost*.4:-10);
 }
 if(t==='HUNT'){
   const j=p.characters.find(u=>u.role==='JUN');
   const assist=Boolean(j&&open(j)&&!j.tapped);
   const gain=v+(assist?2+(j.trait==='HUNTER'?1:0):0);
   for(const objective of ['major','minor']){
     if(!m.objectives[objective].active)continue;
     const before=p.objectivePressure[objective],enemy=o.objectivePressure[objective];
     const alreadySecured=before>=4&&before-enemy>=2;
     if(alreadySecured)continue;
     const after=before+gain,ownWin=after>=4&&after-enemy>=2;
     const stillBehind=after<enemy+2;
     const urgent=m.round>=8&&objective==='major';
     const base=W.objective*(ownWin?(urgent?21:17):(stillBehind?4:8)+gain*.6);
     const factor=(m.round>=11&&objective==='minor')?.75:1;
     for(const lane of (objective==='minor'?LANES:['MID'])){
       const l=perLane(m,s,lane);
       const score=base*factor+(objective==='minor'?(l.target===0?2.2:0):0)-
          (assist&&style==='siege'?2:0)-c.cost*.8;
       push({objective,...(objective==='minor'?{lane}:{})},score);
     }
   }
 }
 return out;
}
function swapChoices(m,s,style){
 const p=m.players[s],W=weights(style),out=[];
 for(const u of p.characters.filter(u=>active(u)&&!u.tapped&&u.role!=='JUN')){
   const l=perLane(m,s,u.lane);
   if(u.rank==='rear'){
     const attackers=ownFront(m,s,u.lane);
     const exposed=l.threat>0||p.towers[u.lane]===0;
     const needFront=attackers.length===0;
     const enemyAtFront=l.theirs.length>0;
     const preferred=(style==='siege'&&l.target===0?2:0);
     const score=W.offense*(needFront?9:4)+W.defense*(exposed?7:0)+
       (l.target===0?4:0)+(enemyAtFront?2:0)+preferred-
       (u.hp<=2?10:0)-(u.trait==='HARVEST'&&p.pendingFarm===0?2:0);
     out.push({kind:'activate',unitId:u.id,order:'SWAP_RANK',score});
   }else{
     const danger=l.theirs.reduce((sum,e)=>sum+combatAttack(e,m.round),0);
     if(u.hp<=danger||u.hp<=2){
       const score=W.defense*(u.hp<=danger?11:6)-(l.target===0?2:0);
       out.push({kind:'activate',unitId:u.id,order:'SWAP_RANK',score});
       if(u.hp<=Math.ceil(u.maxHp/3))out.push({kind:'activate',unitId:u.id,order:'BACK',score:W.defense*7});
     }
   }
 }
 return out;
}
function retention(m,s){
 // Keep the two most versatile affordable options without relying on hidden opponent state.
 const p=m.players[s];
 const rank={IMPACT:8,HEAL:6,GUARD:7,GANK:8,HUNT:9,PRESSURE:8,DIVE:5,SABOTAGE:6,ROTATE:6,DRAW:4,ENERGY:3,BACK:3};
 return [...p.hand].sort((a,b)=>{
   const as=(rank[a.effect.type]||0)-Math.abs(a.cost-Math.min(6,p.energy+2))*.3;
   const bs=(rank[b.effect.type]||0)-Math.abs(b.cost-Math.min(6,p.energy+2))*.3;
   return bs-as||a.uid.localeCompare(b.uid);
 }).slice(0,2).map(c=>c.uid);
}
export function aiStep(match,side=1,options={}){
 const difficulty=AI_LEVELS[options.difficulty]?options.difficulty:'tactical';
 const style=AI_STYLES[options.style]?options.style:'balanced';
 if(difficulty==='rookie')return rookieStep(match,side);
 if(match.phase!=='tactics'||match.turn!==side||match.players[side].passed)return false;
 const p=match.players[side],W=weights(style);
 const choices=swapChoices(match,side,style);
 for(const c of p.hand){
   if(c.cost>p.energy)continue;
   choices.push(...targets(match,side,c,style));
 }
 const nonnegative=choices.filter(c=>c.score>1.5);
 // Director favors a tactical coup (kill / structural breakthrough) over mere resource cycling.
 if(difficulty==='director')for(const c of nonnegative){
   if(c.kind==='card'&&c.target?.lane){
     const l=perLane(match,side,c.target.lane);
     if(l.target===0)c.score+=W.offense*1.2;
     if(l.target>0&&l.target<=2)c.score+=W.offense*1.1;
   }
   if(c.kind==='card'&&c.target?.unitId){
     const victim=match.players[1-side].characters.find(u=>u.id===c.target.unitId);
     const source=p.hand.find(x=>x.uid===c.uid);
     if(victim&&source?.effect.type==='IMPACT'&&victim.hp<=source.effect.value)c.score+=3;
   }
 }
 const ordered=nonnegative.sort((a,b)=>b.score-a.score||
    (a.kind===b.kind?0:a.kind==='card'?-1:1)||
    String(a.uid||a.unitId).localeCompare(String(b.uid||b.unitId)));
 for(const candidate of ordered){
   try{
     if(candidate.kind==='card')playCard(match,side,candidate.uid,candidate.target);
     else activate(match,side,candidate.unitId,candidate.order);
     return true;
   }catch(_){ /* A legal candidate may become stale; try another, then pass. */ }
 }
 chooseKeep(match,side,retention(match,side));
 passTurn(match,side);
 return true;
}
