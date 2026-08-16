import { isPaletteKey, tone, type PaletteKey } from '../../data/palette';
import { bake, blit, type PixelTarget } from '../pixel';

/**
 * Formato de los sprites dibujados a mano.
 *
 * Cada sprite es una rejilla de caracteres, un carácter por píxel, y un mapa de
 * carácter a tono de la paleta. Se escribe y se lee como un dibujo, que es
 * exactamente lo que hace falta para afinar detalle a 24-32 px:
 *
 *     rows: [
 *       '..####..',
 *       '.#1122#.',
 *       '#112233#',
 *     ],
 *     map: { '#': 'bacteria.out', '1': 'bacteria.light', '2': 'bacteria.mid', '3': 'bacteria.dark' },
 *
 * El punto siempre es transparente. Los jefes y los fondos NO usan este formato:
 * son demasiado grandes para una matriz a mano y se dibujan con las primitivas de
 * `pixel.ts` sobre la misma rejilla.
 */

export const TRANSPARENT = '.';

export interface SpriteDef {
  /** Ancho y alto en píxeles lógicos. Deben coincidir con `rows`. */
  w: number;
  h: number;
  rows: readonly string[];
  map: Readonly<Record<string, PaletteKey>>;
  /**
   * Desplazamiento del dibujo respecto al hitbox de la entidad. Existe para las
   * siluetas que sobresalen a propósito (las alas del bombardero, el escudo del
   * gingivitis): el hitbox no cambia, solo el dibujo.
   */
  offsetX?: number;
  offsetY?: number;
}

/**
 * Pinta el sprite en el origen del contexto.
 *
 * Agrupa los píxeles contiguos del mismo color en un solo rectángulo: baja de
 * hasta 1.024 llamadas a unas decenas, y como esto corre al hornear, cada sprite
 * lo paga una vez.
 */
export const paintSprite = (ctx: PixelTarget, def: SpriteDef) => {
  def.rows.forEach((row, y) => {
    let runStart = -1;
    let runChar = TRANSPARENT;

    const flush = (end: number) => {
      if (runStart < 0 || runChar === TRANSPARENT) return;
      const key = def.map[runChar];
      if (key) {
        ctx.fillStyle = tone(key);
        ctx.fillRect(runStart, y, end - runStart, 1);
      }
      runStart = -1;
    };

    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char !== runChar) {
        flush(x);
        runChar = char;
        runStart = char === TRANSPARENT ? -1 : x;
      }
    }
    flush(row.length);
  });
};

/** Hornea el sprite una vez y lo estampa. `id` es la clave de caché. */
export const drawSprite = (
  ctx: CanvasRenderingContext2D,
  id: string,
  def: SpriteDef,
  x: number,
  y: number,
  flip = false
) => {
  const baked = bake(id, def.w, def.h, (c) => paintSprite(c, def));
  blit(ctx, baked, x + (def.offsetX ?? 0), y + (def.offsetY ?? 0), def.w, def.h, flip);
};

/**
 * Comprueba que el sprite está bien escrito. Devuelve la lista de problemas.
 *
 * Los tests lo pasan por todos los sprites del juego: una fila corta o un
 * carácter sin color son errores que si no se ven como un hueco raro a medio
 * píxel y cuestan mucho de encontrar a ojo.
 */
export const validateSprite = (def: SpriteDef): string[] => {
  const problems: string[] = [];

  if (def.rows.length !== def.h) {
    problems.push(`declara h=${def.h} pero tiene ${def.rows.length} filas`);
  }

  def.rows.forEach((row, y) => {
    if (row.length !== def.w) {
      problems.push(`fila ${y} mide ${row.length}, se esperaba w=${def.w}`);
    }
    for (const char of row) {
      if (char === TRANSPARENT) continue;
      const key = def.map[char];
      if (!key) problems.push(`fila ${y}: el carácter '${char}' no está en map`);
      else if (!isPaletteKey(key)) problems.push(`el carácter '${char}' apunta a '${key}', que no existe en la paleta`);
    }
  });

  for (const [char, key] of Object.entries(def.map)) {
    if (char === TRANSPARENT) problems.push(`'${TRANSPARENT}' es transparente y no puede mapearse`);
    if (!isPaletteKey(key)) problems.push(`map['${char}'] apunta a '${key}', que no existe en la paleta`);
  }

  return problems;
};
