import { describe, it, expect } from 'vitest';
import { chance, hash, hashInt, jitter, pick, spread } from './noise';

/**
 * El fondo se hornea una vez y se guarda en caché, así que si la variación no
 * fuese determinista cada partida tendría un escenario distinto congelado con la
 * tirada de aquella vez. Es el fallo que tenía la escena de créditos.
 */
describe('variación determinista', () => {
  it('la misma semilla da siempre el mismo valor', () => {
    for (let i = 0; i < 50; i++) {
      expect(hash(i)).toBe(hash(i));
      expect(hash(i, 3)).toBe(hash(i, 3));
      expect(hash(i, 3, 7)).toBe(hash(i, 3, 7));
    }
  });

  it('el orden de las semillas importa, así que las fases no se solapan', () => {
    expect(hash(3, 7)).not.toBe(hash(7, 3));
    // La misma columna en dos fases distintas elige distinto.
    const columna = 12;
    const porFase = new Set([1, 2, 3, 4, 5].map((fase) => hash(columna, fase)));
    expect(porFase.size).toBe(5);
  });

  it('cambiar la semilla en uno cambia el valor de verdad', () => {
    // Si semillas contiguas dieran valores parecidos, las columnas vecinas
    // elegirían la misma variante y volvería el patrón.
    let saltos = 0;
    for (let i = 0; i < 200; i++) {
      if (Math.abs(hash(i) - hash(i + 1)) > 0.2) saltos++;
    }
    expect(saltos).toBeGreaterThan(120);
  });

  it('siempre queda en [0, 1)', () => {
    for (let i = -50; i < 500; i += 3) {
      const v = hash(i, i * 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('reparte de forma razonablemente uniforme', () => {
    const cubos = new Array(10).fill(0);
    for (let i = 0; i < 4000; i++) cubos[Math.floor(hash(i) * 10)]++;
    // 400 esperados por cubo; se admite ±40%, que descarta un generador sesgado
    // sin convertir esto en un test estadístico frágil.
    for (const [i, n] of cubos.entries()) {
      expect(n, `cubo ${i}`).toBeGreaterThan(240);
      expect(n, `cubo ${i}`).toBeLessThan(560);
    }
  });

  it('aguanta semillas raras sin devolver NaN', () => {
    for (const v of [hash(NaN), hash(Infinity), hash(-0), hash(1.5), hash()]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashInt y pick', () => {
  it('hashInt nunca se sale del rango', () => {
    for (let i = 0; i < 300; i++) {
      const v = hashInt(6, i);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('hashInt con un solo valor posible devuelve 0', () => {
    expect(hashInt(1, 42)).toBe(0);
    expect(hashInt(0, 42)).toBe(0);
    expect(hashInt(-3, 42)).toBe(0);
  });

  it('pick usa todas las variantes disponibles', () => {
    // Si no las usara todas, hornear seis dientes para enseñar dos sería tirar
    // el trabajo.
    const variantes = ['a', 'b', 'c', 'd', 'e', 'f'];
    const vistas = new Set<string>();
    for (let columna = 0; columna < 60; columna++) vistas.add(pick(variantes, columna, 1));
    expect(vistas.size).toBe(variantes.length);
  });

  it('chance respeta la probabilidad', () => {
    let aciertos = 0;
    for (let i = 0; i < 2000; i++) if (chance(0.25, i)) aciertos++;
    expect(aciertos).toBeGreaterThan(400);
    expect(aciertos).toBeLessThan(600);

    for (let i = 0; i < 50; i++) {
      expect(chance(0, i)).toBe(false);
      expect(chance(1, i)).toBe(true);
    }
  });
});

describe('jitter y spread', () => {
  it('jitter se queda dentro del margen y es entero', () => {
    for (let i = 0; i < 300; i++) {
      const v = jitter(4, i);
      expect(Number.isInteger(v)).toBe(true);
      expect(Math.abs(v)).toBeLessThanOrEqual(4);
    }
  });

  it('jitter usa el margen entero, no solo el centro', () => {
    const vistos = new Set<number>();
    for (let i = 0; i < 200; i++) vistos.add(jitter(3, i));
    expect(vistos.has(-3)).toBe(true);
    expect(vistos.has(3)).toBe(true);
  });

  it('spread deja cada elemento en su propia franja', () => {
    // Un hash suelto por índice se apelotona; esto garantiza cobertura.
    const count = 8;
    for (let i = 0; i < count; i++) {
      const v = spread(count, i, 99);
      expect(v).toBeGreaterThanOrEqual(i / count);
      expect(v).toBeLessThan((i + 1) / count);
    }
  });

  it('spread es estable y acepta índices fuera de rango', () => {
    expect(spread(8, 3, 1)).toBe(spread(8, 3, 1));
    expect(spread(8, 11, 1)).toBeGreaterThanOrEqual(3 / 8);
    expect(spread(0, 3, 1)).toBe(0);
  });
});
