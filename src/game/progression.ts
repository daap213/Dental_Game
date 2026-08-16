import type { Player } from '../types';
import { SCORE_MILESTONE_INCREMENT, KILL_MILESTONE_INCREMENT_START } from './data/physics';

type RunStats = Player['runStats'];

/**
 * Hitos que otorgan un perk.
 *
 * Vivían dentro de `update()` como dos bloques de aritmética suelta. Aquí son
 * dos funciones que se pueden comprobar, que es como se ha visto que la
 * progresión de bajas no coincidía con la anunciada en la Base de Datos del
 * menú: el paso se incrementaba **antes** de sumarse, así que la secuencia real
 * era 20, 40, 70, 110 en vez de 20, 30, 50, 80.
 */

/**
 * ¿Toca perk por puntuación? Si sí, avanza el umbral.
 *
 * Umbrales: 6.200 y luego cada 8.000, escalados por la dificultad.
 */
export const claimScoreMilestone = (runStats: RunStats, score: number, milestoneMult: number): boolean => {
  if (score < runStats.nextScoreMilestone) return false;
  runStats.nextScoreMilestone += SCORE_MILESTONE_INCREMENT * milestoneMult;
  return true;
};

/**
 * ¿Toca perk por bajas? Si sí, avanza el umbral.
 *
 * Umbrales: 20, 30, 50, 80, 120… El paso empieza en 10 y sube 10 cada vez,
 * **después** de sumarlo al umbral.
 */
export const claimKillMilestone = (runStats: RunStats, milestoneMult: number): boolean => {
  if (runStats.killCount < runStats.nextKillMilestone) return false;
  runStats.nextKillMilestone += runStats.currentKillStep * milestoneMult;
  runStats.currentKillStep += KILL_MILESTONE_INCREMENT_START;
  return true;
};
