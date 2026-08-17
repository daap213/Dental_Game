import type { Enemy } from '../../types';
import { drawSprite } from './sprites/format';
import { enemySprite, enemySpriteId, hasEnemySprite } from './sprites/enemies';
import { enemyPose } from './pose';
import { drawBoss } from './bosses';

/**
 * Dibujado de enemigos.
 *
 * Los ocho enemigos comunes son sprites dibujados a mano (`sprites/masks/enemies.ts`)
 * del tamaño exacto de su hitbox: lo que se ve es lo que golpea. Los jefes no
 * caben en una matriz —van de 100 a 160 px— y se dibujan con las primitivas de
 * píxel en `render/bosses.ts`.
 *
 * La pose sale del estado que ya lleva la simulación (`render/pose.ts`), así que
 * aquí no hay ninguna máquina de animación.
 */
export const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Enemy[]) => {
  enemies.forEach((e) => {
    if (e.subType === 'boss') {
      drawBoss(ctx, e);
      return;
    }

    if (!hasEnemySprite(e.subType)) return;

    const pose = enemyPose(e);
    drawSprite(
      ctx,
      enemySpriteId(e.subType, pose),
      enemySprite(e.subType, pose),
      e.x,
      e.y,
      // Miran a la izquierda por defecto: los sprites se dibujan mirando a la
      // izquierda, así que se espejan cuando persiguen hacia la derecha.
      e.facing === 1
    );
  });
};
