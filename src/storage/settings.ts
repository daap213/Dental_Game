import type { CharacterType, Difficulty, Language, LoadoutType } from '../types';
import { WEAPONS } from '../game/data/weapons';
import { CHARACTER_PROFILES } from '../game/data/characters';
import { DIFFICULTY_CONFIG } from '../game/data/difficulty';
import { AUDIO_STEPS, DEFAULT_MUSIC, DEFAULT_SFX } from '../game/data/audio';
import { normaliseBindings, resetBindings, type Bindings } from '../game/data/controls';

/**
 * Las preferencias que sobreviven a una recarga.
 *
 * Todos los validadores **derivan sus valores admitidos de las tablas del
 * juego**, nunca de una lista escrita aquí: es la misma lección que dejó el menú
 * cuando tenía las armas a mano y un arma nueva quedaba inseleccionable sin que
 * fallase nada. Añadir una clase o un arma queda cubierto solo.
 */

/** Un apodo largo rompe la tabla y no aporta. Doce basta para lo que es. */
export const NICKNAME_MAX = 12;

export interface Settings {
  language: Language;
  difficulty: Difficulty;
  character: CharacterType;
  loadout: LoadoutType;
  bindings: Bindings;
  /** Enteros de 0 a `AUDIO_STEPS`. */
  music: number;
  sfx: number;
  /** Vacío mientras no se haya preguntado. Ver el embudo de fin de partida. */
  nickname: string;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  difficulty: 'normal',
  character: 'molar',
  loadout: 'all',
  bindings: resetBindings(),
  music: DEFAULT_MUSIC,
  sfx: DEFAULT_SFX,
  nickname: '',
};

const LANGUAGES: readonly Language[] = ['en', 'es'];

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const level = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(AUDIO_STEPS, Math.round(value)))
    : fallback;

/**
 * Recorta el apodo: sin espacios de sobra, sin caracteres de control y con tope.
 *
 * Los caracteres de control se van porque un apodo con un `\n` dentro rompe la
 * tabla en pantalla, y porque nada bueno viene de guardarlos.
 */
export const cleanNickname = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return [...value]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      // Fuera los de control: un apodo con un salto de línea dentro parte la
      // tabla en pantalla, y no hay ningún motivo para guardarlos.
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICKNAME_MAX);
};

/**
 * De lo que hubiera guardado a unos ajustes válidos.
 *
 * **Campo a campo, nunca todo o nada**: si el volumen viene corrupto, se
 * restablece el volumen y el resto se conserva. Descartar el objeto entero
 * haría que un byte mal escrito borrase el idioma y las teclas de alguien.
 */
export const parseSettings = (raw: unknown): Settings => {
  if (raw === null || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const s = raw as Record<string, unknown>;

  return {
    language: pick(s.language, LANGUAGES, DEFAULT_SETTINGS.language),
    difficulty: pick(
      s.difficulty,
      Object.keys(DIFFICULTY_CONFIG) as Difficulty[],
      DEFAULT_SETTINGS.difficulty
    ),
    character: pick(
      s.character,
      Object.keys(CHARACTER_PROFILES) as CharacterType[],
      DEFAULT_SETTINGS.character
    ),
    loadout: pick(s.loadout, ['all', ...WEAPONS] as LoadoutType[], DEFAULT_SETTINGS.loadout),
    bindings: normaliseBindings(s.bindings),
    music: level(s.music, DEFAULT_SETTINGS.music),
    sfx: level(s.sfx, DEFAULT_SETTINGS.sfx),
    nickname: cleanNickname(s.nickname),
  };
};
