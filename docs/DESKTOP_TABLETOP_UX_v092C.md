# Rift Director · Desktop tabletop UX (v0.9.2C)

## Decisión de producto

El **PC es la referencia principal de interacción**. El usuario debe sentir que controla un tablero, no que navega entre formularios de una web. En el tablero, las cartas de la mano son objetos arrastrables y los Riftborn ocupan espacios concretos. El móvil conserva temporalmente sus controles de toque por carril; la reorganización no debe romper el tutorial.

## Distribución principal

- **Tablero central**: llena casi todo el ancho disponible, con límite de 1680 px en pantallas gigantes; las tres columnas TOP/MID/BOT permanecen visibles y simétricas. La zona de tablero tiene scroll interno cuando una pantalla es baja, sin mandar la mano fuera del viewport.
- **Mano siempre abajo**: una banda fija al borde inferior en PC (no sticky ni dentro de una columna), seis cartas de apertura, posibilidad de deslizarla horizontalmente si hay hasta ocho. Energía, jugadas y «Pasar turno» quedan dentro de la propia banda.
- **Header compacto**: durante las partidas solo muestra identidad, registro opcional y nueva partida; la navegación de mazos y sobres se mantiene en el menú de inicio.
- **Reglas y registro**: panel lateral deslizable mediante un único botón, oculto por defecto y sin robar ancho al tablero.
- **Zona de base**: un objetivo físico dentro de la mitad del jugador para arrastrar un Riftborn a Back. No crea un sistema nuevo: invoca la orden existente del motor.
- **Interacción secundaria**: selección mediante clic, botón y teclado sigue disponible. No depende exclusivamente de drag-and-drop.
- **Móvil**: por debajo de 961 px se preserva el diseño táctil anterior, con foco de carril y mano plegable; no se habilita un draggable HTML5 que arruine el scroll táctil.

## Gestos que ejecutan reglas reales

| Origen del arrastre | Destino | Acción |
|---|---|---|
| Carta de presión, Gank o Dive | Columna de carril | Jugar carta en TOP/MID/BOT |
| Carta de guardia | Carril propio | Añadir defensa al carril |
| Carta de sabotaje | Carril rival | Quitar presión enemiga |
| Carta de impacto | Riftborn enemigo | Infligir daño |
| Carta de curación o Recall | Riftborn aliado | Sanar o mandar a base |
| Carta de Rotación | Riftborn aliado no jungla | Seleccionar origen; después escoger o arrastrar hacia carril destino |
| Carta de Caza | Objetivo neutral activo | Jugar Caza. Latido asigna la bonificación al carril enfocado |
| Carta de energía / robo | Área de tablero | Jugar el efecto sin objetivo |
| Riftborn aliado | Otra fila en su carril | Cambiar de fila (consume una jugada) |
| Riftborn aliado | Otro carril propio | Consumir una carta de Rotación disponible y mover al personaje |
| Riftborn aliado | Zona BASE | Back (consume una jugada) |

**Legalidad:** `src/card-game/drag-rules.mjs` inspecciona el estado sin mutarlo y determina una *propuesta* de jugada. El drop ejecuta exclusivamente `playCard` o `activate` del motor real: costes, turno, agotamiento, límites, objetivos y daños mantienen exactamente las mismas reglas. Un destino inválido no hace nada; al arrastrar se iluminan los destinos válidos y el destino actual. El modo tutorial también filtra estas propuestas para mantener la lección correspondiente.

**Nota de interfaz:** para la carta Caza del Latido se utiliza **el carril que está enfocado** para la recompensa. En escritorio el carril enfocado debe estar indicado de forma inequívoca; si se prefiere otro, primero se selecciona ese carril desde el tablero o por el selector del tutorial. No existe selección oculta del objetivo.

## Validación

- Unit tests de cartas, objetivos, permisos, cambios de fila, Back y rotación sin gasto gratuito.
- Playwright: 1280, 1440 y 1920 px verifican centrado, ancho del tablero, mano fija y registro oculto/visible.
- Playwright: arrastrar un Riftborn a fila y base, arrastrar una carta a un objetivo legal, y confirmar que las acciones siguen funcionando al pulsar controles.
- El tutorial progresivo, modos bot/hotseat, colección y guardados se siguen validando con las suites existentes.
- **Pendiente de prueba manual**: PC real con ratón, resoluciones ultrapanorámicas, densidad/jerarquía de la mesa y posibles ayudas de accesibilidad para teclado.

## Fuera de alcance de esta pasada

Animaciones de arrastre avanzadas, sonido/hápticos, sincronización online, cambios de reglas, modificación de las cartas de IA y edición de mazos con drag-and-drop. Son trabajos separados.
