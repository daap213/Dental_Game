/**
 * Paleta del juego, organizada en rampas de cuatro tonos.
 *
 * El estilo es «contorno + sombreado»: cada material tiene un contorno oscuro
 * (`out`) y tres tonos de relleno (`dark`, `mid`, `light`). Esa es toda la
 * disciplina que hace que un pixel art se vea cohesionado: ningún sprite
 * inventa colores, todos tiran de estas rampas.
 *
 * Vive en `data/` y no en `render/` a propósito: las entidades llevan `color`
 * como campo y `data/enemies.ts` asigna el color de cada enemigo, así que si
 * la paleta colgara de la capa de presentación el dominio tendría que importar
 * de ella. Aquí la consumen ambas capas sin invertir la dependencia.
 */

export interface Ramp {
  /** Contorno. Nunca negro puro: es el tono del material muy oscurecido. */
  out: string;
  dark: string;
  mid: string;
  light: string;
}

export const RAMPS = {
  // --- Materiales del escenario ---
  /**
   * Dientes, incluido el jugador. Los tonos van bien separados a propósito: con
   * un esmalte casi blanco de medio a claro, el volumen no se lee a 32 px.
   */
  enamel: { out: '#4a2c42', dark: '#9c8b98', mid: '#d5c9d1', light: '#fffdfa' },
  /** Encías. */
  gum: { out: '#4c0519', dark: '#9d174d', mid: '#be185d', light: '#f472b6' },
  /** Lengua: el suelo. */
  tongue: { out: '#831843', dark: '#9d174d', mid: '#db2777', light: '#f9a8d4' },
  /** Aparato dental, torretas, cañones. */
  metal: { out: '#1e293b', dark: '#475569', mid: '#94a3b8', light: '#e2e8f0' },
  /** Piel del dentista del fondo. */
  skin: { out: '#7f1d1d', dark: '#dc9a9a', mid: '#fca5a5', light: '#fee2e2' },
  /** Bata y mascarilla. */
  scrubs: { out: '#134e4a', dark: '#0f766e', mid: '#14b8a6', light: '#5eead4' },

  // --- Enemigos comunes ---
  bacteria: { out: '#064e3b', dark: '#047857', mid: '#10b981', light: '#6ee7b7' },
  plaque: { out: '#78350f', dark: '#b45309', mid: '#d97706', light: '#fbbf24' },
  candy: { out: '#7f1d1d', dark: '#b91c1c', mid: '#ef4444', light: '#fca5a5' },
  turret: { out: '#2e1065', dark: '#5b21b6', mid: '#7c3aed', light: '#c4b5fd' },
  rusher: { out: '#831843', dark: '#be185d', mid: '#f472b6', light: '#fbcfe8' },
  fiend: { out: '#701a3f', dark: '#be185d', mid: '#ec4899', light: '#f9a8d4' },
  acid: { out: '#365314', dark: '#4d7c0f', mid: '#a3e635', light: '#d9f99d' },
  grunt: { out: '#450a0a', dark: '#7f1d1d', mid: '#991b1b', light: '#dc2626' },

  // --- Jefes ---
  /** Piedra y armadura: sirve para rey, fantasma y tanque. */
  stone: { out: '#18181b', dark: '#3f3f46', mid: '#52525b', light: '#a1a1aa' },
  /** El guardián oculto, dorado. */
  warden: { out: '#713f12', dark: '#a16207', mid: '#facc15', light: '#fef08a' },
  /** La deidad de la caries, fase 2. */
  void: { out: '#020617', dark: '#1e1b4b', mid: '#312e81', light: '#818cf8' },

  // --- Proyectiles y efectos ---
  shotPlayer: { out: '#1e3a8a', dark: '#2563eb', mid: '#60a5fa', light: '#dbeafe' },
  shotEnemy: { out: '#064e3b', dark: '#047857', mid: '#059669', light: '#6ee7b7' },
  laser: { out: '#164e63', dark: '#0e7490', mid: '#06b6d4', light: '#cffafe' },
  wave: { out: '#4c1d95', dark: '#6d28d9', mid: '#a78bfa', light: '#ede9fe' },
  melee: { out: '#475569', dark: '#94a3b8', mid: '#e2e8f0', light: '#ffffff' },
  sludge: { out: '#831843', dark: '#db2777', mid: '#f9a8d4', light: '#fce7f3' },
} as const satisfies Record<string, Ramp>;

export type Material = keyof typeof RAMPS;
export type Tone = keyof Ramp;

/** Referencia a un tono concreto, p. ej. `'bacteria.mid'`. */
export type PaletteKey = `${Material & string}.${Tone}`;

/**
 * Resuelve una referencia de paleta a su color.
 *
 * Devuelve fucsia chillón ante una clave desconocida en lugar de fallar: un
 * sprite mal escrito se ve al instante y no tumba el frame. Los tests fijan que
 * ninguna clave usada por el juego caiga aquí.
 */
export const MISSING_COLOR = '#ff00ff';

export const tone = (key: PaletteKey): string => {
  const dot = key.indexOf('.');
  const ramp = RAMPS[key.slice(0, dot) as Material];
  if (!ramp) return MISSING_COLOR;
  return ramp[key.slice(dot + 1) as Tone] ?? MISSING_COLOR;
};

/** true si la clave existe de verdad. Lo usan los tests de sprites. */
export const isPaletteKey = (key: string): key is PaletteKey => {
  const dot = key.indexOf('.');
  if (dot < 0) return false;
  const ramp = RAMPS[key.slice(0, dot) as Material];
  return !!ramp && key.slice(dot + 1) in ramp;
};

/**
 * Colores planos por nombre de entidad.
 *
 * Se derivan de las rampas para que no puedan divergir. Las entidades guardan su
 * color como campo (`data/enemies.ts`, `weapons.ts`), y este es el tono base que
 * usan; el sombreado lo pone el sprite.
 */
export const COLORS = {
  bgTop: RAMPS.gum.light,
  bgBottom: RAMPS.gum.mid,
  bgProp: RAMPS.gum.dark,

  player: RAMPS.enamel.light,
  playerOutline: RAMPS.enamel.out,

  // Enemigos
  enemyBacteria: RAMPS.bacteria.mid,
  enemyPlaque: RAMPS.plaque.mid,
  enemyCandy: RAMPS.candy.mid,
  enemyTurret: RAMPS.turret.mid,
  enemyRusher: RAMPS.rusher.mid,
  enemyBoss: RAMPS.stone.dark,
  enemySugarFiend: RAMPS.fiend.mid,
  enemyAcidSpitter: RAMPS.acid.mid,
  enemyGrunt: RAMPS.grunt.mid,
  /** Jefe oculto (dorado). */
  enemyWarden: RAMPS.warden.mid,

  // Proyectiles
  projectilePlayer: RAMPS.shotPlayer.mid,
  projectileEnemy: RAMPS.shotEnemy.mid,
  projectileLaser: RAMPS.laser.mid,
  projectileWave: RAMPS.wave.mid,
  projectileMelee: RAMPS.melee.mid,
  projectileAcid: RAMPS.acid.mid,
  projectileSludge: RAMPS.sludge.mid,

  ground: RAMPS.tongue.mid,
  platform: RAMPS.enamel.light,
} as const;
