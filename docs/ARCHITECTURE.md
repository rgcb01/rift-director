# Arquitectura actual — Alpha 0.7 / M1.5

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
src/core/match-stats.js    Estadísticas K/D/A y participación individual reconstruibles
src/core/map-state.js      Visión/presión y rutas abstractas de gank
src/core/minimap-graph.js  Nodos, carriles y coordenadas de torres
src/core/navigation.js     Agentes, BFS, intención, desplazamiento y auditoría causal
src/core/minimap-simulation.js  Proyección visual de frames/eventos
src/ui/minimap.js         SVG de jugadores, estructuras y territorio
src/core/broadcast.js     Variantes de relato y análisis contextual verificable
src/core/replay.js        Timeline, controles manuales y auditoría de instantáneas
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

## M1.2 fase 2 — Estadísticas individuales, fuente de verdad y compatibilidad

`RiftCore.applyPlayerEvent` proyecta estadísticas de jugadores **exclusivamente** desde la evidencia del evento, sin consumir RNG ni modificar `world.players`. La retransmisión registra `playerStats` en cada frame y al final del mapa; la auditoría reconstruye los datos a partir de los mismos eventos y los contrasta con los totales por equipo. Cada objetivo guarda `participantIds` válidos, vivos y del mismo club. El `KDA` es `(kills + assists) / max(1, deaths)`, mostrando «Perfecto» cuando hubo participación sin muertes.

`finishMatch()` conserva `outcome.playerStats` para mapas nuevos y suma los resultados opcionales a `player.broadcastStats` solo una vez. **No son estadísticas de carrera global:** las partidas rápidas entre IA no tienen simulación individual, de modo que se etiqueta «mapas narrados». Los reportes existentes y guardados antiguos `v:2` carecen de este campo y no necesitan migración; no se sintetizan eliminaciones inexistentes.

En la Alpha actual, pentakill significa cinco bajas válidas atribuidas al mismo profesional en **un evento de pelea**; la validación de cadenas entre eventos y ventanas de segundos, así como posiciones exactas, campeones, Summoner Spells y asistencias detalladas por víctima, quedan para fases posteriores. No afirmar que se reproduce todo LoL.

## Alpha 0.3 · Demo aislada y estado táctico

`startDemoMatch()` preserva el estado de partida anterior, vista y modal en `demoBackup` (solo RAM), genera un universo provisional y reproduce un fixture sin cambiar el calendario del usuario. `save()` es **no-op durante la demo**; `finishMatch()` solo marca el fin de la retransmisión demo y no entrega premios, histórico o progreso. `exitDemoMatch()` recupera la referencia original de mundo/vista/modal y reanuda el timer si el partido real estaba activo. La demo no se exporta ni persiste: recargar restablece el save normal. `tests/demo-map.test.mjs` valida aislamiento con y sin partida y restauración de un partido pausado.

`RiftCore.computeMapState` calcula de forma **determinista** estimaciones de visión del río y control/visión por carril a partir de atributos, cansancio, oro y torres actuales. No hay RNG adicional, coordenadas, wards ni fog of war; los valores afectan la probabilidad de éxito del gank vía `gankChance`. Cada `frame.map` es una instantánea independiente, y el gank registra los parámetros de visión/presión y ruta usados para auditar la narración. Los guardados anteriores no tienen este campo y se leen sin conversión.

## M1.3A — Proyección visual de minimapa

Al finalizar `simulateMatch()`, la función `RiftCore.attachMinimap(report, world)` recorre el **historial existente** `event.facts` y `frame.eventsCount` y añade opcionalmente `frame.minimap` a los frames. Se trata de una proyección pura desde los hechos y el estado táctico previo: **no consume RNG, no crea eliminaciones, no cambia el ganador**. Estructuras por carril se reconstruyen desde `tower` y se comparan con `frame.towers`.

`frame.minimap.players` contiene diez posiciones SVG con rol, equipo, nodo visual y `alive`. Las bajas siguen la misma duración de reaparición que usa el motor de encuentros. Los participantes vivos de una pelea u objetivo se muestran cerca del punto implicado; los muertos se marcan inactivos en la fuente. Si el encuentro acaba, los atacantes vivos se muestran alrededor del nexo enemigo; los caídos **no** reaparecen ficticiamente. `frame.minimap.territory` refleja presión por carril y visión del río calculadas en `frame.map`.

`src/ui/minimap.js` produce SVG sin dependencias ni imágenes. Los diez avatares son retratos geométricos mínimos y las estructuras tienen estados intacto/ruina. Es compatible con preferencia de movimiento reducido, además de contar con etiquetas accesibles para los actores y estructuras.

**Límite deliberado de M1.3A:** el movimiento está reconstruido *después* de simular, por lo que todavía no restringe ganks según distancia o rutas físicas. No llamar a esto una simulación espacial causal; M1.3B introducirá navegación entre nodos y decisiones dependientes de presencia.

El formato de save sigue siendo `v2`. Las partidas antiguas sin `frame.minimap` no se alteran al importar: la UI presenta un fallback. `RiftCore.auditMinimap` recrea la proyección y la compara frame por frame en pruebas, sin alterar el estado guardado.

## M1.4A — Retransmisión frente a simulación

`simulateMatch` sigue generando las mismas acciones, stats y frames. Al final de la simulación, `RiftCore.attachBroadcast(report,world,commentarySeed)` crea **sin consumir el RNG del juego** un campo opcional `report.broadcast` con variantes de las noticias existentes y observaciones estratégicas basadas en `frame.map`, `frame.playerStats`, `frame.gold`, `frame.minimap` y el historial real. `RiftCore.broadcastFeed` compone un timeline ordenado, `feedCountAt` da el límite de novedades disponibles hasta cada frame y `auditBroadcast` lo recompone para verificar su exactitud. Los eventos deportivos originales y `event.facts` no se modifican.

**Nota histórica Alpha 0.5, reemplazada en Alpha 0.7:** En `tick()`, la velocidad `1×` revelaba una novedad por paso de **5000 ms** y usa el frame precomputado para mostrar el mapa; `2×` y `5×` avanzan los frames a **2500 ms** y **950 ms**. El reloj deportivo y el feed se basan en el mismo encuentro precalculado; **algunas cifras del minuto pueden adelantarse a la última línea de comentario cuando hay varias novedades dentro de ese minuto**. Se trata de una limitación de snapshots por minuto que se resolverá con subframes de evento.

Los save `v2` sin `broadcast` presentan el registro original completo y se pueden reproducir con el nuevo ritmo. La nueva capa editorial explica jugadas y señales pero no crea acciones deportivas ni modifica el ganador; las acciones tácticas causales se proponen para M1.3B/M1.4B.

## Alpha 0.6 — Navegación causal (M1.3B, parte 1)

`RiftCore.Navigation` crea diez agentes al empezar el mapa y usa rutas de grafo BFS sobre `MiniGraph.links` más conexiones de fuente y jungla. `advance(nav,t,dead,m)` decide destinos por rol y fase (líneas, preparación de objetivos, agrupamiento, asedio) y mueve un solo nodo por minuto, **antes de** cualquier gank/torre/objetivo/pelea. `frame.navigation.before` guarda dónde estaban antes del combate; `frame.navigation.after` resuelve muertes a la fuente. Las posiciones completas se quedan dentro del report del partido, que es reproducible.

La simulación exige participantes vivos y cercanos a un nodo para ganks, dragones, barones, torres y nexo; no basta con compartir equipo. Las torres se abren en secuencia (exterior→interior→base). En el último tercio, el director deportivo determina un equipo que asedia por una línea, mientras el otro defiende. El nexo solo cae si la línea está abierta y el equipo ganador reúne a todos sus atacantes vivos (al menos dos) físicamente cerca del nodo contrario. El tiempo máximo se amplía a 76 minutos simulados para completar rutas sin forzar destrucciones.

`attachMinimap` consume `frame.navigation.after` y nunca reubica retroactivamente a un autor para hacer creíble un evento. Los reportes anteriores carecen de navegación y mantienen su proyección anterior; no se migra el schema `v2`. `Navigation.auditNavigation` valida cada viaje entre frames, muerte/respawn, actor y víctima próximos, presencia efectiva ante torre, foso y nexo, y diferencia entre nodo conectado y distancia física razonable.

**Límites deliberados:** la decisión de destino no modela todavía un árbol táctico profundo; un salto por minuto ignora el tiempo exacto entre segundos, las decisiones de asedio dependen de recursos simplificados y la fog of war no bloquea información. La retrocompatibilidad está automatizada pero pendiente de prueba manual con JSON histórico real en Safari/Chrome móvil.

## Alpha 0.7 — Estado de evento y navegación histórica

Durante `simulateMatch`, `makeEv` guarda `m.moments[i]` **inmediatamente después** de aplicar el hecho deportivo `m.events[i]`. Cada momento incluye marcador, oro, torres, dragones, Barón, KDA, mapa táctico, posiciones de agentes y `eventsCount=i+1`. No consume RNG adicional ni recalcula quién ganó. Al finalizar el simulador, `RiftCore.MatchReplay.attachReplay` proyecta el minimapa sobre estas instantáneas mediante `attachMinimap`, cuyo auditor ya reconstruye torres y muertos desde la misma secuencia de hechos.

`RiftCore.MatchReplay.timeline(match)` mezcla los eventos originales con los comentarios derivados de `broadcastFeed`, preservando `eventIndex` para enlazar a la instantánea precisa. Una observación táctica con hora `:59` usa el frame de cierre del minuto, por ser una lectura agregada del estado y no una jugada de combate. En saves `v2` sin `moments`, la UI usa el frame por minuto y muestra explícitamente la resolución reducida.

`replayProgress` es el último evento desbloqueado; `replayCursor` es el seleccionado en la interfaz. Un clic histórico cambia **solo el cursor** y renderiza de nuevo. Pulsar Siguiente evento avanza el cursor, desbloquea un paso si era necesario y llama a `finishMatch()` exclusivamente cuando llega al evento final. Terminar partida desbloquea todo y finaliza en un solo paso; el método `finishMatch` mantiene su protección `committed` contra premios duplicados. Los timers históricos permanecen inactivos. La pantalla conserva la última retransmisión oficial en `world.lastReplay` cuando el usuario vuelve al club, pudiendo reabrirla sin volver a simular.

`RiftMinimap.render` recibe opcionalmente el evento seleccionado y destaca la ubicación física registrada por `facts`, incluso si la víctima ya está muerta y su cabeza aparece en la fuente. Se añadieron nodos `*_front` a los tres carriles, conectados con el mismo grafo usado para la navegación causal. Los guardados anteriores no requieren migración de esquema ni reconstrucción ficticia de sucesos pasados.

## Alpha 0.7.1 — Escena causal frente a estado global

La condición deportiva de un gank ahora exige `Navigation.combatRange(jun,victim)` (hasta dos enlaces, con límite de distancia euclidiana) y `Navigation.isLaneNode(victim.node,lane)`. El acceso físico `Navigation.gankApproach(jun.node,lane)` se guarda como ruta y se verifica en auditoría. `facts.spatialVersion=2` diferencia este contrato de la ruta histórica basada en visión de guardados antiguos.

Para la repetición seleccionada, `MatchReplay.eventView` utiliza los nodos **registrados antes** de la pelea en `moment.navigation.before`. Produce una **copia de presentación** de `moment.minimap.players`, sin editar el mapa o el guardado de origen. Los jugadores involucrados siguen en su ubicación previa; la víctima puede verse caída allí mientras su posición global posterior ya está en fuente. Si una retransmisión anterior contiene un gank físicamente inviable, la vista presenta una advertencia y mantiene las coordenadas existentes en lugar de inventar un desplazamiento. El marcador/KDA siguen correspondiendo a la instantánea posterior al evento.

## Alpha 0.7.2 — Política de movimiento por rol

La política determinista `Navigation.chooseGoal` mantiene el movimiento por BFS y una arista por minuto. Los objetivos tempranos de TOP/MID/ADC se anclan a `blue|red_*_front` y dejan de converger simultáneamente en nodos neutrales. SUP utiliza el objetivo del ADC vivo como acompañante hasta el minuto 13 y regresa a él después de un roaming acotado en el río inferior. JUN atraviesa fases discretas de limpieza de campamentos, gank corto, regreso a jungla, preparación de Dragón/Barón y rotaciones, con cambios de objetivo programados sin consumir RNG deportivo. Los tres laners obtienen permiso para avanzar a la curva o centro si existe una diferencia económica suficiente.

El cambio ocurre **antes** de calcular ganks/peleas/estructuras y afecta la elegibilidad real de acciones. No se presenta como desplazamiento cosmético ni se migran `frames` históricos de saves `v2`. La política es todavía simplificada y debe evolucionar hacia un agente táctico que reaccione a oleadas, vida y visión por nodo.

## Alpha 0.7.3 — Política de rutas y tabla de eventos

`MiniGraph` agrega enlaces directos entre campamentos aliados y cuatro `*_ambush` exteriores para acercarse a TOP/BOT sin ocupar los nodos del carril. `Navigation.path(from,to,allowed?)` admite un predicado de accesibilidad. En `advance`, para un JUN anterior al minuto 36 el BFS aplica `jungleAllowed`: fuentes, nexo propio, junglas propias, río, fosos y accesos de emboscada. Los laners usan rutas normales. Al llegar el asedio tardío, todos pueden reagruparse por las estructuras.

`jungleGoal` decide ventanas cortas de gank por seed/equipo/línea y períodos alternados de campamento/objetivo. La selección de eventos de gank ya no elige un carril aleatorio independiente: solo considera JUN con `intent=gank_setup`, un `lane` planificado y una víctima cercana de ese carril. Un intento fallido genera `facts.action=gank_avoided` con actor, target, coordenadas de nodo y ruta, sin aplicar K/D/A ni premios. `auditMatch` y `auditNavigation` validan ese tipo de evento y comprueban su trazabilidad. Los ganks exitosos registran `plannedGankVersion=1` para exigir la correspondencia con el plan sin rechazar el historial antiguo.

`engagement` y la comprobación de los participantes de teamfight usan `combatRange` (hops y radio euclidiano), evitando combates a través de conexiones gráficas largas. `MatchReplay.eventView` y `RiftMinimap` permiten revisar ganks evitados en la ubicación de ambos protagonistas, sin marcar una muerte ficticia. Los datos históricos son inmutables; la semilla deportiva cambia intencionalmente.
