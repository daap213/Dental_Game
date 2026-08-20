import { describe, it, expect } from 'vitest';
import { diagnosisFor, diagnosisIndexFor } from './gameover';
import { TEXT } from '../i18n';

describe('diagnóstico de fin de partida', () => {
  it('cubre exactamente las frases del diccionario', () => {
    // Si se añade una frase y no un umbral —o al revés— el último tramo queda
    // inalcanzable o el índice se sale de la lista y el texto sale `undefined`.
    const seen = new Set<number>();
    for (let score = 0; score <= 40_000; score += 100) seen.add(diagnosisIndexFor(score));

    const total = TEXT.en.gameover.diagnosis.length;
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: total }, (_, i) => i));
  });

  it('nunca se sale de la lista, ni con puntuaciones absurdas', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const score of [0, 1, 1_999, 2_000, 7_999, 8_000, 19_999, 20_000, 9_999_999]) {
        expect(diagnosisFor(score, lang), `${lang} @ ${score}`).toBeTruthy();
      }
    }
  });

  it('es determinista: la misma partida cuenta siempre lo mismo', () => {
    expect(diagnosisFor(12_345, 'es')).toBe(diagnosisFor(12_345, 'es'));
  });

  it('no se ceba menos cuanto peor lo hiciste', () => {
    // El orden de la lista va de peor a mejor partida, así que el índice tiene
    // que crecer con la puntuación y nunca retroceder.
    let previous = diagnosisIndexFor(0);
    for (let score = 0; score <= 40_000; score += 250) {
      const current = diagnosisIndexFor(score);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});
