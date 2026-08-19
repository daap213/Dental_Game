import type { PaletteKey } from '../../data/palette';
import { CANVAS_WIDTH } from '../../data/physics';
import { openingAt, type Opening } from '../../data/opening';
import { bake, px } from '../pixel';
import { hash } from '../noise';

/**
 * El instrumental que entra en cuadro.
 *
 * Antes había dos piezas cosidas a mano dentro de `props.ts` —una turbina y un
 * espejo— con sus posiciones escritas en el sitio. Esto es un catálogo: seis
 * instrumentos, cada uno con su silueta y con **cómo se mueve**, y la fase elige
 * cuáles entran y por dónde.
 *
 * Todos se dibujan **a lo largo de un eje horizontal**, con la punta a la izquierda y
 * el mango saliendo por la derecha, en un lienzo de `TOOL_W × TOOL_H`. Eso permite
 * hornear cada uno una sola vez y estamparlo moviéndose: girarlos de verdad en cada
 * frame sería carísimo y además destroza el pixel art, así que los que necesitan
 * ángulo se hornean en tres inclinaciones y se elige una.
 */

export const TOOL_W = 300;
export const TOOL_H = 96;
/** El eje: por aquí pasa el centro del vástago. */
const AXIS = Math.round(TOOL_H / 2);

export type ToolId = 'mirror' | 'explorer' | 'scaler' | 'handpiece' | 'syringe' | 'suction';

/** Cómo se mueve cada instrumento. */
export type ToolMotion =
  /** Entra y sale despacio a lo largo de su eje: alguien trabajando. */
  | 'probe'
  /** Vibra en el sitio, con chispas. La turbina. */
  | 'vibrate'
  /** Barre en arco, como quien revisa. */
  | 'sweep'
  /** Sube y baja flotando, sin prisa. */
  | 'bob';

export interface Tool {
  id: ToolId;
  motion: ToolMotion;
  /** Cuántas inclinaciones se hornean. 1 significa que no gira. */
  tilts: number;
  /** Si deja chispas donde toca. */
  sparks: boolean;
  /** Si pulveriza agua donde muerde: la turbina sí. */
  spray?: boolean;
  /** Si gotea: la aspiración y la jeringa sí. */
  drips: boolean;
}

export const TOOLS: Record<ToolId, Tool> = {
  mirror: { id: 'mirror', motion: 'sweep', tilts: 3, sparks: false, drips: false },
  explorer: { id: 'explorer', motion: 'probe', tilts: 3, sparks: false, drips: false },
  scaler: { id: 'scaler', motion: 'probe', tilts: 3, sparks: true, drips: false },
  handpiece: { id: 'handpiece', motion: 'vibrate', tilts: 1, sparks: true, drips: false, spray: true },
  syringe: { id: 'syringe', motion: 'probe', tilts: 1, sparks: false, drips: true },
  suction: { id: 'suction', motion: 'bob', tilts: 1, sparks: false, drips: true },
};

/** El vástago común: acero con su brillo arriba y su sombra abajo. */
const shaft = (
  ctx: CanvasRenderingContext2D,
  from: number,
  to: number,
  half: number,
  tilt: number
) => {
  for (let x = from; x < to; x++) {
    const y = AXIS + Math.round((x - from) * tilt);
    for (let d = -half; d <= half; d++) {
      const tone: PaletteKey =
        d < -half + 1 ? 'metal.hi' : d < 0 ? 'metal.light' : d > half - 1 ? 'metal.out' : 'metal.mid';
      px(ctx, x, y + d, 1, 1, tone);
    }
  }
};

/**
 * El mango, con su collar y su estriado.
 *
 * El estriado va **fino**: a tres píxeles cada once, el mango se leía como una escalera
 * de mano. Un moleteado de verdad son rayas de un píxel muy juntas, y sobre todo no
 * ocupa el mango entero. Y el **collar** —el anillo grueso donde el mango se une al
 * vástago— es lo que de un tubo hace un instrumento.
 */
const grip = (ctx: CanvasRenderingContext2D, from: number, tilt: number) => {
  const collar = 10;

  for (let x = from; x < TOOL_W; x++) {
    const y = AXIS + Math.round((x - from) * tilt);
    const inCollar = x < from + collar;
    const half = inCollar ? 11 : 9;
    // El moleteado solo en el tramo de agarre, no hasta el final.
    const knurled = !inCollar && x < from + 96 && x % 4 === 0;

    for (let d = -half; d <= half; d++) {
      const tone: PaletteKey =
        d < -half + 3 ? 'metal.light' : d > half - 3 ? 'metal.out' : 'metal.mid';
      px(ctx, x, y + d, 1, 1, knurled && d > -half + 2 && d < half - 2 ? 'metal.dark' : tone);
    }
    if (inCollar) px(ctx, x, y - half, 1, 2, 'metal.hi');
  }
};

/** La manguera que sale por detrás de los instrumentos rotatorios. */
const hose = (ctx: CanvasRenderingContext2D, from: number, tilt: number) => {
  for (let x = from; x < TOOL_W; x++) {
    const y = AXIS + Math.round((x - from) * tilt) + Math.round(Math.sin(x * 0.08) * 6);
    px(ctx, x, y - 5, 1, 11, 'metal.out');
    px(ctx, x, y - 5, 1, 2, 'metal.dark');
  }
};

const drawTool = (ctx: CanvasRenderingContext2D, id: ToolId, tilt: number) => {
  switch (id) {
    case 'mirror': {
      // Disco sobre varilla, con el reflejo en bandas diagonales: es lo que se lee
      // como espejo y no como un plato.
      shaft(ctx, 44, TOOL_W, 3, tilt);
      grip(ctx, 150, tilt);
      const r = 30;
      const cx = 40;
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
        px(ctx, cx - half, AXIS + dy, half * 2, 1, 'metal.dark');
      }
      for (let dy = -r + 3; dy <= r - 3; dy++) {
        const half = Math.round(Math.sqrt(Math.max(0, (r - 3) * (r - 3) - dy * dy)));
        for (let x = cx - half; x < cx + half; x++) {
          const band = ((x - cx + (dy + r) * 2) >> 2) % 4;
          px(
            ctx,
            x,
            AXIS + dy,
            1,
            1,
            band === 0 ? 'enamel.hi' : band === 1 ? 'clinic.light' : 'clinic.mid'
          );
        }
      }
      break;
    }

    case 'explorer': {
      // Sonda: punta finísima doblada en gancho.
      shaft(ctx, 26, TOOL_W, 3, tilt);
      grip(ctx, 120, tilt);
      for (let i = 0; i < 22; i++) {
        const t = i / 21;
        px(ctx, 26 - i, AXIS - Math.round(t * t * 16), 3, 3, 'metal.light');
      }
      px(ctx, 4, AXIS - 16, 3, 3, 'metal.hi');
      break;
    }

    case 'scaler': {
      // Cureta: hoja curva y ancha para arrancar sarro.
      shaft(ctx, 34, TOOL_W, 3, tilt);
      grip(ctx, 130, tilt);
      for (let i = 0; i < 30; i++) {
        const t = i / 29;
        const y = AXIS - Math.round(t * t * 20);
        const thick = Math.max(2, Math.round(5 * (1 - t * 0.6)));
        px(ctx, 34 - i, y, thick, thick, i < 8 ? 'metal.hi' : 'metal.light');
        px(ctx, 34 - i, y + thick, thick, 1, 'metal.dark');
      }
      break;
    }

    case 'handpiece': {
      // Turbina: cabeza acodada, cuerpo gordo con anillas y manguera.
      hose(ctx, 210, tilt);
      grip(ctx, 120, tilt);
      // Cuerpo, más ancho que un mango normal.
      for (let x = 54; x < 130; x++) {
        const y = AXIS + Math.round((x - 54) * tilt);
        for (let d = -15; d <= 15; d++) {
          const ring = x % 14 < 3;
          const tone: PaletteKey =
            d < -10 ? 'metal.hi' : d < -3 ? 'metal.light' : d > 11 ? 'metal.out' : 'metal.mid';
          px(ctx, x, y + d, 1, 1, ring && d > -8 ? 'metal.dark' : tone);
        }
      }
      // Cabeza acodada y la fresa.
      for (let d = -13; d <= 13; d++) px(ctx, 34, AXIS + d, 22, 1, d < -8 ? 'metal.light' : 'metal.mid');
      px(ctx, 34, AXIS - 13, 22, 2, 'metal.hi');
      for (let i = 0; i < 30; i++) {
        px(ctx, 32 - i, AXIS - 2, 2, 4, i < 10 ? 'enamel.light' : 'metal.light');
        if (i % 4 === 0) px(ctx, 32 - i, AXIS - 2, 2, 1, 'metal.out');
      }
      break;
    }

    case 'syringe': {
      // Jeringa: cuerpo con anilla, émbolo y aguja larguísima.
      grip(ctx, 150, tilt);
      for (let x = 60; x < 150; x++) {
        const y = AXIS + Math.round((x - 60) * tilt);
        for (let d = -12; d <= 12; d++) {
          const tone: PaletteKey =
            d < -8 ? 'metal.hi' : d < -2 ? 'metal.light' : d > 9 ? 'metal.out' : 'metal.mid';
          px(ctx, x, y + d, 1, 1, tone);
        }
      }
      // Anilla del pulgar.
      for (let a = 0; a < 40; a++) {
        const th = (a / 40) * Math.PI * 2;
        px(ctx, 168 + Math.round(Math.cos(th) * 15), AXIS + Math.round(Math.sin(th) * 15), 3, 3, 'metal.dark');
      }
      // La aguja.
      for (let i = 0; i < 58; i++) px(ctx, 58 - i, AXIS - 1, 2, 2, i > 50 ? 'metal.hi' : 'metal.light');
      break;
    }

    case 'suction': {
      // Cánula de aspiración: tubo ancho de plástico con la boca abierta y su
      // corrugado. Es lo único que no es de acero, así que va en otra rampa.
      for (let x = 30; x < TOOL_W; x++) {
        const y = AXIS + Math.round((x - 30) * tilt);
        const corrugated = x > 150 && x % 9 < 3;
        for (let d = -12; d <= 12; d++) {
          const tone: PaletteKey =
            d < -8 ? 'clinic.hi' : d < -2 ? 'clinic.light' : d > 9 ? 'clinic.shade' : 'clinic.mid';
          px(ctx, x, y + d, 1, 1, corrugated && d > -6 ? 'clinic.dark' : tone);
        }
      }
      // La boca, abierta y en sombra por dentro.
      for (let i = 0; i < 30; i++) {
        const half = Math.round(12 + (i / 29) * 5);
        px(ctx, 30 - i, AXIS - half, 1, half * 2, i < 4 ? 'clinic.out' : 'clinic.shade');
      }
      px(ctx, 0, AXIS - 17, 3, 34, 'clinic.out');
      break;
    }
  }
};

/**
 * Hornea un instrumento en una inclinación.
 *
 * `tilt` es la pendiente del eje, no un ángulo: multiplicando la x por él se obtiene
 * la y, así que la silueta se dibuja ya inclinada en lugar de rotarse después. Rotar
 * un mapa de bits a un ángulo libre deja el pixel art hecho un serrucho.
 */
export const toolCanvas = (id: ToolId, tiltIndex: number) => {
  const tool = TOOLS[id];
  const spread = tool.tilts > 1 ? (tiltIndex / (tool.tilts - 1)) * 2 - 1 : 0;
  const tilt = spread * 0.22;
  return bake(`tool:${id}:${tiltIndex}`, TOOL_W, TOOL_H, (ctx) => drawTool(ctx, id, tilt));
};

/** Dónde está la punta dentro del lienzo, para saber dónde nacen chispas y gotas. */
export const TOOL_TIP = { x: 4, y: AXIS };

/**
 * Qué instrumental entra en cada fase, y por dónde.
 *
 * Tres piezas por fase como mucho: son enormes y en primer plano, y con más la boca
 * deja de verse. La lista se elige a mano por fase porque cuenta algo —en la fase del
 * sarro se raspa, en la infectada se fresa y se aspira— y eso no sale de una tabla
 * genérica.
 */
export interface ToolEntry {
  id: ToolId;
  /** Por qué lado entra. La punta apunta siempre hacia dentro. */
  side: 'left' | 'right';
  /**
   * Por dónde pasa su eje, en fracción **de la abertura**: 0 es el canto de la encía
   * superior y 1 el de la inferior.
   *
   * No es una fracción de pantalla, y la diferencia importa. Medido en pantalla, el
   * primer intento los puso por encima de la arcada para que el vástago no se leyera
   * como plataforma, y ahí quedaban dibujados sobre la encía: un instrumento
   * incrustado en la carne, que desde dentro de una boca no se puede ver. Medido
   * contra la abertura, cada fase lo coloca donde su lente esté abierta.
   *
   * Y tiene que caer en la franja **visible** de la abertura, no en cualquier punto de
   * ella: la arcada ocupa una altura de diente por arriba y otra por abajo, así que un
   * eje a 0.15 o a 0.85 queda detrás de los dientes y no asoma nada.
   * `tools.test.ts` lo comprueba con el margen del movimiento incluido.
   */
  lane: number;
  /** Desfase del movimiento, para que no vayan a compás. */
  phase: number;
}

export const toolsForStage = (instrument: string, stage: number): ToolEntry[] => {
  const list: ToolEntry[] = [];
  const at = (id: ToolId, side: 'left' | 'right', lane: number, i: number): ToolEntry => ({
    id,
    side,
    lane,
    phase: hash(stage, i, 17),
  });

  switch (instrument) {
    case 'mirror':
      list.push(at('mirror', 'right', 0.36, 0), at('explorer', 'left', 0.62, 1));
      break;
    case 'probe':
      list.push(at('explorer', 'left', 0.35, 0), at('mirror', 'right', 0.6, 1));
      break;
    case 'scaler':
      list.push(
        at('scaler', 'left', 0.42, 0),
        at('mirror', 'right', 0.33, 1),
        at('suction', 'right', 0.64, 2)
      );
      break;
    case 'drill':
      list.push(
        at('handpiece', 'left', 0.43, 0),
        at('suction', 'right', 0.65, 1),
        at('mirror', 'right', 0.34, 2)
      );
      break;
    case 'syringe':
      // El quirófano no lleva ninguno, y no es un olvido.
      //
      // En las demás fases el instrumental entra desde fuera de la boca, enorme, y eso
      // es exactamente lo que hacen las referencias. Aquí ya estamos fuera: la sala
      // **es** el escenario, tiene su propia unidad con tres instrumentos colgando, y
      // un vástago cruzando la pantalla se solapaba con el sillón, el visor y la pila.
      // Su instrumental es el de la unidad, y se balancea (ver `props.ts`).
      break;
    default:
      list.push(at('mirror', 'right', 0.36, 0), at('explorer', 'left', 0.62, 1));
  }

  return list;
};

/** Hasta dónde entra la punta, medido desde el borde por el que asoma. */
export const REACH = 215;

/** Dónde cae la punta de un instrumento, sin contar su vaivén. */
export const toolTipX = (entry: ToolEntry) =>
  entry.side === 'left' ? REACH : CANVAS_WIDTH - REACH;

/**
 * A qué altura pasa el eje de un instrumento, dada la abertura de la fase.
 *
 * Vive aquí, y no dentro del dibujado, para que se pueda comprobar sin lienzo: lo que
 * hay que garantizar es que el instrumento **asome por la abertura**, y eso es
 * aritmética de la lente, no de píxeles.
 */
export const toolAxisY = (opening: Opening, entry: ToolEntry, dx = 0) => {
  const tipX = entry.side === 'left' ? REACH + dx : CANVAS_WIDTH - REACH - dx;
  const edge = openingAt(opening, tipX);
  return Math.round(edge.top + entry.lane * (edge.bottom - edge.top));
};
