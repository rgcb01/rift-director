import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot as createHarness } from './harness.mjs';
const boot = () => createHarness().sim;

test('universo inicial: equipos, roles y calendario válidos', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  assert.equal(s.v, 2);
  assert.equal(s.clubs.length, 16);
  assert.equal(s.year, 2027);
  assert.equal(s.month, 1);
  assert.equal(Object.keys(s.fixtures).length, 12);
  for (const club of s.clubs) {
    const players = sim.teamPlayers(club);
    assert.equal(players.length, 5, `Plantilla incompleta: ${club.name}`);
    assert.equal(new Set(players.map(p => p.role)).size, 5, `Roles repetidos: ${club.name}`);
  }
});

test('200 partidos en cuatro mundos reproducibles: ganador causal, nexo y eventos cronológicos', () => {
  // Separate the world-generation seed from the match seed. Both are
  // fixed and logged so validation and balance CI exercise the same games.
  for (const now of [1731111111000,1731152352211,1731441040688,1794456390000]) {
    const {sim,core}=createHarness({now});
    const s=sim.newGame('balanced', 'QA Esports');
    const fixture=Object.values(s.fixtures).flat().find(f=>[f.a,f.b].includes(s.userClub));
    assert.ok(fixture, 'No se encontró un partido del usuario');
    for (let seed=1; seed<=50; seed++) {
      s.rng=seed*1777;
      const match=sim.simulateMatch(fixture);
      const label='world '+now+' seed '+seed;
      assert.ok([fixture.a,fixture.b].includes(match.winner), 'Ganador inválido: '+label);
      assert.ok(match.frames.length>0, 'Sin snapshots: '+label);
      assert.ok(match.events.length>0, 'Sin narración: '+label);
      assert.match(match.events.at(-1).title, /NEXO/, 'Sin destrucción del nexo: '+label);
      const errors=[...core.auditMatch(match,s),...core.Navigation.auditNavigation(match,s),...core.NexusSiege.audit(match)];
      assert.equal(errors.length,0,label+': '+errors.slice(0,4).join(' | '));
      for (const [i,e] of match.events.entries()) {
        if(i>0)assert.ok(e.minute>=match.events[i-1].minute,'Evento fuera de orden: '+label);
        if(!['tower_damage','tower','plate'].includes(e.facts?.action))continue;
        const enemyNexus=(e.teamId===fixture.a?'red':'blue')+'_nexus';
        const before=match.moments[i].navigation.before;
        for(const id of e.facts.participantIds||[]){
          const p=before[id];
          assert.ok(p.intent!=='siege'||p.goal!==enemyNexus,
            'Un atacante comprometido con el Nexo no debe ser reclutado por otra torre: '+label);
        }
      }
    }
  }
});

test('misma partida y semilla producen el mismo partido', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  const fixture = Object.values(s.fixtures).flat()[0];
  s.rng = 12783;
  const a = sim.simulateMatch(fixture);
  s.rng = 12783;
  const b = sim.simulateMatch(fixture);
  assert.equal(JSON.stringify({winner:a.winner,events:a.events,frames:a.frames}),
               JSON.stringify({winner:b.winner,events:b.events,frames:b.frames}));
});

test('cierre mensual: ingresos - gastos = variación de caja', () => {
  const sim = boot();
  sim.newGame('balanced', 'QA Esports');
  const cash = sim.currentClub().cash;
  const report = sim.applyMonth();
  assert.equal(report.cashBefore, cash);
  assert.equal(report.income - report.expenses, report.net);
  assert.equal(report.cashAfter, cash + report.net);
});

test('insolvencia: caja se trunca en cero y partida termina', () => {
  const sim = boot();
  sim.newGame('balanced', 'QA Esports');
  sim.currentClub().cash = 1;
  sim.currentClub().staff = 10000;
  sim.applyMonth();
  assert.equal(sim.currentClub().cash, 0);
  assert.equal(sim.getState().over, true);
});

test('persistencia local: save/load restaura mes y caja', () => {
  const sim = boot();
  const s = sim.newGame('balanced', 'QA Esports');
  s.month = 6;
  s.rng = 87654;
  const cash = sim.currentClub().cash;
  sim.save();
  s.month = 9;
  sim.currentClub().cash = -3;
  assert.equal(sim.load(), true);
  assert.equal(sim.getState().month, 6);
  assert.equal(sim.getState().rng, 87654);
  assert.equal(sim.currentClub().cash, cash);
});
