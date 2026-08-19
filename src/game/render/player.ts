import type { Player } from '../../types';
import { aimingUp, drawHeldWeapon, type AimInput } from './weapons';
import { px } from './pixel';
import { drawSprite } from './sprites/format';
import {
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  armPlacement,
  armSprite,
  armSpriteId,
  playerSprite,
  playerSpriteId,
} from './sprites/player';
import { BODY_H, BODY_W } from './sprites/masks/player';
import { armPose, playerPose } from './pose';
import { PLAYER_SIZE } from '../data/physics';

/**
 * Jugador completo: sombra, escudo, cuerpo, brazo y arma.
 *
 * El dibujo mide `BODY_W × BODY_H` y es **mayor que la caja de colisión**, anclado por los
 * pies. Se estampa en tres piezas y en este orden: cuerpo, brazo, arma. El brazo va aparte
 * del cuerpo porque si entrara en su silueta cada pose necesitaría variante de brazo
 * bajado y alzado, y los sprites se multiplicarían por dos.
 */
export const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, aim: AimInput) => {
  if (p.hp <= 0) return;

  // Parpadeo de invulnerabilidad, con el reloj de animación en vez del reloj del
  // sistema: así dos partidas iguales parpadean igual.
  const blinking = p.invincibleTimer > 0 && Math.floor(p.animTimer * 10) % 2 !== 0;
  if (blinking) return;

  const pose = playerPose(p);
  const flip = p.facing === -1;
  const arm = armPose(p, aimingUp(p, aim));
  const place = armPlacement(p.character, arm);
  const armDef = armSprite(arm);

  // Sombra: dos tiras al ancho de la **huella de los pies**, no del dibujo. El dibujo
  // mide 34 y los pies apenas 20: una sombra de 34 haría flotar al personaje.
  px(ctx, p.x + 6, p.y + p.h - 2, p.w - 12, 2, 'gum.out');
  px(ctx, p.x + 9, p.y + p.h, p.w - 18, 1, 'gum.out');

  if (p.shield > 0) drawShield(ctx, p);

  drawSprite(ctx, playerSpriteId(p.character, pose), playerSprite(p.character, pose), p.x, p.y, flip);

  // El brazo y el puño se espejan **sobre el centro de la caja**, que es exactamente el
  // centro del dibujo porque la diferencia de anchos es par. Un ancho impar dejaría el eje
  // a medio píxel y el personaje daría un salto lateral al girarse.
  const armX = flip ? PLAYER_SIZE - place.x - armDef.w : place.x;
  const handX = flip ? PLAYER_SIZE - 1 - place.handX : place.handX;
  drawSprite(ctx, armSpriteId(arm), armDef, p.x + armX, p.y + place.y, flip);

  drawHeldWeapon(ctx, p, aim, { x: p.x + handX, y: p.y + place.handY });
};

/**
 * Barrera de pasta dental: un anillo de píxeles alrededor del jugador.
 *
 * Ciñe el **dibujo**, no la caja de colisión. Sobre la caja, la corona sobresalía por
 * arriba y se veía la cabeza fuera de la barrera, que es justo lo contrario de lo que una
 * barrera tiene que contar.
 *
 * Se dibuja con tramos rectos en lugar de un `arc` con `shadowBlur`, que a esta resolución
 * se convertía en una mancha borrosa.
 */
const drawShield = (ctx: CanvasRenderingContext2D, p: Player) => {
  const left = p.x + BODY_OFFSET_X - 3;
  const top = p.y + BODY_OFFSET_Y - 2;
  const right = p.x + BODY_OFFSET_X + BODY_W + 2;
  const bottom = p.y + BODY_OFFSET_Y + BODY_H + 1;
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
