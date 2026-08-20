# Super Molar: Plaque Attack

**Super Molar: Plaque Attack** es un juego de plataformas y acción estilo "Run 'n Gun" con estética retro (pixel art procedural), desarrollado con React, TypeScript y HTML5 Canvas. El jugador controla un diente heroico que lucha contra bacterias, caries y enfermedades dentales dentro de una boca humana.

El proyecto destaca por no usar *assets* de imagen externos (todo se dibuja con código en tiempo real), por generar efectos de sonido mediante la Web Audio API y por no hacer **ninguna** petición de red: el juego funciona entero sin conexión. Sobre eso monta un sistema de progresión estilo Roguelike.

---

## 🚀 Características Principales

*   **Motor Gráfico Propio**: Renderizado 2D optimizado usando HTML5 Canvas API. Dientes, encías y enemigos generados proceduralmente.
*   **Audio Procedural**: Efectos de sonido (disparos, golpes, música ambiental, voces de jefes) sintetizados en tiempo real mediante Web Audio API.
*   **Sistema Roguelike**:
    *   **Perks**: Al cumplir logros (Puntaje, Bajas, Jefes), el jugador elige entre 3 mejoras aleatorias (Escudo, Daño, Velocidad, Vidas Extra, Inmunidad).
    *   **Estadísticas Acumulables**: Las mejoras persisten durante la partida y se visualizan en el HUD.
*   **Selección de Clase**: 4 tipos de dientes jugables (Molar, Incisivo, Canino, Premolar) con apariencias únicas.
*   **Armas Evolutivas**: 8 tipos de armas que suben hasta **Nivel 5**, cambiando drásticamente su comportamiento y potencia visual.
*   **Modos de Dificultad**: Fácil, Normal, Difícil y Leyenda (ajustan daño, vida y probabilidad de botín).
*   **Niveles Dinámicos**: 5 Fases con fondos y paletas de colores únicos (Garganta Sana, Gingivitis, Sarro, Infección Profunda, El Vacío).
*   **Jefe Oculto**: Un sexto jefe secreto ("El Guardián del Juicio") que aparece bajo condiciones de comportamiento específicas.
*   **Localización**: Soporte completo para **Español** e **Inglés**.
*   **Sin telemetría**: ni analítica, ni cookies, ni almacenamiento, ni llamadas a terceros.

---

## 🛠 Tecnologías

*   **Frontend**: React 19, TypeScript, Tailwind CSS v4.
*   **Gráficos**: HTML5 Canvas API (Path2D, Gradients, Shadows).
*   **Audio**: Web Audio API (Osciladores, Filtros Biquad, Buffers de Ruido).
*   **Iconos**: Lucide React.
*   **Build Tool**: Vite 7.
*   **Gestor de paquetes**: pnpm.

---

## 🚀 Desarrollo

Requiere **Node >= 20.19** y **pnpm** (la versión exacta está fijada en el campo `packageManager` de `package.json`).

```bash
pnpm install
pnpm dev           # Servidor de desarrollo en http://localhost:3000
pnpm build         # Build de producción en dist/
pnpm preview       # Sirve el build ya generado
pnpm typecheck     # Comprobación de tipos
pnpm test          # Suite de vitest
```

No hace falta ninguna variable de entorno ni clave de API: el juego no habla con ningún servicio.

---

## 📂 Estructura del Proyecto

El código sigue una arquitectura modular, separando la lógica pura del juego de la capa de UI de React.

Las capas solo dependen hacia abajo: `data/` (tablas de ajuste puras) ← `game/` (simulación) y
`render/` (dibujo). Ninguna de las dos importa React.

```text
src/
├── App.tsx                 # Componente Raíz. Máquina de GameState y configuración de partida.
├── types.ts                # Interfaces (Player, Enemy, GameState, Perks, Difficulty).
├── i18n/                   # Diccionarios tipados EN/ES (`en.ts` es la referencia).
├── game/                   # MOTOR (lógica pura, sin React)
│   ├── data/               # Todo el balance: física, armas, enemigos, fases, dificultad.
│   ├── world.ts            # `World`: el estado mutable completo de la simulación.
│   ├── loop.ts             # Paso fijo: cuánta simulación recibe cada frame.
│   ├── enemies.ts          # IA de enemigos y máquinas de estado de los jefes.
│   ├── weapons.ts          # Aparición de proyectiles y botín.
│   ├── projectiles.ts      # Paso de proyectiles (atravesar, anclaje, barrido).
│   ├── level.ts            # Generación procedural de plataformas.
│   ├── perks.ts            # Mejoras y RNG ponderado.
│   ├── briefings.ts        # Informes de misión fijos del menú.
│   ├── gameover.ts         # Diagnóstico de derrota según puntuación.
│   ├── audio.ts            # Síntesis de audio (SFX, música, voces de jefe).
│   └── render/             # DIBUJO (Canvas 2D puro; nada fuera de aquí dibuja)
└── components/
    ├── GameCanvas.tsx      # Bucle principal, entrada, física y cámara.
    ├── GameHUD.tsx         # Interfaz sobre el canvas (solo lee `HudSnapshot`).
    └── views/              # Pantallas React superpuestas
        ├── MainMenu.tsx    # Menú, clase, dificultad, equipamiento.
        ├── IntelDatabase.tsx # Base de datos táctica (pestañas).
        ├── PerkMenu.tsx    # Selección de mejoras.
        ├── GameOver.tsx    # Pantalla de derrota.
        └── Credits.tsx     # Créditos con escena procedural.
```

---

## 🧩 Mecánicas de Juego

### 1. Sistema de Combate
*   **Disparo Multidireccional**: Soporte para Mouse (360°) o Teclado (8 direcciones).
*   **Loadouts**: Opción de empezar con todas las armas (RNG) o especializarse en una sola.
*   **Escudo de Pasta Dental**: Barra de vida secundaria (Cyan) que se regenera si no recibes daño.
*   **Vidas Extra**: Mecánica de revivir instantáneamente al morir si se poseen vidas acumuladas.

### 2. Arsenal (Nivel 1-5)
*   **Normal**: Taladro estándar. A nivel 5 dispara 4 balas simultáneas.
*   **Spread**: Escopeta. A nivel 5 dispara 11 proyectiles.
*   **Láser**: Rayo perforante. A nivel 5 es un haz masivo de alta energía.
*   **Mouthwash (Onda)**: Atraviesa paredes. A nivel 5 dispara ondas helicoidales en 3 direcciones.
*   **Floss (Látigo)**: Melee rápido. A nivel 5 tiene alcance y grosor masivos.
*   **Toothbrush (Espada)**: Golpe pesado. A nivel 5 cubre casi media pantalla.
*   **Bow (Arco de hilo)**: El mayor golpe único a distancia, a cambio de cadencia lenta.
*   **Scythe (Guadaña de raspador)**: El barrido más amplio y la cadencia más lenta de todas.

### 3. Jefes y Secretos
Cada jefe tiene IA única y fases de combate.
1.  **Rey Caries**: Saltos y ondas.
2.  **Fantasma de Placa**: Teletransporte.
3.  **Tanque de Sarro**: Morteros y fuego rápido.
4.  **General Gingivitis**: Invocación y Lluvia de Fuego.
5.  **Deidad del Deterioro**: Bullet Hell y glitches.
6.  **El Guardián del Juicio (OCULTO)**: Aparece si:
    *   *Pereza*: No te mueves en 2 min.
    *   *Estancamiento*: No avanzas en el nivel por 3 min.
    *   *Ira*: Matas 30 enemigos en < 2 min.
    *   *Prisa*: Matas a un jefe en < 60 seg.

---

## 🕹 Controles

### PC (Mouse & Teclado)
*   **WASD / Flechas**: Moverse.
*   **Espacio**: Saltar (Doble salto).
*   **Mouse**: Apuntar y Disparar (Click Izq).
*   **Click Der / Shift**: Dash (Esquivar).
*   **ESC**: Pausa.

### PC (Solo Teclado)
*   **Flechas**: Moverse.
*   **W / Arriba**: Apuntar arriba (mientras corres).
*   **F / K**: Disparar.
*   **L / Shift**: Dash.

### Móvil (Touch)
*   **D-Pad Virtual**: Movimiento y apuntado (Arriba/Abajo para ángulo).
*   **Botones**: Disparar, Saltar, Dash.

---

## ⚙️ Balance y Dificultad

*   **Fácil**: +25% Vida, +15% Daño, 25% Probabilidad de objetos.
*   **Normal**: Estándar (15% Probabilidad de objetos).
*   **Difícil**: -2% Daño, 8% Probabilidad de objetos.
*   **Leyenda**: +5% Daño Recibido, -5% Daño Realizado, 5% Probabilidad de objetos.