# Art Pack 03 — Club & Competition Identity

Dirección: **Rift Faceted Fantasy — Competitive Edition**. Maestros SVG originales dibujados con geometría vectorial: heráldica angular, planos de color, profundidad discreta y acentos metálicos. No son placeholders ni imágenes rasterizadas incrustadas. El wordmark también usa trazados propios, sin fuentes externas.

## Entregables

| Categoría | Cantidad | Contenido |
| --- | ---: | --- |
| Clubes | 23 | Los 22 nombres reales de `clubNames` y Aurora Esports |
| Institucionales | 5 | `rift_director_logo`, `rift_director_symbol`, `rift_director_wordmark`, `rift_championship`, `rift_league` |
| Competiciones | 8 | Aurora, Boreal, regular, playoffs, semifinal, final, campeón de liga e internacional futuro |
| Símbolos modulares | 16 | Animales, astronomía, naturaleza, forja, ancla y tecnología |
| Siluetas modulares | 8 | Escudo, hexágono, rombo, medallón, estandarte, bastión, alado y octágono |

Son **60 SVG** (36 identidades + 24 piezas modulares) y **36 PNG de 256 × 256**, con transparencia y proporciones conservadas. El wordmark horizontal se centra sin deformación dentro del PNG cuadrado; su SVG conserva el formato horizontal. Los logos completos con nombre se destinan a cabeceras: a 24 px se utiliza el isotipo, no se intenta leer texto diminuto.

## Archivos

```text
assets/branding/
  branding.json         Manifiesto; rutas relativas a assets/branding/
  clubs/                23 maestros de organización
  institutionals/       5 maestros institucionales
  competitions/         8 maestros de competición
  symbols/              16 motivos reutilizables para clubes personalizados
  shapes/               8 siluetas
  png/                  36 versiones compatibles de 256 px
src/ui/branding.js      Fuente vectorial y resolución pura de identidad
scripts/build-branding.mjs
scripts/check-branding-browser.cjs
docs/art-pack-03/       Hojas de revisión, capturas y resultados de validación
```

`review_dark.png` y `review_light.png` reúnen las 36 identidades; los SVG de esas hojas también están incluidos. `review.html` muestra cada maestro a 24, 48 y 96 px sobre ambos fondos; las exportaciones individuales permiten revisar 256 px. No hace falta un atlas rasterizado para usar las identidades.

## Identidad estable y paletas

El repositorio asigna IDs de mundo (`c…`) y un `logo` numérico al generar clubes. No son identificadores globales de marca. `RiftBranding.resolve` busca el **nombre normalizado exacto** en el catálogo, sin consultar la posición, la liga, el RNG o el número de escudo. Se cubren también nombres que pueden aparecer más adelante por expansión o sustitución de organizaciones.

El maestro de una organización mantiene siempre la misma geometría. En el juego se aplica su `color` guardado como principal y se respeta `secondaryColor`/`accent` si existen; si faltan se usan los colores del manifiesto. Así se evita cambiar la paleta de partidas existentes. Las hojas de revisión muestran la paleta editorial de cada maestro: una partida puede tener colores distintos porque el modelo previo ya los guardó así.

Los clubes personalizados tienen prioridad sobre coincidencias de nombre: una organización del jugador llamada igual que un club del catálogo conserva su selección modular cuando dispone de `branding`. Los símbolos de liga/campeonato no están entre los seleccionables para clubes. Aurora y Boreal tienen emblemas propios, diferentes de los clubes Aurora Esports y Polar Rift.

## Guardados y creación

El formulario permite elegir símbolo, silueta, color principal, secundario y acento, con vista previa. Al fundar el club se añade únicamente este campo visual opcional:

```json
{
  "branding": {
    "version": 1,
    "shape": "bastion",
    "symbol": "wolf",
    "primaryColor": "#6a9fd5",
    "secondaryColor": "#e0d6b8",
    "accent": "#d6a35c"
  }
}
```

El nombre sigue en `club.name`; el color principal se refleja también en `club.color`, utilizado por los retratos existentes. Guardar, cargar y exportar JSON conserva estos datos sin migración: el formato continúa en **v2**. No se reemplazan IDs, no se modifica el validador del núcleo y no se consumen tiradas aleatorias adicionales. La generación deportiva de mundos permanece intacta; la selección visual se aplica desde el flujo de creación de la UI.

Orden de resolución: identidad modular válida → maestro del club por nombre → `legacyCrest` original. Las partidas históricas de clubes desconocidos conservan exactamente su escudo previo. Un campo visual inválido o de versión desconocida no ejecuta contenido ni genera URLs; vuelve al maestro conocido o al fallback histórico.

## Integración

`crest()` centraliza la resolución para dashboard, plantillas, mercado/perfiles de jugadores, perfiles de organizaciones, calendario/próximo enfrentamiento, clasificaciones, noticias/fichajes y scoreboard. El TAB recibe esa misma función, incluyendo el fallback de clubes históricos. No se modifican los Art Packs 01/02.

La cabecera/bienvenida usan logo, isotipo y wordmark. Las tablas de liga usan **Liga Aurora** y el nombre real **Circuito Boreal** (`liga_boreal` es el ID de asset). Las fases se resuelven a partir de los fixtures existentes; cuando un replay no conserva la fase exacta, se muestra el emblema genérico de playoffs.

El panel de campeonatos muestra solo playoffs y campeones ya presentes en el estado. `international_champion` está marcado `futureOnly: true` y no aparece como competición jugable ni como título obtenido. Las capturas de playoffs usan un guardado de prueba aislado para comprobar esas fases; no representan resultados producidos por esta actualización.

Los maestros se renderizan **inline**, desde la misma fuente que exporta los SVG individuales. Esto permite conservar los colores guardados y evita imágenes rotas o dependencias de descargas. Bloquear `assets/branding/` no afecta a los escudos de la UI; si falta `branding.js`, `crest()` utiliza el SVG histórico. No hay librerías adicionales para ejecutar el juego.

## Reconstrucción y validación

Para reconstruir assets y hojas de revisión: Node.js, Inkscape e ImageMagick, solo como herramientas de desarrollo.

```sh
node scripts/build-branding.mjs
node --check game.js
node --check src/ui/branding.js
node scripts/check-static.mjs
node --test
```

Prueba opcional con Playwright/Chromium y el servidor local iniciado:

```sh
python -m http.server 8765 --bind 127.0.0.1
CHROMIUM_PATH=/usr/bin/chromium node scripts/check-branding-browser.cjs
```

Comprueba los 60 SVG y 36 PNG, creación personalizada y recarga, pantallas de gestión, competición, móvil y fallback al faltar el script. Las pruebas funcionales incluyen catálogo completo, resolución independiente de ID/posición, colores guardados, combinaciones modulares, compatibilidad v2 y ausencia de mutaciones al renderizar. Los tests golden existentes verifican las huellas deportivas y financieras.

## Límites

No se incorpora un editor posterior a la fundación ni carga de logos externos. La identidad de clubes conocidos se resuelve por nombre porque no existe un ID global de marca en el modelo actual; un futuro sistema de renombrado de organizaciones deberá conservar explícitamente esa identidad. El emblema internacional es un recurso preparado, sin reglas ni torneo asociado. No faltan assets obligatorios.

## Resultados registrados

Base: Art Pack 02, commit `7ee258d`. Suite funcional completa: 31 archivos correctos, cero fallos (`validation_tests.txt`). Comprobaciones de sintaxis, recursos y diff correctas. Prueba adicional de persistencia de la identidad al cambiar de temporada: correcta (`validation_identity.txt`).

Chromium valida los 60 SVG sin errores XML y las 36 imágenes PNG, creación personalizada, selección conservada al cambiar la modalidad de inicio, guardado y recarga, dashboard/plantilla/perfil/calendario/clasificaciones/noticias/Match Center, fases del campeonato y fallback sin módulo. Cero excepciones JavaScript (`validation_browser.txt`).

La auditoría completa contiene 1.000 mapas estándar y 500 pares espejados, cero errores. Comparación profunda de `standard` y `mirror` contra `docs/art-pack-2/validation-balance.json`: idénticos; solo cambian los metadatos de ejecución (`validation_balance.json`).
