# Roadmap de Rift Director

**Visión:** sandbox deportivo/empresarial sin final ni ganador definitivo. El jugador pierde cuando la caja llega a 0. Se avanza por **meses**; se prepara la plantilla y se observan partidos autónomos narrados por eventos coherentes. Un mundo procedural de clubes, ligas, mercados y noticias evoluciona sin depender del jugador.

Este roadmap expresa **prioridades y condiciones de terminado**, no fechas prometidas. Las etapas pueden reordenarse después de probar la diversión y estabilidad del prototipo.

## Estado

- **Alpha 0.5 — [jugable]:** dos regiones ficticias, club y plantilla, finanzas mensuales, mercado sencillo, partidos narrados, noticias, offseason, SVG y guardado JSON.
- **Base del repositorio — [implementada]:** documentación, flujos de incidencias y comprobaciones de regresión.
- **M1.1 — [base implementada; validación manual pendiente]:** RNG, estado inicial, calendario, finanzas, validación v2 y pruebas de regresión. Faltan un guardado histórico real y validación manual en móvil.
- **M1.2 — [base integrada]:** auditoría, K/D/A, presión/visión y prueba aislada sin guardado; faltan posiciones causales, wards y hechizos.
- **M1.3A — [integrada, QA móvil pendiente]:** minimapa SVG por frame, diez profesionales, torres y control territorial sin alterar resultados.
- **M1.4A — [en validación]:** velocidades narradas verdaderamente legibles y cobertura contextual variada, derivada de evidencias y no de historias inventadas.
- **M1.3B/C — [pendientes]:** movimiento por rutas que condicione eventos, después visión, wards y splitpush.

## Hitos

### M1 · Fundaciones confiables — siguiente

- Separar gradualmente el motor del mundo, la UI y la persistencia sin reescribir el juego de golpe.
- Introducir RNG controlable desde pruebas y registro de eventos auditable.
- Definir invariantes: plantillas válidas, contratos consistentes, caja y calendario coherentes.
- Especificar esquema de guardado y plan de migraciones; preservar partidas Alpha 0.2.
- Crear pruebas automatizadas del ciclo mensual, partidos, ingresos y transición anual.

**Aceptación:** simulaciones de varias temporadas sin bloqueos ni estados imposibles; importar un guardado v2 existente sigue funcionando; ninguna prueba de regresión falla.

### M2 · Match Center y comentarios creíbles

- Convertir el partido en sucesión explícita de estados y eventos, no textos aleatorios.
- Validar roles, posición, vida, objetivos, estructuras, respawn y uso válido de Smite.
- Motor único para **ver**, **acelerar** o **saltar** una partida; mismo estado y resultado.
- Retransmisión con marcador, momentos destacados, causalidad y analista.
- Entre mapas, preparar alineación y plan; **sin microgestión obligatoria durante el mapa**.

**Aceptación:** ninguna narración contradice el registro; un MID sin Smite no lo usa; no hay Barón antes de estar disponible, torres inexistentes ni pentakills sin cinco bajas.

### M3 · Cartas, traits y mercado profundo

- Atributos y comportamientos diferenciados por rol; traits contextuales buenos y malos.
- Descubrimiento gradual mediante partidas, scouting y confianza de la información.
- Entrenamientos que mejoran habilidades o hábitos sin garantizar jugadores perfectos.
- Contratos con duración/salarios, ofertas rivales y decisiones de vender o conservar.
- Compatibilidad de equipo, meta y costo como factores reales del rendimiento.

**Aceptación:** equipos con el mismo talento bruto obtienen resultados diferentes por encaje; los traits alteran eventos simulados, no solo etiquetas.

### M4 · Negocio sostenible

- Caja mensual auditable: sponsors, merch, contenidos, liga, staff, sueldos, operaciones.
- Compromisos comerciales vs scrims y descanso; coste de oportunidad real.
- Forecast, runway, contratos y riesgo de iliquidez; cierre de partida al llegar a $0.
- IA financiera sujeta a obligaciones equivalentes a las del usuario.
- Calibración para temporadas de éxito, crisis y recuperación.

**Aceptación:** un club puede vivir sin ganar torneos y un campeón puede quebrar por mala gestión; el ledger explica cada cambio de dinero.

### M5 · Ecosistema procedural y offseason

- Rumores con fuentes/fiabilidad, hechos confirmados y consecuencias conectadas.
- Fichajes que cambian audiencia, atractivo de sponsors y nivel competitivo regional.
- Organizaciones rivales con estrategias de mercado y negocio persistentes.
- Rookies, retiros, regresos, cambios de propietarios y plazas sujetas a reglas de liga.
- Archivo histórico y noticias con memoria causal; crisis poco frecuentes y contextualizadas.

**Aceptación:** simular veinte temporadas genera cambios razonables sin eventos contradictorios; el jugador puede rastrear la causa de una noticia a un estado o transacción real.

### M6 · Competición y meta

- Temporadas y playoffs configurables; series BO3/BO5.
- Campeones ficticios, picks/bans, sinergias, arquetipos y meta cambiante.
- Cuatro regiones y torneos internacionales con clasificación coherente.
- Preparación táctica que influye en la ejecución sin asegurar victorias.

**Aceptación:** ganar requiere preparación y ejecución; un equipo superior no gana siempre, pero se impone más frecuentemente en series largas.

### M7 · Calidad web y móvil

- Navegación y cartas táctiles, legibilidad, teclado y lector de pantalla.
- Mejoras de rendimiento para móviles de gama baja y grandes historiales.
- Opciones de velocidad, pausado, accesibilidad y exportación robusta.
- Considerar PWA offline **solo después** de estabilizar el ciclo de guardado.

**Aceptación:** juego estable en móvil y escritorio, sin fugas al simular años y sin depender de una conexión permanente tras cargar.

### M8 · Datos, contenido y publicación

- Separar datos de equipos, jugadores, ligas y branding del motor.
- Más variedad de logos/retratos SVG originales y generación procedural consistente.
- Paquetes de datos opcionales, con revisión de derechos y validación.
- Elegir licencia, estrategia de releases y política explícita de compatibilidad de partidas.

**Aceptación:** se puede añadir una liga ficticia vía datos sin modificar las reglas base; los assets del proyecto cuentan con permisos apropiados.

## Reglas de priorización

1. **Corrección y guardados antes que más features.**
2. **Causalidad antes que espectáculo:** el narrador describe lo que el motor realmente hizo.
3. **Trade-offs antes que progreso lineal:** los mejores números no deben ganar automáticamente.
4. **Estabilidad antes que visuales pesados:** SVG y web estática son la base.
5. **El mundo no gira en torno al usuario.**
6. **No hay gacha ni condición de victoria:** es un simulador de una empresa deportiva.

## Próxima tarea concreta

**M1.1 restante:** probar un guardado histórico exportado del navegador y verificar la reanudación en móvil. El motor de contratos seguirá necesitando reglas de negociación y caducidad más detalladas (M3). Después avanzar a M1.2 (eventos y narración).

### M1.3 · Minimap dinámico y navegación espacial

**M1.3A — Visualización (Alpha 0.4):** grafo original de nodos, SVG responsive, 10 jugadores, 18 torres, objetivos, presión territorial por líneas, bajas y asedio final. Proyección por minuto determinista y auditable sin alterar resultados de los mapas.

**M1.3B — Navegación causal (pendiente):** cada jugador se desplaza por aristas con tiempos y restricciones; un gank, teamfight o toma de objetivo sólo puede ejecutarse si sus participantes están realmente allí. Los muertos reaparecen en la fuente, sin teletransporte.

**M1.3C — Visión avanzada (pendiente):** colocación/expiración de wards abstractos, niebla, detección de emboscadas, empujes laterales y transiciones de territorio razonadas por presencia real. Mantener rendimiento en móviles modestos.

**Criterio de cierre:** una secuencia de eventos se corresponde exactamente con el mapa, las posiciones afectan al juego desde M1.3B y los controles 1×/2×/5×/instantáneo sólo modifican la reproducción.

### M1.4 · Retransmisión que se quiera observar

**M1.4A — Narración (Alpha 0.5):** 1× para lectura pausada, 2× intermedio, 5× repaso rápido. No revelar en un solo instante varias novedades si está seleccionada 1×. Añadir análisis de presión, oro, visión, momentos críticos y oportunidades de objetivo según datos reales; reducir frases repetidas con variantes por semilla y enfriamiento por tema. Mantener los resultados inalterados ante cambios de velocidad.

**M1.4B — Nuevas acciones causales (pendiente):** las visiones/intercambios de líneas, invasiones, desenganches, cebos, rotaciones y peleas por visión tienen que producirse con actores presentes y tener efectos medibles en mapa/estado, no solo en comentarios. Se coordina con M1.3B (navegación espacial).

**Prueba de diversión:** observar varios mapas completos a 1× y registrar si existen tramos largos sin cambios relevantes o sucesiones repetidas de peleas/torres. Evitar llenar el log con frases triviales que no explican decisiones.
