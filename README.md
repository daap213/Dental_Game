# Super Molar: Plaque Attack

**Super Molar: Plaque Attack** es un juego de plataformas y acción estilo "Run 'n Gun" con estética retro (pixel art procedural), desarrollado con React, TypeScript y HTML5 Canvas. El jugador controla un diente heroico que lucha contra bacterias, caries y enfermedades dentales dentro de una boca humana.

El proyecto destaca por no usar *assets* de imagen externos (todo se dibuja con código en tiempo real) y por generar efectos de sonido mediante la Web Audio API. Además, integra IA generativa (Gemini) para textos de ambientación y un sistema de progresión estilo Roguelike.

---

## 🚀 Características Principales

*   **Motor Gráfico Propio**: Renderizado 2D optimizado usando HTML5 Canvas API. Dientes, encías y enemigos generados proceduralmente.
*   **Audio Procedural**: Efectos de sonido (disparos, golpes, música ambiental, voces de jefes) sintetizados en tiempo real mediante Web Audio API.
*   **Sistema Roguelike**:
    *   **Perks**: Al cumplir logros (Puntaje, Bajas, Jefes), el jugador elige entre 3 mejoras aleatorias (Escudo, Daño, Velocidad, Vidas Extra, Inmunidad).
    *   **Estadísticas Acumulables**: Las mejoras persisten durante la partida y se visualizan en el HUD.
*   **Selección de Clase**: 4 tipos de dientes jugables (Molar, Incisivo, Canino, Premolar) con apariencias únicas.
*   **Armas Evolutivas**: 6 tipos de armas que suben hasta **Nivel 5**, cambiando drásticamente su comportamiento y potencia visual.
*   **Modos de Dificultad**: Fácil, Normal, Difícil y Leyenda (ajustan daño, vida y probabilidad de botín).
*   **Niveles Dinámicos**: 5 Fases con fondos y paletas de colores únicos (Garganta Sana, Gingivitis, Sarro, Infección Profunda, El Vacío).
*   **Jefe Oculto**: Un sexto jefe secreto ("El Guardián del Juicio") que aparece bajo condiciones de comportamiento específicas.
*   **Localización**: Soporte completo para **Español** e **Inglés**.
*   **IA Integrada**: Google Gemini API genera las misiones y los diagnósticos de Game Over con humor dental.

---

## 🛠 Tecnologías

*   **Frontend**: React 18, TypeScript, Tailwind CSS.
*   **Gráficos**: HTML5 Canvas API (Path2D, Gradients, Shadows).
*   **Audio**: Web Audio API (Osciladores, Filtros Biquad, Buffers de Ruido).
*   **IA**: Google GenAI SDK (`@google/genai`).
*   **Iconos**: Lucide React.
*   **Build Tool**: Vite.

---

## 📂 Estructura del Proyecto

El código sigue una arquitectura modular, separando la lógica pura del juego de la capa de UI de React.

```text
/
├── App.tsx                 # Componente Raíz. Gestor de Estado Global.
├── types.ts                # Interfaces (Player, Enemy, GameState, Perks, Difficulty).
├── constants.ts            # Configuración de balance (Física, Probabilidades, Colores).
├── utils/
│   ├── physics.ts          # Motor de colisiones (AABB).
│   └── locales.ts          # Diccionario de traducción (EN/ES).
├── services/
│   └── geminiService.ts    # Cliente de IA para textos narrativos.
├── game/                   # MÓDULOS DEL MOTOR (Lógica Pura)
│   ├── audio.ts            # Sintetizador de Audio (SFX, Música, Jefes).
│   ├── enemies.ts          # IA de Enemigos, Jefes y Renderizado.
│   ├── weapons.ts          # Física de Proyectiles, Armas y Power-ups.
│   ├── level.ts            # Generación de terreno y fondos dinámicos.
│   └── perks.ts            # Sistema de mejoras y RNG ponderado.
└── components/
    ├── GameCanvas.tsx      # EL MOTOR. Bucle principal (Game Loop) y lógica de disparadores.
    ├── GameHUD.tsx         # Interfaz (Vida, Escudo, Score, Stats) sobre el canvas.
    └── views/              # Pantallas de UI (React)
        ├── MainMenu.tsx    # Menú Principal, Selección de Personaje/Dificultad, Base de Datos.
        ├── PerkMenu.tsx    # Pantalla de selección de mejoras (Cartas).
        ├── GameOver.tsx    # Pantalla de derrota.
        └── Credits.tsx     # Créditos finales con arte procedural épico.
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