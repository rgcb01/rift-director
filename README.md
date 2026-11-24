# Rift Director — Juego de cartas táctico

**Rift Director** es un juego de cartas coleccionables, táctico y original, de cinco Riftborn por escuadra, tres carriles (TOP, MID, BOT), jungla, torres, objetivos neutrales y Nexo. El Director controla su equipo mediante un mazo de órdenes, técnicas y hechizos. **Este es el producto principal a partir de v0.9.1.**

[**Jugar ahora**](https://rgcb01.github.io/rift-director/) · [Construir mazos](https://rgcb01.github.io/rift-director/deck-builder.html) · [Colección y sobres](https://rgcb01.github.io/rift-director/collection.html) · [Reglas](CARD_GAME_RULES.md) · [Roadmap](ROADMAP.md)

> Versión de desarrollo **v0.9.1**, offline-first en un navegador moderno. El juego está en pruebas; no se considera equilibrado para competición. No requiere cuenta ni pagos.

## Cómo se juega

- Selecciona una escuadra de **cinco Riftborn**: un TOP, un MID, dos BOT y un jungla. Construye tu mazo de **20 cartas tácticas**.
- Disputa tres carriles. El frente aporta combates y presión; la retaguardia obtiene recursos. Puedes rotar, curar, usar hechizos y regresar a base.
- Cada jugador tiene **cuatro jugadas por ronda**, alternadas. Las cartas gastan energía; ninguna se juega gratis como reacción fuera del turno.
- Defiende tus torres, reclama los objetivos de la Convergencia y destruye el Nexo enemigo cuando hayas abierto una ruta.
- Juega contra una IA de tres dificultades y cuatro estrategias, o en **hotseat** con otra persona en el mismo dispositivo.
- Gana monedas virtuales contra el bot; abre **sobres de cinco cartas**, consigue fragmentos por duplicados y fabrica cartas de la colección. No hay compras con dinero real.

La base actual incluye **20 Riftborn y 36 cartas tácticas**, tres mazos preconstruidos, editor de mazos, colección local y un tablero móvil que permite enfocar TOP, MID o BOT. Los mazos preconstruidos siguen disponibles incluso sin coleccionar.

## Universo

**Aethra** fue alterada por la Fractura, que debilitó el Vínculo, una red de energía que sostiene el mundo. Los Directores guían a cinco Riftborn en las Convergencias, territorios donde se decide el control de esa energía. Las cartas son la representación jugable de sus técnicas, hechizos y órdenes. Los sobres y las expansiones permiten descubrir nuevas cartas, facciones y relatos: **no son una simulación del mundo exterior ni un manager de esports**.

Consulta [Diseño del juego](docs/GAME_DESIGN.md) para la premisa y [Reglas](CARD_GAME_RULES.md) para la implementación.

## Accesos y ejecución local

| Pantalla | Ruta |
|---|---|
| **Juego principal** | `index.html` o `card-game.html` |
| **Constructor de mazos** | `deck-builder.html` |
| **Colección y sobres** | `collection.html` |
| **Archivo histórico: manager MOBA** | `legacy-moba.html` |

Para probarlo localmente, ejecuta `python -m http.server 8080` desde la raíz del repositorio y visita `http://localhost:8080/`. También se puede abrir en GitHub Pages. Los módulos ES del juego de cartas pueden requerir un servidor local en lugar de abrir archivos con `file://`.

**Datos:** mazos y colección se almacenan en `localStorage` del navegador y no se sincronizan entre dispositivos. Los datos del manager antiguo permanecen en una clave independiente. Borrar datos del navegador puede eliminar el progreso; **todavía no existe un sistema completo de exportación/restauración de la colección**.

## Desarrollo y pruebas

```sh
node scripts/check-static.mjs
node --test tests/card-game*.test.mjs
node --test
node scripts/card-game-balance.mjs --seeds=20 --rounds=24
```

Las pruebas de interfaz de Chromium se ejecutan desde GitHub Actions y cubren escritorio y pantallas móviles. Consulta [Plan de pruebas](docs/TEST_PLAN.md) y [Roadmap](ROADMAP.md).

## Archivo histórico: simulador MOBA / manager de esports

**La idea anterior está archivada y no forma parte del roadmap activo.** Consistía en administrar clubes profesionales, finanzas, temporadas, fichajes y partidos autónomos simulados. Su última etapa de referencia fue **Alpha 0.7.18**.

Para preservarla sin mezclar los dos productos:

- **Instantánea del proyecto anterior:** [rama `archive/moba-manager-alpha-0718`](https://github.com/rgcb01/rift-director/tree/archive/moba-manager-alpha-0718). Conserva la portada, el README, los documentos originales, el código y el historial de aquel enfoque.
- **Demostración histórica accesible:** [`legacy-moba.html`](https://rgcb01.github.io/rift-director/legacy-moba.html). No reemplaza a Rift Director Card Game, no usa sus monedas ni altera su colección.
- **Explicación del archivo y política de mantenimiento:** [`docs/LEGACY_MOBA_ARCHIVE.md`](docs/LEGACY_MOBA_ARCHIVE.md).

El código y las pruebas heredadas se mantienen temporalmente para no romper guardados ni perder material de referencia. **Su presencia en el repositorio no implica que el manager MOBA siga en desarrollo activo**.

## Licencia y propiedad intelectual

Universo, personajes y nombres propios del juego son originales. No existe una licencia de software definida en este repositorio: no debe suponerse que su código esté en el dominio público. Rift Director es independiente y no está afiliado a Riot Games.
