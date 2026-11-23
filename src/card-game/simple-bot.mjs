// Simple open-policy bot for v0.8.1: acts only on its own hand and visible board.
import { LANES, playCard, activate, passTurn, chooseKeep } from './engine.mjs';
const active = u => u.status === 'active';
const living = (m,s,lane) => m.players[s].characters.filter(u=>active(u) && u.lane===lane);
const front = (m,s,lane) => living(m,s,lane).filter(u=>u.rank==='front');
const minHp = units => [...units].sort((a,b)=>a.hp-b.hp || a.id.localeCompare(b.id))[0];
function lanePriority(m,s,lane) {
  const ours=front(m,s,lane).reduce((v,u)=>v+u.attack,0);
  const theirs=front(m,1-s,lane).reduce((v,u)=>v+u.attack,0);
  const defense=m.players[1-s].towers[lane];
  return (ours>0?3:0)+(defense===0?4:(6-defense)*0.4)+(ours>=theirs?2:0)-(theirs-ours>4?2:0);
}
function cardMove(m,s,card) {
  const lane=[...LANES].sort((a,b)=>lanePriority(m,s,b)-lanePriority(m,s,a))[0];
  const t=card.effect.type;
  if(t==='PRESSURE') return {score:5+lanePriority(m,s,lane),target:{lane}};
  if(t==='GUARD'){
    const danger=[...LANES].sort((a,b)=>front(m,1-s,b).length-front(m,1-s,a).length)[0];
    return {score:2+front(m,1-s,danger).length*2,target:{lane:danger}};
  }
  if(t==='ENERGY') return {score:m.players[s].energy<4?12:3,target:{}};
  if(t==='DRAW') return {score:m.players[s].hand.length<=4?9:2,target:{}};
  if(t==='IMPACT'){
    const victims=m.players[1-s].characters.filter(active);
    if(!victims.length) return null;
    const target=minHp(victims.filter(u=>u.rank==='front').length?victims.filter(u=>u.rank==='front'):victims);
    return {score:8+(target.hp<=card.effect.value?4:0),target:{unitId:target.id}};
  }
  if(t==='HUNT'){
    const targets=['major','minor'].filter(id=>m.objectives[id]?.active);
    if(!targets.length) return null;
    const objective=targets[0],j=m.players[s].characters.find(u=>u.role==='JUN');
    const assisted=Boolean(j&&active(j)&&!j.tapped&&j.rank==='front');
    const pressure=m.players[s].objectivePressure[objective];
    const enemy=m.players[1-s].objectivePressure[objective];
    const favorite=[...LANES].sort((a,b)=>lanePriority(m,s,b)-lanePriority(m,s,a))[0];
    return {score:13+(objective==='major'?3:0)+(assisted?2:0)+(enemy>pressure?2:0),
      target:{objective,...(objective==='minor'?{lane:favorite}:{})}};
  }
  if(t==='GANK'){
    const j=m.players[s].characters.find(u=>u.role==='JUN');
    if(!j || !active(j) || j.tapped || j.rank!=='front') return null;
    return {score:10+lanePriority(m,s,lane),target:{lane}};
  }
  if(t==='DIVE'){
    const places=LANES.filter(l=>front(m,s,l).length);
    if(!places.length) return null;
    const best=places.sort((a,b)=>lanePriority(m,s,b)-lanePriority(m,s,a))[0];
    return {score:front(m,1-s,best).length?7:1,target:{lane:best}};
  }
  if(t==='BACK'){
    const weak=m.players[s].characters.filter(u=>active(u) && u.hp<=u.maxHp/2);
    if(!weak.length) return null;
    return {score:7,target:{unitId:minHp(weak).id}};
  }
  if(t==='ROTATE'){
    const movers=m.players[s].characters.filter(u=>active(u) && u.role!=='JUN');
    const candidates=[];
    for(const u of movers) for(const dest of LANES){
      if(dest===u.lane) continue;
      const priority=lanePriority(m,s,dest)-lanePriority(m,s,u.lane);
      candidates.push({score:2+priority,target:{unitId:u.id,lane:dest}});
    }
    return candidates.sort((a,b)=>b.score-a.score)[0]||null;
  }
  return null;
}
export function botStep(m,side=1) {
  if(m.phase!=='tactics'||m.turn!==side||m.players[side].passed) return false;
  const p=m.players[side];
  // Prevent stalled games after respawns: a bot must actually put Riftborn on the frontline.
  const noFront=LANES.every(l=>front(m,side,l).length===0);
  const readyRear=p.characters.find(u=>active(u)&&u.role!=='JUN'&&u.rank==='rear'&&!u.tapped&&
    (noFront || p.towers[u.lane]<=3));
  if(readyRear && p.actions<4){
    activate(m,side,readyRear.id,'SWAP_RANK');
    return true;
  }
  const candidates=[];
  for(const card of p.hand){
    if(card.cost>p.energy) continue;
    const move=cardMove(m,side,card);
    if(move) candidates.push({...move,uid:card.uid});
  }
  const best=candidates.sort((a,b)=>b.score-a.score)[0];
  if(best && best.score>=4){
    try { playCard(m,side,best.uid,best.target); return true; }
    catch (_) { /* Fall back to safe activation or pass. */ }
  }
  const injured=p.characters.find(u=>active(u)&&!u.tapped&&u.hp<=Math.max(1,Math.floor(u.maxHp/3)));
  if(injured && p.actions<4){
    activate(m,side,injured.id,'BACK');return true;
  }
  const rear=p.characters.find(u=>active(u)&&u.rank==='rear'&&!u.tapped&&u.role!=='JUN'&&p.towers[u.lane]<=3);
  if(rear && p.actions<4){
    activate(m,side,rear.id,'SWAP_RANK');return true;
  }
  chooseKeep(m,side,p.hand.slice(0,2).map(c=>c.uid));
  passTurn(m,side);
  return true;
}
