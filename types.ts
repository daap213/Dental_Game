export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY,
  PAUSED
}

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
  frameTimer: number; // For animation
  state: number; // For animation state
  dead?: boolean;
}

export type WeaponType = 'normal' | 'spread' | 'laser' | 'mouthwash' | 'floss';

export interface Player extends Entity {
  type: 'player';
  invincibleTimer: number;
  weapon: WeaponType;
  ammo: number;
  score: number;
}

export interface Enemy extends Entity {
  type: 'enemy';
  subType: 'bacteria' | 'plaque_monster' | 'candy_bomber' | 'tartar_turret' | 'sugar_rusher' | 'boss';
  aiTimer: number;
  attackTimer: number;
}

export interface Projectile extends Entity {
  type: 'projectile';
  damage: number;
  owner: 'player' | 'enemy';
  lifeTime: number;
  projectileType: 'bullet' | 'laser' | 'wave' | 'floss';
}

export interface Particle extends Entity {
  type: 'particle';
  lifeTime: number;
  alpha: number;
}

export interface PowerUp extends Entity {
  type: 'powerup';
  subType: 'health' | 'spread' | 'laser' | 'mouthwash';
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
  levelWidth: number;
}