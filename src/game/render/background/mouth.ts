import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import type { PaletteKey } from '../../data/palette';
import { archSlots, openingAt, toothSizeAt, type ToothSlot } from '../../data/opening';
import type { Decay, StageScene } from '../../data/stages';
import { bake, blit, pixelBuffer, px, type PixelBuffer } from '../pixel';
import { BAYER_4 } from '../dither';
import { chance, hash, jitter, spread } from '../noise';
import { drawSprite } from '../sprites/format';
import { shadeMask, withDetails } from '../sprites/shade';
import { lowerTooth, occlusalDetail, upperTooth } from '../sprites/masks/teeth';
import { registerLayer } from './stack';

/**
 * El marco de la boca: lo que se ve estando de pie sobre la lengua.
 *
 * Una sola capa clavada a la pantalla —siempre estás dentro de la misma boca— que
 * deja **transparente** el hueco de la lente para que la clínica se vea por detrás.
 * De fuera hacia dentro: comisuras casi negras, encía, y la arcada colgando del
 * borde de la lente.
 *
 * Sustituye a cuatro capas de la versión anterior —`palate`, `cheeks`, `gums` y
 * `arcade`— porque las cuatro eran trozos sueltos de lo mismo: el encuadre. Con la
 * lente, la carne es simplemente lo que queda fuera de la abertura, y ya no hay que
 * colocar bandas a mano ni acertar dónde empieza cada una.
 */

/** Cuánto se cierra el velo de las comisuras, en píxeles desde cada borde. */
const CORNER = 280;

/** De cuánto es el festón del que nace cada diente. */
const SCALLOP = 7;

/** La línea del suelo: de aquí abajo la carne cede a la lengua. Ver `game/level.ts`. */
const TONGUE_TOP = 386;

/**
 * Velo tramado con umbral **por píxel**.
 *
 * `ditherOver` toma un nivel por rectángulo, y con rectángulos estrechos la retícula
 * de 4×4 —anclada a coordenadas absolutas— solo toca algunas de sus fases: el
 * degradado sale como una reja de rayas. Evaluando el umbral píxel a píxel el nivel
 * varía de forma continua. Es la lección que costó las mejillas de la versión
 * anterior.
 */
const veil = (
  buf: PixelBuffer,
  key: PaletteKey,
  x0: number,
  y0: number,
  w: number,
  h: number,
  level: (x: number, y: number) => number
) => {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const l = level(x, y);
      if (l <= 0) continue;
      if (l >= 16 || BAYER_4[y & 3][x & 3] < l) buf.set(x, y, key);
    }
  }
};

/** Hornea un diente de la arcada, ya con su deterioro. */
const toothCanvas = (scene: StageScene, slot: ToothSlot, upper: boolean, variant: number) => {
  const { w, h } = slot.size;
  const id = `bg:${scene.id}:tooth:${upper ? 'u' : 'l'}:${slot.kind}:${w}x${h}:${variant}`;

  return bake(id, w, h, (ctx) => {
    const mask = upper ? upperTooth(w, h, slot.kind) : lowerTooth(w, h, slot.kind);
    const detail = mergeRows(
      occlusalDetail(w, h, slot.kind, !upper),
      decayRows(w, h, scene.decay, upper, variant)
    );

    const def = withDetails(shadeMask(mask, scene.toothRamp), {
      w,
      h,
      rows: detail,
      map: detailMap(scene),
    });
    drawSprite(ctx, `${id}:art`, def, 0, 0);
  });
};

/**
 * Los tonos del detalle.
 *
 * La sombra y el brillo salen de **la propia rampa del diente**, no de una fija. Con
 * un tono manchado para la sombra, hasta el diente sano de la primera fase salía
 * amarillento: la penumbra de una corona limpia es marfil oscuro, no sarro.
 *
 * El sarro y la caries sí llevan rampa propia, porque no son sombra: son otra materia
 * encima.
 */
const detailMap = (scene: StageScene): Record<string, PaletteKey> => ({
  S: `${scene.toothRamp}.shade`,
  H: `${scene.toothRamp}.hi`,
  T: 'tartarCrust.dark',
  U: 'tartarCrust.mid',
  P: 'tartarCrust.light',
  C: 'cavity.out',
  B: 'cavity.dark',
});

/** Superpone dos capas de detalle; la segunda gana donde tenga algo. */
const mergeRows = (base: readonly string[], over: readonly string[]): string[] =>
  base.map((row, y) =>
    Array.from(row, (ch, x) => {
      const o = over[y]?.[x];
      return o && o !== '.' ? o : ch;
    }).join('')
  );

/**
 * El deterioro, recolocado para la vista nueva.
 *
 * En la versión anterior el sarro se apoyaba en la unión corona-raíz y la caries
 * podía caer en una raíz. Aquí no hay raíces: el **sarro** crece desde la encía —que
 * en el diente de arriba es el borde superior y en el de abajo el inferior—, las
 * **manchas** se meten en los surcos de la mordida y la **caries** agujerea la
 * corona.
 */
const decayRows = (
  w: number,
  h: number,
  decay: Decay,
  upper: boolean,
  variant: number
): string[] => {
  const rows: string[][] = Array.from({ length: h }, () => new Array<string>(w).fill('.'));
  const put = (x: number, y: number, ch: string) => {
    if (y >= 0 && y < h && x >= 0 && x < w) rows[y][x] = ch;
  };

  // La encía está arriba en el diente superior y abajo en el inferior.
  const gumRow = upper ? 0 : h - 1;
  const inward = upper ? 1 : -1;

  if (decay.tartar > 0) {
    const band = Math.round(2 + decay.tartar * (h * 0.3));
    for (let x = 0; x < w; x++) {
      const reach = Math.round(band * (0.45 + hash(variant, x, 41) * 0.55));
      for (let i = 0; i < reach; i++) {
        put(x, gumRow + inward * i, hash(variant, x, i, 43) < 0.72 ? 'T' : 'U');
      }
    }
  }

  if (decay.plaque > 0) {
    const band = Math.round(2 + decay.plaque * (h * 0.35));
    for (let x = 0; x < w; x++) {
      for (let i = 0; i < band; i++) {
        if (hash(variant, x, i, 47) < decay.plaque * 0.5) put(x, gumRow + inward * i, 'P');
      }
    }
  }

  if (decay.cavities > 0) {
    const holes = 1 + Math.floor(decay.cavities * 2);
    for (let i = 0; i < holes; i++) {
      if (hash(variant, i, 51) > decay.cavities + 0.2) continue;
      const cx = Math.round(w * (0.2 + hash(variant, i, 53) * 0.6));
      const cy = Math.round(h * (0.35 + hash(variant, i, 55) * 0.4));
      const r = 2 + Math.round(decay.cavities * 3);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > r) continue;
          put(cx + dx, cy + dy, d > r - 1.2 ? 'B' : 'C');
        }
      }
    }
  }

  return rows.map((r) => r.join(''));
};

/**
 * La encía: toda la carne que queda fuera de la abertura.
 *
 * Se recorre **columna a columna de píxel**, no diente a diente. Por diente, cada
 * columna de la encía tomaba su altura del centro de su pieza, y la carne salía a
 * escalones rectangulares con una costura visible en cada junta. Por píxel, el canto
 * sigue exactamente la curva de la abertura.
 */
const drawGum = (buf: PixelBuffer, scene: StageScene) => {
  const gum = scene.gumRamp;

  for (let x = 0; x < CANVAS_WIDTH; x++) {
    const edge = openingAt(scene.opening, x);
    const size = toothSizeAt(edge.depth);
    // El canto de la encía queda por detrás del diente: la pieza nace de él.
    const upTo = Math.round(edge.top - size.h);
    const downFrom = Math.round(edge.bottom + size.h);

    for (const [from, to, line, toward] of [
      [0, Math.max(0, upTo), upTo, -1],
      [Math.min(CANVAS_HEIGHT, downFrom), CANVAS_HEIGHT, downFrom, 1],
    ] as const) {
      for (let y = from; y < to; y++) {
        /**
         * Por debajo de la línea del suelo ya no es encía: es la lengua sobre la que
         * se está de pie.
         *
         * El canto de la lengua **no puede arquearse por encima de y=390** aunque la
         * referencia lo haga: la superficie por la que se anda es una línea recta, y
         * una lengua abombada dejaría al jugador con los pies hundidos en ella. Lo
         * que sí se puede es marcar el canto, y eso es lo que cuenta que hay una
         * lengua debajo.
         */
        if (y >= TONGUE_TOP) {
          buf.set(x, y, y < TONGUE_TOP + 3 ? 'tongue.light' : 'tongue.mid');
          if (y > TONGUE_TOP + 3 && BAYER_4[y & 3][x & 3] < 7) {
            buf.set(x, y, 'tongue.dark');
          }
          continue;
        }

        // Base **oscura**, y se ilumina solo cerca del diente.
        //
        // Al revés de como estaba: partiendo del tono medio, la encía era un campo
        // rosa uniforme de doscientos píxeles de alto. En las referencias la carne es
        // granate profundo y solo se enciende en el canto, que es donde le llega la
        // luz que entra por la abertura.
        buf.set(x, y, `${gum}.shade`);
        const near = 1 - Math.min(1, Math.abs(y - line) / 110);
        // Tres pasos, no dos: del granate profundo del fondo al tono pleno del canto.
        // Con dos, el salto `dark`→`mid` de esta rampa es tan corto que la carne
        // seguía leyéndose como un plano liso.
        if (BAYER_4[y & 3][x & 3] < 16 * near ** 0.8) buf.set(x, y, `${gum}.dark`);
        if (BAYER_4[y & 3][x & 3] < 16 * near ** 2.4) buf.set(x, y, `${gum}.mid`);
      }

      // Brillo húmedo justo en el canto: es lo que separa una mucosa de un cartón.
      const glossFrom = toward < 0 ? line - 4 : line + 1;
      for (let i = 0; i < 4; i++) {
        const y = glossFrom + i;
        if (y < 0 || y >= CANVAS_HEIGHT) continue;
        const level = 8 - i * 2;
        if (BAYER_4[y & 3][x & 3] < level) buf.set(x, y, `${gum}.light`);
      }
    }
  }
};

/** El festón: el arco de encía del que nace cada pieza. */
const drawScallop = (ctx: CanvasRenderingContext2D, scene: StageScene, slots: ToothSlot[]) => {
  const gum = scene.gumRamp;
  const swell = scene.decay.inflammation;

  for (const slot of slots) {
    const edge = openingAt(scene.opening, slot.cx);
    // Se hincha con la inflamación, y con algo de irregularidad: una encía enferma
    // pierde el borde regular.
    const bulge = SCALLOP + Math.round(swell * 7) + jitter(2, slot.cx, 61);

    for (const upper of [true, false]) {
      const line = Math.round(upper ? edge.top - slot.size.h : edge.bottom + slot.size.h);
      for (let i = 0; i < slot.size.w; i++) {
        const t = (i / (slot.size.w - 1)) * 2 - 1;
        const depth = Math.round((1 - t * t) * bulge);
        if (depth <= 0) continue;
        const y = upper ? line : line - depth;
        px(ctx, slot.x + i, y, 1, depth, `${gum}.mid`);
        px(ctx, slot.x + i, upper ? y + depth - 1 : y, 1, 1, `${gum}.light`);
      }
    }
  }
};

/** Hilos de saliva colgando del canto de la encía superior. */
const drawSaliva = (ctx: CanvasRenderingContext2D, scene: StageScene, slots: ToothSlot[]) => {
  if (scene.saliva <= 0) return;
  const gum = scene.gumRamp;

  for (const slot of slots) {
    if (!chance(scene.saliva * 0.35, slot.cx, 71)) continue;
    const edge = openingAt(scene.opening, slot.cx);
    const x = slot.cx + jitter(4, slot.cx, 73);
    const top = Math.round(edge.top);
    // Cortos y con gota al final: un hilo largo y fino se lee como un arañazo.
    const len = 8 + Math.round(hash(slot.cx, 75) * 16 * scene.saliva);

    for (let i = 0; i < len; i++) {
      const sway = Math.round(Math.sin((i / len) * 2 + slot.depth * 4) * 1.5);
      px(ctx, x + sway, top + i, i < len * 0.6 ? 2 : 1, 1, `${gum}.light`);
      px(ctx, x + sway, top + i, 1, 1, `${gum}.hi`);
    }
    px(ctx, x - 1, top + len, 3, 3, `${gum}.light`);
    px(ctx, x, top + len + 1, 1, 1, `${gum}.hi`);
  }
};

export const mouthLayer = registerLayer({
  id: 'mouth',
  // Enmarca la escena, no está dentro de ella: va clavada a la pantalla.
  anchor: 'screen',
  parallax: 0,

  bake: (scene: StageScene) =>
    bake(`bg:${scene.id}:mouth`, CANVAS_WIDTH, CANVAS_HEIGHT, (ctx) => {
      const slots = archSlots();

      // 1. La carne del marco, y el festón del que nace cada pieza.
      //
      // La carne va por búfer de píxeles y se vuelca antes de seguir: son casi cuatro
      // mil columnas de degradado con umbral por píxel, y a `fillRect` por píxel eso
      // costaba medio segundo de tirón al entrar en la fase.
      const flesh = pixelBuffer(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawGum(flesh, scene);
      flesh.commit();
      drawScallop(ctx, scene, slots);

      // 2. Las dos arcadas, colgando del borde de la lente. De dentro hacia fuera,
      //    para que el molar del borde —que está más cerca— tape a su vecino.
      const ordered = [...slots].sort((a, b) => a.depth - b.depth);
      for (const slot of ordered) {
        const edge = openingAt(scene.opening, slot.cx);
        // Un hueco donde falta una pieza cuenta más que cualquier mancha.
        const missing = chance(scene.gaps, slot.cx, 77);
        if (missing) continue;

        const variant = Math.floor(hash(slot.cx, 79) * 6);

        // Arriba: el diente cuelga y su borde de mordida llega al canto de la lente.
        blit(
          ctx,
          toothCanvas(scene, slot, true, variant),
          slot.x,
          Math.round(edge.top - slot.size.h),
          slot.size.w,
          slot.size.h,
          slot.flip
        );

        // Abajo: asoma, con la mordida arriba.
        blit(
          ctx,
          toothCanvas(scene, slot, false, variant + 3),
          slot.x,
          Math.round(edge.bottom),
          slot.size.w,
          slot.size.h,
          slot.flip
        );
      }

      // 3. Saliva, por delante de los dientes.
      drawSaliva(ctx, scene, slots);

      // 4. Las comisuras: el velo casi negro de las esquinas. Va al final, por encima
      //    de todo, porque es sombra y la sombra no respeta piezas.
      //    Y también por búfer: lee lo ya dibujado —dientes incluidos— y lo ensucia,
      //    así que compone bien encima sin costar un `fillRect` por píxel.
      const shadow = pixelBuffer(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      const dark: PaletteKey = `${scene.cheekRamp}.out`;
      veil(shadow, dark, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, (x, y) => {
        const fromSide = Math.min(x, CANVAS_WIDTH - 1 - x) / CORNER;
        if (fromSide >= 1) return 0;
        // Más cerrado arriba: es donde la mejilla se junta con el labio.
        const high = 1 - Math.min(1, y / CANVAS_HEIGHT) * 0.35;
        return Math.round(18 * (1 - fromSide) ** 1.7 * high);
      });

      // Y unas manchas de sombra sueltas en la carne, para que no sea un plano liso.
      for (let i = 0; i < 22; i++) {
        const x = Math.round(spread(22, i, 83) * CANVAS_WIDTH);
        const y = Math.round(hash(i, 85) * CANVAS_HEIGHT);
        const edge = openingAt(scene.opening, x);
        if (y > edge.top - 30 && y < edge.bottom + 30) continue;
        const r = 6 + Math.round(hash(i, 87) * 10);
        veil(shadow, `${scene.gumRamp}.shade`, x - r, y - r, r * 2, r * 2, (vx, vy) => {
          const d = Math.hypot(vx - x, vy - y) / r;
          return d > 1 ? 0 : Math.round(6 * (1 - d));
        });
      }
      shadow.commit();
    }),

  layout: () => ({ y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT, align: 'left' }),
});
