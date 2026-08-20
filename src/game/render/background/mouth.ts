import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import type { PaletteKey } from '../../data/palette';
import {
  archSlots,
  openingAt,
  toothSizeAt,
  type Opening,
  type ToothSlot,
} from '../../data/opening';
import type { Decay, StageScene } from '../../data/stages';
import { bake, blit, pixelBuffer, px, type PixelBuffer } from '../pixel';
import { BAYER_4, ditherOver } from '../dither';
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

/**
 * Hornea un diente de la arcada, ya con su deterioro.
 *
 * **Se exporta** porque la transición entre fases muerde con estos mismos
 * dientes. Antes tenía los suyos propios —una silueta genérica de esmalte, sin
 * deterioro y del mismo tamaño toda la fila—, así que la mordida no se parecía
 * a la boca en la que estabas: cerrabas los ojos en un quirófano lleno de sarro
 * y te mordía una dentadura sana de catálogo.
 */
export const archTooth = (scene: StageScene, slot: ToothSlot, upper: boolean, variant: number) =>
  toothCanvas(scene, slot, upper, variant);

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

/**
 * El paladar: la bóveda que hay **por encima** de la arcada superior.
 *
 * Esa franja era carne lisa con un degradado, y es la segunda superficie más grande
 * de la pantalla. El paladar tiene tres cosas que lo hacen reconocible, y las tres se
 * dibujan aquí: el **rafe** —la costura que lo recorre por el medio—, las **rugas**
 * —los pliegues transversales, en pares a los lados del rafe— y el punteado glandular
 * del fondo.
 *
 * Las rugas van **cortas y en pares**, no como arcos de lado a lado: a setecientos
 * píxeles de largo por seis de grueso, un pliegue se lee como un cable tendido. Y se
 * juntan y se acortan hacia arriba, que es la perspectiva de la bóveda yéndose al
 * fondo.
 */
const drawPalate = (buf: PixelBuffer, scene: StageScene) => {
  const gum = scene.gumRamp;
  const pale = scene.cheekRamp;
  const cx = Math.round(CANVAS_WIDTH / 2);

  /** Hasta dónde llega la bóveda: el canto de encía en el centro de la pantalla. */
  const centre = openingAt(scene.opening, cx);
  const gumLine = Math.round(centre.top - toothSizeAt(centre.depth).h);
  if (gumLine < 40) return;

  // 1. El paladar es más pálido y menos rojo que la encía —está queratinizado—, y eso
  //    separa las dos superficies sin necesidad de una línea.
  for (let y = 0; y < gumLine; y++) {
    const up = 1 - y / gumLine;
    const level = 13 * up ** 1.2;
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      if (BAYER_4[y & 3][x & 3] < level) buf.set(x, y, `${pale}.dark`);
    }
  }

  // 2. Pliegues anchos y muy suaves que cruzan toda la franja.
  //
  // Van primero y llenan los lados, que con solo las rugas del centro se quedaban
  // vacíos. Son de contraste bajísimo a propósito: aquí lo que se busca es que la
  // carne no sea un plano, no dibujar nada que se mire.
  for (let f = 0; f < 5; f++) {
    const base = Math.round((gumLine * (f + 0.5)) / 5);
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const wave = Math.round(Math.sin(x / 90 + f * 1.7) * 9 + Math.sin(x / 31 + f) * 3);
      for (let k = 0; k < 7; k++) {
        const y = base + wave + k;
        if (y < 0 || y >= gumLine) continue;
        if (BAYER_4[y & 3][x & 3] < 5 - k) buf.set(x, y, `${pale}.shade`);
      }
    }
  }

  /**
   * 3. El rafe: un surco **corto y con cuerpo**, solo en el tramo cercano.
   *
   * De arriba abajo de la bóveda y a dos píxeles era una línea fina y larga, o sea un
   * arañazo —el mismo error que ya costó las rugas, los hilos de saliva y los pliegues
   * de mejilla—. Aquí se queda en el tercio bajo, donde el paladar está cerca y un
   * surco se vería de verdad, y lleva sus dos caras: valle en sombra y un labio
   * iluminado a un lado.
   */
  const rapheFrom = Math.round(gumLine * 0.52);
  const rapheTo = Math.round(gumLine * 0.9);
  for (let y = rapheFrom; y < rapheTo; y++) {
    // Se ensancha al acercarse: la perspectiva del propio surco.
    const t = (y - rapheFrom) / Math.max(1, rapheTo - rapheFrom);
    const half = 1 + Math.round(t * 2);
    for (let d = -half; d <= half; d++) buf.set(cx + d, y, `${pale}.shade`);
    buf.set(cx + half + 1, y, `${gum}.mid`);
  }

  // 4. Las rugas: **muchas, cortas y de poco contraste**, para que se lean como una
  //    superficie corrugada. Nueve pares en vez de seis, la mitad de largas y sin
  //    brillo: lo que las convertía en costillas era la proporción, no el número.
  const ridges = 9;
  for (let i = 0; i < ridges; i++) {
    const t = i / (ridges - 1);
    // Apretadas arriba —al fondo de la bóveda— y separadas junto a los dientes.
    const y = Math.round(12 + t * t * (gumLine - 28));
    const span = Math.round(30 + t * 30);
    const thick = 2 + Math.round(t * 2);

    for (const side of [-1, 1] as const) {
      for (let d = 0; d < span; d++) {
        const u = d / (span - 1);
        const x = cx + side * (7 + d);
        if (x < 0 || x >= CANVAS_WIDTH) continue;
        const rise = Math.round(u * u * (4 + t * 6));
        const taper = Math.max(1, Math.round(thick * (1 - u * u * 0.8)));
        const top = y - rise;
        for (let k = 0; k < taper; k++) buf.set(x, top + k, `${gum}.dark`);
        buf.set(x, top + taper, `${pale}.shade`);
      }
    }
  }

  // 5. Punteado glandular, más denso hacia el fondo de la bóveda.
  for (let i = 0; i < 120; i++) {
    const x = Math.round(spread(120, i, 31) * CANVAS_WIDTH);
    const y = Math.round(hash(i, 33) ** 2 * gumLine);
    if (Math.abs(x - cx) < 4) continue;
    buf.set(x, y, `${pale}.shade`);
  }
};

/**
 * El suelo de la boca: la franja entre la arcada inferior y la lengua.
 *
 * Lo que se ve desde ahí de pie es la carne sublingual, y tiene dos rasgos claros: los
 * **pliegues sublinguales**, que salen del centro hacia los lados, y el **frenillo**,
 * la brida corta que ata la lengua al suelo. Más el charco de saliva del canto, que es
 * lo que cuenta que todo aquello está mojado.
 */
const drawFloorOfMouth = (buf: PixelBuffer, scene: StageScene) => {
  const gum = scene.gumRamp;
  const cx = Math.round(CANVAS_WIDTH / 2);

  const centre = openingAt(scene.opening, cx);
  const from = Math.round(centre.bottom + toothSizeAt(centre.depth).h);
  if (from >= TONGUE_TOP - 8) return;
  const band = TONGUE_TOP - from;

  // 1. Pliegues sublinguales: dos crestas que se abren del centro hacia los lados,
  //    bajando. Con sus dos caras, que es lo único que se lee como relieve.
  for (const side of [-1, 1] as const) {
    const span = Math.round(CANVAS_WIDTH * 0.34);
    for (let d = 0; d < span; d++) {
      const u = d / (span - 1);
      const x = cx + side * (14 + d);
      if (x < 0 || x >= CANVAS_WIDTH) continue;
      const y = Math.round(from + 6 + u * u * (band * 0.55));
      const thick = Math.max(1, Math.round(4 * (1 - u * u)));
      buf.set(x, y, `${gum}.light`);
      for (let k = 1; k <= thick; k++) buf.set(x, y + k, `${gum}.mid`);
      buf.set(x, y + thick + 1, `${gum}.shade`);
    }
  }

  // 2. El frenillo: corto, vertical y centrado, del suelo a la lengua.
  const frenTo = Math.min(TONGUE_TOP, from + Math.round(band * 0.8));
  for (let y = from + 4; y < frenTo; y++) {
    buf.set(cx - 2, y, `${gum}.shade`);
    buf.set(cx - 1, y, `${gum}.light`);
    buf.set(cx, y, `${gum}.mid`);
    buf.set(cx + 1, y, `${gum}.shade`);
  }

  // 3. El charco del canto: la saliva que se acumula donde el suelo toca la lengua.
  for (let i = 0; i < 10; i++) {
    const y = TONGUE_TOP - 1 - i;
    if (y <= from) break;
    const level = Math.round(9 * (1 - i / 10) ** 0.6);
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      if (BAYER_4[y & 3][x & 3] < level) buf.set(x, y, `${gum}.hi`);
    }
  }

  // Y unos destellos sueltos en el charco.
  for (let i = 0; i < 26; i++) {
    const x = Math.round(spread(26, i, 37) * CANVAS_WIDTH);
    const y = TONGUE_TOP - 2 - Math.round(hash(i, 39) * 7);
    if (y <= from) continue;
    buf.set(x, y, 'enamel.hi');
    buf.set(x + 1, y, `${gum}.hi`);
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

/**
 * Lo que se acumula **entre** pieza y pieza.
 *
 * El deterioro estaba todo sobre la cara del diente —placa, sarro, manchas, caries— y
 * ninguno en el hueco interdental, que es justo donde se acumula de verdad y donde un
 * dentista mira primero. Son cuñas cortas y anchas, no rayas: un tramo largo y fino en
 * la junta se lee como una grieta en el esmalte.
 */
const drawInterdental = (ctx: CanvasRenderingContext2D, scene: StageScene, slots: ToothSlot[]) => {
  const load = Math.max(scene.decay.plaque, scene.decay.tartar);
  if (load <= 0.05) return;

  for (const slot of slots) {
    if (!chance(load * 0.7, slot.cx, 91)) continue;
    const edge = openingAt(scene.opening, slot.cx);
    // En la junta con la pieza siguiente, no en su centro.
    const x = slot.x + slot.size.w - 2;
    const w = 3 + Math.round(hash(slot.cx, 93) * 3);

    for (const upper of [true, false]) {
      const from = upper ? Math.round(edge.top) : Math.round(edge.bottom);
      const deep = 4 + Math.round(hash(slot.cx, upper ? 95 : 97) * 9 * load);
      for (let i = 0; i < deep; i++) {
        // Se estrecha al alejarse del canto: una cuña, que es como se deposita.
        const half = Math.max(1, Math.round((w * (1 - i / deep)) / 2));
        const y = upper ? from - 1 - i : from + i;
        px(ctx, x - half, y, half * 2, 1, 'tartarCrust.mid');
        px(ctx, x - half, y, 1, 1, 'tartarCrust.shade');
      }
    }
  }
};

/**
 * La línea de saliva que se queda en el canto de mordida de la arcada inferior.
 *
 * La arcada está clavada a la pantalla, así que el charco también: se hornea, y en vivo
 * solo se le ponen los destellos y las burbujas. Ondula un poco de pieza a pieza —un
 * nivel perfectamente recto sería un listón— y se rompe donde falta un diente.
 */
const drawPool = (ctx: CanvasRenderingContext2D, scene: StageScene) => {
  if (scene.saliva <= 0) return;
  const gum = scene.gumRamp;

  for (let x = 0; x < CANVAS_WIDTH; x++) {
    const edge = openingAt(scene.opening, x);
    const wave = Math.round(Math.sin(x * 0.07) * 1.6 + Math.sin(x * 0.017) * 2.2);
    const y = Math.round(edge.bottom) + wave;
    const thick = 2 + Math.round(scene.saliva * 2);
    px(ctx, x, y, 1, thick, `${gum}.light`);
    px(ctx, x, y, 1, 1, `${gum}.hi`);
  }
};

/**
 * Hasta dónde llega el pulso de la respiración por arriba y por abajo.
 *
 * Se saca aparte para poder comprobarlo sin dibujar, porque es lo único de todo esto
 * que puede hacer daño: el pulso apaga la carne, y si alcanzara la franja de juego
 * (y=210..330) apagaría también al jugador dos veces por ciclo. Un fondo no puede
 * robarle contraste a lo que se controla.
 */
export const breathBands = (opening: Opening) => {
  const centre = openingAt(opening, CANVAS_WIDTH / 2);
  const tooth = toothSizeAt(centre.depth).h;
  return {
    top: Math.round(centre.top - tooth) - 30,
    bottom: Math.round(centre.bottom + tooth) + 30,
  };
};

/**
 * La respiración.
 *
 * Es lo que más le faltaba al marco, y no es un detalle más: una boca **respira**. La
 * carne se aclara y se apaga con un ciclo lento, y las comisuras se cierran un poco al
 * espirar. Sin esto el encuadre estaba correcto pero era una máscara de escayola.
 *
 * Solo en la carne, nunca en la abertura: un velo a pantalla completa apagaría al
 * jugador dos veces por ciclo, y el fondo no puede robarle contraste a lo que se
 * controla.
 */
const drawBreath = (ctx: CanvasRenderingContext2D, scene: StageScene, time: number) => {
  // Cuatro segundos por ciclo: el ritmo de alguien tumbado con la boca abierta.
  const cycle = Math.sin(time * 1.55);
  const level = Math.round(2.5 + cycle * 2.5);
  if (level <= 0) return;

  const { top, bottom } = breathBands(scene.opening);

  // Bandas anchas y un `ditherOver` por banda: lleva patrón, así que cuesta un relleno.
  ditherOver(ctx, 0, 0, CANVAS_WIDTH, Math.max(0, top), `${scene.cheekRamp}.out`, level);
  ditherOver(ctx, 0, bottom, CANVAS_WIDTH, CANVAS_HEIGHT - bottom, `${scene.gumRamp}.shade`, level);
};

/**
 * El brillo húmedo que recorre las arcadas.
 *
 * Un diente mojado no tiene un brillo fijo: tiene un reflejo que se desplaza. Van en
 * tramos **cortos y gruesos** repartidos por el canto de mordida, avanzando despacio; un
 * reflejo largo y de un píxel sería otra vez un arañazo.
 */
const drawSheen = (ctx: CanvasRenderingContext2D, scene: StageScene, time: number) => {
  const tooth = scene.toothRamp;

  for (let i = 0; i < 10; i++) {
    // Cada reflejo con su propia velocidad, para que no desfilen en formación.
    const speed = 14 + hash(i, 101) * 18;
    const x = Math.round((spread(10, i, 103) * CANVAS_WIDTH + time * speed) % CANVAS_WIDTH);
    const edge = openingAt(scene.opening, x);
    const upper = i % 2 === 0;
    const size = toothSizeAt(edge.depth);
    const y = upper
      ? Math.round(edge.top - size.h * 0.45)
      : Math.round(edge.bottom + size.h * 0.35);
    const run = 5 + Math.round(hash(i, 105) * 5);

    px(ctx, x, y, run, 2, `${tooth}.hi`);
    px(ctx, x + 1, y + 2, run - 2, 1, `${tooth}.light`);
  }
};

/**
 * El charco vivo: destellos que corren por él y burbujas que crecen y se van.
 *
 * La línea del charco está horneada —la arcada está clavada a la pantalla, así que el
 * charco también—; esto es lo único que se mueve, y es lo que hace que se lea como
 * líquido en vez de como una franja pintada de claro.
 */
const drawPoolLife = (ctx: CanvasRenderingContext2D, scene: StageScene, time: number) => {
  if (scene.saliva <= 0) return;
  const gum = scene.gumRamp;

  const surfaceAt = (x: number) => {
    const edge = openingAt(scene.opening, x);
    return (
      Math.round(edge.bottom) + Math.round(Math.sin(x * 0.07) * 1.6 + Math.sin(x * 0.017) * 2.2)
    );
  };

  // Destellos deslizándose por la superficie.
  for (let i = 0; i < 8; i++) {
    const x = Math.round(
      (spread(8, i, 107) * CANVAS_WIDTH + time * (9 + hash(i, 109) * 12)) % CANVAS_WIDTH
    );
    px(ctx, x, surfaceAt(x), 4 + Math.round(hash(i, 111) * 4), 1, `${gum}.hi`);
  }

  // Burbujas: nacen, engordan y desaparecen.
  for (let i = 0; i < 16; i++) {
    const life = (time / 2.7 + hash(i, 113)) % 1;
    if (life > 0.72) continue;
    const x = Math.round(spread(16, i, 115) * CANVAS_WIDTH);
    const r = 1 + Math.round((life / 0.72) * 2 * scene.saliva);
    const y = surfaceAt(x) - r;
    px(ctx, x - r, y, r * 2, r + 1, `${gum}.light`);
    px(ctx, x - r + 1, y, r, 1, `${gum}.hi`);
  }
};

/**
 * Espuma en las comisuras.
 *
 * En una boca abierta y aspirada la saliva se bate y se junta en los ángulos. Son
 * cúmulos de burbujas diminutas, y le dan a la esquina algo que mirar: hasta ahora era
 * el único trozo del cuadro completamente vacío.
 */
const drawFoam = (ctx: CanvasRenderingContext2D, scene: StageScene, time: number) => {
  if (scene.saliva <= 0) return;
  const gum = scene.gumRamp;

  for (const side of [0, 1]) {
    for (let i = 0; i < 11; i++) {
      const seed = i + side * 17;
      const drift = Math.sin(time * 0.6 + seed) * 3;
      const near = 16 + spread(11, i, 117) * 54;
      const x = Math.round(side === 0 ? near : CANVAS_WIDTH - near);
      const edge = openingAt(scene.opening, x);
      const y = Math.round(edge.bottom + 6 + hash(seed, 119) * 26 + drift);
      const r = 1 + Math.round(hash(seed, 121) * 2);
      px(ctx, x - r, y - r, r * 2, r * 2, `${gum}.light`);
      px(ctx, x - r, y - r, r, 1, `${gum}.hi`);
    }
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
      // Y las dos bóvedas, en el mismo búfer: van por debajo de los dientes, así que
      // tienen que estar volcadas antes de estamparlos.
      drawPalate(flesh, scene);
      drawFloorOfMouth(flesh, scene);
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

      // 3. Lo que se acumula entre pieza y pieza, el charco del canto inferior, y la
      //    saliva pegada a las caras, todo por delante de los dientes.
      drawInterdental(ctx, scene, slots);
      drawPool(ctx, scene);
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

  /**
   * Lo que hace que el marco esté vivo, y no solo bien dibujado.
   *
   * Va aquí y no en `props` porque todo esto pasa **por delante** de los dientes: el
   * reflejo está en su cara, la espuma en la comisura y la respiración en la carne, y
   * `props` se dibuja detrás del marco justamente para quedar oculto por él.
   *
   * `time` son segundos de simulación, así que al pausar la boca deja de respirar.
   */
  live: (ctx, scene, { time }) => {
    drawBreath(ctx, scene, time);
    drawSheen(ctx, scene, time);
    drawPoolLife(ctx, scene, time);
    drawFoam(ctx, scene, time);
  },
});
