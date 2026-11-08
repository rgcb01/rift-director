# Alpha 0.7.7 — Auditoría cuantitativa de balance (baseline)

Estado: **diagnóstico reproducible, no release cerrada**. Motor evaluado: Alpha 0.7.6, commit base `0beab9d416699ae288dac4d8f0d54c9f700c6b84`.

## Metodología

- 1,000 partidos oficiales generados con `simulateMatch` desde el mismo harness usado en pruebas; 10 mundos independientes, 100 partidos por mundo, distintos emparejamientos reales de Aurora y semillas deterministas.
- 100 de los 1,000 se sometieron adicionalmente a auditoría completa (navegación, IA, combate, score, minimapa, momentos históricos y broadcast).
- Seguimiento: 1,000 partidos extra como **500 parejas espejadas**; cada pareja usa mismos equipos y semilla y repite invirtiendo `fixture.a`/`fixture.b`.
- Fuentes: `tests/balance-1000.test.mjs`, `tests/balance-mirror.test.mjs`.
- Logs CI: https://github.com/rgcb01/rift-director/actions/runs/42428342937 y https://github.com/rgcb01/rift-director/actions/runs/42428513179.

## Resultados

| Métrica | 1,000 baseline | 1,000 espejados |
|---|---:|---:|
| Partidos completos | 1,000/1,000 | 1,000/1,000 |
| Auditorías detalladas | 100/100 sin errores | No ejecutadas en segundo lote |
| Victoria azul (slot A) | 604 (60.4%) | 577 (57.7%) |
| Duración media | 48.58 min | 48.38 min |
| Rango de duración | 40–66 min | 40–67 min |
| Bajas totales medias | 8.64 | Sin agregación de kills |
| Dragones por partido | 0.710 | 0.709 |
| Barones por partido | 1.722 | 1.713 |
| Torres destruidas por partido | 3.214 | 3.223 |

### Densidad de eventos (primer lote)

| Evento | Total | Media/partido | Partidos con evento |
|---|---:|---:|---:|
| `lane_trade` | 17,256 | 17.256 | 1,000 |
| `skirmish` | 6,847 | 6.847 | 1,000 |
| `teamfight` | 2,873 | 2.873 | 946 |
| `clash` | 2,233 | 2.233 | 936 |
| `gank` | 328 | 0.328 | 296 |
| `gank_avoided` | 1,286 | 1.286 | 812 |
| `dragon` | 710 | 0.710 | 590 |
| `baron` | 1,722 | 1.722 | 982 |
| `tower` | 3,214 | 3.214 | 1,000 |

En el lote inicial, 410 partidas no tuvieron dragón, 18 no tuvieron Barón y solo se registraron 8 robos de Barón. Las 1,000 finalizaron con un único nexo; no hubo partidas sin kills ni que alcanzaran el minuto 75.

### Prueba controlada de lados y estructuras

- 500 parejas espejadas: 184 parejas ganadas **ambas** por el lado azul, 107 parejas **ambas** por el lado rojo, 209 parejas ganadas por el **mismo club** independientemente del lado. En 291 parejas cambiar el lado cambió el club vencedor.
- 790/1,000 partidos espejados acabaron con **exactamente 3 torres**; 197 con 4 y 13 con 5. Promedio 3.223.
- En 999/1,000 partidas la **primera torre no cayó antes del minuto 36**. Primer derribo medio: minuto 37.68.
- Entre ambos lotes, la ventaja del slot A/azul persiste tras invertir los equipos. No atribuirla todavía a un único error de mapa: también puede proceder de prioridad por orden, RNG y motor de asedio.

## Diagnóstico y prioridades

**P0 — Asedio excesivamente prescrito.** `src/core/navigation.js::determineSiege` fija un equipo atacante para el tramo posterior a t=36; `chooseGoal` lleva todos sus jugadores al objetivo de asedio y los rivales a defender. `game.js` puede destruir torres si hay dos atacantes cerca, sin simular oleadas ni daño/vida de torres. Con 99.9% de partidas sin torre antes del minuto 36 y 79% con exactamente tres, el encuentro no desarrolla suficiente diversidad territorial.

**P1 — Posible sesgo de lado/orden.** 60.4% slot A en baseline y 57.7% con parejas espejadas. Añadir pruebas de simetría de grafo/caminos, comparaciones A/B de prioridades, determinación de asedio, acciones de torre, posición de visión y muestreo por estilos/plantillas. Definir presupuesto de diferencia antes de modificar balance.

**P1 — Objetivos desbalanceados.** 41% sin Dragón, ~98% con Barón y únicamente 8 robos de 1,722 barones en el lote inicial. Revisar ventanas de objetivo (`jungleGoal`, `chooseGoal`), presencia de equipo, riesgos, counterganks y rutas legales. Evitar forzar objetivos artificiales.

**P2 — Ritmo y variedad de combates.** 8.64 kills combinadas, pero 17.26 intercambios de línea y 6.85 escaramuzas de objetivo por partido. Separar eventos repetitivos de encuentros que cambian decisiones, posiciones, economía y objetivos. Medir duración de HP bajo, retiradas y diversidad de seeds.

## Propuesta de aceptación Alpha 0.7.7

- Conservar invariantes: un ganador/nexo, sin teletransportes, salud/daño/kill coherentes, RNG determinista, replay y guardados `v2` estables; no modificar hashes financieros históricos sin causa.
- Auditar 1,000 partidos y, al menos, 500 parejas invertidas **después de cada arreglo de balance importante**; publicar datos antes/después.
- Reducir y explicar el sesgo A/B sin forzar 50/50 de forma artificial.
- Conseguir una distribución defendible de primeras torres antes/durante asedio; evitar que todos los mapas dependan de un solo compromiso irreversible en el minuto 36.
- Reequilibrar Dragón/Barón basándose en presencia y visión real, sin introducir eventos inventados.
- QA manual del match center en ordenador y móvil.

## Limitaciones

Esta batería evalúa partidas de un solo mapa, no 20 temporadas del manager, no balance de ingresos/sponsors, no partidas reales de navegador ni el sistema futuro de campeones/oleadas/wards. Sus umbrales son señales diagnósticas, no objetivos de números exactos. No convierte Alpha 0.7.7 en release aprobada.

## Reproducir

```bash
node --test tests/balance-1000.test.mjs tests/balance-mirror.test.mjs
```

Para la suite completa: `node --test`. **Nota:** ambos benchmarks están descubiertos automáticamente por el CI actual y añaden carga de simulación a cada ejecución; mover a una ruta opt-in o crear un workflow manual cuando se formalice el pipeline de balance.
