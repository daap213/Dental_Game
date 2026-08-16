import { tone, type PaletteKey } from '../data/palette';

/**
 * Primitivas de dibujado en rejilla de píxeles.
 *
 * Todo lo que se pinte con esto cae en coordenadas enteras, que es la condición
 * para que el pixel art se vea nítido: un rectángulo en x=10,5 se dibuja con
 * antialias y deja bordes sucios al reescalar el lienzo.
 *
 * Nada de `shadowBlur`, degradados ni `globalCompositeOperation`: el volumen se
 * consigue con los cuatro tonos de cada rampa (`data/palette.ts`) y con tramado
 * (`dither.ts`).
 */

/** Contexto mínimo que necesitan estas primitivas. Facilita testearlas. */
export interface PixelTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Rectángulo de un tono, alineado a la rejilla. */
export const px = (
  ctx: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  key: PaletteKey
) => {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = tone(key);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** Línea horizontal de 1 px. */
export const hline = (ctx: PixelTarget, x: number, y: number, w: number, key: PaletteKey) =>
  px(ctx, x, y, w, 1, key);

/** Línea vertical de 1 px. */
export const vline = (ctx: PixelTarget, x: number, y: number, h: number, key: PaletteKey) =>
  px(ctx, x, y, 1, h, key);

/**
 * Contorno de 1 px alrededor de un rectángulo, sin rellenarlo.
 *
 * Se dibuja con cuatro rectángulos en vez de `strokeRect` porque el trazo de
 * Canvas se centra en la coordenada y reparte medio píxel a cada lado.
 */
export const outline = (
  ctx: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  key: PaletteKey
) => {
  if (w <= 0 || h <= 0) return;
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);

  px(ctx, rx, ry, rw, 1, key);
  px(ctx, rx, ry + rh - 1, rw, 1, key);
  px(ctx, rx, ry + 1, 1, rh - 2, key);
  px(ctx, rx + rw - 1, ry + 1, 1, rh - 2, key);
};

/**
 * Rectángulo relleno con contorno: el bloque básico del estilo.
 *
 * `fill` es el tono de dentro; `border` el del contorno, que por defecto es el
 * `out` del mismo material.
 */
export const block = (
  ctx: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: PaletteKey,
  border?: PaletteKey
) => {
  px(ctx, x, y, w, h, fill);
  outline(ctx, x, y, w, h, border ?? (`${fill.slice(0, fill.indexOf('.'))}.out` as PaletteKey));
};

/**
 * Estampa un lienzo ya horneado, opcionalmente espejado.
 *
 * Las coordenadas se redondean aquí: las entidades se mueven en flotantes y sin
 * este redondeo el sprite se interpola medio píxel y pierde nitidez.
 */
export const blit = (
  ctx: CanvasRenderingContext2D,
  baked: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  flip = false
) => {
  const rx = Math.round(x);
  const ry = Math.round(y);

  if (!flip) {
    ctx.drawImage(baked, rx, ry, w, h);
    return;
  }

  ctx.save();
  ctx.translate(rx + w, ry);
  ctx.scale(-1, 1);
  ctx.drawImage(baked, 0, 0, w, h);
  ctx.restore();
};

/**
 * Prepara un contexto para pixel art: sin interpolación al estampar sprites.
 *
 * Hay que llamarlo cada vez que se obtiene un contexto (no se hereda del CSS
 * `image-rendering`, que solo afecta al escalado final del elemento).
 */
export const setupPixelContext = (ctx: CanvasRenderingContext2D) => {
  ctx.imageSmoothingEnabled = false;
};

/**
 * Lienzo fuera de pantalla, horneado una sola vez y memoizado por id.
 *
 * Un sprite de 32×32 son hasta 1.024 rectángulos: pagarlos en cada frame no es
 * viable, y pagarlos una vez sí. Además es justo la propiedad que pide el port a
 * Phaser, donde cada horneado pasa a ser una textura.
 */
const cache = new Map<string, HTMLCanvasElement>();

export const bake = (
  id: string,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement => {
  const hit = cache.get(id);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));

  const ctx = canvas.getContext('2d');
  if (ctx) {
    setupPixelContext(ctx);
    paint(ctx);
  }

  cache.set(id, canvas);
  return canvas;
};

/** Vacía la caché de horneado. Solo lo necesitan la galería y los tests. */
export const clearBakeCache = () => cache.clear();

/** Cuántos sprites hay horneados ahora mismo. Para depurar. */
export const bakedCount = () => cache.size;
