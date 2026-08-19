import { tone, type PaletteKey } from '../data/palette';
import { px, type PixelTarget } from './pixel';

/**
 * Tramado ordenado: lo que sustituye a los degradados.
 *
 * Un degradado de Canvas interpola cientos de colores y al reescalar el lienzo
 * queda sucio. El pixel art resuelve la transición entre dos tonos mezclándolos
 * en un patrón regular, y la matriz de Bayer 4×4 es el patrón clásico: para cada
 * nivel de 0 a 16 decide qué píxeles del bloque de 4×4 llevan el segundo tono.
 */

// La matriz vive en `sprites/shade.ts`, que la necesita sin poder importar nada.
export { BAYER_4 } from './sprites/shade';
import { BAYER_4 } from './sprites/shade';

export const DITHER_LEVELS = 17; // 0 = todo A, 16 = todo B

/**
 * Máscara de 4×4 para un nivel: `true` donde va el segundo tono.
 *
 * Función pura, y la parte del tramado que se puede testear sin lienzo.
 */
export const bayerMask = (level: number): boolean[][] => {
  const clamped = Math.max(0, Math.min(DITHER_LEVELS - 1, Math.round(level)));
  return BAYER_4.map((row) => row.map((threshold) => threshold < clamped));
};

/** Cuántos píxeles de 16 llevan el segundo tono en ese nivel. */
export const bayerCoverage = (level: number): number =>
  bayerMask(level)
    .flat()
    .filter(Boolean).length;

/**
 * Rellena un rectángulo con dos tonos tramados.
 *
 * Dibuja el tono base de una vez y luego solo los píxeles del segundo tono, así
 * que el coste crece con el área: está pensado para lienzos horneados una sola
 * vez (fondos, tiles), no para pintarse en cada frame.
 *
 * El patrón se ancla a coordenadas absolutas del lienzo, no al rectángulo, para
 * que dos rectángulos contiguos con el mismo nivel encajen sin costura.
 */
export const dither = (
  ctx: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  base: PaletteKey,
  over: PaletteKey,
  level: number
) => {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;

  px(ctx, rx, ry, rw, rh, base);

  const coverage = bayerCoverage(level);
  if (coverage === 0) return;
  if (coverage === 16) {
    px(ctx, rx, ry, rw, rh, over);
    return;
  }

  const mask = bayerMask(level);
  ctx.fillStyle = tone(over);

  for (let py = ry; py < ry + rh; py++) {
    const maskRow = mask[((py % 4) + 4) % 4];
    for (let pxx = rx; pxx < rx + rw; pxx++) {
      if (maskRow[((pxx % 4) + 4) % 4]) ctx.fillRect(pxx, py, 1, 1);
    }
  }
};

/**
 * Versión rápida del tramado, para superficies grandes.
 *
 * `dither` pinta un rectángulo de 1×1 por píxel, y eso son 180.000 llamadas para
 * una capa de fondo a pantalla completa. Aquí el patrón de 4×4 se construye una
 * vez como textura y se repite con **una** llamada. El patrón se ancla al origen
 * del lienzo, así que dos rectángulos contiguos siguen encajando sin costura.
 *
 * Necesita un contexto de verdad (`createPattern`); con uno de pega cae en el
 * camino lento, que es lo que quieren los tests.
 */
const patterns = new Map<string, CanvasPattern | null>();

const ditherPattern = (
  ctx: CanvasRenderingContext2D,
  over: PaletteKey,
  level: number
): CanvasPattern | null => {
  const key = `${over}:${Math.round(level)}`;
  const cached = patterns.get(key);
  if (cached !== undefined) return cached;

  let pattern: CanvasPattern | null = null;
  if (typeof document !== 'undefined' && typeof ctx.createPattern === 'function') {
    const tile = document.createElement('canvas');
    tile.width = 4;
    tile.height = 4;
    const tileCtx = tile.getContext('2d');
    if (tileCtx) {
      const mask = bayerMask(level);
      tileCtx.fillStyle = tone(over);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) if (mask[y][x]) tileCtx.fillRect(x, y, 1, 1);
      }
      pattern = ctx.createPattern(tile, 'repeat');
    }
  }

  patterns.set(key, pattern);
  return pattern;
};

export const ditherFill = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: PaletteKey,
  over: PaletteKey,
  level: number
) => {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;

  const coverage = bayerCoverage(level);
  px(ctx, rx, ry, rw, rh, coverage === 16 ? over : base);
  if (coverage === 0 || coverage === 16) return;

  const pattern = ditherPattern(ctx, over, level);
  if (!pattern) {
    dither(ctx, rx, ry, rw, rh, base, over, level);
    return;
  }

  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.restore();
};

/**
 * Tramado **sin fondo**: pinta solo los píxeles del patrón y deja el resto como
 * estaba.
 *
 * `dither` y `ditherFill` rellenan primero con `base`, así que siempre tapan.
 * Para una capa que va *encima* de otras —la viñeta de las mejillas, el vaho, las
 * manchas de sarro— eso no sirve: haría falta saber qué hay debajo. Aquí el nivel
 * hace de opacidad, y como la retícula es la misma de 4×4 anclada a coordenadas
 * absolutas, dos rectángulos contiguos siguen encajando.
 */
export const ditherOver = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  over: PaletteKey,
  level: number
) => {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;

  const coverage = bayerCoverage(level);
  if (coverage === 0) return;
  if (coverage === 16) {
    px(ctx, rx, ry, rw, rh, over);
    return;
  }

  const pattern = ditherPattern(ctx, over, level);
  if (pattern) {
    ctx.save();
    ctx.fillStyle = pattern;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
    return;
  }

  // Sin `createPattern` (entorno de test): píxel a píxel con la misma retícula.
  const mask = bayerMask(level);
  for (let py = ry; py < ry + rh; py++) {
    for (let pxx = rx; pxx < rx + rw; pxx++) {
      if (mask[((py % 4) + 4) % 4][((pxx % 4) + 4) % 4]) px(ctx, pxx, py, 1, 1, over);
    }
  }
};

/**
 * Banda degradada de `base` a `over` en `steps` tramos tramados.
 *
 * Es el recurso principal de los fondos: sustituye a `createRadialGradient` y a
 * `createLinearGradient` sin dejar de verse como pixel art.
 */
export const ditherBand = (
  ctx: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  base: PaletteKey,
  over: PaletteKey,
  steps = 8,
  vertical = true
) => {
  const bands = Math.max(1, Math.round(steps));
  const span = vertical ? Math.round(h) : Math.round(w);
  if (span <= 0) return;

  for (let i = 0; i < bands; i++) {
    const from = Math.round((span * i) / bands);
    const to = Math.round((span * (i + 1)) / bands);
    const level = Math.round(((DITHER_LEVELS - 1) * i) / (bands - 1 || 1));

    if (vertical) dither(ctx, x, y + from, w, to - from, base, over, level);
    else dither(ctx, x + from, y, to - from, h, base, over, level);
  }
};
