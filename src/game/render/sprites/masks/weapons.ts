import type { Projectile, WeaponType } from '../../../../types';
import type { Material } from '../../../data/palette';
import { blank, ellipse, rect, merge, subtract, stamp, annulus, fit } from './shapes';

/**
 * Arte de proyectiles, armas en mano y objetos.
 *
 * Todo se compone con las primitivas de forma y se sombrea con la rampa del
 * material, igual que enemigos y jefes. Antes esto era lo único del render que
 * seguía siendo vectorial: degradados, `shadowBlur` y `arc()`.
 *
 * Los proyectiles cambian de tamaño con el nivel del arma —el láser va de 4 a 20 px
 * de grosor y el cepillo de 60 a 200—, así que las máscaras se generan a la medida
 * que pide el proyectil y se hornean por tamaño.
 */

export interface ProjectileArt {
  mask: readonly string[];
  material: Material;
  /** Capa de detalle opcional. `C` es el núcleo caliente. */
  detail?: readonly string[];
}

/** Un núcleo brillante centrado, del tamaño que se le pida. */
const core = (w: number, h: number, rx: number, ry: number): string[] =>
  ellipse(w, h, w / 2, h / 2, rx, ry).map((row) => row.replace(/#/g, 'C'));

/**
 * Huso: grueso en el centro y afilado en los extremos. Es la forma de una hebra
 * tensa, y la del hilo dental cuando se estira.
 */
const spindle = (w: number, h: number, thickness: number): string[] =>
  ellipse(w, h, w / 2, h / 2, w / 2, Math.max(1, thickness / 2));

/**
 * Arco creciente abierto hacia la derecha. El cepillo barre en arco, y un arco se
 * lee como movimiento donde un rectángulo se lee como una tabla.
 */
const crescent = (w: number, h: number): string[] => {
  const thickness = Math.max(3, Math.round(Math.min(w, h) * 0.22));
  const ring = annulus(w, h, w / 2, h / 2, w / 2, h / 2, thickness);
  // Se corta poco más de la mitad izquierda: queda una C mirando a la derecha.
  return subtract(ring, rect(w, h, 0, 0, Math.round(w * 0.46), h));
};

export const projectileArt = (
  type: Projectile['projectileType'],
  w: number,
  h: number,
  owner: Projectile['owner']
): ProjectileArt => {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));

  switch (type) {
    case 'laser':
      return {
        mask: ellipse(W, H, W / 2, H / 2, W / 2, H / 2),
        material: 'laser',
        detail: core(W, H, Math.max(1, W * 0.28), Math.max(1, H * 0.28)),
      };

    case 'wave': {
      // Onda: media luna abierta, como el frente de un chorro.
      const body = ellipse(W, H, W / 2, H / 2, W / 2, H / 2);
      const bite = ellipse(W, H, W * 0.18, H / 2, W * 0.42, H * 0.4);
      return { mask: subtract(body, bite), material: 'wave' };
    }

    case 'floss': {
      // Hebra tensa: fina y larga, con la punta engordada. El hitbox es más
      // generoso que el dibujo a propósito: es un látigo, no una viga.
      const vertical = H > W;
      const strand = vertical
        ? ellipse(W, H, W / 2, H / 2, Math.max(1, Math.min(4, W / 2)), H / 2)
        : spindle(W, H, Math.min(8, H));
      const tip = vertical
        ? ellipse(W, H, W / 2, H - Math.min(6, H / 3), Math.min(5, W / 2), Math.min(5, H / 4))
        : ellipse(W, H, W - Math.min(6, W / 3), H / 2, Math.min(5, W / 4), Math.min(5, H / 2));
      return { mask: merge(strand, tip), material: 'melee' };
    }

    case 'sword':
      return { mask: crescent(W, H), material: 'melee' };

    case 'mortar':
    case 'acid': {
      // Gota lanzada: cuerpo redondo con la cola hacia arriba.
      const body = ellipse(W, H, W / 2, H * 0.58, W / 2, H * 0.42);
      const tail = rect(W, H, Math.round(W * 0.38), 0, Math.max(1, Math.round(W * 0.24)), Math.round(H * 0.4), 1);
      return { mask: merge(body, tail), material: type === 'acid' ? 'acid' : 'plaque' };
    }

    case 'sludge':
      // Salpicadura: ancha y baja, pegada al suelo.
      return {
        mask: merge(
          ellipse(W, H, W / 2, H * 0.68, W / 2, H * 0.32),
          ellipse(W, H, W * 0.28, H * 0.5, W * 0.16, H * 0.2),
          ellipse(W, H, W * 0.74, H * 0.52, W * 0.14, H * 0.18)
        ),
        material: 'sludge',
      };

    case 'judgment_orb':
      return {
        mask: merge(
          ellipse(W, H, W / 2, H / 2, W * 0.34, H * 0.34),
          annulus(W, H, W / 2, H / 2, W / 2, H / 2, 2)
        ),
        material: 'warden',
      };

    case 'bullet':
    default:
      return {
        mask: ellipse(W, H, W / 2, H / 2, W / 2, H / 2),
        material: owner === 'enemy' ? 'shotEnemy' : 'shotPlayer',
        detail: core(W, H, Math.max(1, W * 0.26), Math.max(1, H * 0.26)),
      };
  }
};

// ---------------------------------------------------------------------------
// Arma en mano: 22×12, apuntando a la derecha. La versión hacia arriba sale de
// girar esta 90°, que es exacto.
// ---------------------------------------------------------------------------

export interface HeldWeaponArt {
  w: number;
  h: number;
  mask: readonly string[];
  material: Material;
  /** Detalle: `C` núcleo/luz, `G` empuñadura, `B` cerdas. */
  detail?: readonly string[];
}

const HELD_W = 22;
const HELD_H = 12;

const held = (rows: string[], material: Material, detail?: string[]): HeldWeaponArt => ({
  w: HELD_W,
  h: HELD_H,
  mask: fit(rows, HELD_W, HELD_H),
  material,
  detail: detail && fit(detail, HELD_W, HELD_H),
});

export const HELD_WEAPONS: Record<WeaponType, HeldWeaponArt> = {
  /** Taladro dental: cuerpo con culata y broca fina. */
  normal: held(
    [
      '......................',
      '......................',
      '...#############......',
      '..###############.....',
      '..####################',
      '..####################',
      '..###############.....',
      '...####..######.......',
      '...###....####........',
      '..###.................',
      '......................',
      '......................',
    ],
    'metal',
    [
      '......................',
      '......................',
      '.....CC...............',
      '.....CC...............',
      '..................CCCC',
      '..................CCCC',
      '......................',
      '...GG.................',
      '...GG.................',
      '..GG..................',
      '......................',
      '......................',
    ]
  ),

  /** Escopeta: dos cañones cortos y anchos. */
  spread: held(
    [
      '......................',
      '...############.......',
      '..##############......',
      '..###############.....',
      '..###############.....',
      '..###############.....',
      '..###############.....',
      '..##############......',
      '...####...#####.......',
      '...###.....###........',
      '..###.................',
      '......................',
    ],
    'metal',
    [
      '......................',
      '.....CC...............',
      '.....CC...............',
      '..............CCC.....',
      '..............CCC.....',
      '......................',
      '..............CCC.....',
      '..............CCC.....',
      '...GG.................',
      '...GG.................',
      '..GG..................',
      '......................',
    ]
  ),

  /** Lámpara de curado: cuerpo con emisor luminoso. */
  laser: held(
    [
      '......................',
      '......................',
      '...###########........',
      '..#############.......',
      '..###############.....',
      '..#################...',
      '..###############.....',
      '..#############.......',
      '...####...####........',
      '...###.....##.........',
      '..###.................',
      '......................',
    ],
    'metal',
    [
      '......................',
      '......................',
      '.....CC...............',
      '.....CC...............',
      '..............CC......',
      '.............CCCCC....',
      '..............CC......',
      '......................',
      '...GG.................',
      '...GG.................',
      '..GG..................',
      '......................',
    ]
  ),

  /** Botella de enjuague: cuerpo ancho con boquilla. */
  mouthwash: held(
    [
      '......................',
      '..##############......',
      '..###############.....',
      '..################....',
      '..#################...',
      '..#################...',
      '..################....',
      '..###############.....',
      '..##############......',
      '...####...#####.......',
      '..####.....####.......',
      '......................',
    ],
    'scrubs',
    [
      '......................',
      '....CCCC..............',
      '....CCCC..............',
      '......................',
      '...............CCCC...',
      '...............CCCC...',
      '......................',
      '......................',
      '......................',
      '...GG.................',
      '..GG..................',
      '......................',
    ]
  ),

  /** Dispensador de hilo: caja con la hebra saliendo. */
  floss: held(
    [
      '......................',
      '......................',
      '...##########.........',
      '..############........',
      '..############........',
      '..############.####...',
      '..############.....###',
      '..############........',
      '...##########.........',
      '....########..........',
      '......................',
      '......................',
    ],
    'melee',
    [
      '......................',
      '......................',
      '.....CCCC.............',
      '.....CCCC.............',
      '......................',
      '..............CCCC....',
      '...................CCC',
      '......................',
      '.....GGGG.............',
      '.....GGGG.............',
      '......................',
      '......................',
    ]
  ),

  /** Cepillo: mango largo y cabeza con cerdas. */
  toothbrush: held(
    [
      '......................',
      '......................',
      '......................',
      '..#############.......',
      '..##############......',
      '..###############.....',
      '..###############.....',
      '..##############......',
      '..#############.......',
      '......................',
      '......................',
      '......................',
    ],
    'laser',
    [
      '......................',
      '..............BBBB....',
      '..............BBBB....',
      '...............BBB....',
      '..GGG.................',
      '..GGG.................',
      '..GGG.................',
      '..GGG.................',
      '...............BBB....',
      '..............BBBB....',
      '..............BBBB....',
      '......................',
    ]
  ),
};

// ---------------------------------------------------------------------------
// Objetos: bote con emblema. El emblema dice qué es sin necesidad de texto.
// ---------------------------------------------------------------------------

export const POWERUP_W = 24;
export const POWERUP_H = 24;

/** Bote: cuerpo con ventana y alas pequeñas. */
export const POWERUP_BODY = merge(
  rect(POWERUP_W, POWERUP_H, 4, 2, 16, 20, 3),
  rect(POWERUP_W, POWERUP_H, 0, 9, 4, 6, 1),
  rect(POWERUP_W, POWERUP_H, 20, 9, 4, 6, 1)
);

/** Emblemas de 10×10, uno por tipo de objeto. `S` es el color del contenido. */
const emblem = (rows: string[]): string[] => fit(rows, 10, 10);

export const POWERUP_EMBLEMS = {
  /** Cruz médica. */
  health: emblem([
    '..........',
    '...SSSS...',
    '...SSSS...',
    '.SSSSSSSS.',
    '.SSSSSSSS.',
    '.SSSSSSSS.',
    '...SSSS...',
    '...SSSS...',
    '..........',
    '..........',
  ]),
  /** Bala. */
  normal: emblem([
    '..........',
    '....SS....',
    '...SSSS...',
    '...SSSS...',
    '...SSSS...',
    '...SSSS...',
    '...SSSS...',
    '....SS....',
    '..........',
    '..........',
  ]),
  /** Abanico de perdigones. */
  spread: emblem([
    '..........',
    '..S....S..',
    '...S..S...',
    '....SS....',
    '....SS....',
    '...S..S...',
    '..S....S..',
    '.S......S.',
    '..........',
    '..........',
  ]),
  /** Rayo. */
  laser: emblem([
    '..........',
    '.....SS...',
    '....SS....',
    '...SSSS...',
    '..SSSS....',
    '....SS....',
    '...SS.....',
    '..SS......',
    '..........',
    '..........',
  ]),
  /** Ondas. */
  mouthwash: emblem([
    '..........',
    '..SS..SS..',
    '.S..SS..S.',
    '..........',
    '..SS..SS..',
    '.S..SS..S.',
    '..........',
    '..SS..SS..',
    '.S..SS..S.',
    '..........',
  ]),
  /** Hebra con carrete. */
  floss: emblem([
    '..........',
    '..SSSSSS..',
    '..S....S..',
    '..SSSSSS..',
    '.....S....',
    '....S.....',
    '...S......',
    '..S.......',
    '..........',
    '..........',
  ]),
  /** Cepillo. */
  toothbrush: emblem([
    '..........',
    '.......SSS',
    '.......SSS',
    '..SSSSSS..',
    '..SSSSSS..',
    '.......SSS',
    '.......SSS',
    '..........',
    '..........',
    '..........',
  ]),
} as const;

/** Emblema colocado dentro del bote, ya recortado a su ventana. */
export const powerupDetail = (subType: keyof typeof POWERUP_EMBLEMS): string[] =>
  stamp(blank(POWERUP_W, POWERUP_H), POWERUP_EMBLEMS[subType], 7, 7);
