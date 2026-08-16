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
} from '../types';
import { createPlayer, type RunConfig } from './player';
import { generateLevel } from './level';

/**
 * Valores continuos que pinta el HUD. El motor los escribe aquí en vez de
 * llamar a setters de React: la simulación no debe conocer la capa de UI.
 * El componente publica esta instantánea una vez por frame.
 */
export interface HudSnapshot {
  score: number;
  hp: number;
  maxHp: number;
  stage: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
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

/** Estado mutable de la simulación. Se muta in situ, frame a frame. */
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
  transition: { phase: 'none' | 'closing' | 'opening'; progress: number };
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
    levelWidth: INITIAL_LEVEL_WIDTH,
  };

  return {
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
    transition: { phase: 'none', progress: 0 },
    hud: {
      score: 0,
      hp: player.hp,
      maxHp: player.maxHp,
      stage: 1,
      bossName: 'Boss',
      bossHp: 0,
      bossMaxHp: 0,
    },
    events: [],
  };
};

/** true si algún valor de la instantánea cambió respecto a la anterior. */
export const hudChanged = (a: HudSnapshot, b: HudSnapshot): boolean =>
  a.score !== b.score ||
  a.hp !== b.hp ||
  a.maxHp !== b.maxHp ||
  a.stage !== b.stage ||
  a.bossName !== b.bossName ||
  a.bossHp !== b.bossHp ||
  a.bossMaxHp !== b.bossMaxHp;
