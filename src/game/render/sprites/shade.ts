import type { Material } from '../../data/palette';
import type { SpriteDef } from './format';

/**
 * Matriz de Bayer 4×4, valores 0-15. Vive aquí y no en `dither.ts` para que este
 * módulo no importe nada con valores en tiempo de ejecución: así el sombreado se
 * puede previsualizar en terminal sin arrastrar el resto del render.
 */
export const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/**
 * Sombreado automático de una silueta.
 *
 * Se dibuja **solo la forma** —un carácter para lleno y otro para vacío, que es
 * lo fácil de acertar— y el volumen lo pone esta función. Tener una sola regla
 * para todo el juego es lo que hace que la luz no se contradiga de un personaje
 * a otro, y permite cambiar el aspecto de todo el arte tocando un sitio.
 *
 * El modelo es deliberadamente simple pero se comporta como una superficie:
 *
 *   1. Para cada píxel se mide a qué distancia está el vacío hacia arriba, abajo,
 *      izquierda y derecha. `rim` es lo cerca que está del borde iluminado
 *      (arriba-izquierda) y `back` del borde en sombra (abajo-derecha).
 *   2. `(back - rim) / (back + rim)` da un valor de -1 a 1 que se comporta como
 *      la inclinación de la superficie respecto a la luz: cerca del borde
 *      iluminado sale positivo, cerca del de sombra negativo, y en el centro de
 *      una masa gruesa queda en medio.
 *   3. Ese valor se reparte entre los cinco tonos de relleno de la rampa, y la
 *      parte fraccionaria se resuelve **tramando** entre los dos tonos vecinos.
 *      Eso es lo que evita las bandas planas y hace que la superficie parezca
 *      curva en lugar de escalonada.
 *   4. Las zonas finas y los pliegues (poco grosor por los dos lados) se oscurecen
 *      un paso: es la oclusión que da profundidad a las grietas y a los huecos
 *      entre raíces.
 *   5. El contorno es **selectivo**: duro (`out`) en el lado en sombra y suave
 *      (`shade`) en el iluminado. Un contorno negro uniforme aplana la silueta;
 *      abrirlo por donde entra la luz es lo que hace que el sprite tenga bulto.
 */

export const SOLID = '#';
export const EMPTY = '.';

/** Caracteres que produce el sombreado. */
const CH_OUT = 'o';
const CH_SHADE = 's';
const CH_DARK = '3';
const CH_MID = '2';
const CH_LIGHT = '1';
const CH_HI = '0';

/** Tonos de relleno del más oscuro al más claro, con su carácter. */
const FILL: readonly { ch: string; tone: string }[] = [
  { ch: CH_SHADE, tone: 'shade' },
  { ch: CH_DARK, tone: 'dark' },
  { ch: CH_MID, tone: 'mid' },
  { ch: CH_LIGHT, tone: 'light' },
  { ch: CH_HI, tone: 'hi' },
];

/** Franja de mezcla entre dos tonos. Fuera de ella se usa el tono más cercano. */
const DITHER_FROM = 0.32;
const DITHER_TO = 0.68;

const at = (mask: readonly string[], x: number, y: number): boolean =>
  y >= 0 && y < mask.length && x >= 0 && x < mask[y].length && mask[y][x] === SOLID;

/**
 * Cuántos píxeles llenos seguidos hay en cada dirección desde cada píxel.
 *
 * Se calcula en cuatro barridos en lugar de mirando píxel a píxel: además de ser
 * más rápido, **no tiene tope**, y eso es lo que permite que un jefe de 160 px se
 * sombree entero. Con un tope de 8, el interior de cualquier cuerpo grueso salía
 * todo del mismo tono medio y los jefes quedaban planos.
 */
interface Distances {
  up: number[][];
  down: number[][];
  left: number[][];
  right: number[][];
}

const distances = (mask: readonly string[], w: number, h: number): Distances => {
  const grid = (): number[][] => Array.from({ length: h }, () => new Array<number>(w).fill(0));
  const up = grid();
  const down = grid();
  const left = grid();
  const right = grid();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(mask, x, y)) continue;
      up[y][x] = y > 0 && at(mask, x, y - 1) ? up[y - 1][x] + 1 : 0;
      left[y][x] = x > 0 && at(mask, x - 1, y) ? left[y][x - 1] + 1 : 0;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      if (!at(mask, x, y)) continue;
      down[y][x] = y < h - 1 && at(mask, x, y + 1) ? down[y + 1][x] + 1 : 0;
      right[y][x] = x < w - 1 && at(mask, x + 1, y) ? right[y][x + 1] + 1 : 0;
    }
  }

  return { up, down, left, right };
};

export interface ShadeOptions {
  /**
   * Empuja todo el sprite hacia la luz o hacia la sombra, de -1 a 1. Sirve para
   * que un mismo material se lea más claro o más oscuro sin cambiar la rampa:
   * un enemigo al fondo, una versión herida, una fase enfurecida.
   */
  bias?: number;
  /** Desplazamiento del dibujo respecto al hitbox de la entidad. */
  offsetX?: number;
  offsetY?: number;
}

export const shadeMask = (
  mask: readonly string[],
  material: Material,
  options: ShadeOptions = {}
): SpriteDef => {
  const h = mask.length;
  const w = mask.reduce((max, row) => Math.max(max, row.length), 0);
  const bias = options.bias ?? 0;

  const dist = distances(mask, w, h);

  const rows = mask.map((_row, y) => {
    let out = '';

    for (let x = 0; x < w; x++) {
      if (!at(mask, x, y)) {
        out += EMPTY;
        continue;
      }

      const up = dist.up[y][x];
      const down = dist.down[y][x];
      const left = dist.left[y][x];
      const right = dist.right[y][x];

      // Borde: contorno selectivo. Duro donde la luz no llega, suave donde sí.
      if (up === 0 || down === 0 || left === 0 || right === 0) {
        const shadowSide = down === 0 || right === 0;
        out += shadowSide ? CH_OUT : CH_SHADE;
        continue;
      }

      const rim = Math.min(up, left);
      const back = Math.min(down, right);

      // Inclinación aparente de la superficie respecto a la luz.
      let level = 0.5 + (0.5 * (back - rim)) / (back + rim) + bias * 0.5;

      // Pliegues y zonas finas: sin grosor no entra luz.
      const thin = Math.min(up + down, left + right);
      if (thin <= 3) level -= 0.22;
      else if (thin <= 5) level -= 0.1;

      const clamped = Math.max(0, Math.min(1, level));
      const scaled = clamped * (FILL.length - 1);
      const lower = Math.floor(scaled);
      const frac = scaled - lower;

      // La parte fraccionaria se trama entre los dos tonos vecinos, pero **solo
      // en la franja intermedia**: tramar también lo que está casi en un tono
      // llena el sprite de motas y a 32 px eso se lee como ruido, no como
      // superficie. Fuera de esa franja se elige el tono más cercano.
      let index: number;
      if (frac <= DITHER_FROM) index = lower;
      else if (frac >= DITHER_TO) index = lower + 1;
      else {
        const threshold = BAYER_4[((y % 4) + 4) % 4][((x % 4) + 4) % 4];
        index = frac * 16 > threshold ? lower + 1 : lower;
      }

      out += FILL[Math.min(index, FILL.length - 1)].ch;
    }

    return out;
  });

  return {
    w,
    h,
    rows,
    map: {
      [CH_OUT]: `${material}.out`,
      ...Object.fromEntries(FILL.map(({ ch, tone }) => [ch, `${material}.${tone}`])),
    },
    offsetX: options.offsetX,
    offsetY: options.offsetY,
  } as SpriteDef;
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

/**
 * Une la silueta sombreada con una capa de detalle encima.
 *
 * El detalle se escribe en la misma rejilla y con su propio mapa de colores, así
 * que puede usar materiales distintos: los ojos son metal, la cinta es candy, y
 * el brillo del esmalte es su propio tono.
 */
export const withDetails = (base: SpriteDef, ...layers: SpriteDef[]): SpriteDef => {
  let rows = base.rows;
  let map = { ...base.map };

  for (const layer of layers) {
    rows = rows.map((row, y) => {
      const overlay = layer.rows[y] ?? '';
      let out = '';
      for (let x = 0; x < row.length; x++) {
        const over = overlay[x];
        // El detalle se recorta a la silueta: si ahí no hay sprite, no se pinta.
        // Así una misma capa de cara sirve para coronas de formas distintas sin
        // dejar píxeles flotando en el aire.
        const inside = row[x] !== EMPTY;
        out += over && over !== EMPTY && inside ? over : row[x];
      }
      return out;
    });
    map = { ...map, ...layer.map };
  }

  return { ...base, rows, map };
};
