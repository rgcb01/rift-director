import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = name => readFileSync(join(root, name), 'utf8');
for (const name of ['index.html', 'legacy-moba.html', 'card-game.html', 'card-game.css', 'card-game-mobile.css', 'collection.html', 'deck-builder.html', 'src/card-game/demo-ui.mjs', 'styles.css', 'game.js', 'src/core/rng.js', 'src/core/state.js', 'src/core/calendar.js', 'src/core/persistence.js', 'src/core/finance.js', 'src/core/map-state.js', 'src/core/minimap-graph.js', 'src/core/lane-economy.js', 'src/core/nexus-siege.js', 'src/core/power-economy.js', 'src/core/neutral-objectives.js', 'src/core/shutdowns.js', 'src/core/navigation.js', 'src/core/macro-policy.js', 'src/core/vision-wards.js', 'src/core/tactical-ai.js', 'src/core/counterplay.js', 'src/core/encounters.js', 'src/core/minimap-simulation.js', 'src/core/match-stats.js', 'src/core/match-events.js', 'src/ui/minimap.js', 'src/ui/match-tab.js', 'src/core/broadcast.js', 'src/core/replay.js', 'README.md', 'ROADMAP.md', 'CHANGELOG.md']) {
  const path = join(root, name);
  assert.ok(existsSync(path), `Falta ${name}`);
  assert.ok(statSync(path).size > 0, `Archivo vacío: ${name}`);
}
const landing = read('index.html');
assert.match(landing, /<html[^>]+lang=["']es["']/i, 'Falta idioma español en la portada');
assert.match(landing, /id=["']card-game-app["']/i, 'La portada debe mostrar el juego de cartas');
assert.match(landing, /href=["']\.\/card-game\.css["']/i, 'La portada necesita el estilo del card game');
assert.match(landing, /href=["']\.\/card-game-mobile\.css["']/i, 'La portada necesita el estilo móvil');
assert.match(landing, /src=["']\.\/src\/card-game\/demo-ui\.mjs["']/i, 'Falta módulo principal del Card Game');
const landingResources=[...landing.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
 .map(match=>match[1]).filter(ref=>!/^\w+:|^\/\//.test(ref));
for(const ref of landingResources){
 const clean=ref.replace(/^\.\//,'').split(/[?#]/)[0];
 assert.ok(!clean.includes('..'), 'Recurso fuera de la raíz: '+ref);
 assert.ok(existsSync(join(root,clean)), 'Recurso faltante en el Card Game: '+ref);
}
const html = read('legacy-moba.html');
assert.match(html, /<html[^>]+lang=["']es["']/i, 'Se esperaba idioma español');
assert.match(html, /id=["']app["']/i, 'Falta el punto de montaje #app');
assert.match(html, /<link[^>]+href=["']styles\.css["']/i, 'Falta la hoja de estilos');
assert.match(html, /<script[^>]+src=["']game\.js["']/i, 'Falta el script del juego');

const resources = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
  .map(m => m[1])
  .filter(ref => !/^(?:https?:|\/\/|data:|mailto:|#)/i.test(ref));
for (const ref of resources) {
  const clean = ref.split(/[?#]/)[0];
  assert.ok(!clean.includes('..'), `Recurso fuera de la raíz: ${ref}`);
  assert.ok(existsSync(join(root, clean)), `Recurso local no encontrado: ${ref}`);
}
assert.match(read('src/core/persistence.js', 'src/core/finance.js', 'src/core/map-state.js', 'src/core/minimap-graph.js', 'src/core/lane-economy.js', 'src/core/navigation.js', 'src/core/macro-policy.js', 'src/core/vision-wards.js', 'src/core/tactical-ai.js', 'src/core/minimap-simulation.js', 'src/core/match-stats.js', 'src/core/match-events.js', 'src/ui/minimap.js', 'src/core/broadcast.js', 'src/core/replay.js'), /rift_director_v02_save/, 'Falta clave de guardado v2');
const order = ['src/core/rng.js', 'src/core/state.js', 'src/core/calendar.js', 'src/core/persistence.js', 'src/core/finance.js', 'src/core/map-state.js', 'src/core/minimap-graph.js', 'src/core/lane-economy.js', 'src/core/navigation.js', 'src/core/macro-policy.js', 'src/core/vision-wards.js', 'src/core/tactical-ai.js', 'src/core/minimap-simulation.js', 'src/core/match-stats.js', 'src/core/match-events.js', 'src/ui/minimap.js', 'src/core/broadcast.js', 'src/core/replay.js', 'game.js'];
let previous = -1;
for (const entry of order) {
  const position = html.indexOf('src="' + entry + '"');
  assert.ok(position > previous, 'Orden de scripts incorrecto: ' + entry);
  previous = position;
}
console.log('OK: Card Game como portada, MOBA archivado accesible, recursos locales y guardados separados.');
