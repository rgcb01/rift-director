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
 let purchases=0,progressions=0,withItem=0;
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
 console.log('POWER_SAMPLE='+JSON.stringify({purchases,withItem,progressions}));
});
