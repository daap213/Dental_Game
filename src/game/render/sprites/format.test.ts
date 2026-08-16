import { describe, it, expect } from 'vitest';
import { paintSprite, validateSprite, TRANSPARENT, type SpriteDef } from './format';
import { RAMPS } from '../../data/palette';
import type { PixelTarget } from '../pixel';

const recorder = () => {
  const calls: { color: string; x: number; y: number; w: number; h: number }[] = [];
  const ctx: PixelTarget = {
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push({ color: String(this.fillStyle), x, y, w, h });
    },
  };
  return { ctx, calls };
};

/** Sprite de prueba: un bloque de 4×3 con contorno y dos tonos. */
const SAMPLE: SpriteDef = {
  w: 4,
  h: 3,
  rows: ['.##.', '#12#', '.##.'],
  map: {
    '#': 'bacteria.out',
    '1': 'bacteria.light',
    '2': 'bacteria.mid',
  },
};

describe('validateSprite', () => {
  it('acepta un sprite bien escrito', () => {
    expect(validateSprite(SAMPLE)).toEqual([]);
  });

  it('detecta que sobran o faltan filas', () => {
    const problems = validateSprite({ ...SAMPLE, h: 5 });
    expect(problems.join(' ')).toContain('h=5');
  });

  it('detecta una fila de ancho distinto', () => {
    const problems = validateSprite({ ...SAMPLE, rows: ['.##.', '#12', '.##.'] });
    expect(problems.join(' ')).toContain('fila 1');
  });

  it('detecta un carácter sin color asignado', () => {
    const problems = validateSprite({ ...SAMPLE, rows: ['.##.', '#1X#', '.##.'] });
    expect(problems.join(' ')).toContain("'X' no está en map");
  });

  it('detecta un color que no existe en la paleta', () => {
    const problems = validateSprite({
      ...SAMPLE,
      map: { ...SAMPLE.map, '#': 'inventado.mid' as never },
    });
    expect(problems.join(' ')).toContain('inventado.mid');
  });

  it('no permite mapear el carácter transparente', () => {
    const problems = validateSprite({
      ...SAMPLE,
      map: { ...SAMPLE.map, [TRANSPARENT]: 'gum.mid' },
    });
    expect(problems.join(' ')).toContain('transparente');
  });
});

describe('paintSprite', () => {
  it('no pinta nada donde hay transparencia', () => {
    const { ctx, calls } = recorder();
    paintSprite(ctx, SAMPLE);

    const painted = calls.flatMap((c) =>
      Array.from({ length: c.w }, (_, i) => `${c.x + i},${c.y}`)
    );
    expect(painted).not.toContain('0,0');
    expect(painted).not.toContain('3,0');
    expect(painted).toContain('1,0');
  });

  it('agrupa los píxeles contiguos del mismo tono en un solo rectángulo', () => {
    const { ctx, calls } = recorder();
    paintSprite(ctx, SAMPLE);

    // Fila 0: '.##.' es un único tramo de dos píxeles, no dos llamadas.
    const row0 = calls.filter((c) => c.y === 0);
    expect(row0).toHaveLength(1);
    expect(row0[0]).toMatchObject({ x: 1, w: 2, color: RAMPS.bacteria.out });
  });

  it('usa el tono que dice el mapa para cada carácter', () => {
    const { ctx, calls } = recorder();
    paintSprite(ctx, SAMPLE);

    const row1 = calls.filter((c) => c.y === 1);
    expect(row1.map((c) => c.color)).toEqual([
      RAMPS.bacteria.out,
      RAMPS.bacteria.light,
      RAMPS.bacteria.mid,
      RAMPS.bacteria.out,
    ]);
  });

  it('todo cae en coordenadas enteras', () => {
    const { ctx, calls } = recorder();
    paintSprite(ctx, SAMPLE);
    expect(
      calls.every((c) => Number.isInteger(c.x) && Number.isInteger(c.y) && Number.isInteger(c.w))
    ).toBe(true);
  });
});
