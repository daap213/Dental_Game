export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY,
  PAUSED,
  PERK_SELECTION,
}

export type InputMethod = 'mouse' | 'keyboard';
export type LoadoutType = 'all' | WeaponType;
export type Language = 'en' | 'es';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'legend';
export type CharacterType = 'incisor' | 'canine' | 'premolar' | 'molar';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity extends Rect {
  id: string;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: 'player' | 'enemy' | 'projectile' | 'powerup' | 'platform' | 'particle';
  color: string;
  facing: 1 | -1; // 1 right, -1 left
  isGrounded: boolean;
  /**
   * Contador de uso mixto según la entidad: en el jugador es el enfriamiento del
   * arma en pasos de simulación; en los enemigos, segundos acumulados que usa su
   * IA. Para animar hay `animTimer`, que siempre significa lo mismo.
   */
  frameTimer: number;
  state: number; // For animation state
  dead?: boolean;
}

/**
 * Estado que existe solo para dibujar. Lo llevan los personajes (jugador y
 * enemigos), no los proyectiles ni las partículas, que no tienen poses.
 */
export interface Animated {
  /**
   * Segundos de simulación acumulados: de aquí sale el fotograma del ciclo de
   * andar y los pulsos. Nunca influye en la simulación, así que se puede
   * reiniciar sin consecuencias.
   */
  animTimer: number;
  /**
   * Segundos que quedan de destello por daño recibido. Lo pone el bloque de
   * colisiones y lo consume el dibujado: es la única señal de impacto que tiene
   * el juego.
   */
  hitTimer: number;
}

export type WeaponType =
  | 'normal'
  | 'spread'
  | 'laser'
  | 'mouthwash'
  | 'floss'
  | 'toothbrush'
  /** Arco de seda dental: flecha rápida que atraviesa la fila. */
  | 'bow'
  /** Guadaña de raspador: barrido ancho y lento, el golpe más contundente. */
  | 'scythe';

export interface Player extends Entity, Animated {
  type: 'player';
  character: CharacterType;
  invincibleTimer: number;
  slowTimer: number;

  // Shield (Toothpaste Barrier)
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;

  // Lives
  lives: number;

  weapon: WeaponType;
  weaponLevel: number;
  weaponLevels: { [key in WeaponType]: number };
  ammo: number;
  score: number;

  // Abilities
  jumpCount: number;
  maxJumps: number;
  dashTimer: number;
  dashCooldown: number;
  consecutiveDashes: number;

  // RPG Stats / Multipliers
  stats: {
    speedMultiplier: number;
    damageMultiplier: number;
    dashCooldownMultiplier: number;
    maxDashes: number;
    damageReduction: number; // 0 to 1 (e.g., 0.15 = 15% less damage)
    damageTakenMultiplier: number; // Base multiplier from difficulty (e.g., 1.05 for Legend)
  };

  // Run Progress
  runStats: {
    killCount: number;
    nextScoreMilestone: number;
    nextKillMilestone: number;
    currentKillStep: number;
  };
}

export interface Enemy extends Entity, Animated {
  type: 'enemy';
  subType:
    | 'bacteria'
    | 'plaque_monster'
    | 'candy_bomber'
    | 'tartar_turret'
    | 'sugar_rusher'
    | 'boss'
    | 'sugar_fiend'
    | 'acid_spitter'
    | 'gingivitis_grunt'
    // Los cuatro que cubren huecos de juego que no existían: atacar desde
    // arriba, obligar a colocarse, dividirse al morir y tender emboscadas.
    | 'biofilm_crawler'
    | 'calculus_shell'
    | 'abscess_bloater'
    | 'enamel_borer';
  aiTimer: number;
  attackTimer: number;
  /**
   * Segundos que quedan de pose de ataque. La IA lo pone justo donde lanza el
   * ataque, que es el único sitio que sabe de verdad que está atacando.
   */
  actionTimer: number;
  bossState: number; // 0: Idle, 1: Chase, 2: Charge, 3: Slam, 4: Shoot
  bossVariant?: 'king' | 'phantom' | 'tank' | 'general' | 'deity' | 'wisdom_warden';
  phase?: number;
  /**
   * Cota a la que la barrena se enterró.
   *
   * Bajo tierra el sprite no se dibuja —estaría por debajo del suelo— y en su
   * lugar se pinta un montículo a esta altura, que es lo que avisa de por dónde
   * viene. Sin el aviso, emerger al lado del jugador sería una emboscada injusta.
   */
  burrowY?: number;
}

/**
 * Qué clase de proyectil es, que es lo que decide cómo se mueve.
 *
 * Tiene nombre propio —antes era un union escrito dentro de `Projectile`— porque la tabla
 * de conductas de `game/data/projectiles.ts` es un `Record` sobre él: así, añadir una clase
 * sin decir cómo se comporta es un error de compilación.
 */
export type ProjectileType =
  | 'bullet'
  | 'laser'
  | 'wave'
  | 'floss'
  | 'sword'
  | 'mortar'
  | 'acid'
  | 'sludge'
  | 'judgment_orb'
  /** El frasco de enjuague lanzado: cae y se rompe. */
  | 'flask'
  /** El fogonazo del frasco al romperse, que es donde está su daño. */
  | 'burst'
  /** La flecha del arco: rápida, fina y perforante. */
  | 'arrow'
  /** El barrido de la guadaña. */
  | 'reap'
  /**
   * La broca que escupe la lanza de torno.
   *
   * Tiene clase propia y no reutiliza `bullet` porque es el proyectil que más se ve en toda
   * la partida —`normal` es el arma con la que siempre se cuenta— y como bala genérica era
   * indistinguible del disparo de cualquier enemigo.
   */
  | 'drill';

export interface Projectile extends Entity {
  type: 'projectile';
  damage: number;
  owner: 'player' | 'enemy';
  lifeTime: number;
  projectileType: ProjectileType;
  hitIds: string[]; // Track which entities have been hit to prevent multi-tick damage on piercing
  /**
   * Las medidas de la hoja **en su propio eje**: de largo y de grueso.
   *
   * De aquí sale la caja envolvente cuando el proyectil apunta en diagonal, y también el alcance
   * de un golpe. Tiene que ir aparte de `w` y `h` porque esos dos son ya la envolvente y cambian
   * con la inclinación: sacando el alcance de ellos, el golpe se estiraba y se encogía a lo largo
   * del barrido.
   *
   * Opcional porque solo lo llevan los proyectiles que se orientan: las veintitantas llamadas
   * que crean balas de enemigo y patrones de jefe siguen igual.
   */
  blade?: { long: number; thick: number };
  /**
   * El paso de inclinación con el que se dibuja, de 0 a 15.
   *
   * Lo escribe la simulación —al nacer, y en cada paso mientras un golpe barre— y el dibujado
   * solo lo lee. Es a propósito: el dibujo y la caja tienen que salir del **mismo** número, y
   * cuando cada uno lo derivaba por su lado acabaron discrepando en noventa grados.
   */
  aimStep?: number;
}

export interface Particle extends Entity {
  type: 'particle';
  lifeTime: number;
  alpha: number;
}

export interface PowerUp extends Entity {
  type: 'powerup';
  subType: 'health' | WeaponType;
}

export interface Platform extends Rect {
  type: 'platform';
  isGround: boolean;
}

export interface Camera {
  x: number;
  y: number;
}

export interface LevelState {
  stage: number;
  distanceTraveled: number;
  bossSpawned: boolean;
  /**
   * El jefe del stage ya ha caído. Separado de `bossSpawned` porque el jefe
   * oculto también es `subType: 'boss'`: sin esta distinción, matarlo contaba
   * como limpiar el stage (y podía aparecer a media pantalla del inicio),
   * mientras que matar al jefe del stage con el oculto todavía vivo podía
   * volver a generar al jefe del stage.
   */
  bossDefeated: boolean;
  levelWidth: number;
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or simple string key
  rarity: 'common' | 'rare' | 'legendary';
  color: string;
  weight: number; // Probability weight (higher = more common)
}
