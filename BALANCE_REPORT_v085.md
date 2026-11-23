# Rift Director — Balance v0.8.5 (IA experimental, 2026-11-23)

Este documento registra dos experimentos reproducibles sobre el motor del card game; no es una afirmación de balance competitivo con jugadores humanos. El simulador antiguo y sus guardados no participan.

## Experimento 1: compensación al segundo jugador

**Fuente:** [GitHub Actions · estudio de iniciativa](https://github.com/rgcb01/rift-director/actions/runs/45288906178). Mismas seis parejas de mazos, 20 semillas por enfrentamiento, intercambio de lados e inversión de prioridad, 480 juegos por variante. IA Director, límite 24 rondas. **En esta comparación la Resonancia del late estaba desactivada** para aislar el bono.

| Energía extra al segundo en R1 | Completadas / 480 | Sin terminar | Empates reales | Ganó el primero | Primero entre decididas |
|---|---:|---:|---:|---:|---:|
| +0 | 374 | 106 | 13 | 176 | 48.8% |
| +1 (regla oficial) | 372 | 108 | 15 | 182 | 51.0% |
| +2 | 375 | 105 | 16 | 172 | 47.9% |

**Decisión:** mantener **+1 energía** como valor por defecto. Este experimento pequeño no muestra evidencia de una ventaja importante y sostenida por iniciativa. Los porcentajes excluyen empates y juegos incompletos. No convertir el porcentaje medido en garantía para PvP.

## Experimento 2: Resonancia tardía de Convergencia

**Fuente:** [GitHub Actions · experimento de resonancia](https://github.com/rgcb01/rift-director/actions/runs/45289347049). Mismos rivales, 12 semillas por cruce, dos lados y dos prioridades, **288 partidas por variante**, límite R24, con bono inicial +1 en ambos escenarios.

| Indicador | Sin resonancia | Con resonancia |
|---|---:|---:|
| Partidas completadas | 213/288 (74.0%) | 257/288 (89.2%) |
| Partidas sin terminar | 75/288 (26.0%) | 31/288 (10.8%) |
| Empates reales | 9 | 13 |
| Victorias de quien empezó | 97 | 121 |
| Victorias de quien jugó segundo | 107 | 123 |
| Espejo Jungla sin terminar | 28/48 | 14/48 |
| Espejo Control sin terminar | 22/48 | 2/48 |
| Jungla vs Control sin terminar | 18/48 | 10/48 |

**Decisión:** activar Resonancia tardía en la partida principal: +1 presión de asedio por carril a partir de R14 y +2 a partir de R18, **solo cuando sobrevive un Riftborn delantero tras el combate**. Esta bonificación no destruye el Nexo detrás de torres intactas ni perfora los límites de daño de asedio de cada ronda. Se mantiene una opción de desactivación para comparar el antes y después.

El salto observado es de **+15.3 puntos porcentuales** en partidas terminadas; es un resultado bajo estas semillas e IA, no una promesa de eficacia en PvP ni en mazos personalizados.

## Hallazgos abiertos

- La Resonancia reduce los estancamientos, pero no los elimina: todavía existen 31/288 partidas sin finalizar en R24 en este conjunto.
- El último corte antes de activarla indicaba ventaja apreciable de Jungla frente a Asedio y de Control frente a Jungla. Se necesitan matrices más grandes y partidas humanas antes de fijar cantidades de sobres, rarezas o progreso.
- El diseño actualmente ofrece tres dificultades de bot y cuatro estilos, pero las IA del mismo arquetipo no sustituyen adversarios reales.
- **Siguiente validación:** análisis de duración y enfrentamientos con jugadores humanos, seguido de pruebas de generación de sobres y colección permanente sin perjudicar el sistema de construcción de mazos.

## Reproducción

```sh
node scripts/card-game-opening-study.mjs --seeds=20 --rounds=24 --momentum=false --json=artifacts/opening-previo-v085.json
node scripts/card-game-opening-study.mjs --seeds=20 --rounds=24 --momentum=true --json=artifacts/opening-v085.json
node scripts/card-game-momentum-study.mjs --seeds=12 --rounds=24 --json=artifacts/momentum-v085.json
node scripts/card-game-balance.mjs --seeds=20 --rounds=24 --difficulty=director --json=artifacts/balance-v085.json
```

El workflow publica los tres archivos JSON en sus artefactos. Los resultados del informe de apertura se generaron con el diseño anterior **sin Resonancia**, como indica el apartado de metodología. Las pruebas de nuevas versiones deben conservar la distinción entre partidas decididas, empates y partidas inconclusas.
