# Rift Director — Card Game Rules v0.1 (prototipo)

Estado: **borrador jugable, valores sujetos a playtesting**. Este documento sustituye al roadmap del simulador MOBA **solo en la rama** `rework/card-game`.

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
- Mano inicial 6; al inicio de cada ronda se rellena hasta 6 tras barajar descartes cuando haga falta. Se pueden conservar hasta **2** al final de ronda (en el motor mediante selección de índices al pasar).
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
- La partida termina cuando un Nexo llega a 0; empate simultáneo está reservado para una regla posterior de desempate.

## Daño, torres y presión (primera fórmula)
- En cada carril, personajes enemigos **delante** intercambian ATQ simultáneamente; el objetivo inicial se elige determinísticamente por menor PV y después por ID.
- Presión propia = suma de ATQ de aliados supervivientes delante + bonificaciones tácticas + **1 por la propia torre en pie**. En la jungla no existe presión de asedio.
- La diferencia positiva contra la presión del rival se convierte en daño potencial: 1–2 => 1 PV, 3–4 => 2 PV, 5+ => 3 PV (máximo base 3 por carril).
- Si un defensor conserva algún personaje delante, mitiga **2 de daño estructural**; Guardia de hechizos mitiga daño adicional. **Dive** ignora la mitigación de personajes pero provoca 2 de daño de respuesta de torre a un atacante si la torre seguía en pie.
- Un personaje trasero no otorga protección frontal, pero la torre sigue otorgando su +1 de presión mientras viva.
- Las torres destruidas no se restauran. La presión se calcula en los tres carriles aunque solo haya una brecha abierta.

## Jungla y objetivos
- El JUN empieza en su banda horizontal y no ataca torres directamente.
- Gank: carta táctica que gira al JUN, añade presión temporal en un carril y regresa a jungla. Rotación: carta que mueve permanentemente a otro personaje entre carriles.
- La jungla tendrá cartas propias de Farm, Gank, Invasión, Contra-Gank y Caza Mayor. En objetivos neutrales el JUN aporta bonificación (balance inicial sugerido +2).
- **Primer neutral** desde R4: recompensa +1 presión permanente en un carril. **Neutral mayor** desde R8: beneficio importante, pero temporal. Ambos deben disputarse sacrificando acciones y presión de carril. Pendientes de implementación, sin atajos de daño directo al Nexo.

## Límites del primer corte técnico (0.8.0)
- Implementar estado separado, validación de mazos, robo determinista, turnos, ataques básicos, back/muerte, presión, torres y victoria.
- Efectos prototipo: PRESSURE, GUARD, IMPACT, ENERGY, DRAW, ROTATE, GANK, DIVE, BACK.
- Aún no: la interfaz de tablero, objetivos neutrales, buffs del late, sobres, tienda, crafting, IA, contenido definitivo, campañas, guardados nuevos.
- **No cargar ni modificar el guardado v2 del manager**; este motor debe usar un esquema nuevo.

## Criterios para declarar 0.8.0 lista
1. Ambos lados con 5 personajes fijos y 20 cartas tácticas válidas.
2. Cuatro jugadas máximas, sin cartas instantáneas, costos y turnos legales.
3. Acciones reproducibles con semilla fija; sin doble gasto, daño retroactivo ni movimiento ilegal.
4. Una torre bloquea Nexo; una torre destruida habilita daño al Nexo en siguientes rondas.
5. Diferencia observable entre Back y Muerte, y entre frente y atrás.
6. Pruebas automatizadas de victoria, KO, robo, energía, presión, resolución simultánea y alternancia.
