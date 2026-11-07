/* Rift Director - deterministic finance rules.
 * Keep the exact Alpha 0.2 calculation order for save and match reproducibility.
 * No RNG, DOM or persistence dependencies.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  function finite(value, label) {
    if (!Number.isFinite(value)) throw new TypeError('Cantidad inválida: ' + label);
    return value;
  }
  function totalWages(club, getPlayer) {
    return club.roster.reduce((sum, id) => sum + (getPlayer(id)?.wage || 0), 0);
  }
  function monthPlanCost(plan) {
    return (plan.community || 0) * 9000 + (plan.content || 0) * 5000 + (plan.scout || 0) * 4500;
  }
  function marketPrice(player) {
    return Math.round(player.value * (player.teamId ? 1 : 0.32));
  }
  function salePrice(player, monthIndex) {
    return Math.round(player.value * (player.signedAt && monthIndex - player.signedAt <= 6 ? .17 : .57));
  }
  function quoteMonth(world, club, getPlayer) {
    const p = world.plan;
    const sponsorBase = club.sponsor?.monthly || 0;
    let sponsor = Math.round(sponsorBase * (.76 + world.leagueHype / 250));
    const fulfilled = !(club.sponsor?.obligation === 'content' && p.content < 1 ||
      club.sponsor?.obligation === 'community' && p.community < 1);
    if (!fulfilled) sponsor = Math.round(sponsor * .76);
    const merch = Math.round(club.fans * (.17 + .028 * p.content) *
      (1 + (world.merchTier || 0) * .17));
    const league = 40000 + Math.round(world.leagueHype * 105);
    const media = p.content * 6200 + p.community * 1200;
    const income = sponsor + merch + league + media;
    const salaries = totalWages(club, getPlayer);
    const staff = club.staff * 9000;
    const ops = 34000 + (world.merchTier || 0) * 6800;
    const program = monthPlanCost(p);
    const expenses = salaries + staff + ops + program;
    return {
      sponsor, merch, league, media, income,
      salaries, staff, ops, program, expenses, fulfilled,
    };
  }
  function adjustCash(club, delta) {
    finite(club.cash, 'saldo anterior');
    finite(delta, 'movimiento');
    club.cash += delta;
    return club.cash;
  }
  function transferCash(buyer, seller, amount) {
    finite(amount, 'precio de transferencia');
    if (amount < 0 || buyer === seller) throw new RangeError('Transferencia inválida');
    finite(buyer.cash, 'saldo de origen');
    finite(seller.cash, 'saldo de destino');
    if (buyer.cash < amount) return false;
    buyer.cash -= amount;
    seller.cash += amount;
    return true;
  }
  core.totalWages = totalWages;
  core.monthPlanCost = monthPlanCost;
  core.marketPrice = marketPrice;
  core.salePrice = salePrice;
  core.quoteMonth = quoteMonth;
  core.adjustCash = adjustCash;
  core.transferCash = transferCash;
})(globalThis);
