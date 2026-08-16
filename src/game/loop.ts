import { FIXED_STEP, MAX_STEPS_PER_FRAME } from './data/physics';

/**
 * Cuánta simulación toca en este frame.
 *
 * El bucle acumula el tiempo real transcurrido y lo gasta en pasos de
 * `FIXED_STEP`. La parte delicada es qué hacer cuando un frame llega tarde —un
 * parón del navegador, una recolección de basura, volver a la pestaña—: si se
 * intenta recuperar todo el retraso de golpe, el juego da un salto hacia
 * delante y se siente acelerado durante un instante.
 *
 * Aquí se decide lo contrario: **se tira el retraso**. El tiempo que entra en un
 * frame está limitado a `MAX_STEPS_PER_FRAME` pasos, así que el juego nunca corre
 * más rápido de lo normal; si la máquina no da, va más lento, que es un fallo
 * mucho más honesto que ir a tirones.
 */
export interface StepPlan {
  /** Pasos de simulación a ejecutar en este frame. */
  steps: number;
  /** Saldo que queda pendiente para el frame siguiente. */
  carry: number;
}

/** Tiempo real máximo que se consume en un solo frame, en segundos. */
export const MAX_FRAME_TIME = FIXED_STEP * MAX_STEPS_PER_FRAME;

export const planSteps = (accumulator: number, elapsed: number): StepPlan => {
  // Un `elapsed` negativo (relojes que se ajustan) no debe restar saldo.
  const usable = Math.min(Math.max(elapsed, 0), MAX_FRAME_TIME);
  const budget = Math.max(accumulator, 0) + usable;

  const wanted = Math.floor(budget / FIXED_STEP);
  const steps = Math.min(wanted, MAX_STEPS_PER_FRAME);

  // Si se ha recortado, el resto se descarta en vez de arrastrarse al frame
  // siguiente, que es lo que provocaría el salto.
  const carry = steps === wanted ? budget - steps * FIXED_STEP : 0;

  return { steps, carry };
};
