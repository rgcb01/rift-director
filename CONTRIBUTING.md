# Contribuir a Rift Director Card Game

Rift Director es ahora un **juego de cartas táctico coleccionable**. La antigua idea de simulador/manager de esports está [archivada](docs/LEGACY_MOBA_ARCHIVE.md); los cambios nuevos deben dirigirse al Card Game, no a la vieja gestión de clubes.

## Flujo de trabajo

1. Consulta [Roadmap](ROADMAP.md), [Diseño](docs/GAME_DESIGN.md), [Reglas](CARD_GAME_RULES.md) y el [registro de decisiones](docs/DECISIONS.md).
2. Trabaja en una rama enfocada (`feat/card-game-...`, `fix/card-game-...`, `docs/...`) y abre un PR hacia `main`.
3. Mantén el motor determinista; ninguna acción debe violar las cuatro jugadas, las restricciones de cartas ni los turnos del rival. El bot no debe consultar la mano enemiga.
4. Evita cambios que borren mazos, cartas o fragmentos locales. Añade migraciones y pruebas para cualquier evolución de formato.
5. Acompaña cambios de jugabilidad con pruebas de reglas y de UI accesible, especialmente en móvil.

```sh
node scripts/check-static.mjs
node --test tests/card-game*.test.mjs
node --test
node scripts/card-game-balance.mjs --seeds=20 --rounds=24
```

La CI de Chromium prueba navegación e interacción en varias resoluciones; ejecutarla antes de integrar cambios de tablero, cartas, mazos, sobres o navegación.

## Principios

- Arte, nombres, facciones y lore propios del mundo de Aethra.
- Todo objetivo o daño debe corresponder a una jugada y estado real.
- La rareza no equivale automáticamente a poder; los sobres se muestran con probabilidades explícitas.
- Progreso y juego básico disponibles sin pagos reales o servicios externos.
- Accesibilidad, control táctil, teclado, información no dependiente del color y reducción de movimiento.
- El manager MOBA antiguo se conserva como referencia; solo se esperan correcciones de seguridad o preservación de datos para él.

## Licencia y privacidad

El repositorio todavía no establece una licencia explícita. No presupongas derechos de redistribución o reutilización por estar en GitHub. No incluyas archivos privados, credenciales o guardados de terceros en reportes públicos.
