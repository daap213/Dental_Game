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
 * Gira un dibujo 90° en sentido **antihorario**: lo que estaba a la derecha queda arriba.
 *
 * Existe porque `rotate90` gira al revés, y eso costó un fallo enviado: el arma en mano
 * «apuntando arriba» se hacía con un `rotate90`, que lleva la punta de la derecha al suelo, y
 * luego se colocaba encima del puño. Quedaba el mango arriba y el filo en la mano. El test que
 * había solo comprobaba que el ancho y el alto se intercambiaran, y eso se cumple girando en
 * cualquiera de los dos sentidos.
 */
export const rotate270 = (mask: readonly string[]): string[] => {
  const h = mask.length;
  const w = mask.reduce((max, row) => Math.max(max, row.length), 0);
  return Array.from({ length: w }, (_, y) => {
    let row = '';
    for (let x = 0; x < h; x++) row += mask[x]?.[w - 1 - y] ?? EMPTY;
    return row;
  });
};

/**
 * Remuestrea un dibujo sobre una caja de otro tamaño, leyendo con la función que se le dé.
 *
 * Muestrea **tirando**: recorre los píxeles de destino y para cada uno pregunta de dónde se
 * lee, en vez de recorrer el origen y repartir. Esa dirección es la que importa, y no es un
 * detalle de implementación:
 *
 * - Un giro es una **isometría entre dos retículas del mismo paso**, así que cualquier trazo de
 *   dos píxeles o más de grosor sale entero: no puede quedar agujereado. Empujando desde el
 *   origen sí aparecen huecos de redondeo, que es el fallo clásico de las diagonales.
 * - Un trazo de **un** píxel sobrevive como una escalera conexa en ocho direcciones. Puede
 *   perder la conexión en cuatro, nunca en ocho, así que la cuerda del arco no se corta.
 *
 * Sobremuestrear con voto por mayoría, que es lo primero que se piensa, **borra** justo esos
 * trazos de un píxel: girados cubren alrededor de un tercio de las muestras, y exigir la mitad
 * los elimina. Bajar el umbral los salva pero engorda todos los bordes. El vecino más cercano
 * no tiene ese compromiso.
 *
 * Conserva el carácter de cada píxel, igual que `rotate90` y `shift`, así que sirve lo mismo
 * para una silueta que para una capa de detalle.
 */
export const resample = (
  source: readonly string[],
  w: number,
  h: number,
  toSource: (x: number, y: number) => { x: number; y: number }
): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      // El centro del píxel de destino, que es lo que se lleva al origen.
      const from = toSource(x + 0.5, y + 0.5);
      row += source[Math.floor(from.y)]?.[Math.floor(from.x)] ?? EMPTY;
    }
    return row;
  });

/** Una máscara girada, y dónde quedó su pivote dentro del dibujo nuevo. */
export interface RotatedMask {
  rows: string[];
  /** El pivote que se pidió, en coordenadas del dibujo girado. */
  px: number;
  py: number;
}

const TAU = Math.PI * 2;
const QUARTER = Math.PI / 2;

/**
 * Gira un dibujo un ángulo cualquiera, en el sentido del reloj y con la `y` hacia abajo, y dice
 * dónde quedó el pivote.
 *
 * Los múltiplos de noventa grados **no se remuestrean**: se componen con `rotate90`, que es
 * exacto. Son los ángulos más frecuentes con diferencia, y tienen que quedar píxel a píxel
 * perfectos para que inclinar el arma no cambie cómo se ve apuntando de lado.
 *
 * Se gira la **máscara** y se sombrea después, nunca al revés: el sombreado deriva el contorno
 * y la luz de la silueta, así que girando antes la luz sigue entrando por arriba a la izquierda
 * como en todo el resto del juego. Girar píxeles ya sombreados se lleva la luz con ellos.
 *
 * El pivote es lo que permite anclar el arma por el mango: se gira alrededor de él y se dibuja
 * restándolo, con lo que las dieciséis inclinaciones usan una sola fórmula en vez de un caso
 * escrito a mano por orientación.
 */
export const rotateMask = (
  mask: readonly string[],
  angle: number,
  pivot: { x: number; y: number } = { x: 0, y: 0 }
): RotatedMask => {
  const h = mask.length;
  const w = mask.reduce((max, row) => Math.max(max, row.length), 0);
  const turn = ((angle % TAU) + TAU) % TAU;
  const quarters = Math.round(turn / QUARTER);

  if (Math.abs(turn - quarters * QUARTER) < 1e-9) {
    let rows = mask.map((row) => row.padEnd(w, EMPTY));
    let px = pivot.x;
    let py = pivot.y;
    for (let turned = 0; turned < quarters % 4; turned++) {
      // El alto de **antes** de girar es lo que decide dónde cae el pivote.
      const before = rows.length;
      rows = rotate90(rows);
      const nextX = before - 1 - py;
      py = px;
      px = nextX;
    }
    return { rows, px, py };
  }

  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const spin = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });

  const corners = [spin(0, 0), spin(w, 0), spin(0, h), spin(w, h)];
  const minX = Math.min(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  const outW = Math.max(1, Math.ceil(Math.max(...corners.map((c) => c.x)) - minX));
  const outH = Math.max(1, Math.ceil(Math.max(...corners.map((c) => c.y)) - minY));

  const rows = resample(mask, outW, outH, (x, y) => {
    const rx = x + minX;
    const ry = y + minY;
    // Giro inverso, para leer de la máscara original.
    return { x: rx * cos + ry * sin, y: -rx * sin + ry * cos };
  });

  const turned = spin(pivot.x, pivot.y);
  return { rows, px: turned.x - minX, py: turned.y - minY };
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
      const u =
        (corner === 'tl' || corner === 'bl' ? x - x0 : x0 + tw - 1 - x) / Math.max(1, tw - 1);
      const v =
        (corner === 'tl' || corner === 'tr' ? y - y0 : y0 + th - 1 - y) / Math.max(1, th - 1);
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
