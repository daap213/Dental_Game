import type { Enemy, Player } from '../../types';

/**
 * Qué pose toca dibujar.
 *
 * Se deriva del estado que la simulación ya lleva —velocidad, si toca suelo, si
 * acaba de recibir daño, si acaba de atacar—, así que la animación no necesita
 * su propia máquina de estados y el dibujado sigue siendo una función del mundo.
 *
 * Cada personaje tiene cuatro sprites. El ciclo de andar se consigue alternando
 * entre `walk` e `idle` mientras se mueve: dos fotogramas gratis, que es lo justo
 * para que se lea el paso.
 */

export type EnemyPose = 'idle' | 'walk' | 'attack' | 'hurt';
export type PlayerPose = 'idle' | 'walk' | 'jump' | 'hurt';

/** Fotogramas por segundo del ciclo de andar. */
export const WALK_FPS = 8;

/** Velocidad mínima para considerar que un enemigo camina. */
export const ENEMY_WALK_THRESHOLD = 0.3;
/** Velocidad mínima para considerar que el jugador camina. */
export const PLAYER_WALK_THRESHOLD = 0.5;

/** true en la mitad "levantada" del ciclo de andar. */
export const walkPhase = (animTimer: number): boolean =>
  Math.floor(Math.max(0, animTimer) * WALK_FPS) % 2 === 1;

export const enemyPose = (e: Enemy): EnemyPose => {
  if (e.hitTimer > 0) return 'hurt';
  if (e.actionTimer > 0) return 'attack';
  if (Math.abs(e.vx) > ENEMY_WALK_THRESHOLD) return walkPhase(e.animTimer) ? 'walk' : 'idle';
  return 'idle';
};

export const playerPose = (p: Player): PlayerPose => {
  if (p.hitTimer > 0) return 'hurt';
  if (!p.isGrounded) return 'jump';
  if (Math.abs(p.vx) > PLAYER_WALK_THRESHOLD) return walkPhase(p.animTimer) ? 'walk' : 'idle';
  return 'idle';
};
