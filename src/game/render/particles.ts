import type { Particle } from '../../types';

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
  particles.forEach((part) => {
    ctx.globalAlpha = part.alpha;
    ctx.fillStyle = part.color;
    ctx.fillRect(part.x, part.y, part.w, part.h);
    ctx.globalAlpha = 1.0;
  });
};
