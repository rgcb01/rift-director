# Diseño de Rift Director — Juego de cartas táctico

**Versión vigente:** v0.9.x (juego de cartas), no el simulador MOBA/manager original. Las reglas implementadas prevalecen en [`CARD_GAME_RULES.md`](../CARD_GAME_RULES.md).

## Premisa

En **Aethra**, la **Fractura** ha desequilibrado el **Vínculo**, una fuerza que mantiene conectadas sus regiones. Las **Convergencias** son zonas donde los conflictos por ese poder se materializan en batallas tácticas. El jugador es un **Director del Vínculo**, alguien capaz de guiar una escuadra de cinco **Riftborn** vinculados a su Ancla. No controla una empresa de esports ni simula una vida exterior al combate.

La identidad de la colección surge del descubrimiento de personajes, hechizos, órdenes e historias. Los sobres **son una interfaz de colección para el jugador**, no una obligación de inventar que los habitantes de Aethra abren sobres o juegan un TCG.

## Bucle central

1. **Colección:** conseguir cartas jugando, abriendo sobres con monedas virtuales y fabricando copias con fragmentos.
2. **Construcción:** seleccionar cinco Riftborn de roles válidos y preparar 20 cartas tácticas.
3. **Partida:** jugar cartas alternando cuatro acciones por ronda, colocar y mover personajes, defender tres carriles y utilizar la jungla.
4. **Convergencia:** controlar presiones y objetivos neutrales, abrir una torre y destruir el Nexo rival.
5. **Recompensas:** progresar en una colección local y explorar nuevas sinergias.

## Foco de experiencia

- **Decisiones comprensibles:** siempre debe verse qué carta se seleccionó, dónde puede jugarse y qué coste implica.
- **Táctil de verdad:** en móviles, un carril grande a la vez, mano de fácil acceso, zonas táctiles amplias; escritorio muestra tres carriles.
- **Información clara:** energía, acciones restantes, ataque, PV, torres, Nexo y presión neutral visibles y contextualizados.
- **Identidad original:** ilustraciones futuras de Riftborn, iconografía propia y espacios con el lore de Aethra; no imitar un tablero o monstruos de otro MOBA.
- **Persistencia local:** no exigir backend para comenzar; mantener mazos, colección y partidas libres de pago.
- **Accesibilidad:** teclado, lectores de pantalla, reducción de movimiento, no depender exclusivamente del color, control de audio.

## Traducción de reglas a ficción

| Mecánica | Explicación en Aethra |
|---|---|
| Cinco Riftborn | La escuadra que mantiene unida el Ancla del Director |
| Tres carriles y jungla | Rutas y zonas inestables de una Convergencia |
| Cartas de acción | Órdenes, maniobras, habilidades y hechizos canalizados |
| Energía por ronda | Intensidad creciente del Vínculo en la batalla |
| Torre / Nexo | Estabilizadores y corazón del Ancla |
| Back y reaparición | Recuperación y reconstrucción a través del Ancla |
| Objetivos neutrales | Entidades y manifestaciones nacidas de la Fractura |
| Nuevos sets | Descubrimiento de regiones, técnicas y personajes |

Las facciones, nombres de sets y calendario de expansiones aún deben consolidarse; no se consideran implementados por aparecer como ejemplos narrativos.

## Lo que Rift Director no es

No es un simulador de ligas, empresas y fichajes; no es un MOBA en tiempo real; no es un RPG de mundo abierto; tampoco necesita un gestor de NPC, economía global del mundo ni estrategia fuera del tablero. El concepto anterior del manager queda [archivado](LEGACY_MOBA_ARCHIVE.md).
