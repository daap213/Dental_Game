import { describe, it, expect } from 'vitest';
import {
  ANON_NICKNAME,
  SCORES_MAX,
  addScore,
  formatDuration,
  parseScores,
  qualifies,
  type ScoreEntry,
} from './scores';

/**
 * La tabla de récords.
 *
 * Lo que hay que fijar aquí no son ejemplos sino invariantes: que el orden y el
 * tope sean los que dice la interfaz, que añadir no mute lo que recibe, y —la
 * lección de `progression.test.ts`— que **`qualifies` concuerde con lo que
 * `addScore` hace de verdad**. Si se separan, la interfaz ofrece meter el apodo
 * por una puntuación que luego se descarta en silencio.
 */
const entry = (score: number, over: Partial<ScoreEntry> = {}): ScoreEntry => ({
  id: `id-${score}-${over.nickname ?? ''}`,
  date: '2026-08-19',
  nickname: 'ANA',
  score,
  character: 'molar',
  difficulty: 'normal',
  stage: 1,
  kills: 0,
  ms: 0,
  outcome: 'defeat',
  ...over,
});

const full = Array.from({ length: SCORES_MAX }, (_, i) => entry((i + 1) * 100));

describe('orden y tope', () => {
  it('ordena de mayor a menor', () => {
    const table = addScore(addScore([entry(100)], entry(300)), entry(200));
    expect(table.map((e) => e.score)).toEqual([300, 200, 100]);
  });

  it('en un empate se queda delante la más antigua', () => {
    // Convención de recreativa: el primero que llegó a la cifra conserva el sitio.
    const first = entry(500, { nickname: 'PRIMERA' });
    const second = entry(500, { nickname: 'SEGUNDA' });
    expect(addScore([first], second).map((e) => e.nickname)).toEqual(['PRIMERA', 'SEGUNDA']);
  });

  it('nunca pasa del tope', () => {
    let table: ScoreEntry[] = [];
    for (let i = 0; i < SCORES_MAX * 3; i++) table = addScore(table, entry(i * 10));
    expect(table.length).toBe(SCORES_MAX);
  });

  it('con la tabla llena, una puntuación baja no entra', () => {
    const table = addScore(full, entry(1));
    expect(table.length).toBe(SCORES_MAX);
    expect(table.some((e) => e.score === 1)).toBe(false);
  });

  it('con la tabla llena, una alta desplaza a la peor', () => {
    const table = addScore(full, entry(99999));
    expect(table[0].score).toBe(99999);
    expect(table.some((e) => e.score === 100)).toBe(false);
  });

  it('no muta la tabla que recibe', () => {
    // Vive en el estado de React: mutarla en el sitio no repintaría nada.
    const before = [...full];
    addScore(full, entry(99999));
    expect(full).toEqual(before);
  });
});

describe('qualifies concuerda con addScore', () => {
  const tables: Array<[string, ScoreEntry[]]> = [
    ['vacía', []],
    ['a medias', full.slice(0, 3)],
    ['llena', full],
  ];

  for (const [name, table] of tables) {
    it(`tabla ${name}`, () => {
      for (const score of [0, 1, 50, 100, 550, 1000, 99999]) {
        const entered = addScore(table, entry(score, { nickname: 'NUEVA' })).some(
          (e) => e.nickname === 'NUEVA'
        );
        expect(qualifies(table, score), `${name} @ ${score}`).toBe(entered);
      }
    });
  }
});

describe('saneado desde el almacenamiento', () => {
  it('lo que no es lista da tabla vacía', () => {
    for (const raw of [null, undefined, 7, 'hola', {}]) expect(parseScores(raw)).toEqual([]);
  });

  it('descarta filas sin puntuación y conserva el resto', () => {
    const parsed = parseScores([entry(300), { nickname: 'SIN PUNTOS' }, null, 7, entry(100)]);
    expect(parsed.map((e) => e.score)).toEqual([300, 100]);
  });

  it('rellena los campos que falten en vez de tirar la fila', () => {
    const [row] = parseScores([{ score: 250 }]);
    expect(row.score).toBe(250);
    expect(row.nickname).toBe(ANON_NICKNAME);
    expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.character).toBe('molar');
    expect(row.difficulty).toBe('normal');
    expect(row.stage).toBeGreaterThanOrEqual(1);
    expect(row.outcome).toBe('defeat');
  });

  it('aguanta valores absurdos', () => {
    const [row] = parseScores([
      { score: 1e9, stage: -3, kills: NaN, ms: -100, character: 'gato', difficulty: 'imposible' },
    ]);
    expect(row.score).toBe(1e9);
    expect(row.stage).toBe(1);
    expect(row.kills).toBe(0);
    expect(row.ms).toBe(0);
    expect(row.character).toBe('molar');
  });

  it('recorta al tope y ordena aunque llegue desordenado', () => {
    const many = Array.from({ length: 40 }, (_, i) => entry(i));
    const parsed = parseScores(many);
    expect(parsed.length).toBe(SCORES_MAX);
    expect(parsed[0].score).toBe(39);
  });

  it('da la vuelta a una tabla real sin cambiarla', () => {
    expect(parseScores(full.slice(0, 3))).toEqual(parseScores(parseScores(full.slice(0, 3))));
  });
});

describe('duración', () => {
  it('se lee como minutos y segundos', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9_000)).toBe('0:09');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_600_000)).toBe('60:00');
  });

  it('aguanta valores imposibles', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});
