import type { Language } from '../types';
import { en, type Dictionary } from './en';
import { es } from './es';

export type { Dictionary };

/**
 * Textos de la interfaz. `es` está tipado contra la forma de `en`, así que
 * una clave que falte o sobre rompe la compilación en vez de devolver
 * `undefined` en tiempo de ejecución.
 */
export const TEXT: Record<Language, Dictionary> = { en, es };
