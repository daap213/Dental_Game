# Super Molar: Plaque Attack

**Super Molar: Plaque Attack** es un juego de plataformas y acción estilo "Run 'n Gun" con estética retro (pixel art procedural), desarrollado con React, TypeScript y HTML5 Canvas. El jugador controla un diente heroico que lucha contra bacterias, caries y enfermedades dentales dentro de una boca humana.

El proyecto destaca por no usar *assets* de imagen externos (todo se dibuja con código en tiempo real) y por generar efectos de sonido mediante la Web Audio API. Además, integra IA generativa (Gemini) para textos de ambientación y un sistema de progresión estilo Roguelike.

---

## 🚀 Características Principales

*   **Motor Gráfico Propio**: Renderizado 2D optimizado usando HTML5 Canvas API sin sprites pre-renderizados.
*   **Audio Procedural**: Efectos de sonido (disparos, golpes, música ambiental, voces de jefes) sintetizados en tiempo real.
*   **Sistema Roguelike**:
    *   **Perks**: Al cumplir logros (Puntaje, Bajas, Jefes), el jugador elige entre 3 mejoras aleatorias (Escudo, Daño, Velocidad, Vidas Extra).
    *   **Estadísticas Acumulables**: Las mejoras persisten y se visualizan en el HUD.
*   **Selección de Clase**: 4 tipos de dientes jugables (Molar, Incisivo, Canino, Premolar) con apariencias únicas.
*   **Armas Evolutivas**: 6 tipos de armas que suben hasta **Nivel 5**, cambiando su comportamiento y potencia visualmente.
*   **Niveles Dinámicos**: 5 Fases con fondos y paletas de colores únicos (Garganta Sana, Gingivitis, Sarro, Infección Profunda, El Vacío).
*   **Localización**: Soporte completo para **Español** e **Inglés**.
*   **IA Integrada**: Google Gemini API genera las misiones y los diagnósticos de Game Over con humor dental.

---

## 🛠 Tecnologías

*   **Frontend**: React 18, TypeScript, Tailwind CSS.
*   **Gráficos**: HTML5 Canvas API.
*   **Audio**: Web Audio API (Osciladores, Filtros Biquad, Buffers de Ruido).
*   **IA**: Google GenAI SDK (`@google/genai`).
*   **Iconos**: Lucide React.
*   **Build Tool**: Vite (implícito en la estructura).

---

## 📂 Estructura del Proyecto

El código sigue una arquitectura modular, separando la lógica pura del juego de la capa de UI de React.

```text
/
├── App.tsx                 # Componente Raíz. Gestor de Estado Global (Menú, Juego, Pausa, Idioma).
├── types.ts                # Definiciones de tipos (Player, Enemy, GameState, Perks).
├── constants.ts            # Configuración de balance (Gravedad, Velocidad, Daño, Probabilidades).
├── utils/
│   ├── physics.ts          # Motor de colisiones (AABB).
│   └── locales.ts          # Diccionario de traducción (EN/ES).
├── services/
│   └── geminiService.ts    # Cliente de IA para textos narrativos.
├── game/                   # MÓDULOS DEL MOTOR (Lógica Pura)
│   ├── audio.ts            # Sintetizador de Audio (SFX y Ambiente).
│   ├── enemies.ts          # IA de Enemigos, Máquinas de Estado de Jefes y Renderizado.
│   ├── weapons.ts          # Física de Proyectiles, Armas y Power-ups.
│   ├── level.ts            # Generación procedimental de terreno y fondos dinámicos.
│   └── perks.ts            # Lógica de mejoras, pesos de probabilidad y aplicación de stats.
└── components/
    ├── GameCanvas.tsx      # EL MOTOR. Bucle principal (Game Loop), Input y Renderizado.
    ├── GameHUD.tsx         # Interfaz (Vida, Escudo, Score, Stats) sobre el canvas.
    └── views/              # Pantallas de UI (React)
        ├── MainMenu.tsx    # Menú Principal, Selección de Personaje/Dificultad, Base de Datos.
        ├── PerkMenu.tsx    # Pantalla de selección de mejoras (Cartas).
        ├── GameOver.tsx    # Pantalla de derrota.
        └── Credits.tsx     # Créditos finales con arte procedural.
```

---

## 🧩 Mecánicas de Juego

### 1. Sistema de Combate
*   **Disparo Multidireccional**: Soporte para Mouse (360°) o Teclado (8 direcciones).
*   **Loadouts**: El jugador puede elegir empezar con un arma específica o permitir que todas aparezcan (RNG).
*   **Escudo de Pasta Dental**: Una segunda barra de vida azul que se regenera con el tiempo si no se recibe daño.

### 2. Enemigos y Jefes
*   **IA de Jefes**: Máquinas de estado complejas con múltiples fases.
    *   *Nivel 1 (Rey Caries)*: Saltos y ondas de choque.
    *   *Nivel 3 (Tanque)*: Disparo de morteros y andanadas rápidas.
    *   *Nivel 4 (General)*: Invocación de esbirros, Lluvia de Fuego y Láseres Grid.
    *   *Nivel 5 (Deidad)*: Patrones "Bullet Hell", Novas espirales y glitches visuales.

### 3. Progresión (Perks)
*   **Detonantes**: Se activa la selección de mejoras al alcanzar hitos de puntuación (cada 8,000 pts), bajas (cada 10-20 enemigos) o matar jefes.
*   **Probabilidad Ponderada**: Las mejoras legendarias (Vida Extra, Inmunidad) tienen menor probabilidad de aparecer que las comunes (Salud, Daño).

---

## 🎨 Arte Procedural

Todo el arte se genera mediante código en `game/enemies.ts`, `game/level.ts`, etc.
*   **Fondo**: Renderiza una garganta con profundidad, dientes molares realistas y la cara de un dentista observando desde fuera (con efecto de paralaje).
*   **Transiciones**: Animación de mandíbulas cerrándose con dientes anatómicamente correctos (incisivos, caninos, molares) y efecto de sonido de mordida.
*   **Personajes**: Dibujo vectorial mediante `CanvasRenderingContext2D` con gradientes y sombras para simular volumen.

---

## 🕹 Controles

### Mouse Aim (PC)
*   **WASD / Flechas**: Moverse.
*   **Espacio**: Saltar (Doble salto).
*   **Mouse**: Apuntar.
*   **Click Izq**: Disparar.
*   **Click Der / Shift**: Dash.

### Teclado (PC)
*   **Flechas**: Moverse.
*   **W / Arriba**: Apuntar arriba.
*   **Espacio**: Saltar.
*   **F / K**: Disparar.
*   **L / Shift**: Dash.

### Móvil (Touch)
*   **D-Pad Virtual**: Movimiento y apuntado (Arriba/Abajo para ángulo).
*   **Botones**: Disparar, Saltar, Dash.

---

## ⚙️ Configuración y Balance

El archivo `constants.ts` permite ajustar rápidamente la sensación del juego:
*   `GRAVITY`: 0.65 (Salto "pesado" pero responsivo).
*   `PLAYER_SPEED`: 7.5 (Ritmo rápido).
*   `MAX_WEAPON_LEVEL`: 5.
*   `DIFFICULTY_CONFIG`: Ajusta multiplicadores de daño, vida y tasas de dropeo según la dificultad (Fácil, Normal, Difícil, Leyenda).