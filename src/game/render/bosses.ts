import type { Enemy } from '../../types';
import type { Material, PaletteKey } from '../data/palette';
import { drawSprite } from './sprites/format';
import type { SpriteDef } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { blank, ellipse, rect, spike, wedge, annulus, merge, subtract, stamp, shift } from './sprites/masks/shapes';

/**
 * Dibujado de los jefes.
 *
 * Un jefe mide de 100 a 160 px: una matriz a mano de 160×140 son 22.400
 * caracteres y no hay forma de mantenerla. Así que su silueta se **compone** con
 * las primitivas de forma y luego pasa por el mismo sombreado y el mismo horneado
 * que los sprites dibujados a mano. El resultado se ve del mismo material que el
 * resto del juego, que es lo que importa.
 *
 * Cada variante depende de su `bossState` y su `phase` para el dibujo, así que la
 * clave de horneado los incluye: un jefe con el cañón levantado es otro sprite.
 */

const detailColors = (material: Material): Record<string, PaletteKey> => ({
  E: 'enamel.hi',
  P: 'metal.out',
  R: 'candy.light',
  Y: 'warden.light',
  M: `${material}.out`,
  S: `${material}.shade`,
  H: `${material}.hi`,
  W: 'metal.mid',
  T: 'enamel.light',
});

interface BossArt {
  w: number;
  h: number;
  material: Material;
  mask: readonly string[];
  detail?: readonly string[];
}

// ---------------------------------------------------------------------------
// Rey de la Caries: 120×160. Un molar gigante, coronado y podrido.
// ---------------------------------------------------------------------------

const king = (state: number): BossArt => {
  const w = 120;
  const h = 160;

  // Corona del diente: dos cúspides anchas.
  const crown = merge(
    ellipse(w, h, 40, 60, 38, 44),
    ellipse(w, h, 80, 60, 38, 44),
    rect(w, h, 6, 46, 108, 60)
  );
  // Dos raíces gruesas.
  const roots = merge(
    rect(w, h, 20, 100, 32, 54, 10),
    rect(w, h, 68, 100, 32, 54, 10)
  );
  // Corona de rey, con tres puntas.
  const regalia = merge(
    rect(w, h, 24, 18, 72, 14),
    spike(w, h, 32, 2, 18, 10),
    spike(w, h, 60, 0, 18, 12),
    spike(w, h, 88, 2, 18, 10)
  );

  // Costuras: la base de la corona de rey y el cuello entre corona y raíces, más
  // el surco entre las dos cúspides. Sin ellas es un bulto único.
  const seams = merge(
    rect(w, h, 22, 32, 76, 2),
    rect(w, h, 18, 98, 84, 2),
    rect(w, h, 58, 18, 4, 30)
  );

  const mask = subtract(merge(crown, roots, regalia), seams);

  // La boca se abre al rugir (estado 4: dispara).
  const mouth = state === 4 ? ellipse(w, h, 60, 88, 22, 14) : ellipse(w, h, 60, 88, 20, 5);

  return {
    w,
    h,
    material: 'enamel',
    mask,
    detail: withMouth(
      stamp(
        stamp(blank(w, h), eyeBlock(14, 10, state === 4), 32, 62),
        eyeBlock(14, 10, state === 4),
        74,
        62
      ),
      mouth,
      w,
      h
    ),
  };
};

// ---------------------------------------------------------------------------
// Fantasma de placa: 100×100. Espectro traslúcido de borde deshilachado.
// ---------------------------------------------------------------------------

const phantom = (): BossArt => {
  const w = 100;
  const h = 100;

  const body = merge(ellipse(w, h, 50, 44, 40, 40), rect(w, h, 10, 44, 80, 40));
  // Borde inferior deshilachado: cinco jirones.
  const tatters = merge(
    ...[0, 1, 2, 3, 4].map((i) =>
      ellipse(w, h, 14 + i * 18, 84 + (i % 2 === 0 ? 0 : 6), 9, 12)
    )
  );
  const mask = subtract(merge(body, tatters), rect(w, h, 0, 92, w, 8));

  return {
    w,
    h,
    material: 'laser',
    mask,
    // Al desvanecerse (estado 5) solo quedan los ojos.
    detail: stamp(
      stamp(blank(w, h), eyeBlock(16, 12, true), 22, 36),
      eyeBlock(16, 12, true),
      62,
      36
    ),
  };
};

// ---------------------------------------------------------------------------
// Tanque de sarro: 160×140. Oruga, casco y cañón que apunta.
// ---------------------------------------------------------------------------

const tank = (state: number): BossArt => {
  const w = 160;
  const h = 140;

  // Tren de rodaje: bastidor con cinco ruedas dentro. Las ruedas no se dibujan
  // encima, se **recortan**: un hueco de un píxel a su alrededor obliga al
  // sombreado a poner contorno ahí, y así se leen como ruedas en lugar de fundirse
  // con el bastidor en una losa. Los eslabones de la oruga, igual: ranuras
  // verticales en las bandas de rodadura.
  const frame = rect(w, h, 6, 96, 148, 40, 10);
  const wheelGaps = merge(
    ...[0, 1, 2, 3, 4].map((i) => annulus(w, h, 26 + i * 27, 116, 14, 14, 2))
  );
  const trackLinks = merge(
    ...Array.from({ length: 15 }, (_, i) =>
      merge(rect(w, h, 12 + i * 10, 96, 2, 6), rect(w, h, 12 + i * 10, 130, 2, 6))
    )
  );
  const running = subtract(frame, merge(wheelGaps, trackLinks));

  // Casco con el frontal inclinado: un rectángulo al que se le bisela la esquina.
  const hullBox = rect(w, h, 14, 56, 132, 42, 4);
  const hull = subtract(hullBox, wedge(w, h, 118, 56, 28, 22, 'tr'));
  const deck = rect(w, h, 22, 48, 74, 10, 3);
  const exhaust = rect(w, h, 12, 40, 12, 18, 3);

  // Torreta con mantelete, y el cañón que se levanta para el mortero (estado 1).
  const turret = subtract(rect(w, h, 44, 24, 62, 34, 6), wedge(w, h, 92, 24, 14, 12, 'tr'));
  const mantlet = rect(w, h, 100, 32, 10, 18, 2);
  const barrel = state === 1 ? rect(w, h, 96, 0, 14, 34, 2) : rect(w, h, 108, 36, 52, 10, 1);
  const muzzle = state === 1 ? rect(w, h, 92, 0, 22, 8, 2) : rect(w, h, 148, 32, 12, 18, 2);

  // Costuras: separan bastidor, casco, torreta y cañón. Sin ellas todo se funde en
  // una mancha, porque el sombreado no sabe dónde acaba una pieza y empieza otra.
  const seams = merge(
    rect(w, h, 10, 94, 140, 2),
    rect(w, h, 40, 56, 70, 2),
    rect(w, h, 20, 46, 78, 2),
    state === 1 ? rect(w, h, 94, 32, 18, 2) : rect(w, h, 106, 34, 2, 14)
  );

  return {
    w,
    h,
    material: 'metal',
    mask: subtract(merge(running, hull, deck, exhaust, turret, mantlet, barrel, muzzle), seams),
    detail: stamp(
      stamp(
        // Escotilla y remaches en la cubierta, y la óptica en la torreta.
        stamp(blank(w, h), rivets(70, 6), 26, 50),
        eyeBlock(18, 12, state !== 0),
        56,
        32
      ),
      hatch(22, 10),
      66,
      26
    ),
  };
};

/** Fila de remaches, para que una plancha lisa no parezca cartón. */
const rivets = (width: number, spacing: number): string[] => {
  let row = '';
  for (let x = 0; x < width; x++) row += x % spacing === 0 ? 'S' : '.';
  return [row, row.replace(/S/g, 'H')];
};

/** Escotilla: un rectángulo hundido con su bisagra. */
const hatch = (width: number, height: number): string[] =>
  Array.from({ length: height }, (_, y) => {
    if (y === 0 || y === height - 1) return 'M'.repeat(width);
    if (y === 1) return 'H'.repeat(width);
    return `M${'S'.repeat(Math.max(0, width - 2))}M`;
  });

// ---------------------------------------------------------------------------
// General Gingivitis: 100×180. Alto, con gorra y cabeza inflamada.
// ---------------------------------------------------------------------------

const general = (state: number): BossArt => {
  const w = 100;
  const h = 180;

  // Gorra de plato: copa, visera inclinada e insignia.
  const crown = subtract(rect(w, h, 20, 12, 60, 20, 5), wedge(w, h, 20, 12, 12, 8, 'tl'));
  const visor = subtract(rect(w, h, 8, 32, 84, 8, 3), wedge(w, h, 8, 36, 10, 4, 'bl'));
  const cap = merge(crown, visor);

  // Cabeza inflamada, más ancha que alta.
  const head = ellipse(w, h, 50, 58, 33, 26);

  // Cuello, hombreras y torso: es lo que le da porte militar.
  const collar = rect(w, h, 26, 82, 48, 10, 3);
  const epaulettes = merge(rect(w, h, 6, 92, 22, 12, 4), rect(w, h, 72, 92, 22, 12, 4));
  const torso = subtract(rect(w, h, 22, 92, 56, 52, 6), wedge(w, h, 22, 132, 10, 12, 'bl'));
  const hem = rect(w, h, 16, 142, 68, 20, 8);
  const baton = merge(rect(w, h, 84, 104, 6, 32, 2), ellipse(w, h, 87, 102, 5, 5));
  const base = ellipse(w, h, 50, 166, 28, 14);

  // Costuras: visera, cuello, hombreras y cinturón.
  const seams = merge(
    rect(w, h, 8, 30, 84, 2),
    rect(w, h, 24, 90, 52, 2),
    rect(w, h, 26, 92, 2, 12),
    rect(w, h, 72, 92, 2, 12),
    rect(w, h, 22, 128, 56, 2),
    rect(w, h, 18, 140, 64, 2)
  );

  const mask = subtract(
    merge(cap, head, collar, epaulettes, torso, hem, baton, base),
    seams
  );

  // Estados 5 en adelante son los ataques de rejilla y lluvia: se le enciende la
  // mirada.
  const angry = state >= 5;

  return {
    w,
    h,
    material: 'grunt',
    mask,
    detail: stamp(
      stamp(
        stamp(
          stamp(blank(w, h), eyeBlock(20, 13, angry), 22, 50),
          eyeBlock(20, 13, angry),
          58,
          50
        ),
        // Insignia de la gorra.
        star(12, 10),
        44,
        16
      ),
      // Condecoraciones en el pecho.
      medals(3),
      30,
      104
    ),
  };
};

/** Estrella de insignia, tosca pero legible a 12 px. */
const star = (width: number, height: number): string[] =>
  Array.from({ length: height }, (_, y) => {
    let row = '';
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x - (width - 1) / 2);
      const dy = y / (height - 1);
      row += dx <= (1 - Math.abs(dy - 0.45) * 2) * (width / 2) ? 'Y' : '.';
    }
    return row;
  });

/** Tres condecoraciones en fila. */
const medals = (count: number): string[] => {
  let row = '';
  for (let i = 0; i < count; i++) row += 'YY.';
  return [row, row.replace(/Y/g, 'R'), row];
};

// ---------------------------------------------------------------------------
// Deidad de la Caries: 140×140. Entidad geométrica con anillos.
// ---------------------------------------------------------------------------

const deity = (phase: number, state: number): BossArt => {
  const w = 140;
  const h = 140;

  const core = ellipse(w, h, 70, 70, 26, 26);
  const petals = merge(
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const angle = (Math.PI * 2 * i) / 6 + (phase === 2 ? Math.PI / 6 : 0);
      const cx = 70 + Math.cos(angle) * 44;
      const cy = 70 + Math.sin(angle) * 44;
      return ellipse(w, h, cx, cy, 20, 20);
    })
  );
  const ring = subtract(ellipse(w, h, 70, 70, 66, 66), ellipse(w, h, 70, 70, 58, 58));

  return {
    w,
    h,
    material: 'void',
    mask: merge(core, petals, ring),
    detail: stamp(blank(w, h), eyeBlock(24, 18, state !== 0 || phase === 2), 58, 60),
  };
};

// ---------------------------------------------------------------------------
// Guardián del Juicio: 120×140. Cordal dorado con tercer ojo.
// ---------------------------------------------------------------------------

const warden = (): BossArt => {
  const w = 120;
  const h = 140;

  const crown = merge(ellipse(w, h, 60, 54, 46, 44), rect(w, h, 16, 40, 88, 46));
  const roots = merge(rect(w, h, 26, 84, 26, 50, 8), rect(w, h, 66, 84, 26, 50, 8));
  const halo = subtract(ellipse(w, h, 60, 30, 40, 14), ellipse(w, h, 60, 30, 32, 8));

  return {
    w,
    h,
    material: 'warden',
    mask: merge(halo, crown, roots),
    // Los dos ojos cerrados y el tercero abierto en la frente.
    detail: stamp(
      stamp(
        stamp(blank(w, h), closedEye(18), 24, 68),
        closedEye(18),
        78,
        68
      ),
      thirdEye(20, 26),
      50,
      36
    ),
  };
};

// --- Piezas de detalle compartidas -----------------------------------------

/**
 * Ojo redondo con párpado, iris y destello. `angry` lo pone rojo.
 *
 * Es redondo y no un rectángulo porque un bloque blanco con una barra dentro se
 * lee como unas gafas de sol, y con seis jefes llevándolas el efecto era cómico
 * en el sentido equivocado.
 */
const eyeBlock = (w: number, h: number, angry: boolean): string[] => {
  const rows: string[] = [];
  const cx = w / 2;
  const cy = h / 2;
  const pupil = angry ? 'R' : 'P';

  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / (w / 2);
      const dy = (y + 0.5 - cy) / (h / 2);
      const d = dx * dx + dy * dy;

      if (d > 1) row += '.';
      else if (d > 0.68) row += 'M';
      else if (d < 0.1 && x < cx) row += 'E'; // destello, arriba a la izquierda
      else if (d < 0.3) row += pupil;
      else row += 'E';
    }
    rows.push(row);
  }
  return rows;
};

/** Ojo cerrado: una línea. */
const closedEye = (w: number): string[] => ['M'.repeat(w), 'M'.repeat(w)];

/** Tercer ojo: vertical, con iris. */
const thirdEye = (w: number, h: number): string[] => {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const d = dx * dx + dy * dy;
      row += d > 1 ? '.' : d > 0.55 ? 'E' : d > 0.18 ? 'R' : 'P';
    }
    rows.push(row);
  }
  return rows;
};

/** Añade una boca oscura a una capa de detalle. */
const withMouth = (
  detail: readonly string[],
  mouth: readonly string[],
  w: number,
  h: number
): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      const m = (mouth[y] ?? '')[x] === '#';
      const d = (detail[y] ?? '')[x];
      row += m ? 'M' : (d ?? '.');
    }
    return row;
  });

// --- Registro y dibujado ---------------------------------------------------

const cache = new Map<string, SpriteDef>();

const build = (variant: string, state: number, phase: number): BossArt => {
  switch (variant) {
    case 'phantom':
      return phantom();
    case 'tank':
      return tank(state);
    case 'general':
      return general(state);
    case 'deity':
      return deity(phase, state);
    case 'wisdom_warden':
      return warden();
    default:
      return king(state);
  }
};

/**
 * Sprite del jefe para su estado actual.
 *
 * Se hornea por (variante, estado, fase) porque el dibujo cambia con ellos: el
 * cañón del tanque apunta arriba al disparar el mortero, la deidad gira sus
 * pétalos en la fase 2, y el rey abre la boca al rugir.
 */
export const bossSprite = (variant: string, state: number, phase: number): SpriteDef => {
  const id = `boss:${variant}:${state}:${phase}`;
  const hit = cache.get(id);
  if (hit) return hit;

  const art = build(variant, state, phase);
  const shaded = shadeMask(art.mask, art.material);
  const def = art.detail
    ? withDetails(shaded, {
        w: art.w,
        h: art.h,
        rows: art.detail,
        map: detailColors(art.material),
      })
    : shaded;

  cache.set(id, def);
  return def;
};

export const bossSpriteId = (variant: string, state: number, phase: number) =>
  `boss:${variant}:${state}:${phase}`;

export const drawBoss = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  const variant = e.bossVariant ?? 'king';
  const state = e.bossState;
  const phase = e.phase ?? 1;

  // El fantasma se desvanece en su estado 5.
  const fading = variant === 'phantom' && state === 5;
  if (fading) ctx.globalAlpha = 0.35;

  const def = bossSprite(variant, state, phase);
  drawSprite(ctx, bossSpriteId(variant, state, phase), def, e.x, e.y, e.facing === 1);

  ctx.globalAlpha = 1;
};

/** Variantes que sabe dibujar, para la galería y los tests. */
export const BOSS_VARIANTS = [
  'king',
  'phantom',
  'tank',
  'general',
  'deity',
  'wisdom_warden',
] as const;

/** `shift` se reexporta porque las máscaras de jefe lo usan al componer. */
export { shift };
