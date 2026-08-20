/**
 * El acceso al almacenamiento del navegador, detrás de una interfaz mínima.
 *
 * No se llama a `localStorage` directamente en ningún sitio, y no es purismo:
 * los tests corren en `environment: 'node'`, donde ese objeto **no existe**. Un
 * módulo que lo tocase al importarse reventaría la suite entera antes de llegar
 * a la primera aserción. Con la dependencia inyectada, la prueba pasa un `Map` y
 * no hace falta ni jsdom ni parchear variables globales.
 *
 * Es el mismo criterio que `PixelTarget` en `render/pixel.ts`: la interfaz más
 * estrecha que hace el trabajo es también la más fácil de falsear.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Necesario para borrar por prefijo sin conocer las claves de antemano. */
  keys(): string[];
}

/** Prefijo de todo lo que guarda el juego. Borrar los datos es barrerlo entero. */
export const STORAGE_PREFIX = 'supermolar:';

/**
 * El almacenamiento real, o `null` si no se puede usar.
 *
 * Dos guardas, y las dos hacen falta por motivos distintos:
 *
 * - `typeof window === 'undefined'` cubre que no haya navegador —los tests, y
 *   cualquier render fuera de él—;
 * - el `try/catch` cubre que **haya navegador y aun así lance**. En modo privado
 *   de Safari y en contextos con cookies de terceros bloqueadas, el error salta
 *   al *acceder* a la propiedad, no al usarla, así que comprobar que existe no
 *   basta.
 */
export const browserStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage;
    // Escritura de prueba: en algunos navegadores la propiedad existe y es el
    // primer `setItem` el que lanza.
    const probe = `${STORAGE_PREFIX}probe`;
    raw.setItem(probe, '1');
    raw.removeItem(probe);

    return {
      getItem: (key) => raw.getItem(key),
      setItem: (key, value) => raw.setItem(key, value),
      removeItem: (key) => raw.removeItem(key),
      keys: () => Object.keys(raw),
    };
  } catch {
    return null;
  }
};

/**
 * El mismo objeto siempre.
 *
 * `browserStorage()` construye un envoltorio nuevo en cada llamada, y llamarlo
 * como valor por defecto de un hook lo ejecutaría en cada render: cada uno
 * devolvería un objeto distinto y cualquier efecto que dependa de él se
 * dispararía sin parar. Se resuelve una vez y se recuerda —incluido el `null`
 * de cuando no se puede usar—.
 */
let resolved: StorageLike | null | undefined;

export const defaultStorage = (): StorageLike | null => {
  if (resolved === undefined) resolved = browserStorage();
  return resolved;
};

/** Almacenamiento en memoria: lo que se usa cuando el del navegador no está. */
export const memoryStorage = (seed: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    keys: () => [...map.keys()],
  };
};
