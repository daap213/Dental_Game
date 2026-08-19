import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import { openingAt } from '../../data/opening';
import type { StageScene } from '../../data/stages';
import { bake, px } from '../pixel';
import { ditherOver } from '../dither';
import { chance, hash, spread } from '../noise';
import { registerLayer } from './stack';

/**
 * El instrumental entrando en cuadro, y lo que gotea.
 *
 * Es lo que `fondo_2` pone en primer plano y aquí faltaba: la turbina bajando en
 * diagonal con su fresa tocando un diente, y el espejo sobre su varilla entrando por
 * el otro lado. Enormes, porque están a un palmo de la cámara.
 *
 * Aquí vivían los hilos de saliva de la versión anterior, colgados de una **altura
 * fija** de 108 píxeles. Al cambiar el encuadre se quedaron flotando en medio de la
 * encía, a sesenta píxeles de cualquier diente. Ahora la saliva la dibuja el marco,
 * que es quien sabe dónde está cada pieza, y lo que gotea de aquí cuelga de la curva
 * de la abertura, no de un número.
 *
 * Parallax bajo pero no cero: está dentro de la boca y cerca, así que se desplaza más
 * que la habitación y menos que el suelo.
 */

/** Cada cuántos píxeles de mundo se decide si cae una gota. */
const STRIDE = 220;
/** Lo que tarda una gota en recorrer su caída, en segundos. */
const FALL = 2.8;

/**
 * Dónde apoya la fresa.
 *
 * **Sobre el canto de mordida de la arcada inferior**, sacado de la curva. Con una
 * altura fija quedaba sesenta píxeles por encima del diente más cercano, y una turbina
 * fresando el aire no cuenta nada. Lo comparten el horneado y las chispas para que no
 * puedan discrepar.
 */
const drillTip = (scene: StageScene) => {
  const x = Math.round(CANVAS_WIDTH * 0.4);
  return { x, y: Math.round(openingAt(scene.opening, x).bottom + 3) };
};

/**
 * La turbina: cuerpo de acero con sus anillos, codo y fresa.
 *
 * Entra desde arriba a la izquierda, apuntando al centro de la boca. Va dibujada a lo
 * largo de su eje para que las anillas queden perpendiculares a él y no horizontales,
 * que es lo que la haría parecer una tubería.
 */
const drawDrill = (ctx: CanvasRenderingContext2D, tipX: number, tipY: number) => {
  // Eje: baja hacia la derecha con una pendiente suave.
  const dx = 0.86;
  const dy = 0.51;

  const along = (t: number, off: number) => ({
    x: Math.round(tipX - dx * t - dy * off),
    y: Math.round(tipY - dy * t + dx * off),
  });

  // La fresa: un vástago fino con la punta acanalada.
  for (let t = 0; t < 26; t++) {
    const p = along(t, 0);
    px(ctx, p.x, p.y, 3, 3, t < 9 ? 'metal.light' : 'metal.mid');
  }

  // El cuello, más grueso.
  for (let t = 26; t < 46; t++) {
    for (let off = -5; off <= 5; off++) {
      const p = along(t, off);
      px(ctx, p.x, p.y, 2, 2, off < -2 ? 'metal.light' : off > 3 ? 'metal.out' : 'metal.mid');
    }
  }

  // El cuerpo: ancho, con anillas perpendiculares al eje.
  for (let t = 46; t < 190; t++) {
    const ring = t % 13 < 3;
    for (let off = -20; off <= 20; off++) {
      const p = along(t, off);
      const tone =
        off < -13 ? 'metal.hi' : off < -5 ? 'metal.light' : off > 13 ? 'metal.out' : 'metal.mid';
      px(ctx, p.x, p.y, 2, 2, ring && off > -10 ? 'metal.dark' : tone);
    }
  }

  // Y la manguera que sale por detrás.
  for (let t = 190; t < 240; t++) {
    const wobble = Math.round(Math.sin(t * 0.09) * 5);
    for (let off = -5; off <= 5; off++) {
      const p = along(t, off + wobble);
      px(ctx, p.x, p.y, 2, 2, off < -2 ? 'metal.dark' : 'metal.out');
    }
  }
};

/** El espejo: disco sobre varilla, entrando por el otro lado. */
const drawMirror = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  // Varilla, hacia el borde derecho.
  for (let t = 0; t < 320; t++) {
    const x = cx + Math.round(t * 0.97);
    const y = cy + Math.round(t * 0.22);
    if (x > CANVAS_WIDTH + 4) break;
    px(ctx, x, y, 3, 6, 'metal.mid');
    px(ctx, x, y, 3, 2, 'metal.light');
    px(ctx, x, y + 5, 3, 1, 'metal.out');
  }

  // El disco, con su marco y el reflejo en diagonal.
  const r = 27;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    px(ctx, cx - half, cy + dy, half * 2, 1, 'metal.dark');
  }
  for (let dy = -r + 3; dy <= r - 3; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, (r - 3) * (r - 3) - dy * dy)));
    for (let x = cx - half; x < cx + half; x++) {
      // Bandas diagonales: es lo que se lee como un espejo y no como un plato.
      const band = ((x - cx + (dy + r) * 2) >> 2) % 4;
      px(ctx, x, cy + dy, 1, 1, band === 0 ? 'enamel.hi' : band === 1 ? 'clinic.light' : 'clinic.mid');
    }
  }
};

export const propsLayer = registerLayer({
  id: 'props',
  parallax: 0.12,

  /** Lo fijo: el instrumental y el vaho. Las chispas y las gotas van en `live`. */
  bake: (scene: StageScene) =>
    bake(`bg:${scene.id}:props`, CANVAS_WIDTH, CANVAS_HEIGHT, (ctx) => {
      const cy = scene.opening.cy;

      // La turbina solo en las fases en las que el dentista está fresando.
      if (scene.instrument === 'drill' || scene.instrument === 'scaler') {
        const tip = drillTip(scene);
        drawDrill(ctx, tip.x, tip.y);
      }
      // El espejo, cuando la abertura da para verlo.
      if (scene.throughOpening !== 'gap') {
        drawMirror(ctx, Math.round(CANVAS_WIDTH * 0.68), Math.round(cy - 8));
      }

      // Vaho: neblina cálida alrededor de la abertura.
      if (scene.steam > 0) {
        for (let b = 0; b < 6; b++) {
          const y = Math.round(cy - 90 + b * 30);
          ditherOver(ctx, 0, y, CANVAS_WIDTH, 30, 'glare.light', Math.round(4 * scene.steam));
        }
      }
    }),

  layout: () => ({ y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT, align: 'left' }),

  /**
   * Lo que se mueve: las gotas que caen de la arcada y las chispas de la fresa.
   *
   * Con el reloj de **simulación**, así que se congela con la pausa. Y las gotas
   * cuelgan de la curva de la abertura, no de una altura fija: es lo que se rompió al
   * cambiar el encuadre la vez anterior.
   */
  live: (ctx, scene, { time, world }) => {
    if (scene.saliva > 0) {
      const first = Math.floor(world / STRIDE) - 1;
      const last = Math.ceil((world + CANVAS_WIDTH) / STRIDE) + 1;

      for (let i = first; i <= last; i++) {
        if (!chance(scene.saliva * 0.4, i, 71)) continue;
        const x = Math.round(i * STRIDE + hash(i, 72) * (STRIDE - 20) - world);
        if (x < 0 || x > CANVAS_WIDTH) continue;

        const from = openingAt(scene.opening, x).top;
        const phase = (time / FALL + hash(i, 73)) % 1;
        if (phase > 0.78) continue;

        const fall = phase / 0.78;
        const y = Math.round(from + 14 + fall * fall * 120);
        const size = fall > 0.75 ? 1 : 2;
        px(ctx, x, y, size, size + 1, `${scene.gumRamp}.light`);
        px(ctx, x, y - 1, 1, 1, `${scene.gumRamp}.hi`);
      }
    }

    // Chispas donde la fresa toca el diente: lo que hace que la turbina esté
    // trabajando y no apoyada.
    if (scene.instrument === 'drill' || scene.instrument === 'scaler') {
      const { x: tipX, y: tipY } = drillTip(scene);
      for (let i = 0; i < 7; i++) {
        const phase = (time * 3 + spread(7, i, 91)) % 1;
        const reach = phase * 26;
        const angle = (spread(7, i, 93) - 0.5) * 2.4;
        const x = Math.round(tipX + Math.cos(angle) * reach);
        const y = Math.round(tipY + Math.sin(angle) * reach + phase * phase * 14);
        px(ctx, x, y, 2, 2, phase < 0.5 ? 'glare.hi' : 'warden.light');
      }
    }
  },
});
