# Contribuir a Rift Director

Gracias por ayudar a construir un sandbox de esports centrado en dirección deportiva, supervivencia financiera y narración procedural. **Antes de aceptar contribuciones externas, el proyecto necesita una licencia explícita**; mientras tanto, esta guía describe principalmente cómo preparar cambios e incidencias para revisión.

## Flujo de trabajo

1. Revisa el [roadmap](ROADMAP.md) y abre una issue para proponer una mecánica o reportar un bug.
2. Para cambios grandes, discute primero comportamiento esperado, reglas y coste de mantenimiento.
3. Trabaja en una rama descriptiva (`fix/saves-v2`, `feat/match-events`, `docs/roster-guide`).
4. Limita cada PR a un cambio coherente; evita reescrituras masivas sin pruebas.
5. Ejecuta `node --check game.js`, `node scripts/check-static.mjs` y `node --test tests/*.test.mjs`.
6. Describe pasos para reproducir, riesgos de guardado, comportamiento antes/después y capturas en cambios visuales.
7. Actualiza `CHANGELOG.md` en **Unreleased** y el roadmap cuando un hito cambie de estado.

## Reglas que no podemos romper

- El juego es un sandbox: no existe victoria por dinero o campeonato. La partida solo termina con **caja agotada**.
- El usuario prepara y dirige; sus profesionales ejecutan partidos autónomamente.
- Los relatos de comentaristas reflejan **eventos simulados válidos**.
- Los traits son comportamientos contextuales y pueden tener ventajas y defectos.
- Los rivales actúan en un mundo persistente bajo restricciones financieras.
- Los meses conectan economía, deporte y noticias; las noticias importantes requieren causas trazables.
- El juego debe funcionar en navegadores y móviles modestos, sin exigir servicios externos.
- Los guardados `v:2` existentes no se rompen sin migración y pruebas.
- No se agregan marcas, fotografías, logotipos o figuras reales sin permisos adecuados.

## Estilo de código provisional

- Preferir funciones pequeñas, predicados de reglas explícitos y estados reproducibles.
- Separar **evento de dominio** de **texto narrativo**.
- No introducir dependencias o procesos de build para corregir problemas sencillos.
- Los nuevos archivos JavaScript deben ejecutarse en navegadores modernos sin herramientas especiales cuando sea posible.
- Mantener roles y estadísticas consistentes y documentados.
- Al cambiar economía, acompañar con un caso numérico y prueba.

## Commits y releases

Prefijos sugeridos: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`. Semver Alpha `0.x`; evitar declaraciones de estabilidad hasta definir migraciones.

## Privacidad, datos y licencias

El juego no necesita cuentas. Los guardados permanecen en el navegador, salvo cuando el usuario los exporta y comparte. No incluyas tokens, contraseñas o datos privados en issues. **No hay LICENSE todavía**: no asumir que el código publicado es de dominio público ni reutilizable libremente. La decisión de licencia queda pendiente de la propiedad del proyecto.
