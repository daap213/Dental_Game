import { bake, blit, px } from './pixel';
import { ditherBand, ditherFill, ditherOver } from './dither';
import { drawSprite } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { ellipse, rect, merge, subtract, blank, fit, SOLID, EMPTY } from './sprites/masks/shapes';
import { hash } from './noise';
import type { PaletteKey } from '../data/palette';

/**
 * Escena de los créditos: el héroe encapotado ante el castillo-muela.
 *
 * Está dibujada a partir de `referencias/fondo_creditos.jpg`, y como todo lo
 * demás del juego, **redibujada con código**: no se distribuye ni un fichero de
 * imagen. Seis elementos son los que hacen que se lea de un vistazo —cielo de
 * tormenta con la luna velada, el castillo-muela sobre su cerro, la cordillera
 * de muelas en la niebla, las sondas dentales como árboles muertos, el montículo
 * de encía del primer plano y el héroe con capa arrastrando el cepillo—. Todo lo
 * demás de la referencia no cabe a 800×450 y sobra.
 *
 * Es **determinista**: la irregularidad sale de `noise.ts`, nunca de
 * `Math.random()`. Arte horneado con semilla aleatoria se congela con lo que le
 * tocase esa sesión, así que dos partidas no compartirían escena. Eso ya pasó
 * aquí una vez.
 */

/**
 * Tamaño de referencia. El **alto es fijo**: es lo que fija el tamaño del píxel
 * y la proporción de la luna, la cordillera y el héroe. El **ancho sí varía**,
 * porque es el único eje que la escena puede repetir sin que se note.
 *
 * Así el fondo llena la ventana a cualquier proporción sin recortar el héroe ni
 * estirar los píxeles, que es lo que pasaba cuando el lienzo era de 800×450
 * fijos y se estiraba con `object-cover`.
 */
export const CREDITS_W = 800;
export const CREDITS_H = 450;

const HORIZON = 300;

/**
 * Las piezas grandes se anclan a **fracciones del ancho**, no a una `x`: son una
 * sola cada una y tienen que seguir componiendo cuando la escena se estira. Lo
 * que sí se repite cada 800 —nubes, cordillera, cascotes— va por tramos, para
 * que la densidad no cambie con la ventana.
 */
const MOON_X_FRAC = 0.3;
const MOON_Y = 88;
const MOON_R = 34;
const CASTLE_X_FRAC = 0.74;
/**
 * Bien a la izquierda, y no es una preferencia de composición: encima de la
 * escena van los paneles de los créditos, centrados y con `max-w-3xl`, así que
 * todo lo que caiga del 26 % del ancho en adelante queda tapado. Ahí estaba el
 * héroe —con su capa y su cepillo— detrás de la tarjeta de DANIEL.
 */
const HERO_X_FRAC = 0.16;

/**
 * Tamaño lógico de la escena para una caja dada: el alto de referencia y el
 * ancho que iguale su proporción, así que se puede pintar a `width:100%` sin
 * deformar nada.
 */
export const creditsSceneSize = (boxW: number, boxH: number) => {
  if (!(boxW > 0) || !(boxH > 0)) return { w: CREDITS_W, h: CREDITS_H };
  const w = Math.round((CREDITS_H * boxW) / boxH);
  // Los topes son solo un cinturón de seguridad: cualquier proporción realista
  // cae dentro. Poner el suelo alto sí tenía consecuencias —a 320 una ventana
  // estrecha y alta dejaba de igualar su proporción, y el fondo volvía a
  // estirarse—.
  return { w: Math.max(16, Math.min(4 * CREDITS_W, w)), h: CREDITS_H };
};

/**
 * Nubes: centro, medio ancho, medio alto y densidad.
 *
 * Sustituyen a las estrellas. La referencia es un cielo de tormenta cerrado, y
 * con estrellas la escena decía "noche despejada", que es justo lo contrario.
 */
const CLOUDS: readonly [number, number, number, number, number][] = [
  [90, 54, 84, 11, 5],
  [250, 30, 120, 9, 7],
  [470, 72, 96, 13, 4],
  [640, 42, 110, 10, 6],
  [180, 120, 140, 8, 3],
  [520, 150, 118, 7, 3],
  [720, 118, 92, 9, 4],
  [370, 190, 160, 6, 2],
  [60, 210, 130, 5, 2],
  [660, 205, 124, 6, 2],
];

/**
 * Alturas de las muelas del horizonte. Fijas, para que la silueta no baile.
 *
 * Son **la mitad de altas que el héroe** y su base queda **por encima** de sus
 * pies, y las dos cosas son la misma decisión: la profundidad en una escena
 * plana la da el tamaño relativo y la altura de la línea de apoyo. Con las
 * muelas a su tamaño y apoyadas más abajo, la cordillera se leía delante del
 * héroe y la escena se quedaba en un friso sin fondo.
 */
const RIDGE = [20, 31, 17, 40, 26, 44, 23, 35, 18, 41, 29, 37, 22, 32, 25];
const RIDGE_W = 34;
const RIDGE_STEP = 32;

/** Cascotes del primer plano: x, y relativo, ancho y alto. */
const RUBBLE: readonly [number, number, number, number][] = [
  [60, 96, 14, 4],
  [140, 128, 9, 3],
  [212, 78, 18, 5],
  [286, 140, 11, 4],
  [352, 104, 15, 4],
  [430, 134, 8, 3],
  [498, 88, 16, 5],
  [566, 126, 12, 4],
  [640, 100, 10, 3],
  [712, 138, 17, 5],
];

/**
 * Las sondas: fracción del ancho, altura, inclinación y hacia dónde gira el
 * gancho. Alturas y separaciones deliberadamente dispares —**nada puede formar
 * una serie**: en cuanto tres quedan a distancias parecidas, el ojo las recorre
 * como una valla y dejan de ser árboles muertos—.
 */
const SCALERS: readonly [number, number, number, 1 | -1][] = [
  [0.03, 170, -1, -1],
  [0.21, 96, 1, 1],
  [0.28, 132, -1, 1],
  [0.52, 78, 1, -1],
  [0.61, 148, -1, -1],
  [0.87, 186, 1, 1],
  [0.94, 118, 1, -1],
];

/** La luna: un disco de esmalte con tres cráteres. */
const moonSprite = () => {
  const size = MOON_R * 2;
  const disc = ellipse(size, size, MOON_R, MOON_R, MOON_R, MOON_R);
  const craters = fit(
    [
      ...blank(size, 18),
      '........SSS.................',
      '.......SSSSS................',
      '........SSS......SS.........',
      '.................SSSS.......',
      '..................SS........',
      ...blank(size, 8),
      '........SS..................',
      '.......SSSS.................',
      '........SS..................',
    ],
    size,
    size
  );

  return withDetails(shadeMask(disc, 'enamel'), {
    w: size,
    h: size,
    rows: craters,
    map: { S: 'enamel.dark' as PaletteKey },
  });
};

/** Una muela del horizonte: silueta simple, en sombra. */
const ridgeTooth = (height: number) => {
  const w = RIDGE_W;
  const h = height + 26;
  const crown = merge(
    ellipse(w, h, 10, 15, 9, 14),
    ellipse(w, h, 24, 15, 9, 14),
    rect(w, h, 1, 10, 32, 19)
  );
  const roots = merge(rect(w, h, 5, 26, 9, h - 26, 4), rect(w, h, 20, 26, 9, h - 26, 4));
  const seam = rect(w, h, 16, 2, 3, 12);
  return shadeMask(subtract(merge(crown, roots), seam), 'stone', { bias: -0.4 });
};

const CASTLE_W = 132;
const CASTLE_H = 176;

/**
 * El castillo: una muela **fortificada**, no un castillo con forma de muela.
 *
 * La diferencia está en el orden de lectura. La silueta tiene que ser primero un
 * molar —tres lóbulos y tres raíces— y solo después revelar que está habitado:
 * las almenas se **restan** del borde superior, las ventanas y el portón se
 * pintan encima como huecos oscuros. Añadir torres sobre una muela da un castillo
 * con un diente pegado; morder el borde de la muela da una muela fortificada.
 */
const castleSprite = () => {
  const crown = merge(
    ellipse(CASTLE_W, CASTLE_H, 30, 66, 27, 40),
    ellipse(CASTLE_W, CASTLE_H, 66, 56, 30, 46),
    ellipse(CASTLE_W, CASTLE_H, 100, 72, 24, 34),
    rect(CASTLE_W, CASTLE_H, 6, 64, 120, 56)
  );

  // Torreón sobre el lóbulo central y garita en el derecho: los dos salen por
  // encima del contorno del molar, que es la única forma de que existan.
  const keep = merge(
    rect(CASTLE_W, CASTLE_H, 52, 8, 28, 56),
    rect(CASTLE_W, CASTLE_H, 47, 4, 38, 12)
  );
  const turret = merge(
    rect(CASTLE_W, CASTLE_H, 104, 34, 18, 44),
    rect(CASTLE_W, CASTLE_H, 101, 30, 24, 10)
  );

  const roots = merge(
    rect(CASTLE_W, CASTLE_H, 14, 116, 28, 58, 9),
    rect(CASTLE_W, CASTLE_H, 52, 116, 30, 60, 9),
    rect(CASTLE_W, CASTLE_H, 92, 116, 26, 52, 9)
  );

  // Almenas: huecos en los remates. Anchos y separaciones distintos, porque un
  // peine regular se lee como dentado de sierra y no como fábrica de piedra.
  const merlons = merge(
    rect(CASTLE_W, CASTLE_H, 51, 4, 7, 9),
    rect(CASTLE_W, CASTLE_H, 63, 4, 5, 9),
    rect(CASTLE_W, CASTLE_H, 74, 4, 8, 9),
    rect(CASTLE_W, CASTLE_H, 104, 30, 6, 8),
    rect(CASTLE_W, CASTLE_H, 116, 30, 4, 8),
    rect(CASTLE_W, CASTLE_H, 14, 32, 8, 10),
    rect(CASTLE_W, CASTLE_H, 28, 28, 6, 10),
    rect(CASTLE_W, CASTLE_H, 40, 33, 5, 9)
  );

  /**
   * Grietas: material **restado**, no piezas añadidas. Y hacen falta por otra
   * razón —`shadeMask` deriva el volumen de la distancia al borde, así que el
   * centro de una silueta de 130 px de ancho queda lejos de todo y sale como una
   * losa plana—. Cada grieta crea borde interior, y con él relieve.
   */
  const cracks = merge(
    rect(CASTLE_W, CASTLE_H, 44, 74, 2, 34),
    rect(CASTLE_W, CASTLE_H, 86, 96, 2, 26),
    rect(CASTLE_W, CASTLE_H, 24, 92, 2, 20),
    rect(CASTLE_W, CASTLE_H, 68, 120, 2, 18)
  );

  const body = merge(crown, keep, turret, roots);
  return shadeMask(subtract(body, merge(merlons, cracks)), 'enamelStained');
};

/** Ventanas y portón, en coordenadas del sprite del castillo. */
const CASTLE_HOLES: readonly [number, number, number, number][] = [
  [61, 24, 6, 11],
  [72, 26, 5, 9],
  [108, 46, 5, 9],
  [116, 48, 4, 7],
  [26, 54, 7, 12],
  [38, 62, 5, 9],
  [86, 84, 6, 10],
  [56, 128, 16, 30],
  [22, 136, 9, 18],
];

/**
 * El lienzo del héroe es **mucho más ancho que el héroe**: los 26 px sobrantes de
 * la izquierda son el sitio por donde vuela la capa. Sin ellos el borde de la
 * máscara recortaba el vuelo y la capa salía como un rectángulo con el bajo
 * dentado —una cortina colgada de una muela—.
 */
const HERO_W = 78;
const HERO_H = 64;
/** Centro del diente dentro del lienzo. Es el punto por el que se ancla todo. */
const HERO_CX = 48;
const HERO_RIGHT = 71;

/** El héroe de espaldas: una muela sin cara, que es lo que la pone de espaldas. */
const heroBody = () => {
  const crown = merge(
    ellipse(HERO_W, HERO_H, 39, 20, 14, 17),
    ellipse(HERO_W, HERO_H, 57, 20, 14, 17),
    rect(HERO_W, HERO_H, 26, 16, 44, 24)
  );
  const roots = merge(
    rect(HERO_W, HERO_H, 31, 38, 14, 26, 6),
    rect(HERO_W, HERO_H, 51, 38, 14, 26, 6)
  );
  const seam = rect(HERO_W, HERO_H, 46, 40, 4, 24);
  return shadeMask(subtract(merge(crown, roots), seam), 'enamel');
};

/**
 * La capa, ondeando a la izquierda.
 *
 * Se genera por columnas en vez de componerse con elipses porque lo que tiene
 * que leerse es el **vuelo**: el borde izquierdo se aleja según baja y el bajo va
 * dentado. Una capa simétrica de bordes limpios se lee como un babero.
 */
const CAPE_TOP = 8;
const capeMask = () => {
  const rows: string[] = [];
  for (let y = 0; y < HERO_H; y++) {
    const t = Math.max(0, (y - CAPE_TOP) / (HERO_H - CAPE_TOP));
    /**
     * Prendida a los hombros arriba y volando a la izquierda abajo. Las dos
     * aristas hacen cosas distintas y las dos hacen falta:
     *
     * - la **izquierda** se aleja con el cuadrado de la altura, que es el vuelo;
     * - la **derecha se recoge**, y eso es lo que deja ver el esmalte del flanco
     *   derecho. Sin recogerla la capa tapaba el diente entero.
     */
    const left = 27 - t * t * 26 - Math.sin(t * 4.4) * 3;
    const right = 69 - t * 13;
    let line = '';
    for (let x = 0; x < HERO_W; x++) {
      // El cuello sigue la curva de la corona. Recto era una banda horizontal
      // cruzando la cara del diente, que es lo que delataba el truco.
      const collar = CAPE_TOP + ((x - HERO_CX) / 22) ** 2 * 7;
      // Bajo desgarrado, con dos frecuencias para que no sea un festón regular.
      const hem = 46 - Math.sin(x * 0.8) * 4 - Math.sin(x * 0.31) * 3;
      line += x >= left && x <= right && y >= collar && y <= hem ? SOLID : EMPTY;
    }
    rows.push(line);
  }
  return shadeMask(rows, 'gum');
};

/** Prefijo de los horneados que dependen del ancho, para poder desalojarlos. */
export const CREDITS_BAKE_PREFIX = 'credits:scene:';

/** Recorre los tramos de 800 que cubren un ancho dado. */
const tiles = (w: number) => {
  const offsets: number[] = [];
  for (let x = 0; x < w; x += CREDITS_W) offsets.push(x);
  return offsets;
};

/**
 * Una nube: filas de trama de anchos variables, con la base más plana que el
 * lomo. Una lente simétrica se lee como un ojo, no como una nube.
 */
const cloud = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  tone: PaletteKey,
  level: number
) => {
  for (let dy = -halfH; dy <= halfH; dy++) {
    const t = dy / (halfH + 0.5);
    const profile = dy > 0 ? 1 - t * t * 0.45 : Math.sqrt(Math.max(0, 1 - t * t));
    const half = Math.round(halfW * profile);
    if (half <= 0) continue;
    // El lomo recibe algo más de luz que la panza, que es lo que le da cuerpo.
    ditherOver(ctx, cx - half, cy + dy, half * 2, 1, tone, dy < 0 ? level : Math.max(1, level - 2));
  }
};

/** Anillo tramado alrededor de la luna, sustituto del degradado radial. */
const ditherRing = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  level: number
) => {
  if (level <= 0) return;
  for (let y = Math.max(0, cy - r); y < Math.min(CREDITS_H, cy + r); y++) {
    const dy = (y + 0.5 - cy) / r;
    const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * r;
    ditherFill(ctx, cx - half, y, half * 2, 1, 'stone.dark', 'stone.light', level);
  }
};

/**
 * Una sonda dental, de pie como un árbol seco: astil que se curva y afina, y un
 * gancho arriba. **El gancho es la pieza que la identifica**: sin él es un poste.
 */
const scaler = (
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  height: number,
  lean: number,
  hook: 1 | -1
) => {
  const sway = lean * 24;
  for (let i = 0; i <= height; i++) {
    const t = i / height;
    const x = baseX + Math.round(sway * t * t);
    const thick = t < 0.18 ? 5 : t < 0.55 ? 4 : t < 0.85 ? 3 : 2;
    px(ctx, x, baseY - i, thick, 1, 'metal.out');
    // Filo de luz en un solo canto: es lo que dice "acero" y no "rama".
    if (i % 2 === 0) px(ctx, x + thick - 1, baseY - i, 1, 1, 'metal.shade');
  }

  const tipX = baseX + Math.round(sway);
  const tipY = baseY - height;
  const radius = 9 + Math.round(height / 40);
  for (let a = 0; a <= 14; a++) {
    const ang = (a / 14) * Math.PI * 0.95;
    const hx = tipX + Math.round(Math.sin(ang) * radius) * hook;
    const hy = tipY + Math.round((1 - Math.cos(ang)) * radius * 0.8);
    px(ctx, hx, hy, 2, 2, 'metal.out');
    if (a > 9) px(ctx, hx, hy, 1, 1, 'metal.shade');
  }
};

/** Escena completa, horneada: solo cae la ceniza. */
const scene = (w: number) =>
  bake(`${CREDITS_BAKE_PREFIX}${w}`, w, CREDITS_H, (ctx) => {
    // 1. Cielo de tormenta: cerrado arriba, abierto y pálido en el horizonte.
    ditherBand(ctx, 0, 0, w, 130, 'stone.out', 'stone.shade', 8);
    ditherBand(ctx, 0, 130, w, 100, 'stone.shade', 'stone.dark', 8);
    ditherBand(ctx, 0, 230, w, 80, 'stone.dark', 'stone.mid', 8);

    // 2. Halo y luna. Van **antes** que las nubes altas, para quedar veladas.
    const moonX = Math.round(w * MOON_X_FRAC);
    // Caída cuadrática en ocho pasos. Con cinco pasos lineales el borde exterior
    // seguía siendo denso y el halo se leía como un disco de puntos con un canto
    // duro, no como un resplandor.
    const HALO_STEPS = 8;
    for (let i = HALO_STEPS; i >= 1; i--) {
      const t = i / HALO_STEPS;
      ditherRing(ctx, moonX, MOON_Y, MOON_R + Math.round(t * 60), Math.round(10 * (1 - t) ** 2));
    }
    const moon = bake('credits:moon', MOON_R * 2, MOON_R * 2, (c) =>
      drawSprite(c, 'credits:moon:art', moonSprite(), 0, 0)
    );
    blit(ctx, moon, moonX - MOON_R, MOON_Y - MOON_R, MOON_R * 2, MOON_R * 2);

    // 3. Nubes, por tramos para que la densidad no cambie con la ventana.
    for (const ox of tiles(w)) {
      for (const [cx, cy, halfW, halfH, level] of CLOUDS) {
        if (cx + ox - halfW >= w) continue;
        cloud(ctx, cx + ox, cy, halfW, halfH, cy < 100 ? 'stone.light' : 'stone.mid', level);
      }
    }
    // Una banda baja y densa que cruza la luna: es lo que la deja detrás del
    // temporal en vez de recortada sobre él.
    for (const ox of tiles(w)) {
      cloud(ctx, moonX + ox - 40, MOON_Y + 14, 150, 7, 'stone.dark', 9);
    }

    // 4. Cordillera de muelas al fondo, repitiendo el perfil. Su base se apoya
    // muy por encima del horizonte: es lo que la manda al fondo.
    const ridgeBase = HORIZON - 26;
    for (let i = 0; i * RIDGE_STEP - 8 < w; i++) {
      const height = RIDGE[i % RIDGE.length];
      const h = height + 26;
      const tooth = bake(`credits:ridge:${height}`, RIDGE_W, h, (c) =>
        drawSprite(c, `credits:ridge:art:${height}`, ridgeTooth(height), 0, 0)
      );
      blit(ctx, tooth, i * RIDGE_STEP - 8, ridgeBase - h, RIDGE_W, h);
    }

    // 5. Niebla en la base de la cordillera: la corta por los pies, que es lo que
    // impide que se lea apoyada en el mismo suelo que el héroe.
    ditherFill(ctx, 0, ridgeBase - 14, w, 20, 'stone.dark', 'stone.light', 8);
    // Y se disuelve hacia abajo. Como relleno de nivel constante era una franja
    // de puntos con dos cantos duros cruzando la escena de lado a lado.
    ditherBand(ctx, 0, ridgeBase + 6, w, 26, 'stone.mid', 'stone.dark', 6);

    // 6. Cerro del castillo: una loma que sube desde el horizonte por la derecha.
    const castleX = Math.round(w * CASTLE_X_FRAC);
    const hillHalf = 210;
    const hillPeak = HORIZON - 74;
    for (let dx = -hillHalf; dx <= hillHalf; dx++) {
      const x = castleX + dx;
      if (x < 0 || x >= w) continue;
      const t = dx / hillHalf;
      const dome = Math.sqrt(Math.max(0, 1 - t * t));
      // El perfil lleva mordidas: un domo limpio se lee como una cúpula.
      const bite = (hash(Math.round(x / 7), 91) - 0.5) * 7;
      const top = Math.round(HORIZON + 16 - dome * (HORIZON + 16 - hillPeak) + bite);
      ditherFill(ctx, x, top, 1, CREDITS_H - top, 'stone.shade', 'stone.out', 6);
      px(ctx, x, top, 1, 2, 'stone.dark');
    }

    // 7. El castillo, coronando el cerro.
    const castle = bake('credits:castle', CASTLE_W, CASTLE_H, (c) =>
      drawSprite(c, 'credits:castle:art', castleSprite(), 0, 0)
    );
    const castleY = hillPeak - CASTLE_H + 44;
    blit(ctx, castle, castleX - CASTLE_W / 2, castleY, CASTLE_W, CASTLE_H);

    // Ventanas y portón: huecos negros pintados **encima**. Restados de la
    // máscara dejarían ver el cielo a través del castillo.
    for (const [hx, hy, hw, hh] of CASTLE_HOLES) {
      px(ctx, castleX - CASTLE_W / 2 + hx, castleY + hy, hw, hh, 'void.out');
      // Un filo cálido en el alféizar: dice que dentro hay algo encendido.
      px(ctx, castleX - CASTLE_W / 2 + hx, castleY + hy + hh - 1, hw, 1, 'warden.dark');
    }

    // 8. Primer plano: la encía. Aquí cambia la paleta de gris a granate, que es
    // lo que separa el mundo lejano del suelo que se pisa.
    ditherBand(ctx, 0, HORIZON, w, 56, 'mucosa.shade', 'gum.out', 6);
    ditherBand(ctx, 0, HORIZON + 56, w, CREDITS_H - HORIZON - 56, 'gum.out', 'mucosa.out', 7);

    // Borde festoneado: cada arco es una muela vencida asomando.
    for (let x = -20; x < w + 20; x += 40) {
      for (let i = 0; i < 40; i++) {
        const t = (i / 39) * 2 - 1;
        const depth = Math.round((1 - t * t) * 12);
        if (depth > 0) px(ctx, x + i, HORIZON - depth, 1, depth + 2, 'mucosa.shade');
      }
    }

    // 9. El montículo del héroe: la escena necesita un sitio desde el que mirar.
    const heroX = Math.round(w * HERO_X_FRAC);
    const moundHalf = 150;
    for (let dx = -moundHalf; dx <= moundHalf; dx++) {
      const x = heroX + dx;
      if (x < 0 || x >= w) continue;
      const t = dx / moundHalf;
      const dome = Math.sqrt(Math.max(0, 1 - t * t));
      const fold = (hash(Math.round(x / 5), 37) - 0.5) * 6;
      const top = Math.round(HORIZON + 34 - dome * 52 + fold);
      ditherFill(ctx, x, top, 1, CREDITS_H - top, 'mucosa.dark', 'gum.out', 8);
      px(ctx, x, top, 1, 2, 'mucosa.light');
    }

    // Pliegues del tejido: trazos cortos y desalineados. Largos y paralelos se
    // leerían como arañazos, que es el fallo clásico del relieve fino.
    for (const ox of tiles(w)) {
      for (let i = 0; i < 14; i++) {
        const fx = ox + 30 + i * 55;
        if (fx >= w) continue;
        const fy = HORIZON + 40 + Math.round(hash(i, 5) * 90);
        const len = 9 + Math.round(hash(i, 9) * 14);
        px(ctx, fx, fy, len, 1, 'mucosa.shade');
        px(ctx, fx + 1, fy + 1, len - 2, 1, 'gum.out');
      }
    }

    // 10. Cascotes: dientes caídos, tumbados y de tamaños dispares.
    for (const ox of tiles(w)) {
      for (const [x, dy, rw, rh] of RUBBLE) {
        if (x + ox >= w) continue;
        px(ctx, x + ox, HORIZON + dy, rw, rh, 'enamelStained.shade');
        px(ctx, x + ox, HORIZON + dy, rw, 1, 'enamelStained.dark');
        px(ctx, x + ox, HORIZON + dy + rh, rw, 1, 'mucosa.out');
      }
    }

    // 11. Las sondas, delante del cerro y detrás del héroe.
    for (const [frac, height, lean, hook] of SCALERS) {
      scaler(ctx, Math.round(w * frac), HORIZON + 70, height, lean, hook);
    }

    // 12. El héroe, a ×2 sobre su montículo.
    //
    // En el tercio izquierdo, no en el centro: en el centro se lo comía el panel
    // de la dedicatoria, que es justo lo que va encima de la escena. Y a cambio
    // la ilustración compone mejor, con el héroe a un lado y el castillo al otro.
    // Se ancla por el **centro del diente**, no por el del lienzo: el lienzo es
    // asimétrico —lleva el hueco del vuelo de la capa a la izquierda—, así que
    // centrarlo desplazaría al héroe a la derecha de donde se le quiere.
    const heroScale = 2;
    const heroDrawX = heroX - HERO_CX * heroScale;
    const heroDrawY = HORIZON - 18 - HERO_H * heroScale;

    ctx.save();
    ctx.translate(heroDrawX, heroDrawY);
    ctx.scale(heroScale, heroScale);
    drawSprite(ctx, 'credits:hero:body', heroBody(), 0, 0);
    // La capa va **después** del cuerpo: cuelga de los hombros y tapa la espalda,
    // dejando fuera la corona por arriba y las raíces por abajo.
    drawSprite(ctx, 'credits:hero:cape', capeMask(), 0, 0);
    ctx.restore();

    // 13. El cepillo, arrastrado hacia la derecha como una espada cansada.
    //
    // Agarrado a media altura del cuerpo, no en el hombro: saliendo de arriba
    // parecía clavado en la corona en vez de llevado en la mano.
    const gripX = heroDrawX + HERO_RIGHT * heroScale - 6;
    const gripY = heroDrawY + Math.round(HERO_H * heroScale * 0.56);
    const shaft = 62;
    for (let i = 0; i < shaft; i++) {
      const bx = gripX + i;
      const by = gripY + Math.round(i * 0.5);
      px(ctx, bx, by, 1, 6, 'wood.shade');
      px(ctx, bx, by, 1, 2, 'wood.mid');
      px(ctx, bx, by + 5, 1, 1, 'wood.out');
    }
    // Virola: el anillo que separa el mango del cabezal. Sin ella el cepillo es
    // una sola pieza y se lee como un palo con un bulto.
    const headX = gripX + shaft;
    const headY = gripY + Math.round(shaft * 0.5);
    px(ctx, headX - 3, headY, 3, 6, 'warden.dark');
    px(ctx, headX, headY - 1, 26, 8, 'enamel.dark');
    px(ctx, headX, headY - 1, 26, 3, 'enamel.mid');
    // Mechones de cerda, de largos desiguales: parejos parecen un peine.
    for (let i = 0; i < 24; i += 3) {
      px(ctx, headX + i, headY + 7, 2, 3 + Math.round(hash(i, 3) * 4), 'enamel.light');
    }

    // 14. Marco de carne: se mira desde dentro de una boca, y ese encuadre es lo
    // que ata la escena al resto del juego. Los bordes son irregulares y con fase
    // distinta a izquierda y derecha, para que no se lean como dos barras.
    for (let y = 0; y < CREDITS_H; y++) {
      const t = y / CREDITS_H;
      const left = 22 + Math.round(Math.sin(t * 5.1) * 13 + Math.sin(t * 12.3) * 6);
      const right = 26 + Math.round(Math.cos(t * 4.3 + 1.2) * 15 + Math.sin(t * 9.7) * 5);
      px(ctx, 0, y, left, 1, 'gum.out');
      px(ctx, left, y, 2, 1, 'mucosa.out');
      px(ctx, w - right, y, right, 1, 'gum.out');
      px(ctx, w - right - 2, y, 2, 1, 'mucosa.out');
    }
    for (let x = 0; x < w; x++) {
      const p = (x % CREDITS_W) / CREDITS_W;
      const top = 14 + Math.round(Math.sin(p * 7.4) * 9 + Math.sin(p * 15.1) * 4);
      px(ctx, x, 0, 1, top, 'gum.out');
      px(ctx, x, top, 1, 2, 'mucosa.out');
    }
  });

/**
 * Ceniza que cae: lo único que se mueve, y con posiciones deterministas.
 *
 * Antes eran ascuas subiendo, que suponen un fuego. Aquí no hay ninguno: es una
 * tierra apagada bajo una tormenta, y lo que cae del cielo es ceniza.
 */
const ASH: readonly [number, number][] = [
  [120, 0],
  [230, 40],
  [318, 90],
  [420, 20],
  [512, 70],
  [604, 110],
  [690, 50],
  [760, 95],
];

export const drawCreditsScene = (ctx: CanvasRenderingContext2D, t = 0, w = CREDITS_W) => {
  blit(ctx, scene(w), 0, 0, w, CREDITS_H);

  for (const ox of tiles(w)) {
    ASH.forEach(([x, offset], i) => {
      if (x + ox >= w) return;
      const fall = (t * 14 + offset) % 260;
      const y = 40 + fall;
      const drift = Math.round(Math.sin((t + i) * 0.9) * 5);
      px(ctx, x + ox + drift, y, 2, 2, i % 2 === 0 ? 'stone.light' : 'stone.mid');
    });
  }
};
