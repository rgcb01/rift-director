# Diseño del juego — Rift Director

**Estado:** visión de producto para el desarrollo. Las reglas aquí indicadas **no significan** que estén todas implementadas en Alpha 0.2. Consultar el [README](../README.md) para lo jugable y el [roadmap](../ROADMAP.md) para el orden de trabajo.

## Premisa

El usuario es **CEO, General Manager y Head Coach** de una organización profesional de esports en un mundo ficticio inspirado en los MOBA competitivos. El objetivo es dirigir una **empresa sostenible** y un equipo competitivo, no alcanzar un dinero objetivo ni ganar un torneo final.

- **Sandbox infinito:** no existe ganador definitivo, fecha final, trofeo obligatorio ni límite de patrimonio.
- **Única condición de derrota:** saldo de caja disponible en **$0**, tras resolver correctamente las obligaciones y cobros de cada fecha.
- **Mes como ciclo principal:** información, gestión, actividad deportiva, noticias, cierre económico y evolución del mundo.
- **Las probabilidades no son garantías:** buen scouting, estabilidad y entrenamiento mejoran el rendimiento a largo plazo, aunque también existan derrotas y rachas de suerte adversa.

## Bucle de juego

1. **RiftWire:** leer noticias, filtraciones, mercado, contratos, resultados y riesgos del ecosistema.
2. **Decidir como CEO:** presupuestos, sueldos, patrocinios, merch, personal, academia y compromisos de contenido o beneficencia.
3. **Dirigir como coach:** scouting, entrenamiento, scrims, descanso, selección de titulares y plan táctico.
4. **Ver el partido:** pulsar Jugar; los profesionales toman decisiones y ejecutan el mapa autónomamente mientras el marcador y los comentaristas lo narran.
5. **Evaluar:** revisar estadísticas y eventos, observar traits, mantener o vender profesionales, corregir la preparación.
6. **Cerrar el mes:** pagar gastos, cobrar ingresos, resolver cambios del ecosistema, pasar al siguiente ciclo.

### Dos ritmos diferentes

- **Meses competitivos:** preparar alineación y estrategia; disfrutar de partidos como espectador, sin microgestionar cada acción.
- **Offseason:** decisiones más concentradas de roster, contratos, staff, instituciones, sponsors y expansión de ligas.

## Cartas de jugadores: personas, no trofeos

Cada profesional tiene rol (TOP, JUN, MID, ADC, SUP), especialidades, atributos, hábitos, preferencias, contrato y trayectoria. Las cartas son una forma visual de acceder a los profesionales, **no un sistema de sobres o gacha**.

- **Habilidades:** mecánica, laning, macro, visión, teamfight, comunicación y adaptación.
- **Tendencias:** riesgo, agresividad, cooperación, liderazgo, nervios, especialización.
- **Traits descubiertos progresivamente:** shotcaller, impulsivo, conservador, individualista, clutch, etc. Los entrenamientos pueden mejorar destrezas o moldear hábitos, sin convertir a todos en 100/100.
- **Trade-offs:** una estrella cara puede vender merch pero empeorar la caja o encajar peor que un veterano; cinco jugadores excelentes pueden coordinarse mal.
- **Información imperfecta:** scouting, observación de partidos y analistas revelan patrones; nunca deben permitir conocer todo instantáneamente.

## Motor deportivo

El entrenador **prepara y dirige**, los jugadores **juegan**. El plan previo, atributos, traits, composición, moral, fatiga, meta, experiencia, ejecución y suerte afectan al desarrollo.

- **Primero el evento, después el texto.** La narración se genera únicamente de eventos calculados y registrados.
- **Coherencia fuerte:** los asesinados están muertos hasta reaparecer; objetivos solo cuando están disponibles; las torres y nexo dependen de estructuras previas; Smite solo lo usa quien realmente lo lleva.
- **Roles obligatorios:** no atribuir el Smite del jungla a un MID por error; los eventos deben reflejar la participación real.
- **Una única simulación:** mirar a velocidad 1×, 5× o saltar al resultado no debe alterar el resultado al partir del mismo estado y semilla.
- **Historias deportivas:** remontadas, robos de Barón, jugadas extraordinarias y exterminios deben ser posibles, pero contextualizados y no arbitrarios.

## Economía y reputación

- **Obligaciones reales:** jugadores, entrenadores, analistas, operación, viajes, marketing, instalaciones.
- **Ingresos diversificados:** patrocinios, merchandising, acuerdos de ligas, contenido, premios y transferencias; los premios son inciertos.
- **Tiempo limitado:** scrims, recuperación, promociones, streams y eventos benéficos compiten por el mismo calendario de profesionales.
- **No existe estrategia universal:** conservar caja, invertir en un rookie o contratar estrellas pueden ser correctos según el estado del club.
- **Un campeón puede quebrar. Un club sin títulos puede prosperar.**

## Mundo vivo y narrativa procedural

El mundo incluye clubs rivales con presupuestos, objetivos, contratos y carreras autónomas; genera rumores, noticias, retiros, fichajes, nuevos equipos, cambios de reglamento y crisis.

**Causalidad cruzada, no titulares decorativos:** si una estrella llega a una liga, cambia su atractivo, puede subir la audiencia y los patrocinios de sus rivales y al mismo tiempo elevar la dificultad competitiva. Un escándalo comercial puede ocasionar multas y pérdida de sponsors si hubo una causa anterior en el estado del mundo.

**Noticias confiables vs rumores:** distinguir hechos, filtraciones, proyecciones y desmentidos. No crear acusaciones ficticias de conductas ilícitas contra personas u organizaciones reales como si fueran noticias verdaderas.

## Universo y arte

- **Base oficial:** equipos, jugadores, marcas y ligas originales con estética reconocible de esports.
- **Futuros paquetes de datos:** opcionales, modulables y sujetos a derechos apropiados.
- **Visuales:** escudos SVG, retratos vectoriales estilizados, cartas e interfaz 2D ligera para navegador y dispositivos de gama baja.
- **Sin afiliación:** el juego es independiente de Riot Games y de los clubes profesionales existentes.

## Definición de diversión

El usuario debería poder explicar por qué escogió un roster, emocionarse viendo a cinco profesionales ejecutar su plan y reconocer el coste de oportunidad de cada compromiso comercial. A lo largo de veinte temporadas debe existir una **historia consistente** que no dependa únicamente de sus resultados.

_Nota de producto: las mecánicas de draft, IA detallada, historia profunda y otras reglas descritas aquí requieren todavía diseño e implementación adicional._
