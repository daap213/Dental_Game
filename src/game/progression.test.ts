import { describe, it, expect } from 'vitest';
import {
  claimScoreMilestone,
  claimKillMilestone,
  killMilestones,
  scoreMilestones,
} from './progression';
import type { Player } from '../types';

type RunStats = Player['runStats'];

const freshStats = (): RunStats => ({
  killCount: 0,
  nextScoreMilestone: 6200,
  nextKillMilestone: 20,
  currentKillStep: 10,
});

/** Umbrales de bajas que se van alcanzando, en orden. */
const killSequence = (count: number, milestoneMult = 1): number[] => {
  const stats = freshStats();
  const thresholds: number[] = [];

  for (let kills = 1; thresholds.length < count && kills < 5000; kills++) {
    stats.killCount = kills;
    if (claimKillMilestone(stats, milestoneMult)) thresholds.push(kills);
  }

  return thresholds;
};

describe('hitos por bajas', () => {
  it('sigue la secuencia anunciada en la Base de Datos: 20, 30, 50, 80, 120', () => {
    // Regresión del fallo 12: el paso se incrementaba antes de sumarse, así que
    // la progresión real era 20, 40, 70, 110 mientras el menú prometía otra.
    expect(killSequence(5)).toEqual([20, 30, 50, 80, 120]);
  });

  it('no vuelve a dispararse con las mismas bajas', () => {
    const stats = freshStats();
    stats.killCount = 20;
    expect(claimKillMilestone(stats, 1)).toBe(true);
    expect(claimKillMilestone(stats, 1)).toBe(false);
    expect(claimKillMilestone(stats, 1)).toBe(false);
  });

  it('la dificultad escala los umbrales', () => {
    const facil = killSequence(3, 0.75);
    const leyenda = killSequence(3, 1.3);

    expect(facil[1]).toBeLessThan(30);
    expect(leyenda[1]).toBeGreaterThan(30);
    // El primero es el mismo: lo fija createPlayer, no el incremento.
    expect(facil[0]).toBe(20);
    expect(leyenda[0]).toBe(20);
  });

  it('aguanta un salto grande de bajas sin perder el hito', () => {
    const stats = freshStats();
    stats.killCount = 100;
    expect(claimKillMilestone(stats, 1)).toBe(true);
    // El siguiente umbral queda por delante, no por detrás.
    expect(stats.nextKillMilestone).toBeGreaterThan(stats.killCount - 100);
  });
});

describe('hitos por puntuación', () => {
  it('el primero a 6.200 y luego cada 8.000', () => {
    const stats = freshStats();
    expect(claimScoreMilestone(stats, 6199, 1)).toBe(false);
    expect(claimScoreMilestone(stats, 6200, 1)).toBe(true);
    expect(stats.nextScoreMilestone).toBe(14200);

    expect(claimScoreMilestone(stats, 14199, 1)).toBe(false);
    expect(claimScoreMilestone(stats, 14200, 1)).toBe(true);
    expect(stats.nextScoreMilestone).toBe(22200);
  });

  it('la dificultad escala el incremento', () => {
    const facil = freshStats();
    claimScoreMilestone(facil, 6200, 0.75);

    const leyenda = freshStats();
    claimScoreMilestone(leyenda, 6200, 1.3);

    expect(facil.nextScoreMilestone).toBeLessThan(leyenda.nextScoreMilestone);
  });
});

/**
 * Los umbrales que la ficha de conocimiento anuncia salen de aquí, no de una frase traducida.
 *
 * Este test es el que hace que **anunciar y reclamar no puedan discrepar**, que es exactamente lo
 * que pasó y quedó escrito en la cabecera de `progression.ts`: el menú prometía 20, 30, 50, 80 y
 * el juego daba 20, 40, 70, 110.
 */
describe('umbrales anunciados', () => {
  it('la secuencia de bajas es la que de verdad se reclama', () => {
    expect(killMilestones(5)).toEqual([20, 30, 50, 80, 120]);
  });

  it('y coincide paso por paso con lo que reclama el juego', () => {
    const stats = freshStats();
    const reclamados: number[] = [];

    for (let kills = 0; kills <= 400 && reclamados.length < 5; kills++) {
      stats.killCount = kills;
      if (claimKillMilestone(stats, 1)) reclamados.push(kills);
    }

    expect(reclamados).toEqual(killMilestones(5));
  });

  it('la de puntuación empieza en 6.200 y sube de 8.000 en 8.000', () => {
    expect(scoreMilestones(3)).toEqual([6200, 14200, 22200]);
  });
});
