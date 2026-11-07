# Arquitectura actual — Alpha 0.2 / M1.1

Este documento describe la **implementación comprobada** del repositorio a fecha 2026-11-07, no su arquitectura ideal.

## Estructura

```text
index.html                 Entrada estática con #app
styles.css                 Estilos responsive
src/core/rng.js            Secuencia pseudoaleatoria v2 (sin cambios)
src/core/state.js          Estado inicial v2 y roles
src/core/calendar.js       Calendario round-robin, jornadas, tablas iniciales y fechas
src/core/finance.js        Cotización mensual, salarios, transferencias de caja, precios
src/core/match-events.js   Auditoría de eventos: kills, objetivos, roles y marcador
src/core/persistence.js    Parseo, validación, almacenamiento local v2
game.js                    IIFE con mundo, motor de partidos, finanzas, rendering y eventos DOM
scripts/check-static.mjs   Validación ligera de archivos/recursos
tests/smoke.test.mjs       Pruebas de invariantes básicas del motor
docs/                     Reglas de producto y pruebas
.github/workflows/ci.yml   Checks; no cambia el despliegue de Pages
```

No utiliza backend, empaquetador, frameworks ni peticiones a servicios externos. Los logotipos y avatares se construyen como SVG desde JavaScript.

## Estado de partida

La variable `s` vive dentro de la IIFE de `game.js`. `newGame()` usa la factory `RiftCore.createInitialState()` de `src/core/state.js` e inicializa el universo (año **2027**, enero, dos regiones ficticias), la plantilla del usuario, sus rivales y la primera temporada.

Campos centrales del objeto de estado (resumen, no esquema exhaustivo):

| Campo | Uso |
|---|---|
| `v: 2` | Versión del formato de guardado |
| `rng`, `nextId` | Estado de aleatoriedad y generador de identificadores |
| `year`, `month`, `season` | Tiempo simulado |
| `clubs`, `players`, `userClub` | Entidades y relaciones |
| `fixtures`, `otherFixtures`, `standings`, `otherStandings` | Calendarios/tabla de las regiones |
| `plan`, `focus`, `style`, `meta` | Prioridades de entrenamiento y estrategia |
| `news`, `rumors`, `history` | Historia y feed del mundo |
| `matchReports`, `monthlyReports` | Registro deportivo y financiero |
| `live`, `over` | Partido en curso y fin de partida por insolvencia |

### Relaciones

- `club.lineup`: cinco IDs asociados a TOP/JUN/MID/ADC/SUP; `club.roster`: jugadores contratados.
- `player.teamId`: organización actual, o `null` para agente libre.
- Contratos y salario mensual viven en los datos del jugador; el saldo está en el club.
- No existe un catálogo externo separado de equipos, campeones o logos.

## Funciones principales y responsabilidades

| Ámbito | Funciones actuales |
|---|---|
| Generación | `newGame`, `makeClub`, `generatePlayer`, `generateFixtures` |
| Competición | `teamPower`, `simulateMatch`, `quickGame`, `finishMatch`, `beginPlayoffs` |
| Finanzas | `RiftCore.quoteMonth`, `RiftCore.adjustCash`, `RiftCore.transferCash`, `applyMonth`, `resolveCrisis` |
| Mundo y offseason | `simulateWorld`, `annualProgress`, `nextYear`, `addNews` |
| Plantilla | `signFreeAgent`, `sellPlayer`, `scoutPlayer`, `setLineup` |
| UI y persistencia | `render`, `renderMatch`, `handleClick`, `save`, `load`, `exportGame`, `importGame` |

## Ciclo mensual real

`closeMonth()` verifica partidas pendientes y crisis; hace avanzar la actividad del resto de la liga; `applyMonth()` realiza cobros, salarios, costes, evolución de aficionados, química, cansancio, entrenamiento y comprobación de caja. Al terminar diciembre se llama `nextYear()`, que ejecuta `annualProgress()`, reconstruye calendarios, cambia el meta y restablece la temporada. `simulateWorld()` gestiona noticias y eventos del mercado.

## Motor de partidos real

`simulateMatch(fixture)` construye un estado temporal con kills, oro, torres por línea, dragones, Barones, muertos y snapshots por minuto. Emite una lista de eventos con comentario y equipo asociado. La simulación decide el vencedor y asegura una ruta válida al nexo antes de cerrar. El espectador consume sus `frames` y `events`.

**Limitación importante:** el simulador es abstracto, no replica el mapa, habilidades, objetivos o draft completos de LoL. La narración causal es una meta de calidad; aún puede haber simplificaciones o defectos que deberán probarse con escenarios generados masivamente.

## Aleatoriedad y reproducibilidad

`rnd()` delega a `RiftCore.nextRandom(s)` en `src/core/rng.js`, conservando exactamente el generador xorshift32 y el estado `s.rng` de Alpha 0.2, inicializado al crear la partida. La misma instantánea de estado y secuencia de decisiones permiten repetir resultados; no hay aún selector de seed visible ni API pública de simulación. La prueba de smoke extrae funciones internas de la IIFE **solo durante las pruebas**, sin modificar el juego distribuido.

## Guardados

- Clave actual: `rift_director_v02_save` en `localStorage`.
- Formato: JSON que incluye el estado completo y `v: 2`.
- `load()` e `importGame()` usan `RiftCore.parseWorld()`, que valida versión, fecha, IDs, clubes, afiliaciones, roles, contratos no negativos, calendario por región, clasificaciones, balances mensuales y transmisiones en curso. **Aún no comprueba todas las obligaciones contractuales ni la historia completa**.
- No existen migraciones desde otras versiones, sincronización en la nube ni garantía de capacidad ilimitada de almacenamiento.

**Contrato de compatibilidad para próximos hitos:**
1. No cambiar ni eliminar silenciosamente `v:2` o la clave sin una migración explícita.
2. Añadir pruebas con guardados heredados antes de alterar entidades.
3. Hacer copia mediante **Partida → Exportar JSON** antes de probar versiones experimentales.
4. Asegurar que una importación inválida no sustituya un guardado válido.

## Limitaciones y deuda técnica

1. `game.js` todavía mezcla mundo, tiempo, economía, partidas y UI; RNG, estado inicial y persistencia ya están aislados. Refactor gradual recomendado.
2. Las pruebas iniciales verifican invariantes mínimas, no balance económico ni diversión.
3. La IA rival, eventos causales y mercado usan heurísticas simplificadas.
4. El feed de noticias conserva una ventana limitada; hace falta estrategia de archivo histórico.
5. Rendimiento, accesibilidad y UI táctil necesitan pruebas en dispositivos reales.

## Futuro diseño técnico propuesto (no implementado)

```text
src/domain/        Player, Club, Contract, League, MatchEvent
src/simulation/    World, Month, Market, Match, Meta y RNG
src/persistence/   Versionado y migración
src/data/          Contenido original configurable
src/ui/            Pantallas y componentes
tests/             Reglas deterministas e invariantes
```

El siguiente paso debe ser extraer primero funciones puras y pruebas, evitando una reescritura total que comprometa las partidas guardadas.

## Regresión de compatibilidad M1.1

El juego carga `rng.js`, `state.js`, `persistence.js` y `game.js` en ese orden desde `index.html`. No hay bundler ni dependencia externa. La clave de `localStorage` es la misma y `v: 2` continúa intacto. `tests/golden.test.mjs` compara huellas SHA-256 de estados y resultados deterministas capturados en la Alpha 0.2 original; `tests/core.test.mjs` verifica secuencia de RNG, validación, roundtrip y transición anual. Las pruebas no implican una garantía absoluta de compatibilidad de todos los guardados históricos posibles.

## Extracción de calendario M1.1

`generateFixtures`, `standingsFor` y `nextFixtures` de `game.js` son adaptadores de las funciones puras `RiftCore.generateFixtures`, `RiftCore.standingsFor` y `RiftCore.pendingUserFixtures`. `closeMonth` usa `RiftCore.nextDate` para identificar diciembre, sin cambiar el orden de llamadas a `nextYear`, `applyMonth` o `simulateWorld`. El calendario conserva meses con listas vacías, jornadas ida/vuelta y descansos cuando hay un número impar de equipos. El validador comprueba que los cruces pertenezcan a su región y que un club no dispute dos encuentros dentro de una misma jornada.

`tests/calendar.test.mjs` recorre ligas de 8, 9 y 10 equipos, realiza 24 cierres mensuales con partidos rápidos en una partida **sintética** y restaura un partido pausado de una simulación avanzada. Esto cubre regresiones funcionales, pero **no** sustituye probar un archivo JSON exportado por un usuario real en Alpha 0.2 ni una auditoría de 20 temporadas y transferencias complejas.

## Extracción financiera M1.1

El módulo puro `RiftCore.quoteMonth(world, club, getPlayer)` calcula ingresos, gastos y cumplimiento comercial **sin mutar estado** ni consumir RNG. `applyMonth()` conserva el orden de operaciones: primero calcula, luego ajusta caja, desarrolla jugadores y escribe un reporte con las mismas claves y cifras de Alpha 0.2.

`RiftCore.adjustCash` centraliza los movimientos individuales; `RiftCore.transferCash` aplica pagos de comprador a vendedor como una operación atómica que retorna `false` sin modificar estado cuando faltan fondos. `sellPlayer` filtra compradores con dinero suficiente antes de transferir a un profesional. Este cambio corrige un caso futuro de valores de mercado altos que antes podía dejar a un comprador con saldo negativo inesperado.

**Limitaciones:** no existe todavía un libro contable de doble entrada para todos los clubes; el historial de usuario sigue en `record()` dentro de `game.js`. No se agregó un esquema de guardado nuevo ni una propiedad obligatoria adicional. Los contratos más detallados y la inflación pertenecen a hitos futuros.

## M1.2 fase 1 — Evidencias y coherencia narrativa

Los mapas nuevos generan eventos con un objeto opcional `facts` que registra el tipo de jugada, autor, víctimas y parámetros del objetivo; el comentarista usa ese mismo registro. `RiftCore.auditMatch(match, world)` recorre hechos y `frames` sin consumir RNG, comprobando coherencia de kills, torres, dragones, Barones, muerte/reaparición, pentakills, exterminios y nexo. La auditoría no forma parte del render en producción: es una verificación automatizable para no impactar rendimiento en móviles.

Los eventos heredados de Alpha 0.2 carecen de `facts` y no se reescriben al importar guardados `v2`. No podemos demostrar todas las reglas de los mapas antiguos con la misma auditoría estructural. **Smite solo lo atribuye el código al jungla en los robos de Barón**; un futuro modelo explícito de campeones/hechizos requerirá más validación.

**Regresión deliberada M1.2:** la huella del partido de referencia cambió al corregir eventos de torres/Barón inválidos. Se conserva un checkpoint del mundo inicial y del cálculo financiero; el partido y el RNG posterior tienen una nueva referencia determinista verificada. No se garantiza que repetir un mapa antiguo con la misma semilla produzca idéntico resultado tras esta corrección.
