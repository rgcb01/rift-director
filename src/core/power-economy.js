/* Rift Director Alpha 0.7.9 — deterministic per-professional XP, levels and items.
 * The map's displayed team gold is cumulative (earned), while personal wallets
 * record purchasing power. Buying items never creates or removes team gold.
 * No RNG, DOM, or changes to the saved club/transfer economy.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ITEM_CATALOG=Object.freeze([
 Object.freeze({id:'boots',name:'Botas de desplazamiento',cost:1850,attack:1,defense:2,tempo:2}),
 Object.freeze({id:'blade',name:'Filo del duelista',cost:2700,attack:5,defense:0,tempo:0}),
 Object.freeze({id:'mantle',name:'Manto protector',cost:2600,attack:0,defense:6,tempo:0}),
 Object.freeze({id:'focus',name:'Foco de precisión',cost:4050,attack:7,defense:1,tempo:0}),
 Object.freeze({id:'bulwark',name:'Baluarte táctico',cost:4200,attack:1,defense:8,tempo:0})
]);
const ITEMS=Object.fromEntries(ITEM_CATALOG.map(x=>[x.id,x]));
const ROW=(p)=>({id:p.id,teamId:p.teamId,role:p.role,level:1,xp:0,
 wallet:500,earned:500,spent:0,items:[],lastPurchaseMinute:-100,
 voluntaryBuys:0,
 passive:0,farm:0,killGold:0,objectiveGold:0,kills:0});
function create(players){
 const entries={};
 for(const p of players){
  if(!p?.id||entries[p.id])throw Error('Duplicate power economy player');
  entries[p.id]=ROW(p);
 }
 return {version:1,entries};
}
function nextLevel(level){return 100+(level-1)*15;}
function xpAward(model,id,amount){
 const row=model.entries[id];
 if(!row||!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid XP award');
 row.xp+=amount;
 while(row.level<18&&row.xp>=nextLevel(row.level)){
  row.xp-=nextLevel(row.level);row.level++;
 }
 if(row.level===18)row.xp=0;
}
function goldAward(model,id,amount,kind){
 const row=model.entries[id];
 if(!row||!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid personal income');
 row.wallet+=amount;row.earned+=amount;
 if(['passive','farm','killGold','objectiveGold'].includes(kind))row[kind]+=amount;
}
function advance(model,{nav,dead,minute,teamIncome,health}){
 const purchasedCount=Object.keys(model.entries).length;
 if(purchasedCount!==10)throw Error('Power economy expects 10 participants');
 for(const team of [nav.a,nav.b]){
  const agents=Object.values(nav.agents).filter(x=>x.teamId===team)
    .sort((a,b)=>a.id.localeCompare(b.id));
  const income=teamIncome[team];
  if(!Number.isSafeInteger(income)||income<0)throw Error('Invalid team passive gold');
  const base=Math.floor(income/agents.length),extra=income%agents.length;
  agents.forEach((p,i)=>goldAward(model,p.id,base+(i<extra?1:0),'passive'));
 }
 for(const a of Object.values(nav.agents)){
  if(!a.alive||(dead[a.id]||0)>minute)continue;
  const inLane=['TOP','MID','BOT'].some(lane=>
    core.Navigation.isLaneNode(a.node,lane));
  const isBase=a.node.endsWith('_fountain')||a.node.endsWith('_nexus');
  const xp=isBase?10:inLane?51:a.role==='JUN'?41:35;
  xpAward(model,a.id,xp);
 }
}
function awardFarm(model,{teamId,lane,gold},nav,health){
 const participants=Object.values(nav.agents).filter(a=>a.teamId===teamId&&
  a.alive&&(health[a.id]??100)>=26&&core.Navigation.isLaneNode(a.node,lane)&&
  (a.role===lane||(lane==='BOT'&&['ADC','SUP'].includes(a.role))||
   ['siege','splitpush','counterpush','counter_siege'].includes(a.intent)))
  .sort((a,b)=>a.id.localeCompare(b.id));
 if(!participants.length)return;
 const base=Math.floor(gold/participants.length),extra=gold%participants.length;
 participants.forEach((a,i)=>goldAward(model,a.id,base+(i<extra?1:0),'farm'));
}
function teamGoldAward(model,teamId,amount){
 if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid objective payout');
 const players=Object.values(model.entries).filter(p=>p.teamId===teamId)
  .sort((a,b)=>a.id.localeCompare(b.id));
 if(players.length!==5)throw Error('Objective payout requires exactly five team players');
 const shared=Math.floor(amount/players.length),extra=amount%players.length;
 players.forEach((p,i)=>goldAward(model,p.id,shared+(i<extra?1:0),'objectiveGold'));
}
function rewardEvent(model,event){
 const f=event?.facts;if(!f||f.action==='item_purchase')return;
 const participants=[...new Set(f.participantIds||[f.actorId])];
 switch(f.action){
  case 'plate':
   xpAward(model,f.actorId,24);
   goldAward(model,f.actorId,f.goldReward,'objectiveGold');break;
  case 'tower':
   participants.forEach(id=>xpAward(model,id,110));
   teamGoldAward(model,event.teamId,420+(f.firstTowerBonus||0));break;
  case 'dragon':case 'baron':
   participants.forEach(id=>xpAward(model,id,85));
   teamGoldAward(model,event.teamId,f.action==='dragon'?230:450);break;
  default:
   if(Array.isArray(f.victimIds)&&f.victimIds.length){
    const number=f.victimIds.length;
    xpAward(model,f.actorId,150*number);
    goldAward(model,f.actorId,320*number,'killGold');
    for(const id of f.assistIds||[])xpAward(model,id,75*number);
   }
 }
}
function candidates(row,opponentGoldLead=0){
 return ITEM_CATALOG.filter(item=>!row.items.includes(item.id))
 .map(item=>{
  const role=row.role;
  const attackRole=['TOP','MID','ADC'].includes(role);
  const defenseRole=['SUP','JUN'].includes(role);
  const behind=opponentGoldLead>1400;
  const utility=item.attack*(attackRole?1.8:1)+
    item.defense*(defenseRole?1.7:behind?1.4:0.85)+
    item.tempo*(role==='JUN'?2.4:1)+
    (row.items.length?item.cost/900:0);
  return {item,utility};
 }).sort((a,b)=>b.utility-a.utility||a.item.cost-b.item.cost);
}
function nextPurchase(model,id,opponentGoldLead=0){
 const row=model.entries[id];if(!row||row.items.length>=3)return null;
 const options=candidates(row,opponentGoldLead).filter(c=>c.item.cost<=row.wallet);
 return options[0]?.item||null;
}
// A recall is an opportunity-cost decision, never an automatic consequence
// of being able to afford another item. Buying after respawn remains free to
// consider and does not consume the voluntary reset allowance.
function shouldRecall(model,nav,agent,minute,worldState,context=null){
 const row=model.entries[agent.id];
 if(!row||!agent.alive||minute<13||minute>63||row.items.length>=3)return false;
 const enemy=agent.teamId===nav.a?nav.b:nav.a;
 const enemyLead=(worldState.gold[enemy]||0)-(worldState.gold[agent.teamId]||0);
 const item=nextPurchase(model,agent.id,enemyLead);
 if(!item||row.wallet<item.cost+450)return false;
 if(row.voluntaryBuys>=1||minute-row.lastPurchaseMinute<8)return false;
 // Continue a reset already in progress, even if the wave or HP changes
 // while the professional walks along legal graph edges to the nexus.
 if(agent.intent==='shop_recall')return true;
 if(agent.role==='JUN'&&minute<36)return false;
 const hp=id=>context?.health?.[id]??100;
 const committed=nav.siegeTeam!==null&&minute>=24;
 const accepted=p=>{
  const r=model.entries[p.id];
  if(!r||r.voluntaryBuys>=1||minute-r.lastPurchaseMinute<8||
     p.role==='JUN'&&minute<36)return false;
  const buy=nextPurchase(model,p.id,enemyLead);
  if(!buy||r.wallet<buy.cost+450)return false;
  const health=hp(p.id);
  // During an active siege, preserve the squad's map presence. Only a
  // heavily injured professional may concede pressure to secure an item.
  if(committed&&health>54)return false;
  // Before siege, a weakened laner can reset to turn earned money into
  // an immediate power spike. A trailing team has slightly more latitude.
  if(!committed&&health>(enemyLead>1800?80:72))return false;
  return true;
 };
 const team=Object.values(nav.agents).filter(p=>p.teamId===agent.teamId&&p.alive);
 if(team.some(p=>p.id!==agent.id&&p.intent==='shop_recall'))return false;
 const eligible=team.filter(accepted).sort((a,b)=>
   hp(a.id)-hp(b.id)||a.id.localeCompare(b.id));
 return eligible[0]?.id===agent.id;
}
function purchase(model,nav,agent,minute,worldState){
 const row=model.entries[agent.id];
 if(!row||!agent.alive||row.lastPurchaseMinute===minute)return null;
 const side=agent.teamId===nav.a?'blue':'red';
 if(![side+'_nexus',side+'_fountain'].includes(agent.node))return null;
 const enemy=agent.teamId===nav.a?nav.b:nav.a;
 const item=nextPurchase(model,agent.id,worldState.gold[enemy]-worldState.gold[agent.teamId]);
 if(!item)return null;
 const voluntaryRecall=agent.intent==='shop_recall';
 row.wallet-=item.cost;row.spent+=item.cost;row.items.push(item.id);
 row.lastPurchaseMinute=minute;
 if(voluntaryRecall)row.voluntaryBuys++;
 return {action:'item_purchase',actorId:agent.id,participantIds:[agent.id],
  node:agent.node,itemId:item.id,itemName:item.name,goldCost:item.cost,
  level:row.level,slot:row.items.length,voluntaryRecall};
}
function boost(model,id,kind='attack'){
 const row=model?.entries[id];if(!row)return 0;
 const levels=(row.level-1)*1.35;
 const gear=row.items.reduce((sum,item)=>sum+(ITEMS[item]?.[kind]||0)*(kind==='attack'?2.3:1.3),0);
 return levels+gear;
}
function teamEquipment(model,teamId){
 const rows=Object.values(model.entries).filter(p=>p.teamId===teamId);
 return rows.reduce((n,p)=>n+p.spent,0);
}
function snapshot(model){
 return {version:model.version,entries:Object.fromEntries(Object.entries(model.entries)
  .map(([id,row])=>[id,{...row,items:[...row.items]}]))};
}
function audit(match){
 const errors=[];
 let prev=null;
 for(const frame of match.frames||[]){
  const power=frame.powerEconomy;if(!power)continue;
  const rows=power.entries||{};
  if(Object.keys(rows).length!==10)errors.push('Match power ledger must have 10 players: '+frame.minute);
  for(const [id,p] of Object.entries(rows)){
   if(!Number.isSafeInteger(p.level)||p.level<1||p.level>18||
      !Number.isSafeInteger(p.xp)||p.xp<0||
      (p.level<18&&p.xp>=nextLevel(p.level)))
    errors.push('Invalid experience/level: '+id+'/'+frame.minute);
   if(!Number.isSafeInteger(p.wallet)||p.wallet<0||
      !Number.isSafeInteger(p.earned)||p.earned<500||
      !Number.isSafeInteger(p.spent)||p.spent<0||p.wallet+p.spent!==p.earned||
      !Array.isArray(p.items)||p.items.length>3||new Set(p.items).size!==p.items.length||
      p.items.some(item=>!ITEMS[item])||
      !Number.isSafeInteger(p.voluntaryBuys)||p.voluntaryBuys<0||
      p.voluntaryBuys>1||p.voluntaryBuys>p.items.length)
    errors.push('Unbalanced personal wallet/items: '+id+'/'+frame.minute);
   const prior=prev?.[id];
   if(prior&&(p.level<prior.level||p.earned<prior.earned||
     p.spent<prior.spent||p.items.length<prior.items.length||
     p.voluntaryBuys<prior.voluntaryBuys))
    errors.push('Power progression reversed: '+id+'/'+frame.minute);
  }
  prev=rows;
 }
 const last=match.frames?.at(-1)?.powerEconomy;
 if(last){
  const purchased=Object.values(last.entries).reduce((n,p)=>n+p.items.length,0);
  const events=match.events.filter(e=>e.facts?.action==='item_purchase');
  if(events.length!==purchased)errors.push('Items bought without events or duplicate purchases');
  const spent=events.reduce((n,e)=>n+e.facts.goldCost,0);
  if(spent!==Object.values(last.entries).reduce((n,p)=>n+p.spent,0))
   errors.push('Purchase receipts do not match spending');
  const recallCounts=Object.fromEntries(Object.keys(last.entries).map(id=>[id,0]));
  for(const event of events){
   const f=event.facts;
   if(f.voluntaryRecall===true)recallCounts[f.actorId]=(recallCounts[f.actorId]||0)+1;
   if(typeof f.voluntaryRecall!=='boolean')
    errors.push('Purchase without recall source: '+f.actorId);
   const i=match.events.indexOf(event);
   const declared=match.moments?.[i]?.navigation?.before?.[f.actorId]?.intent==='shop_recall';
   if(Boolean(f.voluntaryRecall)!==declared)
    errors.push('Purchase recall source inconsistent with navigation: '+f.actorId);
   const side=f.actorId===undefined?null:match.frames[0].navigation.after[f.actorId]?.teamId===match.fixture.a?'blue':'red';
   if(!ITEMS[f.itemId]||ITEMS[f.itemId].cost!==f.goldCost||
      ![side+'_nexus',side+'_fountain'].includes(f.node))
    errors.push('Purchase receipt outside of fountain or invalid item');
  }
  for(const [id,row] of Object.entries(last.entries)){
   if(recallCounts[id]!==row.voluntaryBuys)
    errors.push('Voluntary recall ledger differs from recorded purchases: '+id);
  }
 }
 return errors;
}
core.PowerEconomy=Object.freeze({create,advance,awardFarm,rewardEvent,nextPurchase,
 shouldRecall,purchase,boost,teamEquipment,snapshot,audit,ITEM_CATALOG,nextLevel});
})(globalThis);
