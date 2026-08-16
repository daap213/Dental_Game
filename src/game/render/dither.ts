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

/** Matriz de Bayer 4×4, valores 0-15. */
export const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

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
