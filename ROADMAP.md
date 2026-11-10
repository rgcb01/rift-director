# Roadmap de Rift Director

**Visión:** sandbox deportivo/empresarial sin final ni ganador definitivo. El jugador pierde cuando la caja llega a 0. Se avanza por **meses**; se prepara la plantilla y se observan partidos autónomos narrados por eventos coherentes. Un mundo procedural de clubes, ligas, mercados y noticias evoluciona sin depender del jugador.

Este roadmap expresa **prioridades y condiciones de terminado**, no fechas prometidas. Las etapas pueden reordenarse después de probar la diversión y estabilidad del prototipo.

## Estado de release y próximas versiones (2026-11-09)

**Publicada: Alpha 0.7.16** mediante PR #44, con 198/198 pruebas y 2,000 mapas (1,000 auditados + 500 pares espejados). Integración de Nexo y torres físicos, objetos/recetas, contraasedios y recompensas por bajas reales del rezagado. Versus 0.7.14: remontadas 4.2%→4.1%, kills 6.39→6.44, duración 49.28→49.78 y azul espejado 49.5%→49.0%. Cero regresiones bloqueantes.

**Histórico de prioridad (2026-11-08): campeones → objetos → escalado → habilidades/combate → IA y balance.** La antigua 0.7.15 de defensa, inhibidores y conversión de Barón queda **pospuesta**, no implementada. El motor ya tiene XP y niveles 1–18, cinco objetos abstractos, oro personal y vida normalizada; todavía no hay campeones seleccionables, kits propios ni escalado estadístico por campeón. Esta es una decisión de planificación, **no una funcionalidad entregada**.

**Pendientes del roadmap original (numeración por reordenar después de 0.7.16):**
- **Catálogo ampliado de campeones (pendiente):** registro data-driven, identificadores estables, seis prototipos (tanque, luchador, asesino, mago, tirador y soporte) y ruta hacia un roster inicial de 12 campeones originales. Cada campeón define roles permitidos, alcance, estadísticas base y crecimiento, etiquetas de daño, fortalezas, debilidades y contrato de cuatro habilidades (pasiva/Q/W/E/R o esquema equivalente: una pasiva más cuatro activas). Asignación determinista de un campeón a cada profesional antes del partido; sin picks/bans ni cambios obligatorios de UI. No atribuir kills a habilidades todavía no simuladas.
- **Pasivas y objetos avanzados (pendiente):** ampliar los 15 objetos completos y 15 componentes ya integrados hacia 20–30 objetos con estadísticas reales, pasivas únicas y condiciones de compra. Construcción de inventario de hasta seis espacios, botas y arquetipos de builds; compras solo en base, cartera/earned/spent auditables, no duplicar oro ganado. Mantener adaptador de compatibilidad para registros y replays históricos.
- **0.7.17 — Escalado y power spikes:** convertir XP/nivel 1–18 en HP máximo, daño, armadura, resistencia mágica, velocidad de ataque y otras estadísticas efectivas; progresión de rangos de habilidades, puntos de mejora y curvas de daño/tanqueo por campeón. El oro crea picos de poder solo al adquirir objetos; los niveles, al obtener XP. Eliminar doble conteo entre bonus antiguos y atributos nuevos. Medir daño efectivo, time-to-kill (TTK) y ventanas de ventaja en early/mid/late sin buffs artificiales por minuto.
- **0.7.18 — Kits activos y resolución de combate:** pasiva y Q/W/E/R ejecutadas de forma autónoma en encuentros; cooldowns, coste de recurso cuando proceda, rangos, selección de blanco, daño físico/mágico, armadura, resistencia, penetración, escudos, curación y control de masas. Resolver encuentros en subpasos deterministas locales sin teletransporte entre nodos del grafo, sin RNG global adicional y sin crear kills por guion. Replay auditable con daño/efectos/HP/cooldown.
- **0.7.19 — IA de campeón, compras y sinergias:** elección de campeones y builds guiada por rol, estilo y competencia del profesional, aliados, rivales observados, economía y estado del mapa; combate con iniciación, protección de carry, flanqueo, peel, retirada y cooldowns. Evitar omnisciencia; conservar identidad entre profesionales, composición y contrajuego. Draft completo se reserva para 0.8.
- **0.7.20 — Balance y conversión a objetivos:** calibrar variedad de enfrentamientos, frecuencia de kills, duración P50/P90, TTK, bola de nieve, shutdowns, remontadas y sesgo de lado; aprovechar bajas reales para oleadas y estructuras sin imposición por reloj. Solo después reabrir la defensa/asedio/inhibidores y conversión de Barón pospuestos, priorizándolos si siguen siendo el cuello de botella.
- **0.8 — Draft y metajuego:** picks/bans, maestría o champion pool persistente por profesional, counters y sinergias, estrategias de equipo y cambios de meta con reglas explicables.
- **0.9 — Competición profunda:** series BO3/BO5 y preparación entre mapas, sobre la base de un simulador deportivo ya equilibrado.

**Regla de entrega:** no cerrar una versión por el catálogo añadido. Cada 0.7.x exige pruebas funcionales, baseline congelado, 1,000 mapas auditados, 500 pares espejados (1,000 mapas adicionales), documentación en CHANGELOG, reproducción determinista, auditoría de kills/posiciones/oro y comparación con 0.7.14 (6.39 kills, 49.28 min, 4.2% remontadas, 49.5% azul espejado). Las metas de kills y duración se ajustan a partir de la distribución observada, sin forzar victorias, bajas ni un timeout.

### Diseño técnico del sistema de campeones (propuesta pendiente de implementar)

**Separación obligatoria:** `Professional` es la persona contratada con atributos (mecánica, macro, comunicación, visión, comportamiento, traits y futura maestría); `ChampionDefinition` es un personaje ficticio estático, compartido entre partidas; `MatchChampionState` es la instancia efímera del campeón seleccionado por un profesional para un mapa, con nivel, XP, inventario, HP, recursos, cooldowns, efectos y estadísticas efectivas. No convertir al profesional en un campeón permanente ni alterar salarios, contratos o progreso de club.

**Contrato data-driven por campeón:** `id`, `name`, `roles[]`, `archetype`, `rangeType`, `attackRange`, `damageProfile`, `baseStats`, `growthPerLevel`, `resourceType`, `passive`, `abilities.Q/W/E/R` (efecto, targeting, alcance, cooldown, coste, daño/escudo/curación/CC, escalados AD/AP/vida, rangos y condiciones). Catálogo original sin reutilizar propiedad intelectual de otros juegos. JSON/objetos validados al cargar; efectos resueltos por un intérprete de primitivas pequeño, no scripts arbitrarios por campeón.

**Ejecución automática:** `Professional + Champion + Build + Estado de mapa/visión + Plan táctico → decisión de IA → acciones válidas → resolución de encuentro → eventos auditables → narración/replay`. La habilidad del profesional afecta ejecución, timing, objetivos, coordinación y errores; nunca reemplaza la identidad ni estadísticas propias del campeón. El campeón determina lo físicamente posible y el profesional la calidad de la decisión.

**Límites de alcance:** empezar con seis arquetipos y seis kits simples pero completos, después crecer a 12; no construir 100 personajes o 100 ítems antes de validar. Resolver combates en ventanas locales de segundos manteniendo navegación de nodos como autoridad de presencia. Las pasivas y activas deben tener cooldown, rango y recursos verificables; no se permite narrar un stun o ultimate que el estado no ejecutó. La progresión debe surgir de XP y compras reales, no del minuto de juego.

**Aceptación específica:** un tanque resiste más que un asesino en condiciones equivalentes; un asesino tiene ventana de burst pero castigo tras cooldown; un tirador escala con niveles/objetos y requiere protección; un soporte aporta utilidad rastreable. Equipos con el mismo oro pueden rendir distinto por composición, profesional y build. Un matchup ganador nunca garantiza victoria. Los guardados `v2` históricos se siguen leyendo y los replays viejos no se reinterpretan fraudulentamente con nuevos kits.

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

- **Prerequisito adelantado a Alpha 0.7.15–0.7.20:** campeones ficticios, estadísticas, objetos, habilidades, escalado y balance causal del motor deportivo.
- En 0.8: picks/bans, maestría por profesional, sinergias de composición, counters y meta cambiante.
- En 0.9: temporadas y playoffs configurables; series BO3/BO5, preparación entre mapas y eventual ampliación internacional.
- Cuatro regiones y torneos internacionales con clasificación coherente, después del núcleo competitivo.
- Preparación táctica que influye en la ejecución sin asegurar victorias.

**Aceptación:** personajes, builds y composiciones producen ventajas rastreables sin resultados automáticos; un equipo superior se impone más frecuentemente en series largas, pero puede perder.

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

**Alpha 0.7.15 — Vertical slice de campeones (sin modificar todavía los resultados por habilidades futuras):**
1. Introducir `ChampionRegistry` y validar esquemas de seis campeones ficticios con identidad, roles, estadísticas y kits declarativos; diseñar hasta 12 antes de ampliar contenido.
2. Separar `Professional`, `ChampionDefinition` y `MatchChampionState` sin cambiar la economía del club ni el origen único de eventos. Seleccionar determinísticamente un campeón compatible para cada jugador de los diez.
3. Exponer campeón elegido, arquetipo y atributos en estadísticas/replay. Añadir pruebas de asignación, integridad del catálogo, invariantes y guardados antiguos.
4. Mantener compras/vida/daño previos a través de adaptadores mientras el nuevo motor llega en 0.7.16–0.7.18; congelar y comparar el benchmark (1,000 auditados + 500 pares espejados). Documentar los cambios en CHANGELOG.
5. **No** dar por entregados habilidades ejecutables, ítems escalados o balance hasta sus versiones específicas. Si una mejora del modelo de combate aumenta duración o sesgo, investigar antes de proseguir.

**Dependencias pospuestas pero abiertas:** conversión del Barón a estructuras, inhibidores y defensa física del asedio; QA manual móvil/guardados históricos (M1.1/M1.5), negociación detallada (M3) y visión avanzada (M1.3C). Reabrir asedio cuando el escalado y el daño por campeón sean medibles.

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
