import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import type { PaletteKey } from '../../data/palette';
import type { StageScene } from '../../data/stages';
import { bake, pixelBuffer, px, type PixelBuffer } from '../pixel';
import { BAYER_4, ditherFill, ditherOver } from '../dither';
import { hash, spread } from '../noise';
import { registerLayer } from './stack';

/**
 * La clínica, vista por la abertura de la boca.
 *
 * Es lo que le faltaba al fondo anterior: allí el centro de la pantalla era un
 * **agujero oscuro** —las fauces, con su úvula— o sea mirando hacia la garganta, la
 * dirección contraria a la que mira el personaje. Lo que sostiene las referencias es
 * lo opuesto: boca roja y oscura contra clínica fría y reventada de luz.
 *
 * Va con parallax muy bajo: está lejos, así que apenas se desplaza, pero se desplaza
 * —es lo que da a entender que la boca se mueve y la habitación no—.
 */

/** Alto del azulejo, con su junta. */
const TILE = 26;

/** Dónde cae el foco dentro de la abertura, en fracción de pantalla. */
const LAMP_X = 0.56;

/** El resplandor del foco: lo que convierte la abertura en una salida. */
const drawGlare = (
  buf: PixelBuffer,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  strength: number
) => {
  // Umbral por píxel: un resplandor hecho de rectángulos se ve a bandas.
  for (let y = Math.max(0, cy - ry); y < Math.min(CANVAS_HEIGHT, cy + ry); y++) {
    for (let x = Math.max(0, cx - rx); x < Math.min(CANVAS_WIDTH, cx + rx); x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1) continue;
      const level = 17 * strength * (1 - d) ** 1.7;
      if (level >= 16 || BAYER_4[y & 3][x & 3] < level) {
        // El núcleo llega al blanco; el halo se queda en el cálido.
        buf.set(x, y, d < 0.34 ? 'glare.hi' : 'glare.light');
      }
    }
  }
};

/** Pared de azulejo: el fondo de la habitación. Desaturado, porque está a contraluz. */
const drawTiles = (ctx: CanvasRenderingContext2D, top: number, bottom: number) => {
  // Oscura de base: el foco es un punto caliente, no un campo. Con la pared en tono
  // medio, la abertura entera quedaba pálida y el jugador —un diente blanco— dejaba de
  // leerse contra ella. Un fondo no puede robarle contraste a lo que se controla.
  ditherFill(ctx, 0, top, CANVAS_WIDTH, bottom - top, 'clinic.shade', 'clinic.dark', 8);

  for (let y = top; y < bottom; y += TILE) {
    px(ctx, 0, y, CANVAS_WIDTH, 1, 'clinic.out');
    px(ctx, 0, y + 1, CANVAS_WIDTH, 1, 'clinic.dark');
    // Las juntas verticales van desfasadas fila a fila, como un aparejo de verdad.
    const offset = ((y - top) / TILE) % 2 === 0 ? 0 : TILE;
    for (let x = offset; x < CANVAS_WIDTH; x += TILE * 2) {
      px(ctx, x, y, 1, TILE, 'clinic.out');
    }
  }
};

/** Mobiliario: un armario con frascos y la bandeja. Siluetas, sin detalle. */
const drawFurniture = (ctx: CanvasRenderingContext2D, floor: number) => {
  // Armario a la izquierda.
  px(ctx, 40, floor - 96, 130, 96, 'clinic.shade');
  px(ctx, 40, floor - 96, 130, 2, 'clinic.mid');
  for (let i = 0; i < 3; i++) {
    px(ctx, 46, floor - 88 + i * 30, 118, 1, 'clinic.dark');
  }
  // Frascos encima, de alturas distintas.
  for (let i = 0; i < 5; i++) {
    const x = 52 + i * 24;
    const h = 12 + Math.round(hash(i, 11) * 14);
    px(ctx, x, floor - 96 - h, 12, h, 'clinic.mid');
    px(ctx, x, floor - 96 - h, 12, 2, 'clinic.light');
    px(ctx, x + 4, floor - 96 - h - 4, 4, 4, 'clinic.dark');
  }

  // Estantería a la derecha.
  px(ctx, CANVAS_WIDTH - 150, floor - 130, 120, 130, 'clinic.shade');
  for (let i = 0; i < 4; i++) {
    px(ctx, CANVAS_WIDTH - 150, floor - 120 + i * 30, 120, 2, 'clinic.dark');
  }
  // Un monitor, que es lo que hay en toda consulta.
  px(ctx, CANVAS_WIDTH - 138, floor - 176, 74, 44, 'clinic.out');
  px(ctx, CANVAS_WIDTH - 134, floor - 172, 66, 36, 'clinic.mid');
  px(ctx, CANVAS_WIDTH - 132, floor - 170, 30, 6, 'clinic.light');
};

/**
 * El dentista, a contraluz.
 *
 * Se ve **contra** el resplandor, así que se resuelve como silueta: contorno oscuro
 * con el canto encendido por el borde. De paso se arregla el problema que tenía en la
 * versión anterior, cuando iba dentro de la boca y su bata de teal brillante competía
 * con el jugador; contra la luz no compite con nada, enmarca.
 */
const drawDentist = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
  const HEAD_R = 40;
  const headY = Math.round(cy - 46);
  const c = Math.round(cx);

  /**
   * Se dibuja perfil a perfil, y **cada perfil deja su canto encendido**.
   *
   * El primer intento era una elipse sólida sobre un trapecio y se leía como un bolo
   * de bolera: a contraluz, lo único que da forma a una silueta es su borde, así que
   * hay que dibujarlo a propósito y con un tono que se vea contra el resplandor.
   */
  const row = (y: number, half: number, rim: PaletteKey = 'glare.mid') => {
    if (half <= 0) return;
    px(ctx, c - half, y, half * 2, 1, 'clinic.out');
    px(ctx, c - half - 1, y, 2, 1, rim);
    px(ctx, c + half - 1, y, 2, 1, rim);
  };

  // Gorro quirúrgico: más ancho que el cráneo y con el canto marcado.
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    // Cúpula de verdad: arrancando de un seno a media curva el gorro salía con la
    // coronilla plana, o sea como una caja negra encima de la cabeza.
    row(headY - HEAD_R - 16 + i, Math.round(Math.sin((Math.PI / 2) * t) * (HEAD_R + 8)));
  }
  // La cinta del gorro.
  px(ctx, c - HEAD_R - 8, headY - HEAD_R + 12, (HEAD_R + 8) * 2, 4, 'glare.dark');

  // Cráneo y cara.
  for (let i = 0; i < HEAD_R * 2; i++) {
    const t = i / (HEAD_R * 2 - 1);
    row(headY - HEAD_R + 14 + i, Math.round(Math.sin(Math.PI * (0.14 + t * 0.72)) * HEAD_R));
  }

  // La lámpara frontal: el único punto encendido de la silueta, y lo que la identifica
  // como un dentista y no como una sombra cualquiera.
  px(ctx, c - 10, headY - HEAD_R + 3, 20, 10, 'glare.light');
  px(ctx, c - 7, headY - HEAD_R + 5, 14, 5, 'glare.hi');

  // La mascarilla: una banda algo más ancha que la cara, con su goma.
  const maskY = headY + 14;
  for (let i = 0; i < 26; i++) {
    row(maskY + i, Math.round(HEAD_R * 0.86));
  }
  px(ctx, c - HEAD_R - 6, maskY + 3, 8, 3, 'glare.shade');
  px(ctx, c + HEAD_R - 2, maskY + 3, 8, 3, 'glare.shade');

  // Cuello y hombros: se ensanchan y salen de cuadro por abajo.
  for (let i = 0; i < 22; i++) row(headY + HEAD_R + 4 + i, 20);
  const shoulderTop = headY + HEAD_R + 26;
  for (let i = 0; shoulderTop + i < CANVAS_HEIGHT; i++) {
    const t = Math.min(1, i / 60);
    row(shoulderTop + i, Math.round(24 + t * 74), 'glare.shade');
  }
};

export const clinicLayer = registerLayer({
  id: 'clinic',
  // Muy lejos: apenas se desplaza. Pero se desplaza, y eso es lo que cuenta que la
  // boca se mueve y la habitación no.
  parallax: 0.03,

  bake: (scene: StageScene) =>
    bake(`bg:${scene.id}:clinic`, CANVAS_WIDTH, CANVAS_HEIGHT, (ctx) => {
      const through = scene.throughOpening;
      const cy = scene.opening.cy;
      const lampX = Math.round(CANVAS_WIDTH * LAMP_X);

      // Suelo de la habitación, a la altura del canto inferior de la lente.
      const floor = Math.round(cy + scene.opening.halfH * 0.75);

      // 1. La habitación. En el resquicio del fondo de la boca casi no se ve, así que
      //    no se gasta en dibujarla.
      if (through !== 'gap') {
        drawTiles(ctx, 0, floor);
        ditherFill(ctx, 0, floor, CANVAS_WIDTH, CANVAS_HEIGHT - floor, 'clinic.out', 'clinic.shade', 7);
        drawFurniture(ctx, floor);
      } else {
        ditherFill(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 'clinic.out', 'clinic.dark', 7);
      }

      // 2. El foco. Es la pieza que da el contraste; su fuerza cambia por fase.
      const strength = through === 'gap' ? 0.6 : through === 'grime' ? 0.55 : 0.8;
      const glow = pixelBuffer(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawGlare(glow, lampX, cy - 20, 150, 108, strength);
      glow.commit();

      // 3. Quien se asoma.
      if (through === 'dentist') drawDentist(ctx, CANVAS_WIDTH * 0.44, cy);

      // 4. En la fase infectada la luz que entra está sucia: un velo cálido y turbio
      //    por encima de todo, que es lo que la distingue de las demás.
      if (through === 'grime') {
        for (let i = 0; i < 30; i++) {
          const x = Math.round(spread(30, i, 21) * CANVAS_WIDTH);
          const y = Math.round(hash(i, 23) * CANVAS_HEIGHT);
          const r = 10 + Math.round(hash(i, 25) * 22);
          ditherOver(ctx, x - r, y - r, r * 2, r * 2, `${scene.ramp}.dark`, 5);
        }
      }
    }),

  /**
   * Se estampa a pantalla completa, **sin recortar a la lente**.
   *
   * No hace falta: el marco de la boca se dibuja después y tapa con carne opaca todo
   * lo que queda fuera de la abertura. Y lo que se cuela entre diente y diente —por
   * las muescas de las cúspides y por las esquinas de la mordida— es justo lo que
   * hacen las referencias: la luz pasa por los huecos de la dentadura.
   */
  layout: () => ({ y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT, align: 'left' }),
});
