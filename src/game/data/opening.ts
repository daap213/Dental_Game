import { CANVAS_WIDTH } from './physics';

/**
 * La abertura de la boca, vista desde dentro.
 *
 * Es la pieza que resuelve el encuadre. Una boca abierta mirada desde la lengua no
 * es un rectángulo: es una **lente** —un óvalo achatado— centrada en la pantalla. Su
 * borde de arriba es la línea de la que cuelga la arcada superior; su borde de
 * abajo, la línea de la que asoma la inferior. La carne es lo que queda fuera.
 *
 * De esa curva sale todo lo demás sin colocar nada a mano: dónde va cada diente y de
 * qué tamaño —los de los bordes están **más cerca de la cámara**, así que son más
 * grandes, y eso es exactamente la herradura de las referencias—.
 *
 * El fondo anterior era una pared: una fila recta de dientes iguales sobre un campo
 * plano de carne, con un agujero oscuro en el centro. Mirando hacia la garganta, o
 * sea en la dirección contraria a la que mira el personaje.
 */

export interface Opening {
  /** Semiancho de la lente, en fracción del ancho de pantalla (0..0,5). */
  halfW: number;
  /** Semialto en el centro, en píxeles. */
  halfH: number;
  /** Centro vertical de la lente, en píxeles de pantalla. */
  cy: number;
  /**
   * Cuánto se cierra hacia los bordes. 0 deja los bordes rectos —un pasillo—; 1 la
   * cierra en punta.
   */
  taper: number;
  /**
   * Cuánto **baja** el centro de la abertura hacia los bordes de la pantalla.
   *
   * Es lo que faltaba en el primer intento, y sin él la herradura no se lee. Mirando
   * la referencia con cuidado, las dos arcadas descienden hacia los bordes: el molar
   * de al lado se ve más abajo *y* más grande que el incisivo del fondo, porque está
   * más cerca y por debajo del eje de la mirada. Con la abertura simétrica las dos
   * arcadas convergían en los extremos y los dientes se apilaban en una columna.
   */
  drop: number;
}

/** El perfil de la lente en una x de pantalla. */
export interface OpeningEdge {
  /** y del borde superior: de aquí cuelga la arcada de arriba. */
  top: number;
  /** y del borde inferior: de aquí asoma la de abajo. */
  bottom: number;
  /** Medio alto de la lente en esta x. 0 significa cerrada. */
  half: number;
  /**
   * Distancia al centro, de 0 a 1, medida sobre la media pantalla.
   *
   * Hace de **profundidad**: 0 es el fondo de la boca —los incisivos, lejos— y 1 el
   * borde de la pantalla, donde están los molares y la cámara casi los toca.
   */
  depth: number;
}

export const openingAt = (opening: Opening, x: number, width = CANVAS_WIDTH): OpeningEdge => {
  const cx = width / 2;
  const offset = Math.abs(x - cx);
  const half = Math.max(1, opening.halfW * width);

  // Perfil de lente. La raíz del complemento da un canto redondeado en las puntas;
  // con una parábola la lente acaba en pico y se lee como un ojo, no como una boca.
  const u = Math.min(1, offset / half);
  const round = Math.sqrt(Math.max(0, 1 - u * u));
  const shrink = Math.max(0, 1 - opening.taper * (1 - round));
  const h = opening.halfH * shrink;

  // Y el descenso: el eje de la abertura baja hacia los bordes, que es lo que hace
  // que las dos arcadas caigan juntas en vez de cerrarse la una contra la otra.
  const depth = Math.min(1, offset / cx);
  const axis = opening.cy + opening.drop * depth ** 1.5;

  return { top: axis - h, bottom: axis + h, half: h, depth };
};

/**
 * Medidas del diente que toca a esa profundidad.
 *
 * Un incisivo es estrecho y bajo; un molar, ancho y alto. Y como el de los bordes
 * está más cerca, además se ve más grande. Las dos cosas van en el mismo número.
 */
export interface ToothSize {
  w: number;
  h: number;
}

const INCISOR: ToothSize = { w: 26, h: 30 };
const MOLAR: ToothSize = { w: 52, h: 46 };

export const toothSizeAt = (depth: number): ToothSize => {
  // Elevado: el crecimiento se acelera hacia el borde, que es cómo se comporta la
  // perspectiva. Lineal deja los molares del borde demasiado pequeños.
  const t = Math.min(1, Math.max(0, depth)) ** 1.4;
  return {
    w: Math.round(INCISOR.w + (MOLAR.w - INCISOR.w) * t),
    h: Math.round(INCISOR.h + (MOLAR.h - INCISOR.h) * t),
  };
};

/** Qué clase de pieza es, para elegir la silueta. Sale de la profundidad. */
export type ToothKind = 'incisor' | 'premolar' | 'molar';

export const toothKindAt = (depth: number): ToothKind =>
  depth < 0.3 ? 'incisor' : depth < 0.62 ? 'premolar' : 'molar';

/**
 * Las posiciones de una arcada, del centro hacia fuera y hacia los dos lados.
 *
 * Se recorre así y no de izquierda a derecha para que la hilera quede **simétrica**:
 * empezando por un borde, el redondeo iría acumulando error y la pieza central
 * acabaría descentrada.
 */
export interface ToothSlot {
  /** x de la esquina izquierda del diente. */
  x: number;
  /** Centro del diente, que es lo que se usa para consultar la curva. */
  cx: number;
  size: ToothSize;
  kind: ToothKind;
  depth: number;
  /** Los de la mitad izquierda se espejan, para que la luz venga del mismo lado. */
  flip: boolean;
}

/**
 * Las posiciones se encadenan **desde el borde de la pieza anterior y en enteros**.
 *
 * Calcularlas desde el centro redondeado mientras el recorrido avanza en coma
 * flotante deja huecos de un par de píxeles entre pieza y pieza, y por esa rendija la
 * carne del marco enseña la clínica. Encadenando bordes enteros son contiguas por
 * construcción, y un test lo comprueba.
 */
export const archSlots = (width = CANVAS_WIDTH): ToothSlot[] => {
  const cx = width / 2;
  const slots: ToothSlot[] = [];

  const make = (x: number, size: ToothSize, flip: boolean): ToothSlot => {
    const center = x + size.w / 2;
    const depth = Math.min(1, Math.abs(center - cx) / cx);
    return { x, cx: Math.round(center), size, kind: toothKindAt(depth), depth, flip };
  };

  // La pieza central, a caballo del eje.
  const middleSize = toothSizeAt(0);
  const middleX = Math.round(cx - middleSize.w / 2);
  slots.push(make(middleX, middleSize, false));

  // Hacia la derecha, encadenando bordes. El margen es generoso porque el molar del
  // borde es ancho y tiene que entrar entero.
  let right = middleX + middleSize.w;
  while (right < width + 60) {
    const size = toothSizeAt(Math.min(1, Math.abs(right - cx) / cx));
    slots.push(make(right, size, false));
    right += size.w;
  }

  // Y hacia la izquierda, espejadas para que la luz les venga del mismo lado.
  let left = middleX;
  while (left > -60) {
    const size = toothSizeAt(Math.min(1, Math.abs(left - cx) / cx));
    left -= size.w;
    slots.push(make(left, size, true));
  }

  return slots;
};
