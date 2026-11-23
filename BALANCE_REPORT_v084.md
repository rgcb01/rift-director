# Rift Director — Informe de balance v0.8.4 (experimental)

**Fuente:** ejecución reproducible [GitHub Actions #45277262314](https://github.com/rgcb01/rift-director/actions/runs/45277262314) sobre la rama `feat/card-game-ai-balance-v084`.

**Metodología:** IA `director` con estilo de mazo correspondiente; 20 semillas por enfrentamiento, cada una ejecutada en dos asientos y con los dos órdenes de iniciativa (4 partidas por semilla); máximo 24 rondas. Se prueban tres listas preconstruidas; no incluye mazos creados por usuarios ni personas reales.

Cada celda de la tabla informa **victorias completadas**. Las partidas incompletas al final de R24 se contabilizan aparte, **no se consideran empates**. Tasas de victoria calculadas solo sobre partidas decididas, excluyendo empates e incompletas.

| Enfrentamiento (80 cada uno) | Victorias A | Victorias B | Empates | Sin finalizar en R24 | Victoria A sobre decididas | Rondas medias completadas |
|---|---:|---:|---:|---:|---:|---:|
| Asedio vs Jungla | 26 | 41 | 5 | 8 | 38.8% | 17.9 |
| Asedio vs Control | 38 | 33 | 2 | 7 | 53.5% | 17.7 |
| Jungla vs Control | 15 | 36 | 0 | 29 | 29.4% | 19.2 |
| Asedio vs Asedio | 36 | 36 | 6 | 2 | 50.0% | 16.7 |
| Jungla vs Jungla | 27 | 27 | 0 | 26 | 50.0% | 19.5 |
| Control vs Control | 24 | 24 | 2 | 30 | 50.0% | 19.9 |

**Totales:** 480 partidas, 378 partidas completadas, 102 incompletas (21.25%), 15 empates reales y 363 resultados decididos. En las decididas, quien comenzó primero ganó aproximadamente 154/363 (42.4%), mientras el segundo ganó 209/363 (57.6%); el bono inicial de +1 energía al segundo puede requerir ajuste.

## Interpretación
1. La base simulada inicial de esta fase completaba solo 215/480 partidas al alcanzar R24 (44.8%). Tras ajustes de IA, composición de mazos y escalado del asedio, la versión presente completa 378/480 (78.75%). **No atribuir toda la mejora a una sola causa**, porque hubo varios cambios.
2. **Asedio y Control** son razonablemente competitivos bajo esta IA (38–33 entre resultados decididos). **Jungla y Asedio** favorece Jungla (41–26), y **Control contrarresta Jungle** de forma marcada (36–15). Estos desbalances siguen pendientes.
3. Los **espejos de Control y Jungla** aún tienen alta duración: más de un tercio no termina antes de R25. La v0.8.4 no debe declararse equilibrada ni lanzar una economía de sobres basándose en estas cifras.
4. Los **torneos IA vs IA** sirven para detectar errores y tendencias, pero no estiman necesariamente tasas de victoria entre jugadores humanos. Se requieren pruebas de partidas reales.

## Criterios de balance para fases siguientes (no alcanzados)
- Partidas que terminan antes o en R24: >90% en cada emparejamiento.
- Ventaja de jugar primero: 45–55% de partidas decididas.
- Arquetipos principales: idealmente 40–60% de victoria frente a otros mazos preconstruidos, sin eliminar sus diferencias.
- Duración objetivo: aproximadamente 8–14 rondas, sujeto a pruebas con humanos.

## Cómo reproducir
```sh
node scripts/card-game-balance.mjs --seeds=20 --rounds=24 --difficulty=director --json=artifacts/balance-v084.json
```

El workflow `card-game-balance.yml` genera también un informe JSON descargable; sus datos son la referencia primaria para comparar posteriores iteraciones.

**Siguiente trabajo recomendado:** evaluar el bono del segundo jugador y el ritmo de los enfrentamientos defensivos antes de desbloquear sobres como progresión principal.
