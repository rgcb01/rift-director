# UX-3: Laboratorio histórico de balance

El laboratorio es una vista de solo lectura; usa métricas publicadas de las releases 0.7.14, 0.7.16 y 0.7.17. No simula partidos, no requiere crear un club, no escribe guardados ni utiliza datos en directo.

## Fuentes verificadas

- 0.7.14: comparación publicada en CHANGELOG.md, sección 0.7.16 y PR #44: https://github.com/rgcb01/rift-director/pull/44
- 0.7.16: Actions https://github.com/rgcb01/rift-director/actions/runs/42751443138
- 0.7.17: Actions https://github.com/rgcb01/rift-director/actions/runs/42755942297

Por release: 1,000 mapas primarios auditados y 500 pares espejados (1,000 mapas adicionales). Los pares no se consideran 1,000 observaciones independientes adicionales.

## Indicadores

| Campo | Interpretación | Unidad |
|---|---|---|
| duration | Media del tiempo hasta finalizar el mapa | Minutos simulados |
| kills | Kills registradas por mapa | Kills/mapa |
| towers | Torres destruidas por mapa | Torres/mapa |
| comeback | Victoria tras déficit de ≥1,500 de oro al minuto 20 | % de mapas |
| side | Victoria azul en el conjunto espejado | % |
| observedTtk | Tiempo observado de primera herida registrada a kill (proxy) | Minutos simulados |
| p50, p90 | Percentiles de duración no disponibles en los resúmenes publicados | Minutos simulados |

Las métricas ausentes se representan como null y se visualizan como «No medido», nunca como cero. El TTK observado de 0.7.17 NO es el TTK real de combate en segundos. Los deltas se calculan con los valores históricos redondeados: son diferencias descriptivas, no demostraciones estadísticas de mejora.

## Añadir una nueva versión

1. Ejecutar la batería de balance de GitHub Actions con auditoría completa de 1,000 mapas y 500 pares espejados.
2. Verificar gates, reporte, versión y protocolización del benchmark. Conservar el summary.json/report.md de la release publicada.
3. Congelar en control de versiones un resumen estable con la URL de evidencia. No copiar resultados de experimentos descartados o PRs sin publicar.
4. Añadir la versión a DATA de src/ui/balance-lab.js, solo con métricas realmente medidas, y actualizar tests/balance-lab-ui.test.mjs.
5. Validar sintaxis, node --test, experiencia responsive, teclado y lector de pantalla.

## Alcance

Esta primera fase no importa reportes arbitrarios ni ejecuta partidas en el navegador. La vista usa SVG local, HTML y JavaScript sin dependencias externas. Para P50/P90, histogramas, intervalos o análisis por campeón, hace falta persistir el artifact original o un JSON resumido y verificado; hasta entonces mostrar «No medido».
