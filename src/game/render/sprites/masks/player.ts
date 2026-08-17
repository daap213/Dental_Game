/**
 * Siluetas del jugador, 32×32 (el tamaño exacto del hitbox: `PLAYER_SIZE`).
 *
 * Solo silueta: `#` es lleno y `.` es vacío. El contorno y los seis tonos los
 * pone `shadeMask`, así que la luz viene del mismo sitio en todos los sprites del
 * juego. Lo que no sale de la silueta —surco, cinta, ojos, brillo del esmalte—
 * va en capas de detalle aparte, recortadas a la forma.
 *
 * El diente se dibuja con su anatomía: corona con cúspides arriba, un cuello que
 * estrecha, y raíces que se afinan hasta la punta y sobre las que el personaje se
 * apoya. La única licencia es que todas las clases tienen dos raíces, incluidas
 * las que en la realidad tienen una: un incisivo con una sola raíz no puede
 * caminar.
 *
 * Se compone en tres piezas: la corona la elige la clase, el tronco es común, y
 * los pies cambian con la pose.
 *
 * Este fichero no importa nada a propósito: así se puede previsualizar en
 * terminal sin arrastrar el resto del código.
 */

const EMPTY = '................................';

// --- Coronas: lo único que distingue a cada clase (filas 0-15) ---

/** Ancho completo de la corona, 24 px (x4..x27). */
const CROWN_FULL = '....########################....';
/** Corona estrecha, 22 px (x5..x26). */
const CROWN_NARROW = '.....######################.....';

/** Molar: dos cúspides anchas con el surco en medio. */
export const CROWN_MOLAR: readonly string[] = [
  '......########....########......',
  '.....##########..##########.....',
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
  CROWN_FULL,
];

/** Incisivo: borde recto de cincel, más estrecho que el molar. */
export const CROWN_INCISOR: readonly string[] = Array<string>(16).fill(CROWN_NARROW);

/** Colmillo: cúspide única en punta. */
export const CROWN_CANINE: readonly string[] = [
  '...............##...............',
  '..............####..............',
  '.............######.............',
  '............########............',
  '...........##########...........',
  '..........############..........',
  '.........##############.........',
  '........################........',
  '.......##################.......',
  '......####################......',
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
];

/** Premolar: dos cúspides estrechas y marcadas. */
export const CROWN_PREMOLAR: readonly string[] = [
  '........#####......#####........',
  '.......#######....#######.......',
  '......#########..#########......',
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
  CROWN_NARROW,
];

/** Cuello y arranque de las dos raíces. Común a todas las clases (filas 16-25). */
export const TRUNK: readonly string[] = [
  ...Array<string>(16).fill(EMPTY),
  '.....######################.....',
  '......####################......',
  '.......##################.......',
  '.......##################.......',
  '.......########..########.......',
  '.......########..########.......',
  '.......#######....#######.......',
  '.......#######....#######.......',
  '........######....######........',
  '........######....######........',
];

// --- Pies: lo único que distingue a cada pose (filas 26-31) ---

/** De pie: las dos raíces apoyadas. */
export const FEET_IDLE: readonly string[] = [
  ...Array<string>(26).fill(EMPTY),
  '........#####......#####........',
  '........#####......#####........',
  '.........####......####.........',
  '.........####......####.........',
  '.........###........###.........',
  '.........###........###.........',
];

/** Andando: la raíz izquierda se despega del suelo. */
export const FEET_WALK: readonly string[] = [
  ...Array<string>(26).fill(EMPTY),
  '........#####......#####........',
  '........#####......#####........',
  '.........####......####.........',
  '..........###......####.........',
  '....................###.........',
  '....................###.........',
];

/** En el aire: las dos raíces recogidas. */
export const FEET_JUMP: readonly string[] = [
  ...Array<string>(26).fill(EMPTY),
  '........#####......#####........',
  '.........####......####.........',
  '.........####......####.........',
  '..........##........##..........',
  EMPTY,
  EMPTY,
];

// --- Detalles: surco, cinta, cara y brillo del esmalte ---

/**
 * Cara y cinta. `B` y `b` son la cinta, `E` el blanco del ojo, `P` la pupila,
 * `G` el destello, `H` el brillo del esmalte y `F` el surco de la corona.
 * Se recorta a la silueta, así que la misma capa vale para las cuatro coronas.
 */
export const FACE_IDLE: readonly string[] = [
  EMPTY,
  EMPTY,
  '...............FF...............',
  '......HH.......FF...............',
  '......HH.......FF...............',
  '.......H.......FF...............',
  '....BBBBBBBBBBBBBBBBBBBBBBBB....',
  '....BBBBBBBBBBBBBBBBBBBBBBBB....',
  '....bbbbbbbbbbbbbbbbbbbbbbbb....',
  EMPTY,
  '.........EEEE......EEEE.........',
  '.........EPPE......EPPE.........',
  '.........EPPE......EPPE.........',
  '.........GEEE......GEEE.........',
  ...Array<string>(18).fill(EMPTY),
];

/** Ojos apretados: acaba de recibir un golpe. */
export const FACE_HURT: readonly string[] = [
  ...FACE_IDLE.slice(0, 10),
  '.........P..P......P..P.........',
  '..........PP........PP..........',
  '.........P..P......P..P.........',
  EMPTY,
  ...Array<string>(18).fill(EMPTY),
];
