/**
 * Paleta del juego.
 *
 * Vive en `data/` y no en `render/` a propósito: las entidades llevan `color`
 * como campo y `data/enemies.ts` asigna el color de cada enemigo, así que si
 * la paleta colgara de la capa de presentación el dominio tendría que importar
 * de ella. Aquí la consumen ambas capas sin invertir la dependencia.
 */
export const COLORS = {
  bgTop: '#fbcfe8',
  bgBottom: '#be185d',
  bgProp: '#db2777',

  player: '#ffffff',
  playerOutline: '#3b82f6',

  // Enemigos
  enemyBacteria: '#10b981',
  enemyPlaque: '#d97706',
  enemyCandy: '#ef4444',
  enemyTurret: '#7c3aed',
  enemyRusher: '#f472b6',
  enemyBoss: '#3f3f46',
  enemySugarFiend: '#ec4899',
  enemyAcidSpitter: '#a3e635',
  enemyGrunt: '#991b1b',
  /** Jefe oculto (dorado). */
  enemyWarden: '#facc15',

  // Proyectiles
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
