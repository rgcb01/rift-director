# Arquitectura actual — Alpha 0.2

Este documento describe la **implementación comprobada** del repositorio a fecha 2026-11-07, no su arquitectura ideal.

## Estructura

```text
index.html                 Entrada estática con #app
styles.css                 Estilos responsive
game.js                    IIFE que incluye mundo, motor de partidos, finanzas, rendering y eventos DOM
scripts/check-static.mjs   Validación ligera de archivos/recursos
tests/smoke.test.mjs       Pruebas de invariantes básicas del motor
docs/                     Reglas de producto y pruebas
.github/workflows/ci.yml   Checks; no cambia el despliegue de Pages
```

No utiliza backend, empaquetador, frameworks ni peticiones a servicios externos. Los logotipos y avatares se construyen como SVG desde JavaScript.

## Estado de partida

La variable `s` vive dentro de la IIFE de `game.js`. `newGame()` inicializa el universo (año **2027**, enero, dos regiones ficticias), la plantilla del usuario, sus rivales y la primera temporada.

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
| Finanzas | `applyMonth`, `totalWages`, `monthPlanCost`, `resolveCrisis` |
| Mundo y offseason | `simulateWorld`, `annualProgress`, `nextYear`, `addNews` |
| Plantilla | `signFreeAgent`, `sellPlayer`, `scoutPlayer`, `setLineup` |
| UI y persistencia | `render`, `renderMatch`, `handleClick`, `save`, `load`, `exportGame`, `importGame` |

## Ciclo mensual real

`closeMonth()` verifica partidas pendientes y crisis; hace avanzar la actividad del resto de la liga; `applyMonth()` realiza cobros, salarios, costes, evolución de aficionados, química, cansancio, entrenamiento y comprobación de caja. Al terminar diciembre se llama `nextYear()`, que ejecuta `annualProgress()`, reconstruye calendarios, cambia el meta y restablece la temporada. `simulateWorld()` gestiona noticias y eventos del mercado.

## Motor de partidos real

`simulateMatch(fixture)` construye un estado temporal con kills, oro, torres por línea, dragones, Barones, muertos y snapshots por minuto. Emite una lista de eventos con comentario y equipo asociado. La simulación decide el vencedor y asegura una ruta válida al nexo antes de cerrar. El espectador consume sus `frames` y `events`.

**Limitación importante:** el simulador es abstracto, no replica el mapa, habilidades, objetivos o draft completos de LoL. La narración causal es una meta de calidad; aún puede haber simplificaciones o defectos que deberán probarse con escenarios generados masivamente.

## Aleatoriedad y reproducibilidad

`rnd()` utiliza un generador pseudoaleatorio con estado guardado en `s.rng`, inicializado al crear la partida. La misma instantánea de estado y secuencia de decisiones permiten repetir resultados; no hay aún selector de seed visible ni API pública de simulación. La prueba de smoke extrae funciones internas de la IIFE **solo durante las pruebas**, sin modificar el juego distribuido.

## Guardados

- Clave actual: `rift_director_v02_save` en `localStorage`.
- Formato: JSON que incluye el estado completo y `v: 2`.
- `load()` y `importGame()` verifican algunos campos estructurales, pero **no** validan exhaustivamente cada entidad o relación.
- No existen migraciones desde otras versiones, sincronización en la nube ni garantía de capacidad ilimitada de almacenamiento.

**Contrato de compatibilidad para próximos hitos:**
1. No cambiar ni eliminar silenciosamente `v:2` o la clave sin una migración explícita.
2. Añadir pruebas con guardados heredados antes de alterar entidades.
3. Hacer copia mediante **Partida → Exportar JSON** antes de probar versiones experimentales.
4. Asegurar que una importación inválida no sustituya un guardado válido.

## Limitaciones y deuda técnica

1. `game.js` mezcla datos, presentación, tiempo, economía y simulación; refactor gradual recomendado.
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
