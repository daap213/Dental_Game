import type { Platform } from '../../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/physics';
import type { PaletteKey } from '../data/palette';
import { px, blit, bake } from './pixel';
import { ditherFill, ditherOver } from './dither';
import { hash, hashInt, spread } from './noise';
import { drawSprite } from './sprites/format';
import { shadeMask } from './sprites/shade';
import { rect, merge, ellipse } from './sprites/masks/shapes';

/**
 * Plataformas y transición entre fases.
 *
 * El fondo vivía aquí y se ha mudado a `render/background/`: eran cuatro capas
 * con sus factores de parallax escritos a mano en medio de una función, y ahora
 * son una pila declarada en la que cada fase elige qué capas entran. Este fichero
 * se queda con lo que se pinta *sobre* el mundo.
 *
 * Todo está horneado y estampado. Antes se dibujaba entero en cada frame con
 * degradados, `shadowBlur` y modos de fusión: además de ser lento, era justo lo
 * que se ensucia al reescalar el lienzo. Cada pieza se pinta **una vez** con
 * tramado y se reutiliza, que es también lo que necesita el port a Phaser para
 * convertirlas en texturas.
 */

// --- Plataformas -----------------------------------------------------------

const TILE = 32;
/** Cuántas baldosas distintas se hornean de cada cosa. */
const TONGUE_VARIANTS = 4;
const BRACES_VARIANTS = 3;

/**
 * Baldosa de lengua: la superficie del suelo.
 *
 * Era **una sola baldosa** con las papilas en una rejilla de ocho píxeles, repetida
 * a lo largo de todo el nivel: el suelo es lo que más superficie ocupa después del
 * fondo, y se leía como papel pintado.
 *
 * Ahora hay cuatro, elegidas por la columna del mundo. Las papilas se reparten con
 * el ruido determinista en vez de en rejilla, y cada variante añade algo: un surco,
 * un brillo húmedo, una zona más gastada.
 */
const tongueTile = (variant: number) =>
  bake(`platform:tongue:${variant}`, TILE, 64, (ctx) => {
    px(ctx, 0, 0, TILE, 64, 'tongue.mid');

    // Canto superior: dos filas claras y una de brillo. Es lo que separa el suelo
    // del aire y lo que el jugador usa para juzgar dónde pisa.
    px(ctx, 0, 0, TILE, 2, 'tongue.light');
    px(ctx, 0, 2, TILE, 1, 'tongue.hi');
    ditherFill(ctx, 0, 3, TILE, 10, 'tongue.mid', 'tongue.light', 6);
    ditherFill(ctx, 0, 13, TILE, 26, 'tongue.mid', 'tongue.dark', 8);
    ditherFill(ctx, 0, 39, TILE, 25, 'tongue.dark', 'tongue.out', 10);

    // Papilas: repartidas, no en rejilla. Más densas y marcadas arriba, donde da
    // la luz.
    const count = variant === 1 ? 7 : 13;
    for (let i = 0; i < count; i++) {
      const x = Math.round(spread(count, i, variant * 7 + 1) * (TILE - 3));
      const y = 6 + Math.round(hash(variant, i, 3) * 30);
      const big = hash(variant, i, 5) > 0.65;
      px(ctx, x, y, big ? 3 : 2, 2, 'tongue.light');
      px(ctx, x, y + 2, big ? 3 : 2, 1, 'tongue.dark');
      if (big) px(ctx, x, y, 1, 1, 'tongue.hi');
    }

    switch (variant) {
      case 1: {
        // Surco: una grieta que baja en diagonal, con su labio iluminado.
        let gx = 6 + Math.round(hash(variant, 11) * 16);
        for (let y = 4; y < 44; y++) {
          px(ctx, gx, y, 2, 1, 'tongue.out');
          px(ctx, gx + 2, y, 1, 1, 'tongue.light');
          if (y % 6 === 0) gx += hash(variant, y, 13) > 0.5 ? 1 : -1;
        }
        break;
      }
      case 2: {
        // Brillo húmedo: una mancha tenue en la parte alta.
        const cx = 8 + Math.round(hash(variant, 17) * 12);
        for (let i = 0; i < 12; i++) {
          const half = Math.round(Math.sqrt(Math.max(0, 1 - ((i - 6) / 6) ** 2)) * 9);
          ditherOver(ctx, cx - half, 5 + i, half * 2, 1, 'tongue.hi', 4);
        }
        break;
      }
      case 3:
        // Zona gastada: la superficie más apagada y con la trama más abierta.
        ditherOver(ctx, 0, 4, TILE, 22, 'tongue.dark', 5);
        break;
    }
  });

/** Color de la goma del aparato. Cambia por fase, como en una ortodoncia real. */
const ELASTIC: readonly PaletteKey[] = [
  'bacteria.light',
  'candy.light',
  'plaque.light',
  'fiend.light',
  'warden.light',
];

/**
 * Baldosa de aparato dental.
 *
 * También era una sola tira de 32 píxeles repetida. Ahora hay tres, con el bracket
 * en distinta posición, la goma de color de la fase y el alambre con su caída entre
 * bracket y bracket —un alambre de ortodoncia no va recto—.
 */
const bracesTile = (variant: number, stage: number) =>
  bake(`platform:braces:${variant}:${stage}`, TILE, 20, (ctx) => {
    const body = rect(TILE, 20, 0, 2, TILE, 16, 2);
    drawSprite(ctx, `platform:braces:art:${variant}`, shadeMask(body, 'enamel'), 0, 0);

    // Alambre con caída: baja en el centro del tramo y sube en los extremos.
    for (let x = 0; x < TILE; x++) {
      const t = (x / (TILE - 1)) * 2 - 1;
      const sag = Math.round((1 - t * t) * 2);
      px(ctx, x, 9 + sag, 1, 2, 'metal.dark');
      px(ctx, x, 9 + sag, 1, 1, 'metal.light');
    }

    // Bracket, en una de tres posiciones.
    const bx = [9, 3, 16][variant % 3];
    const bracket = rect(14, 14, 0, 0, 14, 14, 3);
    drawSprite(ctx, `platform:braces:bracket:${variant}`, shadeMask(bracket, 'metal'), bx, 3);
    px(ctx, bx + 4, 7, 4, 4, 'metal.hi');

    // La goma, cruzando el bracket.
    const elastic = ELASTIC[Math.max(0, Math.min(ELASTIC.length - 1, stage - 1))];
    px(ctx, bx + 2, 5, 10, 2, elastic);
    px(ctx, bx + 2, 12, 10, 2, elastic);
  });

export const drawPlatforms = (
  ctx: CanvasRenderingContext2D,
  platforms: Platform[],
  stage = 1
) => {
  platforms.forEach((p) => {
    for (let x = 0; x < p.w; x += TILE) {
      const w = Math.min(TILE, p.w - x);
      // Índice en coordenadas del **mundo**: la baldosa de un sitio es siempre la
      // misma, así que el suelo no cambia al pasar la cámara por delante.
      const index = Math.floor((p.x + x) / TILE);

      if (p.isGround) {
        const tile = tongueTile(hashInt(TONGUE_VARIANTS, index, 91));
        // Se recorta la baldosa al ancho que queda, para no pasarse del borde.
        ctx.drawImage(tile, 0, 0, w, 64, Math.round(p.x + x), Math.round(p.y), w, 64);
      } else {
        const tile = bracesTile(hashInt(BRACES_VARIANTS, index, 93), stage);
        ctx.drawImage(tile, 0, 0, w, 20, Math.round(p.x + x), Math.round(p.y), w, 20);
      }
    }
  });
};

// --- Transición entre fases ------------------------------------------------

const JAW_TOOTH_W = 40;
const JAW_TOOTH_H = 56;

const JAW_VARIANTS = 4;

const jawTooth = (isTop: boolean, variant: number) =>
  bake(`jaw:tooth:${isTop ? 'top' : 'bottom'}:${variant}`, JAW_TOOTH_W, JAW_TOOTH_H, (ctx) => {
    // Una o dos cúspides, y la corona más o menos ancha: cuatro variantes bastan
    // para que la mordida no parezca una cremallera.
    const twin = hash(variant, 71) > 0.35;
    const rx = twin ? 12 : 17;
    const crown = twin
      ? merge(
          ellipse(JAW_TOOTH_W, JAW_TOOTH_H, 13, 22, rx, 18),
          ellipse(JAW_TOOTH_W, JAW_TOOTH_H, 27, 22, rx, 18),
          rect(JAW_TOOTH_W, JAW_TOOTH_H, 2, 14, 36, 26)
        )
      : merge(
          ellipse(JAW_TOOTH_W, JAW_TOOTH_H, 20, 22, rx, 19),
          rect(JAW_TOOTH_W, JAW_TOOTH_H, 3, 14, 34, 26)
        );
    const root = rect(JAW_TOOTH_W, JAW_TOOTH_H, 10, 34, 20, 22, 6);
    const shape = merge(crown, root);
    const oriented = isTop ? shape : [...shape].reverse();
    drawSprite(ctx, `jaw:tooth:art:${isTop}:${variant}`, shadeMask(oriented, 'enamel'), 0, 0);
  });

export const drawTransition = (ctx: CanvasRenderingContext2D, progress: number, stage: number) => {
  if (progress <= 0) return;

  const ease =
    progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const half = CANVAS_HEIGHT / 2;
  const topY = -110 + (half + 110) * ease;
  const botY = CANVAS_HEIGHT + 110 - (half + 110) * ease;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Encía de cada mandíbula: una banda tramada que se cierra.
  ditherFill(ctx, 0, topY - CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, 'gum.dark', 'gum.out', 6);
  ditherFill(ctx, 0, botY, CANVAS_WIDTH, CANVAS_HEIGHT, 'gum.dark', 'gum.out', 6);

  // Festón de la encía en el canto de cada mandíbula: es de donde nacen los
  // dientes, y sin él la encía era una banda plana cortada en seco.
  for (let x = 0; x < CANVAS_WIDTH; x += 16) {
    const bulge = 5 + Math.round(hash(x, 77) * 4);
    for (let i = 0; i < 16; i++) {
      const t = (i / 15) * 2 - 1;
      const depth = Math.round((1 - t * t) * bulge);
      if (depth <= 0) continue;
      px(ctx, x + i, topY - depth, 1, depth + 1, 'gum.mid');
      px(ctx, x + i, botY - 1, 1, depth + 1, 'gum.mid');
    }
  }

  // Dientes colgando de cada arcada, con variantes: repetir el mismo hacía que la
  // mordida pareciera una cremallera.
  for (let i = -1; i * JAW_TOOTH_W < CANVAS_WIDTH + JAW_TOOTH_W; i++) {
    const x = i * JAW_TOOTH_W;
    const arcOffset = Math.round(Math.sin((x / CANVAS_WIDTH) * Math.PI) * 14);
    const flip = hash(i, 79) > 0.5;
    blit(
      ctx,
      jawTooth(true, hashInt(JAW_VARIANTS, i, 81)),
      x,
      topY - JAW_TOOTH_H + arcOffset,
      JAW_TOOTH_W,
      JAW_TOOTH_H,
      flip
    );
    blit(
      ctx,
      jawTooth(false, hashInt(JAW_VARIANTS, i, 83)),
      x,
      botY - arcOffset,
      JAW_TOOTH_W,
      JAW_TOOTH_H,
      flip
    );
  }

  if (progress > 0.95) {
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(`STAGE ${stage} COMPLETE`, CANVAS_WIDTH / 2 + 2, half - 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(`STAGE ${stage} COMPLETE`, CANVAS_WIDTH / 2, half - 20);
    ctx.fillStyle = '#000';
    ctx.fillText('BRUSHING...', CANVAS_WIDTH / 2 + 2, half + 22);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('BRUSHING...', CANVAS_WIDTH / 2, half + 20);
  }

  ctx.restore();
};
