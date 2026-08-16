import React, { useEffect, useRef } from 'react';
import { RAMPS, tone, type Material, type Tone } from '../../game/data/palette';
import { px, setupPixelContext } from '../../game/render/pixel';
import { dither, ditherBand } from '../../game/render/dither';
import { drawSprite } from '../../game/render/sprites/format';
import { playerSprite, playerSpriteId, PLAYER_CHARACTERS, PLAYER_POSES } from '../../game/render/sprites/player';
import { useIntegerScale } from '../useIntegerScale';

/**
 * Galería de revisión del arte, detrás de `?sprites=1`.
 *
 * No es parte del juego: existe para poder mirar toda la paleta y todos los
 * sprites de una vez, en lugar de tener que jugar hasta encontrarse con cada
 * enemigo. A medida que se vayan dibujando los sprites, se añaden aquí.
 */

const GALLERY_W = 800;
const GALLERY_H = 780;

const TONES: Tone[] = ['out', 'dark', 'mid', 'light'];
const SWATCH = 22;
const ROW_H = 26;

const paintGallery = (ctx: CanvasRenderingContext2D) => {
  px(ctx, 0, 0, GALLERY_W, GALLERY_H, 'void.out');

  ctx.font = '8px monospace';
  ctx.textBaseline = 'middle';

  // --- Rampas ---
  ctx.fillStyle = '#fff';
  ctx.fillText('RAMPAS DE PALETA  (out / dark / mid / light)', 8, 12);

  const materials = Object.keys(RAMPS) as Material[];
  const columns = 2;
  const colW = 380;

  materials.forEach((material, i) => {
    const col = Math.floor(i / Math.ceil(materials.length / columns));
    const row = i % Math.ceil(materials.length / columns);
    const x = 8 + col * colW;
    const y = 26 + row * ROW_H;

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(material, x, y + SWATCH / 2);

    TONES.forEach((t, ti) => {
      const sx = x + 90 + ti * (SWATCH + 4);
      px(ctx, sx, y, SWATCH, SWATCH, `${material}.${t}`);
      // Contorno claro para poder juzgar el tono sobre el fondo oscuro.
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx, y + SWATCH, SWATCH, 1);
    });

    ctx.fillStyle = '#475569';
    ctx.fillText(tone(`${material}.mid`), x + 90 + 4 * (SWATCH + 4) + 6, y + SWATCH / 2);
  });

  // --- Tramado ---
  const ditherY = 26 + Math.ceil(materials.length / columns) * ROW_H + 16;
  ctx.fillStyle = '#fff';
  ctx.fillText('TRAMADO: transiciones sin degradado', 8, ditherY);

  const demos: [Material, string][] = [
    ['gum', 'encía: dark -> light'],
    ['enamel', 'esmalte: dark -> light'],
    ['void', 'vacío: out -> light'],
    ['warden', 'guardián: dark -> light'],
  ];

  demos.forEach(([material, label], i) => {
    const x = 8 + i * 196;
    const y = ditherY + 12;
    ditherBand(ctx, x, y, 180, 90, `${material}.dark`, `${material}.light`, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label, x, y + 100);
  });

  // --- Jugador ---
  const playerY = ditherY + 130;
  ctx.fillStyle = '#fff';
  ctx.fillText('JUGADOR: 4 clases x 4 poses  (32x32, escala x2)', 8, playerY);

  PLAYER_CHARACTERS.forEach((character, ci) => {
    const y = playerY + 16 + ci * 76;

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(character, 8, y + 34);

    PLAYER_POSES.forEach((pose, pi) => {
      const x = 76 + pi * 84;
      const def = playerSprite(character, pose);

      // Fondo a cuadros para juzgar la silueta y el contorno.
      dither(ctx, x - 2, y - 2, 68, 68, 'metal.out', 'void.dark', 8);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.scale(2, 2);
      drawSprite(ctx, playerSpriteId(character, pose), def, 0, 0);
      ctx.restore();

      if (ci === 0) {
        ctx.fillStyle = '#64748b';
        ctx.fillText(pose, x, y - 8);
      }
    });

    // El mismo sprite a tamaño real, para comprobar que se lee a 32 px.
    const realX = 76 + PLAYER_POSES.length * 84 + 16;
    dither(ctx, realX - 2, y - 2, 36, 36, 'metal.out', 'void.dark', 8);
    drawSprite(ctx, playerSpriteId(character, 'idle'), playerSprite(character, 'idle'), realX, y);
    if (ci === 0) {
      ctx.fillStyle = '#64748b';
      ctx.fillText('x1', realX, y - 8);
    }
  });

  // --- Nota ---
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    'Fase 2: jugador. Pendientes los 8 enemigos, los 6 jefes y los fondos.',
    8,
    GALLERY_H - 10
  );
};

export const SpriteGallery: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, width, height } = useIntegerScale<HTMLDivElement>(GALLERY_W, GALLERY_H);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setupPixelContext(ctx);
    paintGallery(ctx);
  }, []);

  return (
    <div ref={containerRef} className="flex h-screen w-full items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={GALLERY_W}
        height={GALLERY_H}
        className="block"
        style={{ width, height, imageRendering: 'pixelated' }}
      />
    </div>
  );
};
