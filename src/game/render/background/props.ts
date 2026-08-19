import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import { openingAt, toothSizeAt } from '../../data/opening';
import type { StageScene } from '../../data/stages';
import { bake, blit, px } from '../pixel';
import { ditherOver } from '../dither';
import { chance, hash, spread } from '../noise';
import {
  REACH,
  TOOLS,
  TOOL_H,
  TOOL_W,
  toolAxisY,
  toolCanvas,
  toolsForStage,
  type ToolEntry,
} from './tools';
import { CLINIC_FLOOR, CLINIC_HOSE_Y, CLINIC_UNIT_X } from './clinic';
import { registerLayer } from './stack';

/**
 * El instrumental en cuadro y la saliva, ambos **en movimiento**.
 *
 * Antes había dos piezas horneadas y quietas: una turbina y un espejo, cosidas a mano
 * con sus posiciones escritas en el sitio. Ahora el instrumental sale del catálogo de
 * `tools.ts` —hasta tres piezas por fase, elegidas según lo que se esté haciendo en
 * esa boca— y **se mueve**: la sonda entra y sale, el espejo barre en arco, la turbina
 * vibra echando chispas y la aspiración flota goteando.
 *
 * Las piezas se hornean una vez y se estampan desplazadas en cada frame, así que
 * moverlas no cuesta nada: son tres `drawImage`. Lo único que se dibuja píxel a píxel
 * son las chispas y las gotas, que son unas decenas.
 *
 * Todo con el reloj de **simulación**: al pausar, el instrumental se queda quieto.
 */

/** Cada cuántos píxeles de mundo se decide si hay un hilo de saliva. */
const STRIDE = 150;
/** Lo que tarda un hilo en estirarse hasta romperse, en segundos. */
const STRETCH = 4.4;
/** Lo que tarda un hilo puente en tensarse y romperse. */
const BRIDGE = 6.8;
/** Lo que tarda una gota suelta en caer. */
const FALL = 2.4;

/** Cuánto se mueve cada instrumento, según su clase de movimiento. */
const toolOffset = (entry: ToolEntry, time: number) => {
  const tool = TOOLS[entry.id];
  const t = time * 0.7 + entry.phase * 6.283;

  switch (tool.motion) {
    case 'probe':
      // Entra y sale a lo largo de su eje. Un solo seno: es trabajo, no un saludo.
      // La inclinación **deriva** en vez de quedarse en la del medio: horneada plana,
      // una sonda es un tubo horizontal, y un tubo horizontal en una escena de
      // plataformas se lee como plataforma. Inclinada, se lee como acero entrando.
      return {
        dx: Math.round(Math.sin(t) * 26),
        dy: Math.round(Math.sin(t * 0.6) * 5),
        tilt: Math.sin(t * 0.31 + entry.phase * 3) > 0 ? 2 : 0,
      };
    case 'vibrate': {
      // Vibración corta y rápida, más el avance lento de quien está fresando.
      const buzz = Math.round(Math.sin(time * 34 + entry.phase * 9) * 2);
      return { dx: Math.round(Math.sin(t * 0.5) * 12) + buzz, dy: buzz, tilt: 1 };
    }
    case 'sweep': {
      // Barrido en arco: se mueve y **cambia de inclinación**, que es lo que lo
      // convierte en un gesto en vez de un deslizamiento.
      const s = Math.sin(t * 0.8);
      return { dx: Math.round(s * 30), dy: Math.round(Math.cos(t * 0.8) * 22), tilt: s > 0.35 ? 2 : s < -0.35 ? 0 : 1 };
    }
    default:
      return { dx: Math.round(Math.sin(t * 0.45) * 10), dy: Math.round(Math.sin(t * 0.7) * 14), tilt: 1 };
  }
};

/**
 * Dónde se estampa el lienzo de un instrumento, y dónde acaba su punta.
 *
 * En el lienzo la **punta está a la izquierda** y el mango sale por la derecha. Un
 * instrumento que entra por el borde izquierdo tiene que apuntar hacia dentro, o sea a
 * la derecha, así que se **espeja**; el que entra por la derecha va tal cual. El primer
 * intento colocaba el lienzo por el borde sin espejar, y lo único que asomaba en
 * pantalla era el mango: la punta quedaba a ciento cincuenta píxeles fuera.
 *
 * La altura sale de la **abertura** de la fase (`toolAxisY`), no de una fracción de
 * pantalla: lo que tiene que asomar tiene que asomar por donde la boca está abierta.
 */
const placeTool = (scene: StageScene, entry: ToolEntry, dx: number, dy: number) => {
  const y = toolAxisY(scene.opening, entry, dx) + dy;
  const baseY = y - Math.round(TOOL_H / 2);

  if (entry.side === 'left') {
    const tipX = REACH + dx;
    // Espejado, la punta del lienzo cae al final del rectángulo de destino.
    return { tipX, tipY: y, baseX: tipX - TOOL_W + 5, baseY, flip: true };
  }
  const tipX = CANVAS_WIDTH - REACH - dx;
  return { tipX, tipY: y, baseX: tipX - 4, baseY, flip: false };
};

/** Chispas donde la punta muerde el esmalte. */
const drawSparks = (
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  time: number,
  seed: number
) => {
  for (let i = 0; i < 9; i++) {
    const phase = (time * 3.4 + spread(9, i, 91 + seed)) % 1;
    const reach = phase * 30;
    const angle = (spread(9, i, 93 + seed) - 0.5) * 2.6;
    const x = Math.round(tipX + Math.cos(angle) * reach);
    const y = Math.round(tipY + Math.sin(angle) * reach + phase * phase * 18);
    px(ctx, x, y, phase < 0.4 ? 2 : 1, phase < 0.4 ? 2 : 1, phase < 0.5 ? 'glare.hi' : 'warden.light');
  }
};

/**
 * Un hilo de saliva que se estira hasta romperse.
 *
 * Es lo que le faltaba a la saliva para estar viva: antes eran hilos horneados,
 * quietos, más gotas cayendo por su cuenta. Un hilo de verdad se alarga, se adelgaza,
 * se parte y suelta la gota. El ciclo entero cabe en una fase de 0 a 1.
 */
const drawStrand = (
  ctx: CanvasRenderingContext2D,
  scene: StageScene,
  x: number,
  from: number,
  phase: number,
  seed: number
) => {
  const gum = scene.gumRamp;
  // Se estira durante cuatro quintos del ciclo y el último queda para la caída.
  const stretching = Math.min(1, phase / 0.8);
  const len = Math.round(10 + stretching * (26 + hash(seed, 51) * 34) * scene.saliva);

  for (let i = 0; i < len; i++) {
    const t = i / len;
    const sway = Math.round(Math.sin(t * 2.4 + seed) * 2);
    // Grueso arriba y de un píxel al final: cuanto más estirado, más fino.
    const thick = t < 0.5 - stretching * 0.3 ? 2 : 1;
    px(ctx, x + sway, from + i, thick, 1, `${gum}.light`);
    px(ctx, x + sway, from + i, 1, 1, `${gum}.hi`);
  }

  const endSway = Math.round(Math.sin(2.4 + seed) * 2);
  if (phase < 0.8) {
    // La gota engorda en la punta antes de soltarse.
    const r = 1 + Math.round(stretching * 2);
    px(ctx, x + endSway - r, from + len, r * 2, r * 2 + 1, `${gum}.light`);
    px(ctx, x + endSway - r + 1, from + len + 1, 1, 2, `${gum}.hi`);
  } else {
    // Y cae, acelerando.
    const fall = (phase - 0.8) / 0.2;
    const y = from + len + Math.round(fall * fall * 120);
    px(ctx, x + endSway - 1, y, 2, 3, `${gum}.light`);
    px(ctx, x + endSway - 1, y - 1, 1, 1, `${gum}.hi`);
  }
};

/**
 * El hilo que puentea las dos arcadas.
 *
 * Es la imagen que define una boca abierta y mantenida abierta: un hilo tenso entre el
 * canto de arriba y el de abajo, colgando en catenaria, que se afina y se rompe. Los
 * otros hilos cuelgan y caen; este **une**, y por eso se lee distinto.
 *
 * Nace detrás del marco a propósito: sus dos extremos quedan tapados por los dientes,
 * que es exactamente donde están pegados.
 */
const drawBridge = (
  ctx: CanvasRenderingContext2D,
  scene: StageScene,
  x: number,
  phase: number,
  seed: number
) => {
  const gum = scene.gumRamp;
  const edge = openingAt(scene.opening, x);
  const top = Math.round(edge.top) - 6;
  const bottom = Math.round(edge.bottom) + 6;
  const span = bottom - top;
  if (span < 24) return;

  // Se tensa durante tres cuartos del ciclo; en el último se rompe y los dos cabos se
  // recogen hacia su arcada.
  const taut = Math.min(1, phase / 0.75);
  const snapped = phase > 0.75 ? (phase - 0.75) / 0.25 : 0;
  // La panza se va perdiendo al tensarse: eso es lo que se lee como tirón. El signo
  // sale de la semilla, para que unos se arqueen a un lado y otros al otro.
  const bow = (Math.sin(seed) > 0 ? 1 : -1) * (4 + (1 - taut) * 15);

  for (let i = 0; i <= span; i++) {
    const t = i / span;
    // En cuanto se rompe, el centro deja de existir y el hueco crece.
    if (snapped > 0 && Math.abs(t - 0.5) < snapped * 0.5) continue;
    const belly = Math.sin(t * Math.PI);
    const cx = Math.round(x + bow * belly);
    const thick = belly > 0.55 && taut < 0.7 ? 2 : 1;
    px(ctx, cx, top + i, thick, 1, `${gum}.light`);
    if (belly > 0.3) px(ctx, cx, top + i, 1, 1, `${gum}.hi`);
  }

  // La gota que baja por el hilo, que es lo que delata que es líquido.
  if (snapped === 0) {
    const t = 0.2 + ((phase * 1.7) % 0.6);
    const y = top + Math.round(t * span);
    const cx = Math.round(x + bow * Math.sin(t * Math.PI));
    px(ctx, cx - 1, y, 3, 4, `${gum}.light`);
    px(ctx, cx, y + 1, 1, 2, `${gum}.hi`);
  }
};

/** El espray de agua de la turbina, donde la fresa muerde. */
const drawSpray = (
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  time: number,
  seed: number
) => {
  for (let i = 0; i < 14; i++) {
    const phase = (time * 2.1 + spread(14, i, 131 + seed)) % 1;
    // Cono abierto hacia delante y cayendo: agua pulverizada, no chispas.
    const angle = (spread(14, i, 133 + seed) - 0.5) * 1.5;
    const reach = phase * 46;
    const x = Math.round(tipX - Math.cos(angle) * reach * 0.5);
    const y = Math.round(tipY + Math.sin(angle) * reach * 0.6 + phase * phase * 34);
    px(ctx, x, y, phase < 0.35 ? 2 : 1, 1, phase < 0.5 ? 'glare.light' : 'clinic.light');
  }
};

/**
 * Lo que se mueve en el quirófano.
 *
 * Allí no entra instrumental por los bordes —ya estamos fuera de la boca, y un vástago
 * cruzando la sala se solapaba con el sillón y el visor—: lo que se mueve es lo que la
 * sala tiene. Las tres mangueras de la unidad se balancean con sus instrumentos
 * colgados, cae una gota en la escupidera, y hay motas de polvo flotando en los conos
 * de los plafones. Las motas son el detalle que más rinde: una sala con polvo en la luz
 * se lee como aire, y sin ellas la luz es una mancha pintada.
 */
const drawTheatreLife = (ctx: CanvasRenderingContext2D, time: number) => {
  // --- Las mangueras y sus instrumentos ---
  for (let h = 0; h < 3; h++) {
    const hx = CLINIC_UNIT_X - 20 + h * 18;
    const drop = 44 + h * 12;
    // Cada una con su propio compás y su propia amplitud: a la vez sería una cortina.
    const sway = Math.sin(time * (0.5 + h * 0.13) + h * 2.1) * (3 + h * 1.6);

    for (let i = 0; i < drop; i++) {
      const t = i / drop;
      // El balanceo crece hacia abajo: arriba está enganchada y no se mueve.
      const bulge = Math.round(Math.sin(t * Math.PI) * (6 + h * 3) + sway * t * t);
      // Cinco de grueso y con su canto claro: a tres píxeles de un solo tono oscuro
      // una manguera no se lee como tubo, se lee como un arañazo en la pared. Un detalle
      // largo y fino necesita dos caras, y esa es su cara iluminada.
      px(ctx, hx + bulge, CLINIC_HOSE_Y + i, 5, 1, 'clinic.out');
      px(ctx, hx + bulge, CLINIC_HOSE_Y + i, 2, 1, 'clinic.mid');
    }

    const ex = hx + Math.round(sway);
    const ey = CLINIC_HOSE_Y + drop;
    px(ctx, ex - 2, ey, 7, 26, 'metal.mid');
    px(ctx, ex - 2, ey, 2, 26, 'metal.light');
    px(ctx, ex - 1, ey + 26, 4, 8, 'metal.hi');
  }

  // --- La gota que cae en la escupidera ---
  const spitX = Math.round(CANVAS_WIDTH * 0.46);
  const dripPhase = (time / 2.6) % 1;
  if (dripPhase < 0.55) {
    const y = CLINIC_FLOOR - 130 + Math.round((dripPhase / 0.55) ** 2 * 20);
    px(ctx, spitX + 12, y, 2, 3, 'clinic.hi');
  }

  // --- Motas de polvo en los conos de los plafones ---
  for (const lx of [Math.round(CANVAS_WIDTH * 0.24), Math.round(CANVAS_WIDTH * 0.8)]) {
    for (let i = 0; i < 16; i++) {
      // Bajan despacio y reaparecen arriba: una deriva, no una lluvia.
      const life = (time * 0.055 + hash(i, 91)) % 1;
      const y = Math.round(26 + life * 150);
      // El cono se abre al bajar, así que la mota se reparte en un ancho creciente.
      const half = 46 + Math.round(life * 60);
      const x = lx + Math.round((spread(16, i, 93) * 2 - 1) * half);
      px(ctx, x, y, 1, 1, life < 0.5 ? 'glare.hi' : 'glare.light');
    }
  }
};

export const propsLayer = registerLayer({
  id: 'props',
  parallax: 0.12,

  /** Lo único horneado es el vaho: el resto se mueve. */
  bake: (scene: StageScene) =>
    bake(`bg:${scene.id}:props`, CANVAS_WIDTH, CANVAS_HEIGHT, (ctx) => {
      if (scene.steam <= 0) return;
      const cy = scene.opening.cy;
      for (let b = 0; b < 7; b++) {
        const y = Math.round(cy - 100 + b * 30);
        ditherOver(ctx, 0, y, CANVAS_WIDTH, 30, 'glare.light', Math.round(4 * scene.steam));
      }
    }),

  layout: () => ({ y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT, align: 'left' }),

  live: (ctx, scene, { time, world }) => {
    // El quirófano tiene su propia vida y no lleva instrumental por los bordes.
    if (scene.zone === 'clinic') {
      drawTheatreLife(ctx, time);
      return;
    }

    // --- Instrumental ---
    const entries = toolsForStage(scene.instrument, 1);
    entries.forEach((entry, i) => {
      const tool = TOOLS[entry.id];
      const { dx, dy, tilt } = toolOffset(entry, time);
      const { tipX, tipY, baseX, baseY, flip } = placeTool(scene, entry, dx, dy);
      const tiltIndex = tool.tilts > 1 ? Math.min(tool.tilts - 1, tilt) : 0;

      blit(ctx, toolCanvas(entry.id, tiltIndex), baseX, baseY, TOOL_W, TOOL_H, flip);

      if (tool.sparks) drawSparks(ctx, tipX, tipY, time, i * 7);
      if (tool.spray) drawSpray(ctx, tipX, tipY, time, i * 5);

      if (tool.drips) {
        // Una gota que se descuelga de la punta cada pocos segundos.
        const phase = (time / 1.9 + entry.phase) % 1;
        if (phase < 0.7) {
          const y = Math.round(tipY + 6 + phase * phase * 90);
          px(ctx, tipX, y, 2, 3, `${scene.gumRamp}.light`);
          px(ctx, tipX, y - 1, 1, 1, 'enamel.hi');
        }
      }
    });

    // --- Saliva ---
    if (scene.saliva <= 0) return;

    const first = Math.floor(world / STRIDE) - 1;
    const last = Math.ceil((world + CANVAS_WIDTH) / STRIDE) + 1;

    for (let i = first; i <= last; i++) {
      const x = Math.round(i * STRIDE + hash(i, 72) * (STRIDE - 20) - world);
      if (x < 0 || x > CANVAS_WIDTH) continue;
      // Cuelga del **borde de mordida**, no de la línea de encía: ahora que el marco
      // se dibuja por delante, todo lo que nazca por encima de los dientes queda detrás
      // de carne opaca y no se ve. Y de un diente es de donde cuelga de verdad.
      const edge = openingAt(scene.opening, x);
      const from = Math.round(edge.top + toothSizeAt(edge.depth).h);

      // Hilos que se estiran y se rompen.
      if (chance(scene.saliva * 0.45, i, 71)) {
        drawStrand(ctx, scene, x, from, (time / STRETCH + hash(i, 73)) % 1, i);
      }

      // Y de vez en cuando uno que llega hasta la arcada de abajo y las puentea.
      // Uno de cada dos huecos como mucho: es el único añadido con cientos de píxeles
      // por frame, y con tres a la vez en pantalla ya no se lee ninguno.
      if (i % 2 === 0 && chance(scene.saliva * 0.34, i, 79)) {
        drawBridge(ctx, scene, x + 7, (time / BRIDGE + hash(i, 81)) % 1, i);
      }

      // Y gotas sueltas, sin hilo, que caen del canto.
      if (chance(scene.saliva * 0.3, i, 75)) {
        const phase = (time / FALL + hash(i, 77)) % 1;
        if (phase < 0.8) {
          const fall = phase / 0.8;
          const y = Math.round(from + 10 + fall * fall * 130);
          const size = fall > 0.78 ? 1 : 2;
          px(ctx, x + 9, y, size, size + 1, `${scene.gumRamp}.light`);
          px(ctx, x + 9, y - 1, 1, 1, `${scene.gumRamp}.hi`);
        }
      }
    }

    // Las burbujas del charco ya no están aquí: se han ido a `mouth.ts`, que es donde
    // está el charco. Dibujadas en esta capa quedaban detrás del marco, o flotando en
    // el hueco a una altura de diente por encima de la línea que debían romper.
  },
});
