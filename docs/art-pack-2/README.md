# Art Pack 2 — ítems y componentes

Treinta iconos originales generados con el Art Pack 1 como referencia de estilo: ilustración 2D de fantasía low-poly, planos facetados, sombreado cel suave, volumen aparente y luz superior izquierda. Fondos oscuros opacos, sin texto integrado ni efectos que oculten la silueta.

## Archivos

- `assets/inventory/items_atlas.png`: 640 × 384 px, cinco columnas y tres filas, celdas de 128 px.
- `assets/inventory/components_atlas.png`: mismas dimensiones y distribución.
- `assets/inventory/items_atlas.json` y `components_atlas.json`: entradas con `id`, `name`, `x`, `y`, `width`, `height`, `atlas`, `icon128`, `icon64`, `icon32` y `visualOnly`. Todas las rutas son relativas a la raíz del juego, no a la ubicación del JSON.
- `assets/inventory/items/` y `components/`: PNG maestros de 128 px; subdirectorios `64/` y `32/` para las exportaciones compactas. Total: 90 PNG individuales.
- `assets/inventory/source/`: las dos fuentes generadas, conservadas para reconstrucción.
- En esta carpeta: vistas de los treinta iconos a 32 y 24 px reales; capturas del TAB, móvil, fallback y estadísticas del Match Center.

Orden de ítems por filas:

1. `boots`, `blade`, `mantle`, `focus`, `bulwark`.
2. `spellbook`, `arcane_orb`, `spear`, `reaver`, `wardstone`.
3. `sun_charm`, `aegis`, `bow`, `hourglass`, `crystal`.

Orden de componentes:

1. `leather_boots`, `iron_dagger`, `chain_vest`, `oak_shield`, `magic_page`.
2. `mana_orb`, `ruby_shard`, `azure_crystal`, `hunter_string`, `sun_fragment`.
3. `ward_totem`, `bronze_handle`, `tempered_plate`, `focus_lens`, `green_charm`.

## Integración y límites

`src/ui/item-art.js` expone `RiftItemArt.catalogs`, `get(id, kind)` e `image(id, kind)`, donde `kind` es `items` o `components`. El script se carga después de `PowerEconomy` y antes de `match-tab.js`. Los cinco nombres activos proceden del catálogo real `PowerEconomy.ITEM_CATALOG`; no se duplican en el catálogo nuevo. Si cambia un nombre del core, reconstruir los manifiestos para reflejarlo.

Solo hay cinco ítems comprables en la versión actual. Los otros diez ítems y los quince componentes llevan `visualOnly: true`: no se añaden al catálogo económico, no tienen precios, estadísticas, recetas ni asignación automática. Las futuras recetas pueden consultar `RiftItemArt.get('iron_dagger', 'components')` sin modificar esta capa visual.

`RiftMatchTab.itemSlot` mantiene el SVG actual debajo del PNG, la etiqueta accesible y el título. El PNG de 32 px usa `srcset` de 64 px para pantallas densas y se elimina al fallar la carga, dejando el SVG visible sin petición adicional. Si falta el script de arte, los cinco ítems históricos siguen mostrando su SVG. Los objetos desconocidos y huecos no generan rutas de imágenes inventadas.

El TAB conserva sus seis espacios por profesional. El Match Center reutiliza el mismo renderer junto a los nombres de las compras del snapshot seleccionado. No cambia los inventarios, el cursor de replay, las asignaciones, la simulación ni los guardados. Los componentes no aparecen como compras actuales.

Para usar `RiftItemArt.image` en otra UI, el consumidor debe proporcionar un contenedor posicionado, un fallback propio y una etiqueta accesible: el elemento `img` es decorativo para evitar lectura duplicada.

## Reconstrucción y pruebas

El juego sigue siendo estático y no requiere un build ni dependencias nuevas en tiempo de ejecución. El pipeline de arte necesita Node.js e ImageMagick 7:

```sh
node scripts/build-item-atlases.mjs
node scripts/check-item-atlases.mjs
node scripts/check-static.mjs
node --test
```

El pipeline usa límites medidos de las fuentes generadas, elimina sus separadores, remuestrea con Lanczos y crea celdas exactamente cuadradas. Si se sustituye la fuente, revisar esos límites. La validación comprueba 90 dimensiones/opacidades, correspondencia con el catálogo y la igualdad píxel a píxel de las 30 celdas con sus iconos individuales. Los tests normales no requieren ImageMagick.

Con Playwright y Chromium disponibles, servir la raíz del juego y ejecutar:

```sh
CHROMIUM_PATH=/usr/bin/chromium node scripts/check-item-art-browser.cjs http://127.0.0.1:8765/
```

El test comprueba la descarga de los 90 PNG, compras reales en una exhibición completada, imágenes 2x, móvil, fallback SVG al bloquear PNG, ausencia de excepciones JS y ausencia de escrituras en localStorage.

Revisión visual a 24/32 px: se distinguen botas, filo, manto, instrumento focal y escudo; los escudos sólido/espectral tienen siluetas y colores diferentes. En componentes se distinguen esfera, fragmento y prisma, además de cuerda, chaleco y placa. Los detalles pequeños se simplifican; la identificación depende de la silueta y el color, no de texto dentro del icono.

## Evidencias de esta integración

Base local: Art Pack 1, commit `260aca1`. No hay modificaciones en `src/core/`; los cambios en `game.js` se limitan a `renderPlayerScoreboard`.

- `validation-browser.txt`: prueba de Chromium correcta. Se han revisado las capturas de escritorio, móvil, Match Center y fallback.
- `validation-balance.json`: 1.000 mapas completos y auditados, cero errores; 500 pares espejados (1.000 mapas), cero errores. Los objetos `standard` y `mirror` son idénticos por comparación profunda a `docs/art/validation-balance.json`, generado antes de Art Pack 2; solo cambian metadatos de ejecución.
- Validación gráfica correcta: 30 IDs/nombres, 90 tamaños y opacidades y 30 celdas idénticas a sus PNG maestros. Sin imágenes pendientes.
- `validation-tests.txt`: `node --test` completo, 30 archivos correctos y cero fallos. Sintaxis de `game.js`, módulos de UI y scripts de arte, recursos estáticos y `git diff --check` correctos.
