import type { Platform } from '../../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/physics';
import { getStagePalette } from '../data/stages';
import type { Material, PaletteKey } from '../data/palette';
import { px, blit, bake } from './pixel';
import { ditherFill, ditherBand } from './dither';
import { drawSprite } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { ellipse, rect, merge, subtract, blank, fit, spike } from './sprites/masks/shapes';

/**
 * Escenario: fondo de la boca, plataformas y transición entre fases.
 *
 * Todo está horneado en capas y estampado con su parallax. El fondo antes se
 * dibujaba entero en cada frame con degradados radiales, `shadowBlur` y modos de
 * fusión: además de ser lento, era justo lo que se ensucia al reescalar el lienzo.
 * Ahora cada capa se pinta **una vez** con tramado y se reutiliza, que es también
 * lo que necesita el port a Phaser para convertirlas en texturas.
 *
 * La escena es una boca vista desde dentro, iluminada por la lámpara del dentista:
 * garganta al fondo, el dentista asomando por la abertura, hileras de molares
 * arriba y abajo, y encías en primer plano.
 */

const THROAT_H = CANVAS_HEIGHT;

/** Capa 1: la garganta. Bandas tramadas de dentro hacia fuera. */
const throatLayer = (stage: number) =>
  bake(`bg:throat:${stage}`, CANVAS_WIDTH, THROAT_H, (ctx) => {
    const palette = getStagePalette(stage);
    const inner = palette.ramp;

    // Fondo general, más oscuro arriba y abajo que en el centro.
    ditherBand(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2, `${inner}.out`, `${inner}.dark`, 7);
    ditherBand(
      ctx,
      0,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH,
      CANVAS_HEIGHT / 2,
      `${inner}.dark`,
      `${inner}.out`,
      7
    );

    // La abertura: un óvalo de luz que se apaga hacia fuera. Doce anillos con la
    // curva suave, porque con pocos anillos se ve la diana en lugar del hueco.
    //
    // Es deliberadamente contenido: la primera versión llenaba media pantalla de
    // amarillo y se comía la zona de juego. Solo los tres anillos de dentro llevan
    // el cálido de la lámpara; los de fuera tiran del claro de la propia carne, así
    // que la luz se funde con el fondo en lugar de parecer pintura encima.
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2 - 20;
    const rings = 12;
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const rx = 96 + t * 150;
      const ry = 68 + t * 104;
      const level = Math.round(10 * (1 - t) * (1 - t));
      const over: PaletteKey = t < 0.28 ? 'warden.light' : `${inner}.light`;
      ellipseDither(ctx, cx, cy, rx, ry, `${inner}.dark`, level, over);
    }
  });

/** Un anillo de elipse tramado. Es el sustituto del degradado radial. */
const ellipseDither = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  base: PaletteKey,
  level: number,
  over: PaletteKey
) => {
  const top = Math.max(0, Math.round(cy - ry));
  const bottom = Math.min(CANVAS_HEIGHT, Math.round(cy + ry));

  for (let y = top; y < bottom; y++) {
    const dy = (y + 0.5 - cy) / ry;
    const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx;
    const x0 = Math.round(cx - half);
    ditherFill(ctx, x0, y, Math.round(half * 2), 1, base, over, level);
  }
};

/** Capa 2: el dentista, asomando por la abertura. */
const dentistLayer = (stage: number) =>
  bake(`bg:dentist:${stage}`, 300, 260, (ctx) => {
    const W = 300;
    const H = 260;

    // Cabeza y gorro quirúrgico.
    const head = ellipse(W, H, 150, 120, 92, 96);
    const cap = subtract(ellipse(W, H, 150, 96, 96, 84), rect(W, H, 0, 96, W, H - 96));
    const mask = subtract(rect(W, H, 66, 128, 168, 78, 10), rect(W, H, 0, 200, W, 60));

    // Piel primero, luego gorro y mascarilla encima: cada pieza con su material.
    drawShaded(ctx, `bg:dentist:head:${stage}`, head, 'skin');
    drawShaded(ctx, `bg:dentist:cap:${stage}`, cap, 'scrubs');
    drawShaded(ctx, `bg:dentist:mask:${stage}`, mask, 'scrubs');

    // Ojos: dos óvalos con iris, y las gafas.
    eye(ctx, 116, 108);
    eye(ctx, 184, 108);
    px(ctx, 96, 100, 108, 2, 'metal.dark');
    px(ctx, 96, 100, 2, 22, 'metal.dark');
    px(ctx, 202, 100, 2, 22, 'metal.dark');

    // Lámpara frontal, con su halo cálido.
    const lamp = ellipse(W, H, 150, 40, 30, 26);
    drawShaded(ctx, `bg:dentist:lamp:${stage}`, lamp, 'warden');
    px(ctx, 140, 30, 12, 8, 'warden.hi');
  });

const eye = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const W = 44;
  const H = 30;
  const sclera = ellipse(W, H, W / 2, H / 2, 20, 13);
  const shaded = shadeMask(sclera, 'enamel');
  const iris = fit(
    [
      ...blank(W, 9),
      '..................MMMMMM................',
      '.................MMPPPPMM...............',
      '.................MPPPPPPM...............',
      '.................MPPPPPPM...............',
      '..................MMPPMM................',
    ],
    W,
    H
  );
  const def = withDetails(shaded, {
    w: W,
    h: H,
    rows: iris,
    map: { M: 'metal.out', P: 'metal.dark' },
  });
  drawSprite(ctx, `bg:eye:${cx}:${cy}`, def, cx - W / 2, cy - H / 2);
};

/** Hornea una silueta con su material y la estampa en el origen. */
const drawShaded = (
  ctx: CanvasRenderingContext2D,
  id: string,
  mask: readonly string[],
  material: Material
) => {
  drawSprite(ctx, id, shadeMask(mask, material), 0, 0);
};

/** Capa 3: un molar de fondo. Se repite en hilera arriba y abajo. */
const TOOTH_W = 64;
const TOOTH_H = 92;

const backgroundTooth = (stage: number, isTop: boolean) =>
  bake(`bg:tooth:${stage}:${isTop ? 'top' : 'bottom'}`, TOOTH_W, TOOTH_H, (ctx) => {
    const crown = merge(
      ellipse(TOOTH_W, TOOTH_H, 20, 40, 19, 30),
      ellipse(TOOTH_W, TOOTH_H, 44, 40, 19, 30),
      rect(TOOTH_W, TOOTH_H, 2, 26, 60, 42)
    );
    const roots = merge(
      rect(TOOTH_W, TOOTH_H, 10, 60, 16, 30, 6),
      rect(TOOTH_W, TOOTH_H, 38, 60, 16, 30, 6)
    );
    const seam = merge(rect(TOOTH_W, TOOTH_H, 30, 8, 4, 26), rect(TOOTH_W, TOOTH_H, 8, 58, 48, 2));

    const shape = subtract(merge(crown, roots), seam);
    // Los de arriba cuelgan: se dibujan del revés.
    const oriented = isTop ? [...shape].reverse() : shape;

    drawSprite(ctx, `bg:tooth:art:${stage}:${isTop}`, shadeMask(oriented, getStagePalette(stage).toothRamp), 0, 0);
  });

/** Capa 4: encías de primer plano, arriba y abajo. */
const gumsLayer = (stage: number) =>
  bake(`bg:gums:${stage}`, CANVAS_WIDTH, CANVAS_HEIGHT, (ctx) => {
    const palette = getStagePalette(stage);
    const gum = palette.gumRamp;

    ditherBand(ctx, 0, 0, CANVAS_WIDTH, 26, `${gum}.out`, `${gum}.dark`, 6);
    ditherBand(ctx, 0, CANVAS_HEIGHT - 26, CANVAS_WIDTH, 26, `${gum}.dark`, `${gum}.out`, 6);

    // Festón de la encía: un arco por cada diente.
    for (let x = -32; x < CANVAS_WIDTH + 32; x += 32) {
      arch(ctx, x, 26, 32, 10, `${gum}.dark`, `${gum}.mid`, false);
      arch(ctx, x, CANVAS_HEIGHT - 36, 32, 10, `${gum}.mid`, `${gum}.dark`, true);
    }
  });

/** Arco de encía entre dos dientes. */
const arch = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: PaletteKey,
  edge: PaletteKey,
  up: boolean
) => {
  for (let i = 0; i < w; i++) {
    const t = (i / (w - 1)) * 2 - 1;
    const depth = Math.round((1 - t * t) * h);
    if (depth <= 0) continue;
    if (up) px(ctx, x + i, y + h - depth, 1, depth, base);
    else px(ctx, x + i, y, 1, depth, base);
  }
  px(ctx, x, up ? y + h - 1 : y, w, 1, edge);
};

export const drawBackground = (ctx: CanvasRenderingContext2D, cameraX: number, stage: number) => {
  // Garganta: fija, es el fondo del fondo.
  blit(ctx, throatLayer(stage), 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Dentista: parallax muy lento, como si estuviera lejos. Se estampa a escala
  // reducida porque a tamaño completo su cabeza se comía la pantalla.
  const dentist = dentistLayer(stage);
  const dw = Math.round(dentist.width * 0.62);
  const dh = Math.round(dentist.height * 0.62);
  blit(ctx, dentist, CANVAS_WIDTH / 2 - dw / 2 - cameraX * 0.04, 56, dw, dh);

  // Hilera de molares superior, colgando de la arcada. Solo arriba: abajo la
  // lengua ya hace de mandíbula y una segunda hilera quedaba tapada por el suelo.
  const offset = -((cameraX * 0.2) % TOOTH_W);
  const top = backgroundTooth(stage, true);
  for (let x = offset - TOOTH_W; x < CANVAS_WIDTH + TOOTH_W; x += TOOTH_W) {
    blit(ctx, top, x, 24, TOOTH_W, TOOTH_H);
  }

  // Encías: primer plano, fijas al borde de la pantalla.
  blit(ctx, gumsLayer(stage), 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

// --- Plataformas -----------------------------------------------------------

const TILE = 32;

/** Baldosa de lengua: la superficie del suelo, con papilas. */
const tongueTile = () =>
  bake('platform:tongue', TILE, 64, (ctx) => {
    px(ctx, 0, 0, TILE, 64, 'tongue.mid');
    px(ctx, 0, 0, TILE, 2, 'tongue.light');
    px(ctx, 0, 2, TILE, 1, 'tongue.hi');
    ditherFill(ctx, 0, 3, TILE, 10, 'tongue.mid', 'tongue.light', 6);
    ditherFill(ctx, 0, 13, TILE, 26, 'tongue.mid', 'tongue.dark', 8);
    ditherFill(ctx, 0, 39, TILE, 25, 'tongue.dark', 'tongue.out', 10);

    // Papilas: puntitos regulares, más marcados arriba.
    for (let y = 6; y < 40; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 4 : 12; x < TILE; x += 16) {
        px(ctx, x, y, 2, 2, 'tongue.light');
        px(ctx, x, y + 2, 2, 1, 'tongue.dark');
      }
    }
  });

/** Baldosa de aparato dental: alambre y bracket sobre esmalte. */
const bracesTile = () =>
  bake('platform:braces', TILE, 20, (ctx) => {
    const body = rect(TILE, 20, 0, 2, TILE, 16, 2);
    drawSprite(ctx, 'platform:braces:art', shadeMask(body, 'enamel'), 0, 0);

    // Alambre horizontal.
    px(ctx, 0, 9, TILE, 2, 'metal.dark');
    px(ctx, 0, 9, TILE, 1, 'metal.light');

    // Bracket centrado.
    const bracket = rect(14, 14, 0, 0, 14, 14, 3);
    drawSprite(ctx, 'platform:braces:bracket', shadeMask(bracket, 'metal'), 9, 3);
    px(ctx, 13, 7, 4, 4, 'metal.hi');
  });

export const drawPlatforms = (ctx: CanvasRenderingContext2D, platforms: Platform[]) => {
  const tongue = tongueTile();
  const braces = bracesTile();

  platforms.forEach((p) => {
    if (p.isGround) {
      for (let x = 0; x < p.w; x += TILE) {
        const w = Math.min(TILE, p.w - x);
        // Se recorta la baldosa al ancho que queda, para no pasarse del borde.
        ctx.drawImage(tongue, 0, 0, w, 64, Math.round(p.x + x), Math.round(p.y), w, 64);
      }
    } else {
      for (let x = 0; x < p.w; x += TILE) {
        const w = Math.min(TILE, p.w - x);
        ctx.drawImage(braces, 0, 0, w, 20, Math.round(p.x + x), Math.round(p.y), w, 20);
      }
    }
  });
};

// --- Transición entre fases ------------------------------------------------

const JAW_TOOTH_W = 40;
const JAW_TOOTH_H = 56;

const jawTooth = (isTop: boolean) =>
  bake(`jaw:tooth:${isTop ? 'top' : 'bottom'}`, JAW_TOOTH_W, JAW_TOOTH_H, (ctx) => {
    const crown = merge(
      ellipse(JAW_TOOTH_W, JAW_TOOTH_H, 13, 22, 12, 18),
      ellipse(JAW_TOOTH_W, JAW_TOOTH_H, 27, 22, 12, 18),
      rect(JAW_TOOTH_W, JAW_TOOTH_H, 2, 14, 36, 26)
    );
    const root = rect(JAW_TOOTH_W, JAW_TOOTH_H, 10, 34, 20, 22, 6);
    const shape = merge(crown, root);
    const oriented = isTop ? shape : [...shape].reverse();
    drawSprite(ctx, `jaw:tooth:art:${isTop}`, shadeMask(oriented, 'enamel'), 0, 0);
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

  // Dientes colgando de cada arcada.
  const topTooth = jawTooth(true);
  const bottomTooth = jawTooth(false);
  for (let x = -JAW_TOOTH_W; x < CANVAS_WIDTH + JAW_TOOTH_W; x += JAW_TOOTH_W) {
    const arcOffset = Math.round(Math.sin((x / CANVAS_WIDTH) * Math.PI) * 14);
    blit(ctx, topTooth, x, topY - JAW_TOOTH_H + arcOffset, JAW_TOOTH_W, JAW_TOOTH_H);
    blit(ctx, bottomTooth, x, botY - arcOffset, JAW_TOOTH_W, JAW_TOOTH_H);
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

/** `spike` se reexporta porque el fondo lo usa al componer piezas. */
export { spike };
