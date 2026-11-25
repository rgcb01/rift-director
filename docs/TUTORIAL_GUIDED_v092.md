# Rift Director — tutorial por descubrimiento progresivo

**Estado:** primera iteración del tutorial jugable, adelantada desde el hito 0.9.4 para permitir pruebas con personas que no conocen las reglas. Las ilustraciones piloto v0.9.2A no se modifican.

## Experiencia

El botón **«✦ Aprende jugando»** de la portada abre un modo de entrenamiento independiente de los modos contra bot y hotseat. No utiliza mazos personales ni monedas: juega con el mazo inicial «Asedio del Bastión» y un rival pasivo. Se puede salir o repetir cada lección sin tocar la colección ni la economía.

El aprendizaje se divide en cinco **microlecciones**:

| Lección | Acción real | Qué introduce |
|---|---|---|
| 1. Conoce la Convergencia | Enfocar TOP y cambiar de fila a Centinela | Carriles; delante combate, atrás farmea |
| 2. Órdenes y energía | Jugar «Empuje de oleada» en TOP; pasar turno | Coste, cuatro jugadas, presión que se convierte en daño **al cerrar la ronda** |
| 3. Rotar y recuperarse | Rotar Centinela a MID, regresar Arcanista a base y avanzar hasta R3 | Movimiento, agotamiento, Back y retorno curado |
| 4. El Latido del Vínculo | En R4 jugar «Caza del Vínculo» en el Latido y resolver | Jungla, presión neutral, recompensa en un carril |
| 5. Abre camino al Nexo | En un escenario con la torre de TOP ya caída, jugar presión y pasar | Brecha, Nexo y condición de victoria |

**Regla pedagógica:** el jugador ve solo la explicación y el objetivo actuales. Los siguientes pasos aparecen **después** de ejecutar correctamente la acción real; no se revela una batería completa de textos antes de empezar. Se resaltan el carril, el personaje, la carta o el botón que debe utilizar.

## Contrato técnico

- `src/card-game/tutorial.mjs` define pasos, permisos para cada interacción, criterios de avance y escenarios reproducibles. Importa el **motor de juego real** (`createMatch`, `passTurn`).
- `src/card-game/demo-ui.mjs` presenta al instructor y registra pasos **solo después de acciones validadas por el motor** (`playCard`, `activate`, `passTurn`). En el modo tutorial la IA pasa; en las partidas normales conserva su comportamiento habitual.
- `card-game-tutorial.css` dibuja el instructor, indicador de capítulos y resaltados de controles; no dibuja información dentro de las ilustraciones.
- El escenario del Latido llega a R4 mediante rondas legítimas de `passTurn`: el desbloqueo del objetivo lo ejecuta el motor.
- El escenario final **sí está preparado expresamente**, con torre enemiga TOP abierta y Nexo rival en 3 PV; la victoria, el daño estructural y la ronda siguen calculándose con las reglas reales. Se anuncia explícitamente el escenario reducido para no sugerir que una partida normal comienza así.
- Algunas manos de aprendizaje se preparan colocando **copias existentes del mazo** en la primera mano; los costes, efectos, estadísticas y rarezas no cambian. No se regalan cartas ni dinero.
- No se modifica `localStorage`, formatos de partida, colección, recompensa ni guardados del manager antiguo.
- Se puede saltar una lección, repetir la actual o salir. Después de la quinta, el botón final abre la preparación de una partida normal contra IA *Aprendiz*.

## Cobertura y pendientes de 0.9.4

- Pruebas unitarias de cada escenario, la rotación real, Back, retorno, objetivo neutral, asedio y final.
- Prueba Chromium de recorrido completo en móviles de 390 px y escritorio de 1440 px; no deben aparecer errores JS ni cambios de las claves de almacenamiento.
- Pendiente de evaluar con personas reales: comprensión de los términos «farmeo», «presión», «agotado», «recall», «Nexo» y diseño de la ayuda contextual al perder una partida.
- Pendiente: versión más extensa para desafíos opcionales, ayuda persistente durante partidas normales, localización completa y pruebas manuales en Safari iOS.

Se mantiene el diseño de tutorial **sin pantallas largas**: primero jugar, luego explicar la consecuencia y después introducir el siguiente sistema.
