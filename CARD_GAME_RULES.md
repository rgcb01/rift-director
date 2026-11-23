# Rift Director — Card Game Rules v0.3 (prototipo)

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
- La diferencia positiva contra la presión del rival se convierte en daño potencial: 1–2 => 1 PV, 3–4 => 2 PV, 5+ => 3 PV (máximo base 3 por carril).
- Si un defensor conserva algún personaje delante, mitiga **2 de daño estructural**; Guardia de hechizos mitiga daño adicional. **Dive** ignora la mitigación de personajes, pero provoca 2 de daño de respuesta de torre a un atacante si la torre seguía en pie.
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
