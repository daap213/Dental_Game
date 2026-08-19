import type { ProjectileType } from '../../types';
import type { PaletteKey } from './palette';
import { SCYTHE, TOOTHBRUSH } from './weapons';

/**
 * Cómo se comporta cada tipo de proyectil.
 *
 * Antes esto estaba repartido en tres sitios que el tipado no relacionaba entre sí, y los
 * tres dentro de `GameCanvas.tsx`: un `Set` con los que perforan, un `if` con los que
 * acompañan al jugador y otro `if` con los que caen. Añadir un tipo y olvidarse de uno de
 * los tres no daba error ni fallaba ningún test — un golpe cuerpo a cuerpo al que se le
 * olvidara la entrada del `Set` salía volando como una bala y desaparecía al primer
 * impacto—.
 *
 * Siendo un `Record` sobre el union, olvidarse de un tipo es un **error de compilación**.
 */

/** Cómo se coloca el proyectil, que es lo que separa un disparo de un golpe. */
export type Anchor =
  /** Vuela por su cuenta: integra su velocidad en cada paso. */
  | { kind: 'free' }
  /** Acompaña al jugador a una distancia fija de su centro. */
  | { kind: 'held'; gap: number }
  /**
   * Acompaña al jugador a una distancia que sale de su **propio tamaño**, así que un
   * látigo de más alcance se coloca más lejos sin tener que tocar ningún número.
   */
  | { kind: 'reach'; margin: number }
  /** No se mueve en absoluto: se queda donde nació. */
  | { kind: 'static' };

export interface ProjectileBehaviour {
  /** Si sigue vivo tras impactar, anotando a quién ya golpeó en `hitIds`. */
  pierce: boolean;
  anchor: Anchor;
  /** Fracción de `GRAVITY` que se le suma a la velocidad vertical en cada paso. */
  gravity: number;
  /** Amplitud del bamboleo vertical, en píxeles. 0 para lo que va recto. */
  wobble: number;
  /**
   * Si **puede** perseguir al jugador. No basta con esto: la persecución además exige ser
   * del enemigo y pasar del umbral de daño, que es como el jefe oculto guía sus balas sin
   * llevar lógica propia.
   */
  homing: boolean;
  /**
   * El barrido, si lo hay. Solo tiene sentido en lo que acompaña al jugador: gira su
   * dirección a lo largo de su vida, y así el golpe barre en vez de ser una caja quieta
   * pegada al costado.
   *
   * `over` es la duración completa del golpe, y **se importa de `data/weapons.ts`** en vez
   * de repetirse aquí: con el número escrito dos veces, tocar la vida del golpe sin tocar
   * el barrido lo dejaría girando a destiempo y nada avisaría.
   */
  sweep: { arc: number; over: number } | null;
  /**
   * Qué pasa al tocar a un enemigo.
   *
   * `'damage'` es lo de siempre. `'trigger'` es el frasco: **no** hace daño al tocar, se
   * rompe y deja que su reventón lo haga. Sin esta distinción el frasco cobraría dos veces
   * —al tocar y al estallar—, y con un frasco de daño cero fallaría el test que exige que
   * todo proyectil salga con el daño que dice la tabla.
   */
  contact: 'damage' | 'trigger';
  /**
   * Si al morir **dentro del nivel** deja un reventón.
   *
   * La talla sale de multiplicar la del propio frasco, no de pedir el nivel: el proyectil no
   * sabe con qué nivel se disparó, y añadirle el dato solo para esto obligaría a rellenarlo
   * en las veintidós llamadas que crean proyectiles. Con el factor, un frasco de 21 px deja
   * un fogonazo de 88 y uno de 41 lo deja de 172, que es la progresión que se buscaba.
   */
  burst: { of: ProjectileType; scale: number; life: number } | null;
  /**
   * Cómo se ve el impacto: de qué color salta y cuánto.
   *
   * Todos los impactos del juego eran **tres chispas del mismo color**, así que golpear con
   * una espada de cerdas, con un rayo de menta o con una flecha se veía idéntico. Lo que dice
   * de qué te han dado es lo que salta: acero echa chispas, el enjuague salpica y las cerdas
   * sueltan una mota clara.
   *
   * El color del blindaje no está aquí: cuando la coraza del sarro rechaza el golpe, la
   * chispa sale metálica pase lo que pase, porque eso informa de otra cosa —que ahí no
   * entra— y tiene que leerse igual con cualquier arma.
   */
  impact: { color: PaletteKey; count: number };
}

/** Frecuencia del bamboleo de las ondas, en radianes por segundo. */
export const WOBBLE_FREQ = 20;

const FLIES: ProjectileBehaviour = {
  pierce: false,
  anchor: { kind: 'free' },
  gravity: 0,
  wobble: 0,
  homing: false,
  sweep: null,
  contact: 'damage',
  impact: { color: 'enamel.hi', count: 3 },
  burst: null,
};

export const PROJECTILES: Record<ProjectileType, ProjectileBehaviour> = {
  /** La bala común. La del jefe oculto persigue, y por eso lleva `homing`. */
  bullet: { ...FLIES, homing: true },
  /** Rayo de menta: destello verde. */
  laser: { ...FLIES, pierce: true, impact: { color: 'laser.hi', count: 5 } },
  /** La onda del enjuague: perfora y va bamboleándose. */
  wave: { ...FLIES, pierce: true, wobble: 5 },
  /**
   * El látigo de seda: acompaña al jugador y su distancia sale de su alcance.
   *
   * Su impacto salpica cian, como la energía de la que está hecho.
   */
  floss: {
    ...FLIES,
    pierce: true,
    anchor: { kind: 'reach', margin: 10 },
    impact: { color: 'laser.light', count: 4 },
  },
  /**
   * La espada de cerdas: acompaña al jugador **barriendo** en arco.
   *
   * Su distancia de guarda sale del largo del propio filo y no de un número fijo, porque el
   * filo crece con el nivel y una distancia constante lo dejaría clavado en el jugador.
   */
  sword: {
    ...FLIES,
    pierce: true,
    anchor: { kind: 'reach', margin: 2 },
    sweep: { arc: TOOTHBRUSH.arc, over: TOOTHBRUSH.lifeTime },
    // Cerdas contra placa: una mota clara, no una chispa de acero.
    impact: { color: 'enamel.hi', count: 5 },
  },
  mortar: { ...FLIES, gravity: 0.5 },
  acid: { ...FLIES, gravity: 0.5 },
  /** El charco: se queda donde cayó. */
  sludge: { ...FLIES, anchor: { kind: 'static' } },
  judgment_orb: { ...FLIES },
  /**
   * El frasco de enjuague: cae con la gravedad **entera** y se rompe al tocar cualquier
   * cosa. No hace daño él; lo hace su fogonazo.
   */
  flask: {
    ...FLIES,
    gravity: 1,
    contact: 'trigger',
    burst: { of: 'burst', scale: 4.2, life: 0.1 },
  },
  /**
   * El fogonazo. **Tiene que perforar**: sin perforar se gastaría en el primer enemigo y un
   * arma de área acabaría alcanzando exactamente a uno.
   */
  burst: {
    ...FLIES,
    pierce: true,
    anchor: { kind: 'static' },
    // Un reventón de líquido salpica mucho y en cian.
    impact: { color: 'wave.hi', count: 8 },
  },
  /**
   * La flecha: vuela recta, rápida y **atraviesa la fila**. Es su razón de ser.
   *
   * Su impacto es de punta de acero: pocas chispas y secas.
   */
  arrow: { ...FLIES, pierce: true, impact: { color: 'metal.hi', count: 2 } },
  /**
   * La broca de la lanza: vuela recta como la bala, pero se dibuja como lo que es.
   *
   * Acero contra esmalte, y muchas chispas porque va a mucha cadencia.
   */
  drill: { ...FLIES, impact: { color: 'metal.hi', count: 4 } },
  /**
   * El barrido de la guadaña: como la espada, pero más ancho y más lento.
   *
   * Es el golpe más pesado del juego, así que salta lo que más.
   */
  reap: {
    ...FLIES,
    pierce: true,
    anchor: { kind: 'reach', margin: 2 },
    sweep: { arc: SCYTHE.arc, over: SCYTHE.lifeTime },
    impact: { color: 'metal.hi', count: 7 },
  },
};
