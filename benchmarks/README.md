# Regresión de balance por versión — Rift Director

El benchmark **usa el motor real de producción** mediante `tests/harness.mjs`; no genera datos inventados ni modifica los guardados. El juego web sigue sin dependencias externas.

## Activación

El workflow [`Balance por versión`](../.github/workflows/balance.yml) ejecuta automáticamente la batería cuando:

- Se abre/actualiza un PR que modifica `CHANGELOG.md`, la propia infraestructura de balance o sus pruebas.
- Una versión `x.y.z-alpha` nueva aparece en `CHANGELOG.md` y llega a `main` (se omiten ediciones posteriores del mismo encabezado sin incremento de versión).
- Se publica un tag `v0.7.7-alpha` (o `0.7.7-alpha`) cuyo número **coincida** con `CHANGELOG.md`.
- Se solicita manualmente con **Actions → Balance por versión → Run workflow** para ejecutar antes de fusionar cambios de gameplay.

**Importante:** para que un cambio deportivo reciba el gate estadístico antes de fusionarse, incluir el incremento de versión en el mismo PR o ejecutar el workflow manualmente. Los cambios sin nueva versión siguen pasando la CI rápida habitual. El tag solo es válido cuando coincide con el changelog.

## Trabajo realizado

1. `benchmarks/run.mjs`: **1,000 partidos completos** en 10 mundos deterministas, distintos encuentros y seeds. Se aplican **todas** las auditorías a los **1,000 partidos**: navegación, IA táctica, HP, hechos deportivos, minimapa, replay y RiftCast.
2. El mismo comando ejecuta **1,000 partidos adicionales**, agrupados en 500 pares con equipos/semillas idénticos e inversión de lados. Es el control del sesgo de color, no otra muestra independiente.
3. `benchmarks/find-previous.mjs`: intenta recuperar el artifact **de la última versión menor** (retención: 90 días). Si ya expiró o no existe, usa la **referencia congelada más reciente que sea anterior a la versión actual**: 0.7.6-alpha se conserva completa y 0.7.7-alpha como resumen de métricas publicadas por GitHub Actions (run 42434225330). Los indicadores nuevos que no existían en la versión anterior se muestran como «No medido», no como cero.
4. `benchmarks/report.mjs`: genera `summary.json`, `report.md`, `regressions.json`, `index.html` y **8 gráficas SVG**. El resumen aparece además en GitHub Actions; se adjunta el reporte como archivo descargable `balance-report-VERSION`.
5. Un resultado inválido, una auditoría fallida o regresiones graves detienen el workflow. Los defectos históricos aún presentes generan advertencias y no se silencian.

## Umbrales iniciales y revisión

Hay fallos **bloqueantes** si una nueva versión produce: partidas inválidas, sesgo de color extremo (>67% o <33%), media de duración fuera de 18–65 minutos, menos de 3 o más de 35 kills de media, más de 70% de mapas sin Dragón, más de 50% sin Barón, más de 20% sin kills, o torres medias por debajo de 2.9. También se bloquean regresiones frente a la versión previa de: sesgo espejado +5 puntos de desviación de 50%, mapas sin Dragón +20 pp, kills -40% o duración +15 minutos.

Las alertas **no bloqueantes** incluyen sesgo de lado mayor a 55%, ausencia de Dragón (>30%), exactamente tres torres (>65%), torres que solo caen a partir del minuto 36 (>90%) y ausencia de partidas rápidas.

**No son objetivos normativos de League of Legends.** Son alarmas iniciales para impedir que una nueva mecánica rompa sistemas existentes. Cuando el diseño cambie de forma deliberada (por ejemplo, nuevo modelo de torres o duración), es necesario revisar los umbrales y explicar el cambio en el PR, nunca elevarlos silenciosamente para ocultar un fallo.

Las pruebas no comparan campeones, datos del mundo real ni situaciones de un servidor real. La reproducción depende de preservar el benchmark con seeds y fixtures fijos; si hay que cambiar el esquema, versionar `benchmarkRevision` y crear una nueva referencia explícita.

## Uso local (Node.js 22+)

```bash
node --test
node benchmarks/run.mjs 0.7.7-alpha .balance-output
node benchmarks/report.mjs .balance-output/summary.json benchmarks/baselines/0.7.6-alpha.json .balance-output
```

Abre `.balance-output/index.html` para ver todos los gráficos. En GitHub, entra a **Actions → Balance por versión → run → Artifacts** para obtener el dashboard, el JSON reproducible y la tabla de diferencias. El artifact dura hasta 90 días; conserva copias de releases importantes si quieres comparaciones históricas a largo plazo.

**Política de versiones:** el reporte y las pruebas se vuelven a ejecutar con cada `x.y.z-alpha`, **no solo con la próxima Alpha 0.7.7**. La automatización no corrige automáticamente el gameplay: solo protege y señala cambios.
