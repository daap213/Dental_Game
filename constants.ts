
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GRAVITY = 0.65; // Increased gravity for snappier jumps
export const TERMINAL_VELOCITY = 16;
export const FRICTION = 0.8;
export const PLAYER_SPEED = 7.5; // Faster movement
export const PLAYER_JUMP = -14; // Stronger jump
export const PLAYER_SIZE = 32;

// Abilities
export const PLAYER_DASH_SPEED = 22; // Faster dash
export const PLAYER_DASH_DURATION = 0.2; // seconds
export const PLAYER_DASH_COOLDOWN = 0.8; // Reduced cooldown
export const PLAYER_MAX_JUMPS = 2;
export const MAX_WEAPON_LEVEL = 3;

// Colors
export const COLORS = {
  bgTop: '#fbcfe8', // pink-200
  bgBottom: '#be185d', // pink-700
  bgProp: '#db2777', // pink-600 (darker background elements)
  
  player: '#ffffff',
  playerOutline: '#3b82f6',
  
  // Enemies
  enemyBacteria: '#10b981', // green-500
  enemyPlaque: '#d97706', // amber-600
  enemyCandy: '#ef4444', // red-500
  enemyTurret: '#7c3aed', // violet-600
  enemyRusher: '#f472b6', // pink-400
  enemyBoss: '#3f3f46', // zinc-700 (Rotten Tooth)
  
  // New Enemies
  enemySugarFiend: '#ec4899', // pink-500 (Crystal)
  enemyAcidSpitter: '#a3e635', // lime-400
  enemyGrunt: '#991b1b', // red-800 (Inflamed)

  // Projectiles
  projectilePlayer: '#60a5fa', // blue-400
  projectileEnemy: '#059669', // emerald-600
  projectileLaser: '#06b6d4', // cyan-500
  projectileWave: '#a78bfa', // purple-400
  projectileMelee: '#e2e8f0', // slate-200
  projectileAcid: '#bef264', // lime-300
  projectileSludge: '#f9a8d4', // pink-300
  
  ground: '#9d174d', // pink-800
  platform: '#fdf2f8', // pink-50
};
