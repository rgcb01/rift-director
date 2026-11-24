# Rift Director · Biblia de arte para cartas v0.9.2A

**Alcance:** dirección artística y especificación técnica **para ilustraciones generadas por IA** del Card Game. Documento preparado para Codex. No modifica mecánicas ni reemplaza el catálogo. Antes de producir las 56 cartas, validar un piloto de seis ilustraciones en la UI real.

## 1. Separación innegociable

**IA entrega únicamente la ilustración** (el área pictórica). **Código HTML/CSS/SVG** se encarga de: silueta del marco, rareza, coste, nombre, descripción, vida, ataque, rol, iconos, estado activo, bloqueado, seleccionado, objetivos, filtros de color, brillos y efectos. Los archivos generados **no deben** incluir números, palabras, letras, marcos de cartas, emblemas de UI, falsos botones, marcas de agua ni tipografías.

El arte no determina estadísticas o lógica: el contenido autoritativo está en `src/card-game/catalog.mjs`. Cada ilustración se vincula mediante **ID estable** del catálogo; nunca se deriva del texto traducido del nombre.

## 2. Dirección artística provisional

**Concepto:** *Fantasía arcana pictórica / ilustración editorial coleccionable*. Aethra es un mundo fracturado pero tangible; el Vínculo es una energía elegante, no un neón genérico. Se buscan personajes memorables y escenas legibles a 150 px de ancho.

- **Tratamiento:** ilustración digital pintada a mano, pincelada fina y controlada, textura sutil de óleo/gouache, siluetas limpias y detalle concentrado en rostro/manos/equipo. Volumen realista **estilizado**, sin buscar fotorealismo, anime, pixel art ni renders de 3D plástico.
- **Ambientación:** piedra antigua erosionada, metales bruñidos, telas con peso, cristales imperfectos, raíces, bruma y fisuras de energía que atraviesan ruinas de Aethra. Mezclar lo material con lo sobrenatural.
- **Luz:** una fuente principal dramática de tres cuartos + rebote tenue de energía; contraste alto en el foco, fondos menos detallados. Evitar saturación excesiva y efectos que tapen la figura.
- **Paleta ancla:** tinta azul noche `#10182B`, pizarra `#263650`, violeta Vínculo `#7154AD`, cian de Fractura `#60C9D2`, oro antiguo `#D2AC6D`, marfil `#E9E4D9`. Son referentes de arte; **los marcos de rareza se colorean por CSS**, no dentro de la ilustración.
- **Variación por rol (no regla de facción):** TOP: mineral/bronce, fortaleza; MID: violeta/estelar, canalización; BOT: marfil/ámbar, precisión y apoyo; JUN: turquesa/índigo, movimiento y rutas.
- **Originalidad:** no reproducir campeones, poses icónicas, armaduras, símbolos, interfaces ni estilos identificables de franquicias existentes. Cada Riftborn debe tener silueta, anatomía, rostro, edad aparente, vestimenta y equipo propios. Las tácticas deben representar *acciones en Aethra*, no retratos genéricos.

### Prueba de coherencia visual

Al colocar Centinela, Astral y Sombra Errante uno junto al otro, deben parecer del **mismo mundo y del mismo ilustrador**, aunque cada uno tenga silueta, rol y paleta distintos. El fondo nunca compite con el sujeto. No sobrecargar toda la imagen con partículas.

## 3. Entrega y dimensiones (contrato técnico)

| Recurso | Relación | Medidas exactas | Formato y destino |
|---|---|---|---|
| Ilustración maestra | **3:4 vertical** | **1536 × 2048 px**, deseado | PNG RGB, `assets/card-art/masters/<id>.png` |
| Arte completo de carta | 3:4 | **768 × 1024 px** | WebP sRGB, `assets/card-art/webp/<id>-768.webp` |
| Arte medio/colección | 3:4 | **384 × 512 px** | WebP sRGB, `assets/card-art/webp/<id>-384.webp` |
| Arte miniatura/mano | 3:4 | **192 × 256 px** | WebP sRGB, `assets/card-art/webp/<id>-192.webp` |

**Notas:** el objetivo maestro 1536×2048 es una especificación de entrega, **no una afirmación de que cualquier modelo genere nativamente esa resolución**. Si la herramienta solo genera en otro formato, usar recorte centrado y remuestreo proporcional **sin deformar**, documentar la resolución nativa y revisar calidad. Si la resolución es insuficiente para un maestro nítido, informar la limitación y entregar la mejor fuente original disponible; no etiquetar un simple upscale como detalle nuevo. Las derivadas WebP deben tener dimensiones exactas.

- Mantener dimensiones en píxeles enteros, perfil sRGB, sin bordes de relleno artificial ni letras; **sin transparencia requerida** (fondo pictórico incluido).
- Usar calidad WebP orientativa 78–84, preferentemente tamaños `768` de hasta ~350 KiB, `384` hasta ~130 KiB y `192` hasta ~45 KiB; son presupuestos de rendimiento sujetos a inspección visual.
- Composición con **foco visual en el 60% central**, cabeza/objeto clave alrededor del 30–42% de altura. Reservar el perímetro (aprox. 10–12%) sin detalles esenciales. Sujeto o gesto importante visible también tras un recorte central cuadrado.
- Las vistas UI usarán `object-fit: cover` dentro de un viewport de relación declarada; `object-position` configurable por ID en un manifiesto, sin destruir la imagen fuente. Para vista detallada, mostrar la obra completa si el diseño lo permite.
- Nada de texto en imágenes: el panel de nombre, coste y estadísticas del Card Game se dibuja con código. No quemar degradados para texto en el PNG; CSS los gestiona.
- Entregar un `assets/card-art/manifest.json` o módulo de manifiesto tipado con IDs, rutas, tamaño fuente, punto focal `{x,y}` normalizado 0–1, alt-text descriptivo **en español** y metadatos de generación (modelo/herramienta, fecha, versión de prompt y semilla si aplica). Evitar embebidos de información privada.

## 4. Piloto obligatorio: 6 ilustraciones reales del catálogo

**Personajes (pintura de retrato heroico, no carta con marco):**

1. **`hero-centinela` — Centinela, TOP, Baluarte, común.** Defensor corpulento de Aethra con coraza de pizarra y bronce gastado, un gran escudo hecho de placas geológicas unidas por delicados filamentos del Vínculo. Mirada disciplinada, postura que protege, silueta triangular firme. Atmósfera de murallas erosionadas; luz cálida sobre el escudo y cian discreto en las grietas. Sin parecerse a guerreros reconocibles.
2. **`hero-astral` — Astral, MID, Cosecha, rara.** Investigador/a arcano/a de rostro singular con túnica de capas textiles, brazales astronómicos artesanales y un pequeño mapa de corrientes estelares suspendido sobre una mano. Sensación de escucha y precisión, no de explosión; cielo fracturado violeta/cian sobre un observatorio antiguo. No añadir runas legibles.
3. **`hero-sombra` — Sombra Errante, JUN, Explorador, épica.** Rastreador/a ágil con manto de recortes asimétricos, protección ligera y equipo original de exploración. Movimiento sigiloso entre rocas húmedas y brechas del Vínculo; contraste de sombra índigo con estelas turquesa; silueta de diagonal dinámica, rostro parcialmente iluminado pero no anónimo.

**Tácticas (escena narrativa concreta, sin números ni texto):**

4. **`great-convergence` — Gran Convergencia, acción, legendaria.** Varias líneas de energía del Vínculo confluyen sobre una fortificación en un paisaje de tres rutas; una onda de presión visual comprensible sin destello que tape toda la escena. Escala épica, contraste oro antiguo con violeta y cian. Debe leerse como *presión y ruptura de formación*, no como explosión cósmica genérica.
5. **`disrupt` — Distorsión, hechizo, rara.** Un corredor de energía rival se curva y fragmenta alrededor de un obelisco agrietado; líneas de movimiento interrumpidas y polvo suspendido expresan sabotaje de presión. Formas claras, sin interfaz holográfica ni letras.
6. **`line-guard` — Guardia de línea, hechizo, común.** Barrera protectora translúcida y escudos etéreos con textura de vidrio mineral alrededor de una ruta amenazada; fuerza defensiva legible desde miniatura, luz cian suave reflejada en piedra y textiles. No convertirlo en un logo flotante.

### Plantilla de prompt base reutilizable

```text
Original hand-painted collectible fantasy card illustration, set in Aethra,
a fractured arcane world held by luminous strands of the Vinculo.
Painterly editorial fantasy illustration, refined brush texture, crisp iconic
silhouette, tactile weathered stone, brushed bronze, layered textiles,
controlled magical glow, cinematic three-quarter lighting, atmospheric depth,
high focal contrast, subdued backgrounds, readable at tiny card size.
Night slate and antique gold with cyan/violet fracture energy.
VERTICAL 3:4 COMPOSITION. Single coherent scene. Center the subject/action;
essential detail within central 60% and safe for a centered square crop.
NO text, typography, letters, numbers, UI, card frame, icons, borders,
watermarks, logos, recognizable existing franchise characters or copies.
Subject and action: [INSERTAR DESCRIPCIÓN DE UNA DE LAS 6 CARTAS].
```

Usar el mismo bloque de estilo para las seis imágenes; variar solo el sujeto, composición secundaria, ambiente y acento de color. **No generar variantes no relacionadas que rompan la colección.**

## 5. Integración de Codex (fase posterior al piloto aprobado)

1. Leer `src/card-game/catalog.mjs` y validar que los seis IDs existen. **No alterar IDs, textos, costes, roles, efectos o rarezas**.
2. Generar solo las seis ilustraciones y derivados optimizados. Si Codex **no tiene una herramienta de generación de imagen disponible**, no inventar archivos ni declarar el trabajo completo: entregar prompts, plantilla de manifiesto y script de validación, y solicitar la generación con una herramienta habilitada.
3. Añadir utilidad de validación reproducible que verifique archivos existentes, dimensiones, formato, pesos y referencias a IDs reales. Falta un asset = fallback a glifo/CSS actual, sin imagen rota.
4. Incorporar un renderer visual reutilizable: arte como capa independiente, marco y rareza por CSS/SVG, etiquetas/stats por DOM. En lo posible, un elemento consistente entre mano, tablero, colección, constructor y apertura de sobres.
5. Usar `srcset`/`sizes` para fuentes WebP; dar alt accesible y permitir `prefers-reduced-motion`. El arte **no puede impedir jugar** si falta una imagen o la red está offline.
6. Pruebas de 360, 390, 430 y 1440 px; verificar no desbordes, texto nítido, cara/objeto visible y tarjeta seleccionable; confirmar que los juegos anteriores y guardados funcionan.
7. Entregar **capturas reales**, lista exacta de archivos producidos y commit/PR. **No producir el resto de 56 antes de aprobar el piloto.**

## 6. Criterios de aceptación

- 6 obras diferentes, visualmente coherentes, sin texto/estadísticas/marcos en el raster.
- WebP 768×1024, 384×512 y 192×256, dimensiones comprobadas automáticamente y nombres iguales a IDs del catálogo.
- Manifiesto con puntos focales y texto alternativo. Sin referencias a material protegido reconocible.
- Carta renderizada íntegramente por código: cambia coste/nombre/rareza sin regenerar ilustración.
- El juego sigue accesible y funcional sin recursos de arte; los seis IDs ilustrados pueden identificarse sin leer párrafos.
- Ningún cambio de balance, colección, economía o guardado.
- Revisar seis imágenes juntas y al menos una pantalla móvil de juego, deck builder y colección **antes de ampliar el set**.
