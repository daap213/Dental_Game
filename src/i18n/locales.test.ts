import { describe, it, expect } from 'vitest';
import { TEXT } from './index';

/** Aplana un objeto anidado a rutas tipo "menu.btn_start". */
const flatten = (obj: unknown, prefix = ''): string[] => {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key)
  );
};

describe('paridad de traducciones', () => {
  const enKeys = flatten(TEXT.en).sort();
  const esKeys = flatten(TEXT.es).sort();

  it('es tiene todas las claves de en', () => {
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([]);
  });

  it('en tiene todas las claves de es', () => {
    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('ningún texto está vacío', () => {
    for (const lang of ['en', 'es'] as const) {
      const empties = flatten(TEXT[lang]).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], TEXT[lang]);
        return typeof value === 'string' && value.trim() === '';
      });
      expect(empties, `textos vacíos en "${lang}"`).toEqual([]);
    }
  });
});
