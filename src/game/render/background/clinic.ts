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

/**
 * El suelo del quirófano, y de dónde cuelga la unidad.
 *
 * Se exporta porque `props.ts` dibuja **en vivo** las mangueras y sus instrumentos
 * —para que se balanceen— y necesita clavarlas en el mismo brazo que hornea esta capa.
 * Si cada uno calculara su altura por su cuenta, un ajuste en una las descolgaría de
 * la otra sin que nada avisara.
 */
export const CLINIC_FLOOR = CANVAS_HEIGHT - 65;
export const CLINIC_UNIT_X = Math.round(CANVAS_WIDTH * 0.55);
/** De dónde nacen las mangueras. */
export const CLINIC_HOSE_Y = CLINIC_FLOOR - 146;

/**
 * Sombra proyectada, tramada.
 *
 * Es lo que le faltaba al quirófano. Tenía mobiliario de sobra pero **todo al mismo
 * valor**: pared, suelo y objetos con la misma claridad, de modo que la sala se leía
 * como un plano técnico y no como un sitio con volumen. Una sombra pegada a la base de
 * cada cosa la despega del fondo mejor que cualquier detalle añadido encima.
 */
const groundShadow = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  halfW: number,
  depth = 12
) => {
  for (let i = 0; i < depth; i++) {
    const t = i / depth;
    const half = Math.round(halfW * (1 - t * 0.35));
    ditherOver(ctx, cx - half, y + i, half * 2, 1, 'clinic.out', Math.round(11 - t * 9));
  }
};

/**
 * Sombra de un objeto colgado en la pared: una **ele** por su derecha y su bajo.
 *
 * Se dibuja solo en la parte que sobresale del objeto, nunca encima: un rectángulo
 * desplazado y sin recortar ensucia la mitad de la pieza que pretende despegar.
 */
const wallShadow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  off = 5
) => {
  ditherOver(ctx, x + w, y + off, off, h, 'clinic.out', 8);
  ditherOver(ctx, x + off, y + h, w, off, 'clinic.out', 8);
};

/**
 * Lo que va **debajo** de todo: la mugre del azulejo y el despeje del suelo.
 *
 * Tiene que dibujarse antes del mobiliario. Un velo de suciedad estampado al final
 * pasa por encima del sillón y de la unidad y los apaga a todos por igual, que es
 * justo el problema que venía a resolver.
 */
const drawRoomBase = (ctx: CanvasRenderingContext2D, floor: number) => {
  // Manchas en el azulejo, más densas cerca del suelo: una pared perfectamente limpia
  // de arriba abajo se lee como papel, no como una sala en uso.
  for (let i = 0; i < 40; i++) {
    const x = Math.round(spread(40, i, 31) * CANVAS_WIDTH);
    const y = Math.round(hash(i, 33) ** 0.6 * floor);
    const w = 14 + Math.round(hash(i, 35) * 40);
    const h = 8 + Math.round(hash(i, 37) * 22);
    ditherOver(ctx, x - w, y, w * 2, h, 'clinic.out', 3 + Math.round((y / floor) * 4));
  }

  // El suelo en fuga: las juntas se juntan al alejarse y abren en abanico desde el
  // punto de fuga. Es lo que convierte la banda del suelo en un plano y no en una
  // tira de color, y por tanto lo que hace que el sillón se apoye en algo.
  const vpX = Math.round(CANVAS_WIDTH * 0.5);
  const depth = CANVAS_HEIGHT - floor;
  for (let j = 1; j < 7; j++) {
    const y = floor + Math.round(depth * (j / 6) ** 1.7);
    px(ctx, 0, y, CANVAS_WIDTH, 1, 'clinic.dark');
  }
  for (let c = -9; c <= 9; c++) {
    if (c === 0) continue;
    for (let i = 0; i < depth; i++) {
      const t = i / depth;
      const x = vpX + Math.round(c * 34 * (0.18 + t * 1.9));
      if (x < 0 || x >= CANVAS_WIDTH) break;
      px(ctx, x, floor + i, 1, 1, 'clinic.dark');
    }
  }
};

/**
 * Lo que va **encima** de todo: sombras proyectadas, remates de pared y la viñeta.
 *
 * Este es el paso que le faltaba al quirófano. Tenía mobiliario de sobra, pero sin
 * sombras ni esquinas oscuras todo caía en el mismo valor y la sala se leía como un
 * plano técnico: objetos correctos flotando sobre un fondo del mismo tono.
 */
const drawRoomDepth = (ctx: CanvasRenderingContext2D, floor: number) => {
  // --- Sombras en el suelo, bajo lo que se apoya en él ---
  groundShadow(ctx, Math.round(CANVAS_WIDTH * 0.37), floor, 42, 14);
  groundShadow(ctx, Math.round(CANVAS_WIDTH * 0.2), floor, 30, 11);
  groundShadow(ctx, CLINIC_UNIT_X, floor, 16, 10);
  groundShadow(ctx, CANVAS_WIDTH - 90, floor, 12, 9);
  groundShadow(ctx, Math.round(CANVAS_WIDTH * 0.9) + 15, floor, 22, 10);

  // --- Sombras de lo que cuelga de la pared ---
  wallShadow(ctx, Math.round(CANVAS_WIDTH * 0.08), 96, 96, 74);
  wallShadow(ctx, Math.round(CANVAS_WIDTH * 0.66), 108, 78, 96);
  wallShadow(ctx, CANVAS_WIDTH - 120, floor - 190, 60, 74);
  wallShadow(ctx, Math.round(CANVAS_WIDTH * 0.78), floor - 78, 116, 30, 4);

  // --- Reloj de pared: en toda consulta hay uno, y se lee a cualquier tamaño ---
  const clockX = Math.round(CANVAS_WIDTH * 0.45);
  const clockY = 52;
  for (let dy = -14; dy <= 14; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, 196 - dy * dy)));
    px(ctx, clockX - half, clockY + dy, half * 2, 1, 'clinic.out');
    if (half > 2) px(ctx, clockX - half + 2, clockY + dy, half * 2 - 4, 1, 'clinic.light');
  }
  px(ctx, clockX - 1, clockY - 8, 2, 9, 'clinic.out');
  px(ctx, clockX, clockY - 1, 7, 2, 'clinic.out');

  // --- Dispensador de guantes, y una caja de mascarillas debajo ---
  const dispX = 232;
  px(ctx, dispX, 186, 26, 34, 'clinic.mid');
  px(ctx, dispX, 186, 26, 3, 'clinic.light');
  px(ctx, dispX + 6, 200, 14, 12, 'clinic.out');
  px(ctx, dispX + 8, 203, 9, 6, 'clinic.hi');
  wallShadow(ctx, dispX, 186, 26, 34, 3);

  // --- Canaleta de instalaciones bajando por la pared, con sus bridas ---
  px(ctx, 12, 16, 9, floor - 16, 'clinic.dark');
  px(ctx, 12, 16, 2, floor - 16, 'clinic.mid');
  for (let y = 40; y < floor - 10; y += 58) px(ctx, 9, y, 15, 4, 'clinic.shade');

  // --- Enchufe junto al zócalo, y un desagüe en el suelo ---
  px(ctx, 108, floor - 26, 14, 16, 'clinic.light');
  px(ctx, 111, floor - 22, 3, 5, 'clinic.out');
  px(ctx, 116, floor - 22, 3, 5, 'clinic.out');
  const drainX = Math.round(CANVAS_WIDTH * 0.5);
  px(ctx, drainX - 13, floor + 26, 26, 12, 'clinic.dark');
  for (let i = 0; i < 5; i++) px(ctx, drainX - 10 + i * 5, floor + 28, 3, 8, 'clinic.out');

  // --- Viñeta: las esquinas de la sala, apagadas ---
  // Por píxel, no por bloques: la matriz de trama está anclada a coordenadas absolutas,
  // así que una caída hecha de tiras de un píxel sale a rayas en vez de a degradado.
  const buf = pixelBuffer(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  const cx = CANVAS_WIDTH / 2;
  const cyv = CANVAS_HEIGHT / 2;
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const u = (x - cx) / cx;
      const v = (y - cyv) / cyv;
      const d = Math.sqrt(u * u * 0.85 + v * v * 0.3);
      if (d < 0.66) continue;
      const level = 14 * Math.min(1, (d - 0.66) / 0.5) ** 1.5;
      if (BAYER_4[y & 3][x & 3] < level) buf.set(x, y, 'clinic.out');
    }
  }
  buf.commit();
};

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

/**
 * El quirófano, para la fase que ocurre **fuera** de la boca.
 *
 * Ahí la clínica deja de ser lo que se ve por un hueco y pasa a ser el escenario, y
 * con una pared de azulejo y un foco no basta: lo que identifica una consulta dental
 * es el mobiliario. Van todos en silueta y desaturados —es fondo—, pero cada uno se
 * reconoce por su forma, que es lo que hace que la fase deje de ser "la boca en gris".
 */
const drawTheatre = (ctx: CanvasRenderingContext2D, floor: number) => {
  // --- El sillón, que es la pieza que más dice ---
  const chairX = Math.round(CANVAS_WIDTH * 0.37);

  // Columna y base.
  px(ctx, chairX - 10, floor - 54, 20, 54, 'clinic.shade');
  px(ctx, chairX - 34, floor - 8, 68, 8, 'clinic.dark');
  px(ctx, chairX - 34, floor - 8, 68, 2, 'clinic.mid');

  // Asiento y respaldo reclinado: el respaldo sube en diagonal hacia la izquierda,
  // que es la postura en la que se atiende a un paciente.
  px(ctx, chairX - 46, floor - 66, 92, 14, 'clinic.mid');
  px(ctx, chairX - 46, floor - 66, 92, 3, 'clinic.light');
  for (let i = 0; i < 58; i++) {
    const t = i / 57;
    const x = chairX - 46 - Math.round(t * 52);
    const y = floor - 66 - i;
    px(ctx, x, y, Math.round(30 + t * 10), 2, 'clinic.mid');
    px(ctx, x, y, 3, 2, 'clinic.light');
  }
  // Cabecero.
  px(ctx, chairX - 112, floor - 132, 34, 20, 'clinic.dark');
  px(ctx, chairX - 112, floor - 132, 34, 3, 'clinic.mid');

  // --- La lámpara de brazo articulado, colgando del techo ---
  const lampArmX = Math.round(CANVAS_WIDTH * 0.64);
  px(ctx, lampArmX - 3, 0, 6, 74, 'clinic.dark');
  px(ctx, lampArmX - 3, 0, 2, 74, 'clinic.mid');
  px(ctx, lampArmX - 6, 74, 12, 10, 'clinic.shade');
  // Tramo inclinado hasta la cabeza.
  for (let i = 0; i < 52; i++) {
    px(ctx, lampArmX - 4 - i, 82 + Math.round(i * 0.62), 5, 5, 'clinic.dark');
  }
  // Reflector troncocónico con su cristal encendido.
  const headX = lampArmX - 56;
  const headY = 116;
  for (let i = 0; i < 20; i++) {
    const half = Math.round(16 + i * 1.9);
    px(ctx, headX - half, headY + i, half * 2, 1, i < 4 ? 'clinic.mid' : 'clinic.shade');
    px(ctx, headX - half, headY + i, 2, 1, 'clinic.light');
  }
  const glass = 16 + 20 * 1.9;
  px(ctx, headX - Math.round(glass) + 3, headY + 20, Math.round(glass) * 2 - 6, 5, 'glare.hi');
  px(ctx, headX - Math.round(glass) + 6, headY + 25, Math.round(glass) * 2 - 12, 2, 'glare.light');

  // --- La escupidera, sobre su brazo ---
  const spitX = Math.round(CANVAS_WIDTH * 0.46);
  px(ctx, spitX - 3, floor - 96, 6, 54, 'clinic.dark');
  for (let i = 0; i < 14; i++) {
    const half = Math.round(22 - i * 1.4);
    px(ctx, spitX - half, floor - 96 - 14 + i, half * 2, 1, i < 3 ? 'clinic.light' : 'clinic.mid');
  }
  px(ctx, spitX - 20, floor - 108, 40, 2, 'clinic.hi');

  // --- La bandeja de instrumental, con el instrumental tumbado ---
  const trayX = Math.round(CANVAS_WIDTH * 0.78);
  const trayY = floor - 78;
  px(ctx, trayX, trayY, 116, 5, 'clinic.mid');
  px(ctx, trayX, trayY, 116, 1, 'clinic.light');
  px(ctx, trayX + 4, trayY + 5, 4, 24, 'clinic.shade');
  px(ctx, trayX + 108, trayY + 5, 4, 24, 'clinic.shade');
  const tools: readonly [number, number, number][] = [
    [8, 3, 46],
    [12, 9, 34],
    [10, 15, 52],
  ];
  for (const [ox, oy, len] of tools) {
    const y = trayY - 3 - oy;
    px(ctx, trayX + ox, y, len, 2, 'metal.mid');
    px(ctx, trayX + ox, y, len, 1, 'metal.light');
    // Mango más gordo que la punta, y la punta con su destello.
    px(ctx, trayX + ox, y - 1, 16, 4, 'metal.dark');
    px(ctx, trayX + ox + len - 3, y - 1, 3, 3, 'metal.hi');
  }

  // --- El visor de radiografías, en la pared ---
  const viewX = Math.round(CANVAS_WIDTH * 0.08);
  px(ctx, viewX, 96, 96, 74, 'clinic.out');
  px(ctx, viewX + 3, 99, 90, 68, 'glare.light');
  // Dos radiografías clavadas: siluetas oscuras de muelas a contraluz.
  for (const ox of [10, 52]) {
    px(ctx, viewX + ox, 106, 32, 54, 'clinic.shade');
    for (let i = 0; i < 3; i++) {
      px(ctx, viewX + ox + 4 + i * 10, 116, 7, 22, 'clinic.out');
      px(ctx, viewX + ox + 6 + i * 10, 138, 3, 14, 'clinic.out');
    }
  }

  // --- Techo: estructura, rejilla de ventilación y dos plafones ---
  px(ctx, 0, 0, CANVAS_WIDTH, 14, 'clinic.shade');
  px(ctx, 0, 14, CANVAS_WIDTH, 2, 'clinic.out');
  for (let x = 20; x < CANVAS_WIDTH; x += 96) px(ctx, x, 0, 3, 14, 'clinic.dark');
  // Rejilla.
  px(ctx, 120, 2, 66, 11, 'clinic.out');
  for (let i = 0; i < 6; i++) px(ctx, 123 + i * 11, 4, 6, 7, 'clinic.dark');
  // Plafones: dos paneles encendidos, que es de donde viene la luz general.
  for (const lx of [Math.round(CANVAS_WIDTH * 0.24), Math.round(CANVAS_WIDTH * 0.8)]) {
    px(ctx, lx - 46, 16, 92, 9, 'clinic.out');
    px(ctx, lx - 43, 18, 86, 5, 'glare.light');
    px(ctx, lx - 40, 19, 80, 2, 'glare.hi');
    // Y su derrame en la pared, justo debajo.
    for (let i = 0; i < 26; i++) {
      ditherOver(ctx, lx - 46 - i, 25 + i, 92 + i * 2, 1, 'glare.dark', Math.round(5 - i / 6));
    }
  }

  // --- La unidad: solo el brazo ---
  // Las mangueras y los instrumentos que cuelgan de ella **no se hornean**: se dibujan
  // en vivo desde `props.ts` para que se balanceen. Horneadas quedaban clavadas, y en
  // una sala en la que nada más se mueve eso es lo primero que la delata como decorado.
  const unitX = CLINIC_UNIT_X;
  px(ctx, unitX - 4, floor - 150, 8, 150, 'clinic.dark');
  px(ctx, unitX - 4, floor - 150, 2, 150, 'clinic.mid');
  px(ctx, unitX - 30, floor - 158, 60, 12, 'clinic.shade');
  px(ctx, unitX - 30, floor - 158, 60, 2, 'clinic.light');
  // Los tres enganches, de los que nacen las mangueras.
  for (let h = 0; h < 3; h++) px(ctx, unitX - 22 + h * 18, floor - 148, 7, 4, 'clinic.mid');

  // --- El taburete del dentista ---
  const stoolX = Math.round(CANVAS_WIDTH * 0.2);
  for (let dy = 0; dy < 9; dy++) {
    const half = Math.round(24 - dy * 0.8);
    px(ctx, stoolX - half, floor - 76 + dy, half * 2, 1, dy < 2 ? 'clinic.light' : 'clinic.mid');
  }
  px(ctx, stoolX - 4, floor - 68, 8, 44, 'clinic.shade');
  for (const leg of [-1, 1]) {
    for (let i = 0; i < 22; i++) {
      px(ctx, stoolX + leg * (2 + i), floor - 24 + Math.round(i * 0.9), 3, 3, 'clinic.dark');
    }
  }

  // --- Lavabo con su espejo ---
  const sinkX = CANVAS_WIDTH - 90;
  px(ctx, sinkX - 34, floor - 86, 68, 18, 'clinic.light');
  px(ctx, sinkX - 30, floor - 82, 60, 10, 'clinic.shade');
  px(ctx, sinkX - 6, floor - 68, 12, 30, 'clinic.mid');
  // Grifo.
  px(ctx, sinkX - 2, floor - 108, 4, 22, 'metal.mid');
  px(ctx, sinkX - 2, floor - 108, 18, 4, 'metal.light');
  // Espejo encima, con su marco.
  px(ctx, sinkX - 30, floor - 190, 60, 74, 'clinic.out');
  px(ctx, sinkX - 27, floor - 187, 54, 68, 'clinic.mid');
  px(ctx, sinkX - 25, floor - 185, 20, 60, 'clinic.light');

  // --- Contenedor de punzantes y papelera ---
  px(ctx, Math.round(CANVAS_WIDTH * 0.9), floor - 44, 30, 44, 'warden.dark');
  px(ctx, Math.round(CANVAS_WIDTH * 0.9), floor - 44, 30, 6, 'warden.mid');
  px(ctx, Math.round(CANVAS_WIDTH * 0.9) + 10, floor - 40, 10, 3, 'clinic.out');

  // --- Cartel de anatomía dental en la pared ---
  const chartX = Math.round(CANVAS_WIDTH * 0.66);
  px(ctx, chartX, 108, 78, 96, 'clinic.light');
  px(ctx, chartX, 108, 78, 3, 'clinic.hi');
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      px(ctx, chartX + 6 + c * 11, 118 + r * 28, 7, 16, 'clinic.shade');
      px(ctx, chartX + 8 + c * 11, 134 + r * 28, 3, 6, 'clinic.dark');
    }
  }

  // Sin puerta al fondo: la que había, centrada, era una losa oscura de suelo a techo
  // que partía la escena en dos y tapaba el sillón y la lámpara. Una escena densa no
  // necesita todo lo que quepa; necesita que se lea.

  // --- Reflejos en el suelo ---
  // El gres devuelve las luces del techo en columnas difusas: es lo que le da
  // profundidad a una banda que si no es un plano muerto.
  for (const lx of [Math.round(CANVAS_WIDTH * 0.24), Math.round(CANVAS_WIDTH * 0.8)]) {
    for (let i = 0; i < 46; i++) {
      const half = Math.round(30 + i * 0.7);
      ditherOver(ctx, lx - half, floor + i, half * 2, 1, 'glare.light', Math.round(6 - i / 8));
    }
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
      if (scene.zone === 'clinic') {
        // Fuera de la boca: la clínica **es** el escenario, así que se dibuja entera y
        // el suelo llega abajo del todo, no a la altura del canto de una abertura que
        // aquí no existe.
        const room = CLINIC_FLOOR + 5;
        drawTiles(ctx, 0, room);
        ditherFill(ctx, 0, room, CANVAS_WIDTH, CANVAS_HEIGHT - room, 'clinic.dark', 'clinic.shade', 8);
        // Zócalo: separa la pared del suelo, que si no se funden en una sola masa.
        px(ctx, 0, CLINIC_FLOOR, CANVAS_WIDTH, 5, 'clinic.shade');
        px(ctx, 0, CLINIC_FLOOR, CANVAS_WIDTH, 1, 'clinic.mid');
        drawRoomBase(ctx, CLINIC_FLOOR);
        drawFurniture(ctx, CLINIC_FLOOR);
        drawTheatre(ctx, CLINIC_FLOOR);
        drawRoomDepth(ctx, CLINIC_FLOOR);
      } else if (through !== 'gap') {
        drawTiles(ctx, 0, floor);
        ditherFill(ctx, 0, floor, CANVAS_WIDTH, CANVAS_HEIGHT - floor, 'clinic.out', 'clinic.shade', 7);
        drawFurniture(ctx, floor);
      } else {
        ditherFill(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 'clinic.out', 'clinic.dark', 7);
      }

      // 2. El foco. Es la pieza que da el contraste; su fuerza cambia por fase.
      // En el quirófano los plafones del techo ya iluminan, así que el foco baja: a
      // plena potencia lavaba el centro y se comía la unidad y el sillón.
      const strength =
        scene.zone === 'clinic' ? 0.45 : through === 'gap' ? 0.6 : through === 'grime' ? 0.55 : 0.8;
      const glow = pixelBuffer(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      const glareR = scene.zone === 'clinic' ? 108 : 150;
      drawGlare(glow, lampX, cy - 20, glareR, Math.round(glareR * 0.72), strength);
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
