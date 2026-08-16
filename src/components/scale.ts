/**
 * Escalado entero del lienzo.
 *
 * El pixel art solo se ve limpio si cada píxel lógico ocupa un número entero de
 * píxeles de pantalla. Con escala fraccionaria (×1,75, que es lo que salía al
 * estirar el lienzo a la ventana) unos píxeles miden 1 y otros 2, los sprites se
 * deforman de forma desigual y al desplazarse la imagen hormiguea.
 *
 * El precio es el borde negro: la imagen no llena la ventana salvo que sus
 * dimensiones sean múltiplos exactos de 800×450.
 */

export interface ScaledSize {
  scale: number;
  width: number;
  height: number;
}

/**
 * Mayor escala entera que cabe en el hueco disponible. Nunca baja de 1: en una
 * ventana diminuta se recorta antes que mostrar el juego a media resolución.
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
