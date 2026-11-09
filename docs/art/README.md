# Retratos de campeones

Diez ilustraciones originales generadas siguiendo la referencia facilitada: fantasía low-poly 2D, facetas geométricas, sombreado cel suave y luz superior izquierda. Fondos oscuros opacos; sin texto, nombres ni marcos decorativos.

Orden del atlas (izquierda a derecha): Hrodan, Korvek, Sereth, Veyra, Aeska / Elaris, Nyra, Velin, Thessa, Drathos. `assets/champions/atlas.json` documenta coordenadas de 256 px y rutas relativas a la raíz del juego. Los PNG de 64 px se usan en el TAB; el atlas 1280 × 512 y los originales de 256 px quedan disponibles para otros consumidores.

El catálogo de `src/ui/match-tab.js` define la ruta del PNG por ID. Cada retrato conserva debajo el SVG original y su etiqueta accesible. Si la descarga falla, se retira únicamente el elemento `img`, dejando visible el SVG sin otra petición ni bucles. Se conserva el tamaño de 36 px (32 px móvil), el nivel y la estructura de filas.

Para reconstruir: `node scripts/build-champion-atlas.mjs` (Node.js e ImageMagick 7). La fuente generada se conserva en `assets/champions/source/portraits-generated.png`; el script elimina los separadores de la fuente, remuestrea cada celda con Lanczos y recompone el atlas sin huecos. No se requiere build para ejecutar el juego.

`champions-48.png` muestra cada icono a 48 px reales. Revisión visual: paletas y siluetas distinguibles; máscara de Korvek, hocico de Sereth, sombrero de Velin y casco de Drathos reconocibles. Detalles diminutos se simplifican a esta escala.

Validaciones de IDs, rutas y dimensiones incluidas en `node --test`. La integración no cambia asignación de campeones, RNG, simulación, economía ni formatos de guardado/replay.

Comprobación opcional en navegador: con Playwright y Chromium instalados y el juego servido localmente, ejecutar `CHROMIUM_PATH=/usr/bin/chromium node scripts/check-champion-portraits-browser.cjs http://127.0.0.1:8765/`. Verifica las diez imágenes del catálogo, una exhibición real, tamaño móvil y fallback al bloquear todas las descargas de PNG; guarda capturas de escritorio, móvil y fallback en esta carpeta. Playwright no es una dependencia del juego ni de la suite funcional.

## Validación realizada

Base: `main` en `9ea1474`. `node --check game.js`, sintaxis de los scripts de arte y UI, `node scripts/check-static.mjs`, `node --test` y `git diff --check` correctos. Resultado de la suite en `validation-tests.txt`.

`node benchmarks/run.mjs portraits-ui /tmp/rift-balance`: 1.000 mapas completos y auditados con cero errores, más 500 pares espejados (1.000 mapas) con cero errores. Resumen en `validation-balance.json`; esta ejecución comprueba las auditorías, no afirma una comparación estadística contra otra versión.

Chromium: diez IDs del catálogo con PNG de 64 × 64 cargados; TAB de exhibición con diez imágenes; tamaño móvil de 32 px; al bloquear las descargas, diez SVG visibles y ningún PNG roto; cero excepciones JavaScript. Capturas `tab-desktop.png`, `tab-mobile.png` y `tab-fallback.png`. Atlas reconstruido idéntico píxel a píxel al atlas gráfico validado (ImageMagick AE = 0).
