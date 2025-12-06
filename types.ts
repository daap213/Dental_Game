
export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY,
  PAUSED,
  PERK_SELECTION
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
  frameTimer: number; // For animation
  state: number; // For animation state
  dead?: boolean;
}

export type WeaponType = 'normal' | 'spread' | 'laser' | 'mouthwash' | 'floss' | 'toothbrush';

export interface Player extends Entity {
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

export interface Enemy extends Entity {
  type: 'enemy';
  subType: 'bacteria' | 'plaque_monster' | 'candy_bomber' | 'tartar_turret' | 'sugar_rusher' | 'boss' | 'sugar_fiend' | 'acid_spitter' | 'gingivitis_grunt';
  aiTimer: number;
  attackTimer: number;
  bossState: number; // 0: Idle, 1: Chase, 2: Charge, 3: Slam, 4: Shoot
  bossVariant?: 'king' | 'phantom' | 'tank' | 'general' | 'deity' | 'wisdom_warden';
  phase?: number;
}

export interface Projectile extends Entity {
  type: 'projectile';
  damage: number;
  owner: 'player' | 'enemy';
  lifeTime: number;
  projectileType: 'bullet' | 'laser' | 'wave' | 'floss' | 'sword' | 'mortar' | 'acid' | 'sludge' | 'judgment_orb';
  hitIds: string[]; // Track which entities have been hit to prevent multi-tick damage on piercing
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
