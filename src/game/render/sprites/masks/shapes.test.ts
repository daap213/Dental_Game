import { describe, expect, it } from 'vitest';
import { resample, rotate90, rotate270, rotateMask } from './shapes';

/**
 * Los giros de máscaras.
 *
 * Lo que se comprueba no es que «quede bien», que no es comprobable, sino las tres propiedades
 * de las que depende que quede bien: que los ejes sean exactos, que no se pierdan los trazos de
 * un píxel y que se conserven los caracteres. Cada una cubre una forma concreta de estropear el
 * arte, y dos de las tres ya se estropearon.
 */

const filled = (rows: readonly string[]): number =>
  rows.reduce((total, row) => total + Array.from(row).filter((ch) => ch !== '.').length, 0);

/** Las columnas que tienen algún píxel, para poder ver si un trazo quedó a guiones. */
const columnsWithPixels = (rows: readonly string[]): number[] => {
  const columns = new Set<number>();
  rows.forEach((row) => Array.from(row).forEach((ch, x) => ch !== '.' && columns.add(x)));
  return [...columns].sort((a, b) => a - b);
};

const isContiguous = (values: readonly number[]): boolean =>
  values.every((value, i) => i === 0 || value === values[i - 1] + 1);

describe('giro exacto de noventa grados', () => {
  const shape = ['.##.', '####', '#..#'];

  it('el antihorario deshace el horario', () => {
    expect(rotate270(rotate90(shape))).toEqual(shape.map((row) => row));
  });

  /**
   * La propiedad por la que existe `rotate270`, y el fallo que costó no tenerla: para apuntar
   * hacia arriba hay que llevar la derecha arriba, y `rotate90` la lleva abajo.
   */
  it('el antihorario lleva la derecha arriba', () => {
    const pointer = ['....', '...#', '....'];
    const turned = rotate270(pointer);

    // El píxel estaba en el borde derecho, así que ahora tiene que estar en la fila de arriba.
    expect(turned[0]).toContain('#');
    // Y el horario lo habría llevado a la de abajo.
    expect(rotate90(pointer)[turned.length - 1]).toContain('#');
  });
});

describe('giro a un ángulo cualquiera', () => {
  const shape = ['.##.', '####', '#..#'];
  const line = ['............', '............', '############', '............', '............'];

  it('los múltiplos de noventa grados no se remuestrean', () => {
    expect(rotateMask(shape, 0).rows).toEqual(shape.map((row) => row));
    expect(rotateMask(shape, Math.PI / 2).rows).toEqual(rotate90(shape));
    expect(rotateMask(shape, Math.PI).rows).toEqual(rotate90(rotate90(shape)));
    expect(rotateMask(shape, (Math.PI * 3) / 2).rows).toEqual(rotate270(shape));
    // Una vuelta completa vuelve al principio, sin pasar por ninguna interpolación.
    expect(rotateMask(shape, Math.PI * 2).rows).toEqual(shape.map((row) => row));
  });

  /**
   * Un trazo de un píxel es lo que tienen la cuerda del arco, la guarda del cepillo y el filo
   * del látigo. Muestreando **tirando** sobrevive como una escalera; sobremuestreando con voto
   * por mayoría desaparece, y desaparecer en silencio es peor que salir torcido.
   */
  it('un trazo de un solo píxel no se pierde al inclinarlo', () => {
    const turned = rotateMask(line, Math.PI / 8);

    expect(filled(turned.rows)).toBeGreaterThanOrEqual(filled(line));
  });

  it('y no queda a guiones: todas sus columnas tienen algo', () => {
    const columns = columnsWithPixels(rotateMask(line, Math.PI / 8).rows);

    // Inclinada, una línea de doce ocupa `12·cos 22,5°` columnas: se **acorta** en horizontal,
    // no se alarga. Lo que no puede es dejar ninguna vacía por el camino.
    expect(columns.length).toBe(Math.round(12 * Math.cos(Math.PI / 8)));
    expect(isContiguous(columns)).toBe(true);
  });

  /**
   * Conservar el carácter es lo que permite girar una capa de detalle con la misma función que
   * la silueta. Girando solo los `#`, girar un detalle lo borraría.
   */
  it('conserva los caracteres, para que sirva también para el detalle', () => {
    const detail = ['CCCCWWWW', 'CCCCWWWW', 'CCCCWWWW', 'CCCCWWWW'];
    const turned = rotateMask(detail, Math.PI / 8).rows.join('');

    expect(turned).toContain('C');
    expect(turned).toContain('W');
    expect(turned).not.toContain('#');
  });

  it('la caja crece hasta envolver la inclinación', () => {
    const turned = rotateMask(line, Math.PI / 8);

    expect(turned.rows[0].length).toBeGreaterThan(line[0].length);
    expect(turned.rows.length).toBeGreaterThan(line.length);
  });

  /**
   * El pivote es por donde el arma se ancla al puño. Sin saber dónde acabó, cada inclinación
   * necesitaría su propia fórmula de colocación escrita a mano, que es lo que había.
   */
  it('dice dónde quedó el pivote', () => {
    const block = ['####', '####'];

    // Girando noventa grados en horario, la esquina de arriba a la izquierda se va a la derecha.
    expect(rotateMask(block, Math.PI / 2, { x: 0, y: 0 })).toMatchObject({ px: 1, py: 0 });
    // Y media vuelta la lleva a la esquina opuesta.
    expect(rotateMask(block, Math.PI, { x: 0, y: 0 })).toMatchObject({ px: 3, py: 1 });
  });

  it('el pivote inclinado sigue cayendo dentro del dibujo', () => {
    const held = Array.from({ length: 18 }, () => '#'.repeat(30));

    for (let eighth = 1; eighth < 16; eighth++) {
      const turned = rotateMask(held, (eighth * Math.PI) / 8, { x: 0, y: 9 });
      expect(turned.px, `el paso ${eighth}`).toBeGreaterThanOrEqual(-1);
      expect(turned.px, `el paso ${eighth}`).toBeLessThanOrEqual(turned.rows[0].length + 1);
      expect(turned.py, `el paso ${eighth}`).toBeGreaterThanOrEqual(-1);
      expect(turned.py, `el paso ${eighth}`).toBeLessThanOrEqual(turned.rows.length + 1);
    }
  });
});

describe('remuestreo', () => {
  it('con la identidad devuelve el mismo dibujo', () => {
    const shape = ['.##.', '####'];
    expect(resample(shape, 4, 2, (x, y) => ({ x, y }))).toEqual(shape.map((row) => row));
  });

  it('lo que cae fuera del origen queda vacío', () => {
    expect(resample(['##'], 4, 1, (x, y) => ({ x, y }))).toEqual(['##..']);
  });
});
