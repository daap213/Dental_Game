# Super Molar: Plaque Attack

**Super Molar: Plaque Attack** es un juego de plataformas y acción estilo "Run 'n Gun" con estética retro (pixel art procedural), desarrollado con React, TypeScript y HTML5 Canvas. El jugador controla un diente heroico que lucha contra bacterias, caries y enfermedades dentales dentro de una boca humana.

El proyecto destaca por no usar *assets* de imagen externos (todo se dibuja con código) y por generar efectos de sonido en tiempo real mediante la Web Audio API. Además, integra IA generativa (Gemini) para textos de ambientación.

---

## 🛠 Tecnologías

*   **Frontend**: React 18, TypeScript, Tailwind CSS.
*   **Motor Gráfico**: HTML5 Canvas API (Renderizado 2D).
*   **Audio**: Web Audio API (Síntesis de sonido en tiempo real).
*   **IA**: Google Gemini API (Generación de textos de misión y Game Over).
*   **Iconos**: Lucide React.

---

## 📂 Estructura del Proyecto

El código ha sido refactorizado en una arquitectura modular para separar la lógica del juego, la interfaz de usuario (UI) y el motor de renderizado.

```text
/
├── App.tsx                 # Componente Raíz. Maneja el estado global (Menú, Juego, Pausa).
├── index.tsx               # Punto de entrada de React.
├── types.ts                # Definiciones de tipos e interfaces TypeScript.
├── constants.ts            # Variables de configuración y balance del juego.
├── metadata.json           # Metadatos de la aplicación.
├── services/
│   └── geminiService.ts    # Servicio para interactuar con la API de Google Gemini.
├── utils/
│   └── physics.ts          # Utilidades de colisiones (AABB).
├── game/                   # MÓDULOS DE LÓGICA DE JUEGO (Sin dependencia de React)
│   ├── audio.ts            # Motor de audio (AudioManager, osciladores).
│   ├── enemies.ts          # IA, spawneo y renderizado de enemigos/jefes.
│   ├── weapons.ts          # Lógica de proyectiles, armas y power-ups.
│   └── level.ts            # Generación procedimental de niveles y fondos.
└── components/
    ├── GameCanvas.tsx      # EL MOTOR. Bucle principal (Game Loop), estado mutable y input.
    ├── GameHUD.tsx         # Interfaz (HUD) sobre el canvas (Vida, Score, Controles Móviles).
    └── views/              # Vistas de UI
        ├── MainMenu.tsx    # Menú principal y Base de Datos de Información.
        ├── PauseMenu.tsx   # Menú de pausa.
        └── GameOver.tsx    # Pantalla de derrota.
```

---

## 🧩 Arquitectura y Clases Principales

### 1. El Motor (`GameCanvas.tsx`)
No es una clase, sino un componente funcional que actúa como el núcleo.
*   **Game Loop**: Utiliza `requestAnimationFrame` para mantener 60 FPS.
*   **State Management**: Usa `useRef` (`entities`) para manejar el estado del juego (posición del jugador, arrays de enemigos) de forma mutable para evitar re-renderizados de React costosos en cada frame.
*   **Update vs Draw**: Separa la lógica (`update()`) del renderizado (`draw()`).

### 2. Interfaces Principales (`types.ts`)
*   **`Entity`**: Clase base para cualquier objeto en juego (`x`, `y`, `vx`, `vy`).
*   **`Player`**: Extiende `Entity`. Contiene `weaponLevels`, `jumpCount`, `dashTimer`.
*   **`Enemy`**: Extiende `Entity`. Contiene `subType` (tipo de enemigo), `bossState` (máquina de estados para IA de jefes).
*   **`Projectile`**: Balas y ataques. Contiene `hitIds` para lógica de perforación (evitar daño múltiple al mismo enemigo).

### 3. Gestor de Audio (`game/audio.ts`)
Clase `AudioManager`.
*   **Singleton**: Se instancia una vez por sesión.
*   **Métodos**:
    *   `startAmbient()`: Genera ruido rosa y osciladores de baja frecuencia para ambiente dental.
    *   `playWeaponSound(type)`: Sintetiza sonidos "pew pew" retro usando ondas cuadradas y de sierra.
    *   `playBossIntro(variant)`: Melodías procedimentales únicas para cada jefe.

---

## ⚙️ Módulos del Juego (`game/`)

### `enemies.ts`
Maneja la lógica de los enemigos.
*   **`spawnEnemy`**: Decide qué enemigo crear basado en probabilidad y nivel.
*   **`updateEnemyAI`**: Máquina de estados. Define cómo se mueven las bacterias, torretas y jefes.
*   **`drawEnemies`**: Contiene las funciones de dibujo procedural (`drawBacteria`, `drawBoss`, etc.).
    *   *Detalle*: Los enemigos se dibujan con trazados de Canvas (`ctx.bezierCurveTo`), no son sprites estáticos.

### `weapons.ts`
Maneja el combate.
*   **`spawnProjectile`**: Calcula vectores normalizados para disparar en 360 grados (Mouse) o 8 direcciones (Teclado).
*   **`drawHeldWeapon`**: Dibuja el arma sobre el jugador, rotándola hacia el cursor.
*   **`spawnPowerUp` / `drawPowerUp`**: Lógica de caída de ítems (Cajas con alas).

### `level.ts`
Maneja el entorno.
*   **`generateLevel`**: Algoritmo simple que coloca plataformas (suelo de lengua y brackets flotantes) aleatoriamente. Asegura una "Safe Zone" al inicio.
*   **`drawBackground`**: Renderiza el interior de la boca, la úvula y la cara del dentista en paralaje.
*   **`drawTransition`**: Animación de mandíbulas cerrándose con dientes anatómicamente correctos.

---

## 🎮 Funciones Clave

### En `GameCanvas.tsx`
*   **`update(dt)`**: Ejecuta la física, colisiones, timers y movimiento de cámara.
*   **`draw(ctx)`**: Limpia el canvas y llama a las funciones de dibujo de los módulos `game/`.
*   **`handleKeyDown` / `handleMouseDown`**: Gestiona el input. Soporta cambio dinámico entre `Mouse` y `Keyboard`.

### En `services/geminiService.ts`
*   **`generateBriefing()`**: Solicita a Gemini una misión corta con juegos de palabras dentales.
*   **`generateGameOverMessage(score, cause)`**: Genera un diagnóstico sarcástico al perder.

---

## ⚖️ Configuración y Balance (`constants.ts`)

Aquí se ajustan las variables mágicas del juego para "Game Feel".

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `GRAVITY` | `0.65` | Gravedad fuerte para saltos rápidos. |
| `PLAYER_SPEED` | `7.5` | Velocidad de movimiento horizontal. |
| `PLAYER_JUMP` | `-14` | Fuerza de salto (negativo es hacia arriba). |
| `PLAYER_DASH_SPEED` | `22` | Velocidad del impulso. |
| `MAX_WEAPON_LEVEL` | `3` | Nivel máximo de mejora de armas. |

### Colores (`COLORS`)
Define la paleta de colores centralizada (basada en Tailwind Colors) para mantener consistencia estética (Rosas para encías, Blancos para dientes, Verdes/Rojos para enemigos).

---

## 🕹 Controles

El juego soporta dos modos de entrada, configurables desde el Menú Principal:

1.  **Mouse Aim (Recomendado)**:
    *   `A` / `D`: Moverse.
    *   `Espacio`: Saltar (Doble salto disponible).
    *   `Mouse`: Apuntar en 360°.
    *   `Click Izquierdo`: Disparar.
    *   `Click Derecho` / `Shift`: Dash (Esquivar).

2.  **Keyboard Only**:
    *   `Flechas` / `WASD`: Moverse.
    *   `W` / `Arriba`: Apuntar hacia arriba (sin saltar).
    *   `Espacio`: Saltar.
    *   `F` o `K`: Disparar (Dispara hacia donde miras o hacia arriba si mantienes W).
    *   `L` o `Shift`: Dash.

---

## 🤖 Integración con IA (Gemini)

El juego utiliza la SDK `@google/genai`.
*   Se inicializa en `services/geminiService.ts` usando `process.env.API_KEY`.
*   **No bloqueante**: Si la API falla o no hay key, el juego usa textos por defecto ("Mission: Scrub all bacteria").
*   **Prompting**: Se configuran `systemInstruction` (implícito en el prompt) y `maxOutputTokens` para asegurar respuestas breves y temáticas.
