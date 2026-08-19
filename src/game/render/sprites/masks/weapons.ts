import type { Projectile, WeaponType } from '../../../../types';
import type { Material } from '../../../data/palette';
import {
  blank,
  ellipse,
  rect,
  merge,
  subtract,
  stamp,
  annulus,
  fit,
  spike,
  wedge,
  rotate90,
} from './shapes';

/**
 * Arte de proyectiles, armas en mano y objetos.
 *
 * Todo se compone con las primitivas de forma y se sombrea con la rampa del
 * material, igual que enemigos y jefes. Antes esto era lo único del render que
 * seguía siendo vectorial: degradados, `shadowBlur` y `arc()`.
 *
 * Los proyectiles cambian de tamaño con el nivel del arma —el láser va de 4 a 20 px
 * de grosor y el cepillo de 60 a 200—, así que las máscaras se generan a la medida
 * que pide el proyectil y se hornean por tamaño.
 */

export interface ProjectileArt {
  mask: readonly string[];
  material: Material;
  /** Capa de detalle opcional. `C` es el núcleo caliente. */
  detail?: readonly string[];
}

/** Un núcleo brillante centrado, del tamaño que se le pida. */
const core = (w: number, h: number, rx: number, ry: number): string[] =>
  ellipse(w, h, w / 2, h / 2, rx, ry).map((row) => row.replace(/#/g, 'C'));

/**
 * El huso y la media luna que había aquí se han retirado.
 *
 * Los dos eran formas **genéricas** —una lente simétrica y un aro recortado— y ninguna
 * decía de qué herramienta venía el golpe: al hacer clic, el látigo parecía una hoja, el
 * cepillo una cuchilla y la guadaña un aro. Los tres golpes se dibujan ahora como el útil
 * que son (`lash`, `brushHead`, `reapBlade`), que es más código y bastante menos elegante,
 * pero es lo único que los hace reconocibles.
 */

/** Una rejilla mutable del tamaño pedido, para dibujar píxel a píxel. */
const grid = (w: number, h: number): string[][] =>
  Array.from({ length: h }, () => new Array<string>(w).fill('.'));

const done = (rows: string[][]): string[] => rows.map((r) => r.join(''));

const put = (rows: string[][], x: number, y: number, ch: string): void => {
  if (y >= 0 && y < rows.length && x >= 0 && x < rows[0].length) rows[y][x] = ch;
};

/**
 * Un golpe de **cepillo**: la cabeza con sus mechones, no un arco de acero.
 *
 * Lo que se dibujaba era una media luna con unas marcas encima, y una media luna es una
 * cuchilla: al hacer clic no se veía un cepillo por ninguna parte. Un cepillo se reconoce
 * por dos cosas y solo por dos: **una cabeza alargada de plástico** y **mechones densos
 * saliendo de un lado**. Así que eso es lo que hay.
 *
 * La caja del golpe es estrecha a lo radial y larga a lo tangencial, así que la cabeza va
 * de largo a lo largo del barrido y las cerdas salen por el canto de fuera —el que va por
 * delante—, con puntas desiguales, que es lo que las distingue de un peine.
 */
const brushHead = (w: number, h: number): { mask: string[]; detail: string[] } => {
  const mask = grid(w, h);
  const detail = grid(w, h);
  // El dorso de plástico se lleva el tercio interior; las cerdas, el resto.
  const back = Math.max(3, Math.round(w * 0.36));
  const taper = Math.max(1, Math.round(h * 0.12));

  for (let y = 0; y < h; y++) {
    // Los extremos de la cabeza se redondean: un rectángulo recto parece una tablilla.
    const edgeIn = y < taper ? taper - y : y >= h - taper ? y - (h - taper) + 1 : 0;
    for (let x = edgeIn; x < back; x++) put(mask, x, y, '#');

    // Mechones: dos filas de cerda y una de hueco, con largos alternos.
    if (y % 3 === 2 || edgeIn > 0) continue;
    const long = (y >> 1) % 2 === 0;
    const reach = back + Math.round((w - back) * (long ? 1 : 0.7));
    for (let x = back; x < reach; x++) {
      put(mask, x, y, '#');
      put(detail, x, y, 'C');
    }
  }
  return { mask: done(mask), detail: done(detail) };
};

/**
 * Un **latigazo**: una hebra que se curva, se afina y acaba deshilachada.
 *
 * Antes era un huso —una lente simétrica y gorda— y al hacer clic parecía una hoja, no un
 * látigo. Lo que hace que una cuerda se lea como látigo es la **curva**: gruesa donde
 * nace, fina donde acaba, y con la punta abierta en hebras.
 */
const lash = (w: number, h: number): { mask: string[]; detail: string[] } => {
  const mask = grid(w, h);
  const detail = grid(w, h);
  const vertical = h > w;
  const along = vertical ? h : w;
  const across = vertical ? w : h;
  const mid = across / 2;

  for (let i = 0; i < along; i++) {
    const t = i / Math.max(1, along - 1);
    // La curva: un solo lóbulo, que es un chasquido y no una onda.
    const bend = Math.sin(t * Math.PI) * (mid - 1);
    // Y el grosor, que se va a nada hacia la punta.
    const thick = Math.max(1, Math.round((1 - t) * (across * 0.22) + 1));
    const centre = Math.round(mid + bend * (vertical ? -1 : 1));

    for (let d = -thick; d <= thick; d++) {
      const c = centre + d;
      if (vertical) put(mask, c, i, '#');
      else put(mask, i, c, '#');
    }
    // El núcleo brillante recorre la hebra: es energía, no cuerda.
    if (vertical) put(detail, centre, i, 'C');
    else put(detail, i, centre, 'C');
  }

  // El deshilachado de la punta: tres hebras abiertas en abanico.
  const tip = along - 1;
  for (const spread of [-1, 0, 1]) {
    for (let k = 0; k < Math.max(2, Math.round(across * 0.22)); k++) {
      const i = tip - k;
      const t = i / Math.max(1, along - 1);
      const centre = Math.round(mid + Math.sin(t * Math.PI) * (mid - 1) * (vertical ? -1 : 1));
      const c = centre + spread * (k + 1);
      if (vertical) {
        put(mask, c, i, '#');
        put(detail, c, i, 'C');
      } else {
        put(mask, i, c, '#');
        put(detail, i, c, 'C');
      }
    }
  }
  return { mask: done(mask), detail: done(detail) };
};

/**
 * Una **hoja de guadaña**: ancha donde nace y en gancho donde acaba.
 *
 * El anillo recortado que había antes es simétrico, y una hoja simétrica no es una hoja: es
 * un aro. Lo que la lee como guadaña es que **se estreche** de la base a la punta y que la
 * punta se cierre hacia dentro. El filo claro va por el canto interior, que es el que corta.
 */
const reapBlade = (w: number, h: number): { mask: string[]; detail: string[] } => {
  const mask = grid(w, h);
  const detail = grid(w, h);

  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1);
    // La curva del lomo: sale del canto de dentro y se va al de fuera.
    const spine = Math.sin(t * Math.PI) * (w - 2);
    // Y el grosor: gruesa abajo, un filo arriba. El gancho vuelve a engordar al final.
    const hook = t > 0.86 ? (t - 0.86) / 0.14 : 0;
    const thick = Math.max(2, Math.round((1 - t) * w * 0.42 + 2 + hook * w * 0.3));
    const from = Math.round(Math.max(0, spine - thick));

    for (let x = from; x < Math.min(w, from + thick); x++) put(mask, x, y, '#');
    // El filo, en el canto interior.
    put(detail, from, y, 'C');
  }
  return { mask: done(mask), detail: done(detail) };
};

export const projectileArt = (
  type: Projectile['projectileType'],
  w: number,
  h: number,
  owner: Projectile['owner']
): ProjectileArt => {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));

  switch (type) {
    /**
     * El rayo del bláster: núcleo caliente con **cola**.
     *
     * Era una elipse con un punto en medio, o sea una canica. La cola es lo que dice hacia
     * dónde va y que es energía y no un objeto: se estrecha por detrás, como una gota
     * lanzada al revés.
     */
    case 'laser': {
      const head = ellipse(W, H, W * 0.62, H / 2, W * 0.38, H / 2);
      // La cola: un triángulo que se afila hacia atrás, hecho con dos biseles en vez de
      // rotar nada, que a estos tamaños es más exacto.
      const trail = subtract(
        rect(W, H, 0, 0, Math.round(W * 0.64), H),
        merge(
          wedge(W, H, 0, 0, Math.round(W * 0.64), Math.ceil(H / 2), 'tl'),
          wedge(W, H, 0, Math.floor(H / 2), Math.round(W * 0.64), Math.ceil(H / 2), 'bl')
        )
      );
      return {
        mask: merge(head, trail),
        material: 'laser',
        detail: core(W, H, Math.max(1, W * 0.24), Math.max(1, H * 0.3)),
      };
    }

    case 'wave': {
      // Onda: media luna abierta, como el frente de un chorro.
      const body = ellipse(W, H, W / 2, H / 2, W / 2, H / 2);
      const bite = ellipse(W, H, W * 0.18, H / 2, W * 0.42, H * 0.4);
      return { mask: subtract(body, bite), material: 'wave' };
    }

    /**
     * El latigazo de seda. Ver `lash`: la curva y el deshilachado son lo que lo leen como
     * látigo; el huso simétrico que había antes parecía una hoja.
     */
    case 'floss': {
      const art = lash(W, H);
      return { mask: art.mask, material: 'laser', detail: art.detail };
    }

    /**
     * El barrido de la espada: media luna **con cerdas**.
     *
     * La media luna sola era un arco de acero cualquiera. Lo que dice que es un cepillo son
     * las cerdas peinando el canto exterior, y a este tamaño se leen como mechones cortos y
     * separados, no como un relleno: relleno, el arco vuelve a ser una cuchilla.
     */
    case 'sword': {
      const art = brushHead(W, H);
      return { mask: art.mask, material: 'melee', detail: art.detail };
    }

    /**
     * El barrido de la guadaña: media luna **más fina y con gancho**.
     *
     * Sin este caso caía en el dibujo de bala por defecto —una elipse rellena—, así que el
     * golpe más contundente del juego se veía como un borrón. Y el gancho del extremo es lo
     * que la ata a la cureta dental de la que sale: sin él es una hoz.
     */
    case 'reap': {
      const art = reapBlade(W, H);
      return { mask: art.mask, material: 'metal', detail: art.detail };
    }

    /**
     * La flecha: punta, astil y plumas.
     *
     * Tampoco tenía caso propio, así que era una elipse de catorce por cuatro —un guion—.
     * Con las tres piezas se lee de qué arma viene incluso a esta escala, y **hacia dónde
     * va**, que es lo que importa en un proyectil que atraviesa la fila.
     */
    case 'arrow': {
      const vertical = H > W;
      const long = vertical ? H : W;
      const thick = Math.max(2, Math.round((vertical ? W : H) * 0.5));
      const headLen = Math.max(3, Math.round(long * 0.28));

      const shaft = vertical
        ? rect(W, H, Math.round((W - thick) / 2), headLen, thick, long - headLen)
        : rect(W, H, 0, Math.round((H - thick) / 2), long - headLen, thick);
      // La punta, en cuña hacia donde vuela.
      const head = vertical
        ? spike(W, H, Math.round(W / 2), 0, headLen, Math.round(W / 2))
        : rotate90(spike(H, W, Math.round(H / 2), 0, headLen, Math.round(H / 2)));
      // Y las plumas, dos muescas en la cola.
      const fletch = vertical
        ? rect(W, H, 0, H - 3, W, 2)
        : rect(W, H, 0, 0, 3, H);
      return {
        mask: merge(shaft, head, fletch),
        material: 'wood',
        detail: core(W, H, Math.max(1, W * 0.2), Math.max(1, H * 0.2)),
      };
    }

    case 'mortar':
    case 'acid': {
      // Gota lanzada: cuerpo redondo con la cola hacia arriba.
      const body = ellipse(W, H, W / 2, H * 0.58, W / 2, H * 0.42);
      const tail = rect(W, H, Math.round(W * 0.38), 0, Math.max(1, Math.round(W * 0.24)), Math.round(H * 0.4), 1);
      return { mask: merge(body, tail), material: type === 'acid' ? 'acid' : 'plaque' };
    }

    case 'sludge':
      // Salpicadura: ancha y baja, pegada al suelo.
      return {
        mask: merge(
          ellipse(W, H, W / 2, H * 0.68, W / 2, H * 0.32),
          ellipse(W, H, W * 0.28, H * 0.5, W * 0.16, H * 0.2),
          ellipse(W, H, W * 0.74, H * 0.52, W * 0.14, H * 0.18)
        ),
        material: 'sludge',
      };

    case 'judgment_orb':
      return {
        mask: merge(
          ellipse(W, H, W / 2, H / 2, W * 0.34, H * 0.34),
          annulus(W, H, W / 2, H / 2, W / 2, H / 2, 2)
        ),
        material: 'warden',
      };

    /**
     * El frasco de enjuague: cuerpo bulboso, cuello estrecho y tapón.
     *
     * Se lee como frasco y no como piedra por el **cuello**: sin ese estrechamiento arriba
     * era una bola y no había forma de saber qué era lo que volaba por el aire.
     */
    case 'flask': {
      const body = ellipse(W, H, W / 2, H * 0.64, W * 0.46, H * 0.36);
      const neck = rect(W, H, Math.round(W * 0.38), Math.round(H * 0.2), Math.round(W * 0.24), Math.round(H * 0.2));
      const cap = rect(W, H, Math.round(W * 0.32), Math.round(H * 0.1), Math.round(W * 0.36), Math.max(2, Math.round(H * 0.12)));
      // La mecha, saliendo del tapón hacia un lado: es lo que avisa de que va a estallar.
      const fuse = rect(W, H, Math.round(W * 0.62), 0, Math.max(1, Math.round(W * 0.1)), Math.max(2, Math.round(H * 0.14)));
      /**
       * El detalle marca **la línea del líquido** y la chispa de la mecha.
       *
       * Con solo un núcleo centrado el frasco parecía una piedra clara. La línea horizontal
       * es lo que lo llena de algo, y la chispa lo que cuenta la mecánica.
       */
      const liquid = rect(W, H, Math.round(W * 0.22), Math.round(H * 0.6), Math.round(W * 0.56), Math.max(1, Math.round(H * 0.08))).map((row) => row.replace(/#/g, 'C'));
      const spark = rect(W, H, Math.round(W * 0.6), 0, Math.max(1, Math.round(W * 0.14)), 1).map((row) => row.replace(/#/g, 'C'));
      return {
        mask: merge(body, neck, cap, fuse),
        material: 'wave',
        detail: merge(liquid, spark),
      };
    }

    /**
     * El fogonazo: un anillo de salpicadura, no un disco.
     *
     * Relleno se comía toda la pantalla de golpe y tapaba a los enemigos justo cuando hay
     * que ver si han recibido el golpe. Hueco se lee como onda expansiva y deja ver debajo.
     */
    case 'burst': {
      const ring = subtract(
        ellipse(W, H, W / 2, H / 2, W / 2, H / 2),
        ellipse(W, H, W / 2, H / 2, W * 0.36, H * 0.36)
      );
      /**
       * Gotas saliendo del anillo, en las cuatro diagonales.
       *
       * Un anillo limpio se lee como una onda de choque de dibujo animado; lo que dice que
       * lo que ha estallado era un **frasco de líquido** son las salpicaduras que salen
       * despedidas más allá del frente.
       */
      const drops = [0.15, 0.85].flatMap((fx) =>
        [0.15, 0.85].map((fy) =>
          ellipse(W, H, W * fx, H * fy, Math.max(1, W * 0.07), Math.max(1, H * 0.07))
        )
      );
      return {
        mask: merge(ring, ...drops),
        material: 'wave',
        detail: annulus(W, H, W / 2, H / 2, W / 2, H / 2, Math.max(1, Math.round(W * 0.05))).map(
          (row) => row.replace(/#/g, 'C')
        ),
      };
    }

    /**
     * La broca de la lanza de torno: un cono corto con sus **estrías**.
     *
     * Es el proyectil que más se ve en toda la partida, porque `normal` es el arma con la
     * que siempre se cuenta, y era una elipse con un punto: exactamente igual que la bala de
     * cualquier enemigo. Las estrías alternas son lo que la lee como algo que **gira**.
     */
    case 'drill': {
      const body = ellipse(W, H, W * 0.42, H / 2, W * 0.42, H / 2);
      const tip = subtract(
        rect(W, H, Math.round(W * 0.6), 0, Math.round(W * 0.4), H),
        merge(
          wedge(W, H, Math.round(W * 0.6), 0, Math.round(W * 0.4), Math.ceil(H / 2), 'tr'),
          wedge(W, H, Math.round(W * 0.6), Math.floor(H / 2), Math.round(W * 0.4), Math.ceil(H / 2), 'br')
        )
      );
      // Estrías: columnas alternas marcadas, que a esta escala es todo lo que cabe de hélice.
      const flutes = blank(W, H).map((_, y) => {
        let out = '';
        for (let x = 0; x < W; x++) out += (x + y) % 3 === 0 && x < W * 0.6 ? 'C' : '.';
        return out;
      });
      return { mask: merge(body, tip), material: 'metal', detail: flutes };
    }

    case 'bullet':
    default:
      return {
        mask: ellipse(W, H, W / 2, H / 2, W / 2, H / 2),
        material: owner === 'enemy' ? 'shotEnemy' : 'shotPlayer',
        detail: core(W, H, Math.max(1, W * 0.26), Math.max(1, H * 0.26)),
      };
  }
};

// ---------------------------------------------------------------------------
// Arma en mano: 30×18, apuntando a la derecha. La versión hacia arriba sale de
// girar esta 90°, que es exacto.
// ---------------------------------------------------------------------------

export interface HeldWeaponArt {
  w: number;
  h: number;
  mask: readonly string[];
  material: Material;
  /**
   * Detalle: `C` núcleo o luz, `G` empuñadura, `B` cerdas, `W`/`w` madera del astil,
   * `O` virola de latón y `E` energía o líquido. La correspondencia con la paleta está en
   * `render/weapons.ts`.
   */
  detail?: readonly string[];
}

/**
 * El lienzo pasa de 22×12 a 30×18.
 *
 * A veintidós por doce no cabe una espada, ni una guadaña, ni un arco: el mango se comía la
 * mitad y del filo quedaban cuatro píxeles. Con treinta por dieciocho hay sitio para un
 * puño, una guarda y una hoja, que es lo que hace que un arma se reconozca sin leer su
 * nombre.
 */
const HELD_W = 30;
const HELD_H = 18;

const held = (rows: string[], material: Material, detail?: string[]): HeldWeaponArt => ({
  w: HELD_W,
  h: HELD_H,
  mask: fit(rows, HELD_W, HELD_H),
  material,
  detail: detail && fit(detail, HELD_W, HELD_H),
});

/**
 * Las ocho armas en la mano, redibujadas con el lenguaje de las referencias.
 *
 * Lo que comparten las siete imágenes de `referencias/weapon_*.jpg`, y que aquí se respeta:
 * **astil de madera** donde hay astil, **virola de latón** donde el mango se une a la hoja,
 * **cian** para el plástico y la energía, y un solo acento cálido por pieza. El mango va
 * siempre a la izquierda y el extremo útil a la derecha, porque la versión apuntando hacia
 * arriba sale de girar esta noventa grados, que es exacto y no destroza el pixel art.
 */
export const HELD_WEAPONS: Record<WeaponType, HeldWeaponArt> = {
  /**
   * Lanza de torno: broca helicoidal, cuerpo mecánico con engranaje y astil envuelto.
   *
   * La hélice es lo que la distingue de un tubo: son mordidas alternas en el canto de la
   * punta, y sin ellas la broca era un cono liso.
   */
  normal: held(
    [
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '.........##########...........',
      '......###############.........',
      '..#####################.......',
      '..#######################.....',
      '..#########################...',
      '..#######################.....',
      '......###############.........',
      '.........##########...........',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ],
    'metal',
    [
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '...........OOOO...............',
      '.WWWWWWW..OOOOOO..CC..........',
      '.WWWWWWW..OOOOOO....CC........',
      '.wwwwwww..OOOOOO..CC..........',
      '.WWWWWWW...OOOO.....CC........',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ]
  ),

  /** Doble boca: dos cañones cortos y anchos, con el puño abajo. */
  spread: held(
    [
      '..............................',
      '..............................',
      '..............................',
      '.....#####################....',
      '...#######################....',
      '...#######################....',
      '...#######################....',
      '...#######################....',
      '...#######################....',
      '...#######################....',
      '...#######################....',
      '.....#####################....',
      '.....####.....................',
      '.....####.....................',
      '....#####.....................',
      '..............................',
      '..............................',
      '..............................',
    ],
    'metal',
    [
      '..............................',
      '..............................',
      '..............................',
      '.....................OOCCCC...',
      '...WWWW..G............OCCCC...',
      '...WWWW..G............OCCCC...',
      '...WWWW..G....................',
      '...wwww..G....................',
      '...WWWW..G....................',
      '...WWWW..G....................',
      '...WWWW..G............OCCCC...',
      '.....................OOCCCC...',
      '.....GGGG.....................',
      '.....GGGG.....................',
      '....GGGGG.....................',
      '..............................',
      '..............................',
      '..............................',
    ]
  ),

  /**
   * Bláster de pasta: el propio tubo hecho pistola de rayos.
   *
   * La **cola engarzada** de la izquierda es lo que dice que es un tubo de pasta y no una
   * pistola cualquiera; el núcleo verde y las anillas de latón, que es de rayos.
   */
  laser: held(
    [
      '..............................',
      '..............................',
      '..............................',
      '...###########################',
      '..############################',
      '..############################',
      '..############################',
      '..############################',
      '..############################',
      '...###########################',
      '.....#####....................',
      '.....#####....................',
      '.....#####....................',
      '....######....................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ],
    'clinic',
    [
      '..............................',
      '..............................',
      '..............................',
      '..GGG.................OO...EE.',
      '..GGG.......CCCCC....OOOO..EEE',
      '..GGG.......CCCCC...OOOOOOEEEE',
      '..GGG...............OOOOOOEEEE',
      '..GGG.......CCCCC...OOOOOOEEEE',
      '..GGG.......CCCCC....OOOO..EEE',
      '..GGG.................OO...EE.',
      '.....GGGGG....................',
      '.....GGGGG....................',
      '.....GGGGG....................',
      '....GGGGGG....................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ]
  ),

  /**
   * Granada de enjuague: frasco de vidrio con virolas y **mecha encendida**.
   *
   * La mecha es la pieza que cuenta la mecánica: sin ella es un frasco de poción, y el
   * jugador no tiene por qué saber que va a estallar.
   */
  mouthwash: held(
    [
      '..............................',
      '..................#...........',
      '.................#............',
      '..............#####...........',
      '..............#####...........',
      '.............#######..........',
      '...........###########........',
      '..........#############.......',
      '.........###############......',
      '.........###############......',
      '.........###############......',
      '..........#############.......',
      '...........###########........',
      '.............#######..........',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ],
    'wave',
    [
      '..............................',
      '..................C...........',
      '.................C............',
      '..............GGGGG...........',
      '..............GGGGG...........',
      '.............OOOOOOO..........',
      '...........EEEEEEEEEEE........',
      '..........EEEEEEEEEEEEE.......',
      '.........EEEEEEEEEEEEEEE......',
      '.........EEEECCCCEEEEEEE......',
      '.........EEEEEEEEEEEEEEE......',
      '..........EEEEEEEEEEEEE.......',
      '...........EEEEEEEEEEE........',
      '.............EEEEEEE..........',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ]
  ),

  /**
   * Látigo de seda: la caja dispensadora y el latigazo saliendo de ella.
   *
   * El latigazo va en **ese**, no recto: una línea recta saliendo de una caja es un cable,
   * y una curva en ese es un látigo en movimiento.
   */
  floss: held(
    [
      '..............................',
      '..............................',
      '...#########..................',
      '..###########....####.........',
      '..###########..########.......',
      '..###########.###....###......',
      '..###########.##.......##.....',
      '..###########.##........###...',
      '..###########..##.........##..',
      '..###########...###.......###.',
      '..###########.....####..####..',
      '...#########.........#####....',
      '....#######...................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ],
    'melee',
    [
      '..............................',
      '..............................',
      '...CCCCCCC....................',
      '..CCCCCCCCC......BBBB.........',
      '..CCCCCCCCC....BBBBBBBB.......',
      '..CCCCCCCCC...BBBB....BBB.....',
      '..CCCCCCCCC...BB.......BB.....',
      '..CCCCCCCCC...BB........BBB...',
      '..CCCCCCCCC....BB.........BB..',
      '...GGGGGGGG.....BBB.......BBB.',
      '...GGGGGGGG.......BBBB..BBBB..',
      '...GGGGGGG...........BBBBB....',
      '....GGGGG.....................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ]
  ),

  /**
   * Espada de cerdas: puño de madera, guarda de acero y hoja de cerdas.
   *
   * La **guarda** es lo que la convierte en espada. Sin ella, una hoja saliendo de un mango
   * es un cuchillo de untar.
   */
  toothbrush: held(
    [
      '..............................',
      '..............................',
      '..............................',
      '...........##.................',
      '...........##.#.#.#.#.#.#.#...',
      '...........###################',
      '...........###################',
      '.############################.',
      '.#############################',
      '.############################.',
      '...........###################',
      '...........###################',
      '...........##.#.#.#.#.#.#.#...',
      '...........##.................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ],
    'laser',
    [
      '..............................',
      '..............................',
      '..............................',
      '...........OO.................',
      '...........OO.B.B.B.B.B.B.B...',
      '...........OO.BBBBBBBBBBBBBBBB',
      '...........OO.BB.BB.BB.BB.BB.B',
      '.WWWWWWWWWWOO.BBBBBBBBBBBBBBB.',
      '.WWWWWWWWWWOO.BB.BB.BB.BB.BB.B',
      '.wwwwwwwwwwOO.BBBBBBBBBBBBBBB.',
      '...........OO.BB.BB.BB.BB.BB.B',
      '...........OO.BBBBBBBBBBBBBBBB',
      '...........OO.B.B.B.B.B.B.B...',
      '...........OO.................',
      '..............................',
      '..............................',
      '..............................',
      '..............................',
    ]
  ),

  /**
   * Arco de seda: el mango del hilo doblado en arco, la seda de cuerda y la flecha montada.
   *
   * La **cuerda tensa** es lo que lo identifica: sin ella son dos curvas de plástico sueltas.
   */
  bow: held(
    [
      '..##..##......................',
      '..##..##......................',
      '...####.......................',
      '..####.#......................',
      '.###...#......................',
      '.##....#......................',
      '.##....#......................',
      '.##....#######################',
      '.##....#######################',
      '.##....#......................',
      '.##....#......................',
      '.###...#......................',
      '..####.#......................',
      '...####.......................',
      '..##..##......................',
      '..##..##......................',
      '..............................',
      '..............................',
    ],
    'laser',
    [
      '..CC..CC......................',
      '..CC..CC......................',
      '...CCCC.......................',
      '..CCCC.B......................',
      '.CCC...B......................',
      '.CC....B......................',
      '.CC....B......................',
      '.CC....BWWWWWWWWWWWWWWWWWOOCCC',
      '.CC....BWWWWWWWWWWWWWWWWWOOCCC',
      '.CC....B......................',
      '.CC....B......................',
      '.CCC...B......................',
      '..CCCC.B......................',
      '...CCCC.......................',
      '..CC..CC......................',
      '..CC..CC......................',
      '..............................',
      '..............................',
    ]
  ),

  /**
   * Guadaña de raspador: astil largo de madera y hoja curva **ganchuda**.
   *
   * El gancho es lo que la ata a la cureta dental de la que sale, y lo que la separa de una
   * hoz cualquiera.
   */
  scythe: held(
    [
      '..................######......',
      '.................########.....',
      '................####...###....',
      '...............###......###...',
      '..............###........##...',
      '..............##.........##...',
      '..............##........###...',
      '..............###......###....',
      '...............###...####.....',
      '................######........',
      '..............###.............',
      '............###...............',
      '..........###.................',
      '........###...................',
      '......###.....................',
      '....###.......................',
      '..###.........................',
      '..............................',
    ],
    'metal',
    [
      '..................CCCCCC......',
      '.................CCCCCCCC.....',
      '................CCCC..........',
      '...............CCC............',
      '..............CCC.............',
      '..............CC..............',
      '..............CC..............',
      '..............CCC.............',
      '...............CCC............',
      '................OOOOOO........',
      '..............WWW.............',
      '............WWW...............',
      '..........WWW.................',
      '........WWW...................',
      '......WWW.....................',
      '....www.......................',
      '..www.........................',
      '..............................',
    ]
  ),
};

// ---------------------------------------------------------------------------
// Objetos: bote con emblema. El emblema dice qué es sin necesidad de texto.
// ---------------------------------------------------------------------------

export const POWERUP_W = 24;
export const POWERUP_H = 24;

/** Bote: cuerpo con ventana y alas pequeñas. */
export const POWERUP_BODY = merge(
  rect(POWERUP_W, POWERUP_H, 4, 2, 16, 20, 3),
  rect(POWERUP_W, POWERUP_H, 0, 9, 4, 6, 1),
  rect(POWERUP_W, POWERUP_H, 20, 9, 4, 6, 1)
);

/** Emblemas de 10×10, uno por tipo de objeto. `S` es el color del contenido. */
const emblem = (rows: string[]): string[] => fit(rows, 10, 10);

export const POWERUP_EMBLEMS = {
  /** Cruz médica. */
  health: emblem([
    '..........',
    '...SSSS...',
    '...SSSS...',
    '.SSSSSSSS.',
    '.SSSSSSSS.',
    '.SSSSSSSS.',
    '...SSSS...',
    '...SSSS...',
    '..........',
    '..........',
  ]),
  /** Bala. */
  normal: emblem([
    '..........',
    '....SS....',
    '...SSSS...',
    '...SSSS...',
    '...SSSS...',
    '...SSSS...',
    '...SSSS...',
    '....SS....',
    '..........',
    '..........',
  ]),
  /** Abanico de perdigones. */
  spread: emblem([
    '..........',
    '..S....S..',
    '...S..S...',
    '....SS....',
    '....SS....',
    '...S..S...',
    '..S....S..',
    '.S......S.',
    '..........',
    '..........',
  ]),
  /** Rayo. */
  laser: emblem([
    '..........',
    '.....SS...',
    '....SS....',
    '...SSSS...',
    '..SSSS....',
    '....SS....',
    '...SS.....',
    '..SS......',
    '..........',
    '..........',
  ]),
  /** Ondas. */
  mouthwash: emblem([
    '..........',
    '..SS..SS..',
    '.S..SS..S.',
    '..........',
    '..SS..SS..',
    '.S..SS..S.',
    '..........',
    '..SS..SS..',
    '.S..SS..S.',
    '..........',
  ]),
  /** Hebra con carrete. */
  floss: emblem([
    '..........',
    '..SSSSSS..',
    '..S....S..',
    '..SSSSSS..',
    '.....S....',
    '....S.....',
    '...S......',
    '..S.......',
    '..........',
    '..........',
  ]),
  /** Cepillo. */
  toothbrush: emblem([
    '..........',
    '.......SSS',
    '.......SSS',
    '..SSSSSS..',
    '..SSSSSS..',
    '.......SSS',
    '.......SSS',
    '..........',
    '..........',
    '..........',
  ]),
  /** Arco con su flecha. */
  bow: emblem([
    '..SS......',
    '.S..S.....',
    'S....S....',
    'S..SSSSSS.',
    'S....S....',
    '.S..S.....',
    '..SS......',
    '..........',
    '..........',
    '..........',
  ]),
  /** Hoja curva sobre astil. */
  scythe: emblem([
    '.SSSSS....',
    'SS...SS...',
    'S.....SS..',
    '.......SS.',
    '........SS',
    '.........S',
    '.........S',
    '..........',
    '..........',
    '..........',
  ]),
} satisfies Record<'health' | WeaponType, readonly string[]>;

/** Emblema colocado dentro del bote, ya recortado a su ventana. */
export const powerupDetail = (subType: keyof typeof POWERUP_EMBLEMS): string[] =>
  stamp(blank(POWERUP_W, POWERUP_H), POWERUP_EMBLEMS[subType], 7, 7);
