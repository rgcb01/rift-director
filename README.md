# Rift Director

**Simulador de dirección de una organización profesional de esports**. Administra una empresa, descubre jugadores, prepara un equipo y observa partidos narrados mientras un universo competitivo evoluciona por meses.

[**Jugar en el navegador**](https://rgcb01.github.io/rift-director/) · [Roadmap](ROADMAP.md) · [Cambios](CHANGELOG.md) · [Cómo contribuir](CONTRIBUTING.md)

> **Alpha 0.6 — prototipo jugable.** Universo, nombres, ligas y equipos ficticios. Proyecto independiente, sin afiliación con Riot Games ni con organizaciones profesionales.

## La idea

Eres **CEO, General Manager y Head Coach**. No controlas campeones en tiempo real: escoges plantilla, entrenamiento y estrategia; tus profesionales ejecutan sus partidos autónomamente. Puedes ganar títulos, formar rookies, vivir de merchandising y patrocinadores o reconstruir un club. **No hay victoria definitiva ni cantidad de dinero objetivo.** Si el saldo disponible llega a cero, la partida termina.

Los meses impulsan las finanzas y el mundo. Las noticias y los rumores reflejan fichajes, contratos, actuaciones y cambios en las ligas. Las buenas decisiones mejoran las probabilidades a largo plazo, pero nunca eliminan la incertidumbre.

## Jugar

- **Web / móvil:** [rift-director en GitHub Pages](https://rgcb01.github.io/rift-director/).
- **Probar sin empezar una partida:** en la bienvenida pulsa **Simular partida de prueba**. También puedes iniciarla desde **Partidos** o **Partida** si tienes un club. La exhibición permite pausar, 1×/2×/5×, saltar al final y repetir; **no cambia tu save**, resultados ni dinero. **Salir de la prueba** devuelve exactamente el estado anterior. Al recargar la página durante una demo se recupera el guardado anterior, no la demo.
- **Local:** descarga el repositorio y abre `index.html` con tu navegador. Como alternativa, ejecuta `python -m http.server 8080` y visita `http://localhost:8080`.
- No hay instalación de paquetes, cuenta ni backend para jugar.
- **Guardados:** automáticos en `localStorage` de ese navegador. En **Partida** puedes **exportar/importar JSON**. Los guardados no se sincronizan entre dispositivos; expórtalos antes de borrar datos del navegador.

## Qué existe hoy (Alpha 0.6)

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

En **1×** la retransmisión avanza un paso cada **5 segundos**, y si un minuto contiene varias novedades, se muestran una por una. En **2×** cada minuto dura aproximadamente **2.5 segundos**; en **5×** tarda **950 ms por minuto**. Pausar, acelerar, saltar al final y repetir no modifica la simulación.

`src/core/broadcast.js` incorpora temas de cobertura derivados de la partida: presión de carriles, visión, ventaja de oro, remontadas reales, ventanas de objetivos, ventajas de torres, bajas y rendimiento del ADC. También elige variantes de títulos y comentarios para asesinatos, ganks, peleas, Barón, Dragón, torres y nexo. **No inventa asesinatos, wards, movimientos ni resultados**: las observaciones son una capa editorial separada de `event.facts`. La elección es determinista sin consumir RNG del juego; `auditBroadcast` verifica la correspondencia con los datos fuente. Los guardados `v2` históricos sin cobertura ampliada siguen funcionando; la velocidad 1× se actualizará igualmente a un ritmo más legible.

**Siguiente paso de profundidad:** M1.3B introducirá desplazamiento espacial causal y M1.4B podrá registrar eventos jugables adicionales (intercambios de oleadas, trampas, peleas de visión, retirada estratégica) con consecuencias medibles. Los nuevos comentarios actuales **no son nuevas acciones deportivas**.

### Alpha 0.6 — Movimiento que sí condiciona las jugadas

Cada profesional es ahora un agente con **nodo actual, destino, intención, vida y ruta**. Avanza como máximo una arista por minuto; la navegación usa el grafo original del minimapa y no añade RNG. El motor mueve primero los agentes y **después** intenta resolver acciones. Solo puede ocurrir un gank cuando jungla, atacante y víctima están suficientemente cerca; tomar un objetivo requiere compañeros presentes en el foso; las torres exigen al menos dos atacantes cerca de la defensa y el nexo solo cae cuando su carril está abierto y **todos los atacantes vivos del equipo vencedor están presentes cerca de la base**, con al menos dos supervivientes. Los eliminados regresan a su fuente y deben recorrer el mapa tras reaparecer.

`frame.navigation.before` y `after` guardan posiciones por minuto para verificar el viaje y la muerte sin inventar movimiento retroactivamente. El minimapa SVG usa esas coordenadas reales del motor; los encuentros `v2` anteriores sin navegación siguen mostrando su representación visual histórica. El límite superior de partidos nuevos es **76 minutos simulados**: se permite que un asedio tarde en concretarse, en vez de forzar torres o un nexo desde lugares imposibles.

**Límites:** esto es un primer motor espacial abstracto, no un MOBA completo. Los desplazamientos son por nodos/minuto, los agentes siguen rutinas tácticas simplificadas, las decisiones de gran asedio se comprometen según una puntuación de recursos y aún no hay wards, líneas de visión exactas ni campeones. Las pentakills serán más infrecuentes con las nuevas restricciones espaciales; el equilibrio de acciones y traits se revisará en siguientes fases.
