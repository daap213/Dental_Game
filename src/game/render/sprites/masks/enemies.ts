import { blank, ellipse, rect, spike, merge, subtract, stamp, fit } from './shapes';

/**
 * Siluetas de los ocho enemigos comunes.
 *
 * Cada uno mide exactamente su hitbox (`data/enemies.ts`), así que lo que se ve es
 * lo que golpea. La forma se compone con las primitivas de `shapes.ts` —las curvas
 * salen limpias— y encima va la cara dibujada a mano, que es lo que les da
 * carácter.
 *
 * Los caracteres de las capas de detalle son los mismos en todos los enemigos
 * (ver `DETAIL_CHARS`), así que un mismo dibujo de ojos se puede reutilizar y el
 * material lo resuelve cada uno con su rampa.
 */

/** Convención de los caracteres de detalle, común a todos los enemigos. */
export const DETAIL_CHARS = {
  /** Blanco del ojo. */
  E: 'E',
  /** Pupila. */
  P: 'P',
  /** Destello de la pupila. */
  G: 'G',
  /** Boca o hueco oscuro. */
  M: 'M',
  /** Diente. */
  T: 'T',
  /** Brillo del material. */
  H: 'H',
  /** Pliegue o grieta. */
  S: 'S',
  /** Órgano interno, más oscuro que el cuerpo. */
  N: 'N',
  /** Luz roja: visores y avisos. */
  R: 'R',
  /** Metal. */
  W: 'W',
} as const;

export interface EnemyArt {
  w: number;
  h: number;
  /** Silueta. */
  mask: readonly string[];
  /** Cara y detalle en reposo. */
  detail: readonly string[];
  /** Detalle mientras ataca. Si falta, se usa el de reposo. */
  attack?: readonly string[];
  /** Detalle al recibir daño. Si falta, se usa el de reposo. */
  hurt?: readonly string[];
}

// ---------------------------------------------------------------------------
// Bacteria: 32×32. Una célula con membrana, núcleo y cilios.
// ---------------------------------------------------------------------------

const BACTERIA_CELL = ellipse(32, 32, 16, 17, 13, 12);

/** Cilios: pinchos cortos alrededor de la membrana. */
const BACTERIA_CILIA = merge(
  spike(32, 32, 10, 2, 6, 3),
  spike(32, 32, 22, 2, 6, 3),
  spike(32, 32, 4, 10, 14, 3),
  spike(32, 32, 28, 10, 14, 3)
);

const BACTERIA: EnemyArt = {
  w: 32,
  h: 32,
  mask: merge(BACTERIA_CELL, BACTERIA_CILIA),
  detail: [
    ...blank(32, 8),
    '................................',
    '.........HH.....................',
    '........HH......................',
    '........H.......EEE...EEE.......',
    '................EPE...EPE.......',
    '.....NNNN.......EGE...EGE.......',
    '....NNNNNN......EEE...EEE.......',
    '....NNNNNN......................',
    '.....NNNN.......................',
    '................MMMMMMM.........',
    '.................MMMMM..........',
    ...blank(32, 12),
  ],
  attack: [
    ...blank(32, 11),
    '................EEE...EEE.......',
    '................EPE...EPE.......',
    '................EGE...EGE.......',
    '................EEE...EEE.......',
    '................................',
    '..............MMMMMMMMM.........',
    '..............MTMTMTMTM.........',
    '..............MMMMMMMMM.........',
    ...blank(32, 13),
  ],
  hurt: [
    ...blank(32, 11),
    '................P.P...P.P.......',
    '.................P.....P........',
    '................P.P...P.P.......',
    ...blank(32, 18),
  ],
};

// ---------------------------------------------------------------------------
// Monstruo de placa: 48×36. Un montículo pegajoso que chorrea.
// ---------------------------------------------------------------------------

const PLAQUE_BODY = ellipse(48, 36, 24, 19, 23, 16);
const PLAQUE_DRIPS = merge(
  rect(48, 36, 8, 30, 4, 6),
  rect(48, 36, 20, 32, 5, 4),
  rect(48, 36, 34, 30, 4, 6)
);

const PLAQUE: EnemyArt = {
  w: 48,
  h: 36,
  mask: merge(PLAQUE_BODY, PLAQUE_DRIPS),
  detail: [
    ...blank(48, 6),
    '..........HHHH..................................',
    '.........HHH....................................',
    '.........H......................................',
    '................................................',
    '..............EEEE........EEEE..................',
    '..............EPPE........EPPE..................',
    '..............EGPE........EGPE..................',
    '..............EEEE........EEEE..................',
    '................................................',
    '................................................',
    '..........MMMMMMMMMMMMMMMMMMMM..................',
    '..........MTMMTMMTMMTMMTMMTMMM..................',
    '..........MMMMMMMMMMMMMMMMMMMM..................',
    '................................................',
    '.....SS.................SS......................',
    '....SSSS...............SSSS.....................',
    ...blank(48, 13),
  ],
  attack: [
    ...blank(48, 10),
    '..............EEEE........EEEE..................',
    '..............EPPE........EPPE..................',
    '..............EGPE........EGPE..................',
    '..............EEEE........EEEE..................',
    '................................................',
    '.........MMMMMMMMMMMMMMMMMMMMMM.................',
    '.........MTTMMTTMMTTMMTTMMTTMMM.................',
    '.........MMMMMMMMMMMMMMMMMMMMMM.................',
    '.........MMMMMMMMMMMMMMMMMMMMMM.................',
    ...blank(48, 17),
  ],
  hurt: [
    ...blank(48, 10),
    '..............P..P........P..P..................',
    '...............PP..........PP...................',
    '..............P..P........P..P..................',
    ...blank(48, 23),
  ],
};

// ---------------------------------------------------------------------------
// Bombardero de caramelo: 40×24. Caramelo envuelto con las puntas retorcidas.
// ---------------------------------------------------------------------------

const CANDY_CORE = ellipse(40, 24, 20, 12, 11, 10);
const CANDY_WRAPPERS = merge(
  // Puntas del envoltorio, en zigzag hacia fuera.
  rect(40, 24, 2, 6, 7, 3),
  rect(40, 24, 0, 3, 4, 3),
  rect(40, 24, 0, 15, 4, 3),
  rect(40, 24, 2, 12, 7, 3),
  rect(40, 24, 31, 6, 7, 3),
  rect(40, 24, 36, 3, 4, 3),
  rect(40, 24, 36, 15, 4, 3),
  rect(40, 24, 31, 12, 7, 3)
);

const CANDY: EnemyArt = {
  w: 40,
  h: 24,
  mask: merge(CANDY_CORE, CANDY_WRAPPERS),
  detail: [
    ...blank(40, 3),
    '..............HHH.......................',
    '.............HH.........................',
    '.............H..........................',
    '................EEE..EEE...............',
    '................EPE..EPE...............',
    '................EGE..EGE...............',
    '................EEE..EEE...............',
    '........SS..............SS..............',
    '.......SS................SS.............',
    '......SS..................SS............',
    '.....SS....................SS...........',
    '...............MMMMMM...................',
    '................MMMM...................',
    ...blank(40, 8),
  ],
  attack: [
    ...blank(40, 6),
    '................EEE..EEE...............',
    '................EPE..EPE...............',
    '................EGE..EGE...............',
    '................EEE..EEE...............',
    '........................................',
    '..............MMMMMMMM..................',
    '..............MTMTMTMM..................',
    '..............MMMMMMMM..................',
    ...blank(40, 10),
  ],
  hurt: [
    ...blank(40, 6),
    '................P.P..P.P...............',
    '.................P....P................',
    '................P.P..P.P...............',
    ...blank(40, 15),
  ],
};

// ---------------------------------------------------------------------------
// Concreción de sarro: 32×48. Columna mineral que escupe por una grieta.
// ---------------------------------------------------------------------------

/**
 * Tenía un **cañón**: `rect(32, 48, 20, 20, 12, 7, 1)`, un tubo de doce por siete saliendo
 * del costado, y una boca de metal en la capa de detalle que en ataque se encendía en rojo
 * como un fogonazo. Dentro de una boca, y en el mismo juego cuyo jefe de esta fase era un
 * carro de combate.
 *
 * Ahora el costado se **abulta** y por ese abultamiento se abre una **fisura restada**. Que
 * sea material quitado y no una pieza añadida es la diferencia entre una grieta en la piedra
 * y un tubo atornillado, y es lo único que hace falta cambiar para que deje de ser un arma.
 */
const TURRET_BASE = rect(32, 48, 2, 40, 28, 8, 3);
const TURRET_COLUMN = merge(
  rect(32, 48, 8, 14, 16, 28, 2),
  rect(32, 48, 10, 6, 12, 10, 3),
  spike(32, 48, 16, 0, 8, 6)
);
const TURRET_VENT = ellipse(32, 48, 25, 24, 8, 7);
const TURRET_FISSURE = merge(
  rect(32, 48, 25, 23, 7, 2),
  rect(32, 48, 22, 19, 3, 1),
  rect(32, 48, 24, 28, 4, 1)
);

const TURRET: EnemyArt = {
  w: 32,
  h: 48,
  mask: subtract(merge(TURRET_BASE, TURRET_COLUMN, TURRET_VENT), TURRET_FISSURE),
  detail: [
    ...blank(32, 4),
    '...............H................',
    '..............HH................',
    '..............H.................',
    '................................',
    '...........SS...SS..............',
    '..........SS.....SS.............',
    '................................',
    '..........EEEEEEEE..............',
    '..........EPPRRPPE..............',
    '..........EPPRRPPE..............',
    '..........EEEEEEEE..............',
    '................................',
    '...........SSSSSS...............',
    '...........S....S....SS.........',
    '...........SSSSSS...S..MM.......',
    '....................S...MMM.....',
    '.....................S..MM......',
    '......................SS........',
    '.......................S........',
    ...blank(32, 22),
  ],
  attack: [
    ...blank(32, 12),
    '..........EEEEEEEE..............',
    '..........ERRRRRRE..............',
    '..........ERRRRRRE..............',
    '..........EEEEEEEE..............',
    '................................',
    '...........SSSSSS...............',
    '...........S....S....SR.........',
    '...........SSSSSS...S.RRR.......',
    '....................S..RRRR.....',
    '.....................S.RRR......',
    '......................SR........',
    '.......................S........',
    ...blank(32, 21),
  ],
  hurt: [
    ...blank(32, 12),
    '..........EEEEEEEE..............',
    '..........EPP..PPE..............',
    '..........EPP..PPE..............',
    '..........EEEEEEEE..............',
    ...blank(32, 32),
  ],
};

// ---------------------------------------------------------------------------
// Corredor de azúcar: 24×24. Cristal de azúcar con patas.
// ---------------------------------------------------------------------------

const RUSHER_CUBE = rect(24, 24, 3, 2, 18, 15, 3);
const RUSHER_LEGS = merge(
  rect(24, 24, 6, 17, 3, 7),
  rect(24, 24, 15, 17, 3, 7)
);

const RUSHER: EnemyArt = {
  w: 24,
  h: 24,
  mask: merge(RUSHER_CUBE, RUSHER_LEGS),
  detail: [
    ...blank(24, 3),
    '......HHH...............',
    '.....HH.................',
    '.....H..................',
    '........................',
    '.......EEE...EEE........',
    '.......EPE...EPE........',
    '.......EEE...EEE........',
    '........................',
    '.......MMMMMMMMM........',
    '.......MTMTMTMTM........',
    '.......MMMMMMMMM........',
    '........................',
    '....SS.............SS...',
    ...blank(24, 8),
  ],
  attack: [
    ...blank(24, 6),
    '......EEEE...EEEE.......',
    '......ERRE...ERRE.......',
    '......EEEE...EEEE.......',
    '........................',
    '......MMMMMMMMMMM.......',
    '......MTTMTTMTTMM.......',
    '......MMMMMMMMMMM.......',
    ...blank(24, 11),
  ],
  hurt: [
    ...blank(24, 6),
    '......P..P...P..P.......',
    '.......PP.....PP........',
    '......P..P...P..P.......',
    ...blank(24, 15),
  ],
};

// ---------------------------------------------------------------------------
// Demonio de azúcar: 28×28. Masa gomosa que gotea.
// ---------------------------------------------------------------------------

const FIEND_BODY = ellipse(28, 28, 14, 13, 12, 12);
const FIEND_DRIPS = merge(
  rect(28, 28, 6, 22, 3, 6),
  rect(28, 28, 13, 24, 3, 4),
  rect(28, 28, 19, 22, 3, 6)
);

const FIEND: EnemyArt = {
  w: 28,
  h: 28,
  mask: merge(FIEND_BODY, FIEND_DRIPS),
  detail: [
    ...blank(28, 4),
    '.......HHH..................',
    '......HH....................',
    '......H.....................',
    '............................',
    '.......EEE......EEE.........',
    '.......EPE......EPE.........',
    '.......EGE......EGE.........',
    '.......EEE......EEE.........',
    '............................',
    '.........MMMMMMMM...........',
    '.........MMMMMMMM...........',
    '..........MMMMMM............',
    ...blank(28, 12),
  ],
  attack: [
    ...blank(28, 8),
    '.......EEE......EEE.........',
    '.......EPE......EPE.........',
    '.......EGE......EGE.........',
    '.......EEE......EEE.........',
    '............................',
    '........MMMMMMMMMM..........',
    '........MMMMMMMMMM..........',
    '........MMMMMMMMMM..........',
    '.........MMMMMMMM...........',
    ...blank(28, 11),
  ],
  hurt: [
    ...blank(28, 8),
    '.......P.P......P.P.........',
    '........P........P..........',
    '.......P.P......P.P.........',
    ...blank(28, 17),
  ],
};

// ---------------------------------------------------------------------------
// Escupidor de ácido: 36×36. Bulbo con boquilla.
// ---------------------------------------------------------------------------

const SPITTER_BULB = ellipse(36, 36, 18, 23, 15, 12);
const SPITTER_NOZZLE = merge(
  rect(36, 36, 14, 4, 8, 10, 2),
  rect(36, 36, 12, 2, 12, 4, 1)
);

const SPITTER: EnemyArt = {
  w: 36,
  h: 36,
  mask: merge(SPITTER_BULB, SPITTER_NOZZLE),
  detail: [
    '............MMMMMMMM................',
    '............MWWWWWWM................',
    '.............WWWWWW.................',
    ...blank(36, 3),
    '................HH..................',
    '...............HH...................',
    '................................... ',
    '................................... ',
    '.......NN.........EEE...EEE.........',
    '......NNNN........EPE...EPE.........',
    '......NNNN........EGE...EGE.........',
    '.......NN.........EEE...EEE.........',
    '....................................',
    '..............NN....................',
    '.............NNNN...................',
    '.............NNNN...................',
    '..............NN....................',
    '..............MMMMMMMM..............',
    '...............MMMMMM...............',
    ...blank(36, 15),
  ],
  attack: [
    '............MMMMMMMM................',
    '............MRRRRRRM................',
    '.............RRRRRR.................',
    ...blank(36, 6),
    '..................EEE...EEE.........',
    '..................ERE...ERE.........',
    '..................ERE...ERE.........',
    '..................EEE...EEE.........',
    ...blank(36, 23),
  ],
  hurt: [
    ...blank(36, 9),
    '..................P.P...P.P.........',
    '...................P.....P..........',
    '..................P.P...P.P.........',
    ...blank(36, 24),
  ],
};

// ---------------------------------------------------------------------------
// Bruto de gingivitis: 40×48. Blindado, con escudo y visor.
// ---------------------------------------------------------------------------

const GRUNT_TORSO = rect(40, 48, 8, 14, 22, 22, 4);
const GRUNT_HEAD = merge(rect(40, 48, 12, 2, 14, 13, 3));
const GRUNT_LEGS = merge(rect(40, 48, 11, 36, 6, 12), rect(40, 48, 22, 36, 6, 12));
const GRUNT_SHIELD = rect(40, 48, 30, 12, 8, 26, 3);

const GRUNT: EnemyArt = {
  w: 40,
  h: 48,
  mask: merge(GRUNT_TORSO, GRUNT_HEAD, GRUNT_LEGS, GRUNT_SHIELD),
  detail: [
    ...blank(40, 2),
    '..............HHH.......................',
    '.............HH.........................',
    '.............H..........................',
    '........................................',
    '............MMMMMMMMMMMM................',
    '............MRRMMMMMMRRM................',
    '............MMMMMMMMMMMM................',
    '........................................',
    '........................................',
    '..............SSSSSS....................',
    '..............S....S..........WWWW......',
    '..............SSSSSS..........WHHW......',
    '..............................WWWW......',
    '..........SS........SS........W..W......',
    '.........SSSS......SSSS.......W..W......',
    '..........SS........SS........WWWW......',
    ...blank(40, 30),
  ],
  attack: [
    ...blank(40, 6),
    '............MMMMMMMMMMMM................',
    '............MRRRRRRRRRRM................',
    '............MMMMMMMMMMMM................',
    '........................................',
    '........................................',
    '..............SSSSSS..........WWWW......',
    '.............SS....SS.........WRRW......',
    '..............SSSSSS..........WWWW......',
    ...blank(40, 34),
  ],
  hurt: [
    ...blank(40, 6),
    '............MMMMMMMMMMMM................',
    '............MMMMMMMMMMMM................',
    '............MMMMMMMMMMMM................',
    ...blank(40, 39),
  ],
};

/** Un ojo de agua en el cuerpo del monstruo de placa, para que no sea liso. */
export const PLAQUE_WITH_HOLE = subtract(
  PLAQUE.mask,
  stamp(blank(48, 36), ellipse(10, 6, 5, 3, 4, 2), 33, 10)
);

/**
 * Ajusta todas las capas al tamaño declarado.
 *
 * Las capas de detalle se escriben mirando el dibujo, no contando puntos: una
 * fila de 39 caracteres en un sprite de 40 no falla, solo pierde el último píxel,
 * y eso se busca a ojo durante mucho rato. Aquí se rellenan y se recortan de una
 * vez, en el único sitio por el que pasan todas.
 */
// ---------------------------------------------------------------------------
// Reptador de biofilm: 36×20. Una placa baja y alargada, con ventosas.
// Ancho y plano porque va pegado al techo: la silueta tiene que leerse de canto.
// ---------------------------------------------------------------------------

const CRAWLER: EnemyArt = {
  w: 36,
  h: 20,
  mask: merge(
    ellipse(36, 20, 18, 8, 17, 8),
    // Ventosas: tres pies que asoman por debajo.
    rect(36, 20, 6, 14, 5, 5, 1),
    rect(36, 20, 16, 15, 5, 5, 1),
    rect(36, 20, 26, 14, 5, 5, 1)
  ),
  detail: [
    '....................................',
    '.........HHHHH......................',
    '.......HH.....HH....................',
    '....EEE...........EEE...............',
    '....EPE...........EPE...............',
    '....EEE...........EEE...............',
    '.........MMMMMM.....................',
    '.........MTMTMM.....................',
    '.........MMMMMM.....................',
    '.....SS........SS...................',
    ...blank(36, 10),
  ],
  attack: [
    ...blank(36, 3),
    '....EEE...........EEE...............',
    '....ERE...........ERE...............',
    '....EEE...........EEE...............',
    '........MMMMMMMM....................',
    '........MTTMTTMM....................',
    '........MMMMMMMM....................',
    ...blank(36, 11),
  ],
};

// ---------------------------------------------------------------------------
// Coraza de sarro: 40×40. Un caparazón de costra por delante y carne detrás.
// La coraza va **a la izquierda del lienzo**, que es el lado al que mira con
// `facing: -1`; al espejarlo, protege el otro lado. Es lo que hace legible que
// haya que rodearlo.
// ---------------------------------------------------------------------------

const SHELL: EnemyArt = {
  w: 40,
  h: 40,
  mask: merge(
    // Cuerpo.
    ellipse(40, 40, 24, 22, 15, 16),
    // Placa frontal, más alta que el cuerpo: sobresale.
    rect(40, 40, 3, 6, 12, 30, 3),
    // Patas.
    rect(40, 40, 16, 34, 5, 6),
    rect(40, 40, 28, 34, 5, 6)
  ),
  detail: [
    ...blank(40, 5),
    '...WWWWWWWWWW...........................',
    '...WSSSSSSSSW...........................',
    '...WSWWWWWWSW...........................',
    '...WSW....WSW.....EEE...................',
    '...WSW....WSW.....EPE...................',
    '...WSW....WSW.....EEE...................',
    '...WSWWWWWWSW...........................',
    '...WSSSSSSSSW......MMMM.................',
    '...WSWWWWWWSW......MTTM.................',
    '...WSW....WSW......MMMM.................',
    '...WSW....WSW...........................',
    '...WSW....WSW...........................',
    '...WSWWWWWWSW...........................',
    '...WSSSSSSSSW...........................',
    '...WWWWWWWWWW...........................',
    ...blank(40, 20),
  ],
  hurt: [
    ...blank(40, 9),
    '...WWWWWWWWWW.....EEE...................',
    '...WSSSSSSSSW.....ERE...................',
    '...WSWWWWWWSW.....EEE...................',
    ...blank(40, 28),
  ],
};

// ---------------------------------------------------------------------------
// Absceso hinchado: 52×44. Un saco tenso a punto de reventar, con tres lóbulos
// que ya anuncian en qué se va a partir.
// ---------------------------------------------------------------------------

const BLOATER: EnemyArt = {
  w: 52,
  h: 44,
  mask: merge(
    ellipse(52, 44, 26, 24, 25, 20),
    // Los tres bultos de arriba: las crías empujando desde dentro.
    ellipse(52, 44, 13, 10, 9, 8),
    ellipse(52, 44, 26, 7, 9, 8),
    ellipse(52, 44, 39, 10, 9, 8),
    rect(52, 44, 14, 38, 8, 6),
    rect(52, 44, 30, 38, 8, 6)
  ),
  detail: [
    ...blank(52, 4),
    '.........NNN.......NNN.......NNN....................',
    '........NNNNN.....NNNNN.....NNNNN...................',
    '.........NNN.......NNN.......NNN....................',
    '....................................................',
    '.............HHHH...................................',
    '...........HH.......................................',
    '..........EEEE...........EEEE.......................',
    '..........EPPE...........EPPE.......................',
    '..........EEEE...........EEEE.......................',
    '....................................................',
    '..............MMMMMMMMMMMMM.........................',
    '..............MTMMTMMTMMTMM.........................',
    '..............MMMMMMMMMMMMM.........................',
    '....................................................',
    '.......SS...................SS......................',
    '......SS.....................SS.....................',
    ...blank(52, 23),
  ],
  attack: [
    ...blank(52, 11),
    '..........EEEE...........EEEE.......................',
    '..........ERRE...........ERRE.......................',
    '..........EEEE...........EEEE.......................',
    '....................................................',
    '............MMMMMMMMMMMMMMMMM.......................',
    '............MTTMMTTMMTTMMTTMM.......................',
    '............MMMMMMMMMMMMMMMMM.......................',
    ...blank(52, 26),
  ],
};

// ---------------------------------------------------------------------------
// Barrena de esmalte: 30×26. Un gusano con la cabeza en punta de taladro.
// La punta va a la izquierda, como la coraza, para que el espejado la oriente.
// ---------------------------------------------------------------------------

const BORER: EnemyArt = {
  w: 30,
  h: 26,
  mask: merge(
    // Cuerpo segmentado.
    ellipse(30, 26, 19, 14, 11, 10),
    rect(30, 26, 8, 8, 14, 12, 2),
    // La broca: un cono hacia delante.
    spike(30, 26, 0, 14, 22, 7)
  ),
  detail: [
    ...blank(30, 6),
    '..WW..........................',
    '.WWWW.........................',
    'WWWWWW........EEE.......EEE...',
    '.WWWW.........EPE.......EPE...',
    '..WW..........EEE.......EEE...',
    '..............................',
    '...........SS......SS.........',
    '..........MMMMMMMMMM..........',
    '..........MTMTMTMTMM..........',
    '..........MMMMMMMMMM..........',
    ...blank(30, 10),
  ],
  attack: [
    ...blank(30, 5),
    '..WWWW........................',
    '.WWWWWW.......................',
    'WWWWWWWW......ERE.......ERE...',
    '.WWWWWW.......EEE.......EEE...',
    '..WWWW........................',
    '..............................',
    '.........MMMMMMMMMMM..........',
    '.........MTTMTTMTTMM..........',
    '.........MMMMMMMMMMM..........',
    ...blank(30, 12),
  ],
};

const normalize = (art: EnemyArt): EnemyArt => ({
  ...art,
  mask: fit(art.mask, art.w, art.h),
  detail: fit(art.detail, art.w, art.h),
  attack: art.attack && fit(art.attack, art.w, art.h),
  hurt: art.hurt && fit(art.hurt, art.w, art.h),
});

export const ENEMY_ART = {
  bacteria: normalize(BACTERIA),
  plaque_monster: normalize({ ...PLAQUE, mask: PLAQUE_WITH_HOLE }),
  candy_bomber: normalize(CANDY),
  tartar_spire: normalize(TURRET),
  sugar_rusher: normalize(RUSHER),
  sugar_fiend: normalize(FIEND),
  acid_spitter: normalize(SPITTER),
  gingivitis_grunt: normalize(GRUNT),
  biofilm_crawler: normalize(CRAWLER),
  calculus_shell: normalize(SHELL),
  abscess_bloater: normalize(BLOATER),
  enamel_borer: normalize(BORER),
} as const;
