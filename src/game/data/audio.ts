/**
 * Los niveles de audio.
 *
 * Viven en `data/` y no dentro del componente por la regla de siempre: ningún
 * número de ajuste se escribe en el sitio donde se usa. Son **pasos enteros**, no
 * un flotante: se guardan y se comparan sin sorpresas de coma flotante, y el
 * mando de la interfaz es una fila de bloques, que es lo que un juego de 8 bits
 * usaría en lugar de un deslizador redondeado.
 */
export const AUDIO_STEPS = 10;

/** Arranque: la música por debajo de los efectos, que es lo que se espera. */
export const DEFAULT_MUSIC = 5;
export const DEFAULT_SFX = 8;

/** De paso entero a ganancia. Lineal basta a este rango y es predecible. */
export const gainFor = (step: number): number => Math.max(0, Math.min(1, step / AUDIO_STEPS));
