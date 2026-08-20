import { STORAGE_PREFIX, type StorageLike } from './driver';

/**
 * Leer y escribir con envoltorio de versión.
 *
 * La regla de este módulo, y no admite excepciones: **nada de aquí lanza**. Lo
 * que se guarda son preferencias y una tabla de puntuaciones; un JSON corrupto,
 * una cuota agotada o un navegador que no deja escribir tienen que degradar a
 * los valores por defecto, nunca tumbar la pantalla desde la que se llamó. La
 * peor versión de este fallo sería reventar justo en el fin de partida, que es
 * exactamente cuando se escribe.
 */

export const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;
export const SCORES_KEY = `${STORAGE_PREFIX}scores`;

/**
 * Versión del formato. Al subirla, lo guardado con la anterior se descarta y se
 * vuelve a los valores por defecto: con dos claves y datos que el jugador puede
 * rehacer en una partida, una escalera de migraciones cuesta más de lo que vale.
 */
export const SCHEMA_VERSION = 1;

interface Envelope {
  v: number;
  data: unknown;
}

/**
 * Lee, valida y sanea. `parse` recibe lo que hubiera —incluido `undefined`— y
 * **tiene que devolver siempre algo válido**; ahí es donde vive el saneado por
 * campo, que es lo que impide que un volumen corrupto se lleve por delante los
 * récords.
 */
export const load = <T>(
  storage: StorageLike | null,
  key: string,
  parse: (raw: unknown) => T
): T => {
  if (!storage) return parse(undefined);

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    // Leer puede lanzar por sí solo en contextos con el almacenamiento vetado.
    return parse(undefined);
  }
  if (raw === null) return parse(undefined);

  try {
    const envelope = JSON.parse(raw) as Envelope;
    if (!envelope || typeof envelope !== 'object' || envelope.v !== SCHEMA_VERSION) {
      return parse(undefined);
    }
    return parse(envelope.data);
  } catch {
    // JSON roto a mano, truncado por una cuota, o escrito por otra versión.
    return parse(undefined);
  }
};

/** Guarda. Devuelve `false` si no se pudo —cuota, modo privado— y no lanza. */
export const save = (storage: StorageLike | null, key: string, data: unknown): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify({ v: SCHEMA_VERSION, data } satisfies Envelope));
    return true;
  } catch {
    return false;
  }
};

/**
 * Borra todo lo del juego **por prefijo**, no las dos claves conocidas.
 *
 * Es lo que promete la política de privacidad, y la diferencia importa: si
 * mañana se guarda una tercera cosa y aquí siguen dos `removeItem`, el botón de
 * borrar mentiría sin que nada fallase. Las claves ajenas no se tocan.
 */
export const eraseAll = (storage: StorageLike | null): boolean => {
  if (!storage) return false;
  try {
    for (const key of storage.keys()) {
      if (key.startsWith(STORAGE_PREFIX)) storage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
};
