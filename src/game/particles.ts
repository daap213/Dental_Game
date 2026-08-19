import type { Particle } from '../types';

/**
 * Chispas y salpicaduras.
 *
 * Estaba dentro de `GameCanvas.tsx`, que está en la lista de **sustituir, no reparar**, y
 * ahora hace falta desde `game/`: el reventón del frasco de enjuague las lanza, y el
 * reventón vive en la simulación de proyectiles.
 *
 * Sigue el patrón del resto de `src/game/`: recibe el array y empuja dentro.
 */

/** Cuánto duran, en segundos, y cuánto se abren al nacer. */
const LIFE = 0.5;
const LIFE_SPREAD = 0.5;
const SPEED = 10;
const SIZE = 4;

export const spawnParticles = (
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number
): void => {
  for (let i = 0; i < count; i++) {
    particles.push({
      id: Math.random().toString(),
      x,
      y,
      w: SIZE,
      h: SIZE,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      hp: 0,
      maxHp: 0,
      type: 'particle',
      lifeTime: LIFE + Math.random() * LIFE_SPREAD,
      alpha: 1,
      color,
      facing: 1,
      isGrounded: false,
      frameTimer: 0,
      state: 0,
    });
  }
};
