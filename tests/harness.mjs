import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(root + path, 'utf8');

// Loads the SAME classic scripts used by Pages, in the same order.
export function boot(options = {}) {
  const store = new Map();
  const app = { innerHTML: '' };
  const now = options.now ?? Date.now();
  class FixedDate extends Date { static now() { return now; } }
  const env = {
    document: {
      addEventListener() {},
      getElementById(id) { return id === 'app' ? app : null; },
      createElement() { return { remove() {} }; },
      body: { appendChild() {} },
    },
    localStorage: {
      getItem(k) { return store.get(k) ?? null; },
      setItem(k, v) { store.set(k, v); },
      removeItem(k) { store.delete(k); },
    },
    Date: FixedDate, console,
    setInterval: () => 1, clearInterval: () => {},
    setTimeout: () => 1, clearTimeout: () => {},
  };
  for (const path of ['src/core/rng.js', 'src/core/state.js', 'src/core/calendar.js', 'src/core/persistence.js', 'src/core/finance.js', 'src/core/map-state.js', 'src/core/minimap-graph.js', 'src/core/lane-economy.js', 'src/core/power-economy.js', 'src/core/navigation.js', 'src/core/tactical-ai.js', 'src/core/encounters.js', 'src/core/minimap-simulation.js', 'src/core/match-stats.js', 'src/core/match-events.js']) {
    vm.runInNewContext(read(path), env, { timeout: 10000, filename: path });
  }
  vm.runInNewContext(read('src/ui/minimap.js'), env, { timeout:10000, filename:'src/ui/minimap.js' });
  vm.runInNewContext(read('src/core/broadcast.js'), env, { timeout:10000, filename:'src/core/broadcast.js' });
  vm.runInNewContext(read('src/core/replay.js'), env, { timeout:10000, filename:'src/core/replay.js' });
  // Test-only API injection; game.js remains unmodified in production.
  const source = read('game.js');
  const injection = [
    'globalThis.__test = { newGame, simulateMatch, teamPlayers, currentClub,',
    '  save, load, applyMonth, annualProgress, nextYear, simulateWorld,',
    '  quickSeasonGame, quickPlayoffGame, makeFinalAfterSemis,',
    '  closeMonth, resolveCrisis, startMatch, finishMatch,',
    '  signFreeAgent, sellPlayer, chooseSponsor, upgrade, scoutPlayer,',
    '  startDemoMatch, replayDemoMatch, exitDemoMatch, liveControl, tick,',
    '  nextReplay, seekReplay, updateReplayCursor,',
    '  handleClick,',
    '  renderMatch, render,',
    '  getDemoActive: () => Boolean(demoBackup), getView: () => view,',
    '  getState: () => s };',
    '})();'
  ].join('\n');
  const injected = source.replace(/\}\)\(\);\s*$/, injection);
  if (injected === source) throw new Error('Test harness: no se encontró el cierre de game.js');
  vm.runInNewContext(injected, env, { timeout: 10000, filename: 'game.js' });
  return { sim: env.__test, core: env.RiftCore, minimapUI: env.RiftMinimap, store, app };
}
