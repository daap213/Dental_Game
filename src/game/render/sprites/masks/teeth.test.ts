import { describe, it, expect } from 'vitest';
import { lowerTooth, occlusalDetail, upperTooth, type ToothKind } from './teeth';

const KINDS: readonly ToothKind[] = ['incisor', 'premolar', 'molar'];
const SIZES: readonly [number, number][] = [
  [26, 30],
  [38, 38],
  [52, 46],
];

/** Píxeles sólidos de una fila. */
const filled = (row: string) => [...row].filter((c) => c === '#').length;

describe('los dientes no muestran raíz', () => {
  /**
   * Es la corrección de realismo que motivó el rediseño. El diente anterior era el de
   * un libro de texto: corona más dos raíces largas y separadas. **Desde dentro de una
   * boca la raíz no se ve: está en el hueso.**
   *
   * Una raíz se delata en la máscara porque la silueta se estrecha mucho hacia el lado
   * de la encía y se parte en dos patas, dejando un hueco en medio. Así que se
   * comprueba justo eso: que el lado de la encía sea **ancho y de una pieza**.
   */
  it('el lado de la encía es ancho, no dos patas', () => {
    for (const kind of KINDS) {
      for (const [w, h] of SIZES) {
        const arriba = upperTooth(w, h, kind);
        const abajo = lowerTooth(w, h, kind);

        // En el diente de arriba la encía queda en la fila 0; en el de abajo, en la
        // última.
        const anchoMax = Math.max(...arriba.map(filled));
        expect(filled(arriba[0]), `superior ${kind} ${w}x${h}`).toBeGreaterThan(anchoMax * 0.6);
        expect(filled(abajo[h - 1]), `inferior ${kind} ${w}x${h}`).toBeGreaterThan(anchoMax * 0.6);
      }
    }
  });

  it('la fila de la encía es un tramo continuo, sin partirse', () => {
    // Dos raíces dejan un hueco central. Un tramo continuo garantiza que no hay patas.
    for (const kind of KINDS) {
      for (const [w, h] of SIZES) {
        for (const [nombre, row] of [
          ['superior', upperTooth(w, h, kind)[0]],
          ['inferior', lowerTooth(w, h, kind)[h - 1]],
        ] as const) {
          const tramos = row.split('.').filter((s) => s.length > 0).length;
          expect(tramos, `${nombre} ${kind} ${w}x${h}`).toBe(1);
        }
      }
    }
  });

  it('ninguna fila queda vacía: la corona es una sola masa', () => {
    for (const kind of KINDS) {
      for (const [w, h] of SIZES) {
        for (const [nombre, mask] of [
          ['superior', upperTooth(w, h, kind)],
          ['inferior', lowerTooth(w, h, kind)],
        ] as const) {
          mask.forEach((row, y) => {
            expect(filled(row), `${nombre} ${kind} ${w}x${h} fila ${y}`).toBeGreaterThan(0);
          });
        }
      }
    }
  });
});

describe('la superficie de mordida', () => {
  it('está en el borde que mira a la cámara, y solo ahí', () => {
    // El diente de arriba se ve desde abajo, así que su mordida asoma por el borde
    // inferior; el de abajo se ve desde arriba y la enseña por el superior. Si se
    // invirtieran, las cúspides apuntarían hacia la encía.
    const [w, h] = [52, 46];
    const arriba = upperTooth(w, h, 'molar');
    const abajo = lowerTooth(w, h, 'molar');

    // Las muescas de las cúspides recortan la silueta: la fila del borde de mordida
    // tiene menos píxeles que la del cuello.
    expect(filled(arriba[h - 1])).toBeLessThan(filled(arriba[Math.round(h * 0.6)]));
    expect(filled(abajo[0])).toBeLessThan(filled(abajo[Math.round(h * 0.4)]));
  });

  it('el molar tiene más cúspides que el incisivo', () => {
    const [w, h] = [52, 46];
    const cuenta = (mask: readonly string[]) =>
      mask[h - 1].split('#').filter((s) => s.length > 0).length;
    expect(cuenta(upperTooth(w, h, 'molar'))).toBeGreaterThan(
      cuenta(upperTooth(w, h, 'incisor'))
    );
  });

  it('el detalle cabe en la máscara y usa solo caracteres conocidos', () => {
    for (const kind of KINDS) {
      for (const [w, h] of SIZES) {
        for (const fromTop of [true, false]) {
          const rows = occlusalDetail(w, h, kind, fromTop);
          expect(rows, `${kind} ${w}x${h}`).toHaveLength(h);
          for (const row of rows) {
            expect(row.length).toBe(w);
            expect(/^[.SH]*$/.test(row), `caracteres raros en ${kind}`).toBe(true);
          }
        }
      }
    }
  });
});
