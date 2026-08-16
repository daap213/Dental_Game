import type {
  Player,
  Enemy,
  Projectile,
  Particle,
  PowerUp,
  Platform,
  Camera,
  LevelState,
  Perk,
  WeaponType,
} from '../types';
import { createPlayer, type RunConfig } from './player';
import { generateLevel } from './level';
import { createTriggerState, type TriggerState } from './triggers';

/**
 * Valores que pinta el HUD. El motor los escribe aquí en vez de llamar a
 * setters de React: la simulación no debe conocer la capa de UI. El componente
 * publica esta instantánea una vez por frame.
 *
 * Todo lo que el HUD muestre tiene que estar **aquí**. El HUD leía antes la
 * mitad de sus datos del `Player` mutable directamente, así que solo se
 * refrescaban cuando cambiaba otra cosa de esta instantánea: cambiar de arma no
 * da puntos, luego el HUD seguía mostrando la anterior hasta la siguiente baja.
 */
export interface HudSnapshot {
  score: number;
  hp: number;
  maxHp: number;
  stage: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;

  // Estado del jugador
  /** Redondeado hacia arriba: la regeneración es continua y no interesa
   *  re-renderizar React en cada frame por una décima de escudo. */
  shield: number;
  maxShield: number;
  lives: number;
  weapon: WeaponType;
  weaponLevel: number;
  slowed: boolean;

  // Multiplicadores acumulados por perks, clase y dificultad
  damageMultiplier: number;
  speedMultiplier: number;
  damageReduction: number;
  dashCooldownMultiplier: number;
  maxDashes: number;
}

/**
 * Sucesos puntuales que la UI debe atender una sola vez. El componente vacía
 * la cola cada frame. Al migrar a Phaser esta cola pasa a ser el EventBus.
 */
export type GameEvent =
  | { type: 'perk-offer'; perks: Perk[] }
  | { type: 'stage-changed'; stage: number }
  | { type: 'boss-defeated' }
  | { type: 'game-over'; score: number }
  | { type: 'victory' };

/** Estado mutable de la simulación. Se muta in situ, paso a paso. */
export interface World {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  powerups: PowerUp[];
  platforms: Platform[];
  camera: Camera;
  level: LevelState;
  /** Segundos acumulados desde la última aparición de enemigo. */
  waveTimer: number;
  /** Intensidad restante del temblor de cámara. */
  shake: number;
  levelTransitioning: boolean;
  /**
   * Segundos que faltan para que se cierren las mandíbulas tras limpiar el
   * stage. Antes era un `setTimeout` que nadie cancelaba: si reiniciabas dentro
   * de esos 3 segundos, saltaba sobre la partida nueva y la hacía subir de
   * stage. Como temporizador del mundo, se reinicia con el mundo.
   */
  stageClearTimer: number;
  transition: { phase: 'none' | 'closing' | 'opening'; progress: number };
  /** Relojes de comportamiento que invocan al jefe oculto. */
  triggers: TriggerState;
  hud: HudSnapshot;
  events: GameEvent[];
}

const INITIAL_LEVEL_WIDTH = 8000;

export const createWorld = (config: RunConfig): World => {
  const player = createPlayer(config);
  const level: LevelState = {
    stage: 1,
    distanceTraveled: 0,
    bossSpawned: false,
    bossDefeated: false,
    levelWidth: INITIAL_LEVEL_WIDTH,
  };

  const world: World = {
    player,
    enemies: [],
    projectiles: [],
    particles: [],
    powerups: [],
    platforms: generateLevel(level.levelWidth),
    camera: { x: 0, y: 0 },
    level,
    waveTimer: 0,
    shake: 0,
    levelTransitioning: false,
    stageClearTimer: 0,
    transition: { phase: 'none', progress: 0 },
    triggers: createTriggerState(player.x),
    hud: {
      score: 0,
      hp: player.hp,
      maxHp: player.maxHp,
      stage: 1,
      bossName: 'Boss',
      bossHp: 0,
      bossMaxHp: 0,
      shield: Math.ceil(player.shield),
      maxShield: player.maxShield,
      lives: player.lives,
      weapon: player.weapon,
      weaponLevel: player.weaponLevel,
      slowed: false,
      damageMultiplier: player.stats.damageMultiplier,
      speedMultiplier: player.stats.speedMultiplier,
      damageReduction: player.stats.damageReduction,
      dashCooldownMultiplier: player.stats.dashCooldownMultiplier,
      maxDashes: player.stats.maxDashes,
    },
    events: [],
  };

  return world;
};

/**
 * Copia al HUD todo lo que se deriva del jugador.
 *
 * Se llama una vez por frame desde el bucle, no desde la simulación, así que
 * también corre mientras el juego está congelado eligiendo perk. Esto sustituye
 * a los `s.hud.hp = p.hp` repartidos por `update()`, que había que recordar
 * poner en cada sitio que tocara una estadística.
 *
 * `bossName`, `bossHp` y `bossMaxHp` no se tocan aquí: los escribe la IA del
 * jefe, que es quien sabe cuál está activo.
 */
export const syncHud = (world: World) => {
  const p = world.player;
  const hud = world.hud;

  hud.score = p.score;
  // Sin bajar de 0: el golpe mortal deja la vida en negativo y el HUD pintaba
  // "-12/115" y una barra de anchura negativa durante el último frame.
  hud.hp = Math.max(0, p.hp);
  hud.maxHp = p.maxHp;
  hud.stage = world.level.stage;
  hud.shield = Math.ceil(p.shield);
  hud.maxShield = p.maxShield;
  hud.lives = p.lives;
  hud.weapon = p.weapon;
  hud.weaponLevel = p.weaponLevel;
  hud.slowed = p.slowTimer > 0;
  hud.damageMultiplier = p.stats.damageMultiplier;
  hud.speedMultiplier = p.stats.speedMultiplier;
  hud.damageReduction = p.stats.damageReduction;
  hud.dashCooldownMultiplier = p.stats.dashCooldownMultiplier;
  hud.maxDashes = p.stats.maxDashes;
};

/**
 * Copia de la instantánea, para poder comparar el mundo contra lo último que vio
 * la UI.
 *
 * Tiene que ser una **copia**. El bucle guardaba la referencia
 * (`published = world.hud`), así que `hudChanged` comparaba el objeto consigo
 * mismo: siempre daba falso y `setHud` no volvía a llamarse nunca. El HUD se
 * quedaba congelado en los valores del arranque —la barra de vida no bajaba al
 * recibir daño y la puntuación no subía— aunque el motor estuviera escribiendo
 * los valores correctos.
 */
export const snapshotHud = (world: World): HudSnapshot => ({ ...world.hud });

/** true si algún valor de la instantánea cambió respecto a la anterior. */
export const hudChanged = (a: HudSnapshot, b: HudSnapshot): boolean =>
  a.score !== b.score ||
  a.hp !== b.hp ||
  a.maxHp !== b.maxHp ||
  a.stage !== b.stage ||
  a.bossName !== b.bossName ||
  a.bossHp !== b.bossHp ||
  a.bossMaxHp !== b.bossMaxHp ||
  a.shield !== b.shield ||
  a.maxShield !== b.maxShield ||
  a.lives !== b.lives ||
  a.weapon !== b.weapon ||
  a.weaponLevel !== b.weaponLevel ||
  a.slowed !== b.slowed ||
  a.damageMultiplier !== b.damageMultiplier ||
  a.speedMultiplier !== b.speedMultiplier ||
  a.damageReduction !== b.damageReduction ||
  a.dashCooldownMultiplier !== b.dashCooldownMultiplier ||
  a.maxDashes !== b.maxDashes;
