/**
 * Siluetas del jugador, 34×38 sobre una caja de 32×32.
 *
 * Solo silueta: `#` es lleno y `.` es vacío. El contorno y los seis tonos los pone
 * `shadeMask`, así que la luz viene del mismo sitio en todos los sprites del juego. Lo
 * que no sale de la silueta —surco, cinta, ojos, brillo del esmalte— va en capas de
 * detalle aparte, recortadas a la forma.
 *
 * **El diente es el cuerpo.** La corona es cabeza y torso a la vez y lleva la cara; las
 * raíces hacen de piernas. La única licencia anatómica es que todas las clases tienen
 * dos raíces, incluidas las que en la realidad tienen una: un incisivo con una sola raíz
 * no puede caminar. Por eso el número de raíces **no** distingue a las clases; lo hacen
 * cuatro rasgos a la vez —canto superior, ancho de corona, proporción corona/pierna y
 * grosor y apertura de las piernas—, para que la diferencia no sea de un píxel.
 *
 * El dibujo es **mayor que la caja** y se ancla por los pies (`offsetX`/`offsetY` en
 * `sprites/player.ts`). Los seis píxeles de corona que sobresalen por arriba no son
 * golpeables: es a favor del jugador, y 38 de alto se eligió en vez de 44 para que ese
 * margen fuese pequeño.
 *
 * Este fichero **no importa nada a propósito**: así se puede previsualizar en terminal
 * sin arrastrar el resto del código. Lo que antes eran filas escritas a mano de 32
 * caracteres ahora se construye con ayudantes locales, porque cuatro clases por ocho
 * poses son demasiadas filas para contar puntos a ojo sin equivocarse.
 */

/** Ancho y alto del dibujo. La caja de colisión sigue siendo 32×32. */
export const BODY_W = 34;
export const BODY_H = 38;

/**
 * Filas 0-21 son corona y cuello; 22-37, las piernas.
 *
 * Las piernas se llevan el cuarenta por ciento del alto a propósito. Con la corona
 * ocupando tres cuartos del dibujo el personaje se leía como un blocaje con dos muescas:
 * lo que convierte al diente en figura es que la escotadura entre las dos raíces sea
 * **profunda**.
 */
const LEG_TOP = 22;

const DOT = '.';

/** Una fila hecha de tramos `[desde, hasta]`, ambos incluidos. */
const row = (...spans: readonly (readonly [number, number])[]): string => {
  const out = new Array<string>(BODY_W).fill(DOT);
  for (const [from, to] of spans) {
    for (let x = Math.max(0, from); x <= Math.min(BODY_W - 1, to); x++) out[x] = '#';
  }
  return out.join('');
};

/**
 * Una fila de `width` px centrada.
 *
 * Los anchos van **pares**: con 34 de ancho, un ancho par cae exactamente centrado, y
 * eso es lo que hace que la silueta espejada por `facing` no dé un salto lateral.
 */
const band = (width: number): string => {
  const from = (BODY_W - width) >> 1;
  return row([from, from + width - 1]);
};

/** Repite una fila `n` veces. */
const times = (n: number, value: string): string[] => Array<string>(n).fill(value);

const EMPTY_ROW = DOT.repeat(BODY_W);

// --- Las cuatro coronas (filas 0-21) ---

/**
 * El cuello: las dos últimas filas de la corona, estrechando hacia las raíces.
 *
 * Va con la corona y no con las piernas porque su ancho es el del cuerpo, que cambia
 * con la clase; las piernas solo saben de grosor y separación.
 */
const neck = (body: number): string[] => [band(body - 2), band(body - 4)];

/** Cúspides: `count` picos repartidos a lo ancho del cuerpo, de tres filas. */
const cusps = (body: number, count: number): string[] => {
  const from = (BODY_W - body) >> 1;
  const each = body / count;
  const spans = (inset: number): (readonly [number, number])[] =>
    Array.from({ length: count }, (_, i) => {
      const a = Math.round(from + i * each) + inset;
      const b = Math.round(from + (i + 1) * each) - 1 - inset;
      return [a, b] as const;
    });

  return [row(...spans(2)), row(...spans(1)), band(body)];
};

/**
 * El hombro: dos filas que ensanchan hasta el ancho del cuerpo.
 *
 * Existe por un motivo que no es estético. Las plataformas se dibujan **antes** que el
 * jugador, y la colisión con ellas es sólida por abajo, así que cada vez que el personaje
 * se da con la cabeza en un tablón de 20 px lo que sobresale de la caja se pinta encima
 * del tablón. Con el canto estrechando, lo que se pinta encima son unas pocas filas
 * angostas en vez de una losa de esmalte del ancho del cuerpo.
 */
const shoulder = (body: number): string[] => [band(body - 4), band(body - 2)];

/** Molar: cuatro cúspides y el cuerpo más ancho de las cuatro clases. */
const MOLAR_BODY = 24;
export const CROWN_MOLAR: readonly string[] = [
  ...cusps(MOLAR_BODY, 4),
  ...shoulder(MOLAR_BODY),
  ...times(15, band(MOLAR_BODY)),
  ...neck(MOLAR_BODY),
];

/** Premolar: dos cúspides marcadas, cuerpo intermedio. */
const PREMOLAR_BODY = 20;
export const CROWN_PREMOLAR: readonly string[] = [
  ...cusps(PREMOLAR_BODY, 2),
  ...shoulder(PREMOLAR_BODY),
  ...times(15, band(PREMOLAR_BODY)),
  ...neck(PREMOLAR_BODY),
];

/** Colmillo: una punta alta y el cuerpo más estrecho. Nueve filas de cuña. */
const CANINE_BODY = 16;
export const CROWN_CANINE: readonly string[] = [
  ...Array.from({ length: 8 }, (_, i) => band(2 + i * 2)),
  ...times(12, band(CANINE_BODY)),
  ...neck(CANINE_BODY),
];

/**
 * Incisivo: canto de cincel, sin cúspide alguna.
 *
 * El bisel son seis filas que **estrechan hacia arriba**, que es como corta un cincel de
 * verdad: el filo es más fino que el cuerpo. Es lo único que lo distingue del premolar de
 * un vistazo, así que tiene que verse, y de paso es lo que le adelgaza el saliente.
 */
const INCISOR_BODY = 22;
export const CROWN_INCISOR: readonly string[] = [
  ...Array.from({ length: 5 }, (_, i) => band(INCISOR_BODY - 8 + i * 2)),
  ...times(15, band(INCISOR_BODY)),
  ...neck(INCISOR_BODY),
];

// --- Las piernas (filas 22-37) ---

/** Cómo son las piernas de una clase: grosor y separación entre las dos. */
export interface LegStyle {
  /** Ancho de cada pierna. Par, para que la silueta quede centrada. */
  thick: number;
  /** Hueco entre las dos piernas. Par. */
  gap: number;
}

/**
 * En qué punto del paso están las piernas.
 *
 * El ciclo de andar son cuatro fases —una pierna se levanta, la postura se cierra, se
 * levanta la otra, la postura se abre—, y no dos como antes, donde además uno de los dos
 * fotogramas **era** el idle y el paso no se leía.
 */
export type LegPhase = 'stand' | 'step-left' | 'close' | 'step-right' | 'open' | 'tuck' | 'splay';

/** Cuánto se levanta cada pierna y cuánto se abre la postura, por fase. */
const PHASES: Record<LegPhase, { lift: readonly [number, number]; spread: number }> = {
  stand: { lift: [0, 0], spread: 0 },
  'step-left': { lift: [4, 0], spread: 0 },
  close: { lift: [0, 0], spread: -2 },
  'step-right': { lift: [0, 4], spread: 0 },
  open: { lift: [0, 0], spread: 2 },
  // En el aire: recogidas al subir, abiertas y estiradas al caer. Es lo que da peso al
  // salto doble sin tocar la física.
  tuck: { lift: [3, 3], spread: -2 },
  splay: { lift: [1, 1], spread: 4 },
};

/**
 * Las diez filas de las piernas.
 *
 * Se afinan un píxel en el último tercio: una raíz que baja recta parece una pata de
 * mesa, y una que acaba en punta no puede apoyarse.
 */
export const legs = (style: LegStyle, phase: LegPhase): string[] => {
  const { lift, spread } = PHASES[phase];
  const inner = (style.gap + spread) / 2;
  const height = BODY_H - LEG_TOP;
  const out = times(LEG_TOP, EMPTY_ROW);

  for (let i = 0; i < height; i++) {
    const thick = i < height - 3 ? style.thick : style.thick - 1;
    const spans: (readonly [number, number])[] = [];
    for (const side of [0, 1] as const) {
      if (i >= height - lift[side]) continue;
      const from = side === 0 ? BODY_W / 2 - inner - thick : BODY_W / 2 + inner;
      spans.push([Math.round(from), Math.round(from) + thick - 1] as const);
    }
    out.push(spans.length ? row(...spans) : EMPTY_ROW);
  }

  return out;
};

/** Todo lo que la clase aporta al dibujo. */
export interface ToothBuild {
  crown: readonly string[];
  legs: LegStyle;
  /** Ancho del cuerpo, para colgar el brazo de su canto. */
  body: number;
}

export const TOOTH_MOLAR: ToothBuild = {
  crown: CROWN_MOLAR,
  legs: { thick: 9, gap: 6 },
  body: MOLAR_BODY,
};
export const TOOTH_PREMOLAR: ToothBuild = {
  crown: CROWN_PREMOLAR,
  legs: { thick: 6, gap: 8 },
  body: PREMOLAR_BODY,
};
export const TOOTH_CANINE: ToothBuild = {
  crown: CROWN_CANINE,
  legs: { thick: 5, gap: 4 },
  body: CANINE_BODY,
};
export const TOOTH_INCISOR: ToothBuild = {
  crown: CROWN_INCISOR,
  legs: { thick: 6, gap: 10 },
  body: INCISOR_BODY,
};

// --- Detalles: cinta, surco, brillo y ojos ---

/** Estampa un bloque de letras en una rejilla mutable. */
const stampAt = (grid: string[][], x0: number, y0: number, art: readonly string[]): void => {
  art.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      const ch = line[dx];
      if (ch === DOT) continue;
      const y = y0 + dy;
      const x = x0 + dx;
      if (y >= 0 && y < BODY_H && x >= 0 && x < BODY_W) grid[y][x] = ch;
    }
  });
};

/**
 * Los ojos, que son el **único** canal de expresión.
 *
 * No hay boca ni cejas, así que la mirada tiene que cargar con todo: por eso cada
 * estado cambia la forma completa del ojo y no solo la pupila. `E` es el blanco, `P` la
 * pupila y `G` el destello.
 */
export type EyeMood = 'idle' | 'ahead' | 'up' | 'down' | 'hurt';

const EYES: Record<EyeMood, readonly string[]> = {
  // Quieto: almendra oscura con su destello dentro.
  idle: ['.PP.', 'PGPP', 'PPPP', '.PP.'],
  // Andando: desplazado hacia donde avanza. Con el sprite espejado por `facing`, mirar
  // «hacia dentro del lienzo» es siempre mirar hacia delante, así que sale gratis.
  ahead: ['..PP', '.PGP', '.PPP', '..PP'],
  // Subiendo: **más alto**, que es el rasgo que de verdad se lee a este tamaño; la
  // posición de la pupila sola no sobrevive.
  up: ['.PP.', 'PGPP', 'PPPP', 'PPPP', '.PP.'],
  // Cayendo: aplastado y bajo.
  down: ['....', 'PPPP', 'PGPP', '.PP.'],
  // Golpeado: dos aspas, sin destello.
  hurt: ['P..P', '.PP.', '.PP.', 'P..P'],
};

/** Fila de la que cuelgan los ojos, y columnas de cada uno. */
const EYE_Y = 10;
const EYE_LEFT = 11;
const EYE_RIGHT = BODY_W - EYE_LEFT - 4;

/**
 * La capa de detalle: cinta, surco de la corona, brillo del esmalte y ojos.
 *
 * `B` y `b` son la cinta, `H` el brillo del esmalte y `F` el surco. Se recorta a la
 * silueta, así que la misma capa vale para las cuatro coronas y lo que sobresale de una
 * corona estrecha se cae solo.
 */
export const detail = (mood: EyeMood): string[] => {
  const grid = Array.from({ length: BODY_H }, () => new Array<string>(BODY_W).fill(DOT));

  // Surco de la corona, bajando desde el canto.
  stampAt(grid, BODY_W / 2 - 1, 2, times(6, 'FF'));
  // Brillo del esmalte, arriba a la izquierda: de donde viene la luz.
  stampAt(grid, 6, 3, ['HH', 'HH', 'H.']);
  // La cinta, cruzando la frente. Se dibuja del ancho del cuerpo más ancho y el recorte
  // a la silueta se encarga de acortarla en las coronas estrechas.
  stampAt(grid, 3, 6, ['B'.repeat(MOLAR_BODY + 4), 'b'.repeat(MOLAR_BODY + 4)]);

  const eyes = EYES[mood];
  stampAt(grid, EYE_LEFT, EYE_Y, eyes);
  // El ojo derecho lleva el destello espejado, para que la luz venga de un solo lado.
  stampAt(
    grid,
    EYE_RIGHT,
    EYE_Y,
    eyes.map((line) => [...line].reverse().join(''))
  );

  return grid.map((r) => r.join(''));
};

// --- El brazo, que va aparte ---

/**
 * El brazo no entra en la silueta del cuerpo, y esa es la decisión que mantiene el
 * número de sprites a raya.
 *
 * Si entrara, cada pose necesitaría su variante de brazo bajado, alzado y en retroceso,
 * y treinta y dos sprites se convertirían en casi cien. Aparte son **tres**, compartidos
 * por las cuatro clases. Que se dibuje encima con su propio contorno es correcto en
 * pixel art: un miembro que se solapa con el torso se lee mejor con el borde marcado.
 */
export type ArmPose = 'side' | 'up' | 'recoil';

/**
 * Brazo tendido hacia delante: antebrazo, **muñeca** y puño.
 *
 * La muñeca es la muesca de un píxel entre los dos. Sin ella el brazo era un bulto
 * redondo saliendo del costado y se leía como un morro, no como un miembro: `shadeMask`
 * pone contorno donde hay hueco, así que esa muesca es lo que dibuja la articulación.
 */
const ARM_SIDE: readonly string[] = [
  '.........###.',
  '.#######.####',
  '.############',
  '.############',
  '.#######.####',
  '.........###.',
  '.............',
];

/** Brazo alzado: el mismo, girado, con el puño arriba y el hombro abajo. */
const ARM_UP: readonly string[] = [
  '..###..',
  '.#####.',
  '#######',
  '#######',
  '.#####.',
  '..###..',
  '.#####.',
  '.#####.',
  '.#####.',
  '.#####.',
  '.#####.',
  '.#####.',
  '.......',
];

/** Retroceso: el mismo brazo con el antebrazo recogido, justo después de disparar. */
const ARM_RECOIL: readonly string[] = [
  '......###.',
  '.####.####',
  '.#########',
  '.#########',
  '.####.####',
  '......###.',
  '..........',
];

export const ARMS: Record<ArmPose, readonly string[]> = {
  side: ARM_SIDE,
  up: ARM_UP,
  recoil: ARM_RECOIL,
};

/**
 * Dónde cae el puño dentro del lienzo de cada brazo.
 *
 * Esto es lo que sustituye a los números escritos a mano que tenía `render/weapons.ts`
 * (`p.x + 18` y `p.y + 19`): allí el arma no sabía nada del dibujo, así que mover el
 * puño un píxel la dejaba flotando y nada avisaba. Ahora el ancla **viene con el
 * dibujo**, y un test comprueba que cae sobre un píxel lleno del puño.
 */
export const ARM_HAND: Record<ArmPose, { x: number; y: number }> = {
  side: { x: 10, y: 2 },
  up: { x: 3, y: 2 },
  recoil: { x: 7, y: 2 },
};

/**
 * De qué fila del cuerpo sale el hombro.
 *
 * A la altura de la cintura, no del torso medio: con el hombro más arriba el brazo salía
 * pegado a los ojos y la figura parecía tener hocico.
 */
const SHOULDER_Y = 15;

/**
 * Cuánto se mete el lienzo del brazo por dentro del canto del cuerpo.
 *
 * Ocho píxeles, no dos. Con dos, el hombro nacía justo en el borde sin solaparlo y el
 * puño acababa cinco píxeles fuera de la caja: el arma se iba diecisiete píxeles más lejos
 * de donde estaba y se leía como un objeto suelto al lado del personaje, no empuñado.
 */
const ARM_INSET = 8;

/**
 * Dónde se estampa el lienzo del brazo, en coordenadas del dibujo del cuerpo.
 *
 * Se cuelga del canto del cuerpo, que cambia con la clase: un colmillo estrecho tiene el
 * brazo más cerca del eje que un molar ancho, y así el hombro siempre queda pegado al
 * torso en vez de flotando junto a él.
 */
export const armAt = (body: number, pose: ArmPose): { x: number; y: number } => {
  const edge = (BODY_W + body) / 2;
  if (pose === 'up') return { x: edge - ARM_INSET, y: SHOULDER_Y - 6 };
  return { x: edge - ARM_INSET, y: SHOULDER_Y };
};
