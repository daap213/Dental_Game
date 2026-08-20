import { describe, it, expect } from 'vitest';
import { memoryStorage, STORAGE_PREFIX, type StorageLike } from './driver';
import { SCHEMA_VERSION, SETTINGS_KEY, eraseAll, load, save } from './store';

/**
 * El almacenamiento.
 *
 * La regla que estos tests defienden es una sola: **nada de aquí lanza**. Lo que
 * se guarda son preferencias y récords, y un JSON corrupto o una cuota agotada
 * tienen que degradar a los valores por defecto. El peor caso posible sería
 * reventar en la pantalla de fin de partida, que es justo cuando se escribe.
 *
 * El driver falso es un `Map`, sin tocar ninguna variable global: los tests
 * corren en node y ahí `localStorage` no existe.
 */
const parseNumber = (raw: unknown): number => (typeof raw === 'number' ? raw : -1);

describe('ida y vuelta', () => {
  it('lo guardado se recupera igual', () => {
    const storage = memoryStorage();
    expect(save(storage, SETTINGS_KEY, 42)).toBe(true);
    expect(load(storage, SETTINGS_KEY, parseNumber)).toBe(42);
  });

  it('una clave que no existe cae en los valores por defecto', () => {
    expect(load(memoryStorage(), SETTINGS_KEY, parseNumber)).toBe(-1);
  });

  it('sin almacenamiento, también', () => {
    // Modo privado, o sencillamente no hay navegador.
    expect(load(null, SETTINGS_KEY, parseNumber)).toBe(-1);
    expect(save(null, SETTINGS_KEY, 1)).toBe(false);
    expect(eraseAll(null)).toBe(false);
  });
});

describe('datos rotos', () => {
  const broken: Array<[string, string]> = [
    ['JSON truncado', '{"v":1,"data":'],
    ['JSON que no es objeto', '"hola"'],
    ['sin envoltorio', '{"language":"es"}'],
    ['versión distinta', `{"v":${SCHEMA_VERSION + 1},"data":42}`],
    ['versión ausente', '{"data":42}'],
    ['nulo', 'null'],
    ['vacío', ''],
  ];

  for (const [name, raw] of broken) {
    it(`${name}: valores por defecto, sin lanzar`, () => {
      const storage = memoryStorage({ [SETTINGS_KEY]: raw });
      expect(() => load(storage, SETTINGS_KEY, parseNumber)).not.toThrow();
      expect(load(storage, SETTINGS_KEY, parseNumber)).toBe(-1);
    });
  }
});

describe('almacenamiento que falla', () => {
  const throwing = (): StorageLike => ({
    getItem: () => {
      throw new Error('bloqueado');
    },
    setItem: () => {
      throw new DOMException('cuota', 'QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('bloqueado');
    },
    keys: () => {
      throw new Error('bloqueado');
    },
  });

  it('guardar devuelve false en vez de lanzar', () => {
    expect(save(throwing(), SETTINGS_KEY, { a: 1 })).toBe(false);
  });

  it('leer degrada en vez de lanzar', () => {
    expect(load(throwing(), SETTINGS_KEY, parseNumber)).toBe(-1);
  });

  it('borrar degrada en vez de lanzar', () => {
    expect(eraseAll(throwing())).toBe(false);
  });
});

describe('borrar mis datos', () => {
  it('barre todo lo del juego y respeta lo ajeno', () => {
    // Barrer por prefijo y no por dos claves conocidas: si mañana se guarda una
    // tercera cosa, el botón de borrar seguiría mintiendo sin que nada fallase.
    const storage = memoryStorage({
      [`${STORAGE_PREFIX}settings`]: '1',
      [`${STORAGE_PREFIX}scores`]: '2',
      [`${STORAGE_PREFIX}futuro`]: '3',
      'otra-app:datos': 'no tocar',
    });

    expect(eraseAll(storage)).toBe(true);
    expect(storage.keys()).toEqual(['otra-app:datos']);
  });
});
