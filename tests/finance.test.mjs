import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const snapshot = value => JSON.stringify(value);
const fresh = () => {
  const context = boot({ now: 1731111111000 });
  const world = context.sim.newGame('balanced', 'QA Finance');
  return { ...context, world, user: context.sim.currentClub() };
};

test('cotización mensual pura: desglose idéntico al sistema Alpha 0.2', () => {
  const { core, world, user } = fresh();
  const before = snapshot(world);
  const lookup = id => world.players.find(p => p.id === id);
  const quote = core.quoteMonth(world, user, lookup);
  const plan = world.plan;
  const sponsorBase = user.sponsor?.monthly || 0;
  let sponsor = Math.round(sponsorBase * (.76 + world.leagueHype / 250));
  const fulfilled = !(user.sponsor?.obligation === 'content' && plan.content < 1 ||
    user.sponsor?.obligation === 'community' && plan.community < 1);
  if (!fulfilled) sponsor = Math.round(sponsor * .76);
  const expected = {
    sponsor,
    merch: Math.round(user.fans * (.17 + .028 * plan.content) * (1 + (world.merchTier || 0) * .17)),
    league: 40000 + Math.round(world.leagueHype * 105),
    media: plan.content * 6200 + plan.community * 1200,
  };
  const expectedIncome = expected.sponsor + expected.merch + expected.league + expected.media;
  const salaries = user.roster.reduce((sum,id)=>sum + (lookup(id)?.wage||0),0);
  const expectedOut = { salaries, staff:user.staff*9000,ops:34000+(world.merchTier||0)*6800,
    program:(plan.community||0)*9000+(plan.content||0)*5000+(plan.scout||0)*4500 };
  const expectedExpenses = Object.values(expectedOut).reduce((a,b)=>a+b,0);
  assert.equal(snapshot(quote),snapshot({...expected,income:expectedIncome,...expectedOut,expenses:expectedExpenses,fulfilled}));
  assert.equal(snapshot(world),before,'Cotizar no debe modificar el universo');
  world.plan.content=0;
  const penalty=core.quoteMonth(world,user,lookup);
  assert.equal(penalty.fulfilled,false);
  assert.ok(penalty.sponsor < quote.sponsor);
});

test('transferencias son atómicas: sin fondos no se mueven saldos', () => {
  const { core } = fresh();
  const buyer={cash:500},seller={cash:800};
  assert.equal(core.transferCash(buyer,seller,501),false);
  assert.equal(buyer.cash,500);assert.equal(seller.cash,800);
  assert.equal(core.transferCash(buyer,seller,500),true);
  assert.equal(buyer.cash,0);assert.equal(seller.cash,1300);
  assert.throws(()=>core.transferCash(buyer,seller,-1),/Transferencia inválida/);
  assert.throws(()=>core.transferCash(buyer,buyer,1),/Transferencia inválida/);
  assert.throws(()=>core.adjustCash(buyer,NaN),/Cantidad inválida/);
});

test('fichar agente libre descuenta solo una vez y mantiene relaciones', () => {
  const { sim, core, world, user } = fresh();
  const agent=world.players.find(p=>p.teamId===null&&!p.retired);
  const fee=core.marketPrice(agent);
  const before=user.cash;
  sim.signFreeAgent(agent.id);
  assert.equal(before-user.cash,fee);
  assert.equal(agent.teamId,user.id);
  assert.ok(user.roster.includes(agent.id));
  const after=user.cash;
  sim.signFreeAgent(agent.id);
  assert.equal(user.cash,after,'Fichaje duplicado debitó caja');
  assert.equal(user.roster.filter(id=>id===agent.id).length,1);
  assert.equal(core.validateWorld(world).length,0);
});

test('venta no acepta comprador insolvente y conserva caja total', () => {
  const { sim, core, world, user } = fresh();
  const bench=user.roster.map(id=>world.players.find(p=>p.id===id))
    .find(p=>!Object.values(user.lineup).includes(p.id));
  assert.ok(bench,'Club inicial sin suplente');
  bench.value=2_000_000;
  const price=core.salePrice(bench,world.year*12+world.month);
  const possible=world.clubs.filter(c=>c.id!==user.id && c.region===user.region);
  for (const buyer of possible) buyer.cash=700_000;
  const state=snapshot(world);
  sim.sellPlayer(bench.id);
  assert.equal(snapshot(world),state,'Venta sin fondos modificó el universo');
  const buyer=possible[0];buyer.cash=3_000_000;
  const beforeBuyer=buyer.cash,beforeUser=user.cash;
  sim.sellPlayer(bench.id);
  assert.equal(buyer.cash,beforeBuyer-price);
  assert.equal(user.cash,beforeUser+price);
  assert.equal(bench.teamId,buyer.id);
  assert.ok(!user.roster.includes(bench.id));
  const afterUser=user.cash;
  sim.sellPlayer(bench.id);
  assert.equal(user.cash,afterUser,'Se pagó dos veces la misma venta');
  const issues=core.validateWorld(world);
  assert.equal(issues.length,0,issues.join(' / '));
});

test('sponsors, instalaciones y scouting respetan gastos previstos', () => {
  const { sim, core, world, user } = fresh();
  const firstOffer=world.offers[0];
  const fee=user.sponsor.remaining>0?Math.round(user.sponsor.monthly*.65):0;
  const before=user.cash;
  sim.chooseSponsor(firstOffer.id);
  assert.equal(before-user.cash,fee);
  assert.equal(user.sponsor.name,firstOffer.name);
  const second=user.cash;
  sim.upgrade('staff');
  assert.equal(second-user.cash,170000);
  const agent=world.players.find(p=>p.teamId===null&&!p.retired);
  const third=user.cash;
  sim.scoutPlayer(agent.id);
  assert.equal(third-user.cash,8500);
  assert.equal(core.validateWorld(world).length,0);
});

test('pagar una crisis puede activar insolvencia sin efectivo negativo', () => {
  const { sim, core, world, user } = fresh();
  user.cash=1000;
  world.crisis={id:'crisis-test',kind:'sponsor',amount:150000};
  sim.resolveCrisis('audit');
  assert.equal(world.over,true);
  assert.equal(user.cash,0);
  assert.equal(world.crisis,null);
  assert.equal(core.validateWorld(world).length,0);
});
