import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CharacterType, Difficulty, Language, LoadoutType } from '../types';
import type { Bindings } from '../game/data/controls';
import { defaultStorage, type StorageLike } from './driver';
import { SCORES_KEY, SETTINGS_KEY, eraseAll, load, save } from './store';
import { DEFAULT_SETTINGS, cleanNickname, parseSettings, type Settings } from './settings';
import { addScore, parseScores, type ScoreEntry } from './scores';

/**
 * El puente entre el almacenamiento y React.
 *
 * **Todo se lee en un inicializador perezoso**, nunca al importar el módulo: los
 * tests corren sin `window`, y un acceso en tiempo de importación reventaría la
 * suite entera. El estado vive aquí y baja por props, como el resto del juego;
 * no hay contexto en este proyecto y no hace falta uno para ocho campos.
 */
export const useSettings = (storage: StorageLike | null = defaultStorage()) => {
  /**
   * Inicializadores **perezosos**: el almacenamiento se lee una vez, en el
   * primer render, y nunca al importar el módulo. Un acceso en tiempo de
   * importación reventaría la suite entera, que corre sin `window`.
   */
  const [settings, setSettings] = useState<Settings>(() =>
    load(storage, SETTINGS_KEY, parseSettings)
  );
  const [scores, setScores] = useState<ScoreEntry[]>(() => load(storage, SCORES_KEY, parseScores));

  /**
   * Un solo efecto escribe los ajustes enteros. No hace falta amortiguarlo: se
   * cambian con un clic, no en cada fotograma.
   */
  useEffect(() => {
    save(storage, SETTINGS_KEY, settings);
  }, [storage, settings]);

  useEffect(() => {
    save(storage, SCORES_KEY, scores);
  }, [storage, scores]);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setSettings((prev) => (prev[key] === value ? prev : { ...prev, [key]: value })),
    []
  );

  const actions = useMemo(
    () => ({
      setLanguage: (value: Language) => update('language', value),
      setDifficulty: (value: Difficulty) => update('difficulty', value),
      setCharacter: (value: CharacterType) => update('character', value),
      setLoadout: (value: LoadoutType) => update('loadout', value),
      setBindings: (value: Bindings) => update('bindings', value),
      setMusic: (value: number) => update('music', value),
      setSfx: (value: number) => update('sfx', value),
      setNickname: (value: string) => update('nickname', cleanNickname(value)),

      recordScore: (entry: ScoreEntry) => setScores((prev) => addScore(prev, entry)),

      /**
       * Lo que promete la política de privacidad. Barre por prefijo y deja
       * ajustes y tabla como recién instalados, sin recargar la página.
       */
      eraseEverything: () => {
        eraseAll(storage);
        setSettings({ ...DEFAULT_SETTINGS, bindings: DEFAULT_SETTINGS.bindings });
        setScores([]);
      },
    }),
    [storage, update]
  );

  return { settings, scores, ...actions };
};

export type SettingsApi = ReturnType<typeof useSettings>;
