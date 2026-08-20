import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../game/data/weapons';
import { CHARACTER_PROFILES } from '../game/data/characters';
import { DIFFICULTY_CONFIG } from '../game/data/difficulty';
import { AUDIO_STEPS } from '../game/data/audio';
import { ACTIONS } from '../game/data/controls';
import { DEFAULT_SETTINGS, NICKNAME_MAX, cleanNickname, parseSettings } from './settings';
import type { CharacterType, Difficulty, LoadoutType } from '../types';

/**
 * El saneado de los ajustes.
 *
 * Lo que defienden estos tests es que el saneado sea **campo a campo**: un
 * volumen corrupto no puede llevarse por delante el idioma ni las teclas de
 * nadie. Descartar el objeto entero ante un byte mal escrito es la forma fácil
 * de hacerlo y la que borra las preferencias de la gente.
 *
 * Y que los valores admitidos salgan de las tablas del juego, no de una lista
 * escrita aquí: así un arma o una clase nuevas quedan cubiertas solas.
 */
describe('valores por defecto', () => {
  it('son válidos para sí mismos', () => {
    expect(parseSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('cualquier basura da los valores por defecto', () => {
    for (const raw of [null, undefined, 7, 'hola', [], true]) {
      expect(parseSettings(raw), String(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });
});

describe('saneado por campo', () => {
  const bad = {
    language: 'fr',
    difficulty: 'impossible',
    character: 'wisdom',
    loadout: 'railgun',
    music: NaN,
    sfx: -1,
    nickname: 42,
    bindings: 'KeyA',
  };

  it('un campo malo no arrastra a los demás', () => {
    for (const key of Object.keys(bad) as Array<keyof typeof bad>) {
      const parsed = parseSettings({ ...DEFAULT_SETTINGS, nickname: 'ANA', [key]: bad[key] });
      // El resto sobrevive: se comprueba con un campo que no se ha tocado.
      if (key !== 'language') expect(parsed.language, key).toBe(DEFAULT_SETTINGS.language);
      if (key !== 'nickname') expect(parsed.nickname, key).toBe('ANA');
      for (const action of ACTIONS) {
        expect(parsed.bindings[action].length, `${key} → ${action}`).toBeGreaterThan(0);
      }
    }
  });

  it('los niveles de audio se acotan al rango', () => {
    expect(parseSettings({ music: -5 }).music).toBe(0);
    expect(parseSettings({ music: 999 }).music).toBe(AUDIO_STEPS);
    expect(parseSettings({ sfx: 3.7 }).sfx).toBe(4);
    expect(parseSettings({ sfx: NaN }).sfx).toBe(DEFAULT_SETTINGS.sfx);
  });
});

describe('los valores admitidos salen de las tablas del juego', () => {
  it('toda arma del juego vale como equipamiento', () => {
    for (const weapon of ['all', ...WEAPONS] as LoadoutType[]) {
      expect(parseSettings({ loadout: weapon }).loadout, weapon).toBe(weapon);
    }
  });

  it('toda clase del juego vale', () => {
    for (const character of Object.keys(CHARACTER_PROFILES) as CharacterType[]) {
      expect(parseSettings({ character }).character, character).toBe(character);
    }
  });

  it('toda dificultad del juego vale', () => {
    for (const difficulty of Object.keys(DIFFICULTY_CONFIG) as Difficulty[]) {
      expect(parseSettings({ difficulty }).difficulty, difficulty).toBe(difficulty);
    }
  });
});

describe('apodo', () => {
  it('recorta al tope', () => {
    expect(cleanNickname('A'.repeat(500)).length).toBe(NICKNAME_MAX);
  });

  it('quita espacios de sobra', () => {
    expect(cleanNickname('   ana   maria  ')).toBe('ana maria');
  });

  it('quita caracteres de control', () => {
    // Un salto de línea dentro del apodo parte la tabla en pantalla, así que
    // se elimina; no se convierte en espacio, porque nadie escribió ese espacio.
    const ctrl = (code: number) => `A${String.fromCharCode(code)}B`;
    expect(cleanNickname(ctrl(10)), 'salto de línea').toBe('AB');
    expect(cleanNickname(ctrl(9)), 'tabulador').toBe('AB');
    expect(cleanNickname(ctrl(0)), 'nulo').toBe('AB');
    expect(cleanNickname(ctrl(27)), 'escape').toBe('AB');
    expect(cleanNickname(ctrl(127)), 'suprimir').toBe('AB');
  });

  it('lo que no es texto queda vacío', () => {
    for (const raw of [null, undefined, 42, {}, []]) expect(cleanNickname(raw)).toBe('');
  });

  it('conserva acentos y emoji', () => {
    expect(cleanNickname('Ñoño')).toBe('Ñoño');
    expect(cleanNickname('a🦷b')).toBe('a🦷b');
  });
});
