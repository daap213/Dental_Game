import { describe, it, expect } from 'vitest';
import { planSteps, MAX_FRAME_TIME } from './loop';
import { FIXED_STEP, MAX_STEPS_PER_FRAME } from './data/physics';

/** Simula una tanda de frames con los tiempos dados y suma los pasos ejecutados. */
const run = (frameTimes: number[]) => {
  let accumulator = 0;
  const perFrame: number[] = [];

  for (const elapsed of frameTimes) {
    const plan = planSteps(accumulator, elapsed);
    accumulator = plan.carry;
    perFrame.push(plan.steps);
  }

  return { perFrame, total: perFrame.reduce((a, b) => a + b, 0) };
};

describe('planSteps — ritmo de simulación', () => {
  it('a 60 Hz da exactamente un paso por frame', () => {
    const { perFrame } = run(Array(60).fill(1 / 60));
    expect(new Set(perFrame)).toEqual(new Set([1]));
  });

  it('a 144 Hz alterna 0 y 1 paso, y en un segundo simula ~60', () => {
    const { perFrame, total } = run(Array(144).fill(1 / 144));
    expect(new Set(perFrame.slice(2))).toEqual(new Set([0, 1]));
    expect(total).toBeGreaterThanOrEqual(59);
    expect(total).toBeLessThanOrEqual(60);
  });

  it('a 30 Hz da dos pasos por frame: el juego va a su velocidad, no a la mitad', () => {
    const { perFrame, total } = run(Array(30).fill(1 / 30));
    expect(new Set(perFrame)).toEqual(new Set([2]));
    expect(total).toBe(60);
  });

  it('nunca ejecuta más de MAX_STEPS_PER_FRAME en un frame', () => {
    for (const elapsed of [0.05, 0.1, 0.5, 2, 60]) {
      expect(planSteps(0, elapsed).steps, `${elapsed}s`).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    }
  });

  it('un parón largo se descarta en vez de recuperarse a tirones', () => {
    // Esto es lo que se sentía como "a veces todo va muy rápido": tras un frame
    // tardío, el bucle recuperaba el retraso simulando varios pasos de golpe.
    const { perFrame } = run([1 / 60, 5, 1 / 60, 1 / 60, 1 / 60]);
    expect(perFrame[1]).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    // Y el frame siguiente vuelve al ritmo normal: no queda deuda acumulada.
    expect(perFrame[2]).toBeLessThanOrEqual(1);
    expect(perFrame[3]).toBeLessThanOrEqual(1);
  });

  it('tras un parón no se acumula deuda que acelere los frames siguientes', () => {
    const conParon = run([...Array(10).fill(1 / 60), 3, ...Array(30).fill(1 / 60)]);
    const sinParon = run(Array(41).fill(1 / 60));
    // Como mucho los pasos del propio frame tardío, nunca 3 segundos de juego.
    expect(conParon.total - sinParon.total).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
  });

  it('el tiempo que entra en un frame está acotado', () => {
    expect(MAX_FRAME_TIME).toBeCloseTo(FIXED_STEP * MAX_STEPS_PER_FRAME);
    expect(planSteps(0, 10).carry).toBeLessThan(FIXED_STEP);
  });

  it('un elapsed negativo o cero no rompe ni resta saldo', () => {
    expect(planSteps(0, 0)).toEqual({ steps: 0, carry: 0 });
    expect(planSteps(0, -1)).toEqual({ steps: 0, carry: 0 });

    const conSaldo = planSteps(0.01, -5);
    expect(conSaldo.steps).toBe(0);
    expect(conSaldo.carry).toBeCloseTo(0.01);
  });

  it('el saldo pendiente nunca llega a un paso completo', () => {
    let accumulator = 0;
    for (let i = 0; i < 500; i++) {
      const plan = planSteps(accumulator, 1 / 90);
      accumulator = plan.carry;
      expect(accumulator).toBeGreaterThanOrEqual(0);
      expect(accumulator).toBeLessThan(FIXED_STEP);
    }
  });
});
