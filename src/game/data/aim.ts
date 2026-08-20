/**
 * El apuntado, cuantizado, y la geometría que sale de él.
 *
 * Con el ratón se apunta a cualquier ángulo, pero el arte no puede: girar un sprite un ángulo
 * cualquiera **en cada frame** lo llena de dientes de sierra y obliga a hornear un lienzo nuevo
 * cada vez. Así que el ángulo se redondea a un conjunto finito de pasos y cada paso se hornea
 * una vez.
 *
 * Dieciséis pasos de 22,5°: en un arma de treinta píxeles la diferencia entre dos vecinos es de
 * unos once píxeles en la punta, que apuntando con el ratón se lee como continuo. Con ocho el
 * salto es de veintiuno y se nota.
 *
 * **Esto vive en `data/` y no en `render/` a propósito.** No lo necesita solo el dibujado: la
 * simulación calcula con esto la caja de golpe, y `game/` y `render/` son hermanos que solo
 * pueden depender hacia abajo. Es el mismo motivo por el que `isBurrowed` está en
 * `data/enemies.ts`.
 *
 * El sentido es el de la pantalla, con la `y` hacia abajo: el paso 0 apunta a la derecha y los
 * pasos crecen en el sentido del reloj, así que 4 es abajo, 8 es izquierda y 12 es arriba.
 */

export const AIM_STEPS = 16;

/** Lo que abarca un paso, en radianes. */
export const STEP_ARC = (Math.PI * 2) / AIM_STEPS;

/** Lleva un paso cualquiera —negativo o pasado de vuelta— al rango 0..15. */
export const wrapStep = (step: number): number => ((step % AIM_STEPS) + AIM_STEPS) % AIM_STEPS;

/**
 * El paso más cercano a una dirección.
 *
 * Un vector nulo devuelve 0 en vez de algo indefinido: pasa de verdad, porque el apuntado del
 * ratón con el cursor justo encima del jugador da `(0, 0)`.
 */
export const aimStep = (vx: number, vy: number): number => {
  if (vx === 0 && vy === 0) return 0;
  return wrapStep(Math.round(Math.atan2(vy, vx) / STEP_ARC));
};

/** El ángulo exacto de un paso, en radianes. */
export const stepAngle = (step: number): number => wrapStep(step) * STEP_ARC;

/** El vector unitario de un paso. */
export const stepVector = (step: number): { x: number; y: number } => {
  const angle = stepAngle(step);
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

/** Si el paso es uno de los cuatro ejes, donde el giro es exacto y no hay que interpolar. */
export const isCardinal = (step: number): boolean => wrapStep(step) % (AIM_STEPS / 4) === 0;

/**
 * Qué paso hay que hornear para dibujar otro, y si hay que pintarlo espejado.
 *
 * **Espejar es gratis** —`blit` ya lo hace con un `scale(-1, 1)`— y espejar en horizontal
 * equivale a llevar el ángulo θ a 180°−θ, o sea el paso `s` al `(8 − s)`. Así que solo hacen
 * falta los nueve pasos que apuntan a la derecha o rectos —los de coseno no negativo— y los
 * siete que apuntan a la izquierda salen de ellos. Eso ahorra el 44 % del horneado, y encaja
 * con lo que el juego ya hace en todas partes: los sprites mirando a la izquierda son los de la
 * derecha pintados al revés.
 *
 * `facing` desempata los dos pasos rectos. Arriba y abajo son su propio espejo **como ángulo**,
 * pero el dibujo no es simétrico, y hoy el arma apuntando al cielo ya se espeja según hacia
 * dónde mira el personaje. Sin el desempate, mirar a la izquierda y apuntar recto hacia arriba
 * dejaría de espejar el arma y el personaje cambiaría de mano a mitad de giro.
 */
export const bakeStep = (step: number, facing: number = 1): { step: number; flip: boolean } => {
  const wrapped = wrapStep(step);
  const quarter = AIM_STEPS / 4;

  if (wrapped > quarter && wrapped < quarter * 3) {
    return { step: wrapStep(AIM_STEPS / 2 - wrapped), flip: true };
  }
  // Recto arriba o recto abajo: el ángulo no dice de qué lado, así que lo dice el cuerpo.
  if (wrapped === quarter || wrapped === quarter * 3) {
    return { step: wrapped, flip: facing < 0 };
  }
  return { step: wrapped, flip: false };
};

/** Los pasos que de verdad se hornean, en orden. Para las galerías y los tests. */
export const BAKED_STEPS: readonly number[] = Array.from(
  { length: AIM_STEPS },
  (_, step) => step
).filter((step) => !bakeStep(step).flip);

// --- De dónde sale el apuntado ----------------------------------------------

/** Hacia dónde apunta el jugador, tal y como llega desde los mandos. */
export interface AimInput {
  usingMouse: boolean;
  aimUp: boolean;
  /** Las dos laterales, que junto con `aimUp` dan las diagonales sin ratón. */
  left: boolean;
  right: boolean;
  mouseX: number;
  mouseY: number;
  cameraX: number;
  cameraY: number;
}

/**
 * El paso al que apunta el jugador.
 *
 * Sustituye al booleano «¿apunta hacia arriba?» que había, que era **toda** la información de
 * ángulo que llegaba al dibujado: con él, apuntar cuarenta grados por encima de la horizontal
 * dibujaba el arma tumbada, y apuntar hacia abajo también.
 *
 * Se exporta y lo usan **dos** sitios —el arma para inclinarse y el brazo para elegir pose—, que
 * es la misma razón por la que se exportaba el booleano: calculado dos veces se pueden
 * desincronizar y queda un brazo bajado con el arma apuntando al cielo.
 */
export const aimStepFrom = (
  aim: AimInput,
  centreX: number,
  centreY: number,
  facing: number
): number => {
  if (aim.usingMouse) {
    return aimStep(aim.mouseX + aim.cameraX - centreX, aim.mouseY + aim.cameraY - centreY);
  }
  /**
   * **Sin ratón**, y esta rama no es un resto del modo de teclado que se retiró:
   * son cinco direcciones —no hay forma de apuntar hacia abajo— y las usan dos
   * cosas vivas. El **mando táctil**, porque el apuntado con ratón está
   * condicionado a `!isMobile` y un teléfono cae siempre aquí; y los **primeros
   * instantes de cada partida**, antes de que el ratón se mueva por primera vez.
   * Borrarla deja al móvil sin poder apuntar y al primer disparo sin dirección.
   * `aim.test.ts` la fija.
   */
  if (!aim.aimUp) return facing < 0 ? AIM_STEPS / 2 : 0;
  return aimStep(aim.left ? -1 : aim.right ? 1 : 0, -1);
};

// --- La geometría de una hoja -----------------------------------------------

/**
 * Cómo se apoya el dibujo de un proyectil sobre la dirección a la que apunta.
 *
 * - `'along'`: el lado largo va **en el sentido del vuelo**. Una flecha, una broca, un rayo,
 *   un latigazo.
 * - `'across'`: el lado largo es **tangencial** y el corto apunta hacia fuera desde el
 *   jugador. Es lo que necesita un barrido: la hoja cruza por delante, no sale disparada.
 */
export type BladeFrame = 'along' | 'across';

/** Los dos ejes locales de una hoja, ya girados al paso pedido. */
export interface LocalAxes {
  /** El eje del lado largo. */
  ax: number;
  ay: number;
  /** El eje del lado corto. */
  bx: number;
  by: number;
}

export const localAxes = (step: number, frame: BladeFrame): LocalAxes => {
  const angle = stepAngle(step);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Apuntando a la derecha, `along` deja el largo sobre la equis y `across` sobre la ye, que es
  // exactamente cómo están dibujadas hoy las dos familias.
  return frame === 'along'
    ? { ax: cos, ay: sin, bx: -sin, by: cos }
    : { ax: -sin, ay: cos, bx: cos, by: sin };
};

/**
 * La caja que envuelve una hoja inclinada.
 *
 * De aquí salen **a la vez** el tamaño del dibujo y la caja con la que se daña, y eso es
 * deliberado: cuando cada uno se calculaba por su lado, el cepillo apuntando en vertical
 * dibujaba 24×56 sobre una caja de 56×24, girado noventa grados respecto a lo que golpeaba.
 *
 * En los cuatro ejes devuelve exactamente las medidas de siempre, así que el equilibrio no se
 * mueve en las direcciones en las que ya se jugaba.
 */
export const orientedBox = (
  long: number,
  thick: number,
  step: number,
  frame: BladeFrame
): { w: number; h: number } => {
  const angle = stepAngle(step);
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));

  return frame === 'along'
    ? { w: Math.round(cos * long + sin * thick), h: Math.round(sin * long + cos * thick) }
    : { w: Math.round(sin * long + cos * thick), h: Math.round(cos * long + sin * thick) };
};
