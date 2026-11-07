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
      getElementById() { return app; },
    },
    localStorage: {
      getItem(k) { return store.get(k) ?? null; },
      setItem(k, v) { store.set(k, v); },
      removeItem(k) { store.delete(k); },
    },
    Date: FixedDate, console, setInterval, clearInterval, setTimeout, clearTimeout,
  };
  for (const path of ['src/core/rng.js', 'src/core/state.js', 'src/core/persistence.js']) {
    vm.runInNewContext(read(path), env, { timeout: 10000, filename: path });
  }
  // Test-only API injection; game.js remains unmodified in production.
  const source = read('game.js');
  const injection = [
    'globalThis.__test = { newGame, simulateMatch, teamPlayers, currentClub,',
    '  save, load, applyMonth, annualProgress, nextYear, simulateWorld,',
    '  getState: () => s };',
    '})();'
  ].join('\n');
  const injected = source.replace(/\}\)\(\);\s*$/, injection);
  if (injected === source) throw new Error('Test harness: no se encontró el cierre de game.js');
  vm.runInNewContext(injected, env, { timeout: 10000, filename: 'game.js' });
  return { sim: env.__test, core: env.RiftCore, store };
}
