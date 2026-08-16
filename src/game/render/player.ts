import type { Player } from '../../types';
import { drawHeldWeapon, type AimInput } from './weapons';

/** Silueta del diente según la clase elegida. */
const drawPlayerSprite = (ctx: CanvasRenderingContext2D, p: Player, px: number, py: number) => {
  ctx.fillStyle = '#fff';
  ctx.beginPath();

  if (p.character === 'incisor') {
    // Flat top, rectangular
    ctx.moveTo(px, py);
    ctx.lineTo(px + p.w, py);
    ctx.lineTo(px + p.w - 5, py + p.h);
    ctx.lineTo(px + 5, py + p.h);
    ctx.closePath();
  } else if (p.character === 'canine') {
    // Pointy
    ctx.moveTo(px, py + p.h / 3);
    ctx.lineTo(px + p.w / 2, py - 5);
    ctx.lineTo(px + p.w, py + p.h / 3);
    ctx.lineTo(px + p.w - 5, py + p.h);
    ctx.lineTo(px + 5, py + p.h);
    ctx.closePath();
  } else if (p.character === 'premolar') {
    // Two cusps
    ctx.moveTo(px + 2, py + 5);
    ctx.lineTo(px + p.w / 4, py - 2);
    ctx.lineTo(px + p.w / 2, py + 5);
    ctx.lineTo(px + p.w * 0.75, py - 2);
    ctx.lineTo(px + p.w - 2, py + 5);
    ctx.lineTo(px + p.w - 4, py + p.h);
    ctx.lineTo(px + 4, py + p.h);
    ctx.closePath();
  } else {
    // MOLAR (Default)
    ctx.moveTo(px + 4, py + 8);
    ctx.quadraticCurveTo(px + p.w / 4, py, px + p.w / 2, py + 6);
    ctx.quadraticCurveTo(px + (3 * p.w) / 4, py, px + p.w - 4, py + 8);
    ctx.quadraticCurveTo(px + p.w, py + p.h / 2, px + p.w - 6, py + p.h - 4);
    ctx.lineTo(px + p.w / 2 + 4, py + p.h);
    ctx.lineTo(px + p.w / 2, py + p.h - 8);
    ctx.lineTo(px + p.w / 2 - 4, py + p.h);
    ctx.lineTo(px + 6, py + p.h - 4);
    ctx.quadraticCurveTo(px, py + p.h / 2, px + 4, py + 8);
  }
  ctx.fill();

  // Shading
  const grad = ctx.createLinearGradient(px, py, px, py + p.h);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(200,200,200,0.2)');
  ctx.fillStyle = grad;
  ctx.fill();
};

/**
 * Jugador completo: sombra, escudo, silueta, cara, cinta y arma en mano.
 * No se dibuja si está muerto, y parpadea mientras es invulnerable.
 */
export const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, aim: AimInput) => {
  if (p.hp <= 0) return;
  const blinking = p.invincibleTimer > 0 && Math.floor(Date.now() / 100) % 2 !== 0;
  if (blinking) return;

  ctx.save();
  const px = p.x;
  const py = p.y;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + p.w / 2, py + p.h - 2, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (p.shield > 0) {
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + Math.sin(Date.now() / 200) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + p.w / 2, py + p.h / 2, p.w / 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawPlayerSprite(ctx, p, px, py);

  // Face
  const lookOffset = p.facing * 2;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(px + p.w / 2 + 4 + lookOffset, py + 14, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.ellipse(px + p.w / 2 - 4 + lookOffset, py + 14, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sweatband
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(px + 2, py + 8, p.w - 4, 4);
  if (p.facing === -1) ctx.fillRect(px + p.w - 4, py + 8, 8, 4);
  else ctx.fillRect(px - 4, py + 8, 8, 4);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px + p.w / 2 + p.facing * 10, py + 22, 5, 0, Math.PI * 2);
  ctx.fill();

  drawHeldWeapon(ctx, p, aim);

  ctx.restore();
};
