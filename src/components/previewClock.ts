/**
 * Reloj compartido de las vistas previas.
 *
 * La ficha de información llega a mostrar cuarenta lienzos a la vez. Con un
 * `requestAnimationFrame` por lienzo serían cuarenta bucles compitiendo; aquí hay
 * **uno solo** que avisa a todos, y a 10 redibujados por segundo, que es de sobra
 * para un ciclo de poses de casi un segundo y no calienta el portátil por mirar una
 * ficha.
 *
 * El bucle solo existe mientras alguien escucha: al cerrar la ficha se apaga.
 */

type Listener = (seconds: number) => void;

const listeners = new Set<Listener>();

/** Redibujados por segundo. Las poses cambian cada ~0,9 s: no hace falta más. */
const FPS = 10;

let frame = 0;
let startedAt = 0;
let lastTick = 0;

/** true si el sistema pide no animar. Entonces todo se queda en el primer momento. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const tick = (now: number) => {
  if (now - lastTick >= 1000 / FPS) {
    lastTick = now;
    const seconds = (now - startedAt) / 1000;
    for (const listener of listeners) listener(seconds);
  }
  frame = requestAnimationFrame(tick);
};

export const subscribePreviewClock = (listener: Listener): (() => void) => {
  listeners.add(listener);

  if (listeners.size === 1 && typeof requestAnimationFrame === 'function') {
    startedAt = performance.now();
    lastTick = 0;
    frame = requestAnimationFrame(tick);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
};
