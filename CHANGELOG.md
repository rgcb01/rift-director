# Changelog

Seguimos el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y utilizamos versionado **Alpha 0.x** sin promesas de compatibilidad permanente.

## [Unreleased]

### Reparación de iconos de campeones en simulador
- El TAB ahora muestra retratos también en partidas antiguas, reconstruyendo la identidad visual de manera determinista sin editar resultados ni inventar un draft histórico.
- Los marcadores de profesionales en el minimapa ahora incluyen el retrato SVG del campeón, manteniendo borde de equipo, indicador de rol, vida y estado de muerte.
- El Art Pack 01 PNG no está presente en el repositorio público; se mantiene el retrato SVG integrado como recurso disponible, sin afirmar que el atlas está publicado.


### Arte de campeones: Rift Faceted Fantasy (solo presentación)
- Diez retratos originales SVG facetados con siluetas, cascos, peinados, máscaras, ojos y paletas específicas por campeón, inspirados en la estética low-poly vectorial del scoreboard conceptual.
- Se conserva la simulación deportiva, los ítems, el oro y el replay sin cambios. La expansión económica de Alpha 0.7.16 permanece experimental en PR #37 por regresiones detectadas en duración y remontadas.
- Se añaden pruebas de identidad visual, y siguen siendo obligatorias las auditorías de 1,000 mapas y 500 pares espejados.


### Preview de campeones y objetos en Match Center
- Se añade panel de espectador con dos equipos, 10 retratos low-poly SVG originales, nombre de campeón, profesional, rol, nivel, K/D/A y hasta seis espacios de objeto por fila.
- Los campeones se asignan determinísticamente y se guardan en el partido; el panel consume XP, compras y estadísticas del instante seleccionado en el replay, sin fabricar compras o KDA. Replays anteriores sin asignación conservan su interfaz histórica.
- **Solo interfaz:** los campeones todavía no modifican habilidades ni daño, y los cinco objetos vigentes no han sido sustituidos por builds escaladas.


### Repriorización de roadmap (solo planificación, 2026-11-08)
- Se adelanta el núcleo de **campeones, objetos, escalado, habilidades y builds** a Alpha 0.7.15–0.7.20. La 0.7.15 previamente prevista para asedios, inhibidores y Barón queda pospuesta; **no se presenta esta planificación como gameplay implementado**.
- Se especifican `Professional` frente a `ChampionDefinition` y `MatchChampionState`, seis arquetipos iniciales, catálogo objetivo de 12 campeones y 20–30 objetos, combate causal y guía de compatibilidad/replays.
- Cada iteración conservará auditoría de 1,000 mapas y 500 parejas espejadas, pruebas funcionales, comparación de kills/duración/TTK/remontadas/sesgo y registro de resultados antes de continuar.


## [0.7.14-alpha] — 2026-11-08

### Riesgo y coste de oportunidad verificables
- **MacroPolicy determinista y auditable:** TOP/MID ponderan cuatro alternativas: farmear, defender una oleada amenazante, presionar con oleada y (MID) rotar a un Dragón/Barón anunciado. La puntuación utiliza posición y HP propios, visión local/wards, rivales realmente observados, aliados próximos, frente de oleada, estructuras, oro y distancia por el grafo. Nunca consulta HP oculto ni posición global desconocida.
- **Riesgos evaluados:** sobreextensión, falta de visión, inferioridad numérica visible y distancia sin escoltas. Un equipo rezagado puede disputar una oportunidad real si tiene colaboradores cercanos y visión suficiente; no recibe buffs ni una probabilidad de remontada forzada.
- **Intervención selectiva:** el sistema existente de roles permanece al mando salvo que la nueva decisión tenga un margen de ventaja observable. El plan dura hasta tres minutos, pero se cancela ante peligro, muerte, cambio de circunstancias o pérdida del objetivo. Se preserva el splitpush legítimo de TOP con oro, oleada y salud favorables; las rutas de TOP son simétricas y seguras.
- **Defensa física:** una oleada amenazante puede frenarse por un defensor presente. No hay oro adicional, kill, torre ni captura por script; sigue aplicando la simulación de oleadas, HP, movilidad y estructuras. Se calibró la contribución de un defensor aislado por debajo de un asedio coordinado.
- Los frames/replays guardan puntuaciones y evidencia, y la batería añade pruebas de rivales ocultos, wards, escorts, oleadas, riesgo, cancelación y preservación de rol. Se mantiene una duodécima gráfica `macro.svg` y métricas de presión riesgosa y objetivos escoltados.
- **Validación de release (#32):** 139/139 pruebas funcionales, 1,000 partidos auditados y 1,000 espejados; cero fallos de causalidad, regresiones bloqueantes o advertencias (runs 42533090373 y 42533090372). Frente a 0.7.13: remontadas 4.5%→4.2%, victorias azul espejo 49.9%→49.5%, kills 6.41→6.39, duración 49.18→49.28 min. Huella deportiva `6b5d60d9...` congelada; hash del mundo/finanzas sin cambios.
- **A vigilar en 0.7.15:** torres en dos o más líneas 82.4%→79.6%, ambos equipos toman torres 29.7%→25.7% y mapas con splitpush solitario 68.9%→64.9%. No alcanzan umbral bloqueante, pero ameritan seguimiento en las próximas iteraciones de asedio.


## [0.7.13-alpha] — 2026-11-08

### Primer corte de wards y visión física imperfecta
- JUN y SUP pueden colocar wards al visitar puntos de río, fosos y corredores de emboscada; requieren estar vivos y físicamente presentes. Cada equipo mantiene como máximo dos wards activos, con duración de ocho minutos y cooldown de nueve minutos por profesional.
- Una ward revela rivales dentro de un radio local de 70 unidades SVG para su equipo, sin acceso global a posiciones ocultas. La observación de rango cercano y el reconocimiento probabilístico previos siguen funcionando; este primer corte no implementa visión por paredes ni niebla pixel-perfect.
- Los eventos `ward_place` incluyen autor, equipo, ubicación y expiración. Frames, historial y minimapa SVG muestran las wards existentes en cada momento; las wards caducadas desaparecen, sin reescribir el pasado.
- Auditoría de colocación, propiedad, expiración y coherencia del replay, más escenarios controlados y lotes multisemilla. Las decisiones usan la misma semilla determinista y no añaden sorteos al RNG mundial.
- **Aprobada e integrada (#29):** CI 128/128, 1,000 mapas auditados + 1,000 espejados, cero bloqueos/advertencias (runs 42460763542 y 42460763541). Frente a 0.7.12: kills 6.39→6.41, remontadas 4.2%→4.5%, azul espejado 50.2%→49.9%; los eventos adicionales son wards físicos registrados. No se alteran daño, oro, XP, objetos, Smite ni probabilidades de victoria.


## [0.7.12-alpha] — 2026-11-08

### Contraataques basados en visibilidad y presión territorial ganada
- **Balance final verificado (2,000 mapas, CI y 11 SVG):** se aumenta la oportunidad de combate visible, manteniendo el daño y los pagos originales: puntuación base 18, cooldown de 3 minutos y probabilidad determinista acotada a 34–85%. Frente a 0.7.11: kills 6.86→6.39, remontadas 1.9%→4.2%, shutdowns por mapa 8.8%→11.0%, azul espejado 51.1%→50.2%; ninguna regresión bloqueante ni advertencia. Auditorías 1,000/1,000, 1,000 mapas espejados; run 42459888783.
- Ajuste de balance posterior a las primeras 2,000 partidas: permitir enfrentamientos visibles con números iguales cuando un objetivo está herido, resolver varios rivales visibles en una misma pelea y evaluar hasta tres oportunidades independientes sin tirar RNG global. El motor de daño y los requisitos de alcance siguen sin cambios. Requiere benchmark comparativo nuevo antes de aprobar.
- Corrección posterior de prioridad: durante la ventana de Barón, un SUP con orden de preparación no abandona el objetivo por un `pressure_push` incidental; sigue pudiendo retirarse por riesgo o atender un plan objetivo explícito.
- **Selección de peleas por oportunidad real:** se reemplaza la selección probabilística del equipo atacante en las peleas grupales por una evaluación determinista de un enemigo realmente visible, el apoyo físico próximo (mínimo dos aliados), salud, aislamiento local, ventaja de oro y racha conocida del objetivo.
- Las decisiones distinguen **caza de shutdown**, **rival aislado**, **contraataque de equipo rezagado** y **pelea con superioridad visible**. La información de visión es la aproximación existente y no permite revelar siempre enemigos lejanos. Se respeta el enfriamiento entre peleas y no se ejecutan ataques contra muertos o enemigos ya en retirada.
- **Sin kills artificiales:** la decisión solamente propone un encuentro; daño, alcance, objetivos alcanzados, bajas y retirada siguen resolviéndose por `Encounters.resolveCombat` con las estadísticas existentes. No se sube el daño, la XP, las recompensas ni se crean probabilidades de victoria especiales.
- **Conversión de una pelea ganada:** después de una baja confirmada, el equipo puede conservar una orden de presión de oleada durante tres minutos, únicamente para quienes participaron y en un carril defendible. Los participantes caminan por el grafo; las placas y torres exigen oleada, recorrido y condición estructural real. Se anotan las estructuras efectivamente ganadas durante esa orden.
- El replay y los hechos deportivos incluyen motivo, rival visible, salud observada, número de aliados, déficit económico y recompensa potencial cuando hay una pelea táctica. Se audita que autor, rival y asistentes estén en alcance y que una orden de presión proceda de una baja confirmada.
- Pruebas focalizadas de visibilidad, enemigo aislado, cazas de shutdown, rechazos sin ventaja y seguimiento tras combate; **11 gráficas** y benchmark de **1,000 partidos auditados + 1,000 espejados** frente a Alpha 0.7.11.
- **Alcance:** no se modifican Smite, Dragón/Barón, precio de objetos, niveles, fórmula de daño o payouts. El objetivo es crear contraataques sin resultados preprogramados.


## [0.7.11-alpha] — 2026-11-08

### Remontadas causales: rachas y recompensas por shutdown
- **Nuevo libro mayor de rachas individuales:** cada profesional acumula bajas consecutivas desde su última muerte; morir reinicia su racha, sin importar el minuto o la diferencia de oro.
- **Shutdowns comprobables:** eliminar a un rival con 3+ bajas consecutivas concede una recompensa adicional de oro de 150 (racha 3), 240 (racha 4), 330 (racha 5), hasta un máximo de 420. No existe recompensa para rachas menores a tres.
- La recompensa **solo surge de un combate real con HP en cero**, y se acredita una única vez tanto al oro acumulado del equipo como a la cartera personal del asesino. El oro base por kill (320) sigue igual.
- Los eventos deportivos guardan la víctima, su racha previa, el bono y el total; una multikill puede cortar varias rachas diferentes. RiftCast y el replay histórico muestran el shutdown; no se inventan kills ni porcentajes de remontada.
- Nueva auditoría independiente reconstruye cada racha desde los hechos de la partida, detecta recibos falsos, duplicaciones de oro personal y divergencias de instantáneas. Se añaden pruebas de unidad y de simulación multisemilla.
- **10 gráficas y comparativa por versión:** nuevas métricas de mapas con shutdown, oro total y oro entregado al equipo que continúa perdiendo. Se comparan 1,000 partidas auditadas + 1,000 espejadas contra el baseline verificado de Alpha 0.7.10.
- **Scope controlado:** no se tocan daño, XP, IA de navegación, decisión de Dragón/Barón ni costes de objetos. Las futuras mecánicas de pelea en objetivos se evaluarán por separado.
- **Resultado de validación (2,000 partidos, run 42454674583):** 1,000 mapas auditados y 1,000 espejados, cero errores de causalidad; 8.8% con shutdown y 19.05 de oro extra por mapa en promedio. El oro de shutdown fue para equipos aún en desventaja a razón de 12.63 por mapa, contando todos los encuentros.
- **Hallazgo abierto de balance:** las remontadas medidas pasaron del 2.0% al 1.9%, las kills de 6.87 a 6.86 y Dragón/Barón quedaron prácticamente sin cambios. La mecánica es válida, pero **no resuelve aún las remontadas**: los shutdowns son poco frecuentes y la economía recuperada es insuficiente. No forzar un comeback ni subir recompensas sin revalidar. Pendiente: mejorar las oportunidades de pelea y castigo real a ventajas mal defendidas en una versión distinta.



## [0.7.10-alpha] — 2026-11-07

### Decisiones neutrales: Dragón, disputa y presión cruzada
- El Dragón deja de depender de una simple tirada de propietario: los equipos evalúan el objetivo disponible según visión del río, presión de BOT, oleadas, economía, dragones previos y salud real de JUN/SUP.
- Un equipo puede **preparar Dragón**, **disputarlo** o **ceder el foso para intentar placas y torres en TOP**. Los planes tienen duración y cooldown, pero los premios nunca ocurren sin recorrido físico, participantes presentes, oleadas y validación.
- JUN/SUP forman el núcleo de la captura, sin teletransporte; se mantienen las responsabilidades de roaming y protección del ADC. Si no pueden llegar o están heridos, puede no haber captura.
- Cuando ambos clubes están cerca, la captura pasa a depender del número y salud de participantes, del jungla y de la visión. Un JUN rival presente y con suficiente salud puede intentar un **robo con Smite** real.
- **Barón compite con Dragón** mediante su valor estratégico: cuando ambos están disponibles, economía, torres, objetivos anteriores y avance del mapa determinan la prioridad. El soporte y jungla no abandonan automáticamente Barón por un Dragón disponible.
- Ajuste de coste de oportunidad: el compromiso de preparar un objetivo neutral dura como máximo cuatro minutos simulados (incluido el minuto de decisión) y el siguiente intento requiere un descanso estratégico de doce minutos desde la llamada, salvo que una captura cambie la aparición disponible. No se modifican el daño ni el respawn del objetivo.
- RiftCast diferencia un Dragón sin oposición, un Dragón disputado y un robo. Las placas/torres anotadas como presión cruzada exigen recompensa efectivamente conquistada.
- Se mantienen XP, objetos, precios, reglas de recall y daño de Alpha 0.7.9. Se añaden auditorías y gráficas de Dragones disputados, robos, primer Dragón y trades ganados con oleadas.
- Se ejecuta benchmark estándar de 1,000 mapas + 500 parejas espejadas (2,000 partidos), comparado con el baseline 0.7.9 verificado.
- **No incluye** niebla de guerra completa, tipos elementales ni alma de Dragón: el objetivo es validar la decisión causal sin extender el scope.


## [0.7.9-alpha] — 2026-11-07

### Primer sistema de niveles, compras y picos de poder
- Diez profesionales con **experiencia y niveles 1–18**, ganados por presencia, oleadas y objetivos de mapa. Las kills y asistencias también otorgan XP trazable.
- Cada jugador mantiene **cartera de oro personal y oro gastado**. Las recompensas se obtienen por ingreso pasivo, farmeo real, eliminaciones y objetivos; el oro total del marcador sigue siendo oro acumulado y no se consume al comprar.
- **Tienda de cinco objetos** con costes y estadísticas de ataque, defensa y tempo. La elección se calcula por rol, estado económico e inventario; máximo tres objetos únicos por profesional.
- **Regreso físico a base** para comprar; la IA puede sacrificar presión por una mejora, pero limita el número de viajeros simultáneos. Las compras quedan registradas con jugador, lugar, coste, nivel y objeto.
- El combate, las selecciones de objetivos individuales y las peleas consultan ahora niveles y equipo reales; no se otorgan bajas sin el daño necesario.
- Ajuste de calibración tras 2,000 partidos: coste de objetos más elevado, XP por minuto más contenida y bonificaciones ofensivas/defensivas diferenciadas; oro de placas, torres y grandes objetivos distribuido a las carteras.
- El jungla puede robar Barón con Smite **sin otro aliado presente** si realmente está en el foso: no se exige un segundo compañero artificial para validar el robo.
- El reproductor de partidos muestra nivel, oro disponible y equipo por profesional en el momento histórico seleccionado; RiftCast describe las compras como hechos.
- **Revisión de resets tácticos:** comprar no obliga automáticamente a abandonar un asedio; solo un profesional herido puede retirar presencia de un asedio activo. Un jugador sano mantiene su carril. Cada profesional tiene un máximo de un viaje voluntario de tienda por partido; comprar tras reaparecer no consume el permiso. Se respetan los roams de SUP y los corredores de JUN, y la narración distingue compra tras muerte y regreso voluntario.
- **Benchmark de coste de oportunidad:** minutos-jugador invertidos en viaje a tienda, compras voluntarias frente a compras naturales y compras antes de minuto 30, con auditoría de origen del recall en las instantáneas.
- Reproducción determinista, integridad de oro y auditoría de compras/XP en partidos completos; la contabilidad empresarial y el RNG de partido siguen separados.
- Benchmark de 1,000 partidos + 500 parejas espejadas, comparado con la **referencia Alpha 0.7.8** congelada y auditada. Reporta compras, niveles, conversiones de oro, remontadas y duración.
- Alcance deliberado: modelo de objetos abstractos (no estadísticas ni campeones específicos de LoL); sin inventario de seis objetos, runas, habilidades activas, animaciones de compra ni minions físicos.


## [0.7.8-alpha] — 2026-11-07

### Rotaciones laterales, splitpush y respuesta defensiva
- **Planes de asedio divididos:** un especialista TOP/MID puede presionar una línea secundaria mientras el resto del equipo mantiene el asedio principal. La ruta se elige usando estructuras, placas y posición de oleadas, no un evento escrito por tiempo.
- **Contraasedios:** el rival puede contestar la oleada lateral visible o intentar intercambiar una estructura en el otro lado. Las decisiones se documentan en los estados de navegación de cada minuto.
- **Splitpush individual verificable:** una torre sin defensores cercanos puede caer con un único profesional presente si su oleada tiene suficiente presión y ya conquistó las tres placas; no se inventan participantes.
- El oro, el estado de oleadas, la vida, la posición y los recorridos siguen conservándose entre snapshots y replays. RiftCast distingue la torre lograda por un splitpusher individual.
- Nuevos indicadores de balance: **partidos con torres en múltiples carriles**, estructuras para ambos bandos y torres obtenidas por splitpush; comparación con el benchmark congelado de 0.7.7.
- **RNG separado por partido:** cada mapa consume una única semilla del mundo y todas las tiradas de combate, placas y narración se resuelven localmente. El número de eventos ya no modifica aleatoriamente el mundo empresarial posterior. El reporte financiero de referencia conserva su huella; se renueva de forma explícita la huella del RNG global.
- No añade ítems, niveles, campeones ni wards: el cambio está aislado a macroestrategia y auditabilidad.


## [0.7.7-alpha] — 2026-11-07

### Economía táctica de oleadas y asedio reversible (primer slice)
- Primer modelo ligero de presión por oleada (momentum agregado por carril, sin simular minions individuales), determinado por prioridad, presencia física y escoltas.
- El farmeo otorga oro de forma determinista según prioridad local y participación de los laners.
- Placas con secuencia de daño por estructura y oro al reclamarlas; RiftCast narra estos hechos verificados.
- Primera torre con recompensa única; las demás requieren placas, oleada y dos profesionales vivos cerca de la estructura.
- Asedio decidido por ventaja económica, objetivos y oleadas, con compromisos reversibles. No se fija permanentemente al atacante en el minuto 36.
- El nexo necesita dos atacantes presentes, sin exigir que todos los compañeros vivos se reúnan.
- Estado de oleadas y oro conservados en snapshots y replays; los eventos de placas no consumen RNG deportivo.
- Tests nuevos de economía, factualidad y auditoría; benchmark de 1,000 partidos + 1,000 espejados antes de fusionar.
- **No incluye aún** minions individuales, XP, objetos, inhibidores ni wards/fog of war.


## [0.7.6-alpha] — 2026-11-07

### IA táctica reactiva por vida, visión y oportunidad
- Nuevo módulo determinista `src/core/tactical-ai.js` con decisiones por rol antes de cada movimiento, sin consumir RNG deportivo ni reescribir combates previos.
- Vida crítica provoca retirada para recuperarse con histéresis; los profesionales no vuelven inmediatamente a pelear al cruzar un umbral de HP.
- Un profesional en desventaja numérica **detectada** puede replegarse; SUP protege a ADC herido en vez de irse a un roaming programado.
- JUN evalúa salud, visión y objetivos vulnerables: puede cancelar un gank inseguro, desviarlo hacia una línea débil o evitar un objetivo arriesgado sin transitar por carriles como atajo.
- La presión por ventaja solo se concede cuando existe soporte local, visión y presión suficientes; se mantiene el asedio final que permite terminar la partida.
- Detección de amenazas por distancia + visión estimada + seed, sin información perfecta del enemigo; las decisiones de los diez profesionales usan la misma instantánea inicial de posiciones.
- Replay de decisiones: `reason`, `decisionVersion` y destino registrados en snapshots; panel Plan deportivo explica cada orden reactiva. Archivos `v2` anteriores permanecen compatibles.
- Pruebas unitarias para salud crítica, escolta, gank seguro, visión incompleta, inferioridad 2v1 y asedio; múltiples partidos auditados.


## [0.7.5-alpha] — 2026-11-07

### Combate unificado en todos los carriles
- `Encounters.resolveCombat`: contrato de daños determinista compartido por intercambios TOP/MID/BOT, ganks y enfrentamientos entre equipos; registro de `impacts` con daño, HP antes y después, identidad, resultado y retirada.
- **Las kills requieren HP = 0**: ganks y teamfights ya no eliminan automáticamente por una tirada favorable. Los choques no letales provocan lesiones, retirada cuando corresponde, o continuación con vida.
- Nuevas acciones `lane_trade` y `clash`. Los ganks evitados ahora pueden causar daño real y obligar al objetivo a regresar; las eliminaciones de línea y peleas grupales sí acreditan bajas y asistencias verificables.
- TOP y BOT pueden intercambiar a alcance de línea razonable, mientras que kills de gank/teamfight exigen rango físico de combate. Los soportes y junglas que se retiran deben recorrer conexiones del mapa, sin reaparecer artificialmente.
- `RiftCast` y replay incluyen HP antes/después, participantes y desenlaces seleccionables; el minimapa resalta a atacantes, víctimas y profesionales en retirada.
- Auditoría deportiva y espacial ampliada: HP congruente con daño, asistentes presentes, bajas con cero HP, muerto en fuente, retirada con destino legal, rechazo de teletransportes o daño entre carriles.
- Se ajustó el balance para no contar un 2v2 como una emboscada con superioridad; nuevas pruebas directas y simulaciones masivas con varias seeds.
- Guardado `v2` inalterado en su contrato. Cambios intencionales de RNG deportivo y resultados para partidas nuevas; economía mensual y partidas antiguas preservadas.


## [0.7.4-alpha] — 2026-11-07

### Vida y consecuencias de encuentros cerca de objetivos
- Motor `src/core/encounters.js`: salud 0–100, recuperación, detección de inferioridad local en Dragón/Barón, daño basado en habilidades y vida, resultado reproducible sin RNG deportivo adicional.
- **2v1 ya no puede permanecer invisible** en las zonas de objetivo: el resultado es una baja real o una retirada obligatoria, no necesariamente una muerte automática.
- Los supervivientes dañados priorizan el retroceso hacia posiciones seguras por una ruta real (sin teletransporte); muertos van a fuente, se recuperan tras reaparecer y no participan en objetivos.
- Los frames e instantáneas por jugada guardan salud; barras de vida y roles resaltados en el minimapa; RiftCast explica ventaja numérica, daño, supervivencia o asesinato.
- `skirmish` tiene facts estructurados, asistencias cuando hay baja, registro del objetivo y auditorías deportivas, espaciales y sanitarias; los intentos no letales no suman kills.
- Guardados `v2` históricos siguen compatibles sin reconstruir barras de vida; nuevo golden test para cambios deportivos deliberados.


## [0.7.3-alpha] — 2026-11-07

### Corredores de jungla y consistencia de toda la tabla de eventos
- JUN deja de atravesar MID como atajo entre campamentos; se unen directamente los dos campamentos de cada lado y se añaden cuatro posiciones de emboscada en la jungla exterior, accesibles desde el río.
- Nueva selección semántica de rutas: el BFS restringe los nodos permitidos para JUN hasta minuto 35. Solo durante el asedio tardío puede recorrer libremente las líneas junto al equipo.
- Ganks únicamente si existe un plan de jungla hacia el carril declarado y la víctima está viva y a distancia física real. Los intentos sin asesinato quedan registrados como `gank_avoided` con ruta, objetivo y posiciones auditables.
- Peleas de equipo y colaboradores comprueban distancia física entre combatientes, en lugar de aceptar enlaces del mapa demasiado largos.
- Historial clicable y minimapa muestran la ubicación de jungla y rival cuando un gank no prospera; el objetivo no se marca como muerto.
- Nueva cobertura automatizada exhaustiva: cada minuto, carril, ruta, objetivo, combate y replay en cientos de semillas. Los guardados históricos `v2` no se reescriben.
- Cambios deportivos intencionales: la nueva red de rutas y el filtro de combate pueden alterar ganadores y estadísticas para seeds antiguas. Contabilidad histórica del mundo preservada.



## [0.7.2-alpha] — 2026-11-07

### Roles y fase de líneas — corrección del minimapa
- Las dos botlanes ya no convergen en `bot_corner`, ni TOP/MID ocupan ambos el mismo nodo neutral al minuto seis.
- **SUP protege al ADC** durante el inicio, hace un roaming breve para visión alrededor del río y luego vuelve con su compañero; ya no se queda permanentemente en objetivo o en una esquina.
- **JUN alterna farmeo, gank, limpieza de campamentos y ventanas de objetivos**, con un segundo intento de gank y retorno explícito a jungla.
- El avance de laners hacia el centro depende de ventaja de oro; ambos equipos no empujan a la misma posición por un reloj fijo.
- Sigue existiendo navegación causal con hasta una arista por minuto y verificaciones de ganks, torres y nexos. Sin cambio de formato de guardado.
- Nueva prueba de 110–150 semillas para separación de botlane al minuto 10, rutas de JUN, protección y roaming de SUP, auditorías y resultados.
- Cambian las huellas deportivas del golden test cuando la ruta modifica eventos; la economía mensual no tiene cambios deliberados.



## [0.7.1-alpha] — 2026-11-07

### Corrección: ganks coherentes con el minimapa
- Los ganks solo suceden cuando jungla, asesino y víctima están a distancia física viable, conectados y con la víctima en el carril indicado. Las conexiones largas del grafo ya no sirven para atacar desde otra línea.
- `Navigation.auditNavigation` comprueba proximidad de verdad, nodo de víctima, ruta desde la posición del jungla y detecta ganks falsificados.
- La descripción de la ruta (jungla, río, flanco, acceso inferior) deriva de la ubicación del jugador, no de una inferencia por visión rival. La retransmisión se ajusta a ella.
- `MatchReplay.eventView` construye la escena «durante la jugada» sin mutar el partido: participantes vivos en sus nodos reales antes del combate y víctima marcada como caída en ese lugar, en vez de aparecer únicamente en fuente.
- Jugadas antiguas registradas con distancia incoherente muestran una advertencia; no se inventa una posición nueva para ocultarlo.
- Nueva suite de pruebas de ubicaciones, más de 200 semillas, auditoría, replay y ausencia de teletransporte. Los resultados deportivos nuevos pueden cambiar para algunas semillas debido a la corrección.


## [0.7.0-alpha] — 2026-11-07

### Historial de jugadas interactivo (M1.5)
- **Siguiente evento** permite avanzar jugada a jugada y deja de depender del reloj. **Terminar partida** resuelve el resultado de inmediato y desbloquea todo el historial.
- El historial de RiftCast ahora es **clicable y reversible**, incluso después de finalizar. Al seleccionar una jugada se recuperan marcador, oro, KDA, torres, objetivos y minimapa correspondientes.
- Nuevos snapshots opcionales `match.moments` después de cada evento deportivo real, proyectados con el mismo motor de minimapa, incluso con múltiples jugadas en el mismo minuto. `src/core/replay.js` maneja progreso desbloqueado y punto histórico seleccionado de forma independiente.
- Marcador del lugar de la jugada seleccionada: gank, teamfight, torre, Dragón, Barón o nexo.
- Las cabezas de TOP/MID/ADC/SUP empiezan más adelantadas gracias a nuevos nodos simétricos de las líneas; JUN continúa en jungla. Son rutas y posiciones reales, no teletransportes.
- Tras salir de un partido oficial, el **último replay** se conserva en el guardado y se puede abrir otra vez desde Partidos. Demo sin guardado ni premios.
- Mantiene partidas `v2` anteriores, con reconstrucción por minuto cuando no existe `moments`; no inventa precisión histórica.
- Tests de instantáneas por evento, retroceso, control manual, archivo de replay, compatibilidad, fraude de eventos y preservación de pagos.
- Las semillas de nuevos partidos pueden variar por los nodos iniciales más adelantados; huella golden actualizada, finanzas mensuales preservadas.



## [0.6.0-alpha] — 2026-11-07

### Navegación causal — M1.3B, primera fase
- Agentes espaciales para los 10 profesionales: nodo, ruta, objetivo, intención y estado vivo/muerto. Viajan como máximo una conexión por minuto del grafo del minimapa.
- El simulador actualiza **las posiciones antes de resolver** ganks, torres, Dragón, Barón, peleas y asedio; esos eventos requieren presencia y tiempo, no teletransporte narrativo.
- Las bajas devuelven al jugador a la fuente y obligan a desplazarse después de reaparecer. El minimapa toma `frame.navigation.after` en lugar de reconstruir trayectorias después del partido.
- Nuevas restricciones físicas de distancia a estructuras y objetivos, además de conexiones del grafo.
- El cierre exige tres torres derribadas de un carril y atacantes supervivientes reunidos en el nexo rival. La partida puede extenderse hasta 76 minutos simulados para permitir el desplazamiento; no se fuerzan torres/nexo sin participantes.
- Auditoría `RiftCore.Navigation.auditNavigation` y pruebas de cientos de seeds: rutas, desplazamientos, muertes, revivir, objetivos, resultados deterministas y demos sin cambios en guardados.
- **Cambio deliberado de simulación:** los resultados con la misma seed pueden diferir de Alpha 0.5. Golden test renovado para las reglas causales; **el cálculo financiero mensual histórico conserva su huella**.
- Guardados `v2` antiguos compatibles: `frame.navigation` es aditivo. Limitaciones: rutas abstractas, IA de intenciones simplificada y ausencia de wards; algunas jugadas, como pentakills, se hacen más raras.


## [0.5.0-alpha] — 2026-11-07

### Ritmo narrativo y variedad de RiftCast
- La velocidad **1×** pasa de 750 ms/minuto a **5 s por paso**. Si hay varios momentos en el mismo minuto, se revelan por separado. Velocidad **2×: 2.5 s/min**; **5×: 950 ms/min**.
- Inicio de partidos y demo en 1× para que nuevos jugadores puedan seguir las jugadas; mantiene pausa, cambio de velocidad y salto instantáneo.
- Comentarios estratégicos adicionales basados en estadísticas reales del partido: presión por carriles, visión, oro, cambios de liderato, igualdad, muertes y preparación de objetivos.
- Variantes contextuales en títulos/cobertura de peleas, asesinatos, torres, Dragón, Barón y nexo; se evitan repeticiones mediante selección determinista y enfriamiento por tema.
- Nuevo `src/core/broadcast.js`: crea un relato separado del motor deportivo, sin consumir RNG ni añadir bajas o cambios de marcador. Auditoría de fidelidad de comentarios y pruebas de reproducción a distintas velocidades.
- Guardados `v2` anteriores compatibles; `broadcast` es opcional y los resultados calculados antes de la retransmisión no cambian.
- **Limitación:** las observaciones tácticas no alteran el mundo físico; los eventos de juego nuevos requerirán estado causal en fases posteriores.


## [0.4.0-alpha] — 2026-11-07

### M1.3A · Minimap visual de partidos
- Minimap SVG original, adaptable a PC/móvil, con 10 retratos vectoriales por rol, 18 torres, dos nexos y fosos de Dragón y Barón.
- Visualización de la presión territorial de TOP/MID/BOT y la influencia del río, derivada del estado táctico existente.
- Torre marcada como destruida **solo tras** el evento estructurado correspondiente; pequeña animación de caída y estado persistente de ruinas.
- Las cabezas se distribuyen inicialmente por TOP/JUN/MID/ADC/SUP, rotan visualmente según las fases y se reúnen en el nexo enemigo al finalizar si están vivas. Los muertos aparecen inactivos en fuente hasta reaparecer.
- Nuevo grafo del mapa y proyección determinista por minuto: `src/core/minimap-graph.js`, `src/core/minimap-simulation.js` y `src/ui/minimap.js`.
- Auditoría del minimapa y pruebas de regresión con numerosas semillas. Sin nuevos recursos pesados ni cambios en la lógica deportiva o la secuencia RNG.
- El minimapa **no determina todavía eventos mediante posiciones**; esa restricción será M1.3B. Los guardados `v2` sin proyección siguen siendo compatibles.


## [0.3.0-alpha] — 2026-11-07

### Laboratorio de partidas y mapa táctico
- **Simular partida de prueba** accesible desde bienvenida, Partidos y Partida, sin crear ni avanzar un club.
- Los partidos demo usan un universo temporal y no modifican guardados, contratos, premios ni estadísticas reales; incluyen repetir, velocidad y salto al final.
- Visualización en vivo de presión de TOP/MID/BOT y visión por carril/río, con modelo táctico abstracto de bajo coste.
- La probabilidad de los ganks utiliza visión defensiva y presión por carril; RiftCast registra ruta/visión, con auditoría de coherencia.
- Nuevo módulo `src/core/map-state.js` y pruebas de aislamiento del modo demo, determinismo del mapa y validación de rutas.
- La semilla de un partido nuevo puede producir otra historia deportiva respecto de Alpha 0.2, por los ajustes intencionales del motor. Se preserva el formato de guardado `v2`.


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
