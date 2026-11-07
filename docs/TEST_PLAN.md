# Plan de pruebas — Rift Director

**Alcance actual:** Alpha 0.2. La suite automática es de **smoke**, no una cobertura integral. Cada nueva mecánica debe incorporar pruebas de invariantes y recorridos manuales.

## Comprobaciones automáticas

```bash
node --check game.js
node scripts/check-static.mjs
node --test
```

La CI ejecuta estos comandos en pushes y pull requests. Si un check falla, no se considera una versión lista para publicar. Estas pruebas no comprueban la interfaz en un navegador real.

## Recorrido manual mínimo antes de cada release

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Abrir `index.html` en navegador limpio | Pantalla para crear organización, sin errores visibles |
| 2 | Crear un club | Aparece tablero; exactamente cinco titulares por rol |
| 3 | Visitar Plantilla | Cards y retratos SVG; perfiles, atributos y traits legibles |
| 4 | Cambiar entrenamientos | Capacidad limitada; coste reflejado en finanzas |
| 5 | Abrir Mercado y fichar agente libre con saldo suficiente | Se descuenta dinero y jugador aparece en roster |
| 6 | Probar una venta válida | El club recibe dinero y mantiene una alineación válida |
| 7 | Preparar un partido y pulsar Jugar | Marcador y retransmisión avanzan sin bloquearse |
| 8 | Cambiar velocidades, pausa y resultado instantáneo | Una misma simulación no cambia de ganador por velocidad |
| 9 | Revisar resultado | Nexo destruido, ganador, estadísticas y eventos coherentes |
| 10 | Terminar partidos del mes y cerrar mes | Se cobran/pagan importes correctos; calendario y noticias avanzan |
| 11 | Renovar sponsor / incumplir compromiso | Ingresos y penalizaciones reflejan obligaciones |
| 12 | Llegar a playoffs y siguiente año | No quedan partidos bloqueados; se actualizan edad, meta y rookies |
| 13 | Exportar JSON e importar en navegador limpio | Se restaura la misma temporada, caja, roster e historial |
| 14 | Forzar insolvencia en partida de prueba | Caja queda en 0 y se muestra fin de partida, sin estado negativo persistido |
| 15 | Abrir desde móvil | Sin scroll horizontal involuntario ni botones imposibles de pulsar |

## Invariantes para el motor

- Cada club activo tiene **TOP, JUN, MID, ADC y SUP** en la alineación.
- Ningún profesional pertenece simultáneamente a dos clubes.
- Los contratos y los saldos no se duplican por ejecutar una acción dos veces.
- Un marcador se construye a partir de eventos; kills y objetivos no aparecen de la nada.
- Solo personajes vivos y participantes válidos ejecutan acciones.
- Smite, objetivos y pentakills cumplen reglas explícitas.
- Torres y nexo siguen un orden válido; el nexo no cae sin ruta abierta.
- Todo partido acaba con un único ganador; el salto de velocidad no cambia el resultado.
- La suma de ingresos menos egresos coincide con el cambio neto de caja.
- El cierre de diciembre transiciona una sola vez al siguiente año.
- Los rumores se confirman o desmienten usando transacciones reales.

## Pruebas estadísticas pendientes

- Simular 1,000+ partidos por semilla y comparar tasa de victoria por diferencia de habilidad.
- Medir frecuencia de robos, ganks, torres, exterminios, objetivos y duración de partidas.
- Simular 20 años y vigilar inflación, quiebras, estabilidad del roster, rookies y tamaños de liga.
- Comprobar que el costo de oportunidad entre entrenamiento y publicidad se note en la temporada.
- Evaluar la probabilidad de insolvencia con distintos estilos empresariales.
- Comprobar que distintos traits generen comportamientos distintos, no solo distintos nombres.

## Dispositivos prioritarios

- PC: Chrome, Firefox y Edge actuales.
- Móvil: Safari en iPhone y Chrome en Android.
- Teléfonos modestos: revisar velocidad de render y tamaño de los historiales.
- Navegación con teclado, zoom de texto y contraste.

## Reportar errores

Usa la [plantilla de bug](../.github/ISSUE_TEMPLATE/bug_report.yml). Incluye versión, navegador, dispositivo, pasos, resultado esperado y observado. Adjunta **solo** un guardado JSON que revisaste y estés dispuesto a compartir; puede incluir nombres inventados por el usuario.

## Política de salida

Antes de una release:
1. Todos los checks automatizados pasan.
2. Se recorre el flujo manual completo en escritorio y móvil.
3. Se prueba un guardado de la versión publicada anterior.
4. Se actualizan [CHANGELOG](../CHANGELOG.md) y [ROADMAP](../ROADMAP.md).
5. Se verifica el sitio de GitHub Pages después del despliegue.

## Cobertura automatizada añadida en M1.1

- `tests/calendar.test.mjs`: todos contra todos a ida/vuelta con 8, 9 y 10 clubes; descansos y ausencia de duplicados por ronda.
- Validación de clubes fuera de región, fixtures corruptos, contratos negativos, jugadores asignados a un equipo inexistente y balances incoherentes.
- Simulación rápida de 24 meses con avance real de mes y offseason, cambios de liga y guardado tras cada cierre.
- Simulación sintética avanzada: guardar un mapa pausado, restaurar su estado y comprobar que su recompensa no se abone dos veces.
- Continúa pendiente probar un **archivo exportado desde una Alpha 0.2 real** y repetir los recorridos en Safari iOS y Chrome Android.

## Finanzas (M1.1)

- `tests/finance.test.mjs` compara desglose mensual con el cálculo original y verifica que una cotización no mute el universo.
- Valida transferencia con y sin fondos: ningún pago incompleto cambia saldos.
- Verifica firma de agente libre, venta de suplente, reintento duplicado, rescisión de sponsor, inversión en staff, scouting y crisis que lleva a insolvencia.
- Sigue pendiente un test estadístico del equilibrio de sponsors/merch durante 10–20 temporadas y en dispositivos de gama baja.

## M1.2 — Auditoría de narración

- `tests/match-events.test.mjs`: partidas con cientos de seeds, comprobación de acciones válidas, marcador, órdenes de objetivos y unicidad del nexo.
- Mutaciones intencionales: falsificar el Smite del jungla con un MID, repetir una víctima, borrar la evidencia de una torre y alterar ganador.
- Pruebas de exportación de un mapa pausado con `event.facts` sin cambiar `v2`.
- Pendiente: modelo de campeones, hechizos equipados, posiciones, fog of war y tests estadísticos de traits bajo meta cambiante.

## M1.2 — Estadísticas de jugadores

- `tests/player-stats.test.mjs`: auditar cientos de semillas y comparar suma de K/D/A por profesional con totales de asesinatos por equipo.
- Detectar datos falsificados: asistencias de un rival, participantes inexistentes y snapshots alterados.
- Verificar que `finishMatch` no duplique KDA, histórico o recompensas cuando se llama dos veces.
- Importar un `v2` con mapa heredado sin estadísticas y finalizarlo sin inventar datos.
- Verificar casos de KDA perfecto y pentakills de cinco víctimas reales en un mismo evento.
- Pendiente: asistencias por víctima, pentakills repartidas entre varios eventos dentro de una ventana de tiempo, toda la carrera IA y rendimiento en celulares modestos.

## Alpha 0.3 — Pruebas del modo exhibición y mapa

- Desde bienvenida, simular exhibición, acelerar, pausar, saltar al final y salir; no debe aparecer un save nuevo ni un premio.
- Con partida activa, exportar save, iniciar demo, repetir varias veces y salir: mismo objeto de mundo, caja, temporada, plantilla y bytes de `localStorage`.
- Con partido oficial pausado, iniciar demo, salir y volver a la posición exacta anterior del marcador.
- Auditar ganks por semilla: rol JUN, carril TOP/MID/BOT, ruta válida, presión y visión coincidentes con frame.
- Atributos de visión defensiva deben **reducir** probabilidad de gank, manteniendo clamps de balance.
- Probar botón demo/volver en Safari iOS y Chrome Android reales antes de cerrar hito. La UI es HTML estático y no precisa backend.

## M1.3A — Minimap visual

- Grafo top/mid/bot con extremos correctos y 18 torres originales dentro del viewBox.
- Diez profesionales visibles desde minuto 0, cada cual en un rol correcto; JUN en jungla, TOP en línea superior, ADC/SUP en inferior.
- Secuencias de eventos de muchas semillas: torre pasa a ruina sólo cuando aparece el evento correspondiente, el total coincide con marcador, víctimas no se mueven como vivas y sólo los atacantes vivos rodean el nexo final.
- Auditoría determinista de proyección: regenerar minimapa no consume RNG ni altera resultados y detectar manualmente una posición falsificada.
- Render SVG: 10 retratos, 18 torres, 2 nexos, Barón y Dragón, sin descargar assets ni reproducir el mapa oficial de LoL.
- Guardado `v2` antiguo sin minimapa: puede reanudarse y finalizar sin migración ni datos inventados.
- La exhibición sigue aislada del guardado original.
- **Manual pendiente:** verificar tamaño/legibilidad, fluidez y botones del Match Center en Safari iOS y Chrome Android. M1.3B validará rutas y movimiento físico, que M1.3A aún no simula.

## M1.4A — Ritmo y variedad narrativa

- El temporizador debe marcar 1× = 5000 ms, 2× = 2500 ms, 5× = 950 ms, sin depender del número de FPS del navegador.
- Con varios acontecimientos en el mismo minuto, 1× revela **solo uno por paso**; no omite otros antes de mostrar el siguiente minuto.
- La velocidad 5×, pausa/reanudación y salto instantáneo usan el mismo ganador, eventos y premios; `finishMatch()` no debe ejecutarse dos veces.
- Comprobar en cientos de semillas variedad de asuntos, títulos, cambios reales de oro, superioridad de visión/carriles y análisis de objetivos sin inventar estadísticas deportivas.
- La creación del broadcast no consume RNG ni altera `event.facts`, frames o ganador. Debe ser reproducible con la misma seed.
- Falsificar datos editoriales debe hacer fallar `auditBroadcast`, sin necesidad de modificar datos de deporte.
- Guardado viejo `v2` sin `broadcast` debe seguir reproduciéndose y finalizando.
- **Manual pendiente:** evaluar legibilidad del feed a 1× en móvil y escritorio, y comprobar que el marcador por minuto no actúe como adelanto excesivo de acontecimientos que aún no se revelan.

## Alpha 0.6 — Navegación causal, pruebas de integridad

- `tests/navigation.test.mjs`: nodos conectados y rutas válidas por BFS; ningún desplazamiento entre minutos excede una conexión, excepto muerte a fuente documentada.
- Las diez posiciones iniciales concuerdan con TOP/MID/ADC/SUP y junglas; el movimiento influye en qué acciones son elegibles.
- Cientos de seeds: `Navigation.auditNavigation`, `auditMatch` y `auditMinimap` deben pasar a la vez; juego con un vencedor y sin teleportación de autor ni pentakills falsos.
- Al falsificar la ubicación de un agresor en el frame previo, el auditor detecta ausencia de presencia en torre/nexo.
- Muerte devuelve a la fuente y el profesional no avanza hasta reaparecer; luego su viaje vuelve a requerir conexiones.
- Reproducción 1×/5×/instantáneo y demo aislada no modifican el historial de navegación ni los guardados ajenos.
- El golden test mantiene una referencia de resultado distinta a Alpha 0.5 porque la regla deportiva cambió, pero verifica que la contabilidad mensual y el universo inicial permanecen correctos.
- **Pendientes:** estadísticas de frecuencia de eventos tras inmersión espacial, escala de partidas durante 1000 seeds, experiencia táctil y rendimiento en Safari iOS/Chrome Android, recuperación de JSON real exportado de versiones anteriores.
