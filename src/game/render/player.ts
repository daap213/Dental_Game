import type { Player } from '../../types';
import { drawHeldWeapon, type AimInput } from './weapons';
import { px } from './pixel';
import { drawSprite } from './sprites/format';
import { playerSprite, playerSpriteId } from './sprites/player';
import { playerPose } from './pose';

/**
 * Jugador completo: sombra, escudo, sprite y arma en mano.
 *
 * La silueta ya no se dibuja con curvas: es un sprite de 32×32 dibujado a mano
 * (`sprites/masks/player.ts`) del que se eligen corona por clase y cuerpo por
 * pose. No se dibuja si está muerto, y parpadea mientras es invulnerable.
 */
export const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, aim: AimInput) => {
  if (p.hp <= 0) return;

  // Parpadeo de invulnerabilidad, con el reloj de animación en vez del reloj del
  // sistema: así dos partidas iguales parpadean igual.
  const blinking = p.invincibleTimer > 0 && Math.floor(p.animTimer * 10) % 2 !== 0;
  if (blinking) return;

  const pose = playerPose(p);

  // Sombra: tres tiras, que a esta escala leen mejor que una elipse suave.
  px(ctx, p.x + 8, p.y + p.h - 2, p.w - 16, 2, 'gum.out');
  px(ctx, p.x + 11, p.y + p.h, p.w - 22, 1, 'gum.out');

  if (p.shield > 0) drawShield(ctx, p);

  drawSprite(ctx, playerSpriteId(p.character, pose), playerSprite(p.character, pose), p.x, p.y, p.facing === -1);

  drawHeldWeapon(ctx, p, aim);
};

/**
 * Barrera de pasta dental: un anillo de píxeles alrededor del jugador.
 *
 * Se dibuja con ocho tramos rectos en lugar de un `arc` con `shadowBlur`, que a
 * esta resolución se convertía en una mancha borrosa.
 */
const drawShield = (ctx: CanvasRenderingContext2D, p: Player) => {
  const left = p.x - 3;
  const top = p.y - 2;
  const right = p.x + p.w + 2;
  const bottom = p.y + p.h + 1;
  const pulse = Math.floor(p.animTimer * 6) % 2 === 0;
  const shell = pulse ? 'laser.mid' : 'laser.light';

  // Lados
  px(ctx, left, top + 6, 1, bottom - top - 12, shell);
  px(ctx, right, top + 6, 1, bottom - top - 12, shell);
  // Arriba y abajo
  px(ctx, left + 6, top, right - left - 12, 1, shell);
  px(ctx, left + 6, bottom, right - left - 12, 1, shell);
  // Esquinas achaflanadas
  px(ctx, left + 2, top + 2, 4, 1, shell);
  px(ctx, right - 5, top + 2, 4, 1, shell);
  px(ctx, left + 2, bottom - 2, 4, 1, shell);
  px(ctx, right - 5, bottom - 2, 4, 1, shell);
  px(ctx, left + 1, top + 3, 1, 3, shell);
  px(ctx, right - 1, top + 3, 1, 3, shell);
  px(ctx, left + 1, bottom - 5, 1, 3, shell);
  px(ctx, right - 1, bottom - 5, 1, 3, shell);
};
