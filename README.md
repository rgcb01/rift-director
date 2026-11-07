# Rift Director

**Simulador de dirección de una organización profesional de esports**. Administra una empresa, descubre jugadores, prepara un equipo y observa partidos narrados mientras un universo competitivo evoluciona por meses.

[**Jugar en el navegador**](https://rgcb01.github.io/rift-director/) · [Roadmap](ROADMAP.md) · [Cambios](CHANGELOG.md) · [Cómo contribuir](CONTRIBUTING.md)

> **Alpha 0.7.5 — prototipo jugable.** Universo, nombres, ligas y equipos ficticios. Proyecto independiente, sin afiliación con Riot Games ni con organizaciones profesionales.

## La idea

Eres **CEO, General Manager y Head Coach**. No controlas campeones en tiempo real: escoges plantilla, entrenamiento y estrategia; tus profesionales ejecutan sus partidos autónomamente. Puedes ganar títulos, formar rookies, vivir de merchandising y patrocinadores o reconstruir un club. **No hay victoria definitiva ni cantidad de dinero objetivo.** Si el saldo disponible llega a cero, la partida termina.

Los meses impulsan las finanzas y el mundo. Las noticias y los rumores reflejan fichajes, contratos, actuaciones y cambios en las ligas. Las buenas decisiones mejoran las probabilidades a largo plazo, pero nunca eliminan la incertidumbre.

## Jugar

- **Web / móvil:** [rift-director en GitHub Pages](https://rgcb01.github.io/rift-director/).
- **Probar sin empezar una partida:** en la bienvenida pulsa **Simular partida de prueba**. También puedes iniciarla desde **Partidos** o **Partida** si tienes un club. La exhibición avanza con **Siguiente evento**, permite **Terminar partida** y revisar cualquier jugada pulsando su historial, sin temporizador; **no cambia tu save**, resultados ni dinero. **Salir de la prueba** devuelve exactamente el estado anterior. Al recargar la página durante una demo se recupera el guardado anterior, no la demo.
- **Local:** descarga el repositorio y abre `index.html` con tu navegador. Como alternativa, ejecuta `python -m http.server 8080` y visita `http://localhost:8080`.
- No hay instalación de paquetes, cuenta ni backend para jugar.
- **Guardados:** automáticos en `localStorage` de ese navegador. En **Partida** puedes **exportar/importar JSON**. Los guardados no se sincronizan entre dispositivos; expórtalos antes de borrar datos del navegador.

## Qué existe hoy (Alpha 0.7)

| Área | Implementado | Límites actuales |
|---|---|---|
| Club | Creación, presupuesto, plantilla y configuración | Gestión empresarial simplificada |
| Economía | Ingresos de sponsors/merch/liga/contenido, salarios, staff, gastos, crisis comerciales y saldo de cierre | Valores todavía no calibrados para muchas temporadas |
| Calendario | Plan mensual, partidos, liga y playoffs | Una región jugable y una segunda simulada |
| Jugadores | Cinco roles, cartas, atributos, comportamiento, traits observables, entrenamiento, scouting, fichajes y ventas | IA y progresión iniciales |
| Partidos | Eventos narrados, KDA individual, minimapa SVG con diez jugadores, 18 torres y control territorial; velocidad y salto al final | Posiciones representativas, no movimientos que condicionen los eventos todavía |
| Mundo vivo | Rumores, noticias vinculadas a eventos, IA de otros clubes, rookies, retiro, cambios de meta y expansión ocasional | Ecosistema regional y causalidad todavía básicos |
| Presentación | Interfaz web responsive, retratos y escudos SVG generados | Accesibilidad y experiencia móvil por mejorar |

**No se ha implementado todavía** un draft de picks/bans completo, torneos internacionales tipo Worlds, negociación detallada de contratos, ligas reales ni una simulación rigurosa de todas las reglas de LoL. El roadmap contiene propuestas, no funcionalidades disponibles.

## Desarrollo

El juego actual es **estático y sin dependencias**:

```text
index.html     Entrada de GitHub Pages
styles.css     Interfaz adaptable
src/core/      RNG, calendario, economía, proyección del minimapa y guardados
src/ui/        Render SVG del minimapa de partidos
src/core/broadcast.js   Ritmo narrado y comentarios tácticos verificables
src/core/navigation.js  Posiciones, rutas y validación de movimientos causales
src/core/replay.js      Repetición por jugada, reconstrucción exacta y selección reversible
game.js        Mundo, partidos, economía y UI (aún pendiente de modularizar)
scripts/       Comprobaciones automatizadas
docs/          Diseño, arquitectura y plan de pruebas
.github/       CI y plantillas de incidencias
```

Requisitos para desarrollo: **Node.js 22+** para ejecutar comprobaciones. El navegador no necesita Node.

```bash
node --check src/core/rng.js
node --check src/core/state.js
node --check src/core/calendar.js
node --check src/core/finance.js
node --check src/core/map-state.js
node --check src/core/minimap-graph.js
node --check src/core/navigation.js
node --check src/core/minimap-simulation.js
node --check src/ui/minimap.js
node --check src/core/broadcast.js
node --check src/core/match-stats.js
node --check src/core/match-events.js
node --check src/core/persistence.js
node --check game.js
node scripts/check-static.mjs
node --test
```

Los cambios a `main` pueden publicarse mediante la configuración de GitHub Pages existente (**main / raíz**); no hay build de producción ni workflow de despliegue personalizado. La validación automatizada comprueba integridad básica, **no** reemplaza la prueba manual del gameplay.

## Documentación y mejora continua

- [ROADMAP.md](ROADMAP.md): hitos, prioridades y criterios de aceptación.
- [CHANGELOG.md](CHANGELOG.md): cambios por versión.
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): reglas de diseño acordadas.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): estado real del código, datos y guardados.
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md): pruebas manuales y regresiones.
- [CONTRIBUTING.md](CONTRIBUTING.md): flujo de trabajo, criterios de calidad y reportes de errores.

## Licencia y propiedad intelectual

Todavía **no se ha elegido una licencia**. La publicación del código en GitHub no autoriza automáticamente su reutilización o redistribución. Antes de aceptar contribuciones externas o distribuir una versión abierta, hay que decidir una licencia explícita y revisar los derechos sobre los recursos.

El universo oficial del juego usa contenido **original y ficticio**. No se deben incorporar nombres, logotipos, fotografías ni material de terceros sin los derechos pertinentes. Los futuros paquetes de datos opcionales deberán respetar esa regla.

### M1.1: núcleo aislado sin romper Alpha 0.2

La inicialización del estado, la secuencia de RNG y la validación de guardados ahora viven en `src/core/`. **La clave y el formato de guardado siguen siendo v2.** La suite incorpora una huella SHA-256 de un universo, partido y mes generados con la Alpha 0.2 original; no acepta cambios accidentales en los resultados. El motor deportivo, calendario y UI siguen en `game.js` para su extracción incremental.

### M1.1 — Calendario y validaciones

`src/core/calendar.js` contiene el calendario de enfrentamientos, las tablas iniciales, las jornadas pendientes y la fecha siguiente. La importación v2 valida además fixtures, clasificaciones, afiliaciones, contratos, libros mensuales y retransmisiones pausadas. No se modifica el generador del calendario ni la semilla de RNG. Ejecuta `node --test` para verificar calendarios de 8 a 10 clubes, 24 meses simulados y una partida avanzada con retransmisión interrumpida. El estado del juego sigue siendo v2.

### M1.1 — Motor financiero extraído

`src/core/finance.js` contiene cotizaciones de cierres mensuales, salarios, costes de agenda, precios de mercado y movimientos de caja. La venta de un profesional ahora verifica que el comprador puede pagar la transferencia **antes** de modificar plantillas. Los cálculos numéricos originales y el formato de guardado `v2` no cambian; hay pruebas que cubren penalizaciones, fichajes, crisis y operaciones repetidas.

### M1.2 — Evidencias de jugadas

Los partidos nuevos incluyen `event.facts` (gank, combate, torre, dragón, Barón y nexo) que identifica los jugadores y objetivos participantes. `src/core/match-events.js` audita que los hechos correspondan al marcador y respeten roles, muertes, reaparición, torres y objetivos. El Match Center muestra quién ejecutó cada jugada. **Los guardados anteriores no necesitan este campo**: se siguen pudiendo importar sin migración. El simulador sigue siendo una abstracción de un MOBA; no existe todavía un sistema de campeones ni hechizos individuales configurables.

### M1.2 — Estadísticas individuales y carrera observada

Los partidos narrados registran `K/D/A`, pentakills y participación en torres, dragones y Barones de **cada profesional**. El Match Center muestra datos en vivo y las cartas acumulan estadísticas de **mapas narrados** (no de toda su carrera: los partidos simulados en segundo plano todavía no generan KDA). Los valores se calculan desde `event.facts`, se congelan en cada frame y se auditan contra el marcador. Las estadísticas nuevas son opcionales en partidas guardadas `v2` anteriores. No hay nuevo backend ni dependencia externa.

### M1.2 · Modelo táctico del mapa (Alpha 0.3)

`src/core/map-state.js` calcula para cada minuto una **estimación abstracta** de presión y visión de TOP/MID/BOT y visión del río. Los ganks ahora consideran esa presión, visión rival y rutas simplificadas (río, flanco o tribush); RiftCast puede mostrar estos datos. No es un mapa 2D con coordenadas ni conoce aún campeones individuales, wards o fog of war exacto. Los datos de mapa son opcionales en guardados anteriores `v2`.

### M1.3A — Minimap SVG (Alpha 0.4)

En la retransmisión y en la **exhibición de prueba** aparece un minimapa ligero, sin imágenes ni librerías. Muestra diez cabezas por rol, posiciones aproximadas por fase, estructuras intactas/destruidas, Dragón, Barón, presión por líneas y agrupación de supervivientes al nexo contrario. Usa `event.facts` y `frame.map`, **sin nueva tirada aleatoria**; los mismos datos que validan RiftCast pintan las ruinas y los iconos. Las partidas antiguas sin `frame.minimap` conservan el Match Center y muestran un mensaje compatible. **No es navegación física real**: hasta M1.3B las posiciones son una reconstrucción visual que no bloquea ni autoriza ganks o peleas.

### M1.4 — Ritmo y narración contextual (Alpha 0.5)

**Nota histórica (Alpha 0.5):** la versión anterior tenía controles de tiempo 1×/2×/5×. Desde Alpha 0.7 estos botones se sustituyeron por navegación manual por eventos; los datos históricos se conservan, pero ya no existen temporizadores de reproducción.

`src/core/broadcast.js` incorpora temas de cobertura derivados de la partida: presión de carriles, visión, ventaja de oro, remontadas reales, ventanas de objetivos, ventajas de torres, bajas y rendimiento del ADC. También elige variantes de títulos y comentarios para asesinatos, ganks, peleas, Barón, Dragón, torres y nexo. **No inventa asesinatos, wards, movimientos ni resultados**: las observaciones son una capa editorial separada de `event.facts`. La elección es determinista sin consumir RNG del juego; `auditBroadcast` verifica la correspondencia con los datos fuente. Los guardados `v2` históricos sin cobertura ampliada siguen funcionando; la velocidad 1× se actualizará igualmente a un ritmo más legible.

**Siguiente paso de profundidad:** M1.3B introducirá desplazamiento espacial causal y M1.4B podrá registrar eventos jugables adicionales (intercambios de oleadas, trampas, peleas de visión, retirada estratégica) con consecuencias medibles. Los nuevos comentarios actuales **no son nuevas acciones deportivas**.

### Alpha 0.6 — Movimiento que sí condiciona las jugadas

Cada profesional es ahora un agente con **nodo actual, destino, intención, vida y ruta**. Avanza como máximo una arista por minuto; la navegación usa el grafo original del minimapa y no añade RNG. El motor mueve primero los agentes y **después** intenta resolver acciones. Solo puede ocurrir un gank cuando jungla, atacante y víctima están suficientemente cerca; tomar un objetivo requiere compañeros presentes en el foso; las torres exigen al menos dos atacantes cerca de la defensa y el nexo solo cae cuando su carril está abierto y **todos los atacantes vivos del equipo vencedor están presentes cerca de la base**, con al menos dos supervivientes. Los eliminados regresan a su fuente y deben recorrer el mapa tras reaparecer.

`frame.navigation.before` y `after` guardan posiciones por minuto para verificar el viaje y la muerte sin inventar movimiento retroactivamente. El minimapa SVG usa esas coordenadas reales del motor; los encuentros `v2` anteriores sin navegación siguen mostrando su representación visual histórica. El límite superior de partidos nuevos es **76 minutos simulados**: se permite que un asedio tarde en concretarse, en vez de forzar torres o un nexo desde lugares imposibles.

**Límites:** esto es un primer motor espacial abstracto, no un MOBA completo. Los desplazamientos son por nodos/minuto, los agentes siguen rutinas tácticas simplificadas, las decisiones de gran asedio se comprometen según una puntuación de recursos y aún no hay wards, líneas de visión exactas ni campeones. Las pentakills serán más infrecuentes con las nuevas restricciones espaciales; el equilibrio de acciones y traits se revisará en siguientes fases.

### Alpha 0.7 — Repetición interactiva por jugadas (M1.5)

- Pulsa **Siguiente evento** para desbloquear la siguiente jugada en orden, sin límite de tiempo. Puedes retroceder pulsando cualquier entrada ya vista de **Historial de jugadas**.
- **Terminar partida** resuelve la reproducción al instante, registra el resultado una sola vez y desbloquea todo el historial. Después puedes revisar cualquier acción y seguir avanzando desde ese punto sin volver a pagar premios ni modificar el mundo.
- El marcador, torres, objetivos, KDA y minimapa reflejan una **instantánea posterior al evento seleccionado**, incluso cuando varias jugadas ocurren en el mismo minuto. El minimapa marca con un círculo dónde sucedió la jugada (gank, combate, torre, objetivo, nexo) y sigue distinguiendo jugadores vivos de muertos.
- Las posiciones iniciales de TOP, MID, ADC y SUP ahora están en nodos delanteros, cerca del centro de sus líneas. JUN comienza en su jungla. La conectividad del grafo mantiene el límite de una conexión recorrida por minuto.
- Al salir de un partido oficial terminado, queda guardada **la última repetición** y se puede abrir desde **Partidos → Revisar último partido**. La exhibición continúa siendo temporal y no escribe `localStorage`.
- Las partidas históricas `v2` sin `moments` siguen siendo navegables usando sus snapshots **por minuto**; no inventamos una precisión por jugada inexistente. El nuevo `match.moments` es opcional y el formato de save continúa siendo `v2`.

### Alpha 0.7.1 — Coherencia entre ganks y minimapa

Los ganks nuevos **exigen proximidad física en unidades SVG** además de distancia de grafo; la víctima tiene que encontrarse realmente en el carril narrado. La ruta narrada (río, jungla, flanco o acceso inferior) se obtiene del nodo real del jungla y se audita. Un jungla en BOT no puede hacer una eliminación en MID solo por estar a dos enlaces topológicos.

Al seleccionar una jugada, el minimapa muestra una **escena de ese evento** desde `moment.navigation.before`, no solo las posiciones de los supervivientes después de la muerte: los autores y asistentes permanecen en sus ubicaciones reales y la víctima aparece marcada como caída en el lugar del combate. El mapa global y las estadísticas después del evento no se modifican. Los participantes reciben un halo y una pequeña leyenda de roles. Las retransmisiones `v2` antiguas sin posiciones precisas mantienen su visualización histórica; una jugada antigua espacialmente inconsistente se marca con advertencia, sin teletransportar personajes para disimular el problema.

### Alpha 0.7.2 — Rutas coherentes de JUN, SUP y fase de líneas

Corrección de los movimientos observados alrededor del minuto 10: ya no se ordena a ambos equipos ocupar `bot_corner`, `top_corner` o `mid_center` durante la fase de líneas, pues eso amontonaba las cabezas. **TOP, MID y ADC conservan su frente de carril** hasta que una ventaja deportiva justifica avanzar. **SUP sigue al ADC durante los primeros 13 minutos** y solo abandona bot para una ventana corta de visión/objetivos antes de regresar. **JUN alterna campamentos, rutas de gank limitadas y retorno a jungla**, en lugar de perseguir un carril fijo durante siete minutos. Las rotaciones de Barón/Dragón y el asedio tardío siguen teniendo movimientos físicos de un nodo por minuto.

No se cambian posiciones en el SVG a posteriori: se modifica `Navigation.chooseGoal`, que escribe intenciones y nodos usados en `frame.navigation` y las auditorías. Las partidas `v2` anteriores conservan sus rutas y replays históricos; las nuevas semillas pueden generar resultados distintos por cambios reales de posicionamiento.

### Alpha 0.7.3 — Jungla con corredores propios y auditoría de eventos

**Problema corregido:** los JUN aparecían a menudo en MID porque se les ordenaba gankear durante varios minutos aun sin una jugada confirmada y porque el BFS atravesaba MID como ruta corta entre campamentos. La nueva navegación usa conexiones **directas entre campamentos** por cada equipo, accesos de emboscada fuera de carriles y **rutas restringidas por rol**. Antes del asedio tardío (minuto 36), JUN solo puede transitar por sus campamentos, su fuente, corredores del río, fosos y puntos de emboscada, nunca por TOP/MID/BOT como atajo. Un gank se prepara en ventanas breves, con lane objetivo definido; si encuentra a un rival cercano puede haber eliminación o un intento evitado. Ambos casos se registran con datos verificables (`facts`), sin inventar bajas.

**La tabla de eventos también se auditó:** teamfights y asistencias ahora requieren proximidad física, no simplemente pocos enlaces de grafo; los ganks efectivos y evitados tienen actor, destino, ruta y objetivo coherentes con las posiciones guardadas. El replay de una emboscada evitada identifica al jungla y al rival en sus ubicaciones originales. Las partidas antiguas mantienen sus posiciones históricas sin reescribirlas. El formato de guardado sigue siendo `v2`; la misma seed puede producir resultados nuevos tras cambiar legalmente las rutas.

### Alpha 0.7.4 — Vida, escaramuzas y retiradas junto a objetivos

La cercanía de jugadores en el minimapa **ya tiene consecuencias de combate**. Un 2v1 físicamente válido cerca de Dragón o Barón se convierte en una escaramuza: se calcula daño según el estado de vida y las características de los participantes. Puede terminar en eliminación o en supervivencia; un superviviente amenazado **debe retirarse por los enlaces reales del mapa**. No se inventa una muerte solo por tener superioridad numérica.

- Cada profesional tiene vida (0–100) persistente durante **ese partido**, recuperación gradual, vuelta con vida completa tras reaparecer y una **barra de vida visible** en el minimapa de nuevos encuentros.
- El evento `skirmish` guarda jugadores, superioridad, zona, objetivo, daño, vida anterior y posterior, y resultado `kill` o `retreat`. RiftCast explica la supervivencia cuando no hay kill.
- Retiradas con objetivo real y prioridad sobre los planes normales del rol hasta alcanzar una zona segura; no permiten tomar objetivos mientras el jugador se retira. Los participantes que mueren regresan a fuente y no capturan objetivos.
- Los encuentros solo se abren si al menos dos jugadores amenazan a uno desde el rango registrado y al menos uno está realmente a distancia de golpe. Un mismo objetivo tiene un enfriamiento para evitar combates ficticios repetidos.
- Se conservan los guardados `v2` anteriores: en replays antiguos no se inventan barras de vida ni escaramuzas no simuladas. Los resultados deportivos de nuevas partidas pueden variar por esta regla.
- **Limitación actual:** es el primer sistema de escaramuzas en fosos de objetivos, no un motor completo de habilidades, campeones, oleadas, tiempos de enfriamiento ni visión. Las peleas de línea preexistentes siguen teniendo reglas simplificadas y serán una fase posterior.

### Alpha 0.7.5 — El mismo combate para todas las líneas, ganks y teamfights

Los diez profesionales ahora comparten un **registro continuo de vida** durante el partido. TOP, MID y BOT pueden intercambiar daño cuando están en el mismo carril y dentro de un alcance de ataque compatible con el minimapa. Los ganks y las peleas grupales consumen la vida existente: ya no generan asesinatos únicamente por una tirada favorable. Cada impacto registra daño, vida previa y posterior, equipo, posición real y si el afectado muere, se retira por un camino físicamente permitido o continúa peleando. El espectador puede volver a cada jugada para revisar el estado exacto de su salud y posición.

En los carriles el alcance abstracto permite intercambios a distancia dentro de la misma línea, sin fingir que están cuerpo a cuerpo; ganks y teamfights siguen exigiendo proximidad física de combate. La superioridad numérica ayuda, pero **un 2v2 igualado no se considera automáticamente un 2v1**. No hay bajas sin vida a cero y una retirada debe mover realmente al profesional en el siguiente minuto. El relato y el minimapa se derivan de los mismos hechos.

El formato de guardado continúa en `v2`; los replays previos no se reescriben ni reciben daño ficticio. Esta fase sigue siendo una simulación táctica simplificada: los atributos, alcance, ventaja numérica y recuperación de HP están modelados, pero todavía no existen campeones individuales, habilidades con cooldown, estadísticas de minions ni niebla de guerra.
