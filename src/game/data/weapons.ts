import type { WeaponType } from '../../types';

/**
 * Escalado por nivel de cada arma (1-5). Estos números eran literales sueltos
 * dentro de `spawnProjectile`, y la cadencia vivía aparte, incrustada en el
 * bloque de disparo de GameCanvas. Aquí quedan como única fuente de verdad.
 *
 * Los tests de `weapons.data.test.ts` fijan estos valores: son el criterio de
 * aceptación del balance cuando el motor se porte a Phaser.
 */

export interface WeaponStats {
  /** Daño por proyectil. */
  damage: number;
  /** Cadencia en frames entre disparos (menor = más rápido). */
  cooldownFrames: number;
  /** Cuántos proyectiles genera un disparo. */
  projectileCount: number;
}

export const MAX_LEVEL = 5;

const clampLevel = (level: number) => Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL);

const BASE_OFFSET = 5;
const WIDE_OFFSET = BASE_OFFSET * 2.5;

/**
 * Desplazamiento perpendicular de cada bala del arma normal, en el orden en
 * que se generan. El abanico se abre a partir del nivel 3.
 *
 * Es la **única** descripción del patrón: el número de proyectiles es la
 * longitud de esta lista y `spawnProjectile` la recorre para colocarlos. Antes
 * el conteo y la colocación estaban codificados por separado y podían divergir.
 */
export const normalOffsets = (level: number): readonly number[] => {
  if (level < 3) return [0];
  if (level === 3) return [-BASE_OFFSET, BASE_OFFSET];
  if (level === 4) return [-BASE_OFFSET, BASE_OFFSET, 0];
  return [-BASE_OFFSET, BASE_OFFSET, 0, -WIDE_OFFSET, WIDE_OFFSET];
};

/**
 * Desplazamiento de cada onda del enjuague bucal. La central siempre está;
 * en el nivel 3 aparece una lateral y en el 5 la opuesta.
 * El signo indica de qué lado se coloca respecto a la dirección de disparo.
 */
export const mouthwashOffsets = (level: number): readonly number[] => {
  if (level < 3) return [0];
  if (level < 5) return [0, -1];
  return [0, -1, 1];
};

export const NORMAL = {
  damage: (l: number) => 8 + l * 2,
  offsets: normalOffsets,
  speed: 18,
  w: 10,
  h: 6,
  lifeTime: 1.0,
} as const;

export const SPREAD = {
  damage: (l: number) => 6 + l,
  count: (l: number) => 3 + (l - 1) * 2,
  spreadFactor: (l: number) => (l >= 4 ? 0.8 : l === 3 ? 1.0 : 1.5),
  speed: 16,
  size: 8,
  lifeTime: 1.0,
} as const;

export const LASER = {
  damage: (l: number) => 15 + (l - 1) * 8,
  width: (l: number) => 4 + (l - 1) * 4,
  speed: 28,
  lifeTime: 0.8,
} as const;

export const MOUTHWASH = {
  damage: (l: number) => 20 + (l - 1) * 12,
  offsets: mouthwashOffsets,
  speed: (l: number) => 10 + l * 2,
  size: (l: number) => 16 + l * 5,
  /** Las ondas laterales usan un tamaño propio, más pequeño. */
  sideSize: (l: number) => 20 + l * 2,
  sideOffset: 20,
  lifeTime: 2.0,
} as const;

export const FLOSS = {
  damage: (l: number) => 25 + (l - 1) * 15,
  range: (l: number) => 100 + (l - 1) * 60,
  thickness: (l: number) => 20 + (l - 1) * 10,
  lifeTime: 0.15,
} as const;

export const TOOTHBRUSH = {
  damage: (l: number) => 35 + (l - 1) * 20,
  size: (l: number) => 60 + (l - 1) * 35,
  lifeTime: 0.2,
} as const;

/** Proyectil genérico de enemigo (todos los enemigos comunes disparan esto). */
export const ENEMY_BULLET = {
  damage: 10,
  speed: 9,
  size: 10,
  lifeTime: 2,
} as const;

/**
 * Umbral de daño a partir del cual una bala enemiga persigue al jugador.
 * Lo usa el jefe oculto, que dispara balas normales de daño 25 en vez de
 * llevar su propia lógica de guiado.
 */
export const HOMING_DAMAGE_THRESHOLD = 20;

const COOLDOWN_FRAMES: Record<WeaponType, (level: number) => number> = {
  normal: (l) => (l >= 2 ? 6 : 10),
  spread: () => 20,
  laser: () => 20,
  mouthwash: (l) => (l >= 2 ? 22 : 30),
  floss: () => 18,
  toothbrush: (l) => (l >= 2 ? 15 : 20),
};

export const getFireCooldown = (weapon: WeaponType, level: number): number =>
  (COOLDOWN_FRAMES[weapon] ?? (() => 10))(clampLevel(level));

/** Resumen por arma y nivel; lo consumen la Base de Datos del menú y los tests. */
export const getWeaponStats = (weapon: WeaponType, rawLevel: number): WeaponStats => {
  const level = clampLevel(rawLevel);
  const cooldownFrames = getFireCooldown(weapon, level);

  switch (weapon) {
    case 'spread':
      return { damage: SPREAD.damage(level), cooldownFrames, projectileCount: SPREAD.count(level) };
    case 'laser':
      return { damage: LASER.damage(level), cooldownFrames, projectileCount: 1 };
    case 'mouthwash':
      return {
        damage: MOUTHWASH.damage(level),
        cooldownFrames,
        projectileCount: MOUTHWASH.offsets(level).length,
      };
    case 'floss':
      return { damage: FLOSS.damage(level), cooldownFrames, projectileCount: 1 };
    case 'toothbrush':
      return { damage: TOOTHBRUSH.damage(level), cooldownFrames, projectileCount: 1 };
    case 'normal':
    default:
      return {
        damage: NORMAL.damage(level),
        cooldownFrames,
        projectileCount: NORMAL.offsets(level).length,
      };
  }
};
