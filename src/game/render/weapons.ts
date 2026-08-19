import type { Projectile, Player, PowerUp, WeaponType } from '../../types';
import type { PaletteKey } from '../data/palette';
import { px } from './pixel';
import { drawSprite, type SpriteDef } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { rotate90 } from './sprites/masks/shapes';
import {
  projectileArt,
  powerupDetail,
  HELD_WEAPONS,
  POWERUP_BODY,
  POWERUP_W,
  POWERUP_H,
  POWERUP_EMBLEMS,
} from './sprites/masks/weapons';

/**
 * Dibujado de proyectiles, arma en mano y objetos.
 *
 * Todo pasa por el mismo pipeline que el resto del arte: máscara, sombreado con la
 * rampa del material y horneado. Antes era la única parte del render que seguía
 * siendo vectorial, con degradados y `shadowBlur`, y se notaba al lado de los
 * sprites.
 *
 * Los proyectiles cambian de tamaño con el nivel del arma, así que se hornean por
 * tamaño; y los que tienen una punta o un filo se orientan girando la **máscara**
 * en múltiplos de 90°, que es exacto, en lugar de rotar el lienzo.
 */

type Dir = 'right' | 'left' | 'up' | 'down';

/** Hacia dónde va, quedándose con el eje dominante. */
const directionOf = (vx: number, vy: number): Dir => {
  if (Math.abs(vx) >= Math.abs(vy)) return vx >= 0 ? 'right' : 'left';
  return vy >= 0 ? 'down' : 'up';
};

const rot180 = (mask: readonly string[]) => rotate90(rotate90(mask));

/** Gira una máscara cuadrada al cuadrante pedido. */
const orientSquare = (mask: readonly string[], dir: Dir): readonly string[] => {
  if (dir === 'right') return mask;
  if (dir === 'down') return rotate90(mask);
  if (dir === 'left') return rot180(mask);
  return rotate90(rot180(mask));
};

const cache = new Map<string, SpriteDef>();

const memo = (id: string, build: () => SpriteDef): SpriteDef => {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = build();
  cache.set(id, def);
  return def;
};

/**
 * Sprite de un proyectil.
 *
 * `sword` es cuadrado y su arco apunta a un lado, así que se gira al cuadrante del
 * movimiento. `floss` ya viene con el ancho y el alto cambiados cuando se apunta en
 * vertical, así que solo necesita media vuelta para apuntar al otro lado.
 */
const projectileSprite = (proj: Projectile): { def: SpriteDef; flip: boolean } => {
  const w = Math.max(1, Math.round(proj.w));
  const h = Math.max(1, Math.round(proj.h));
  const dir = directionOf(proj.vx, proj.vy);
  const type = proj.projectileType;

  const spin = type === 'sword' ? dir : type === 'floss' && (dir === 'left' || dir === 'up') ? 'half' : 'none';
  const flip = spin === 'none' && dir === 'left' && (type === 'wave' || type === 'bullet' || type === 'laser');

  const id = `proj:${type}:${proj.owner}:${w}x${h}:${spin}`;

  const def = memo(id, () => {
    const art = projectileArt(type, w, h, proj.owner);
    const mask =
      spin === 'half' ? rot180(art.mask) : spin === 'none' ? art.mask : orientSquare(art.mask, spin);

    const shaded = shadeMask(mask, art.material);
    if (!art.detail) return shaded;

    const detailRows =
      spin === 'half' ? rot180(art.detail) : spin === 'none' ? art.detail : orientSquare(art.detail, spin);

    return withDetails(shaded, {
      w: mask[0]?.length ?? w,
      h: mask.length,
      rows: detailRows,
      map: { C: `${art.material}.hi` as PaletteKey },
    });
  });

  return { def, flip };
};

export const drawProjectiles = (ctx: CanvasRenderingContext2D, projectiles: Projectile[]) => {
  projectiles.forEach((proj) => {
    const { def, flip } = projectileSprite(proj);
    drawSprite(ctx, `${proj.projectileType}:${def.w}x${def.h}:${proj.owner}`, def, proj.x, proj.y, flip);
  });
};

// --- Arma en mano ----------------------------------------------------------

/** Hacia dónde apunta el jugador, para orientar el arma en mano. */
export interface AimInput {
  usingMouse: boolean;
  aimUp: boolean;
  mouseX: number;
  mouseY: number;
  cameraX: number;
  cameraY: number;
}

const heldSprite = (weapon: WeaponType, up: boolean): SpriteDef =>
  memo(`held:${weapon}:${up ? 'up' : 'side'}`, () => {
    const art = HELD_WEAPONS[weapon] ?? HELD_WEAPONS.normal;
    const mask = up ? rotate90(art.mask) : art.mask;
    const shaded = shadeMask(mask, art.material);
    if (!art.detail) return shaded;

    return withDetails(shaded, {
      w: mask[0]?.length ?? art.w,
      h: mask.length,
      rows: up ? rotate90(art.detail) : art.detail,
      map: {
        C: `${art.material}.hi` as PaletteKey,
        G: 'metal.shade',
        B: 'laser.light',
      },
    });
  });

/**
 * Arma en mano, con dos orientaciones.
 *
 * No hay rotación libre a propósito: girar un sprite de 22×12 un ángulo cualquiera
 * lo llena de dientes de sierra. Se dibuja de lado y, cuando se apunta claramente
 * hacia arriba, se usa la misma máscara girada 90°, que es exacto.
 */
/**
 * Si se está apuntando claramente hacia arriba.
 *
 * Se exporta porque la decisión la necesitan **dos** sitios: el arma, para girarse, y el
 * brazo, para alzarse. Calculada dos veces se podrían desincronizar y quedaría un brazo
 * bajado con el arma apuntando al cielo.
 */
export const aimingUp = (p: Player, aim: AimInput): boolean => {
  if (!aim.usingMouse) return aim.aimUp;
  const dx = aim.mouseX + aim.cameraX - (p.x + p.w / 2);
  const dy = aim.mouseY + aim.cameraY - (p.y + p.h / 2);
  return Math.abs(dy) > Math.abs(dx) && dy < 0;
};

/**
 * @param hand Dónde está el puño, en píxeles de mundo. Lo calcula `armPlacement` a partir
 *   del propio dibujo del brazo: antes eran dos números escritos aquí a mano —`p.x + 18`
 *   y `p.y + 19`— que no sabían nada del sprite, así que mover el puño dejaba el arma
 *   flotando y nada avisaba.
 */
export const drawHeldWeapon = (
  ctx: CanvasRenderingContext2D,
  p: Player,
  aim: AimInput,
  hand: { x: number; y: number }
) => {
  const handX = hand.x;
  const handY = hand.y;
  const up = aimingUp(p, aim);

  const def = heldSprite(p.weapon, up);

  if (up) {
    drawSprite(ctx, `held:${p.weapon}:up`, def, handX - def.w / 2, handY - def.h, p.facing === -1);
  } else {
    const x = p.facing === 1 ? handX : handX - def.w;
    drawSprite(ctx, `held:${p.weapon}:side`, def, x, handY - def.h / 2, p.facing === -1);
  }
};

// --- Objetos ---------------------------------------------------------------

type PowerUpEmblem = keyof typeof POWERUP_EMBLEMS;

const powerupSprite = (subType: PowerUpEmblem): SpriteDef =>
  memo(`powerup:${subType}`, () => {
    const shaded = shadeMask(POWERUP_BODY, 'metal');
    return withDetails(shaded, {
      w: POWERUP_W,
      h: POWERUP_H,
      rows: powerupDetail(subType),
      // El contenido de cada bote lleva el color de lo que da.
      map: { S: EMBLEM_COLORS[subType] },
    });
  });

/** Color del emblema de cada objeto: dice de un vistazo qué suelta. */
const EMBLEM_COLORS: Record<PowerUpEmblem, PaletteKey> = {
  health: 'candy.light',
  normal: 'shotPlayer.light',
  spread: 'shotPlayer.hi',
  laser: 'laser.light',
  mouthwash: 'wave.light',
  floss: 'bacteria.light',
  toothbrush: 'plaque.light',
};

/**
 * Objeto que sueltan los enemigos.
 *
 * El bamboleo va con el reloj de simulación que se le pasa, no con `Date.now()`:
 * así dos partidas iguales lo dibujan igual, que es la condición para poder hornear
 * y para que el port a Phaser no cambie de aspecto.
 */
export const drawPowerUp = (ctx: CanvasRenderingContext2D, pu: PowerUp, time = 0) => {
  const subType = (pu.subType in POWERUP_EMBLEMS ? pu.subType : 'normal') as PowerUpEmblem;
  const bob = Math.round(Math.sin(time * 3 + pu.x * 0.05) * 2);

  // Sombra en el suelo: dos tiras, como la del jugador.
  px(ctx, pu.x + 4, pu.y + POWERUP_H + 2 + bob, POWERUP_W - 8, 1, 'void.shade');

  drawSprite(ctx, `powerup:${subType}`, powerupSprite(subType), pu.x, pu.y + bob);
};
