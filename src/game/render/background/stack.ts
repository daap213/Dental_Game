import type { LayerId, StageScene } from '../../data/stages';

/**
 * La pila de capas del fondo.
 *
 * El fondo era una función de veinte líneas con cuatro `blit` y sus factores de
 * parallax escritos a mano en medio del código. Funcionaba con cuatro capas;
 * con diez no, y sobre todo no permitía que cada fase se compusiera distinta,
 * que es el problema que se está arreglando.
 *
 * Ahora cada capa se declara: a qué profundidad va, cómo se coloca, y cómo se
 * hornea a partir de la escena de la fase. **Añadir una capa es añadir una
 * entrada a la pila.**
 *
 * Dos decisiones que conviene entender:
 *
 * 1. **El orden de dibujado sale de aquí, no del dato.** `scene.layers` dice
 *    *qué* capas entran; el orden es siempre el de `LAYERS`. Si el orden viniera
 *    del dato, una lista mal escrita pondría la garganta por delante de las
 *    encías y el fallo sería invisible en revisión.
 * 2. **Las capas que se repiten se indexan por el mundo, no por la pantalla.**
 *    Es lo que permite que un diente siga siendo el mismo diente mientras la
 *    cámara pasa por delante; si el índice fuese de pantalla, cada variante
 *    cambiaría al desplazarse y la arcada hervería.
 */

export interface LayerLayout {
  /** Y en pantalla donde se estampa. */
  y: number;
  /** Tamaño con el que se estampa cada copia. Puede no ser el del horneado. */
  w: number;
  h: number;
  /**
   * Si está, la capa se repite cada `tile` píxeles hasta cubrir la pantalla.
   * Si no, se estampa una sola copia.
   */
  tile?: number;
  /** Anclaje horizontal de la copia única. Se ignora si hay `tile`. */
  align?: 'left' | 'center';
  /**
   * Fracción de la pantalla donde va el **centro** de la copia única, de 0 a 1.
   * Manda sobre `align`.
   *
   * Existe porque no todo lo que entra en la escena va en el eje: el dentista
   * centrado tapaba las fauces enteras, y fuera del eje deja la garganta a la
   * vista y compone mejor.
   */
  anchorX?: number;
}

/** Lo que se estampa en una columna concreta de una capa que se repite. */
export interface TileVariant {
  baked: CanvasImageSource;
  /** Espejado horizontal. Sale gratis en `blit` y duplica la variedad. */
  flip?: boolean;
  /** Desplazamiento vertical de esta columna, para que la hilera no sea una regla. */
  dy?: number;
}

export interface BackgroundLayer {
  id: LayerId;
  /**
   * Qué es la capa:
   *
   * - `world` — está *dentro* de la boca, a cierta distancia. Su `parallax` mide
   *   esa distancia, y en la pila las capas `world` van **ordenadas por
   *   parallax**: una capa más lejana no puede desplazarse más rápido que una más
   *   cercana. Un test lo comprueba.
   * - `screen` — no está en la escena, **enmarca** la escena: las encías de
   *   primer plano, una viñeta. Van clavadas al borde de la pantalla, así que su
   *   parallax es 0 aunque se dibujen por delante de todo, y quedan fuera del
   *   orden de profundidad.
   *
   * La distinción existe porque sin ella las encías —lo más cercano que hay, y
   * con parallax 0— parecen romper el invariante de profundidad.
   */
  anchor?: 'world' | 'screen';
  /** 0 = no se desplaza, 1 = pegada al mundo. */
  parallax: number;
  /** Se hornea una vez por escena y se queda en la caché de `bake`. */
  bake: (scene: StageScene) => HTMLCanvasElement;
  /** Dónde y con qué tamaño se estampa. Puede depender de la escena. */
  layout: (scene: StageScene, baked: HTMLCanvasElement) => LayerLayout;
  /**
   * Para las capas que se repiten: qué va en la columna `index` del mundo. Por
   * defecto, el horneado tal cual. Aquí es donde vive la variedad de la arcada.
   *
   * Devolver `null` deja la columna **vacía**, que es cómo se dibuja un diente
   * que falta: cuenta más historia que cualquier mancha.
   */
  variant?: (scene: StageScene, baked: HTMLCanvasElement, index: number) => TileVariant | null;
  /**
   * Lo poco que se mueve, pintado encima del horneado. Se llama también para las
   * capas que se repiten, después de estamparlas.
   */
  live?: (ctx: CanvasRenderingContext2D, scene: StageScene, frame: LayerFrame) => void;
}

/** Lo que una capa necesita saber para pintar su parte viva. */
export interface LayerFrame {
  /**
   * Segundos de **simulación**, no de reloj: así lo que se mueve se congela con
   * la pausa, igual que el bamboleo de los objetos.
   */
  time: number;
  /** Desplazamiento de esta capa, en coordenadas del mundo (`cameraX × parallax`). */
  world: number;
  /**
   * X de pantalla donde se ha estampado el horneado. Para las capas que se
   * repiten, el origen de la retícula. Lo da el compositor para que una capa no
   * tenga que recalcular su propia colocación y arriesgarse a discrepar.
   */
  x: number;
  /** La colocación que ya se ha usado para estampar el horneado. */
  box: LayerLayout;
}

/** Registro. El orden es el de dibujado: de la capa más lejana a la más cercana. */
const registry: BackgroundLayer[] = [];

export const registerLayer = (layer: BackgroundLayer): BackgroundLayer => {
  registry.push(layer);
  return layer;
};

export const LAYERS: readonly BackgroundLayer[] = registry;

export const layerById = (id: LayerId): BackgroundLayer | undefined =>
  registry.find((layer) => layer.id === id);

/**
 * Las capas de una escena, **en orden de pila**. Se ignora el orden en que la
 * escena las liste, y una capa que la escena no pida no se dibuja.
 */
export const layersFor = (scene: StageScene): BackgroundLayer[] => {
  const wanted = new Set<LayerId>(scene.layers);
  return registry.filter((layer) => wanted.has(layer.id));
};

/** Las que están dentro de la escena, que son las que el orden de profundidad rige. */
export const worldLayers = (layers: readonly BackgroundLayer[]): BackgroundLayer[] =>
  layers.filter((layer) => (layer.anchor ?? 'world') === 'world');
