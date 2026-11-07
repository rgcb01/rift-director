# Rift Director — Alpha 0.2

Simulador **ficticio e independiente** de gestión de una organización profesional de esports. Juego web en español, responsive, sin frameworks, sin backend y sin dependencias externas.

## Jugar

**GitHub Pages**: una vez configurado, el sitio se publicará en `https://rgcb01.github.io/rift-director/`.

En local, abre `index.html` o inicia un servidor estático: `python -m http.server 8080`.

- Crea tu organización, gestiona contratos, personal, salarios, patrocinios y merchandising.
- Distribuye actividades mensuales entre scrims, entrenamiento, comunidad, contenido y scouting.
- Explora cartas de profesionales con habilidades y traits gradualmente descubiertos.
- Prepara tu alineación y ve los partidos narrados en tiempo simulado.
- Avanza los meses, sigue el mercado, la prensa y el offseason.
- No hay un ganador final: sobrevive financieramente.

## Estructura

| Archivo | Función |
|---|---|
| `index.html` | Entrada del juego, apta para GitHub Pages |
| `styles.css` | Interfaz responsive y estilos |
| `game.js` | Mundo, jugadores, economía, partidos, eventos y guardados |

## Publicar en GitHub Pages

1. Abre **Settings → Pages** dentro del repositorio.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Elige **main**, carpeta **/(root)**, y guarda.
4. GitHub generará el sitio. La URL será `https://rgcb01.github.io/rift-director/` si no tienes dominio personalizado.

**Atención**: el repositorio actualmente es **privado**. GitHub Free requiere que un repositorio sea público para usar Pages; GitHub Pro/Team permiten Pages desde repositorios privados, aunque el sitio resultante será público. Cambia la visibilidad solo si lo decides tú. No hay claves ni datos personales en esta versión del juego.

## Guardados

El juego usa almacenamiento local del navegador, de modo que cada dispositivo o navegador conserva su propia partida. No hay sincronización de nube. Exporta tus partidas periódicamente para respaldarlas o trasladarlas a otro dispositivo.

## Limitaciones de Alpha 0.2

- Sin draft completo de campeones y bans.
- Partidos con simulación simplificada, no un MOBA 1:1.
- Dos regiones, no un ecosistema mundial definitivo.
- Noticias mediante plantillas basadas en eventos, sin IA generativa externa.
- Economía, progresión, mercado e IA rivales requieren mayor calibración.
- Identidades y marcas ficticias; ninguna afiliación con Riot Games.

## Desarrollo

El código está en JavaScript puro para simplificar el despliegue. Próximo paso: separar el motor de simulación en módulos, añadir pruebas deterministas y desarrollar draft y lógica avanzada de roles/traits. Los tres archivos de la raíz son suficientes para ejecutar el juego.
