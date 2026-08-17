import { describe, it, expect } from 'vitest';
import { px, hline, vline, outline, block, type PixelTarget } from './pixel';
import { bayerMask, bayerCoverage, dither, ditherBand, DITHER_LEVELS } from './dither';
import { tone, RAMPS, isPaletteKey, MISSING_COLOR, type PaletteKey } from '../data/palette';

interface Call {
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Contexto de pega que apunta cada rectángulo. Basta para comprobar la rejilla. */
const recorder = () => {
  const calls: Call[] = [];
  const ctx: PixelTarget = {
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push({ color: String(this.fillStyle), x, y, w, h });
    },
  };
  return { ctx, calls };
};

const allIntegers = (calls: Call[]) =>
  calls.every(
    (c) =>
      Number.isInteger(c.x) && Number.isInteger(c.y) && Number.isInteger(c.w) && Number.isInteger(c.h)
  );

/** Luminancia relativa, para poder comprobar que una rampa va de oscuro a claro. */
const luminance = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const RAMP_ORDER = ['out', 'shade', 'dark', 'mid', 'light', 'hi'] as const;

describe('paleta', () => {
  it('todas las rampas tienen los seis tonos', () => {
    for (const [name, ramp] of Object.entries(RAMPS)) {
      for (const t of RAMP_ORDER) {
        expect(ramp[t], `${name}.${t}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('los tonos de una rampa son distintos entre sí', () => {
    for (const [name, ramp] of Object.entries(RAMPS)) {
      const tones = new Set(Object.values(ramp));
      expect(tones.size, `${name} repite tonos`).toBe(RAMP_ORDER.length);
    }
  });

  it('cada rampa sube de luminancia de contorno a brillo, sin escalones planos', () => {
    // Es lo que la convierte en una rampa utilizable: si dos tonos consecutivos
    // se cruzan, el sombreado automático deja de leerse como volumen.
    for (const [name, ramp] of Object.entries(RAMPS)) {
      const lums = RAMP_ORDER.map((t) => luminance(ramp[t]));
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i], `${name}: ${RAMP_ORDER[i]} debería ser más claro que ${RAMP_ORDER[i - 1]}`).toBeGreaterThan(lums[i - 1]);
      }
    }
  });

  it('el recorrido de cada rampa es amplio: hay sitio para sombrear', () => {
    for (const [name, ramp] of Object.entries(RAMPS)) {
      const range = luminance(ramp.hi) - luminance(ramp.out);
      expect(range, `${name} tiene un recorrido de solo ${Math.round(range)}`).toBeGreaterThan(90);
    }
  });

  it('resuelve claves válidas y avisa de las inventadas', () => {
    expect(tone('bacteria.mid')).toBe(RAMPS.bacteria.mid);
    expect(tone('enamel.out')).toBe(RAMPS.enamel.out);
    expect(tone('noExiste.mid' as PaletteKey)).toBe(MISSING_COLOR);
    expect(tone('bacteria.brillante' as PaletteKey)).toBe(MISSING_COLOR);
  });

  it('isPaletteKey distingue lo que existe', () => {
    expect(isPaletteKey('gum.light')).toBe(true);
    expect(isPaletteKey('gum')).toBe(false);
    expect(isPaletteKey('gum.turbo')).toBe(false);
    expect(isPaletteKey('inventado.mid')).toBe(false);
  });
});

describe('primitivas de píxel', () => {
  it('px redondea a la rejilla', () => {
    const { ctx, calls } = recorder();
    px(ctx, 10.4, 20.6, 5.5, 3.2, 'gum.mid');
    expect(calls).toEqual([{ color: RAMPS.gum.mid, x: 10, y: 21, w: 6, h: 3 }]);
    expect(allIntegers(calls)).toBe(true);
  });

  it('px ignora rectángulos vacíos o negativos', () => {
    const { ctx, calls } = recorder();
    px(ctx, 0, 0, 0, 10, 'gum.mid');
    px(ctx, 0, 0, 10, -3, 'gum.mid');
    expect(calls).toHaveLength(0);
  });

  it('las líneas miden un píxel de grosor', () => {
    const { ctx, calls } = recorder();
    hline(ctx, 2, 3, 10, 'metal.mid');
    vline(ctx, 2, 3, 10, 'metal.mid');
    expect(calls[0]).toMatchObject({ x: 2, y: 3, w: 10, h: 1 });
    expect(calls[1]).toMatchObject({ x: 2, y: 3, w: 1, h: 10 });
  });

  it('outline dibuja cuatro lados y no rellena', () => {
    const { ctx, calls } = recorder();
    outline(ctx, 0, 0, 10, 8, 'enamel.out');
    expect(calls).toHaveLength(4);
    const area = calls.reduce((sum, c) => sum + c.w * c.h, 0);
    // Perímetro de 10x8 sin contar dos veces las esquinas: 10+10+6+6 = 32
    expect(area).toBe(32);
  });

  it('block rellena y contornea con el out del mismo material', () => {
    const { ctx, calls } = recorder();
    block(ctx, 0, 0, 6, 6, 'bacteria.mid');
    expect(calls[0]).toMatchObject({ color: RAMPS.bacteria.mid, w: 6, h: 6 });
    expect(calls.slice(1).every((c) => c.color === RAMPS.bacteria.out)).toBe(true);
  });
});

describe('tramado', () => {
  it('el nivel 0 es todo el tono base y el máximo es todo el segundo', () => {
    expect(bayerCoverage(0)).toBe(0);
    expect(bayerCoverage(DITHER_LEVELS - 1)).toBe(16);
  });

  it('la cobertura crece de uno en uno con el nivel', () => {
    const coverages = Array.from({ length: DITHER_LEVELS }, (_, i) => bayerCoverage(i));
    expect(coverages).toEqual(Array.from({ length: DITHER_LEVELS }, (_, i) => i));
  });

  it('es determinista: la misma entrada da la misma máscara', () => {
    expect(bayerMask(7)).toEqual(bayerMask(7));
  });

  it('recorta niveles fuera de rango en vez de romperse', () => {
    expect(bayerCoverage(-5)).toBe(0);
    expect(bayerCoverage(999)).toBe(16);
  });

  it('el nivel 0 y el 16 se pintan de una sola pasada', () => {
    const base = recorder();
    dither(base.ctx, 0, 0, 40, 40, 'gum.dark', 'gum.light', 0);
    expect(base.calls).toHaveLength(1);

    const full = recorder();
    dither(full.ctx, 0, 0, 40, 40, 'gum.dark', 'gum.light', DITHER_LEVELS - 1);
    expect(full.calls).toHaveLength(2);
    expect(full.calls[1].color).toBe(RAMPS.gum.light);
  });

  it('un nivel intermedio mezcla los dos tonos en la proporción de la máscara', () => {
    const { ctx, calls } = recorder();
    dither(ctx, 0, 0, 8, 8, 'gum.dark', 'gum.light', 8);
    const overPixels = calls.filter((c) => c.color === RAMPS.gum.light).length;
    // 8/16 de cobertura sobre 64 píxeles.
    expect(overPixels).toBe(32);
    expect(allIntegers(calls)).toBe(true);
  });

  it('el tramado se ancla al lienzo, no al rectángulo', () => {
    // Dos rectángulos contiguos con el mismo nivel deben encajar sin costura:
    // el patrón depende de la coordenada absoluta.
    const a = recorder();
    dither(a.ctx, 0, 0, 8, 4, 'gum.dark', 'gum.light', 8);
    const b = recorder();
    dither(b.ctx, 4, 0, 4, 4, 'gum.dark', 'gum.light', 8);

    const inA = a.calls
      .filter((c) => c.color === RAMPS.gum.light && c.x >= 4)
      .map((c) => `${c.x},${c.y}`)
      .sort();
    const inB = b.calls
      .filter((c) => c.color === RAMPS.gum.light)
      .map((c) => `${c.x},${c.y}`)
      .sort();
    expect(inB).toEqual(inA);
  });

  it('ditherBand recorre del tono base al segundo', () => {
    const { ctx, calls } = recorder();
    ditherBand(ctx, 0, 0, 16, 32, 'gum.dark', 'gum.light', 4);

    const firstBand = calls.filter((c) => c.y < 8 && c.color === RAMPS.gum.light).length;
    const lastBand = calls.filter((c) => c.y >= 24 && c.color === RAMPS.gum.light).length;
    expect(firstBand).toBe(0);
    expect(lastBand).toBeGreaterThan(0);
  });
});
