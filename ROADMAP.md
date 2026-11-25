# Roadmap de Rift Director — Juego de cartas

**Estado:** producto principal desde **Card Game 0.9.1**. La simulación de clubes y partidos automáticos del antiguo manager MOBA está **archivada**; su planificación 0.7.19–0.8 del simulador no constituye trabajo activo.

## Estado actual

| Versión | Función | Estado |
|---|---|---|
| 0.8.0–0.8.2 | Motor determinista de cartas, cinco Riftborn, tres carriles, cuatro jugadas, torres, Nexo, jungla, recalls y neutrales | Implementado |
| 0.8.3 | Catálogo, habilidades pasivas, editor de mazos, guardados locales | Implementado |
| 0.8.4 | IA Aprendiz/Táctico/Director, estilos y torneo reproducible | Implementado |
| 0.8.5 | Estudio de iniciativa y Resonancia de Convergencia en rondas tardías | Implementado, balance todavía exploratorio |
| 0.9.0 | Archivo del Vínculo, colección local, sobres, fabricación y recompensas virtuales | Implementado; sin pagos reales |
| **0.9.1** | **UX táctil móvil**: foco de carril, mano plegable y objetivos contextualizados | **Integrado y publicado en GitHub Pages; pruebas visuales aprobadas** |

**Tutorial inicial:** cinco lecciones progresivas sobre carriles, cartas/energía, rotaciones/Back, Latido y Nexo. No produce monedas, no altera la colección y utiliza escenarios de práctica preparados. [Especificación](docs/TUTORIAL_GUIDED_v092.md).

## Próximas versiones propuestas

| Versión | Prioridad | Criterio de aceptación |
|---|---|---|
| **0.9.2** | Piloto de seis ilustraciones IA, renderer reutilizable y tutorial progresivo inicial (adelantado) | Ilustraciones originales y cinco lecciones guiadas con mecánicas del motor real, accesibles en móvil |
| **0.9.3** | Animaciones y audio: jugadas, daño, destrucción de torres, objetivos y sobres | Feedback fácil de interpretar; sonidos configurables, movimiento reducido y sin bloqueo de acciones |
| **0.9.4** | Pulir el tutorial inicial con pruebas humanas y añadir ayuda contextual para partidas normales | Comprensión validada, ayuda opcional, errores claros y lecciones sin bloqueos |
| **0.9.5** | UX/QA y balance: estrategias, duración, simetría, empates, recuperación de errores y accesibilidad | Sin bloqueantes en móvil; partidas humanas probadas, reportes de IA reproducibles y métricas documentadas |
| **0.9.6** | Progresión local con misiones y logros, exportación e importación de colección/mazos | Evitar pérdida de progreso y abuso de recompensas; economía local clara, sin cobros |
| **1.0.0** | Juego de cartas estable, offline-first, contra IA y hotseat con colección, tutorial y guardados | Flujos completos, pruebas visuales y de reglas, arte coherente y salida documentada |

**Fuera de alcance del lanzamiento 1.0.0:** modo online competitivo, cuentas con contraseñas, servidores autoritativos, comercio entre jugadores, monetización y simulador del ecosistema esports. Pueden evaluarse después sin convertirlos en requisitos.

## Identidad de producto

Rift Director es un **juego de cartas táctico coleccionable**, no un MOBA en tiempo real ni un manager. El universo Aethra, el Vínculo y las Convergencias justifican los combates y futuras expansiones de cartas sin añadir sistemas de gestión ajenos al tablero.

## Medición

- `node --test tests/card-game*.test.mjs`: legalidad de jugadas, mazos, sobres, persistencia e IA.
- `node scripts/card-game-balance.mjs`: muestra reproducible, enfrentamientos espejo, iniciativa, duración y objetivos.
- GitHub Actions **UX visual smoke**: flujo de partida en 360/390/430/768/1440 px.
- Los indicadores de partidas IA vs IA no son equivalentes a balance entre jugadores humanos.

## Historia de la visión anterior

El roadmap completo del manager de esports y sus métricas históricas está conservado en la [rama de archivo](https://github.com/rgcb01/rift-director/blob/archive/moba-manager-alpha-0718/ROADMAP.md). No se continuará su secuencia como desarrollo activo. Consulta [Archivo MOBA](docs/LEGACY_MOBA_ARCHIVE.md).
