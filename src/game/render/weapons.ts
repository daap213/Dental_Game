import type { Projectile, Player, PowerUp, WeaponType } from '../../types';
import type { PaletteKey } from '../data/palette';
import { px } from './pixel';
import { drawSprite, type SpriteDef } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { rotateMask } from './sprites/masks/shapes';
import { PROJECTILES } from '../data/projectiles';
import { aimStepFrom, bakeStep, stepAngle, type AimInput } from '../data/aim';
import {
  projectileArt,
  orientedProjectileArt,
  powerupDetail,
  HELD_WEAPONS,
  POWERUP_BODY,
  POWERUP_W,
  POWERUP_H,
  POWERUP_EMBLEMS,
} from './sprites/masks/weapons';

/**
 * De dónde apunta el jugador se re-exporta desde `data/aim`, donde vive ahora.
 *
 * Tuvo que bajar a `data/` porque la **simulación** también lo necesita: de la inclinación sale
 * la caja de golpe, y `game/` y `render/` son hermanos que solo pueden depender hacia abajo.
 */
export type { AimInput };

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

const cache = new Map<string, SpriteDef>();

const memo = (id: string, build: () => SpriteDef): SpriteDef => {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = build();
  cache.set(id, def);
  return def;
};

/**
 * El sprite de un proyectil **y el identificador con el que se hornea**.
 *
 * Los dos van juntos a propósito, y no es un detalle de estilo: `bake` cachea por identificador
 * y por nada más (`pixel.ts`), así que el identificador tiene que distinguir todo lo que cambia
 * el dibujo. Esto estaba partido en dos —la memoria interna sí llevaba la orientación, el
 * identificador de horneado no— y el resultado era que **las cuatro orientaciones del cepillo
 * compartían un solo lienzo**: la primera dirección en la que golpeabas era el dibujo que veías
 * para las cuatro. Las rotaciones se calculaban y se tiraban, y ningún test podía verlo porque
 * todos miraban lo que devolvía la memoria interna, que sí distinguía.
 *
 * El espejado **no** entra en el identificador: lo hace `blit` al pintar, así que meterlo
 * duplicaría los horneados para nada.
 */
export interface ProjectileVisual {
  bakeId: string;
  def: SpriteDef;
  flip: boolean;
}

const detailOver = (
  shaded: SpriteDef,
  art: { material: string; detail?: readonly string[] },
  w: number,
  h: number
): SpriteDef =>
  art.detail
    ? withDetails(shaded, {
        w,
        h,
        rows: art.detail,
        map: { C: `${art.material}.hi` as PaletteKey },
      })
    : shaded;

/**
 * Lo que no se orienta: se dibuja igual mire donde mire.
 *
 * Son los radiales —un orbe, un charco, un reventón, una bala redonda— y **todo lo del enemigo**,
 * que sigue exactamente como estaba. Un jefe que dispara un patrón de dieciséis balas no gana
 * nada inclinándolas, y dejarlo fuera mantiene intacta la mitad del juego que este cambio no
 * tiene por qué tocar.
 */
const flatVisual = (proj: Projectile): ProjectileVisual => {
  const w = Math.max(1, Math.round(proj.w));
  const h = Math.max(1, Math.round(proj.h));
  const type = proj.projectileType;
  const id = `proj:${type}:${proj.owner}:${w}x${h}`;

  const def = memo(id, () => {
    const art = projectileArt(type, w, h, proj.owner);
    return detailOver(shadeMask(art.mask, art.material), art, w, h);
  });

  // La bala mirando a la izquierda se pinta al revés, como hacía antes.
  return { bakeId: id, def, flip: proj.vx < 0 && type === 'bullet' };
};

export const projectileVisual = (proj: Projectile): ProjectileVisual => {
  const type = proj.projectileType;
  const frame = PROJECTILES[type].blade;
  const blade = proj.blade;

  if (!frame || !blade || proj.aimStep === undefined) return flatVisual(proj);

  // Solo se hornea la mitad derecha; el resto sale espejado, que es gratis.
  const { step, flip } = bakeStep(proj.aimStep, proj.facing);
  const id = `proj:${type}:${proj.owner}:${blade.long}x${blade.thick}:${step}`;

  const def = memo(id, () => {
    const art = orientedProjectileArt(type, proj.owner, blade, step, frame);
    return detailOver(shadeMask(art.mask, art.material), art, art.w, art.h);
  });

  return { bakeId: id, def, flip };
};

export const drawProjectiles = (ctx: CanvasRenderingContext2D, projectiles: Projectile[]) => {
  projectiles.forEach((proj) => {
    const { bakeId, def, flip } = projectileVisual(proj);
    drawSprite(ctx, bakeId, def, proj.x, proj.y, flip);
  });
};

// --- Arma en mano ----------------------------------------------------------

/** El arma en mano en una inclinación concreta, con el mango ya localizado. */
export interface HeldVisual {
  bakeId: string;
  def: SpriteDef;
  /** Dónde cayó el mango dentro del dibujo: es el punto que va en el puño. */
  px: number;
  py: number;
  flip: boolean;
}

const heldCache = new Map<string, { def: SpriteDef; px: number; py: number }>();

/**
 * El arma en mano, inclinada al paso al que se apunta.
 *
 * Tenía **dos** orientaciones: de lado, y de lado girada noventa grados para apuntar arriba. Y la
 * de arriba estaba mal, porque `rotate90` gira en sentido horario y llevaba la punta al suelo;
 * luego se colocaba encima del puño, y quedaba el mango arriba y el filo en la mano. El test que
 * había solo comprobaba que el ancho y el alto se intercambiaran, lo cual se cumple girando en
 * cualquiera de los dos sentidos.
 *
 * Ahora hay un solo camino: se gira alrededor del **mango** y se dibuja restando dónde acabó. Con
 * eso desaparecen los dos casos escritos a mano, y en los cuatro ejes el resultado es el de
 * siempre porque un giro de noventa grados no se remuestrea.
 */
export const heldVisual = (weapon: WeaponType, step: number, facing = 1): HeldVisual => {
  const { step: baked, flip } = bakeStep(step, facing);
  const bakeId = `held:${weapon}:${baked}`;

  const hit = heldCache.get(bakeId);
  if (hit) return { bakeId, ...hit, flip };

  const art = HELD_WEAPONS[weapon] ?? HELD_WEAPONS.normal;
  /** El mango: borde izquierdo y a media altura, que es donde lo dibujan las ocho máscaras. */
  const grip = { x: 0, y: (art.mask.length || art.h) / 2 };
  const angle = stepAngle(baked);

  const turned = rotateMask(art.mask, angle, grip);
  const w = turned.rows[0]?.length ?? art.w;
  const h = turned.rows.length;
  const shaded = shadeMask(turned.rows, art.material);

  const def = art.detail
    ? withDetails(shaded, {
        w,
        h,
        // El detalle se gira con **el mismo** giro, así que sigue cuadrando con la silueta.
        rows: rotateMask(art.detail, angle, grip).rows,
        /**
         * La leyenda del detalle, ampliada para el lenguaje de las referencias.
         *
         * Con un solo material por arma no se puede tener acero y madera en la misma pieza,
         * y las siete referencias comparten justo eso: **astil de madera, virola dorada y un
         * acento de energía**. En vez de componer materiales —que obligaría a tocar el
         * sombreado— cada uno entra como una letra del detalle, que se pinta encima.
         */
        map: {
          C: `${art.material}.hi` as PaletteKey,
          G: 'metal.shade',
          B: 'laser.light',
          /** Madera del astil, y su sombra. */
          W: 'wood.mid',
          w: 'wood.shade',
          /** Virola o anilla de latón. */
          O: 'warden.mid',
          /** Energía o líquido: el núcleo del bláster, el enjuague, el látigo. */
          E: 'wave.light',
        },
      })
    : shaded;

  const built = { def, px: turned.px, py: turned.py };
  heldCache.set(bakeId, built);
  return { bakeId, ...built, flip };
};

/**
 * A qué paso apunta el jugador.
 *
 * Se exporta porque la decisión la necesitan **dos** sitios: el arma, para inclinarse, y el
 * brazo, para elegir pose. Calculada dos veces se podrían desincronizar y quedaría un brazo
 * bajado con el arma apuntando al cielo.
 */
export const aimStepOf = (p: Player, aim: AimInput): number =>
  aimStepFrom(aim, p.x + p.w / 2, p.y + p.h / 2, p.facing);

/**
 * @param step La inclinación a la que se apunta, de 0 a 15. Se la pasa `drawPlayer`, que la
 *   calcula una sola vez y se la da también al brazo, para que los dos coincidan.
 * @param hand Dónde está el puño, en píxeles de mundo. Lo calcula `armPlacement` a partir
 *   del propio dibujo del brazo: antes eran dos números escritos aquí a mano —`p.x + 18`
 *   y `p.y + 19`— que no sabían nada del sprite, así que mover el puño dejaba el arma
 *   flotando y nada avisaba.
 */
export const drawHeldWeapon = (
  ctx: CanvasRenderingContext2D,
  p: Player,
  step: number,
  hand: { x: number; y: number }
) => {
  const { bakeId, def, px, py, flip } = heldVisual(p.weapon, step, p.facing);

  /**
   * El mango va en el puño, y con el dibujo espejado eso **no** es restar el pivote.
   *
   * `blit` espeja dentro del rectángulo de destino, así que el píxel local `x` acaba pintado en
   * `w − 1 − x`. Restando el pivote sin más, el arma daba un salto al girarse el personaje.
   */
  const x = flip ? hand.x - (def.w - 1 - px) : hand.x - px;
  drawSprite(ctx, bakeId, def, x, hand.y - py, flip);
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
  bow: 'laser.hi',
  scythe: 'metal.light',
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
