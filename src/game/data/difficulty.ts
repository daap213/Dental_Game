import type { Difficulty } from '../../types';

export interface DifficultyConfig {
  /** Probabilidad de que un enemigo muerto suelte un objeto (0-1). */
  dropRate: number;
  /** Multiplicador del daño que hace el jugador. */
  dmgDealt: number;
  /** Multiplicador del daño que recibe el jugador. */
  dmgTaken: number;
  /** Multiplicador de la vida máxima inicial. */
  hpMult: number;
  /** Multiplicador de los umbrales de puntuación/bajas que otorgan perks. */
  milestoneMult: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { dropRate: 0.25, dmgDealt: 1.15, dmgTaken: 0.85, hpMult: 1.25, milestoneMult: 0.75 },
  normal: { dropRate: 0.15, dmgDealt: 1.0, dmgTaken: 1.0, hpMult: 1.0, milestoneMult: 1.0 },
  hard: { dropRate: 0.08, dmgDealt: 0.98, dmgTaken: 1.0, hpMult: 1.0, milestoneMult: 1.0 },
  legend: { dropRate: 0.05, dmgDealt: 0.95, dmgTaken: 1.05, hpMult: 1.0, milestoneMult: 1.3 },
};

/** Tolera un valor inesperado cayendo a `normal`, igual que hacía GameCanvas. */
export const getDifficulty = (difficulty: Difficulty): DifficultyConfig =>
  DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.normal;
