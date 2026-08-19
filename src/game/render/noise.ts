/**
 * Variación determinista.
 *
 * Es la pieza que rompe el papel pintado sin inflar los horneados. La hilera de
 * molares del fondo era **un solo sprite repetido cada 64 píxeles**: la forma
 * barata de que deje de parecer papel pintado no es dibujar cien dientes, sino
 * hornear unos pocos y elegir cuál va en cada columna, con su salto, su espejo y
 * algún hueco.
 *
 * Y esa elección tiene que ser **determinista**. Con `Math.random()` el fondo
 * saldría distinto en cada sesión y, peor, cada horneado quedaría congelado con
 * la tirada de aquella vez: dos partidas en la misma fase no compartirían
 * escenario. Es exactamente lo que le pasaba a la escena de créditos, que se
 * montaba con `Math.random()` y cambiaba cada vez que se abría.
 *
 * Todo aquí es función pura de sus semillas: mismas semillas, mismo resultado,
 * hoy y en el port a Phaser.
 */

/** Constantes de mezcla de una variante de xorshift/fmix de 32 bits. */
const MIX_A = 0x7feb352d;
const MIX_B = 0x846ca68b;

/**
 * Mezcla un entero de 32 bits. La clave es que cambiar **un solo bit** de la
 * entrada cambie media salida: si no, columnas contiguas eligen la misma
 * variante y vuelve el patrón que se quería evitar.
 */
const mix = (value: number): number => {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, MIX_A);
  x ^= x >>> 15;
  x = Math.imul(x, MIX_B);
  x ^= x >>> 16;
  return x >>> 0;
};

/**
 * Valor en `[0, 1)` a partir de cualquier número de semillas enteras.
 *
 * El orden importa: `hash(3, 7)` y `hash(7, 3)` son distintos, así que se puede
 * usar `(columna, fase)` sin que se solapen entre fases.
 */
export const hash = (...parts: number[]): number => {
  let acc = 0x9e3779b9;
  for (const part of parts) {
    // `Math.round` para que un decimal no se trunque a la misma semilla que su
    // vecino, y `| 0` para no arrastrar NaN si llega basura.
    acc = mix(acc ^ (Math.round(part) | 0));
  }
  return acc / 0x100000000;
};

/** Entero en `[0, count)`. */
export const hashInt = (count: number, ...parts: number[]): number => {
  if (!(count > 1)) return 0;
  return Math.min(count - 1, Math.floor(hash(...parts) * count));
};

/** Elige un elemento. Devuelve `undefined` solo si la lista está vacía. */
export const pick = <T>(items: readonly T[], ...parts: number[]): T =>
  items[hashInt(items.length, ...parts)];

/** ¿Toca? `p` es la probabilidad, de 0 a 1. */
export const chance = (p: number, ...parts: number[]): boolean => hash(...parts) < p;

/**
 * Desplazamiento en `[-amount, +amount]`, redondeado a entero.
 *
 * Para el salto vertical de la arcada: sin él, todos los dientes cuelgan a la
 * misma altura y la hilera vuelve a leerse como una regla.
 */
export const jitter = (amount: number, ...parts: number[]): number =>
  Math.round((hash(...parts) * 2 - 1) * amount);

/**
 * Reparte `count` elementos en `[0, 1)` de forma dispersa pero determinista.
 *
 * Es para sembrar manchas, papilas o burbujas dentro de una superficie: un
 * `hash` por índice se apelotona, y esto garantiza que cada elemento cae en su
 * propia franja y solo se mueve dentro de ella.
 */
export const spread = (count: number, index: number, ...parts: number[]): number => {
  if (count <= 0) return 0;
  const slot = ((index % count) + count) % count;
  return (slot + hash(index, ...parts)) / count;
};
