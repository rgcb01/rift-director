# Rift Director

**Simulador de dirección de una organización profesional de esports**. Administra una empresa, descubre jugadores, prepara un equipo y observa partidos narrados mientras un universo competitivo evoluciona por meses.

[**Jugar en el navegador**](https://rgcb01.github.io/rift-director/) · [Roadmap](ROADMAP.md) · [Cambios](CHANGELOG.md) · [Cómo contribuir](CONTRIBUTING.md)

> **Alpha 0.2 — prototipo jugable.** Universo, nombres, ligas y equipos ficticios. Proyecto independiente, sin afiliación con Riot Games ni con organizaciones profesionales.

## La idea

Eres **CEO, General Manager y Head Coach**. No controlas campeones en tiempo real: escoges plantilla, entrenamiento y estrategia; tus profesionales ejecutan sus partidos autónomamente. Puedes ganar títulos, formar rookies, vivir de merchandising y patrocinadores o reconstruir un club. **No hay victoria definitiva ni cantidad de dinero objetivo.** Si el saldo disponible llega a cero, la partida termina.

Los meses impulsan las finanzas y el mundo. Las noticias y los rumores reflejan fichajes, contratos, actuaciones y cambios en las ligas. Las buenas decisiones mejoran las probabilidades a largo plazo, pero nunca eliminan la incertidumbre.

## Jugar

- **Web / móvil:** [rift-director en GitHub Pages](https://rgcb01.github.io/rift-director/).
- **Local:** descarga el repositorio y abre `index.html` con tu navegador. Como alternativa, ejecuta `python -m http.server 8080` y visita `http://localhost:8080`.
- No hay instalación de paquetes, cuenta ni backend para jugar.
- **Guardados:** automáticos en `localStorage` de ese navegador. En **Partida** puedes **exportar/importar JSON**. Los guardados no se sincronizan entre dispositivos; expórtalos antes de borrar datos del navegador.

## Qué existe hoy (Alpha 0.2)

| Área | Implementado | Límites actuales |
|---|---|---|
| Club | Creación, presupuesto, plantilla y configuración | Gestión empresarial simplificada |
| Economía | Ingresos de sponsors/merch/liga/contenido, salarios, staff, gastos, crisis comerciales y saldo de cierre | Valores todavía no calibrados para muchas temporadas |
| Calendario | Plan mensual, partidos, liga y playoffs | Una región jugable y una segunda simulada |
| Jugadores | Cinco roles, cartas, atributos, comportamiento, traits observables, entrenamiento, scouting, fichajes y ventas | IA y progresión iniciales |
| Partidos | Simulación de eventos con marcadores, torres, dragones, Barón, jugadas y narración; velocidades y salto al resultado | Sin draft completo de campeones ni sistemas MOBA exhaustivos |
| Mundo vivo | Rumores, noticias vinculadas a eventos, IA de otros clubes, rookies, retiro, cambios de meta y expansión ocasional | Ecosistema regional y causalidad todavía básicos |
| Presentación | Interfaz web responsive, retratos y escudos SVG generados | Accesibilidad y experiencia móvil por mejorar |

**No se ha implementado todavía** un draft de picks/bans completo, torneos internacionales tipo Worlds, negociación detallada de contratos, ligas reales ni una simulación rigurosa de todas las reglas de LoL. El roadmap contiene propuestas, no funcionalidades disponibles.

## Desarrollo

El juego actual es **estático y sin dependencias**:

```text
index.html     Entrada de GitHub Pages
styles.css     Interfaz adaptable
src/core/      RNG, estado inicial, calendario, finanzas y guardados v2
game.js        Mundo, partidos, economía y UI (aún pendiente de modularizar)
scripts/       Comprobaciones automatizadas
docs/          Diseño, arquitectura y plan de pruebas
.github/       CI y plantillas de incidencias
```

Requisitos para desarrollo: **Node.js 22+** para ejecutar comprobaciones. El navegador no necesita Node.

```bash
node --check src/core/rng.js
node --check src/core/state.js
node --check src/core/calendar.js
node --check src/core/finance.js
node --check src/core/persistence.js
node --check game.js
node scripts/check-static.mjs
node --test
```

Los cambios a `main` pueden publicarse mediante la configuración de GitHub Pages existente (**main / raíz**); no hay build de producción ni workflow de despliegue personalizado. La validación automatizada comprueba integridad básica, **no** reemplaza la prueba manual del gameplay.

## Documentación y mejora continua

- [ROADMAP.md](ROADMAP.md): hitos, prioridades y criterios de aceptación.
- [CHANGELOG.md](CHANGELOG.md): cambios por versión.
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): reglas de diseño acordadas.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): estado real del código, datos y guardados.
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md): pruebas manuales y regresiones.
- [CONTRIBUTING.md](CONTRIBUTING.md): flujo de trabajo, criterios de calidad y reportes de errores.

## Licencia y propiedad intelectual

Todavía **no se ha elegido una licencia**. La publicación del código en GitHub no autoriza automáticamente su reutilización o redistribución. Antes de aceptar contribuciones externas o distribuir una versión abierta, hay que decidir una licencia explícita y revisar los derechos sobre los recursos.

El universo oficial del juego usa contenido **original y ficticio**. No se deben incorporar nombres, logotipos, fotografías ni material de terceros sin los derechos pertinentes. Los futuros paquetes de datos opcionales deberán respetar esa regla.

### M1.1: núcleo aislado sin romper Alpha 0.2

La inicialización del estado, la secuencia de RNG y la validación de guardados ahora viven en `src/core/`. **La clave y el formato de guardado siguen siendo v2.** La suite incorpora una huella SHA-256 de un universo, partido y mes generados con la Alpha 0.2 original; no acepta cambios accidentales en los resultados. El motor deportivo, calendario y UI siguen en `game.js` para su extracción incremental.

### M1.1 — Calendario y validaciones

`src/core/calendar.js` contiene el calendario de enfrentamientos, las tablas iniciales, las jornadas pendientes y la fecha siguiente. La importación v2 valida además fixtures, clasificaciones, afiliaciones, contratos, libros mensuales y retransmisiones pausadas. No se modifica el generador del calendario ni la semilla de RNG. Ejecuta `node --test` para verificar calendarios de 8 a 10 clubes, 24 meses simulados y una partida avanzada con retransmisión interrumpida. El estado del juego sigue siendo v2.

### M1.1 — Motor financiero extraído

`src/core/finance.js` contiene cotizaciones de cierres mensuales, salarios, costes de agenda, precios de mercado y movimientos de caja. La venta de un profesional ahora verifica que el comprador puede pagar la transferencia **antes** de modificar plantillas. Los cálculos numéricos originales y el formato de guardado `v2` no cambian; hay pruebas que cubren penalizaciones, fichajes, crisis y operaciones repetidas.
