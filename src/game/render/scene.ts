import type { World } from '../world';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/physics';
import { drawBackground, drawPlatforms, drawTransition } from './level';
import { drawEnemies } from './enemies';
import { drawProjectiles, drawPowerUp, type AimInput } from './weapons';
import { drawParticles } from './particles';
import { drawPlayer } from './player';

/**
 * Pinta un frame completo. Es el orden de capas que estaba incrustado en
 * `GameCanvas.draw()`: fondo fijo, luego el mundo desplazado por la cámara, y
 * por último la transición de mandíbulas, que va en coordenadas de pantalla.
 */
export const renderScene = (ctx: CanvasRenderingContext2D, world: World, aim: AimInput) => {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground(ctx, world.camera.x, world.level.stage);

  ctx.save();
  ctx.translate(-world.camera.x, -world.camera.y);

  drawPlatforms(ctx, world.platforms);
  world.powerups.forEach((pu) => drawPowerUp(ctx, pu));
  drawEnemies(ctx, world.enemies);
  drawProjectiles(ctx, world.projectiles, world.player);
  drawParticles(ctx, world.particles);
  drawPlayer(ctx, world.player, aim);

  ctx.restore();

  drawTransition(ctx, world.transition.progress, world.level.stage);
};
