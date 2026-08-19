import { bake, blit, px } from './pixel';
import { ditherBand, ditherFill } from './dither';
import { drawSprite } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { playerSprite, playerSpriteId } from './sprites/player';
import { ellipse, rect, merge, subtract, blank, fit } from './sprites/masks/shapes';
import type { PaletteKey } from '../data/palette';

/**
 * Escena de victoria de los créditos: el amanecer sobre la boca limpia.
 *
 * Era la última parte del juego dibujada con degradados, estrellas con `arc()` y
 * `Math.random()` en cada montaje —así que cambiaba cada vez que se abría—. Ahora se
 * compone con el mismo pipeline que el resto: bandas tramadas, siluetas sombreadas y
 * horneado. Y es **determinista**: las estrellas y las rocas salen de tablas fijas,
 * de modo que la escena que se recuerda es siempre la misma.
 */

/**
 * Tamaño de referencia. El **alto es fijo**: es lo que fija el tamaño del píxel
 * y la proporción de la luna, la cordillera y el héroe. El **ancho sí varía**,
 * porque es el único eje que la escena puede repetir sin que se note: las
 * estrellas, la cordillera y las rocas se reparten en tramos de 800.
 *
 * Así el fondo llena la ventana a cualquier proporción sin recortar el héroe ni
 * estirar los píxeles, que es lo que pasaba cuando el lienzo era de 800×450
 * fijos y se estiraba con `object-cover`.
 */
export const CREDITS_W = 800;
export const CREDITS_H = 450;

const HORIZON = 300;
/** La luna se ancla al borde derecho, no a un x absoluto. */
const MOON_INSET = 170;
const MOON_Y = 96;
const MOON_R = 42;

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

/** Estrellas: posición y brillo fijos. Antes eran 150 aleatorias por montaje. */
const STARS: readonly [number, number, 0 | 1][] = [
  [24, 26, 1], [58, 62, 0], [92, 18, 0], [126, 78, 1], [150, 40, 0], [188, 96, 0],
  [212, 22, 1], [246, 58, 0], [274, 104, 0], [300, 34, 1], [332, 72, 0], [360, 14, 0],
  [396, 88, 1], [424, 46, 0], [452, 110, 0], [486, 28, 1], [512, 66, 0], [540, 100, 0],
  [566, 20, 1], [592, 54, 0], [664, 132, 0], [700, 40, 1], [726, 84, 0], [758, 24, 0],
  [780, 60, 1], [40, 120, 0], [110, 140, 0], [180, 158, 1], [250, 130, 0], [318, 150, 0],
  [388, 168, 0], [456, 142, 1], [524, 162, 0], [596, 148, 0], [668, 176, 0], [742, 154, 1],
];

/** Alturas de las muelas del horizonte. Fijas, para que la silueta no baile. */
const RIDGE = [34, 52, 28, 66, 44, 74, 38, 58, 30, 68, 48, 62, 36, 54, 42];

/** Rocas del acantilado: x, y relativo y tamaño. */
const RUBBLE: readonly [number, number, number][] = [
  [60, 24, 3], [140, 46, 2], [210, 18, 4], [286, 60, 2], [352, 30, 3],
  [430, 52, 2], [498, 22, 3], [566, 44, 4], [640, 28, 2], [712, 56, 3],
];

/** La luna: un disco de esmalte con tres cráteres. */
const moonSprite = () => {
  const size = MOON_R * 2;
  const disc = ellipse(size, size, MOON_R, MOON_R, MOON_R, MOON_R);
  const craters = fit(
    [
      ...blank(size, 22),
      '..........SSS...................',
      '.........SSSSS..................',
      '..........SSS.......SS..........',
      '....................SSSS........',
      '.....................SS.........',
      ...blank(size, 10),
      '..........SS....................',
      '.........SSSS...................',
      '..........SS....................',
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
  const w = 56;
  const h = height + 40;
  const crown = merge(
    ellipse(w, h, 16, 24, 15, 22),
    ellipse(w, h, 40, 24, 15, 22),
    rect(w, h, 2, 16, 52, 30)
  );
  const roots = merge(rect(w, h, 8, 40, 14, h - 40, 5), rect(w, h, 34, 40, 14, h - 40, 5));
  const seam = rect(w, h, 26, 4, 4, 18);
  return shadeMask(subtract(merge(crown, roots), seam), 'stone', { bias: -0.35 });
};

/** Prefijo de los horneados que dependen del ancho, para poder desalojarlos. */
export const CREDITS_BAKE_PREFIX = 'credits:scene:';

/** Recorre los tramos de 800 que cubren un ancho dado. */
const tiles = (w: number) => {
  const offsets: number[] = [];
  for (let x = 0; x < w; x += CREDITS_W) offsets.push(x);
  return offsets;
};

/** Escena completa, horneada: solo cambian las ascuas. */
const scene = (w: number) =>
  bake(`${CREDITS_BAKE_PREFIX}${w}`, w, CREDITS_H, (ctx) => {
    // 1. Cielo: de la noche cerrada arriba al amanecer en el horizonte.
    ditherBand(ctx, 0, 0, w, 120, 'void.out', 'void.shade', 8);
    ditherBand(ctx, 0, 120, w, 100, 'void.shade', 'void.dark', 8);
    ditherBand(ctx, 0, 220, w, 60, 'void.dark', 'warden.dark', 8);
    ditherBand(ctx, 0, 280, w, 30, 'warden.dark', 'warden.mid', 6);

    // 2. Estrellas: un píxel, y dos de brillo las que destacan.
    for (const ox of tiles(w)) {
      for (const [x, y, bright] of STARS) {
        if (x + ox >= w) continue;
        px(ctx, x + ox, y, 1, 1, bright ? 'enamel.hi' : 'enamel.dark');
        if (bright) px(ctx, x + ox, y + 1, 1, 1, 'enamel.light');
      }
    }

    // 3. Halo y luna, ancladas al borde derecho.
    // El retranqueo se reduce en escenas estrechas para que la luna no se salga
    // por el borde izquierdo en una ventana en vertical.
    const moonX = w - Math.min(MOON_INSET, Math.round(w * 0.28));
    // Caída cuadrática en ocho pasos. Con cinco pasos lineales el borde exterior
    // seguía siendo denso y el halo se leía como un disco de puntos con un canto
    // duro, no como un resplandor.
    const HALO_STEPS = 8;
    for (let i = HALO_STEPS; i >= 1; i--) {
      const t = i / HALO_STEPS;
      ditherRing(ctx, moonX, MOON_Y, MOON_R + Math.round(t * 66), Math.round(9 * (1 - t) ** 2));
    }
    const moon = bake('credits:moon', MOON_R * 2, MOON_R * 2, (c) =>
      drawSprite(c, 'credits:moon:art', moonSprite(), 0, 0)
    );
    blit(ctx, moon, moonX - MOON_R, MOON_Y - MOON_R, MOON_R * 2, MOON_R * 2);

    // 4. Cordillera de muelas al fondo, repitiendo el perfil.
    for (let i = 0; i * 54 - 10 < w; i++) {
      const height = RIDGE[i % RIDGE.length];
      const tooth = bake(`credits:ridge:${height}`, 56, height + 40, (c) =>
        drawSprite(c, `credits:ridge:art:${height}`, ridgeTooth(height), 0, 0)
      );
      blit(ctx, tooth, i * 54 - 10, HORIZON - height - 24, 56, height + 40);
    }

    // 5. Niebla en la base de la cordillera.
    ditherFill(ctx, 0, HORIZON - 18, w, 18, 'warden.mid', 'warden.light', 7);

    // 6. Acantilado del primer plano: los caídos.
    ditherBand(ctx, 0, HORIZON, w, 60, 'stone.dark', 'stone.shade', 6);
    ditherBand(ctx, 0, HORIZON + 60, w, CREDITS_H - HORIZON - 60, 'stone.shade', 'stone.out', 7);

    // Borde festoneado: cada arco es una muela vencida asomando.
    for (let x = -20; x < w + 20; x += 40) {
      for (let i = 0; i < 40; i++) {
        const t = (i / 39) * 2 - 1;
        const depth = Math.round((1 - t * t) * 12);
        if (depth > 0) px(ctx, x + i, HORIZON - depth, 1, depth + 2, 'stone.dark');
      }
    }

    for (const ox of tiles(w)) {
      for (const [x, dy, size] of RUBBLE) {
        if (x + ox >= w) continue;
        px(ctx, x + ox, HORIZON + dy, size, size, 'stone.mid');
        px(ctx, x + ox, HORIZON + dy + size, size, 1, 'stone.out');
      }
    }

    // 7. El héroe: el mismo sprite del jugador, a ×3 y con su sombra larga.
    //
    // En el tercio izquierdo, no en el centro: en el centro se lo comía el panel
    // de la dedicatoria, que es justo lo que va encima de la escena. Y a cambio
    // la ilustración compone mejor, con el héroe a un lado y la luna al otro.
    // La posición es relativa al ancho real, para que no se quede pegada al
    // borde cuando el fondo se estira.
    const hero = playerSprite('molar', 'idle');
    const heroX = Math.round(w * 0.22 - (hero.w * 3) / 2);
    const heroY = HORIZON - hero.h * 3 + 6;

    // Sombra larga: tres filas que se estrechan. Una sola barra recta se leía
    // como un travesaño negro debajo del héroe.
    for (let i = 0; i < 3; i++) {
      const inset = i * 15;
      px(ctx, heroX - 30 + inset, HORIZON + 2 + i, hero.w * 3 + 60 - inset * 2, 1, 'stone.out');
    }

    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.scale(3, 3);
    // Se compensan los desplazamientos de anclaje **dentro** de la escala: `drawSprite`
    // los aplica, y aquí valen el triple, así que sin compensarlos el héroe quedaba
    // dieciocho píxeles por encima del horizonte y la sombra ya no le tocaba los pies.
    drawSprite(ctx, playerSpriteId('molar', 'idle'), hero, -(hero.offsetX ?? 0), -(hero.offsetY ?? 0));
    ctx.restore();
  });

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
    ditherFill(ctx, cx - half, y, half * 2, 1, 'void.shade', 'warden.light', level);
  }
};

/** Ascuas que suben: lo único que se mueve, y con posiciones deterministas. */
const EMBERS: readonly [number, number][] = [
  [120, 0], [230, 40], [318, 90], [420, 20], [512, 70], [604, 110], [690, 50], [760, 95],
];

export const drawCreditsScene = (ctx: CanvasRenderingContext2D, t = 0, w = CREDITS_W) => {
  blit(ctx, scene(w), 0, 0, w, CREDITS_H);

  for (const ox of tiles(w)) {
    EMBERS.forEach(([x, offset], i) => {
      if (x + ox >= w) return;
      const rise = (t * 18 + offset) % 200;
      const y = CREDITS_H - 40 - rise;
      const drift = Math.round(Math.sin((t + i) * 1.4) * 3);
      px(ctx, x + ox + drift, y, 2, 2, i % 2 === 0 ? 'warden.light' : 'candy.light');
    });
  }
};
