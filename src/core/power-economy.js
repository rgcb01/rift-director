/* Rift Director Alpha 0.7.9 — deterministic per-professional XP, levels and items.
 * The map's displayed team gold is cumulative (earned), while personal wallets
 * record purchasing power. Buying items never creates or removes team gold.
 * No RNG, DOM, or changes to the saved club/transfer economy.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
// Original Art Pack 02 assets are shared between the UI and the simulator.
// Component IDs are real inventory occupants, not cosmetic pseudo-purchases.
// Flat attack/defense/tempo are interim combat adapter values; champion-level
// AD/AP/armor implementation and ability-specific passives remain later work.
const COMPONENT_CATALOG=Object.freeze([
 ['leather_boots','Botas simples',650,0,0,1],
 ['iron_dagger','Daga de hierro',700,2,0,0],
 ['chain_vest','Chaleco de malla',800,0,2,0],
 ['oak_shield','Escudo básico',750,0,2,0],
 ['magic_page','Página arcana',700,2,0,0],
 ['mana_orb','Esfera de maná',750,2,0,0],
 ['ruby_shard','Fragmento carmesí',800,2,0,0],
 ['azure_crystal','Cristal azul',700,1,1,0],
 ['hunter_string','Cuerda reforzada',650,2,0,0],
 ['sun_fragment','Fragmento solar',650,0,1,1],
 ['ward_totem','Tótem de visión',650,0,1,1],
 ['bronze_handle','Empuñadura de bronce',600,1,0,0],
 ['tempered_plate','Placa templada',800,0,2,0],
 ['focus_lens','Lente focal',850,2,0,0],
 ['green_charm','Amuleto vital',700,0,2,0]
].map(([id,name,cost,attack,defense,tempo])=>
 Object.freeze({id,name,cost,attack,defense,tempo,kind:'component'})));
const ITEM_CATALOG=Object.freeze([
 ['boots','Botas de desplazamiento',1850,1,2,2,'mobility',['leather_boots','bronze_handle']],
 ['blade','Filo del duelista',2700,5,0,0,'physical',['iron_dagger','bronze_handle']],
 ['mantle','Manto protector',2600,0,6,0,'tank',['chain_vest','green_charm']],
 ['focus','Foco de precisión',4050,7,1,0,'physical',['focus_lens','ruby_shard']],
 ['bulwark','Baluarte táctico',4200,1,8,0,'tank',['oak_shield','tempered_plate']],
 ['spellbook','Códice astral',2900,5,0,0,'magic',['magic_page','mana_orb']],
 ['arcane_orb','Orbe de mareas',3550,6,0,0,'magic',['mana_orb','azure_crystal']],
 ['spear','Lanza de ceniza',3250,6,0,0,'physical',['iron_dagger','bronze_handle']],
 ['reaver','Guantelete voraz',3500,4,3,0,'bruiser',['ruby_shard','tempered_plate']],
 ['wardstone','Piedra del vigía',2200,0,3,2,'support',['ward_totem','green_charm']],
 ['sun_charm','Talismán solar',3100,1,4,1,'support',['sun_fragment','green_charm']],
 ['aegis','Égida espectral',3750,0,7,0,'tank',['chain_vest','azure_crystal']],
 ['bow','Arco de tormenta',3650,7,0,0,'marksman',['hunter_string','focus_lens']],
 ['hourglass','Reloj de arena',3350,3,4,0,'magic',['magic_page','tempered_plate']],
 ['crystal','Cristal del horizonte',2950,4,2,0,'magic',['azure_crystal','focus_lens']]
].map(([id,name,cost,attack,defense,tempo,archetype,recipe])=>
 Object.freeze({id,name,cost,attack,defense,tempo,archetype,
  recipe:Object.freeze(recipe),kind:'complete'})));
const ITEMS=Object.fromEntries([...ITEM_CATALOG,...COMPONENT_CATALOG].map(x=>[x.id,x]));
const COMPONENTS=Object.fromEntries(COMPONENT_CATALOG.map(x=>[x.id,x]));
const FINISHED=Object.fromEntries(ITEM_CATALOG.map(x=>[x.id,x]));
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
    goldAward(model,f.actorId,320*number+(f.bountyGold||0),'killGold');
    for(const id of f.assistIds||[])xpAward(model,id,75*number);
   }
 }
}
function roleAffinity(role,family,behind){
 const preference={
  TOP:{tank:1.8,bruiser:2,physical:1.35,mobility:1.15,magic:.5,marksman:.3,support:.4},
  JUN:{tank:1.15,bruiser:1.65,physical:1.7,mobility:1.8,magic:1.1,marksman:.5,support:.6},
  MID:{tank:.45,bruiser:.6,physical:.6,mobility:1.1,magic:2.25,marksman:.3,support:.6},
  ADC:{tank:.3,bruiser:.6,physical:2.1,mobility:1.25,magic:.35,marksman:2.4,support:.3},
  SUP:{tank:1.65,bruiser:.5,physical:.35,mobility:1.1,magic:.7,marksman:.2,support:2.4}
 };
 const v=preference[role]?.[family]??1;
 // Trailing teams seek an affordable damage/utility spike rather than
 // automatically favoring expensive defense. No free combat stats are granted.
 return behind?(v*(['physical','magic','marksman','bruiser'].includes(family)?1.12:1)):v;
}
function ingredientIds(row,item){
 return item.recipe.filter(id=>!row.items.includes(id));
}
function completedItems(row){return row.items.filter(id=>FINISHED[id]);}
// Item selection values *completed* effects, not transaction count. Component
// purchases are legal but should never crowd out an affordable power spike.
// Score complete items using role utility and actual conversion of wallet gold.
// Partial recipes only start after the first finished item; no off-map upgrades.
function candidates(row,opponentGoldLead=0){
 const behind=opponentGoldLead>1400;
 return ITEM_CATALOG.filter(item=>!row.items.includes(item.id)).map(item=>{
  const owned=item.recipe.filter(part=>row.items.includes(part));
  const credit=owned.reduce((total,id)=>total+COMPONENTS[id].cost,0);
  const due=item.cost-credit;
  const affinity=roleAffinity(row.role,item.archetype,behind);
  const effectivePower=item.attack*1.35+item.defense*1.1+item.tempo*1.3+1;
  // Prior purchases are sunk investment: finishing them matters only when
  // converting the remaining wallet into immediate completed power.
  const utility=affinity*effectivePower+(item.id==='boots'?1.8:0);
  return {item,utility,due,owned};
 }).sort((a,b)=>b.utility-a.utility||a.due-b.due||a.item.id.localeCompare(b.item.id));
}
function purchaseOptions(row,opponentGoldLead=0){
 if(row.items.length>=6&&!row.items.some(id=>COMPONENTS[id]))return [];
 const choices=candidates(row,opponentGoldLead);
 const full=[],partials=[];
 const heldComponents=row.items.filter(id=>COMPONENTS[id]);
 const hasComplete=row.items.some(id=>FINISHED[id]);
 const recipeReady=ITEM_CATALOG.some(item=>!row.items.includes(item.id)&&
  item.recipe.every(id=>heldComponents.includes(id)));
 for(const {item,utility,due,owned} of choices){
  if(due<=row.wallet&&row.items.length-owned.length<6){
   full.push({...item,kind:'combine',targetId:item.id,
    consumedIds:owned,goldCost:due,utility});
  }
 }
 // First choose the best affordable power now. An affordable completed item
 // is always more valuable than an uncompleted component at this shop visit.
 if(full.length){
  return full.sort((a,b)=>
   ((b.consumedIds.length===2?1:0)-(a.consumedIds.length===2?1:0))||
   (b.utility/Math.sqrt(b.goldCost))-(a.utility/Math.sqrt(a.goldCost))||
   b.consumedIds.length-a.consumedIds.length||a.id.localeCompare(b.id));
 }
 // Preserve any unfinished craft. If there is no affordable completion, buy
 // just its next missing part instead of creating several dead-end recipes.
 // The next return is a real opportunity cost, never free crafting.
 if(recipeReady||(!hasComplete&&!heldComponents.length))return [];
 if(row.items.length>=6)return [];
 const focused=heldComponents.length?
  choices.filter(c=>c.owned.length).sort((a,b)=>b.owned.length-a.owned.length||
   b.utility-a.utility):choices;
 for(const {item,utility,owned} of focused){
  const missing=item.recipe.filter(id=>!row.items.includes(id));
  const next=missing.map(id=>COMPONENTS[id]).find(part=>part.cost<=row.wallet);
  if(!next)continue;
  partials.push({...next,kind:'component',targetId:item.id,consumedIds:[],
   goldCost:next.cost,utility});
 }
 return partials.sort((a,b)=>b.utility-a.utility||a.goldCost-b.goldCost||
  a.id.localeCompare(b.id));
}
function nextPurchase(model,id,opponentGoldLead=0){
 const row=model?.entries[id];if(!row)return null;
 return purchaseOptions(row,opponentGoldLead)[0]||null;
}
// A recall is an opportunity-cost decision, never an automatic consequence
// of being able to afford another item. Buying after respawn remains free to
// consider and does not consume the voluntary reset allowance.
function shouldRecall(model,nav,agent,minute,worldState,context=null){
 const row=model.entries[agent.id];
 if(!row||!agent.alive||minute<13||minute>63||row.items.length>=6)return false;
 const side=agent.teamId===nav.a?'blue':'red';
 // A professional already at home can buy naturally. Returning from a
 // death timer must not be misclassified as a voluntary strategic recall.
 if(agent.intent!=='shop_recall'&&
   [side+'_fountain',side+'_nexus'].includes(agent.node))return false;
 const enemy=agent.teamId===nav.a?nav.b:nav.a;
 const enemyLead=(worldState.gold[enemy]||0)-(worldState.gold[agent.teamId]||0);
 // Costly second shop trip is for genuine deficit recovery, not leader snowball.
 if(row.voluntaryBuys>=1&&enemyLead<1600&&agent.intent!=='shop_recall')return false;
 const item=nextPurchase(model,agent.id,enemyLead);
 if(!item||item.kind!=='combine'||row.wallet<item.goldCost+450)return false;
 if(row.voluntaryBuys>=2||minute-row.lastPurchaseMinute<10)return false;
 // Continue a reset already in progress, even if the wave or HP changes
 // while the professional walks along legal graph edges to the nexus.
 if(agent.intent==='shop_recall')return true;
 if(agent.role==='JUN'&&minute<36||agent.role==='SUP'&&minute<29)return false;
 const hp=id=>context?.health?.[id]??100;
 // Only the club performing a coordinated siege must preserve its attackers.
 // Treating an enemy siege as our own previously blocked defenders from
 // physically returning to spend earned gold and contest the push.
 const committed=nav.siegeTeam===agent.teamId&&minute>=24;
 const accepted=p=>{
  const r=model.entries[p.id];
  if(!r||r.voluntaryBuys>=2||minute-r.lastPurchaseMinute<10||
     (r.voluntaryBuys>=1&&enemyLead<1600)||
     (p.role==='JUN'&&minute<36||p.role==='SUP'&&minute<29))return false;
  const buy=nextPurchase(model,p.id,enemyLead);
  if(!buy||buy.kind!=='combine'||r.wallet<buy.goldCost+450)return false;
  const health=hp(p.id);
  // During an active siege, preserve the squad's map presence. Only a
  // heavily injured professional may concede pressure to secure an item.
  if(committed&&health>54)return false;
  // Before siege, a weakened laner can reset to turn earned money into
  // an immediate power spike. A trailing team has slightly more latitude.
  if(!committed&&health>(enemyLead>1800?80:72)){
   // A very large unspent wallet creates a second real shopping opportunity
   // only after lane phase, with no free teleport, no waived price, and no
   // withdrawal while the team is sieging. Do not use low gold lead alone.
   const wealthy=r.wallet>=5200&&minute>=31&&minute<=54&&
     r.items.length<=4&&(health>=80||enemyLead>1600);
   if(!wealthy)return false;
  }
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
 const consumedIds=item.consumedIds||[];
 const goldCost=item.goldCost;
 const before=[...row.items];
 if(item.kind==='combine'){
  for(const ingredient of consumedIds){
   const slot=row.items.indexOf(ingredient);
   if(slot<0)throw Error('Missing recipe ingredient');
   row.items.splice(slot,1);
  }
 }
 if(row.items.length>=6||row.wallet<goldCost)throw Error('Invalid purchase capacity or wallet');
 row.wallet-=goldCost;row.spent+=goldCost;row.items.push(item.id);
 row.lastPurchaseMinute=minute;
 if(voluntaryRecall)row.voluntaryBuys++;
 return {action:'item_purchase',actorId:agent.id,participantIds:[agent.id],
  node:agent.node,itemId:item.id,itemName:item.name,goldCost,
  itemKind:item.kind==='component'?'component':'complete',targetId:item.targetId,
  consumedIds,inventoryBefore:before.length,
  level:row.level,slot:row.items.length,voluntaryRecall};
}
function boost(model,id,kind='attack'){
 const row=model?.entries[id];if(!row)return 0;
 const levels=(row.level-1)*1.35;
 const raw=row.items.reduce((sum,item)=>
  sum+(ITEMS[item]?.[kind]||0)*(kind==='attack'?2.3:1.3),0);
 // Preserve the first completed-item spike; curb runaway advantages from
 // stacking expensive builds. Same curve for every professional and team.
 const knee=kind==='attack'?20:8;
 const gear=Math.min(kind==='attack'?38:19,
  raw<=knee?raw:knee+(raw-knee)*(kind==='attack'?.78:.48));
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
      !Array.isArray(p.items)||p.items.length>6||new Set(p.items).size!==p.items.length||
      p.items.some(item=>!ITEMS[item])||
      !Number.isSafeInteger(p.voluntaryBuys)||p.voluntaryBuys<0||
      p.voluntaryBuys>2)
    errors.push('Unbalanced personal wallet/items: '+id+'/'+frame.minute);
   const prior=prev?.[id];
   if(prior&&(p.level<prior.level||p.earned<prior.earned||
     p.spent<prior.spent||
     p.voluntaryBuys<prior.voluntaryBuys))
    errors.push('Power progression reversed: '+id+'/'+frame.minute);
  }
  prev=rows;
 }
 const last=match.frames?.at(-1)?.powerEconomy;
 if(last){
  const purchased=Object.values(last.entries).reduce((n,p)=>n+p.items.length,0);
  const events=match.events.filter(e=>e.facts?.action==='item_purchase');
  const consumed=events.reduce((n,e)=>n+(e.facts.consumedIds?.length||0),0);
  if(events.length-consumed!==purchased)errors.push('Items bought without events or duplicate purchases');
  // Reconstruct the inventory strictly from receipts. This prevents phantom
  // upgrade credits, forged consumed components and impossible seventh slots.
  const inventories=Object.fromEntries(Object.keys(last.entries).map(id=>[id,[]]));
  for(const event of events){
   const r=event.facts,inventory=inventories[r.actorId];
   if(!inventory){errors.push('Purchase by unknown professional: '+r.actorId);continue}
   for(const ingredient of r.consumedIds||[]){
    const index=inventory.indexOf(ingredient);
    if(index<0)errors.push('Recipe used an unequipped component: '+r.actorId+'/'+ingredient);
    else inventory.splice(index,1);
   }
   if(inventory.includes(r.itemId))errors.push('Duplicate item without sale: '+r.actorId+'/'+r.itemId);
   inventory.push(r.itemId);
   if(inventory.length>6||inventory.length!==r.slot)
    errors.push('Purchase slot does not reflect item ledger: '+r.actorId);
  }
  for(const [id,p] of Object.entries(last.entries)){
   if(JSON.stringify(inventories[id])!==JSON.stringify(p.items))
    errors.push('Final inventory differs from receipts: '+id);
  }
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
   const componentCredit=(f.consumedIds||[]).reduce((n,id)=>n+(COMPONENTS[id]?.cost||0),0);
   if(!ITEMS[f.itemId]||ITEMS[f.itemId].cost-componentCredit!==f.goldCost||
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
core.PowerEconomy=Object.freeze({create,advance,awardFarm,rewardEvent,nextPurchase,roleAffinity,
 shouldRecall,purchase,boost,teamEquipment,snapshot,audit,ITEM_CATALOG,COMPONENT_CATALOG,nextLevel});
})(globalThis);
