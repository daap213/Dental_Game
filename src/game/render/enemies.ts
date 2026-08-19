import type { Enemy } from '../../types';
import { isBurrowed } from '../data/enemies';
import { px } from './pixel';
import { drawSprite } from './sprites/format';
import { enemySprite, enemySpriteId, hasEnemySprite } from './sprites/enemies';
import { enemyPose } from './pose';
import { drawBoss } from './bosses';

/**
 * Dibujado de enemigos.
 *
 * Los doce enemigos comunes son sprites dibujados a mano (`sprites/masks/enemies.ts`)
 * del tamaño exacto de su hitbox: lo que se ve es lo que golpea. Los jefes no
 * caben en una matriz —van de 100 a 160 px— y se dibujan con las primitivas de
 * píxel en `render/bosses.ts`.
 *
 * La pose sale del estado que ya lleva la simulación (`render/pose.ts`), así que
 * aquí no hay ninguna máquina de animación.
 */
/**
 * El montículo de la barrena: el bulto que levanta al viajar bajo el suelo.
 *
 * Es el aviso. Sin él, emerger junto al jugador sería una emboscada que no se puede
 * ver venir, y eso no es dificultad, es una trampa.
 */
const drawMound = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  const y = Math.round(e.burrowY ?? e.y);
  const x = Math.round(e.x);
  const w = e.w;

  // Tres filas que se estrechan: la lengua abultada por debajo.
  for (let i = 0; i < 4; i++) {
    const inset = i * 3;
    px(ctx, x + inset, y + e.h - 6 + i, w - inset * 2, 1, i === 0 ? 'tongue.light' : 'tongue.dark');
  }
  // Y polvillo a los lados, para que se lea que avanza.
  px(ctx, x - 3, y + e.h - 3, 2, 2, 'tongue.mid');
  px(ctx, x + w + 1, y + e.h - 3, 2, 2, 'tongue.mid');
};

export const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Enemy[]) => {
  enemies.forEach((e) => {
    if (e.subType === 'boss') {
      drawBoss(ctx, e);
      return;
    }

    if (!hasEnemySprite(e.subType)) return;

    // La barrena bajo tierra no se dibuja: estaría por debajo del suelo, y los
    // enemigos se pintan **encima** de las plataformas, así que se vería flotando
    // dentro de la lengua. En su lugar va el montículo que la delata.
    if (isBurrowed(e)) {
      drawMound(ctx, e);
      return;
    }

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
