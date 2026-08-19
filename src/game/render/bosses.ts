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

  /**
   * Un molar **desgastado**, y el desgaste va en la silueta.
   *
   * Las manchas de caries de la capa de detalle ya estaban, pero la forma seguía siendo un
   * diente sano: dos cúspides iguales, lisas y simétricas, sobre dos raíces gemelas. Un diente
   * que lleva años perdiendo la batalla no tiene esa forma, y a esta escala lo que cuenta la
   * historia es el **contorno**, no el color.
   *
   * Las dos cúspides son ahora de **alturas distintas** y la izquierda está más baja y más
   * plana, que es como se desgasta un molar: por donde muerde.
   */
  const crown = merge(
    ellipse(w, h, 38, 63, 37, 41),
    ellipse(w, h, 80, 58, 36, 44),
    rect(w, h, 6, 48, 108, 58)
  );

  /**
   * Lo que le quita material: mordiscos en el borde de mordida, un **astillado** en la esquina
   * y una **cavidad abierta de verdad** en la cúspide izquierda.
   *
   * La cavidad es el elemento clave: una mancha oscura se lee como suciedad, pero un agujero
   * recortado en la silueta se lee como caries. Y en el fondo del agujero, en la capa de
   * detalle, va el tono más oscuro para que tenga hondura.
   */
  /**
   * El desgaste tiene que morder **el contorno**, y ahí está la trampa que me costó una
   * iteración: la primera tanda de mordiscos cayó donde la corona real ya tapa el diente, con lo
   * que no cambió una silueta que seguía siendo un rectángulo redondeado. Un rasgo que no
   * sobresale del contorno no existe.
   *
   * Así que los mordiscos van a los **costados y a la base**, a alturas distintas en cada lado
   * —una erosión simétrica no es erosión—, y la cavidad es un **agujero de verdad** en el faldón,
   * lejos de los ojos y de la boca para no dejarlo tuerto por accidente.
   */
  const wear = merge(
    // Costado izquierdo comido a media altura, y el derecho más abajo.
    ellipse(w, h, 4, 68, 13, 16),
    ellipse(w, h, 116, 88, 12, 14),
    // Y dos muescas menores, para que el canto no quede en dos curvas limpias.
    ellipse(w, h, 10, 96, 9, 8),
    ellipse(w, h, 110, 58, 8, 9),
    // El astillado de la esquina de arriba a la derecha: un trozo que salta y se va.
    wedge(w, h, 98, 20, 22, 20, 'tr'),
    // La cavidad: un agujero abierto en el faldón, bajo el ojo izquierdo.
    ellipse(w, h, 22, 88, 9, 8)
  );

  /**
   * Raíces **desiguales y reabsorbidas**: una más corta, más fina y con la punta comida, que es
   * lo que le pasa a una raíz enferma. Dos raíces gemelas de treinta y dos por cincuenta y
   * cuatro eran dos patas de mesa.
   */
  const roots = merge(
    rect(w, h, 19, 100, 31, 52, 10),
    rect(w, h, 70, 100, 26, 44, 9),
    // Una tercera raíz corta y pegada, para romper la pareja.
    rect(w, h, 52, 104, 16, 30, 7)
  );
  const rootWear = merge(
    ellipse(w, h, 22, 152, 10, 9),
    ellipse(w, h, 84, 145, 9, 8),
    ellipse(w, h, 60, 135, 7, 7)
  );

  /**
   * La corona de rey, **abollada**: la punta de la derecha está partida y el aro se hunde por
   * ese lado. Un rey en decadencia con la corona intacta no cuenta lo mismo, y es el detalle
   * que ata el desgaste al personaje en vez de solo al diente.
   */
  const regalia = merge(
    rect(w, h, 24, 18, 72, 14),
    spike(w, h, 32, 2, 18, 10),
    spike(w, h, 60, 0, 18, 12),
    // La tercera punta, roma: lo que queda de ella.
    rect(w, h, 84, 8, 10, 10, 2)
  );
  const regaliaWear = merge(ellipse(w, h, 93, 20, 8, 7), rect(w, h, 44, 16, 6, 4));

  // Costuras: la base de la corona de rey y el cuello entre corona y raíces, más
  // el surco entre las dos cúspides. Sin ellas es un bulto único.
  const seams = merge(
    rect(w, h, 22, 32, 76, 2),
    rect(w, h, 18, 98, 84, 2),
    // El surco central va desviado, porque las cúspides ya no son iguales.
    rect(w, h, 56, 20, 4, 32)
  );

  const mask = subtract(
    merge(crown, roots, regalia),
    merge(seams, wear, rootWear, regaliaWear)
  );

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

  /**
   * **Era simétrico**, y eso es lo que lo hacía leerse como un icono y no como un ser: una
   * campana centrada con cinco jirones idénticos a intervalos de dieciocho píxeles.
   *
   * Ahora la campana está **descentrada** —el bulto carga hacia la izquierda y una joroba
   * asoma por el hombro derecho— y lo que cuelga son **tentáculos de largos distintos**, no un
   * fleco. Es placa: se estira en hebras, no en un dobladillo.
   */
  // `lean` y no `shift`: `shift` es una primitiva de forma que este módulo importa y reexporta,
  // y taparla con un número dentro de una función es la clase de sombra que muerde más tarde.
  const lean = gathering ? 4 : 0;
  const body = merge(
    ellipse(w, h, 46 + lean, 44, gathering ? 31 : 39, gathering ? 45 : 41),
    // La joroba del hombro: rompe la campana sin sacarla de su caja.
    ellipse(w, h, 72, 34, gathering ? 13 : 18, gathering ? 12 : 15),
    rect(w, h, gathering ? 19 : 9, 44, gathering ? 62 : 78, 40)
  );

  /**
   * Los tentáculos: cada uno una columna de elipses que se estrechan al bajar, con su propio
   * largo, su propia deriva lateral y su propio grosor. La deriva es lo que los curva, y sin
   * curva un tentáculo es un carámbano.
   */
  const arms: readonly { x: number; reach: number; thick: number; drift: number }[] = gathering
    ? [
        { x: 34, reach: 3, thick: 6, drift: -2 },
        { x: 49, reach: 5, thick: 7, drift: 0 },
        { x: 62, reach: 2, thick: 5, drift: 2 },
      ]
    : [
        { x: 17, reach: 5, thick: 8, drift: -3 },
        { x: 36, reach: 3, thick: 6, drift: 2 },
        { x: 52, reach: 7, thick: 9, drift: 3 },
        { x: 70, reach: 4, thick: 7, drift: -2 },
        { x: 85, reach: 2, thick: 5, drift: 3 },
      ];
  /**
   * **Arrancan en el canto del cuerpo, no dentro de él**, y esa es la corrección que costó una
   * pasada: puestos a `y = 74` quedaban enterrados bajo la campana —que llega a 85— y solo
   * asomaban unos muñones. Un rasgo que no sobresale del contorno no existe.
   *
   * El paso y el alcance están calculados para que el más largo acabe dentro de los cien píxeles:
   * si se pasa, `ellipse` lo recorta y queda con la punta plana, que es el dobladillo recto que
   * había antes con otro nombre.
   */
  const tentacles = merge(
    ...arms.flatMap((arm) =>
      Array.from({ length: arm.reach }, (_, k) =>
        ellipse(
          w,
          h,
          arm.x + Math.round(arm.drift * k * 0.9),
          81 + k * 3,
          Math.max(2, arm.thick - Math.round(k * 0.9)),
          Math.max(2, arm.thick - k + 2)
        )
      )
    )
  );

  const mask = merge(body, tentacles);

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
 * Aquí vivía `well`, que oscurecía en anillos hacia el centro para que un disco relleno no se
 * leyera como una moneda. Se ha ido con el problema que resolvía: la deidad ya no es un disco.
 * Y sobre una rampa casi negra el remedio era peor que la enfermedad, porque borraba el núcleo.
 */

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

  /**
   * **Era demasiado circular**: un núcleo redondo, seis pétalos idénticos a la misma distancia
   * y un anillo perfecto. Tres circunferencias concéntricas se leen como un diagrama.
   *
   * Sigue siendo radial —es su identidad, y su ataque de fase 2 gira— pero cada elemento tiene
   * ahora su propia medida. El **núcleo** deja de ser un círculo: son tres óvalos desalineados.
   * Los **pétalos** varían de radio orbital y de tamaño. Y el **anillo se rompe**: le faltan
   * tramos, tiene grosor desigual y lleva esquirlas sueltas por fuera.
   */
  const core = merge(
    ellipse(w, h, 70, 70, 26, 22),
    ellipse(w, h, 64, 65, 19, 20),
    ellipse(w, h, 77, 76, 15, 16)
  );

  /**
   * **Los pétalos son el contorno.** El primer arreglo mantuvo el anillo exterior y solo le
   * quitó bocados, y salió peor: los pétalos crecidos llegaron a tocarlo, el hueco entre ambos
   * se rellenó y la pieza acabó siendo un **donut con radios** —más circular que antes, no
   * menos—. Un aro cerrado siempre gana al resto de la forma, porque define el borde él solo.
   *
   * Sin aro, lo que dibuja el canto son seis lóbulos de tamaños y órbitas distintas, y el canto
   * sale desigual sin dejar de ser radial, que es su identidad y lo que su ataque de fase 2 gira.
   */
  const petals = merge(
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const angle = (Math.PI * 2 * i) / 6 + (phase === 2 ? Math.PI / 6 : 0);
      // Distancia y tamaño propios de cada pétalo, siempre los mismos y nunca iguales.
      const orbit = 38 + hashInt(13, i, 3);
      const size = 15 + hashInt(11, i, 7);
      return ellipse(
        w,
        h,
        70 + Math.cos(angle) * orbit,
        70 + Math.sin(angle) * orbit,
        size,
        size - hashInt(6, i, 13)
      );
    })
  );

  /**
   * Del aro solo quedan **dos arcos sueltos**, en lados distintos y de grosores distintos: restos
   * de algo que fue circular. Cerrarlos otra vez sería volver al donut.
   */
  const arcs = merge(
    ...[
      { from: 2.5, to: 4.1, radius: 62, thick: 7 },
      { from: 5.6, to: 6.5, radius: 58, thick: 5 },
    ].flatMap((arc) =>
      Array.from({ length: 14 }, (_, k) => {
        const angle = arc.from + ((arc.to - arc.from) * k) / 13;
        return ellipse(
          w,
          h,
          70 + Math.cos(angle) * arc.radius,
          70 + Math.sin(angle) * arc.radius,
          arc.thick,
          arc.thick
        );
      })
    )
  );

  // Y esquirlas desprendidas, en tres sitios cualesquiera.
  const debris = merge(
    ellipse(w, h, 121, 44, 6, 5),
    ellipse(w, h, 24, 100, 5, 6),
    ellipse(w, h, 92, 126, 4, 4)
  );
  const ring = merge(arcs, debris);

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
         * El pozo se ha ido. Estaba para que un disco relleno no se leyera como una moneda, y
         * ese problema lo resuelve ahora la propia forma irregular. Sobre `void` —que va de
         * `#04040c` a `#7d7dd0`— oscurecer el centro **borraba el núcleo**: quedaba un agujero
         * negro con el ojo flotando dentro. Un remedio que ya no hace falta y que costaba la
         * pieza central.
         */
        blank(w, h),
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

  /**
   * **Era simétrico de arriba abajo**: corona centrada, dos raíces gemelas de veintiséis por
   * cincuenta y un halo perfectamente redondo. Un cordal es justo lo contrario —es el diente que
   * sale torcido, con las raíces fusionadas y desiguales, y por eso hay que sacarlo—.
   *
   * Tres cambios: la corona se **inclina**, las raíces son **tres y retorcidas**, y le salen
   * **alas** por los costados, que es lo que un juez con halo pedía.
   */
  /**
   * La corona **encoge** para dejar sitio arriba y a los lados.
   *
   * Antes era una elipse de radio 44×43 centrada en `(57, 54)`, o sea de `y = 11` a `y = 97`: se
   * tragaba el halo, que va a `y = 28`, y se tragaba el lóbulo y las alas. Todo lo que añadí caía
   * dentro de ella y no cambiaba el contorno. Bajándola y afinándola, los tres rasgos asoman.
   */
  const crown = merge(
    ellipse(w, h, 56, 62, 41, 34),
    // Un lóbulo alto a la derecha, por encima del canto de la corona: no acaba plana.
    ellipse(w, h, 84, 38, 19, 16),
    rect(w, h, 16, 48, 82, 38)
  );

  /**
   * Las alas: dos flancos de tres plumas, **distintos entre sí**. La izquierda está más plegada
   * y la derecha más abierta, porque dos alas iguales vuelven a ser un icono.
   */
  const wings = merge(
    ...[
      // Ala izquierda, plegada: tres plumas cortas.
      { x: 10, y: 56, long: 20, tall: 6 },
      { x: 6, y: 66, long: 24, tall: 5 },
      { x: 11, y: 75, long: 17, tall: 4 },
      // Y la derecha, abierta: más larga y más separada.
      { x: 104, y: 50, long: 26, tall: 7 },
      { x: 108, y: 62, long: 30, tall: 6 },
      { x: 111, y: 73, long: 22, tall: 5 },
    ].map((f) => ellipse(w, h, f.x, f.y, f.long / 2, f.tall))
  );

  /**
   * Tres raíces, de largos y grosores distintos, y cada una **desviada** hacia un lado. La
   * desviación es lo que las retuerce: dos rectángulos verticales gemelos eran dos patas.
   */
  const roots = merge(
    ...[
      { x: 24, top: 84, wide: 24, tall: 50, bend: -5 },
      { x: 52, top: 88, wide: 17, tall: 38, bend: 3 },
      { x: 72, top: 84, wide: 22, tall: 44, bend: 6 },
    ].flatMap((r) =>
      // Cada raíz son tres tramos que se van desplazando: la curva sale del apilado.
      [0, 1, 2].map((k) =>
        rect(
          w,
          h,
          r.x + Math.round((r.bend * k) / 2),
          r.top + Math.round((r.tall * k) / 3),
          Math.max(6, r.wide - k * 4),
          Math.round(r.tall / 3) + 4,
          5
        )
      )
    )
  );

  // El halo, ladeado y de grosor desigual: uno perfecto es una anilla de metal.
  const halo = subtract(
    ellipse(w, h, 58, 28, 41, 14),
    ellipse(w, h, 61, 30, 32, 8)
  );

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
    mask: merge(halo, wings, crown, roots),
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
