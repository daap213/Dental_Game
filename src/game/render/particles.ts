import type { Particle } from '../../types';

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
  particles.forEach((part) => {
    ctx.globalAlpha = part.alpha;
    ctx.fillStyle = part.color;
    // Enteros: una partícula a medio píxel se dibuja con antialias y ensucia.
    ctx.fillRect(Math.round(part.x), Math.round(part.y), Math.round(part.w), Math.round(part.h));
    ctx.globalAlpha = 1.0;
  });
};
