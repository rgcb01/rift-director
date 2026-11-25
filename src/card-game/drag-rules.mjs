// Pure drag-and-drop move planner. Uses canonical match state, never bypasses
// engine validation. Returned plans are executed by playCard/activate in demo-ui.
export const DROP_LANE_EFFECTS=Object.freeze(['PRESSURE','GUARD','GANK','DIVE','SABOTAGE']);
const isLane=lane=>['TOP','MID','BOT'].includes(lane);
const ready=match=>match?.phase==='tactics'&&[0,1].includes(match.turn)&&
 !match.players[match.turn].passed&&match.players[match.turn].actions<4;

export function planDrop(match,source,destination,{focusLane='MID',selectedCardUid=null}={}){
 if(!ready(match)||!source||!destination)return null;
 const side=match.turn,p=match.players[side],other=1-side;
 if(source.kind==='card'){
  const card=p.hand.find(c=>c.uid===source.uid);
  if(!card||p.energy<card.cost)return null;
  const kind=card.effect.type;
  const play=target=>({kind:'play',uid:card.uid,cardId:card.id,target});
  if(['ENERGY','DRAW'].includes(kind))
   return ['board','lane','row','unit','objective'].includes(destination.kind)?play({}):null;
  if(DROP_LANE_EFFECTS.includes(kind)){
   if(destination.kind!=='lane'||!isLane(destination.lane))return null;
   if(kind==='GUARD'&&destination.side!==side)return null;
   if(kind==='SABOTAGE'&&destination.side!==other)return null;
   return play({lane:destination.lane});
  }
  if(['IMPACT','HEAL','BACK','ROTATE'].includes(kind)){
   if(destination.kind!=='unit')return null;
   const targetSide=kind==='IMPACT'?other:side;
   if(destination.side!==targetSide)return null;
   const unit=match.players[targetSide].characters.find(u=>u.id===destination.uid&&u.status==='active');
   if(!unit)return null;
   if(kind==='ROTATE'){
    if(unit.role==='JUN')return null;
    return {kind:'select-rotation',uid:card.uid,cardId:card.id,unitId:unit.id};
   }
   return play({unitId:unit.id});
  }
  if(kind==='HUNT'){
   if(destination.kind!=='objective'||!match.objectives[destination.objective]?.active)return null;
   if(!['minor','major'].includes(destination.objective))return null;
   return play({objective:destination.objective,...(destination.objective==='minor'?{lane:isLane(focusLane)?focusLane:'MID'}:{})});
  }
  return null;
 }
 if(source.kind==='unit'){
  if(source.side!==side)return null;
  const unit=p.characters.find(u=>u.id===source.uid&&u.status==='active');
  if(!unit)return null;
  if(destination.kind==='base'&&destination.side===side&&!unit.tapped)
   return {kind:'activate',unitId:unit.id,order:'BACK'};
  if(destination.kind==='row'&&destination.side===side&&
     destination.lane===unit.lane&&destination.rank!==unit.rank&&!unit.tapped)
   return {kind:'activate',unitId:unit.id,order:'SWAP_RANK'};
  if(destination.kind==='lane'&&destination.side===side&&isLane(destination.lane)&&
     unit.role!=='JUN'&&unit.lane!==destination.lane){
   const available=p.hand.filter(c=>c.effect.type==='ROTATE'&&c.cost<=p.energy);
   const selected=available.find(c=>c.uid===selectedCardUid);
   const card=selected||available.sort((a,b)=>a.cost-b.cost)[0];
   return card?{kind:'play',uid:card.uid,cardId:card.id,target:{unitId:unit.id,lane:destination.lane}}:null;
  }
 }
 return null;
}
