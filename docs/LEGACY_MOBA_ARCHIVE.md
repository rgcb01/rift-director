# Archivo: Rift Director MOBA Manager (Alpha 0.7.18)

**Estado: ARCHIVADO. No es la visión, portada ni roadmap activos de Rift Director.**

El proyecto comenzó como un simulador/manager de una organización ficticia de esports y MOBA: scouting, fichajes, finanzas, preparación, ligas y partidos automáticos con comentarios, replay y estadísticas. Ese prototipo llegó a Alpha 0.7.18 y acumuló experimentos de teamfights, retornos, objetivos, objetos y evolución competitiva. Ya no es el juego que se está desarrollando.

## Conservación técnica

- La rama [`archive/moba-manager-alpha-0718`](https://github.com/rgcb01/rift-director/tree/archive/moba-manager-alpha-0718) fija una instantánea anterior a la sustitución de la portada y de la documentación principal. Conserva los README/ROADMAP/decisiones originales y el código correspondiente.
- Para revisar la experiencia antigua desde la rama principal, se conserva [`legacy-moba.html`](../legacy-moba.html), que carga `game.js`, `styles.css`, `src/core/**` y `src/ui/**` como la antigua `index.html`.
- Los archivos de pruebas y los benchmarks antiguos se mantienen mientras sean necesarios para garantizar que ningún archivo o dato histórico se rompa. **No tienen prioridad de desarrollo nueva**.
- Los datos del manager pertenecen a su propio formato/almacenamiento; los mazos y monedas del Card Game usan claves locales separadas. **No hay migración conceptual** de clubes, ligas, dinero de empresa o jugadores profesionales a los mazos.
- No se eliminará el historial del repositorio ni se asumirán cambios automáticos en los guardados existentes.

## Decisión de producto

El actual Rift Director es un **juego de cartas coleccionables de escuadras persistentes de cinco Riftborn**, tres carriles, una jungla, cuatro jugadas por ronda, mazos tácticos, objetivos y colección. Aethra, el Vínculo y la Convergencia ofrecen el marco narrativo. Las expansiones aportan cartas, personajes e historias nuevas; no incorporan un simulador de ligas ni una economía de organización de esports.

El juego principal se inicia en `index.html`; la parte histórica solo se abre desde `legacy-moba.html` o la rama de archivo.

## Política de mantenimiento

- Se aceptan **correcciones de seguridad, compatibilidad o preservación de datos** en la parte histórica si son necesarias.
- No se planifican nuevas ligas, IA de director deportivo, contratos, scouting, finanzas, temporadas, MOBA autónomo, balance de esports ni features de narración de eventos como parte del producto principal.
- Las nuevas decisiones, cambios, contribuciones y versiones deben referirse al juego de cartas y su `CARD_GAME_RULES.md`.

**Nota:** una rama de archivo en Git no impide físicamente nuevos commits ni protege el repositorio frente a modificaciones de un propietario. Su función es conservar una referencia documental y técnica estable; no equivale a una función de GitHub que bloquee escritura.
