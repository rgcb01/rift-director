/* Alpha 0.7.20A — individual minions and local last-hit economy.
 * Six sampled 10-second steps per strategic minute; two waves/minute.
 * Champion locations are held at the actual pre-combat navigation snapshot.
 * No movement of champions, no world RNG, no tower damage or free gold.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const LANES=['TOP','MID','BOT'];
const TYPES=Object.freeze({melee:Object.freeze({hp:100,damage:14,gold:14,xp:16}),
 caster:Object.freeze({hp:65,damage:18,gold:9,xp:10}),
 cannon:Object.freeze({hp:180,damage:24,gold:28,xp:25})});
const ATTACK={TOP:65,MID:65,ADC:75,SUP:30,JUN:55};
const ORDER={ADC:0,TOP:1,MID:1,JUN:2,SUP:3};
const BLOCKED=new Set(['dead','retreat','recall_channel','recall_recover','shop_recall','siege_return','recover']);
const route=lane=>{
 const l=lane.toLowerCase(),half=side=>['base','inner','outer','front'].map(x=>side+'_'+l+'_'+x);
 return [...half('blue'),...(lane==='MID'?['mid_center']:lane==='TOP'?['top_corner','top_center']:['bot_corner','bot_center']),...half('red').reverse()];
};
const ROUTES=Object.freeze(Object.fromEntries(LANES.map(l=>[l,Object.freeze(route(l))])));
const blank=()=>({cs:0,gold:0,xp:0});
const copy=x=>JSON.parse(JSON.stringify(x));
function create(a,b){
 if(!a||!b||a===b)throw Error('Two distinct minion teams required');
 return {version:1,teamIds:[a,b],minute:0,lanes:Object.fromEntries(LANES.map(l=>[l,[]])),players:{},spawned:0,dead:0,escaped:0};
}
function snapshot(state){return copy(state);}
function observe(nav,health){
 return Object.entries(nav.agents).filter(([id,p])=>p.alive&&!BLOCKED.has(p.intent)&&
  (health[id]??0)>=26&&ATTACK[p.role]&&LANES.some(l=>ROUTES[l].includes(p.node)))
  .map(([id,p])=>({id,teamId:p.teamId,role:p.role,node:p.node}))
  .sort((a,b)=>a.id.localeCompare(b.id));
}
function addAward(state,awards,id,key,n){
 (state.players[id]??=blank())[key]+=n;
 (awards[id]??=blank())[key]+=n;
}
function advance(state,{minute,actors}){
 if(!Number.isSafeInteger(minute)||minute!==state.minute+1||
    !Array.isArray(actors)||new Set(actors.map(p=>p.id)).size!==actors.length||
    actors.some(p=>!state.teamIds.includes(p.teamId)||!ATTACK[p.role]||!LANES.some(l=>ROUTES[l].includes(p.node))))
  throw Error('Invalid minion input');
 const awards={},farm=[],deaths=[];
 const kill=(lane,step,m,killer,local)=>{
  state.dead++;
  const rule=TYPES[m.type],enemy=state.teamIds[1-m.side];
  const near=local.filter(p=>p.teamId===enemy&&Math.abs(p.pos-m.pos)<=1);
  const share=near.length===1?rule.xp:near.length?Math.floor(rule.xp*1.2/near.length):0;
  for(const p of near)if(share)addAward(state,awards,p.id,'xp',share);
  if(killer){
   addAward(state,awards,killer.id,'cs',1);addAward(state,awards,killer.id,'gold',rule.gold);
   farm.push({lane,teamId:killer.teamId,playerId:killer.id,gold:rule.gold});
  }
  deaths.push({lane,step,id:m.id,side:m.side,type:m.type,pos:m.pos,killer:killer?.id??null,xp:near.map(p=>[p.id,share])});
 };
 for(const lane of LANES){
  const nodes=ROUTES[lane],end=nodes.length-1;
  const local=actors.filter(p=>nodes.includes(p.node)).map(p=>({...p,pos:nodes.indexOf(p.node)}))
   .sort((a,b)=>ORDER[a.role]-ORDER[b.role]||a.id.localeCompare(b.id));
  let units=state.lanes[lane];
  for(let step=0;step<6;step++){
   const tick=(minute-1)*6+step;
   if(step%3===0){
    const wave=tick/3+1,types=['melee','melee','melee','caster','caster','caster',...(wave%3===0?['cannon']:[])];
    for(const side of [0,1])types.forEach((type,i)=>{
     units.push({id:lane+':'+wave+':'+side+':'+i,side,type,pos:side?end:0,hp:TYPES[type].hp});state.spawned++;
    });
   }
   // Plan both minion volleys from the same positions. Projected damage
   // spreads attacks over targets instead of giving one side turn priority.
   const hits=new Map(),moving=[];
   for(const side of [0,1]){
    const enemies=units.filter(m=>m.side!==side);
    for(const m of units.filter(m=>m.side===side)){
     const target=enemies.filter(e=>Math.abs(e.pos-m.pos)<=1)
      .sort((a,b)=>Math.abs(a.pos-m.pos)-Math.abs(b.pos-m.pos)||
       Number(a.hp<=(hits.get(a.id)||0))-Number(b.hp<=(hits.get(b.id)||0))||
       a.hp-(hits.get(a.id)||0)-(b.hp-(hits.get(b.id)||0))||a.id.localeCompare(b.id))[0];
     if(target)hits.set(target.id,(hits.get(target.id)||0)+TYPES[m.type].damage);
     else moving.push(m);
    }
   }
   for(const m of units)m.hp-=hits.get(m.id)||0;
   for(const m of units)if(m.hp<=0)kill(lane,step,m,null,local);
   units=units.filter(m=>m.hp>0);
   // Actual present champions each get at most one attack per sample.
   // Damage can soften a minion; only the lethal blow earns CS/gold.
   for(const p of local){
    const side=state.teamIds.indexOf(p.teamId);
    const target=units.filter(m=>m.side!==side&&m.hp>0&&Math.abs(m.pos-p.pos)<=1)
     .sort((a,b)=>a.hp-b.hp||Math.abs(a.pos-p.pos)-Math.abs(b.pos-p.pos)||a.id.localeCompare(b.id))[0];
    if(!target)continue;
    target.hp-=ATTACK[p.role];
    if(target.hp<=0)kill(lane,step,target,p,local);
   }
   units=units.filter(m=>m.hp>0);
   const marching=new Set(moving.map(m=>m.id));
   for(const m of units)if(marching.has(m.id))m.pos+=m.side?-1:1;
   // Terminal removal is explicit; this first slice has no tower/minion
   // interaction or inhibitor mechanic. Never pay CS for a terminal exit.
   const escaped=units.filter(m=>m.pos<0||m.pos>end).length;
   state.escaped+=escaped;units=units.filter(m=>m.pos>=0&&m.pos<=end);
  }
  state.lanes[lane]=units;
 }
 state.minute=minute;
 return {minute,actors:copy(actors),awards,farm,deaths};
}
function signals(state){
 return Object.fromEntries(LANES.map(l=>{
  const units=state.lanes[l],end=ROUTES[l].length-1;
  const counts=[0,1].map(s=>units.filter(m=>m.side===s).length);
  const advanced=[0,1].map(s=>units.filter(m=>m.side===s&&(s?m.pos<=1:m.pos>=end-1)).length);
  return [l,{counts,advantage:counts[0]-counts[1],advanced}];
 }));
}
function audit(match){
 if(!match.minionWavesVersion)return [];
 const errors=[],state=create(match.fixture.a,match.fixture.b);
 const farmByLane=Object.fromEntries(LANES.map(l=>[l,Object.fromEntries(state.teamIds.map(id=>[id,0]))]));
 for(const [i,fr] of match.frames.entries()){
  try{
   if(!fr.minionWaves)throw Error('missing frame');
   if(i>0){
    const prev=match.frames[i-1],positions=fr.navigation.before;
    // Recover() ran before minion sampling; reconstruct the health gate
    // from the previous end snapshot and the actual new node/intent.
    const health=Object.fromEntries(Object.entries(positions).map(([id,p])=>{
     const old=prev.health[id]??0,side=p.teamId===state.teamIds[0]?'blue':'red';
     return [id,!p.alive?0:old===0?100:Math.min(100,old+(p.node===side+'_fountain'?35:p.intent==='retreat'?17:6))];
    }));
    const actors=observe({agents:positions},health);
    const expected=advance(state,{minute:fr.minute,actors});
    if(JSON.stringify(expected)!==JSON.stringify(fr.minionWaves.receipt))throw Error('receipt mismatch');
    for(const f of expected.farm)farmByLane[f.lane][f.teamId]+=f.gold;
   }
   if(JSON.stringify(state)!==JSON.stringify(fr.minionWaves.state)||JSON.stringify(signals(state))!==JSON.stringify(fr.minionWaves.signals))throw Error('state mismatch');
   if(state.spawned!==state.dead+state.escaped+Object.values(state.lanes).reduce((n,x)=>n+x.length,0))throw Error('minion conservation');
   if(match.minionWavesVersion===2){
    for(const [id,p] of Object.entries(fr.powerEconomy.entries)){
     if(p.farm-(p.jungleFarm||0)!==(state.players[id]?.gold||0))throw Error('personal minion gold mismatch '+id);
    }
    for(const l of LANES)for(const id of state.teamIds)if(fr.laneEconomy.lanes[l].farm[id]!==farmByLane[l][id])throw Error('lane minion gold mismatch');
   }
  }catch(e){errors.push('Minion waves '+fr.minute+': '+e.message);break;}
 }
 return errors;
}
core.MinionWaves=Object.freeze({TYPES,ROUTES,create,snapshot,observe,advance,signals,audit});
})(globalThis);
