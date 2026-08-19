import type { Enemy } from '../../types';
import type { Material, PaletteKey } from '../data/palette';
import { drawSprite } from './sprites/format';
import type { SpriteDef } from './sprites/format';
import { shadeMask, withDetails } from './sprites/shade';
import { blank, ellipse, rect, spike, wedge, merge, subtract, stamp, shift } from './sprites/masks/shapes';
import { hash, hashInt, jitter } from './noise';

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

  /**
   * La superficie de un molar **podrido**, que es lo que su nombre promete y lo que su cuerpo
   * no contaba: eran dos ojos y una boca sobre un degradado limpio.
   *
   * Cuatro cosas, y todas son vocabulario de un diente enfermo: los **surcos** de las cúspides,
   * las **manchas de caries** que se abren desde ellos, la **grieta** que baja por el cuello y
   * una franja de **sarro** en la línea de la encía, donde de verdad se acumula.
   */
  const decay = merge(
    // Surcos: la fisura central y las dos que bajan por cada cúspide.
    tint(rect(w, h, 58, 50, 3, 40), 'S'),
    tint(rect(w, h, 34, 56, 2, 26), 'S'),
    tint(rect(w, h, 84, 58, 2, 24), 'S'),
    // Caries: tres focos de tamaños distintos, abiertos desde los surcos.
    tint(ellipse(w, h, 40, 52, 11, 8), 'M'),
    tint(ellipse(w, h, 78, 46, 8, 6), 'M'),
    tint(ellipse(w, h, 59, 70, 6, 5), 'M'),
    // Y la grieta del cuello, que es por donde un molar así se acaba partiendo.
    tint(rect(w, h, 46, 96, 2, 22), 'S')
  );
  // El sarro de la línea de la encía: una franja de grano, no una raya.
  const gumLine = merge(
    ...[0, 1, 2].map((i) => tint(rect(w, h, 16 + i * 30, 100 + i, 26 - i * 2, 4), 'S'))
  );

  return {
    w,
    h,
    material: 'enamel',
    mask,
    detail: withMouth(
      stamp(
        stamp(
          stamp(
            stamp(
              grain(w, h, 11, [
                [0.978, 'M'],
                [0.93, 'S'],
              ]),
              decay,
              0,
              0
            ),
            gumLine,
            0,
            0
          ),
          eyeBlock(14, 10, state === 4),
          32,
          62
        ),
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

/**
 * **No tenía dibujo de ataque.** `phantom()` ni recibía el estado, así que embestía y disparaba
 * con exactamente la misma imagen con la que flotaba esperando: el jugador no tenía nada que
 * leer antes de comerse la embestida.
 *
 * Ahora el cuerpo hace las dos cosas que un espectro puede hacer: **se recoge** antes de
 * embestir —estado 1, que es el medio segundo de aviso que la IA ya tenía y no se veía— y **se
 * abre** al disparar. Los dos estados existían; lo que faltaba era enseñarlos.
 */
const phantom = (state: number): BossArt => {
  const w = 100;
  const h = 100;
  const gathering = state === 1;
  const firing = state === 3;

  // Recogido es más estrecho y más alto: la masa se junta antes de salir disparada.
  const body = merge(
    ellipse(w, h, 50, 44, gathering ? 31 : 40, gathering ? 45 : 40),
    rect(w, h, gathering ? 19 : 10, 44, gathering ? 62 : 80, 40)
  );
  // Borde inferior deshilachado: cinco jirones. Recogidos, se encogen con él.
  const tatters = merge(
    ...[0, 1, 2, 3, 4].map((i) =>
      ellipse(
        w,
        h,
        gathering ? 24 + i * 13 : 14 + i * 18,
        84 + (i % 2 === 0 ? 0 : 6),
        gathering ? 7 : 9,
        gathering ? 9 : 12
      )
    )
  );
  const mask = subtract(merge(body, tatters), rect(w, h, 0, 92, w, 8));

  return {
    w,
    h,
    material: 'laser',
    mask,
    detail: stamp(
      stamp(
        stamp(
          // Hebras de biofilm por dentro: es placa, no humo, y la translucidez necesita tener
          // de qué estar hecha.
          strands(w, h, 23),
          // Al disparar se le abre una raja por donde salen las balas.
          firing ? tint(ellipse(w, h, 50, 68, 20, 7), 'M') : blank(w, h),
          0,
          0
        ),
        eyeBlock(16, 12, true),
        22,
        36
      ),
      eyeBlock(16, 12, true),
      62,
      36
    ),
  };
};

/**
 * Hebras verticales: grano estirado a lo largo del eje `y`.
 *
 * El truco es pedirle al `hash` una frecuencia baja en vertical y alta en horizontal, con lo que
 * las motas se encadenan en columnas en vez de dispersarse. Sirve para todo lo fibroso: biofilm,
 * pulpa, tejido.
 */
const strands = (w: number, h: number, seed: number): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      const n = hash(x * 1.9, y * 0.11, seed);
      if (n > 0.9) row += 'H';
      else if (n > 0.74) row += 'S';
      else row += '.';
    }
    return row;
  });

// ---------------------------------------------------------------------------
// Coloso de cálculo: 160×140. Una concreción de sarro, no un vehículo.
// ---------------------------------------------------------------------------

/**
 * Lo que había aquí era un carro de combate, pieza por pieza: torreta trapezoidal,
 * mantelete, cañón horizontal de 52 px con freno de boca, casco con glacis inclinado,
 * tubo de escape, cinco ruedas de rodaje y dos orugas de quince eslabones. En material
 * `metal`. Dentro de una boca.
 *
 * Es acorazado, y eso se queda —es el jefe de la fase del sarro y tiene 3.500 de vida—,
 * pero lo es por **estar calcificado**, no por llevar blindaje. El sarro es cálculo
 * dental: una costra mineral que se deposita en capas sobre el diente y se agarra a él.
 *
 * Dos reglas gobiernan el dibujo, y las dos salen de mirar por qué la versión anterior
 * gritaba «máquina»:
 *
 * - **Nada se repite a intervalos iguales.** Cinco ruedas equidistantes y treinta
 *   eslabones idénticos son maquinaria por sí solos, independientemente de lo que
 *   representen. Una concreción crece a empujones, así que cada lóbulo tiene su tamaño
 *   y su sitio, sacados de `hash` para que sean siempre los mismos sin ser regulares.
 * - **Las costuras van partidas y desalineadas.** Una ranura recta de lado a lado es
 *   una plancha atornillada. Los estratos de una costra se solapan y se interrumpen.
 */
const calculus = (state: number): BossArt => {
  const w = 160;
  const h = 140;
  // El estado 1 es el que antes levantaba el cañón. Ahora la costra se parte para
  // cargar, así que sigue siendo el aviso del ataque y sigue teniendo dibujo propio.
  const charging = state === 1;

  /**
   * **Terrazas, no elipses.** El primer intento apiló elipses grandes y salió un borrón:
   * a este tamaño dos óvalos que se solapan se funden en una masa sin lectura, y los
   * estratos dibujados por dentro se perdían como ruido. Un depósito se lee por su
   * **contorno escalonado**, así que las capas son escalones de verdad —cada una más
   * estrecha y desplazada respecto a la de abajo— y el escalón ya crea su propio borde.
   */
  /**
   * La pila **se inclina**. Centrada salía una pirámide simétrica, y la simetría es otro
   * rasgo de objeto fabricado: el cálculo se deposita apoyado contra el diente, así que
   * crece hacia un lado y deja el otro despejado. Ese lado despejado es, además, por donde
   * asoma el conducto.
   */
  const layers = [
    { y: 104, x: 6, width: 148, tall: 22 },
    { y: 82, x: 12, width: 124, tall: 24 },
    { y: 61, x: 18, width: 94, tall: 23 },
    { y: 40, x: 24, width: 66, tall: 23 },
    { y: 22, x: 31, width: 42, tall: 20 },
  ];
  const terraces = merge(...layers.map((l) => rect(w, h, l.x, l.y, l.width, l.tall, 5)));

  /**
   * Grietas internas, y no son adorno: **son lo que da relieve**.
   *
   * El sombreado saca la pendiente de la distancia a un borde, así que el interior de una
   * terraza de ciento cuarenta píxeles de ancho queda lejos de todo y sale plano y oscuro
   * —la primera versión tenía la mitad de abajo convertida en una sombra—. Restando grietas
   * se crean bordes por dentro, y con ellos el volumen. Es la misma herramienta con la que
   * el carro de combate separaba sus ruedas; aquí sirve para lo contrario.
   *
   * Cortas, de largos distintos y sin alinearse entre ellas: una grieta que cruza la pieza
   * entera vuelve a ser una junta de montaje.
   */
  const cracks = merge(
    rect(w, h, 22, 114, 34, 2),
    rect(w, h, 68, 111, 25, 2),
    rect(w, h, 104, 117, 30, 2),
    rect(w, h, 41, 120, 18, 2),
    rect(w, h, 88, 122, 22, 2),
    rect(w, h, 30, 92, 27, 2),
    rect(w, h, 74, 88, 33, 2),
    rect(w, h, 112, 95, 24, 2),
    rect(w, h, 38, 71, 22, 2),
    rect(w, h, 84, 68, 26, 2),
    // Y dos casi verticales, para que no todo sea horizontal.
    rect(w, h, 61, 100, 2, 14),
    rect(w, h, 97, 78, 2, 11)
  );

  // El remate: cúspides nodulares de tamaños distintos, que es la firma del cálculo.
  const crest = merge(
    ...[34, 43, 51, 61, 70].map((cx, i) =>
      ellipse(w, h, cx, 20 + jitter(5, cx, i), 5 + hashInt(4, cx, i), 8 + hashInt(7, cx, i + 9))
    )
  );

  /**
   * La falda por la que se agarra al diente.
   *
   * **Aquí había seis bulbos en fila y leían como ruedas**, aunque cada uno tuviera su
   * tamaño: estaban a 25, 28, 26, 29 y 22 píxeles unos de otros, o sea casi equidistantes,
   * y seis lóbulos parecidos alineados a lo largo de una base ancha son un tren de rodaje
   * pase lo que pase. La lección es que la regla no era «que no midan lo mismo», era **que
   * no formen serie**.
   *
   * Así que ahora es un borde **desgarrado**: dos lóbulos grandes y asimétricos que sí
   * cuelgan, y el resto del canto roto a mordiscos de anchos distintos. Ninguna repetición
   * que seguir con la vista.
   */
  const skirt = merge(
    ellipse(w, h, 34, 128, 21, 11),
    ellipse(w, h, 108, 125, 15, 9),
    ellipse(w, h, 137, 122, 10, 6)
  );
  const skirtBites = merge(
    ellipse(w, h, 8, 130, 10, 9),
    ellipse(w, h, 62, 132, 14, 7),
    ellipse(w, h, 86, 129, 8, 8),
    ellipse(w, h, 124, 131, 7, 6),
    ellipse(w, h, 151, 127, 12, 10)
  );

  // Por donde escupe: un reborde a la derecha con una **fisura restada**. Se dibuja
  // quitando material justamente porque no es un tubo montado encima, es una grieta.
  const vent = ellipse(w, h, 137, 72, 20, 13);
  const fissure = merge(
    rect(w, h, 142, 70, 18, 3),
    rect(w, h, 136, 66, 8, 2),
    rect(w, h, 139, 76, 9, 2)
  );

  /**
   * Mordiscos en el canto: lo que separa una costra de una escalera de obra. Cada
   * terraza pierde un trozo por un lado distinto, así que ningún escalón queda recto de
   * punta a punta.
   */
  const bites = merge(
    ellipse(w, h, 14, 101, 11, 8),
    ellipse(w, h, 141, 102, 12, 7),
    ellipse(w, h, 129, 84, 12, 7),
    ellipse(w, h, 22, 64, 9, 7),
    ellipse(w, h, 106, 66, 10, 6),
    ellipse(w, h, 87, 43, 9, 8),
    ellipse(w, h, 32, 27, 7, 6)
  );

  // Al cargar, el remate se **abre**: una grieta lo parte y por ella se ve la cavidad.
  // Es lo que sustituye al cañón levantándose.
  const split = charging
    ? merge(rect(w, h, 49, 14, 6, 26), wedge(w, h, 40, 14, 18, 11, 'tl'))
    : blank(w, h);

  const mask = subtract(
    merge(terraces, crest, skirt, vent),
    merge(cracks, bites, skirtBites, fissure, split)
  );

  return {
    w,
    h,
    material: 'tartarCrust',
    mask,
    detail: stamp(
      // Un solo ojo, como tenía, hundido entre dos capas. Se enciende al cargar.
      stamp(crust(w, h), eyeBlock(20, 14, charging), 44, 45),
      // Y al cargar, la cavidad abierta: oscura por dentro y caliente en el borde.
      charging ? throat(18, 26) : blank(0, 0),
      41,
      15
    ),
  };
};

/**
 * La textura de la costra: grano que brilla, picaduras, vetas y **esmalte asomando**.
 *
 * El esmalte es la parte que la ata a una boca: el sarro no es una piedra suelta, es una
 * capa **sobre un diente**, y verlo asomar por los huecos es lo que lo cuenta sin
 * escribirlo. Va con `hash` y no con `Math.random`, porque el arte se hornea una vez: con
 * azar de verdad, cada partida tendría una costra distinta y no habría forma de volver a
 * la que se vio.
 *
 * La densidad se modula por franjas horizontales para que el grano refuerce los estratos
 * en vez de pelearse con ellos.
 */
const crust = (w: number, h: number): string[] =>
  Array.from({ length: h }, (_, y) => {
    // Franjas: el depósito es más basto en unas capas que en otras.
    const band = 0.86 + Math.sin(y * 0.42) * 0.05;
    let row = '';
    for (let x = 0; x < w; x++) {
      const n = hash(x * 0.83, y * 1.31, 41);
      if (n > 0.988) row += 'T';
      else if (n > 0.966) row += 'M';
      else if (n > 0.93) row += 'H';
      else if (n > band) row += 'S';
      else row += '.';
    }
    return row;
  });

/**
 * Convierte una silueta en una mancha de detalle del carácter que se le diga.
 *
 * Deja usar las mismas primitivas de forma para el detalle que para la máscara, que es cómo se
 * dibuja una caries —una elipse oscura— sin escribirla a mano fila por fila.
 */
const tint = (shape: readonly string[], ch: string): string[] =>
  shape.map((row) => row.replace(/#/g, ch));

/**
 * Grano de superficie: motas deterministas con la mezcla de caracteres que se le pida.
 *
 * Es lo que separa un cuerpo con superficie de un degradado liso, y era lo que les faltaba a
 * los seis jefes: todos tenían una cara sobre un cuerpo vacío. `levels` va de umbral más alto
 * a más bajo, así que lo escaso se escribe primero.
 *
 * Con `hash` y no con `Math.random`: el arte se hornea una vez, y con azar de verdad cada
 * partida tendría un jefe con otra piel y no habría forma de volver a la que se vio.
 */
const grain = (
  w: number,
  h: number,
  seed: number,
  levels: readonly (readonly [number, string])[]
): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      const n = hash(x * 0.83, y * 1.31, seed);
      const hit = levels.find(([threshold]) => n > threshold);
      row += hit ? hit[1] : '.';
    }
    return row;
  });

/**
 * Pozo: anillos que se oscurecen hacia el centro.
 *
 * Un disco relleno con un ojo en medio se lee como una moneda. Oscureciendo hacia dentro se
 * lee como un hueco, que es lo que la deidad tenía que ser.
 */
const well = (w: number, h: number, cx: number, cy: number, radius: number): string[] =>
  Array.from({ length: h }, (_, y) => {
    let row = '';
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d > 1 || d < 0.32) row += '.';
      else if (d > 0.74) row += 'S';
      else row += 'M';
    }
    return row;
  });

/** La cavidad que se abre al cargar: negra dentro, con el borde al rojo. */
const throat = (width: number, height: number): string[] =>
  Array.from({ length: height }, (_, y) => {
    const t = y / Math.max(1, height - 1);
    // Se estrecha hacia dentro, como una grieta y no como un agujero taladrado.
    const half = Math.round((width / 2) * (1 - t * 0.75));
    let row = '';
    for (let x = 0; x < width; x++) {
      const d = Math.abs(x - (width - 1) / 2);
      if (d > half) row += '.';
      else if (d > half - 1.5) row += 'R';
      else row += 'M';
    }
    return row;
  });

/**
 * Aquí vivían `rivets` y `hatch` —una fila de remaches y una escotilla con bisagra— y se
 * han ido con el carro de combate al que servían. Eran las dos piezas de vocabulario
 * puramente mecánico del fichero, y no las usaba nadie más.
 */

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

  /**
   * Se llama Gingivitis y su cuerpo no lo decía: tenía estrella y medallas —era el más poblado
   * de los seis— pero la carne era degradado liso.
   *
   * Lo que hace que un tejido se lea **inflamado** son dos cosas: **pliegues** donde la piel no
   * da más de sí, y un **brillo tenso**, porque una encía hinchada está estirada y reluce. Los
   * pliegues van cortos y desalineados: una línea que cruza la cara entera es una cicatriz.
   */
  const inflamed = merge(
    tint(rect(w, h, 24, 44, 19, 2), 'S'),
    tint(rect(w, h, 57, 41, 17, 2), 'S'),
    tint(rect(w, h, 28, 72, 23, 2), 'S'),
    tint(rect(w, h, 59, 75, 15, 2), 'S'),
    tint(rect(w, h, 30, 116, 21, 2), 'S'),
    tint(rect(w, h, 54, 124, 18, 2), 'S'),
    tint(ellipse(w, h, 33, 47, 9, 5), 'H'),
    tint(ellipse(w, h, 67, 63, 6, 4), 'H'),
    tint(ellipse(w, h, 40, 106, 7, 4), 'H')
  );

  return {
    w,
    h,
    material: 'grunt',
    mask,
    detail: stamp(
      stamp(
        stamp(
          stamp(
            stamp(grain(w, h, 53, [[0.955, 'S']]), inflamed, 0, 0),
            eyeBlock(20, 13, angry),
            22,
            50
          ),
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
    /**
     * Era **un ojo de 24×18 sobre ciento cuarenta por ciento cuarenta**, o sea el jefe más
     * vacío del juego con diferencia: el resto del cuerpo era degradado liso.
     *
     * Ahora lleva tres capas. El **pozo** oscurece hacia el centro para que el disco se lea
     * como un hueco y no como una moneda. Las **esquirlas de esmalte** (`T`) son lo único
     * dental que esta variante tenía: es una entidad abstracta, y sembrarle fragmentos de
     * diente en órbita la ata a la boca en la que está. Y el grano fino le da superficie.
     */
    detail: stamp(
      stamp(
        /**
         * Grano **claro**, no oscuro. La rampa `void` ya es casi negra —de `#04040c` a
         * `#7d7dd0`—, así que sembrarla de motas oscuras solo la enturbia: el primer intento
         * convirtió una flor de seis pétalos en un disco sucio. Lo que se ve sobre negro son
         * los brillos y las esquirlas de esmalte.
         */
        grain(w, h, 7, [
          [0.972, 'T'],
          [0.9, 'H'],
        ]),
        /**
         * Y el pozo va **ceñido al núcleo**. Con radio 64 cubría el sprite entero y les comía
         * el volumen a los pétalos, que es justo lo que hacía legible a esta variante.
         */
        well(w, h, 70, 70, 38),
        0,
        0
      ),
      eyeBlock(24, 18, state !== 0 || phase === 2),
      58,
      60
    ),
  };
};

// ---------------------------------------------------------------------------
// Guardián del Juicio: 120×140. Cordal dorado con tercer ojo.
// ---------------------------------------------------------------------------

/**
 * Como el fantasma, **atacaba con la cara de esperar**: `warden()` no recibía el estado.
 *
 * Su estado 2 es la lluvia de orbes de juicio, y ahora se ve venir: los dos ojos cerrados **se
 * abren**. Un juez que sentencia con los ojos cerrados no dice nada; abriéndolos, el ataque
 * tiene lectura y encima cuenta algo del personaje.
 */
const warden = (state: number): BossArt => {
  const w = 120;
  const h = 140;
  const judging = state === 2;

  const crown = merge(ellipse(w, h, 60, 54, 46, 44), rect(w, h, 16, 40, 88, 46));
  const roots = merge(rect(w, h, 26, 84, 26, 50, 8), rect(w, h, 66, 84, 26, 50, 8));
  const halo = subtract(ellipse(w, h, 60, 30, 40, 14), ellipse(w, h, 60, 30, 32, 8));

  /**
   * Las raíces de un cordal van **retorcidas**, que es media razón de que haya que sacarlo.
   * Dos vetas oscuras en cada una, desviadas, y el oro de su rampa como incrustación en las
   * grietas en vez de como color de relleno.
   */
  const rootVeins = merge(
    tint(rect(w, h, 34, 90, 2, 40), 'S'),
    tint(rect(w, h, 41, 100, 2, 30), 'S'),
    tint(rect(w, h, 74, 94, 2, 36), 'S'),
    tint(rect(w, h, 81, 88, 2, 26), 'S'),
    tint(rect(w, h, 30, 116, 8, 2), 'M'),
    tint(rect(w, h, 78, 108, 9, 2), 'M')
  );
  const inlay = merge(
    tint(rect(w, h, 28, 60, 20, 2), 'Y'),
    tint(rect(w, h, 74, 66, 18, 2), 'Y'),
    tint(rect(w, h, 44, 44, 2, 12), 'Y')
  );

  return {
    w,
    h,
    material: 'warden',
    mask: merge(halo, crown, roots),
    detail: stamp(
      stamp(
        stamp(
          stamp(
            stamp(grain(w, h, 31, [[0.96, 'S']]), rootVeins, 0, 0),
            inlay,
            0,
            0
          ),
          judging ? eyeBlock(18, 13, true) : closedEye(18),
          24,
          judging ? 66 : 68
        ),
        judging ? eyeBlock(18, 13, true) : closedEye(18),
        78,
        judging ? 66 : 68
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
      return phantom(state);
    case 'calculus':
      return calculus(state);
    case 'general':
      return general(state);
    case 'deity':
      return deity(phase, state);
    case 'wisdom_warden':
      return warden(state);
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
  'calculus',
  'general',
  'deity',
  'wisdom_warden',
] as const;

/** `shift` se reexporta porque las máscaras de jefe lo usan al componer. */
export { shift };
