import { Language } from '../types';
import { TEXT } from '../i18n';

/**
 * El "diagnóstico" del General Gingivitis lo escribía una IA a partir de la
 * puntuación. Ahora son cuatro frases fijas elegidas por esa misma puntuación,
 * de modo que el villano se ceba menos cuanto mejor lo hiciste.
 *
 * Determinista a propósito: la puntuación ya es el único dato que el texto
 * usaba, y un `Math.random()` aquí haría que la misma partida contase dos
 * historias distintas.
 */
const DIAGNOSIS_THRESHOLDS = [2_000, 8_000, 20_000] as const;

/** Índice en `gameover.diagnosis`. Devuelve 0..DIAGNOSIS_THRESHOLDS.length. */
export const diagnosisIndexFor = (score: number): number => {
  let index = 0;
  while (index < DIAGNOSIS_THRESHOLDS.length && score >= DIAGNOSIS_THRESHOLDS[index]) index++;
  return index;
};

export const diagnosisFor = (score: number, lang: Language): string =>
  TEXT[lang].gameover.diagnosis[diagnosisIndexFor(score)];
