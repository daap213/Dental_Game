import type { WeaponType } from '../../types';

/**
 * Escalado por nivel de cada arma (1-5). Estos números eran literales sueltos
 * dentro de `spawnProjectile`, y la cadencia vivía aparte, incrustada en el
 * bloque de disparo de GameCanvas. Aquí quedan como única fuente de verdad.
 *
 * Los tests de `weapons.data.test.ts` fijan estos valores: son el criterio de
 * aceptación del balance cuando el motor se porte a Phaser.
 */

export interface WeaponStats {
  /** Daño por proyectil. */
  damage: number;
  /** Cadencia en frames entre disparos (menor = más rápido). */
  cooldownFrames: number;
  /** Cuántos proyectiles genera un disparo. */
  projectileCount: number;
}

export const MAX_LEVEL = 5;

const clampLevel = (level: number) => Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL);

const BASE_OFFSET = 5;
const WIDE_OFFSET = BASE_OFFSET * 2.5;

/**
 * Desplazamiento perpendicular de cada bala del arma normal, en el orden en
 * que se generan. El abanico se abre a partir del nivel 3.
 *
 * Es la **única** descripción del patrón: el número de proyectiles es la
 * longitud de esta lista y `spawnProjectile` la recorre para colocarlos. Antes
 * el conteo y la colocación estaban codificados por separado y podían divergir.
 */
export const normalOffsets = (level: number): readonly number[] => {
  if (level < 3) return [0];
  if (level === 3) return [-BASE_OFFSET, BASE_OFFSET];
  if (level === 4) return [-BASE_OFFSET, BASE_OFFSET, 0];
  return [-BASE_OFFSET, BASE_OFFSET, 0, -WIDE_OFFSET, WIDE_OFFSET];
};

/**
 * Desplazamiento de cada onda del enjuague bucal. La central siempre está;
 * en el nivel 3 aparece una lateral y en el 5 la opuesta.
 * El signo indica de qué lado se coloca respecto a la dirección de disparo.
 */
export const mouthwashOffsets = (level: number): readonly number[] => {
  if (level < 3) return [0];
  if (level < 5) return [0, -1];
  return [0, -1, 1];
};

export const NORMAL = {
  damage: (l: number) => 8 + l * 2,
  offsets: normalOffsets,
  speed: 18,
  w: 10,
  h: 6,
  lifeTime: 1.0,
} as const;

export const SPREAD = {
  damage: (l: number) => 6 + l,
  count: (l: number) => 3 + (l - 1) * 2,
  spreadFactor: (l: number) => (l >= 4 ? 0.8 : l === 3 ? 1.0 : 1.5),
  speed: 16,
  size: 8,
  lifeTime: 1.0,
} as const;

export const LASER = {
  damage: (l: number) => 15 + (l - 1) * 8,
  width: (l: number) => 4 + (l - 1) * 4,
  speed: 28,
  lifeTime: 0.8,
} as const;

/**
 * El enjuague, que pasa de onda recta a **frasco lanzado que estalla**.
 *
 * Tres cosas que hacen que el lanzamiento funcione y que no son evidentes:
 *
 * - **`lift`**: sin impulso hacia arriba no hay parábola. El frasco nace a dos píxeles del
 *   suelo cuando el jugador está de pie, así que lanzado en horizontal tocaba tierra al
 *   segundo paso, treinta píxeles más allá. Con `lift` describe un arco de vértice a unos
 *   cincuenta píxeles y alcanza de trescientos a quinientos según el nivel.
 * - **La gravedad es la entera**, no la mitad que llevan los morteros del jefe: un frasco
 *   de vidrio tiene que caer más pesado que un obús, y de paso las dos parábolas se
 *   distinguen a la vista.
 * - **`offsets` deja de ser desplazamiento y pasa a ser ángulo**: el mismo número de
 *   proyectiles por nivel —1, 1, 2, 2, 3— pero en abanico, como un racimo. Así el recuento
 *   que fija `balance.test.ts` no se mueve.
 *
 * El daño se va al reventón, no al vuelo, y eso es el cambio de jugabilidad: hay que
 * adelantar el tiro.
 */
export const MOUTHWASH = {
  damage: (l: number) => 20 + (l - 1) * 12,
  offsets: mouthwashOffsets,
  speed: (l: number) => 10 + l * 2,
  size: (l: number) => 16 + l * 5,
  /** Impulso vertical del lanzamiento. Negativo es hacia arriba. */
  lift: -8,
  /** Cuánto se separa cada frasco del racimo, en radianes. */
  spread: (18 * Math.PI) / 180,
  /** Lo que ocupa el reventón. */
  burstSize: (l: number) => 90 + (l - 1) * 20,
  /** Lo que dura el fogonazo, lo justo para que se vea y alcance a quien entre en él. */
  burstLife: 0.1,
  /** Mecha, no tiempo de vuelo: si no ha chocado con nada, estalla igual. */
  lifeTime: 1.2,
} as const;

export const FLOSS = {
  damage: (l: number) => 25 + (l - 1) * 15,
  range: (l: number) => 100 + (l - 1) * 60,
  thickness: (l: number) => 20 + (l - 1) * 10,
  lifeTime: 0.15,
} as const;

/**
 * La espada de cerdas: un golpe que **barre**, y por eso su caja es un arco y no un cuadro.
 *
 * Era un cuadrado de 60 a 200 px anclado a veinte del centro del jugador, o sea que a
 * nivel 5 cubría cien píxeles en todas las direcciones. Con esa forma el barrido es
 * invisible: girar la caja mueve su centro por una circunferencia de radio veinte —cuarenta
 * píxeles de recorrido para una caja de doscientos, un veinte por ciento— y además no hay
 * nada que el arco pueda descubrir, porque la caja ya lo cubría todo desde el primer
 * fotograma.
 *
 * Así que el barrido no es una conducta que se le añada al golpe: es esta geometría.
 * **Radial** es lo estrecho —el grosor del filo—, **tangencial** lo largo —el largo del
 * filo— y **gap** la distancia del filo al centro del jugador. El cambio baja mucho la
 * superficie cubierta a la vez y la reparte en el tiempo, lo cual **no mueve ni el daño ni
 * la cadencia**: por eso hace falta un test propio de cobertura, porque `balance.test.ts` no
 * puede verlo.
 */
export const TOOTHBRUSH = {
  damage: (l: number) => 35 + (l - 1) * 20,
  /** Grosor del filo. */
  radial: (l: number) => 24 + (l - 1) * 4,
  /** Largo del filo. */
  tangential: (l: number) => 56 + (l - 1) * 10,
  /** Del centro del jugador al filo. */
  gap: (l: number) => 30 + (l - 1) * 6,
  /** Amplitud del barrido. Estrecho y rápido: es una estocada. */
  arc: (110 * Math.PI) / 180,
  lifeTime: 0.2,
} as const;

/**
 * El arco de seda dental: la única arma que premia **alinearse** con los enemigos.
 *
 * «Rápida» es la flecha, no la cadencia: cadencia rápida más perforación duplicaría al arma
 * normal o la dejaría inútil. Lo que la distingue es el golpe único más alto de todo lo que
 * se dispara a distancia, el proyectil más veloz del juego, y el castigo por fallar: una
 * caja de catorce por cuatro no perdona, frente a los veinte por veinte del láser.
 */
export const BOW = {
  damage: (l: number) => 26 + (l - 1) * 16,
  speed: 34,
  w: 20,
  h: 7,
  lifeTime: 0.9,
} as const;

/**
 * La guadaña de raspador: el barrido más ancho y el golpe más fuerte, a cambio de lentitud.
 *
 * Comparte la geometría de arco de la espada —radial estrecho, tangencial largo— pero con
 * ciento cincuenta grados frente a ciento diez, la mitad más de vida y más alcance. Su
 * identidad es la **cobertura**, no el daño por segundo.
 */
export const SCYTHE = {
  damage: (l: number) => 50 + (l - 1) * 30,
  radial: (l: number) => 26 + (l - 1) * 5,
  tangential: (l: number) => 70 + (l - 1) * 14,
  arc: (150 * Math.PI) / 180,
  lifeTime: 0.3,
} as const;

/** Proyectil genérico de enemigo (todos los enemigos comunes disparan esto). */
export const ENEMY_BULLET = {
  damage: 10,
  speed: 9,
  size: 10,
  lifeTime: 2,
} as const;

/**
 * Umbral de daño a partir del cual una bala enemiga persigue al jugador.
 * Lo usa el jefe oculto, que dispara balas normales de daño 25 en vez de
 * llevar su propia lógica de guiado.
 */
export const HOMING_DAMAGE_THRESHOLD = 20;

const COOLDOWN_FRAMES: Record<WeaponType, (level: number) => number> = {
  normal: (l) => (l >= 2 ? 6 : 10),
  spread: () => 20,
  laser: () => 20,
  mouthwash: (l) => (l >= 2 ? 22 : 30),
  floss: () => 18,
  toothbrush: (l) => (l >= 2 ? 15 : 20),
  // Cadencia lenta a propósito: es el precio del golpe único más alto a distancia.
  bow: (l) => (l >= 4 ? 22 : l >= 2 ? 26 : 30),
  // La más lenta de todas: su virtud es lo que barre, no lo que repite.
  scythe: (l) => (l >= 5 ? 26 : l >= 3 ? 28 : 30),
};

export const getFireCooldown = (weapon: WeaponType, level: number): number =>
  (COOLDOWN_FRAMES[weapon] ?? (() => 10))(clampLevel(level));

/**
 * Todas las armas, en el orden en que se presentan.
 *
 * Sale de las claves de `COOLDOWN_FRAMES`, que es un `Record` sobre el union y por tanto
 * está completo o no compila. Antes esta lista estaba escrita a mano **cuatro veces** —en
 * la galería, en el menú de equipamiento, en los tests de equilibrio y en los de armas—, y
 * omitir un arma en cualquiera de ellas no daba error: quedaba invisible en la ficha,
 * inseleccionable en el menú y sin comprobar en los tests. Peor aún, el test de la galería
 * comparaba la lista **consigo misma**, así que tampoco lo cazaba.
 */
export const WEAPONS = Object.keys(COOLDOWN_FRAMES) as readonly WeaponType[];

/**
 * Qué parte de los botes es salud, frente a armas.
 *
 * Estaba escrito como una escalera de umbrales —`r > 0.85`, `r > 0.7`…— con la salud
 * quedándose lo que sobraba, o sea el 25 %. Con esa forma, **añadir dos armas bajaba la
 * salud al 12,5 %**: una merma de aguante en todo el juego, silenciosa y bastante grande.
 *
 * Fijándola, las armas se reparten el resto entre todas, sean seis u ocho.
 */
export const HEALTH_DROP_SHARE = 0.25;

/** Qué arma toca, dado un número entre 0 y 1. Reparto igual entre todas. */
export const weaponFromRoll = (roll: number): WeaponType => {
  const index = Math.min(WEAPONS.length - 1, Math.floor(roll * WEAPONS.length));
  return WEAPONS[index];
};

/**
 * Resumen por arma y nivel; lo consumen la Base de Datos del menú y los tests.
 *
 * El `switch` **no tiene `default`** a propósito. Lo tenía, y devolvía las cifras del arma
 * normal: un arma nueva reportaba diez de daño y la cadencia de la turbina en la ficha y en
 * los tests de equilibrio, sin que nada fallara. Sin `default`, la función no devuelve nada
 * por un camino y eso sí es un error de compilación.
 */
export const getWeaponStats = (weapon: WeaponType, rawLevel: number): WeaponStats => {
  const level = clampLevel(rawLevel);
  const cooldownFrames = getFireCooldown(weapon, level);

  switch (weapon) {
    case 'spread':
      return { damage: SPREAD.damage(level), cooldownFrames, projectileCount: SPREAD.count(level) };
    case 'laser':
      return { damage: LASER.damage(level), cooldownFrames, projectileCount: 1 };
    case 'mouthwash':
      return {
        damage: MOUTHWASH.damage(level),
        cooldownFrames,
        projectileCount: MOUTHWASH.offsets(level).length,
      };
    case 'floss':
      return { damage: FLOSS.damage(level), cooldownFrames, projectileCount: 1 };
    case 'toothbrush':
      return { damage: TOOTHBRUSH.damage(level), cooldownFrames, projectileCount: 1 };
    case 'bow':
      return { damage: BOW.damage(level), cooldownFrames, projectileCount: 1 };
    case 'scythe':
      return { damage: SCYTHE.damage(level), cooldownFrames, projectileCount: 1 };
    case 'normal':
      return {
        damage: NORMAL.damage(level),
        cooldownFrames,
        projectileCount: NORMAL.offsets(level).length,
      };
  }
};
