/**
 * Escalado de la pantalla virtual.
 *
 * El pixel art solo se ve limpio si el búfer de dibujo guarda una relación
 * **entera** con la retícula de 800×450. Si se dibuja directamente al tamaño de
 * la ventana, unos píxeles lógicos ocupan 1 y otros 2, los sprites se deforman
 * de forma desigual y la imagen hormiguea al desplazarse.
 *
 * Eso se conseguía dejando el lienzo en un múltiplo exacto de 800×450 y
 * rodeándolo de negro, pero el precio resultó ser enorme: en una ventana de
 * 1536×695 la mayor escala entera es ×1, así que el juego se veía a 800×450 y
 * **dos tercios de la pantalla se quedaban en negro**. Y no se arregla
 * maximizando —un monitor de 1536×864 tampoco llega a ×2—, así que en esa
 * pantalla la escala entera no era una opción, era una condena.
 *
 * Ahora las dos cosas van por separado:
 *
 * - el **búfer** se dibuja a un múltiplo entero (`supersample`) de 800×450, así
 *   que cada píxel lógico sigue siendo un cuadrado exacto de S×S y el pixel art
 *   se compone igual de nítido que antes;
 * - la **caja CSS** llena el hueco disponible con la escala fraccionaria que
 *   haga falta, conservando la proporción 16:9.
 *
 * El compositor reduce el búfer hasta la caja. Es un remuestreo suave y
 * *uniforme*: la imagen queda un pelo más blanda que a escala entera exacta,
 * pero no tiembla, porque el escalón desigual —que era el problema real— ya no
 * existe. Se elige el S más pequeño que cubra la caja en píxeles de
 * dispositivo, para reducir y nunca ampliar.
 */

export interface ScaledSize {
  scale: number;
  width: number;
  height: number;
}

/**
 * Mayor escala entera que cabe en el hueco disponible. Nunca baja de 1: en una
 * ventana diminuta se recorta antes que mostrar el juego a media resolución.
 *
 * Lo sigue usando la galería de arte, que enseña sprites sueltos y sí quiere la
 * retícula exacta a cambio del margen sobrante.
 */
export const integerScale = (
  availW: number,
  availH: number,
  baseW: number,
  baseH: number
): number => {
  if (!(availW > 0) || !(availH > 0) || !(baseW > 0) || !(baseH > 0)) return 1;
  return Math.max(1, Math.floor(Math.min(availW / baseW, availH / baseH)));
};

export const scaledSize = (
  availW: number,
  availH: number,
  baseW: number,
  baseH: number
): ScaledSize => {
  const scale = integerScale(availW, availH, baseW, baseH);
  return { scale, width: baseW * scale, height: baseH * scale };
};

export interface ViewportSize extends ScaledSize {
  /** Múltiplo entero al que se dibuja el búfer. Siempre ≥ 1. */
  supersample: number;
}

/**
 * Los dos topes del búfer. El del multiplicador manda en el caso normal; el de
 * píxeles existe para que una resolución base distinta no dispare el relleno.
 *
 * A ×4 son 3200×1800, que en un monitor 4K se queda algo corto y aun así cuesta
 * dieciséis veces el relleno de 800×450: es donde el reparto entre nitidez y
 * frame se vuelve malo. Se exportan para que los tests no puedan quedarse con
 * una copia desfasada del número —el presupuesto y el tope se contradijeron
 * exactamente así: 3,5 M de píxeles no daba para el ×4 que el tope permitía—.
 */
export const MAX_SUPERSAMPLE = 4;
export const MAX_BUFFER_PIXELS = 6_000_000;

/**
 * Multiplicador del búfer para una escala de pantalla dada.
 *
 * Se redondea **hacia arriba** y se cuenta en píxeles de dispositivo: el búfer
 * ha de cubrir la caja para que el compositor reduzca. Ampliar un búfer pequeño
 * es justo lo que dejaba el pixel art borroso.
 */
export const supersampleFor = (
  scale: number,
  baseW: number,
  baseH: number,
  dpr = 1
): number => {
  const density = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const wanted = Number.isFinite(scale) && scale > 0 ? Math.ceil(scale * density) : 1;
  let s = Math.min(MAX_SUPERSAMPLE, Math.max(1, wanted));
  while (s > 1 && baseW * s * baseH * s > MAX_BUFFER_PIXELS) s -= 1;
  return s;
};

/**
 * Tamaño de la pantalla virtual: llena el hueco conservando la proporción, y
 * dice a qué múltiplo entero hay que dibujar el búfer.
 *
 * A diferencia de `integerScale`, la escala **sí** puede quedar por debajo de 1:
 * en una ventana más pequeña que 800×450 se prefiere ver el juego entero algo
 * reducido antes que recortarlo.
 */
export const viewportSize = (
  availW: number,
  availH: number,
  baseW: number,
  baseH: number,
  dpr = 1
): ViewportSize => {
  if (!(availW > 0) || !(availH > 0) || !(baseW > 0) || !(baseH > 0)) {
    // Nunca cero: una caja de tamaño nulo no se ve, y el contenedor que la mide
    // dejaría de recibir medidas con las que recuperarse.
    return {
      scale: 1,
      width: Math.max(1, baseW || 0),
      height: Math.max(1, baseH || 0),
      supersample: 1,
    };
  }
  const scale = Math.min(availW / baseW, availH / baseH);
  return {
    scale,
    // Al piso para no desbordar el contenedor por el redondeo y provocar que el
    // ResizeObserver mida menos hueco del que hay.
    width: Math.floor(baseW * scale),
    height: Math.floor(baseH * scale),
    supersample: supersampleFor(scale, baseW, baseH, dpr),
  };
};
