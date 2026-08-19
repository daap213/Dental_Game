/**
 * Paleta del juego, organizada en rampas de seis tonos.
 *
 * Las rampas no son el mismo color más claro y más oscuro: llevan **desviación
 * de matiz**, que es lo que separa un pixel art plano de uno que parece tener
 * materia. Y aquí la desviación tiene una excusa física, porque toda la escena
 * está iluminada por la lámpara del dentista dentro de una boca:
 *
 *   · las sombras giran hacia el rojo-magenta del ambiente (la luz que rebota en
 *     las encías),
 *   · las luces giran hacia el blanco cálido de la lámpara,
 *   · el contorno nunca es negro puro, sino el propio material muy oscurecido.
 *
 * Vive en `data/` y no en `render/` a propósito: las entidades llevan `color`
 * como campo y `data/enemies.ts` asigna el color de cada enemigo, así que si
 * la paleta colgara de la capa de presentación el dominio tendría que importar
 * de ella.
 */

export interface Ramp {
  /** Contorno del lado en sombra. El material muy oscurecido, nunca negro. */
  out: string;
  /** Sombra profunda, girada hacia el ambiente. */
  shade: string;
  dark: string;
  /** Color base del material. */
  mid: string;
  light: string;
  /** Brillo especular, girado hacia el cálido de la lámpara. */
  hi: string;
}

export const RAMPS = {
  // --- Materiales del escenario ---
  /**
   * Esmalte: dientes y jugador. No es blanco, es marfil con sombras malva; un
   * diente pintado de blanco puro parece plástico.
   */
  enamel: {
    out: '#2e1622',
    shade: '#6b4256',
    dark: '#a8899a',
    mid: '#d9cbd2',
    light: '#f2e9e6',
    hi: '#fffdf2',
  },
  /** Encía: tejido, no plástico rosa. */
  gum: {
    out: '#2c0512',
    shade: '#5c0d24',
    dark: '#8f1338',
    mid: '#bf2050',
    light: '#e05575',
    hi: '#f7a3b2',
  },
  /** Lengua: el suelo. Más rosa y más húmeda que la encía. */
  tongue: {
    out: '#3b0a1c',
    shade: '#6e1030',
    dark: '#a31a4a',
    mid: '#d13a6a',
    light: '#ec7192',
    hi: '#ffb7c8',
  },
  /** Metal: aparato dental, torretas, cañones. Acero frío con brillo cálido. */
  metal: {
    out: '#0f1720',
    shade: '#263445',
    dark: '#46596e',
    mid: '#74889c',
    light: '#a8b8c8',
    hi: '#eef4f8',
  },
  /** Piel del dentista del fondo. */
  skin: {
    out: '#4a1414',
    shade: '#8a3a34',
    dark: '#bf6a5e',
    mid: '#e0968a',
    light: '#f2c0b3',
    hi: '#fde8dc',
  },
  /** Bata y mascarilla. */
  scrubs: {
    out: '#06302e',
    shade: '#0d4f4a',
    dark: '#12726a',
    mid: '#199c8f',
    light: '#4ac4b4',
    hi: '#a5e8dd',
  },
  /**
   * Mucosa: la cara interna de la mejilla, que enmarca la escena por los lados.
   * Más malva y más apagada que la encía: está en sombra y no recibe la lámpara
   * de frente.
   */
  mucosa: {
    out: '#24081a',
    shade: '#4a1638',
    dark: '#75264f',
    mid: '#9c3a68',
    light: '#c26a91',
    hi: '#e8b0c4',
  },
  /**
   * Encía inflamada. La misma carne pero enfadada: más saturada y más roja, con
   * el brillo subido porque el tejido hinchado es tirante y refleja más.
   */
  gumSick: {
    out: '#33020c',
    shade: '#6b0518',
    dark: '#a30a24',
    mid: '#d81636',
    light: '#f04a63',
    hi: '#ffa0a8',
  },
  /**
   * Esmalte manchado: el marfil virado a amarillo de tabaco y café. Se usa junto
   * al `enamel` limpio, así que la diferencia tiene que verse a un diente de
   * distancia.
   */
  enamelStained: {
    out: '#1f1509',
    shade: '#5c4620',
    dark: '#93763a',
    mid: '#c0a765',
    light: '#ddc994',
    hi: '#f4ead0',
  },
  /**
   * Sarro calcificado. Deliberadamente **gris verdoso** y no amarillo, para que
   * no se confunda con `enamelStained`: el sarro es una costra de yeso, no una
   * mancha.
   */
  tartarCrust: {
    out: '#17140d',
    shade: '#403c28',
    dark: '#6e6848',
    mid: '#9a9270',
    light: '#c2bb9c',
    hi: '#e4dfc8',
  },
  /**
   * La clínica que se ve por la abertura de la boca: azulejo, mobiliario, la silla.
   *
   * Es la única rampa **fría** del escenario, y existe porque sin ella no hay
   * contraste posible. Lo que sostiene las referencias es boca roja y oscura contra
   * clínica azulada y reventada de luz; con la paleta anterior —toda cálida salvo el
   * acero y el teal de la bata— el fondo entero era del mismo color y la abertura no
   * se leía como una salida.
   */
  clinic: {
    out: '#0d1620',
    shade: '#24384a',
    dark: '#456277',
    mid: '#6e91a6',
    light: '#a3c0cf',
    hi: '#e2eef4',
  },
  /**
   * El foco del dentista, reventado. Del gris cálido al blanco puro.
   *
   * Va aparte de `warden` —el dorado de los jefes— porque esto no es un color, es
   * una sobreexposición: tiene que llegar al blanco absoluto para que la abertura
   * parezca luz y no pintura amarilla.
   */
  glare: {
    out: '#3d3528',
    shade: '#6b5f45',
    dark: '#9c8e66',
    mid: '#cbc094',
    light: '#eae4c8',
    hi: '#ffffff',
  },
  /**
   * Caries: el agujero. Casi negro en el fondo y ocre enfermizo en el borde de
   * la lesión, que es lo que le da los seis tonos y el recorrido de luminancia
   * que el sombreado automático necesita.
   */
  cavity: {
    out: '#0a0503',
    shade: '#1d0f07',
    dark: '#35200f',
    mid: '#52351a',
    light: '#7a5228',
    hi: '#a87b45',
  },

  // --- Enemigos comunes ---
  bacteria: {
    out: '#04231b',
    shade: '#07463a',
    dark: '#0a6b52',
    mid: '#13996d',
    light: '#3fc78e',
    hi: '#9ff0c4',
  },
  plaque: {
    out: '#2b1704',
    shade: '#573006',
    dark: '#8a4d0a',
    mid: '#b8720f',
    light: '#dfa22c',
    hi: '#f6d47a',
  },
  candy: {
    out: '#3d0708',
    shade: '#6e0f13',
    dark: '#a3181c',
    mid: '#d42a2a',
    light: '#ef6a5c',
    hi: '#ffb9a3',
  },
  turret: {
    out: '#1a0736',
    shade: '#34125e',
    dark: '#4f2088',
    mid: '#6f34b8',
    light: '#9d6ce0',
    hi: '#d4b8fa',
  },
  rusher: {
    out: '#3a0722',
    shade: '#6b0f3f',
    dark: '#9e1a60',
    mid: '#d43a8a',
    light: '#f076b0',
    hi: '#ffc0dc',
  },
  fiend: {
    out: '#2e0424',
    shade: '#5c0b45',
    dark: '#8f1268',
    mid: '#c02090',
    light: '#e563bb',
    hi: '#ffb3e2',
  },
  acid: {
    out: '#1c2604',
    shade: '#364c07',
    dark: '#56750c',
    mid: '#7fa314',
    light: '#aed23c',
    hi: '#ddf28c',
  },
  grunt: {
    out: '#260404',
    shade: '#4a0a0a',
    dark: '#701212',
    mid: '#9a1e1e',
    light: '#c94a3c',
    hi: '#ea9078',
  },

  // --- Jefes ---
  /** Piedra y armadura: rey, fantasma y tanque. */
  stone: {
    out: '#0c0c10',
    shade: '#1e1e26',
    dark: '#33333f',
    mid: '#4d4d5c',
    light: '#75758a',
    hi: '#b0b0c2',
  },
  /** El guardián oculto, dorado. */
  warden: {
    out: '#35210a',
    shade: '#5e3a0d',
    dark: '#8f5c10',
    mid: '#c9911c',
    light: '#eec53f',
    hi: '#fff2a8',
  },
  /**
   * Madera de astil: los mangos de la guadaña, del arco y de la espada.
   *
   * No había ninguna. Estaban `warden` (oro), `plaque` (ámbar) y `enamelStained` (marfil
   * atabacado), y ninguna de las tres es madera: el oro brilla, el ámbar es enfermedad y el
   * marfil atabacado es un diente sucio. Un astil de madera al lado de una hoja de acero es
   * lo que hace que el arma se lea como herramienta y no como pieza de plástico.
   */
  wood: {
    out: '#231309',
    shade: '#3d2211',
    dark: '#5c351b',
    mid: '#82502a',
    light: '#a8703f',
    hi: '#c99a67',
  },
  /** La deidad de la caries y el fondo profundo. */
  void: {
    out: '#04040c',
    shade: '#0b0b1c',
    dark: '#17173a',
    mid: '#262657',
    light: '#45458a',
    hi: '#7d7dd0',
  },

  // --- Proyectiles y efectos ---
  shotPlayer: {
    out: '#0a1a4a',
    shade: '#12307e',
    dark: '#1c4cb8',
    mid: '#2f74e8',
    light: '#6ba6ff',
    hi: '#c8e4ff',
  },
  shotEnemy: {
    out: '#052a1a',
    shade: '#0a5233',
    dark: '#0f7a4a',
    mid: '#14a163',
    light: '#3fc98d',
    hi: '#9defc4',
  },
  laser: {
    out: '#062a33',
    shade: '#0a4a5c',
    dark: '#0e6f88',
    mid: '#12a0be',
    light: '#4fd4e8',
    hi: '#c4f7ff',
  },
  wave: {
    out: '#221054',
    shade: '#3a1e86',
    dark: '#5232b8',
    mid: '#7455e0',
    light: '#a68cf5',
    hi: '#ddd0ff',
  },
  melee: {
    out: '#2a2f3a',
    shade: '#4c5563',
    dark: '#77818f',
    mid: '#a8b2bd',
    light: '#d8dfe6',
    hi: '#ffffff',
  },
  sludge: {
    out: '#3a0a2a',
    shade: '#661548',
    dark: '#96206b',
    mid: '#c73a93',
    light: '#e87ab8',
    hi: '#ffc4e0',
  },
} as const satisfies Record<string, Ramp>;

export type Material = keyof typeof RAMPS;
export type Tone = keyof Ramp;

/** Los tonos de relleno, del más oscuro al más claro. El contorno va aparte. */
export const FILL_TONES: readonly Tone[] = ['shade', 'dark', 'mid', 'light', 'hi'];

/** Referencia a un tono concreto, p. ej. `'bacteria.mid'`. */
export type PaletteKey = `${Material & string}.${Tone}`;

/**
 * Resuelve una referencia de paleta a su color.
 *
 * Devuelve fucsia chillón ante una clave desconocida en lugar de fallar: un
 * sprite mal escrito se ve al instante y no tumba el frame. Los tests fijan que
 * ninguna clave usada por el juego caiga aquí.
 */
export const MISSING_COLOR = '#ff00ff';

export const tone = (key: PaletteKey): string => {
  const dot = key.indexOf('.');
  const ramp = RAMPS[key.slice(0, dot) as Material];
  if (!ramp) return MISSING_COLOR;
  return ramp[key.slice(dot + 1) as Tone] ?? MISSING_COLOR;
};

/** true si la clave existe de verdad. Lo usan los tests de sprites. */
export const isPaletteKey = (key: string): key is PaletteKey => {
  const dot = key.indexOf('.');
  if (dot < 0) return false;
  const ramp = RAMPS[key.slice(0, dot) as Material];
  return !!ramp && key.slice(dot + 1) in ramp;
};

/**
 * Colores planos por nombre de entidad.
 *
 * Se derivan de las rampas para que no puedan divergir. Las entidades guardan su
 * color como campo (`data/enemies.ts`, `weapons.ts`), y este es el tono base que
 * usan; el sombreado lo pone el sprite.
 */
export const COLORS = {
  bgTop: RAMPS.gum.light,
  bgBottom: RAMPS.gum.mid,
  bgProp: RAMPS.gum.dark,

  player: RAMPS.enamel.light,
  playerOutline: RAMPS.enamel.out,

  // Enemigos
  enemyBacteria: RAMPS.bacteria.mid,
  enemyPlaque: RAMPS.plaque.mid,
  enemyCandy: RAMPS.candy.mid,
  enemyTurret: RAMPS.turret.mid,
  enemyRusher: RAMPS.rusher.mid,
  enemyBoss: RAMPS.stone.dark,
  enemySugarFiend: RAMPS.fiend.mid,
  enemyAcidSpitter: RAMPS.acid.mid,
  enemyGrunt: RAMPS.grunt.mid,
  enemyCrawler: RAMPS.bacteria.dark,
  enemyShell: RAMPS.tartarCrust.mid,
  enemyBloater: RAMPS.fiend.dark,
  enemyBorer: RAMPS.enamelStained.mid,
  /** Jefe oculto (dorado). */
  enemyWarden: RAMPS.warden.mid,

  // Proyectiles
  projectilePlayer: RAMPS.shotPlayer.mid,
  projectileEnemy: RAMPS.shotEnemy.mid,
  projectileLaser: RAMPS.laser.mid,
  projectileWave: RAMPS.wave.mid,
  projectileMelee: RAMPS.melee.mid,
  projectileAcid: RAMPS.acid.mid,
  projectileSludge: RAMPS.sludge.mid,

  ground: RAMPS.tongue.mid,
  platform: RAMPS.enamel.light,
} as const;
