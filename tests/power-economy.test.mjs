import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

const testRoster=()=>[
 ...['TOP','JUN','MID','ADC','SUP'].map(role=>({id:'a-'+role,teamId:'a',role})),
 ...['TOP','JUN','MID','ADC','SUP'].map(role=>({id:'b-'+role,teamId:'b',role}))
];
test('XP por experiencia, niveles y economía personal no inventan oro',()=>{
 const {core}=boot();
 const economy=core.PowerEconomy,model=economy.create(testRoster());
 assert.equal(model.entries['a-TOP'].level,1);
 for(let i=0;i<20;i++)economy.rewardEvent(model,{teamId:'a',facts:{
  action:'tower',actorId:'a-TOP',participantIds:['a-TOP']}});
 assert.ok(model.entries['a-TOP'].level>=8);
 assert.equal(model.entries['a-TOP'].xp>=0,true);
 assert.equal(model.entries['b-TOP'].level,1);
 assert.equal(economy.boost(model,'a-TOP','attack')>0,true);
 assert.equal(economy.boost(model,'b-TOP','attack'),0);
 assert.equal(model.entries['a-TOP'].wallet+model.entries['a-TOP'].spent,
  model.entries['a-TOP'].earned);
});

test('ítem equipado: solo se compra con cartera suficiente y estando en base',()=>{
 const {core}=boot();
 const economy=core.PowerEconomy,model=economy.create(testRoster());
 const a={id:'a-ADC',teamId:'a',role:'ADC',alive:true,node:'blue_bot_front'};
 const nav={a:'a',b:'b',agents:{[a.id]:a}};
 const world={gold:{a:25000,b:30000}};
 assert.equal(economy.purchase(model,nav,a,34,world),null,'Sin teleport de tienda');
 const p=model.entries[a.id];p.wallet+=4000;p.earned+=4000;
 a.node='blue_fountain';
 const first=economy.purchase(model,nav,a,34,world);
 assert.ok(first&&first.goldCost>0);
 assert.equal(first.slot,1);
 assert.equal(first.node,'blue_fountain');
 assert.equal(first.voluntaryRecall,false);
 assert.equal(p.voluntaryBuys,0,'Comprar tras reaparecer no consume un reset');
 assert.equal(economy.shouldRecall(model,nav,a,35,world,{health:{[a.id]:50}}),false,
  'Un profesional ya en fuente no debe simular una retirada voluntaria');
 assert.equal(p.wallet+p.spent,p.earned);
 assert.ok(economy.boost(model,a.id,'attack')>0);
 assert.equal(economy.purchase(model,nav,a,34,world),null,'No dos compras en el mismo minuto');
 for(let t=35;t<40;t++)economy.purchase(model,nav,a,t,world);
 assert.ok(p.items.length<=3);
 assert.equal(new Set(p.items).size,p.items.length);
});

test('70 mapas: compras y power spikes aparecen en hechos y replays causales',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Power QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
   f.a===world.userClub||f.b===world.userClub);
 let purchases=0,progressions=0,withItem=0,recallBuys=0,fountainBuys=0,before30=0,recallTravel=0;
 for(let i=1;i<=70;i++){
  world.rng=i*95117;
  const m=sim.simulateMatch(fixture);
  assert.ok(m.winner,'Sin ganador: '+i);
  const errors=[
   ...core.PowerEconomy.audit(m),
   ...core.LaneEconomy.audit(m),
   ...core.Navigation.auditNavigation(m,world),
   ...core.Encounters.audit(m,world),
   ...core.auditMatch(m,world),
   ...core.auditMinimap(m,world),
   ...core.MatchReplay.auditMoments(m,world),
   ...core.auditBroadcast(m,world)
  ];
  assert.equal(errors.length,0,'Seed '+i+': '+errors.slice(0,5).join(' | '));
  const end=m.frames.at(-1);
  const rows=Object.values(end.powerEconomy.entries);
  purchases+=m.events.filter(e=>e.facts?.action==='item_purchase').length;
  m.events.forEach((e,i)=>{
   if(e.facts?.action!=='item_purchase')return;
   if(e.facts.node.endsWith('_fountain'))fountainBuys++;
   if(e.minute<30)before30++;
   if(m.moments[i].navigation.before[e.facts.actorId].intent==='shop_recall')recallBuys++;
  });
  for(const fr of m.frames)
   recallTravel+=Object.values(fr.navigation.before).filter(a=>a.intent==='shop_recall').length;
  if(rows.some(r=>r.level>9))progressions++;
  if(rows.some(r=>r.items.length))withItem++;
  for(const e of m.events.filter(e=>e.facts?.action==='item_purchase')){
   const f=e.facts;
   const moment=m.moments[m.events.indexOf(e)];
   assert.equal(moment.navigation.before[f.actorId].node,f.node);
  }
 }
 assert.ok(purchases>40,'Las compras deben suceder en partidas reales');
 assert.ok(withItem>25,'La tienda jamás se usa');
 assert.ok(progressions>25,'Los profesionales no suben de nivel');
 console.log('POWER_SAMPLE='+JSON.stringify({purchases,withItem,progressions,recallBuys,fountainBuys,before30,recallTravel}));
});

test('el oro de objetivos llega a los jugadores y modifica su poder real',()=>{
 const {core}=boot();
 const roster=testRoster().map(p=>({...p,a:{mech:62,macro:60,vision:58,comm:56},
   beh:{agg:50,team:50}}));
 const model=core.PowerEconomy.create(roster);
 const before=model.entries['a-TOP'].wallet;
 core.PowerEconomy.rewardEvent(model,{teamId:'a',facts:{
  action:'plate',actorId:'a-TOP',participantIds:['a-TOP'],goldReward:125
 }});
 assert.equal(model.entries['a-TOP'].wallet,before+125);
 const walletsBefore=Object.values(model.entries).filter(p=>p.teamId==='a')
  .reduce((n,p)=>n+p.wallet,0);
 core.PowerEconomy.rewardEvent(model,{teamId:'a',facts:{
  action:'tower',actorId:'a-TOP',participantIds:['a-TOP'],
  firstTowerBonus:300
 }});
 const walletsAfter=Object.values(model.entries).filter(p=>p.teamId==='a')
  .reduce((n,p)=>n+p.wallet,0);
 assert.equal(walletsAfter-walletsBefore,720,
  'La primera torre debe distribuir exactamente 420+300 entre el quinteto');
 const players=Object.fromEntries(roster.map(p=>[p.id,p]));
 const nav={
  a:'a',b:'b',
  agents:{
   'a-TOP':{id:'a-TOP',teamId:'a',role:'TOP',node:'blue_top_front',alive:true,intent:'lane'},
   'b-TOP':{id:'b-TOP',teamId:'b',role:'TOP',node:'red_top_front',alive:true,intent:'lane'}
  }
 };
 const args={nav,dead:{},minute:11,players,health:{'a-TOP':100,'b-TOP':100},
  seed:217,mode:'lane',teamId:'a',attackerIds:['a-TOP'],targetIds:['b-TOP'],lane:'TOP'};
 const normal=core.Encounters.resolveCombat(args);
 assert.ok(normal?.impacts?.length,'Sin objetivo real en carril');
 model.entries['a-TOP'].level=12;
 model.entries['a-TOP'].items=['blade','focus'];
 const equipped=core.Encounters.resolveCombat({...args,powerState:model});
 assert.ok(equipped.impacts[0].damage>normal.impacts[0].damage,
  'Los niveles e ítems deben cambiar el daño real, no solo la narración');
});

test('regreso táctico: lesión y compra justifican el viaje, no el mero oro acumulado',()=>{
 const {core}=boot();
 const E=core.PowerEconomy,model=E.create(testRoster());
 const nav={a:'a',b:'b',siegeTeam:null,agents:Object.fromEntries(testRoster().map(p=>
  [p.id,{...p,alive:true,intent:'lane',
    node:p.teamId==='a'?'blue_top_front':'red_top_front'}]))};
 const world={gold:{a:13000,b:15300}};
 const p=nav.agents['a-TOP'],row=model.entries[p.id];
 row.wallet+=5500;row.earned+=5500;
 const health=Object.fromEntries(testRoster().map(p=>[p.id,100]));
 assert.equal(E.shouldRecall(model,nav,p,20,world,{health}),false,
  'Un jugador sano no abandona la línea solo por tener oro');
 health[p.id]=63;
 assert.equal(E.shouldRecall(model,nav,p,20,world,{health}),true,
  'Un jugador herido puede transformar el oro en una compra útil');
 p.intent='shop_recall';
 nav.siegeTeam='a';
 health[p.id]=100;
 assert.equal(E.shouldRecall(model,nav,p,29,world,{health}),true,
  'Un reset en ruta mantiene el compromiso hasta llegar a la base');
 p.node='blue_nexus';
 const buy=E.purchase(model,nav,p,29,world);
 assert.equal(buy?.voluntaryRecall,true);
 assert.equal(row.voluntaryBuys,1);
 assert.equal(E.shouldRecall(model,nav,p,30,world,{health}),false,
  'Una compra completada no puede reiniciar otro regreso consecutivo');
 p.intent='lane'; // Navigation releases the traveler on the following minute.
 const other=nav.agents['a-MID'],second=model.entries[other.id];
 second.wallet+=5500;second.earned+=5500;
 health[other.id]=51;
 assert.equal(E.shouldRecall(model,nav,other,42,world,{health}),true,
  'Un compañero herido puede comprar después del primer reset');
 nav.siegeTeam='b';health[other.id]=67;
 assert.equal(E.shouldRecall(model,nav,other,42,world,{health}),false,
  'Un asedio activo no debe perder un jugador suficientemente sano');
});
