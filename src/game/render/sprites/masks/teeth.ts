import { BAYER_4 } from '../../dither';
import { blank, ellipse, merge, rect, subtract } from './shapes';

/**
 * Dientes vistos **desde dentro de la boca**.
 *
 * Es la corrección de realismo más importante del rediseño. El diente anterior era
 * el de un libro de texto en corte lateral —corona más dos raíces— y se repetía en
 * cada pieza de la pantalla. **Desde dentro de una boca las raíces no se ven nunca:
 * están dentro del hueso.** Solo hay corona, y la superficie de mordida.
 *
 * Dos vistas, ninguna con raíz:
 *
 * - **Superior.** Cuelga del techo, así que se ve su cara lingual de frente y, por
 *   debajo, la franja de la superficie de mordida con sus cúspides. Termina en el
 *   borde de mordida, no en punta, y arriba está **a ras**: ahí empieza la encía.
 * - **Inferior.** Se ve desde arriba, así que lo primero es la superficie de mordida
 *   —las cúspides y el surco entre ellas— y por debajo un poco de cara lingual
 *   bajando hacia la encía. A ras por abajo, por lo mismo.
 *
 * Tres clases de pieza, que `data/opening.ts` elige según la profundidad: el
 * incisivo del centro es estrecho y de borde recto; el molar del borde es ancho y
 * tiene cuatro cúspides.
 */

export type ToothKind = 'incisor' | 'premolar' | 'molar';

/** Cuántas cúspides tiene la superficie de mordida de cada clase. */
const CUSPS: Record<ToothKind, number> = { incisor: 1, premolar: 2, molar: 4 };

/**
 * Cuánto de alto ocupa la superficie de mordida.
 *
 * Cuanto más cerca del borde de la pantalla está la pieza, más de arriba la vemos y
 * más superficie de mordida asoma. En el incisivo del centro casi no se ve: solo su
 * canto.
 */
const OCCLUSAL: Record<ToothKind, number> = { incisor: 0.16, premolar: 0.3, molar: 0.42 };

/**
 * El perfil de la corona.
 *
 * Ancha en el borde de mordida y algo más estrecha en el cuello, que es al revés de
 * como se dibuja un diente de perfil. Vista de frente, la corona es lo más ancho de
 * la pieza.
 */
const crown = (w: number, h: number, neck: number) => {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    // El estrechamiento va casi todo arriba, junto a la encía.
    const inset = Math.round(neck * (1 - t) ** 1.6);
    const left = inset;
    const right = w - inset;
    rows.push(
      Array.from({ length: w }, (_, x) => (x >= left && x < right ? '#' : '.')).join('')
    );
  }
  return rows;
};

/** Las cúspides: muescas en el canto que separan los lóbulos de la mordida. */
const cuspNotches = (w: number, h: number, kind: ToothKind, fromTop: boolean) => {
  const count = CUSPS[kind];
  if (count < 2) return blank(w, h);

  // Poco profundas: a 0,16 del alto los molares salían con almenas de castillo.
  const depth = Math.max(2, Math.round(h * 0.085));
  const notches = [];
  for (let i = 1; i < count; i++) {
    const x = Math.round((w * i) / count);
    // La muesca del centro es la más marcada: es el surco principal.
    const deep = count === 4 && i === 2 ? depth + 2 : depth;
    notches.push(rect(w, h, x - 1, fromTop ? 0 : h - deep, 2, deep, 0));
  }
  return merge(...notches);
};

/** Diente de la arcada **superior**: cuelga, y su mordida asoma por abajo. */
export const upperTooth = (w: number, h: number, kind: ToothKind): string[] => {
  const neck = Math.max(1, Math.round(w * 0.12));
  const body = crown(w, h, neck);

  // Las esquinas del borde de mordida se redondean un poco: un canto recto de lado a
  // lado parece un ladrillo.
  const round = Math.max(1, Math.round(w * 0.1));
  const corners = merge(
    subtract(rect(w, h, 0, h - round, round, round), ellipse(w, h, round, h - round, round, round)),
    subtract(
      rect(w, h, w - round, h - round, round, round),
      ellipse(w, h, w - round - 1, h - round, round, round)
    )
  );

  return subtract(subtract(body, cuspNotches(w, h, kind, false)), corners);
};

/** Diente de la arcada **inferior**: se ve desde arriba, mordida primero. */
export const lowerTooth = (w: number, h: number, kind: ToothKind): string[] => {
  const neck = Math.max(1, Math.round(w * 0.12));
  // El mismo perfil boca abajo: el cuello queda abajo, donde está la encía.
  const body = [...crown(w, h, neck)].reverse();

  const round = Math.max(1, Math.round(w * 0.1));
  const corners = merge(
    subtract(rect(w, h, 0, 0, round, round), ellipse(w, h, round, round, round, round)),
    subtract(rect(w, h, w - round, 0, round, round), ellipse(w, h, w - round - 1, round, round, round))
  );

  return subtract(subtract(body, cuspNotches(w, h, kind, true)), corners);
};

/**
 * La capa de detalle de la superficie de mordida: los surcos entre cúspides y el
 * brillo del esmalte mojado.
 *
 * Va aparte de la silueta porque `withDetails` la recorta a ella, así que no puede
 * ensuciar el contorno.
 */
export const occlusalDetail = (
  w: number,
  h: number,
  kind: ToothKind,
  fromTop: boolean
): string[] => {
  const band = Math.max(2, Math.round(h * OCCLUSAL[kind]));
  const rows: string[][] = Array.from({ length: h }, () => new Array<string>(w).fill('.'));
  const put = (x: number, y: number, ch: string) => {
    if (y >= 0 && y < h && x >= 0 && x < w) rows[y][x] = ch;
  };

  const top = fromTop ? 0 : h - band;

  // Surco principal, y los secundarios entre cúspide y cúspide.
  const count = CUSPS[kind];
  for (let i = 1; i < count; i++) {
    const x = Math.round((w * i) / count);
    for (let y = top + 1; y < top + band - 1; y++) {
      put(x - 1, y, 'S');
      put(x, y, 'S');
    }
  }

  // Canto de la mordida: la línea que separa la cara lingual de la superficie.
  const edge = fromTop ? top + band - 1 : top;
  for (let x = 1; x < w - 1; x++) put(x, edge, 'S');

  /**
   * Y la sombra que se cierra hacia la encía.
   *
   * Es lo que le faltaba: la luz entra por la abertura, o sea desde el lado de la
   * mordida, así que la corona tiene que apagarse hacia el otro extremo. Sin esto
   * `shadeMask` deja el interior de una silueta casi rectangular todo en el mismo
   * tono claro, y los dientes se leen como azulejos blancos pegados.
   */
  const gumRow = fromTop ? h - 1 : 0;
  const away = fromTop ? -1 : 1;
  const reach = Math.round((h - band) * 0.75);
  for (let i = 0; i < reach; i++) {
    const t = i / Math.max(1, reach - 1);
    // Tramado por columnas: la sombra entra por la fila de la encía y sube.
    const level = 9 * (1 - t) ** 1.6;
    for (let x = 0; x < w; x++) {
      if (BAYER_4[Math.abs(gumRow + away * i) & 3][x & 3] < level) {
        put(x, gumRow + away * i, 'S');
      }
    }
  }

  // El brillo, en la cara que da a la luz: una mancha corta, no una línea de lado a
  // lado, que se leería como una raya.
  const gloss = fromTop ? top + band + 2 : top - 3;
  for (let x = Math.round(w * 0.22); x < Math.round(w * 0.52); x++) {
    put(x, gloss, 'H');
    if (w > 34) put(x, gloss + (fromTop ? 1 : -1), 'H');
  }

  return rows.map((r) => r.join(''));
};
