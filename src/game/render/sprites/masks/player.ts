/**
 * Siluetas del jugador, 32×32 (el tamaño exacto del hitbox: `PLAYER_SIZE`).
 *
 * Solo silueta: `#` es lleno y `.` es vacío. El contorno y los tres tonos los
 * pone `shadeMask`, así que la luz viene del mismo sitio en todos los sprites del
 * juego. Los detalles que no salen de la silueta —cinta y ojos— van en su propia
 * capa, con sus propios materiales.
 *
 * Este fichero no importa nada a propósito: así se puede previsualizar en
 * terminal sin arrastrar el resto del código.
 */

const EMPTY = '................................';
/** Cuerpo, 22 px de ancho (x5..x26). */
const BODY = '.....######################.....';
/** Cuello del cuerpo antes de las raíces, 20 px (x6..x25). */
const WAIST = '......####################......';
/** Las dos raíces: x7..x13 y x18..x24. */
const ROOTS = '.......#######....#######.......';
/** Solo la raíz derecha: el paso levantado. */
const ROOT_RIGHT = '..................#######.......';

// --- Coronas: es lo único que distingue a cada clase de diente ---

/** Molar: dos cúspides anchas y redondeadas. La clase de la casa. */
export const CROWN_MOLAR: readonly string[] = [
  '.......######......######.......',
  '......########....########......',
  '.....##########..##########.....',
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
];

/** Incisivo: corte recto, como un cincel. */
export const CROWN_INCISOR: readonly string[] = [
  WAIST,
  WAIST,
  WAIST,
  WAIST,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
];

/** Colmillo: punta afilada. */
export const CROWN_CANINE: readonly string[] = [
  '...............##...............',
  '..............####..............',
  '.............######.............',
  '............########............',
  '..........############..........',
  '........################........',
  WAIST,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
];

/** Premolar: dos cúspides estrechas y más marcadas. */
export const CROWN_PREMOLAR: readonly string[] = [
  '........####........####........',
  '.......######......######.......',
  '......########....########......',
  '.....##########..##########.....',
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
];

// --- Cuerpos: es lo que distingue a cada pose ---

/** De pie: las dos raíces apoyadas. */
export const BODY_IDLE: readonly string[] = [
  ...Array<string>(12).fill(EMPTY),
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  BODY,
  WAIST,
  WAIST,
  ROOTS,
  ROOTS,
  ROOTS,
  ROOTS,
  ROOTS,
  ROOTS,
];

/** Andando: la raíz izquierda se levanta. */
export const BODY_WALK: readonly string[] = [
  ...BODY_IDLE.slice(0, 30),
  ROOT_RIGHT,
  ROOT_RIGHT,
];

/** En el aire: las dos raíces recogidas. */
export const BODY_JUMP: readonly string[] = [
  ...BODY_IDLE.slice(0, 29),
  EMPTY,
  EMPTY,
  EMPTY,
];

// --- Detalles: cinta y cara ---

/** Cinta de la frente y ojos mirando al frente. */
export const FACE_IDLE: readonly string[] = [
  ...Array<string>(13).fill(EMPTY),
  '.....RRRRRRRRRRRRRRRRRRRRRR.....',
  '.....RRRRRRRRRRRRRRRRRRRRRR.....',
  '.....rrrrrrrrrrrrrrrrrrrrrr.....',
  EMPTY,
  '..........eee....eee............',
  '..........eWe....eWe............',
  '..........eee....eee............',
  ...Array<string>(12).fill(EMPTY),
];

/** Ojos en cruz: acaba de recibir un golpe. */
export const FACE_HURT: readonly string[] = [
  ...FACE_IDLE.slice(0, 17),
  '..........e.e....e.e............',
  '...........e......e.............',
  '..........e.e....e.e............',
  ...Array<string>(12).fill(EMPTY),
];
