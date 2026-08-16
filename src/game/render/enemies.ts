import type { Enemy } from '../../types';

export const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Enemy[]) => {
  enemies.forEach((e) => {
    if (e.bossVariant === 'phantom' && e.bossState === 5) ctx.globalAlpha = 0.2;
    else if (e.bossVariant === 'wisdom_warden')
      ctx.globalAlpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
    else ctx.globalAlpha = 1.0;

    if (e.subType === 'bacteria') drawBacteria(ctx, e);
    else if (e.subType === 'plaque_monster') drawPlaque(ctx, e);
    else if (e.subType === 'candy_bomber') drawCandy(ctx, e);
    else if (e.subType === 'tartar_turret') drawTurret(ctx, e);
    else if (e.subType === 'sugar_rusher') drawRusher(ctx, e);
    else if (e.subType === 'sugar_fiend') drawSugarFiend(ctx, e);
    else if (e.subType === 'acid_spitter') drawAcidSpitter(ctx, e);
    else if (e.subType === 'gingivitis_grunt') drawGingivitisGrunt(ctx, e);
    else if (e.subType === 'boss') drawBoss(ctx, e);

    ctx.globalAlpha = 1.0;
  });
};

// ... Drawing functions ...
const drawBacteria = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  const pulses = Math.sin(e.frameTimer * 10) * 2;
  const r = e.w / 2 + pulses;
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2;
    const outerR = r + 4;
    const innerR = r - 2;
    const xOut = e.x + e.w / 2 + Math.cos(angle) * outerR;
    const yOut = e.y + e.h / 2 + Math.sin(angle) * outerR;
    const xIn = e.x + e.w / 2 + Math.cos(angle + Math.PI / spikes) * innerR;
    const yIn = e.y + e.h / 2 + Math.sin(angle + Math.PI / spikes) * innerR;
    if (i === 0) ctx.moveTo(xOut, yOut);
    else ctx.lineTo(xOut, yOut);
    ctx.lineTo(xIn, yIn);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(e.x + 10, e.y + 12, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e.x + 24, e.y + 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(e.x + 10, e.y + 12, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e.x + 24, e.y + 10, 1.5, 0, Math.PI * 2);
  ctx.fill();
};

const drawPlaque = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y + e.h);
  ctx.bezierCurveTo(e.x, e.y, e.x + e.w * 0.3, e.y - 10, e.x + e.w * 0.5, e.y + 5);
  ctx.bezierCurveTo(e.x + e.w * 0.7, e.y - 5, e.x + e.w, e.y, e.x + e.w, e.y + e.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.arc(e.x + 10, e.y + e.h - 5, 5, 0, Math.PI * 2);
  ctx.arc(e.x + e.w - 15, e.y + e.h - 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(e.x + e.w / 2, e.y + 15, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(e.x + e.w / 2, e.y + 15, 2, 0, Math.PI * 2);
  ctx.fill();
};

const drawCandy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.moveTo(e.x, e.y + e.h / 2);
  ctx.lineTo(e.x - 8, e.y);
  ctx.lineTo(e.x - 8, e.y + e.h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(e.x + e.w, e.y + e.h / 2);
  ctx.lineTo(e.x + e.w + 8, e.y);
  ctx.lineTo(e.x + e.w + 8, e.y + e.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(e.x + 10, e.y + 5);
  ctx.lineTo(e.x + 10, e.y + e.h - 5);
  ctx.moveTo(e.x + 20, e.y + 2);
  ctx.lineTo(e.x + 20, e.y + e.h - 2);
  ctx.moveTo(e.x + 30, e.y + 5);
  ctx.lineTo(e.x + 30, e.y + e.h - 5);
  ctx.stroke();
};

const drawTurret = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = '#4c1d95';
  ctx.beginPath();
  ctx.moveTo(e.x - 5, e.y + e.h);
  ctx.lineTo(e.x + e.w / 2, e.y + e.h - 10);
  ctx.lineTo(e.x + e.w + 5, e.y + e.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y + 20);
  ctx.lineTo(e.x + e.w / 2, e.y);
  ctx.lineTo(e.x + e.w, e.y + 20);
  ctx.lineTo(e.x + e.w / 2, e.y + e.h - 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(e.x + e.w / 2, e.y);
  ctx.lineTo(e.x + e.w - 5, e.y + 20);
  ctx.lineTo(e.x + e.w / 2, e.y + 30);
  ctx.fill();
};

const drawRusher = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(e.x + e.w / 2, e.y);
  ctx.lineTo(e.x + e.w, e.y + e.h / 2);
  ctx.lineTo(e.x + e.w / 2, e.y + e.h);
  ctx.lineTo(e.x, e.y + e.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fce7f3';
  ctx.beginPath();
  ctx.moveTo(e.x + e.w / 2, e.y + 6);
  ctx.lineTo(e.x + e.w - 6, e.y + e.h / 2);
  ctx.lineTo(e.x + e.w / 2, e.y + e.h - 6);
  ctx.lineTo(e.x + 6, e.y + e.h / 2);
  ctx.fill();
};

const drawSugarFiend = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(e.x + e.w / 2, e.y);
  ctx.lineTo(e.x + e.w, e.y + e.h * 0.3);
  ctx.lineTo(e.x + e.w * 0.8, e.y + e.h);
  ctx.lineTo(e.x + e.w * 0.2, e.y + e.h);
  ctx.lineTo(e.x, e.y + e.h * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fbcfe8';
  ctx.beginPath();
  ctx.moveTo(e.x + e.w / 2, e.y + 5);
  ctx.lineTo(e.x + e.w - 5, e.y + e.h * 0.3);
  ctx.lineTo(e.x + e.w / 2, e.y + e.h * 0.6);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillRect(e.x + 8, e.y + 12, 4, 4);
  ctx.fillRect(e.x + 16, e.y + 12, 4, 4);
};

const drawAcidSpitter = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(e.x + e.w / 2, e.y + e.h / 2 + 5, e.w / 2, 0, Math.PI * 2);
  ctx.fill();
  const pulse = Math.sin(Date.now() / 200) * 3;
  ctx.fillStyle = '#bef264';
  ctx.beginPath();
  ctx.arc(e.x + e.w / 2, e.y + 5, 8 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(e.x + e.w / 2, e.y + 15, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawGingivitisGrunt = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = '#7f1d1d';
  const shieldX = e.facing === -1 ? e.x - 5 : e.x + e.w - 5;
  ctx.fillRect(shieldX, e.y + 5, 10, e.h - 10);
  ctx.fillStyle = '#000';
  ctx.fillRect(e.x + 5, e.y + 8, e.w - 10, 6);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(e.x + (e.facing === 1 ? 20 : 10), e.y + 9, 6, 4);
};

const drawBoss = (ctx: CanvasRenderingContext2D, e: Enemy) => {
  ctx.fillStyle = e.color;
  if (e.bossVariant === 'wisdom_warden') {
    // HIDDEN BOSS VISUALS
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);

    // Golden Aura
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 20 + Math.sin(Date.now() / 100) * 10;

    // Spectral Body
    const grad = ctx.createLinearGradient(0, -e.h / 2, 0, e.h / 2);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = grad;

    // Tooth Shape
    ctx.beginPath();
    ctx.moveTo(-40, -50);
    ctx.bezierCurveTo(-20, -70, 20, -70, 40, -50);
    ctx.bezierCurveTo(60, -20, 50, 40, 20, 70);
    ctx.lineTo(0, 50);
    ctx.lineTo(-20, 70);
    ctx.bezierCurveTo(-50, 40, -60, -20, -40, -50);
    ctx.fill();

    // Third Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, -20, 15, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, -20, 3, 0, Math.PI * 2);
    ctx.fill();

    // Standard Eyes (Closed)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-30, 10);
    ctx.lineTo(-15, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, 10);
    ctx.lineTo(30, 10);
    ctx.stroke();

    ctx.restore();
  } else if (e.bossVariant === 'phantom') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + e.h);
    ctx.quadraticCurveTo(e.x, e.y, e.x + e.w / 2, e.y);
    ctx.quadraticCurveTo(e.x + e.w, e.y, e.x + e.w, e.y + e.h);
    for (let i = e.x + e.w; i > e.x; i -= 20) {
      ctx.lineTo(i - 10, e.y + e.h - 20 + Math.sin(Date.now() / 100 + i) * 5);
      ctx.lineTo(i - 20, e.y + e.h);
    }
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(e.x + 30, e.y + 40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x + 70, e.y + 40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (e.bossVariant === 'tank') {
    // ENHANCED TANK VISUALS
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.roundRect(e.x - 10, e.y + e.h - 30, e.w + 20, 30, 5);
    ctx.fill();
    ctx.fillStyle = '#57534e';
    // Treads
    for (let i = 0; i < 3; i++) {
      const offset = (Date.now() / 5) % 20;
      ctx.beginPath();
      ctx.arc(e.x + 20 + i * 60, e.y + e.h - 15, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(e.x + i * 60 + offset, e.y + e.h - 15, 5, 5);
      ctx.fillStyle = '#57534e';
    }
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.w, e.h - 20);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(e.x, e.y + 20, e.w, 5);
    ctx.fillRect(e.x, e.y + 60, e.w, 5);
    ctx.fillStyle = '#44403c';
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + 20);
    ctx.rotate(e.bossState === 1 ? -Math.PI / 2 : -Math.PI / 4);
    ctx.fillRect(0, -12, 70, 24);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -12, 70, 24);
    ctx.restore();
  } else if (e.bossVariant === 'general') {
    // ENHANCED GENERAL VISUALS
    ctx.beginPath();
    const wobble = Math.sin(Date.now() / 300) * 5;
    ctx.ellipse(
      e.x + e.w / 2,
      e.y + e.h / 2,
      e.w / 2 + wobble,
      e.h / 2 - wobble,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(e.x + 10, e.y, e.w - 20, 30);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + 30);
    ctx.lineTo(e.x + e.w, e.y + 30);
    ctx.lineTo(e.x + e.w + 10, e.y + 40);
    ctx.lineTo(e.x - 10, e.y + 40);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + 70, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + 70, 8, 0, Math.PI * 2);
    ctx.fill();
    if (e.bossState === 6 || e.bossState === 7) {
      // Grid Attack or Rain
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + 70, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (e.bossVariant === 'deity') {
    // ENHANCED DEITY ANIMATION (LEVEL 5)
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);

    // Multi-ring rotation
    const t = Date.now() / 1000;

    // Outer Ring
    ctx.rotate(t * 0.5);
    ctx.shadowColor = e.phase === 2 ? '#ef4444' : '#818cf8';
    ctx.shadowBlur = 20 + Math.sin(t * 5) * 10;
    ctx.fillStyle = e.phase === 2 ? '#450a0a' : '#020617';

    // Complex geometry
    ctx.beginPath();
    const petals = e.phase === 2 ? 12 : 8;
    for (let i = 0; i < petals * 2; i++) {
      const angle = (Math.PI * 2 * i) / (petals * 2);
      const r = i % 2 === 0 ? e.w * 0.6 : e.w * 0.3;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.fill();

    // Inner Ring (Counter Rotate)
    ctx.rotate(-t * 1.5);
    ctx.fillStyle = e.phase === 2 ? '#b91c1c' : '#312e81';
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rect(-20, -20, 40, 40);
      ctx.rotate(Math.PI / 4);
    }
    ctx.fill();

    // Core
    ctx.rotate(t * 3);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Glitch effect in Phase 2
    if (e.phase === 2 && Math.random() > 0.8) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(Math.random() * 100 - 50, Math.random() * 100 - 50, 50, 5);
    }

    ctx.restore();
  } else {
    ctx.fillStyle = e.color;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + 20);
    ctx.lineTo(e.x, e.y - 20);
    ctx.lineTo(e.x + 20, e.y + 10);
    ctx.lineTo(e.x + 40, e.y - 30);
    ctx.lineTo(e.x + 60, e.y + 10);
    ctx.lineTo(e.x + 80, e.y - 30);
    ctx.lineTo(e.x + 100, e.y + 10);
    ctx.lineTo(e.x + 120, e.y - 20);
    ctx.lineTo(e.x + 120, e.y + 20);
    ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.roundRect(e.x, e.y + 20, e.w, e.h - 60, 20);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x + 20, e.y + e.h - 40);
    ctx.lineTo(e.x + 40, e.y + e.h);
    ctx.lineTo(e.x + 60, e.y + e.h - 20);
    ctx.lineTo(e.x + 80, e.y + e.h);
    ctx.lineTo(e.x + 100, e.y + e.h - 40);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + 80, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(e.x + 30, e.y + 50, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x + e.w - 30, e.y + 50, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + 20, e.y + 20);
    ctx.lineTo(e.x + 40, e.y + 60);
    ctx.lineTo(e.x + 30, e.y + 90);
    ctx.stroke();
  }
};
