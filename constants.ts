
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GRAVITY = 0.65;
export const TERMINAL_VELOCITY = 16;
export const FRICTION = 0.8;
export const PLAYER_SPEED = 7.5;
export const PLAYER_JUMP = -14;
export const PLAYER_SIZE = 32;

// Abilities
export const PLAYER_DASH_SPEED = 22;
export const PLAYER_DASH_DURATION = 0.2;
export const PLAYER_DASH_COOLDOWN = 0.8;
export const PLAYER_MAX_JUMPS = 2;
export const MAX_WEAPON_LEVEL = 3;

// Perk Thresholds
export const SCORE_MILESTONE_START = 6200;
export const SCORE_MILESTONE_INCREMENT = 8000;

export const KILL_MILESTONE_START = 20;
export const KILL_MILESTONE_INCREMENT_START = 10; // Increases by 10 each time (20, +30, +50, +80)

export const SHIELD_REGEN_DELAY = 5.0; // Seconds before shield starts regening
export const SHIELD_REGEN_RATE = 10; // Per second

// Colors
export const COLORS = {
  bgTop: '#fbcfe8',
  bgBottom: '#be185d',
  bgProp: '#db2777',
  
  player: '#ffffff',
  playerOutline: '#3b82f6',
  
  // Enemies
  enemyBacteria: '#10b981',
  enemyPlaque: '#d97706',
  enemyCandy: '#ef4444',
  enemyTurret: '#7c3aed',
  enemyRusher: '#f472b6',
  enemyBoss: '#3f3f46',
  
  // New Enemies
  enemySugarFiend: '#ec4899',
  enemyAcidSpitter: '#a3e635',
  enemyGrunt: '#991b1b',

  // Projectiles
  projectilePlayer: '#60a5fa',
  projectileEnemy: '#059669',
  projectileLaser: '#06b6d4',
  projectileWave: '#a78bfa',
  projectileMelee: '#e2e8f0',
  projectileAcid: '#bef264',
  projectileSludge: '#f9a8d4',
  
  ground: '#9d174d',
  platform: '#fdf2f8',
};