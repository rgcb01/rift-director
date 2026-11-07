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
