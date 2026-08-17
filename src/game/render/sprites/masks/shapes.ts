/**
 * Primitivas para componer siluetas.
 *
 * Las formas orgánicas —una célula redonda, una gota, un bulbo— se cuentan mal a
 * mano: un círculo dibujado carácter a carácter sale con bultos y hay que
 * rehacerlo varias veces. Estas primitivas dan la forma exacta, y encima se
 * dibuja a mano lo que de verdad caracteriza a cada bicho: pinchos, patas, cara,
 * grietas.
 *
 * Todo es silueta: `#` lleno, `.` vacío. Sin colores ni tonos, que los pone
 * `shadeMask`.
 */

export const SOLID = '#';
export const EMPTY = '.';

export const blank = (w: number, h: number): string[] =>
  Array.from({ length: h }, () => EMPTY.repeat(w));

/**
 * Ajusta un dibujo escrito a mano al tamaño exacto: rellena con vacío las filas
 * que falten y las que se queden cortas, y recorta lo que sobre.
 *
 * Existe porque contar los puntos del final de cada fila a mano es un error
 * garantizado, y un dibujo con una fila de 39 en vez de 40 no falla: simplemente
 * pierde el último píxel de esa fila y se busca a ojo durante mucho rato. Con esto
 * las capas de detalle se escriben mirando el dibujo, no contando.
 */
export const fit = (rows: readonly string[], w: number, h: number): string[] =>
  Array.from({ length: h }, (_, y) => (rows[y] ?? '').slice(0, w).padEnd(w, EMPTY));

/** Rellena una elipse. Es la base de casi todos los enemigos. */
export const ellipse = (
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      // +0.5 para medir desde el centro del píxel: sin eso el borde sale plano.
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      row += dx * dx + dy * dy <= 1 ? SOLID : EMPTY;
    }
    return row;
  });

/** Rectángulo, con esquinas opcionalmente recortadas. */
export const rect = (
  w: number,
  h: number,
  x0: number,
  y0: number,
  rw: number,
  rh: number,
  corner = 0
): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      const inside = x >= x0 && x < x0 + rw && y >= y0 && y < y0 + rh;
      if (!inside) {
        row += EMPTY;
        continue;
      }
      const dx = Math.min(x - x0, x0 + rw - 1 - x);
      const dy = Math.min(y - y0, y0 + rh - 1 - y);
      row += dx + dy < corner ? EMPTY : SOLID;
    }
    return row;
  });

/**
 * Triángulo apuntando hacia arriba, para pinchos y cúspides.
 * `apex` es la punta y `base` la fila donde se apoya.
 */
export const spike = (
  w: number,
  h: number,
  apexX: number,
  apexY: number,
  baseY: number,
  halfWidth: number
): string[] => {
  const span = Math.max(1, baseY - apexY);
  return Array.from({ length: h }, (_, y) => {
    if (y < Math.min(apexY, baseY) || y > Math.max(apexY, baseY)) return EMPTY.repeat(w);
    const t = (y - apexY) / span;
    const half = Math.max(0, Math.round(halfWidth * t));
    let row = '';
    for (let x = 0; x < w; x++) row += Math.abs(x - apexX) <= half ? SOLID : EMPTY;
    return row;
  });
};

/** Pega un dibujo pequeño dentro de una silueta más grande. */
export const stamp = (
  base: readonly string[],
  art: readonly string[],
  x0: number,
  y0: number
): string[] =>
  base.map((row, y) => {
    const artRow = art[y - y0];
    if (!artRow) return row;
    let out = '';
    for (let x = 0; x < row.length; x++) {
      const ch = artRow[x - x0];
      out += ch && ch !== EMPTY ? ch : row[x];
    }
    return out;
  });

/** Recorta lo que sobresalga de otra silueta. Para que un detalle no flote. */
export const clipTo = (art: readonly string[], shape: readonly string[]): string[] =>
  art.map((row, y) => {
    let out = '';
    for (let x = 0; x < row.length; x++) {
      out += (shape[y] ?? '')[x] === SOLID ? row[x] : EMPTY;
    }
    return out;
  });

/** Une varias siluetas. Igual que `unionMasks` de `shade.ts`, sin importarlo. */
export const merge = (...masks: readonly (readonly string[])[]): string[] => {
  const h = masks.reduce((max, m) => Math.max(max, m.length), 0);
  const w = masks.reduce(
    (max, m) => m.reduce((rowMax, row) => Math.max(rowMax, row.length), max),
    0
  );
  return Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      row += masks.some((m) => (m[y] ?? '')[x] === SOLID) ? SOLID : EMPTY;
    }
    return row;
  });
};

/**
 * Gira un dibujo 90° en sentido horario.
 *
 * Un giro de 90° es **exacto**: cada píxel va a otro píxel, sin interpolar. Por eso
 * el arma en mano se dibuja una vez apuntando de lado y la versión apuntando hacia
 * arriba sale de aquí, en lugar de rotar el lienzo (que a esta escala destroza el
 * pixel art) o de dibujarla dos veces.
 */
export const rotate90 = (mask: readonly string[]): string[] => {
  const h = mask.length;
  const w = mask.reduce((max, row) => Math.max(max, row.length), 0);
  return Array.from({ length: w }, (_, y) => {
    let row = '';
    for (let x = 0; x < h; x++) row += mask[h - 1 - x]?.[y] ?? EMPTY;
    return row;
  });
};

/**
 * Triángulo rectángulo dentro de un rectángulo, con el ángulo recto en la esquina
 * indicada. Es lo que hace falta para inclinar un frontal, una visera o un talud:
 * se resta de una forma recta y la deja biselada.
 */
export const wedge = (
  w: number,
  h: number,
  x0: number,
  y0: number,
  tw: number,
  th: number,
  corner: 'tl' | 'tr' | 'bl' | 'br'
): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      const inside = x >= x0 && x < x0 + tw && y >= y0 && y < y0 + th;
      if (!inside) {
        row += EMPTY;
        continue;
      }
      // Coordenadas normalizadas dentro del triángulo, con el origen en la esquina.
      const u = (corner === 'tl' || corner === 'bl' ? x - x0 : x0 + tw - 1 - x) / Math.max(1, tw - 1);
      const v = (corner === 'tl' || corner === 'tr' ? y - y0 : y0 + th - 1 - y) / Math.max(1, th - 1);
      row += u + v <= 1 ? SOLID : EMPTY;
    }
    return row;
  });

/** Anillo: una elipse menos otra más pequeña. Para halos, arcos y orbes. */
export const annulus = (
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  thickness: number
): string[] =>
  subtract(
    ellipse(w, h, cx, cy, rx, ry),
    ellipse(w, h, cx, cy, Math.max(0, rx - thickness), Math.max(0, ry - thickness))
  );

/** Quita de `base` lo que ocupe `hole`. Para bocas, muescas y huecos. */
export const subtract = (base: readonly string[], hole: readonly string[]): string[] =>
  base.map((row, y) => {
    let out = '';
    for (let x = 0; x < row.length; x++) {
      out += (hole[y] ?? '')[x] === SOLID ? EMPTY : row[x];
    }
    return out;
  });

/**
 * Desplaza un dibujo. Para el bote del paso y los brazos.
 *
 * Conserva el carácter de cada píxel en lugar de mirar solo si está lleno, así
 * que sirve igual para siluetas que para capas de detalle: si desplazara solo los
 * `#`, mover una cara la borraría.
 */
export const shift = (mask: readonly string[], dx: number, dy: number): string[] => {
  const h = mask.length;
  const w = mask.reduce((max, row) => Math.max(max, row.length), 0);
  return Array.from({ length: h }, (_, y) => {
    const src = mask[y - dy] ?? '';
    let row = '';
    for (let x = 0; x < w; x++) row += src[x - dx] ?? EMPTY;
    return row;
  });
};
