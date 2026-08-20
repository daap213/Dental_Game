import type { Platform } from '../../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/physics';
import type { PaletteKey } from '../data/palette';
import { getStageScene } from '../data/stages';
import { archSlots, openingAt } from '../data/opening';
import { archTooth } from './background/mouth';
import { px, blit, bake } from './pixel';
import { ditherFill, ditherOver } from './dither';
import { chance, hash, hashInt, jitter, spread } from './noise';
import { drawSprite } from './sprites/format';
import { shadeMask } from './sprites/shade';
import { rect } from './sprites/masks/shapes';

/**
 * Plataformas y transición entre fases.
 *
 * El fondo vivía aquí y se ha mudado a `render/background/`: eran cuatro capas
 * con sus factores de parallax escritos a mano en medio de una función, y ahora
 * son una pila declarada en la que cada fase elige qué capas entran. Este fichero
 * se queda con lo que se pinta *sobre* el mundo.
 *
 * Todo está horneado y estampado. Antes se dibujaba entero en cada frame con
 * degradados, `shadowBlur` y modos de fusión: además de ser lento, era justo lo
 * que se ensucia al reescalar el lienzo. Cada pieza se pinta **una vez** con
 * tramado y se reutiliza, que es también lo que necesita el port a Phaser para
 * convertirlas en texturas.
 */

// --- Plataformas -----------------------------------------------------------

const TILE = 32;
/** Cuántas baldosas distintas se hornean de cada cosa. */
const TONGUE_VARIANTS = 4;
const BRACES_VARIANTS = 3;
/** A qué altura de la baldosa corre el surco medio de la lengua. */
const SULCUS = 15;

/**
 * Baldosa de lengua: la superficie del suelo.
 *
 * Era **una sola baldosa** con las papilas en una rejilla de ocho píxeles, repetida
 * a lo largo de todo el nivel: el suelo es lo que más superficie ocupa después del
 * fondo, y se leía como papel pintado.
 *
 * Ahora hay cuatro, elegidas por la columna del mundo. Las papilas se reparten con
 * el ruido determinista en vez de en rejilla, y cada variante añade algo: un surco,
 * un brillo húmedo, una zona más gastada.
 */
const tongueTile = (variant: number) =>
  bake(`platform:tongue:${variant}`, TILE, 64, (ctx) => {
    px(ctx, 0, 0, TILE, 64, 'tongue.mid');

    // Canto superior: dos filas claras y una de brillo. Es lo que separa el suelo
    // del aire y lo que el jugador usa para juzgar dónde pisa.
    px(ctx, 0, 0, TILE, 2, 'tongue.light');
    px(ctx, 0, 2, TILE, 1, 'tongue.hi');
    ditherFill(ctx, 0, 3, TILE, 10, 'tongue.mid', 'tongue.light', 6);
    ditherFill(ctx, 0, 13, TILE, 26, 'tongue.mid', 'tongue.dark', 8);
    ditherFill(ctx, 0, 39, TILE, 25, 'tongue.dark', 'tongue.out', 10);

    /**
     * El surco medio de la lengua.
     *
     * Va **horizontal**, o sea a lo largo del dorso, porque desde donde mira el
     * personaje la lengua se extiende de lado a lado: el surco corre con ella. Un
     * surco vertical se repetiría cada 32 píxeles y saldría una reja.
     *
     * Con su valle oscuro y las dos caras iluminadas a los lados, que es lo único que
     * separa un surco de una raya pintada.
     */
    px(ctx, 0, SULCUS - 1, TILE, 1, 'tongue.light');
    px(ctx, 0, SULCUS, TILE, 3, 'tongue.out');
    px(ctx, 0, SULCUS + 3, TILE, 1, 'tongue.dark');
    px(ctx, 0, SULCUS + 4, TILE, 1, 'tongue.light');

    // Papilas: repartidas, no en rejilla. Más densas y marcadas arriba, donde da
    // la luz.
    const count = variant === 1 ? 7 : 13;
    for (let i = 0; i < count; i++) {
      const x = Math.round(spread(count, i, variant * 7 + 1) * (TILE - 3));
      const y = 6 + Math.round(hash(variant, i, 3) * 30);
      const big = hash(variant, i, 5) > 0.65;
      px(ctx, x, y, big ? 3 : 2, 2, 'tongue.light');
      px(ctx, x, y + 2, big ? 3 : 2, 1, 'tongue.dark');
      if (big) px(ctx, x, y, 1, 1, 'tongue.hi');
    }

    switch (variant) {
      case 1: {
        // Surco: una grieta que baja en diagonal, con su labio iluminado.
        let gx = 6 + Math.round(hash(variant, 11) * 16);
        for (let y = 4; y < 44; y++) {
          px(ctx, gx, y, 2, 1, 'tongue.out');
          px(ctx, gx + 2, y, 1, 1, 'tongue.light');
          if (y % 6 === 0) gx += hash(variant, y, 13) > 0.5 ? 1 : -1;
        }
        break;
      }
      case 2: {
        // Brillo húmedo: una mancha tenue en la parte alta.
        const cx = 8 + Math.round(hash(variant, 17) * 12);
        for (let i = 0; i < 12; i++) {
          const half = Math.round(Math.sqrt(Math.max(0, 1 - ((i - 6) / 6) ** 2)) * 9);
          ditherOver(ctx, cx - half, 5 + i, half * 2, 1, 'tongue.hi', 4);
        }
        break;
      }
      case 3:
        // Zona gastada: la superficie más apagada y con la trama más abierta.
        ditherOver(ctx, 0, 4, TILE, 22, 'tongue.dark', 5);
        break;
    }
  });

/**
 * Baldosa de suelo de clínica.
 *
 * La fase del quirófano ocurre **fuera** de la boca, y hasta ahora andaba sobre una
 * lengua: el fondo era una consulta y el suelo, carne. Aquí es gres frío con su junta
 * y su reflejo.
 */
const clinicFloorTile = (variant: number) =>
  bake(`platform:clinicFloor:${variant}`, TILE, 64, (ctx) => {
    px(ctx, 0, 0, TILE, 64, 'clinic.dark');

    // Canto superior: la arista por la que el jugador juzga dónde pisa.
    px(ctx, 0, 0, TILE, 2, 'clinic.light');
    px(ctx, 0, 2, TILE, 1, 'clinic.hi');
    ditherFill(ctx, 0, 3, TILE, 20, 'clinic.dark', 'clinic.mid', 7);
    ditherFill(ctx, 0, 23, TILE, 41, 'clinic.shade', 'clinic.dark', 8);

    // Junta: una vertical por baldosa y una horizontal en perspectiva.
    px(ctx, variant % 2 === 0 ? 0 : TILE - 1, 3, 1, 61, 'clinic.out');
    px(ctx, 0, 22, TILE, 1, 'clinic.out');
    px(ctx, 0, 23, TILE, 1, 'clinic.shade');

    // Reflejo: el gres pulido devuelve la luz del techo en una banda difusa.
    ditherOver(ctx, 0, 5, TILE, 12, 'clinic.hi', variant === 1 ? 5 : 3);
    if (variant === 3) ditherOver(ctx, 0, 26, TILE, 10, 'clinic.light', 3);
  });

/** Color de la goma del aparato. Cambia por fase, como en una ortodoncia real. */
const ELASTIC: readonly PaletteKey[] = [
  'bacteria.light',
  'candy.light',
  'plaque.light',
  'fiend.light',
  'warden.light',
];

/**
 * Baldosa de aparato dental.
 *
 * También era una sola tira de 32 píxeles repetida. Ahora hay tres, con el bracket
 * en distinta posición, la goma de color de la fase y el alambre con su caída entre
 * bracket y bracket —un alambre de ortodoncia no va recto—.
 */
const bracesTile = (variant: number, stage: number) =>
  bake(`platform:braces:${variant}:${stage}`, TILE, 20, (ctx) => {
    const body = rect(TILE, 20, 0, 2, TILE, 16, 2);
    drawSprite(ctx, `platform:braces:art:${variant}`, shadeMask(body, 'enamel'), 0, 0);

    // Alambre con caída: baja en el centro del tramo y sube en los extremos.
    for (let x = 0; x < TILE; x++) {
      const t = (x / (TILE - 1)) * 2 - 1;
      const sag = Math.round((1 - t * t) * 2);
      px(ctx, x, 9 + sag, 1, 2, 'metal.dark');
      px(ctx, x, 9 + sag, 1, 1, 'metal.light');
    }

    // Bracket, en una de tres posiciones.
    const bx = [9, 3, 16][variant % 3];
    const bracket = rect(14, 14, 0, 0, 14, 14, 3);
    drawSprite(ctx, `platform:braces:bracket:${variant}`, shadeMask(bracket, 'metal'), bx, 3);
    px(ctx, bx + 4, 7, 4, 4, 'metal.hi');

    // La goma, cruzando el bracket.
    const elastic = ELASTIC[Math.max(0, Math.min(ELASTIC.length - 1, stage - 1))];
    px(ctx, bx + 2, 5, 10, 2, elastic);
    px(ctx, bx + 2, 12, 10, 2, elastic);
  });

export const drawPlatforms = (ctx: CanvasRenderingContext2D, platforms: Platform[], stage = 1) => {
  const inClinic = getStageScene(stage).zone === 'clinic';

  platforms.forEach((p) => {
    for (let x = 0; x < p.w; x += TILE) {
      const w = Math.min(TILE, p.w - x);
      // Índice en coordenadas del **mundo**: la baldosa de un sitio es siempre la
      // misma, así que el suelo no cambia al pasar la cámara por delante.
      const index = Math.floor((p.x + x) / TILE);

      if (p.isGround) {
        const variant = hashInt(TONGUE_VARIANTS, index, 91);
        // Fuera de la boca se pisa gres, no lengua.
        const tile = inClinic ? clinicFloorTile(variant) : tongueTile(variant);
        // Se recorta la baldosa al ancho que queda, para no pasarse del borde.
        ctx.drawImage(tile, 0, 0, w, 64, Math.round(p.x + x), Math.round(p.y), w, 64);
      } else {
        const tile = bracesTile(hashInt(BRACES_VARIANTS, index, 93), stage);
        ctx.drawImage(tile, 0, 0, w, 20, Math.round(p.x + x), Math.round(p.y), w, 20);
      }
    }
  });
};

// --- Transición entre fases ------------------------------------------------

/**
 * La mordida que cierra una fase.
 *
 * **Muerde con los dientes de la fase en la que estás**, no con una dentadura
 * propia. Antes tenía su propio diente —una silueta genérica de esmalte, cuatro
 * variantes, todos del mismo tamaño y sin rastro del deterioro— así que en el
 * sarro o en el quirófano te mordía una boca sana que no era la del escenario.
 * Ahora sale de `archSlots()` y de `archTooth()`, exactamente lo mismo que dibuja
 * la arcada del fondo: mismos tamaños por posición, mismo tipo de pieza, misma
 * rampa, mismo deterioro y **los mismos huecos** donde a esa fase le faltan
 * piezas.
 *
 * La curva también es la suya: cada columna se desplaza según la curvatura que
 * `openingAt` da en ese punto, así que la fila cierra con el mismo arco que tiene
 * la boca abierta detrás.
 */

/**
 * El festón de encía del que nace cada pieza.
 *
 * **El mismo valor que usa la arcada del fondo** (`SCALLOP` en `mouth.ts`), y no
 * es una coincidencia que haya que mantener: con un valor propio y más alto, los
 * arcos de encía salían como globos rojos entre los dientes en vez de como el
 * borde del que cuelgan. Si allí cambia, aquí también.
 */
const JAW_SCALLOP = 7;

/** Margen para que las arcadas entren y salgan de cuadro por completo. */
const JAW_REACH = 40;

/**
 * Perfil del arco en una columna, relativo al centro.
 *
 * Positivo = esa columna cierra más tarde que el centro. Con esto la fila de
 * dientes no es una línea recta: reproduce la curvatura de la propia boca.
 */
const archProfile = (scene: ReturnType<typeof getStageScene>, cx: number, upper: boolean) => {
  const here = openingAt(scene.opening, cx);
  const middle = openingAt(scene.opening, CANVAS_WIDTH / 2);
  return upper ? here.top - middle.top : here.bottom - middle.bottom;
};

export const drawTransition = (ctx: CanvasRenderingContext2D, progress: number, stage: number) => {
  if (progress <= 0) return;

  const scene = getStageScene(stage);
  const slots = archSlots();
  const gum = scene.gumRamp;

  const ease =
    progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const half = CANVAS_HEIGHT / 2;

  // El diente más alto marca desde cuán fuera de cuadro entra cada arcada.
  const reach = Math.max(...slots.map((slot) => slot.size.h)) + JAW_SCALLOP + JAW_REACH;
  const topLine = -reach + (half + reach) * ease;
  const botLine = CANVAS_HEIGHT + reach - (half + reach) * ease;

  /**
   * **Sin `setTransform`**. Lo llevaba, y con ello se cargaba la escala de
   * supermuestreo del lienzo: la mordida se dibujaba a 800×450 sobre un búfer del
   * doble, o sea en un cuarto de la pantalla, arrinconada arriba a la izquierda.
   * La cámara ya viene restaurada por `renderScene`, así que no hay nada de lo que
   * escapar.
   */
  ctx.save();

  // Encía de cada mandíbula, en la rampa de la fase: una banda tramada que cierra.
  ditherFill(
    ctx,
    0,
    topLine - CANVAS_HEIGHT,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    `${gum}.dark`,
    `${gum}.out`,
    6
  );
  ditherFill(ctx, 0, botLine, CANVAS_WIDTH, CANVAS_HEIGHT, `${gum}.dark`, `${gum}.out`, 6);

  // De dentro hacia fuera, para que la pieza del borde tape a su vecina, igual que
  // hace la arcada del fondo.
  const ordered = [...slots].sort((a, b) => a.depth - b.depth);

  for (const upper of [true, false]) {
    for (const slot of ordered) {
      // El mismo sorteo que el fondo, con la misma semilla: si a esta fase le falta
      // esa pieza, también le falta al morder.
      if (chance(scene.gaps, slot.cx, 77)) continue;

      const curve = Math.round(archProfile(scene, slot.cx, upper));
      const variant = Math.floor(hash(slot.cx, 79) * 6);
      const h = slot.size.h;

      // Nacimiento de la pieza: arriba cuelga hacia abajo, abajo asoma hacia arriba.
      const y = upper ? topLine + curve - h : botLine - curve;

      // Festón: el arco de encía del que nace la pieza. Sin él, la fila de dientes
      // sale pegada a un canto recto y se lee como una sierra, no como una boca.
      // Se hincha con la inflamación, igual que en el fondo y con la misma semilla.
      const swell = JAW_SCALLOP + Math.round(scene.decay.inflammation * 7) + jitter(2, slot.cx, 61);
      for (let i = 0; i < slot.size.w; i++) {
        const t = (i / (slot.size.w - 1)) * 2 - 1;
        const depth = Math.round((1 - t * t) * swell);
        if (depth <= 0) continue;
        const gy = upper ? Math.round(y) - depth : Math.round(y) + h;
        px(ctx, slot.x + i, gy, 1, depth + 1, `${gum}.mid`);
        px(ctx, slot.x + i, upper ? gy + depth : gy, 1, 1, `${gum}.light`);
      }

      blit(
        ctx,
        archTooth(scene, slot, upper, upper ? variant : variant + 3),
        slot.x,
        Math.round(y),
        slot.size.w,
        h,
        slot.flip
      );
    }
  }

  if (progress > 0.95) {
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(`STAGE ${stage} COMPLETE`, CANVAS_WIDTH / 2 + 2, half - 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(`STAGE ${stage} COMPLETE`, CANVAS_WIDTH / 2, half - 20);
  }

  ctx.restore();
};
