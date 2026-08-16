import type { Material } from '../../data/palette';
import type { SpriteDef } from './format';

/**
 * Sombreado automático de una silueta.
 *
 * Dibujar a mano el contorno y los tres tonos de cada sprite es lento y, peor,
 * sale distinto en cada uno: la luz acaba viniendo de un lado en un enemigo y de
 * otro en el siguiente. Aquí se dibuja **solo la silueta** —un carácter para
 * lleno y otro para vacío, que es lo fácil de acertar— y el sombreado lo pone
 * esta función con la misma regla para todo el juego:
 *
 *   · contorno en todo píxel lleno que toque el vacío o el borde,
 *   · tono claro justo por dentro del contorno de arriba y de la izquierda,
 *   · tono oscuro justo por dentro del contorno de abajo y de la derecha,
 *   · tono medio en el resto.
 *
 * Es decir: luz desde arriba a la izquierda, igual en todos los sprites. Los
 * detalles que no salen de la silueta (ojos, cintas, dientes) se pintan encima
 * con su propia matriz.
 */

export const SOLID = '#';
export const EMPTY = '.';

/** Caracteres que produce el sombreado, en el orden de la rampa. */
const OUT = 'o';
const LIGHT = '1';
const MID = '2';
const DARK = '3';

const at = (mask: readonly string[], x: number, y: number): boolean =>
  y >= 0 && y < mask.length && x >= 0 && x < mask[y].length && mask[y][x] === SOLID;

/** Grosor del reborde iluminado y del sombreado, en píxeles. */
export const RIM = 2;

/**
 * A cuántos píxeles está el vacío en esa dirección, hasta un tope.
 * 0 significa que el píxel de al lado ya es vacío, o sea que este es contorno.
 */
const distanceToEdge = (
  mask: readonly string[],
  x: number,
  y: number,
  dx: number,
  dy: number
): number => {
  for (let d = 1; d <= RIM + 1; d++) {
    if (!at(mask, x + dx * d, y + dy * d)) return d - 1;
  }
  return RIM + 1;
};

/**
 * Superpone varias siluetas en una.
 *
 * Los sprites del jugador se montan así: la corona depende de la clase de diente
 * y el cuerpo de la pose, y se unen **antes** de sombrear para que el contorno y
 * la luz sean continuos en la costura.
 */
export const unionMasks = (...masks: readonly (readonly string[])[]): string[] => {
  const h = masks.reduce((max, m) => Math.max(max, m.length), 0);
  const w = masks.reduce(
    (max, m) => m.reduce((rowMax, row) => Math.max(rowMax, row.length), max),
    0
  );

  return Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      row += masks.some((m) => (m[y] ?? '')[x] === SOLID) ? SOLID : EMPTY;
    }
    return row;
  });
};

export const shadeMask = (
  mask: readonly string[],
  material: Material,
  offset?: { x?: number; y?: number }
): SpriteDef => {
  const h = mask.length;
  const w = mask.reduce((max, row) => Math.max(max, row.length), 0);

  const rows = mask.map((_row, y) => {
    let out = '';
    for (let x = 0; x < w; x++) {
      if (!at(mask, x, y)) {
        out += EMPTY;
        continue;
      }

      const up = distanceToEdge(mask, x, y, 0, -1);
      const down = distanceToEdge(mask, x, y, 0, 1);
      const left = distanceToEdge(mask, x, y, -1, 0);
      const right = distanceToEdge(mask, x, y, 1, 0);

      if (up === 0 || down === 0 || left === 0 || right === 0) {
        out += OUT;
        continue;
      }

      // Un píxel de dentro: el tono lo decide lo cerca que esté de cada borde.
      // Empate a favor de la luz, que viene de arriba a la izquierda.
      const toLight = Math.min(up, left);
      const toDark = Math.min(down, right);

      if (toLight <= RIM && toLight <= toDark) out += LIGHT;
      else if (toDark <= RIM) out += DARK;
      else out += MID;
    }
    return out;
  });

  return {
    w,
    h,
    rows,
    map: {
      [OUT]: `${material}.out`,
      [LIGHT]: `${material}.light`,
      [MID]: `${material}.mid`,
      [DARK]: `${material}.dark`,
    },
    offsetX: offset?.x,
    offsetY: offset?.y,
  };
};

/**
 * Une la silueta sombreada con una capa de detalle encima.
 *
 * El detalle se escribe en la misma rejilla y con su propio mapa de colores, así
 * que puede usar materiales distintos: los ojos son metal, la cinta es candy.
 */
export const withDetails = (base: SpriteDef, details: SpriteDef): SpriteDef => {
  const rows = base.rows.map((row, y) => {
    const overlay = details.rows[y] ?? '';
    let out = '';
    for (let x = 0; x < row.length; x++) {
      const over = overlay[x];
      out += over && over !== EMPTY ? over : row[x];
    }
    return out;
  });

  return { ...base, rows, map: { ...base.map, ...details.map } };
};
