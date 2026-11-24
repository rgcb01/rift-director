# Rift Director — Card Game Rules v0.9 (prototipo)

Estado: **borrador jugable, valores sujetos a playtesting**. Estas reglas documentan el rework CCG ya integrado como ruta separada (`card-game.html`). El viejo manager permanece intacto mientras se valida este núcleo.

## Identidad y objetivo
CCG táctico de tres carriles ambientado en Aethra. Eres un Director del Vínculo: cinco Riftborn vinculados, órdenes/hechizos en un mazo táctico y un Nexo defendido por torretas. El mundo, las facciones y los futuros sets se cuentan mediante cartas, ilustraciones y expansiones; no hay administración de clubes, contratos, salarios ni ligas.

## Tablero, de cada jugador hacia el centro
1. Mano (hasta seis cartas tácticas), descarte y reserva de personajes fuera de combate, identificados como Back o Muerte.
2. Jungla horizontal: un Riftborn de jungla.
3. Tres columnas TOP/MID/BOT, cada una con fila trasera (farm) y delantera (combate).
4. Zona neutral central compartida.
5. El terreno rival espejeado.

Cada lado tiene **torre de 6 PV** por carril y **Nexo de 12 PV**. Si cae una torre queda una brecha permanente: los asedios exitosos futuros en ese carril dañan directamente al Nexo. El daño excedente del golpe destructor NO atraviesa la torre. No hay torres en jungla.

## Mazo y personajes
- Exactamente **5 personajes fijos**: TOP (1), MID (1), BOT (2), JUN (1). No entran al robo ni se mejoran, equipan o suben de nivel.
- **20 cartas tácticas**, inicialmente de tres familias: Acciones, Hechizos y Recursos. Las cartas de personaje forman el paquete fijo aparte.
- La estrategia de construcción reside en qué cinco personajes y veinte tácticas eliges, no en gestionar una plantilla.
- Mano inicial 6; al inicio de cada ronda se rellena hasta 6 tras barajar descartes cuando haga falta. Se pueden conservar hasta **2** al final de ronda (selección por UID, máximo dos).
- Cada carta jugada (incluso coste 0) consume **una de las 4 jugadas máximas** por ronda. Las activaciones especiales de personajes consumen jugada igualmente. Ninguna carta instantánea o fuera de turno.

## Posiciones y estados
- Delante: los personajes supervivientes realizan su ataque básico simultáneo en la fase de combate y aportan ATQ como presión. 
- Atrás: no atacan ni aportan presión ofensiva; farmean **+1 energía para la siguiente ronda** por personaje en línea. El bono total por farmeo de línea se limita a +2 por jugador y ronda.
- Girada 90°: agotada, usó una activación especial (cambiar de fila, Back o maniobra que lo indique). Se endereza al comenzar la siguiente ronda. Las acciones básicas automáticas no giran la carta.
- Boca abajo y en reserva: Back o Muerte, con motivo y ronda de regreso. Si sale en ronda N, Back regresa al **inicio de N+2** y Muerte al **inicio de N+3** (respectivamente una y dos rondas completas fuera). Regresa con toda la vida, a su posición inicial, fila trasera.
- El daño a personajes persiste mientras estén desplegados. Morir no destruye su carta permanentemente.

## Ronda, prioridad y energía
- Moneda: el ganador elige comenzar primero; el segundo recibe +1 energía **solo en ronda 1**.
- Prioridad de apertura alterna por ronda.
- Energía base: R1=3, R2=4, R3=5, R4=6, R5+=7. No se acumula la no gastada.
- Inicio: regreso de personajes elegibles, enderezar, aplicar farmeo preparado, rellenar mano y recuperar energía.
- Fase táctica: jugadores alternan una jugada. Pueden jugar carta, activar personaje o pasar; si uno pasa, el otro puede consumir las jugadas que le queden.
- Resolución fija: (1) daño simultáneo a personajes, (2) muertes, (3) presión TOP/MID/BOT, (4) asedio simultáneo a estructuras, (5) objetivos neutrales, (6) descarte/limpieza.
- La partida termina cuando un Nexo llega a 0; si ambos caen en la misma resolución, el resultado es empate.
- **Escalado común sin builds:** desde R7 todos hacen +1 ATQ en combates; desde R10 +2 ATQ en total. No modifica directamente la presión de asedio impresa ni los valores permanentes.

## Daño, torres y presión (primera fórmula)
- En cada carril, personajes enemigos **delante** intercambian ATQ simultáneamente; el objetivo inicial se elige determinísticamente por menor PV y después por ID.
- Presión propia = suma de ATQ de aliados supervivientes delante + bonificaciones tácticas + **1 por la propia torre en pie**. En la jungla no existe presión de asedio.
- La diferencia positiva contra la presión del rival se convierte en daño potencial: 1–2 => 1 PV, 3–4 => 2 PV, 5–6 => 3 PV. Máximo 3 por carril hasta R11, 4 desde R12 y 5 desde R17.
- Si un defensor conserva algún personaje delante, mitiga **2 de daño estructural** hasta R9, **1** de R10 a R15 y **0** desde R16; la pasiva Baluarte sigue sumando +1 de mitigación. Guardia de hechizos mitiga daño adicional. **Dive** ignora la mitigación de personajes, pero provoca 2 de daño de respuesta de torre a un atacante si la torre seguía en pie.
- Si el defensor está **vivo atrás** y atacas su torre, ésta responde con **1 daño al atacante**; si la línea está totalmente desocupada, la torre no contraataca. Ataques al Nexo no provocan respuesta de una torre ya destruida.
- Para asediar una torre o Nexo debe **sobrevivir al menos un personaje propio delante** en el carril: las cartas de presión solas no pueden dañar estructuras.
- Un personaje trasero no otorga protección frontal, pero la torre sigue otorgando su +1 de presión mientras viva.
- Las torres destruidas no se restauran. La presión se calcula en los tres carriles aunque solo haya una brecha abierta.

## Jungla y objetivos — v0.8.2
- El JUN empieza en su banda horizontal y no daña torres por sí solo.
- **Gank**: carta táctica que gira al JUN y añade presión temporal a un carril. **Rotación**: mueve permanentemente a otro personaje entre carriles.
- **Caza (HUNT)**: carta de coste 2, aporta +3 de presión a un neutral abierto. Si tienes JUN **delante, vivo y sin girar**, éste queda agotado y añade +2 adicionales. No puedes utilizarlo después para Gank en la misma ronda.
- Un objetivo se captura únicamente con **presión neutral propia ≥4 y ventaja ≥2 frente al rival**. Si no hay vencedor, permanece abierto; la presión neutral se reinicia cada ronda.
- **Latido del Vínculo**: aparece al comenzar **R4**. El conquistador obtiene **+1 presión permanente** en un carril que designó al jugar su última carta de Caza.
- **Coloso del Umbral**: aparece al comenzar **R8**. El conquistador obtiene **+1 presión en TOP/MID/BOT** y **+1 daño al primer asedio exitoso de cada ronda**, respetando el máximo de 3. Aplica en las **tres rondas siguientes** a la conquista.
- Los beneficios se conceden **después del asedio** de la ronda de captura, nunca retroactivamente. Ninguno permite golpear directamente al Nexo sin abrir la torre.
- El prototipo incluye **una aparición de cada objetivo por partida**. Las reapariciones y nuevas criaturas llegarán tras las pruebas de balance; no son necesarias para esta etapa.

## Estado técnico y límites (0.8.2)
- Implementar estado separado, validación de mazos, robo determinista, turnos, ataques básicos, back/muerte, presión, torres y victoria.
- Efectos prototipo: PRESSURE, GUARD, IMPACT, ENERGY, DRAW, ROTATE, GANK, DIVE, BACK, HUNT.
- Disponible: tablero interactivo, objetivos neutrales, escalado de late, bot simple, modo local para dos y pruebas de navegador.
- Aún no: sobres, tienda, crafting, constructor de mazos, arte definitivo, bots inteligentes, guardados CCG persistentes, nuevos sets.
- **No cargar ni modificar el guardado v2 del manager**; este motor debe usar un esquema nuevo.

## Criterios de aceptación de la base (0.8.0–0.8.2)
1. Ambos lados con 5 personajes fijos y 20 cartas tácticas válidas.
2. Cuatro jugadas máximas, sin cartas instantáneas, costos y turnos legales.
3. Acciones reproducibles con semilla fija; sin doble gasto, daño retroactivo ni movimiento ilegal.
4. Una torre bloquea Nexo; una torre destruida habilita daño al Nexo en siguientes rondas.
5. Diferencia observable entre Back y Muerte, y entre frente y atrás.
6. Pruebas automatizadas de victoria, KO, robo, energía, presión, resolución simultánea y alternancia.

## Construcción de mazos y colección inicial — v0.8.3
- Colección de prueba desbloqueada: 18 Riftborn de roles TOP, MID, BOT y JUN, y 34 cartas tácticas. Las cartas no poseen mejoras ni niveles.
- La identidad estratégica reside en escoger exactamente cinco personajes (TOP 1, MID 1, BOT 2, JUN 1, todos distintos) y 20 cartas tácticas del catálogo.
- Rarezas y límites de copias **por mazo**, no de poder: común hasta 3; poco común hasta 2; rara hasta 2; épica y legendaria hasta 1. Un mazo incompleto puede guardarse como borrador, pero no jugarse.
- Pasivas iniciales del campeón: **Asedio** (+1 presión frontal), **Baluarte** (+1 mitigación frontal), **Cosecha** (equivale a dos personajes farmeando, límite +2), **Duelista** (+1 daño a otro campeón), **Cazador** (+1 aporte neutral al usar al jungla), **Explorador** (+1 en el gank del jungla).
- Nuevos efectos tácticos: **HEAL** para restaurar PV de un aliado activo y **SABOTAGE** para reducir temporalmente la presión enemiga en un carril. También utilizan una de las cuatro jugadas; no hay cartas instantáneas.
- Editor independiente en `deck-builder.html`: filtros, búsqueda, asignación por rol, suma/resta de copias, borradores, plantillas, guardar, duplicar, eliminar y entrar en combate con un mazo válido.
- Los mazos se guardan en almacenamiento local separado del simulador antiguo (clave `rift-director-ccg-decks-v1`). Máximo 12 guardados; sin perfil, cuenta, comercio ni sincronización en esta fase.
- La página `card-game.html` permite elegir mazo de ambos lados antes de comenzar la partida. El bot puede usar mazos del catálogo.
- **Aún pendiente:** sobres, inventario desbloqueable, economía, editor cosmético, efectos de personajes individuales más complejos y balance de metajuego. El catálogo es una muestra jugable, no el set comercial definitivo.

## IA y balance medido — v0.8.4

- Tres dificultades: **Aprendiz** (heurística de referencia), **Táctico** y **Director** (más prioridad a ejecuciones y brechas). Estrategias configurables: **Equilibrado**, **Asedio**, **Control** y **Jungla**.
- La IA usa su **propia mano** y posiciones, vida, torres, acciones, energía y presión visibles. No inspecciona la mano ni el mazo ocultos del oponente para elegir cartas.
- Al seleccionar cartas calcula si generan asedio real o solo gasto de energía, si deben evitar daño en una brecha abierta, si el jungla puede participar en un neutral y cuándo regresar a base.
- Se añade una tercera plantilla jugable **Control del Vínculo**, además de Asedio del Bastión y Rutas del Umbral.
- Escalado de la **Convergencia tardía** para evitar partidas de desgaste infinito: hasta R11 el asedio tiene límite 3; en R12–R16, 4; desde R17, 5. La defensa frontal básica mitiga 2 hasta R9, 1 en R10–R15 y 0 desde R16. Una torre aún bloquea el Nexo hasta ser destruida, sin daño excedente al Nexo.
- `src/card-game/balance.mjs` y `scripts/card-game-balance.mjs` ejecutan torneos sin interfaz y con semillas reproducibles.
- Cada cruce prueba el mismo conjunto de semillas en **ambos asientos** y con **ambas iniciativas**. El runner informa victorias, empates, partidas incompletas, duración, daños estructurales, muertes y objetivos.
- Los reportes de GitHub Actions guardan JSON; los **empates reales** y las **partidas sin terminar** se cuentan por separado. Cualquier cifra de win rate es exploratoria de esta IA, **no prueba el balance PvP**.
- Las reglas actuales se validan con la IA y torneo de regresión; futuras versiones necesitarán medición humana, más arquetipos y pruebas de red.

## Ritmo, resonancia y prueba de apertura — v0.8.5

- La compensación acordada al iniciar no cambia: **el jugador que comienza segundo recibe +1 energía temporal en R1**, sin acumular esa energía entre rondas.
- El motor acepta un parámetro experimental `secondPlayerBonus` de 0, 1 o 2 **solo para comparar escenarios con las mismas semillas, asientos e iniciativa**. La partida pública utiliza +1.
- **Resonancia de Convergencia:** a partir de R14, un carril con al menos un Riftborn **propio vivo delante tras el combate** obtiene +1 presión de asedio de ronda; desde R18 recibe +2. Se aplica como bonificación por carril, no por personaje: no escala con el número de atacantes.
- Esta presión extra no hace daño directamente; sigue exigiendo presencia frontal superviviente, diferencia positiva de presión y que haya caído la torre antes de dañar el Nexo. No cambia las cuatro jugadas ni el coste de cartas.
- El motor conserva `siegeMomentum: false` como opción para reproducir la versión anterior y comparar el mismo conjunto de partidas. La versión jugable y la simulación habitual lo activan por defecto.
- La IA deja de usar una acción para retirar a un atacante de poca vida **si no hay enemigo delante que pueda dañarlo**; evita ceder un carril sin necesidad.
- La muestra pareada inicial (12 semillas, seis enfrentamientos y cuatro orientaciones por semilla; 288 partidas por escenario, máximo R24) mostró **213/288 terminadas sin resonancia frente a 257/288 con resonancia**. Se trata de resultados de IA; no equivale a un balance PvP.
- Los informes de GitHub Actions separan empates de partidas que exceden el límite y publican resultados por arquetipo y por iniciativa. Las reglas de economía, sobres y rarezas permanecen fuera de este milestone.

## Archivo del Vínculo: colección, sobres y fabricación — v0.9.0

- **Ruta:** `collection.html`. Es un prototipo de economía **offline, sin pago real ni conexión a servidores**.
- **Bienvenida gratuita:** 200 monedas, copias para construir Asedio del Bastión y Rutas del Umbral y una Vanguardia adicional. Los tres mazos preconstruidos siguen siendo elegibles para jugar con el bot o en hotseat, sin exigir colección.
- **Compatibilidad:** al crear la colección por primera vez, se importan los personajes y las copias tácticas necesarias de los mazos personalizados guardados en versiones anteriores, sin modificar `rift-director-save-v2` ni `rift-director-ccg-decks-v1`.
- **Nuevo catálogo base de prueba:** 20 Riftborn y 36 cartas tácticas (56 distintas), con cuatro legendarias nuevas distribuidas entre personajes y tácticas. La rareza limita copias máximas por mazo; no otorga niveles ni estadísticas extra a cartas existentes.
- **Sobre del Vínculo:** cuesta 100 monedas virtuales y revela **exactamente cinco cartas**, una a una o con «Revelar todas». Ranuras: 3 comunes fijas; 1 poco común+ (80% poco común, 15% rara, 4% épica, 1% legendaria); 1 rara+ (80% rara, 17% épica, 3% legendaria).
- **Protección contra duplicados:** al decidir una rareza, se priorizan cartas cuya colección no tenga aún el máximo de copias. Si todas las de ese grupo están completas, el duplicado se convierte en fragmentos.
- **Valor de duplicados:** común 5, poco común 12, rara 25, épica 60, legendaria 120 fragmentos.
- **Fabricación directa:** común 20, poco común 45, rara 90, épica 180, legendaria 360 fragmentos por copia, sin rebasar los máximos (personajes: una copia de cada uno).
- **Recompensas solo al terminar una partida contra bot:** victoria 40 monedas, derrota 25, empate 30. Logros de una sola vez: primer combate +50, primera victoria +75; abrir el primer sobre devuelve +25. Sin ganancia en hotseat para no duplicar monedas con dos personas localmente.
- **Constructor:** las copias poseídas y las utilizadas se muestran por separado; no puedes añadir cartas o personajes no obtenidos. Es posible guardar borradores incompletos; solo los mazos completos y con colección suficiente pueden seleccionarse como personalizados para jugar.
- **Persistencia:** `rift-director-ccg-collection-v1` en localStorage, separado de los guardados anteriores. Incluye identificadores de partidas recientes para evitar recompensar dos veces una misma partida en el prototipo. Los archivos dañados no se sobrescriben silenciosamente.
- **Restricciones conocidas:** no hay cuenta, sincronización, compras reales, controles anti-trampa de servidor, restauración si se borra el almacenamiento, ni economía competitiva final. Las cifras son exploratorias: equilibrar con pruebas humanas antes de lanzar PvP o moneda premium.

La siguiente fase deberá añadir experiencia de apertura más visual y sonora, misiones/recompensas persistentes verificables, y expansión del set completo, sin priorizar monetización sobre accesibilidad.
