import type { World } from '../world';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/physics';
import { tone } from '../data/palette';
import { drawBackground } from './background';
import { drawPlatforms, drawTransition } from './level';
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
  ctx.fillStyle = tone('void.out');
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // El reloj es tiempo de simulación, no de pared: lo poco que se mueve en el
  // fondo se congela con la pausa, igual que el bamboleo de los objetos.
  drawBackground(ctx, world.camera.x, world.level.stage, world.triggers.levelTime);

  ctx.save();
  // Cámara en enteros: con desplazamiento fraccionario todo el mundo se dibuja
  // a medio píxel y el pixel art tiembla al moverse. El scroll queda un poco
  // escalonado, que es el precio correcto en este estilo.
  ctx.translate(-Math.round(world.camera.x), -Math.round(world.camera.y));

  drawPlatforms(ctx, world.platforms, world.level.stage);
  world.powerups.forEach((pu) => drawPowerUp(ctx, pu, world.triggers.levelTime));
  drawEnemies(ctx, world.enemies);
  drawProjectiles(ctx, world.projectiles);
  drawParticles(ctx, world.particles);
  drawPlayer(ctx, world.player, aim);

  ctx.restore();

  drawTransition(ctx, world.transition.progress, world.level.stage);
};
