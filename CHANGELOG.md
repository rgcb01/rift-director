# Changelog

Seguimos el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y utilizamos versionado **Alpha 0.x** sin promesas de compatibilidad permanente.

## [Unreleased]

### M1.2 · KDA y participación individual (2026-11-07)
- Módulo `src/core/match-stats.js` para kills, muertes, asistencias, pentakills y participación en objetivos por jugador a partir de hechos registrados.
- Snapshots independientes de estadísticas individuales por minuto y resumen final en el Match Center.
- RiftCast acredita asistentes y compañeros que realmente participaron en objetivos; se impide que los eliminados reciban participación.
- Las cartas muestran K/D/A acumulado de **mapas narrados**, diferenciándolo de estadísticas de carrera completa.
- Auditoría que reconstruye desde eventos el KDA y verifica cada frame, el total de kills/muertes, pentakills y participantes.
- Compatibilidad con partidas `v2` históricas: no se inventa KDA para partidas sin esos datos.


### Match Center: evidencias y auditoría (M1.2, 2026-11-07)
- Eventos nuevos de partido almacenan evidencia estructurada de autores, víctimas, carriles y objetivos para alinear retransmisión y marcador.
- Auditoría independiente en `src/core/match-events.js`, con tests para cientos de partidos y casos manipulados (Smite en MID, objetivos inválidos, kills duplicadas).
- Corregidas las torres atribuidas a jugadores muertos y las tomas de Barón iniciadas por equipos incapaces de disputarlas.
- **Cambio intencional de simulación:** algunas partidas con la misma semilla pueden tener resultados y secuencias diferentes después de corregir estas acciones; la referencia determinista quedó actualizada y la economía base conserva su cálculo.
- RiftCast presenta datos de autor y participación según el evento simulado.
- Guardados `v2` anteriores siguen cargando: `facts` es opcional en los archivos existentes.
- El simulador es todavía abstracto y no dispone de inventario real de summoner spells ni draft de campeones.


### Refactor financiero (M1.1, 2026-11-07)
- Motor económico aislado en `src/core/finance.js`: salarios, cotización mensual, costes, precio de mercado, transferencias de caja y scouting.
- Ventas de profesionales protegidas ante ofertas cuyo comprador no puede pagar; sin mover plantillas ni saldos en ese caso.
- Pruebas económicas de fichajes repetidos, sponsors, infraestructura, scouting, crisis e insolvencia; sin cambiar el formato de guardado `v2`.
- Cálculo mensual preservado y cubierto por el golden test de Alpha 0.2.

### Refactor y pruebas de calendario (M1.1, 2026-11-07)
- Calendarios, clasificación inicial, partidos pendientes y transición de fecha extraídos a `src/core/calendar.js` sin cambiar el orden deportivo anterior.
- Validación adicional de contratos, pertenencia de jugadores, jornadas y cruces, reportes financieros y partidas pausadas antes de aceptar un JSON importado.
- Pruebas de round-robin de 8/9/10 equipos, 24 meses de progresión y restauración de un partido pausado en una partida de prueba avanzada.
- No se cambia la clave ni el formato de guardado v2. La prueba avanzada es sintética; queda probar una exportación histórica real del navegador.

### Refactor (M1.1, 2026-11-07)
- RNG xorshift32 movido a `src/core/rng.js` sin cambiar la secuencia original.
- Factory del estado v2 extraída a `src/core/state.js` con roles compartidos.
- Guardados e importación centralizados en `src/core/persistence.js`, con validación de relaciones entre clubs, jugadores y alineaciones.
- Scripts cargados explícitamente en el orden correcto por GitHub Pages.
- Pruebas de regresión reproducible, huellas de resultados Alpha 0.2 y validación de guardados corruptos.
- **Sin cambios intencionales de gameplay ni de formato de guardado**.

### Añadido (infraestructura de desarrollo, 2026-11-07)
- README actualizado con instrucciones de juego, desarrollo y estado real.
- Roadmap por hitos con criterios verificables de aceptación.
- Documentación de diseño, arquitectura, guardados y pruebas manuales.
- Guía de contribuciones, plantillas de incidencias y verificación automatizada de sintaxis, estructura y un smoke test de simulación.

### Nota
- **Sin cambios de gameplay** en esta actualización documental. No se incrementa la versión del juego.
- No se sustituye ni migra el formato de guardado existente.

## [0.2.0-alpha] — 2026-11-07

### Añadido
- Juego web ejecutable desde `index.html`, con estilos y lógica en JavaScript puro.
- Creación de organización, tablero, cartas de jugadores y roster por TOP/JUN/MID/ADC/SUP.
- Gestión mensual: entrenamiento, scrims, descansos, contenido, comunidad y scouting.
- Economía: caja, salarios, patrocinadores, merchandising, ingresos de liga y gastos.
- Mercado inicial: agentes libres, ventas y scouting; clubes rivales con actividad autónoma.
- Dos regiones ficticias (`Aurora` y `Boreal`), temporada regular, playoffs y transición de año.
- Motor de partidos con eventos, comentaristas procedurales, marcador y avance temporal.
- Noticias y rumores, rookies, envejecimiento, retiros, cambios de meta y algunos eventos de expansión.
- Guardado automático local; exportación e importación de partidas JSON.
- Escudos y retratos SVG ligeros y diseño responsive.
- Publicación estática mediante GitHub Pages.

### Limitaciones conocidas
- La lógica permanece concentrada en `game.js`, sin módulos ni pruebas de dominio completas.
- Los partidos abstraen muchas reglas de un MOBA; no incluyen draft completo.
- Economía, traits, carreras y comportamiento de la IA requieren balance y pruebas prolongadas.
- La interfaz móvil y las validaciones de importación aún necesitan endurecimiento.

<!-- Añadir siempre los cambios nuevos en [Unreleased]. Moverlos a una versión fechada al publicar una release. -->
