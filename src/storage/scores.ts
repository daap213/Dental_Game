import type { CharacterType, Difficulty, RunResult } from '../types';
import { CHARACTER_PROFILES } from '../game/data/characters';
import { DIFFICULTY_CONFIG } from '../game/data/difficulty';
import { cleanNickname } from './settings';

/**
 * La tabla de récords local.
 *
 * Módulo puro y sin React ni almacenamiento: aquí solo está la aritmética de
 * ordenar, recortar y sanear, que es lo que se puede probar en node. Quién la
 * guarda y quién la enseña son otros dos ficheros.
 */

export type RunOutcome = RunResult['outcome'];

export interface ScoreEntry {
  /**
   * Identidad estable de la fila. Sirve para resaltar la que se acaba de
   * añadir: hacerlo por posición se rompe en cuanto entra otra por encima.
   */
  readonly id: string;
  /** `YYYY-MM-DD`. Sin hora: nadie la ha pedido y localizarla cuesta. */
  readonly date: string;
  readonly nickname: string;
  readonly score: number;
  readonly character: CharacterType;
  /**
   * Sin esto la tabla no es una clasificación: una partida en FÁCIL y otra en
   * LEYENDA no compiten por lo mismo. Se guarda siempre, aunque no se filtre.
   */
  readonly difficulty: Difficulty;
  readonly stage: number;
  readonly kills: number;
  /** Duración de la partida en milisegundos. */
  readonly ms: number;
  readonly outcome: RunOutcome;
}

export const SCORES_MAX = 10;

/** Apodo de quien no quiso poner uno. */
export const ANON_NICKNAME = 'ROOKIE';

/**
 * Ordena de mayor a menor y, **en caso de empate, deja delante a la más
 * antigua**: es la convención de los salones recreativos —el primero que llegó
 * a esa cifra se queda con el puesto— y además hace que la tabla no baile sola
 * al repetir una puntuación.
 */
const rank = (table: readonly ScoreEntry[]): ScoreEntry[] =>
  table
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.score - a.entry.score || a.index - b.index)
    .map(({ entry }) => entry);

/** ¿Entraría esta puntuación en la tabla? */
export const qualifies = (table: readonly ScoreEntry[], score: number): boolean =>
  table.length < SCORES_MAX || rank(table).some((entry) => score > entry.score);

/**
 * Añade y devuelve la tabla nueva. **No muta la que recibe**: la tabla vive en
 * el estado de React y mutarla en el sitio no repintaría nada.
 */
export const addScore = (table: readonly ScoreEntry[], entry: ScoreEntry): ScoreEntry[] =>
  rank([...table, entry]).slice(0, SCORES_MAX);

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Frontera con el almacenamiento: cualquier cosa entra, sale una tabla válida. */
export const parseScores = (raw: unknown): ScoreEntry[] => {
  if (!Array.isArray(raw)) return [];

  const characters = Object.keys(CHARACTER_PROFILES) as CharacterType[];
  const difficulties = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];

  const entries = raw.flatMap((item): ScoreEntry[] => {
    if (item === null || typeof item !== 'object') return [];
    const e = item as Record<string, unknown>;

    // Una fila sin puntuación no es una fila; el resto se puede rellenar.
    if (typeof e.score !== 'number' || !Number.isFinite(e.score)) return [];

    return [
      {
        id:
          typeof e.id === 'string' && e.id ? e.id : `legacy-${numberOr(e.score, 0)}-${raw.length}`,
        date: isDate(e.date) ? e.date : '1970-01-01',
        nickname: cleanNickname(e.nickname) || ANON_NICKNAME,
        score: numberOr(e.score, 0),
        character: characters.includes(e.character as CharacterType)
          ? (e.character as CharacterType)
          : 'molar',
        difficulty: difficulties.includes(e.difficulty as Difficulty)
          ? (e.difficulty as Difficulty)
          : 'normal',
        stage: Math.max(1, numberOr(e.stage, 1)),
        kills: numberOr(e.kills, 0),
        ms: numberOr(e.ms, 0),
        outcome: e.outcome === 'victory' ? 'victory' : 'defeat',
      },
    ];
  });

  return rank(entries).slice(0, SCORES_MAX);
};

/** `M:SS` a partir de milisegundos. La tabla nunca formatea a mano. */
export const formatDuration = (ms: number): string => {
  // `NaN` llega desde datos guardados a mano o de una versión anterior, y sin
  // esta guarda se cuela hasta la pantalla como "NaN:NaN".
  const total = Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
