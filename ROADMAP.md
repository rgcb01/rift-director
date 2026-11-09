# Roadmap de Rift Director

**Visión:** sandbox deportivo/empresarial sin final ni ganador definitivo. El jugador pierde cuando la caja llega a 0. Se avanza por **meses**; se prepara la plantilla y se observan partidos autónomos narrados por eventos coherentes. Un mundo procedural de clubes, ligas, mercados y noticias evoluciona sin depender del jugador.

Este roadmap expresa **prioridades y condiciones de terminado**, no fechas prometidas. Las etapas pueden reordenarse después de probar la diversión y estabilidad del prototipo.

## Estado de release y próximas versiones (2026-11-08)

**Publicada: Alpha 0.7.14** mediante PR #32, después de 139/139 pruebas funcionales y 1,000 partidas auditadas más 500 pares espejados. Economía estratégica con decisiones de farm, defensa de oleadas, presión y rotaciones respaldadas por información observada. Frente a 0.7.13: kills 6.41→6.39, remontadas 4.5%→4.2%, victorias azules espejadas 49.9%→49.5%, duración 49.18→49.28 minutos. Cero regresiones bloqueantes y cero advertencias en Actions 42533682794.

**Alpha 0.7.13 cerrada (#29):** wards colocados físicamente por JUN/SUP, visibilidad local limitada y replay auditable; 128/128 pruebas. **Alpha 0.7.14 cerrada (#32):** evaluación de riesgo visible, defensa física, prioridades macro selectivas y costes de oportunidad auditables. **Siguiente: Alpha 0.7.15**, asedios, defensa de estructuras, inhibidores y conversión causal del Barón; recuperar variedad de splitpush y torres multicarril sin favorecer un lado artificialmente.

**En validación: Alpha 0.7.15A (PR #33, draft):** cierre del mapa mediante HP real del Nexo, defensa y oleadas visibles, sin tirada de ganador por reloj. 144/144 pruebas y 2,000 mapas; duración media 50.21 min y balance espejado 49.4%, con el problema pendiente de victorias tempranas (ninguna antes del minuto 35). La publicación sigue en 0.7.14. Próximos cortes de 0.7.15: inhibidores, asedios tempranos y conversión física del Barón en estructuras.

**Más adelante (propuesta, sujeta a balance):**
- **0.7.14 [integrada]:** economía de recursos y evaluación de riesgos: farm, defensa, presión y rotaciones con costes de oportunidad.
- **0.7.15:** defensa, asedios, inhibidores y conversiones reales de Barón.
- **0.7.16:** calibración, cobertura de regresión, variedad de snowballs/throws/remontadas sin guiones.
- **0.8:** campeones ficticios, habilidades, builds y metajuego competitivo.
- **0.9:** draft, preparación estratégica, picks/bans y series BO3/BO5.

Cualquier cambio deportivo en Alpha x.y.z exige pruebas funcionales, referencia anterior congelada, 1,000 partidos auditados, 500 pares espejados y documentación de resultado en CHANGELOG.

## Estado

- **Alpha 0.7 — [jugable]:** dos regiones ficticias, club y plantilla, finanzas mensuales, mercado sencillo, partidos narrados, noticias, offseason, SVG y guardado JSON.
- **Base del repositorio — [implementada]:** documentación, flujos de incidencias y comprobaciones de regresión.
- **M1.1 — [base implementada; validación manual pendiente]:** RNG, estado inicial, calendario, finanzas, validación v2 y pruebas de regresión. Faltan un guardado histórico real y validación manual en móvil.
- **M1.2 — [base integrada]:** auditoría, K/D/A, presión/visión y prueba aislada sin guardado; faltan posiciones causales, wards y hechizos.
- **M1.3A — [integrada, QA móvil pendiente]:** minimapa SVG por frame, diez profesionales, torres y control territorial sin alterar resultados.
- **M1.4A — [base narrativa integrada]:** cobertura contextual basada en hechos; velocidades 1×/2×/5× retiradas de la interfaz en Alpha 0.7.
- **M1.5 — [integrado, QA móvil pendiente]:** siguiente evento y final instantáneo, historial clicable, marcador/minimapa sincronizados y último replay guardado.
- **M1.3B — [primer corte integrado]:** agentes por nodo, desplazamiento previo a eventos, ganks/torres/objetivos/asedio con presencia real y auditoría. Falta ampliar intención autónoma, interpolación y contraestrategias.
- **M1.3C — [primer corte integrado, PR #29]:** wards físicos y visión parcial; niebla, invasiones y visión avanzada aún pendientes.

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

**Alpha 0.7.15:** mejorar conversiones de Barón a torres e inhibidores, asedios y defensa física; recuperar splitpush y variedad de líneas sin guiones ni resultados garantizados. Mantener pendientes la prueba manual de guardados históricos y móvil (M1.1), la negociación detallada (M3) y la niebla/visión avanzada (M1.3C).

### M1.3 · Minimap dinámico y navegación espacial

**M1.3A — Visualización (Alpha 0.4):** grafo original de nodos, SVG responsive, 10 jugadores, 18 torres, objetivos, presión territorial por líneas, bajas y asedio final. Proyección por minuto determinista y auditable sin alterar resultados de los mapas.

**M1.3B — Navegación causal (pendiente):** cada jugador se desplaza por aristas con tiempos y restricciones; un gank, teamfight o toma de objetivo sólo puede ejecutarse si sus participantes están realmente allí. Los muertos reaparecen en la fuente, sin teletransporte.

**M1.3C — Visión avanzada (pendiente):** colocación/expiración de wards abstractos, niebla, detección de emboscadas, empujes laterales y transiciones de territorio razonadas por presencia real. Mantener rendimiento en móviles modestos.

**Criterio de cierre:** una secuencia de eventos se corresponde exactamente con el mapa, las posiciones afectan al juego desde M1.3B y los controles 1×/2×/5×/instantáneo sólo modifican la reproducción.

### M1.4 · Retransmisión que se quiera observar

**M1.4A — Narración (Alpha 0.5):** 1× para lectura pausada, 2× intermedio, 5× repaso rápido. No revelar en un solo instante varias novedades si está seleccionada 1×. Añadir análisis de presión, oro, visión, momentos críticos y oportunidades de objetivo según datos reales; reducir frases repetidas con variantes por semilla y enfriamiento por tema. Mantener los resultados inalterados ante cambios de velocidad.

**M1.4B — Nuevas acciones causales (pendiente):** las visiones/intercambios de líneas, invasiones, desenganches, cebos, rotaciones y peleas por visión tienen que producirse con actores presentes y tener efectos medibles en mapa/estado, no solo en comentarios. Se coordina con M1.3B (navegación espacial).

**Prueba de diversión:** observar varios mapas completos a 1× y registrar si existen tramos largos sin cambios relevantes o sucesiones repetidas de peleas/torres. Evitar llenar el log con frases triviales que no explican decisiones.

### Alpha 0.6 · Criterios cerrados de navegación (M1.3B parte 1)

- Agentes en el grafo real: un salto entre nodos adyacentes por minuto; rutas reproducibles sin RNG de combate adicional.
- Snapshot antes/después de cada minuto, muerte a fuente, respawn desde fuente, validación de distancias a objetivos (no solo adyacencia topológica).
- Eventos deportivos activados únicamente cuando se cumplen presencia, vida, tiempo y condición de estructura; el resultado deportivo ahora puede cambiar aun con una seed antigua.
- Asedio de final de partida: preparación de ruta con torre exterior→interior→base, defensores reagruparse, nexo solamente con todos los atacantes vivos cerca y dos como mínimo. Sin forzar una victoria por reloj mediante destrucciones inventadas.
- Proyección del minimapa desde las posiciones **simuladas**, ya no ubicando avatares a posteriori para justificar la narración.
- Pendiente: lógica económica del tiempo de viaje, counterganks, defensa de torres, wards, peleas de visión y frecuencia equilibrada de pentakills.

### M1.5 — Reproductor manual por eventos (Alpha 0.7)

- [x] Sustituir temporizador y controles 1×/2×/5× por **Siguiente evento** y **Terminar partida**.
- [x] Capturar `match.moments[i]` inmediatamente después de cada `event[i]`, con stats, oro, torres, dragones, Barón y posiciones antes/después del combate.
- [x] Reproyectar el minimapa para cada instante real; un evento del mismo minuto no revela las consecuencias de los siguientes.
- [x] Marcar lugar de la acción seleccionada y permitir regresar a cualquier entrada del historial ya desbloqueada.
- [x] Finalizar, retroceder y reabrir la última repetición sin simular de nuevo, pagar dos veces ni sobrescribir el save.
- [x] Compatibilidad v2 con reproducción aproximada por minuto cuando no hay instantáneas nuevas.
- [x] Adelantar los nodos iniciales de los profesionales de línea sin colocar a los junglas en un carril.
- [ ] Validación manual de uso táctil, accesibilidad del historial y almacenamiento en teléfonos modestos.

El plan Alpha 0.5 de reproducción a velocidad variable queda **histórico**: se sustituyó por navegación de eventos a solicitud del usuario. El objetivo de M1.4B sigue siendo agregar acciones deportivas causales, no líneas narrativas inventadas.

### Alpha 0.7.1 — Corrección de sincronización espacial

- [x] Exigir distancia euclidiana razonable y nodo del carril para autorizar un gank, no solo proximidad topológica.
- [x] Registrar y auditar el acceso real del jungla desde su nodo.
- [x] Proyectar una escena de evento seleccionable a partir de las posiciones previas del combate y señalar a la víctima caída sin teletransportarla a otro carril.
- [x] Advertencia explícita para replays con ganks históricos imposibles; los guardados `v2` permanecen compatibles.
- [ ] Validación manual del cambio con la reproducción visual de la captura original en escritorio y celular.

### Alpha 0.7.2 — Primer refinamiento de IA por roles
- [x] Mantener ADC/SUP juntos durante fase de líneas, sin amontonar ambos equipos en el mismo nodo neutral.
- [x] Rutas de jungla: campamentos, ganks cortos, regreso, objetivos; ninguna persecución de una misma esquina durante toda la apertura.
- [x] Ventanas de roaming de support y regreso al ADC, sin abandonar bot durante los primeros minutos.
- [x] TOP/MID adelantan solo con ventaja, sin encuentros obligatorios en nodo neutral por reloj.
- [x] Pruebas de rutas por rol, posición al minuto 10, legalidad de acciones y replay.
- [ ] Siguientes refinamientos: seleccionar ganks por oportunidades detectadas, respetar tiempos de campamento/oleadas, y aprendizaje según estilo de jugador. Esta actualización es un comportamiento abstracto por fases, no una IA MOBA de nivel competitivo.

### Alpha 0.7.3 — Revisión integral de navegación / eventos
- [x] Corredor de jungla entre los campamentos propios y caminos de emboscada exteriores.
- [x] Políticas de tránsito por rol y fase: JUN no cruza carriles antes del asedio.
- [x] Ventanas cortas de gank con objetivo de carril explícito y sin cambiar de línea arbitrariamente al elegir una víctima.
- [x] Registrar ganks evitados como hechos verificables sin modificar bajas, objetivos ni oro.
- [x] Teamfights con comprobación de distancia física de los participantes.
- [x] Auditoría de todas las posiciones tempranas JUN y de la tabla de eventos durante numerosos partidos.
- [ ] Próxima mejora: ritmo de desplazamiento por longitud real de cada arista, campamentos/visión causal y lógica de respuesta enemiga; evitar horarios de gank rígidos.
- [ ] QA visual y táctil en navegadores reales, especialmente minutos 5–16.

### Alpha 0.7.4 — Primer combate persistente y escaramuzas de objetivos
- [x] Vida por profesional, recuperación, muerte y reaparición; presentación en el minimapa.
- [x] Detección de 2v1 real alrededor de Dragón/Barón, basada en ubicación y rango físico.
- [x] Daño, kill o retirada con resultado reproducible y explicación causal en RiftCast.
- [x] Retirada física prioritaria con ruta restringida de JUN y exclusión temporal de las capturas.
- [x] Capturas por evento auditables y compatibilidad con replays `v2`.
- [ ] Fase siguiente: extender vida/daño a ganks, duelos de línea y teamfights; incorporar niveles, oleadas, habilidades, enfriamientos y visión real.
- [ ] Equilibrar las tasas de kills/retiradas, sincronizar captura del objetivo y reproducir manualmente partidos en navegadores móviles.

### Alpha 0.7.5 — Salud y daño persistentes en toda la partida
- [x] Intercambios de daño entre profesionales de TOP/MID/BOT a una distancia verificable.
- [x] Ganks: resolver daño, posible baja y retirada según HP real, no probabilidad de asesinato aislada.
- [x] Teamfights: daño persistente contra los objetivos alcanzables, `clash` no letal o eliminaciones legítimas con KDA.
- [x] Las bajas requieren vida 0, los supervivientes heridos pueden retirarse físicamente y los participantes ajenos no obtienen asistencias.
- [x] Narración, minimapa y saltos del replay usan las mismas instantáneas de daño y posiciones.
- [x] Tests de 1v1, 2v1, peleas grupales, HP, scoreboard, múltiples semillas y falsificación de eventos.
- [ ] Fase siguiente: IA reactiva al riesgo por HP y control de visión; duelos bidireccionales y daño en ambos equipos, oleadas y presencia de torres.
- [ ] Fase posterior: campeones, habilidades, enfriamientos, items y builds, objetivos con resistencia y niebla de guerra.
- [ ] QA visual en ordenador y móvil y métricas de equilibrio (minutos/partida, bajas, frecuencia de retiradas, duración de encuentros).

### Alpha 0.7.6 — IA táctica reactiva
- [x] Política de supervivencia por HP y recuperación con histéresis; movimiento legal por rol.
- [x] Detectar inferioridad numérica visible y optar por retroceder en vez de seguir el horario.
- [x] SUP acompaña a ADC herido; JUN cancela ganks de alto riesgo o cambia a un carril vulnerable.
- [x] Detección por visión estimada, sin información perfecta a larga distancia.
- [x] Snapshot simultáneo de posiciones, evitando que el orden de agentes altere lo que cada uno ve.
- [x] Motivos auditables en el replay y visibles en Plan deportivo; tests de decisiones y partidos completos.
- [ ] Fase siguiente: niebla de guerra y wards reales, conocimiento por equipo, líneas de visión verificables y tiempos de memoria.
- [ ] Oleadas, distancia y daño de torres, regresos a base más profundos, experiencia y niveles.
- [ ] Campeones, habilidades, builds, cooldowns, sinergias/traits de combate.
- [ ] Balance visual en móvil y tasas de kills/daño/retirada antes de ampliar la IA.
