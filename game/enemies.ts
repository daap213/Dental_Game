
import { Enemy, LevelState, Projectile, Particle, Rect } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, GRAVITY } from '../constants';
import { AudioManager } from './audio';

export const spawnBoss = (level: LevelState, setBossName: (n:string)=>void, setBossMaxHp: (n:number)=>void, setBossHp: (n:number)=>void, audio: AudioManager, enemies: Enemy[]) => {
    const stage = level.stage;
    const baseHp = 1500;
    let maxHp = baseHp + (stage * 800);
    let bossVariant: Enemy['bossVariant'] = 'king';
    let w = 120, h = 160;
    let color = COLORS.enemyBoss;
    let name = "The Cavity King";

    if (stage === 1) {
        bossVariant = 'king'; name = "The Cavity King"; maxHp = 1500; color = '#3f3f46';
    } else if (stage === 2) {
        bossVariant = 'phantom'; name = "Plaque Phantom"; maxHp = 2200; color = '#22d3ee'; w = 100; h = 100;
    } else if (stage === 3) {
        bossVariant = 'tank'; name = "Tartar Tank"; maxHp = 3500; color = '#57534e'; w = 160; h = 140;
    } else if (stage === 4) {
        bossVariant = 'general'; name = "General Gingivitis"; maxHp = 3000; color = '#dc2626'; w = 100; h = 180;
    } else {
        bossVariant = 'deity'; name = "The Decay Deity"; maxHp = 6000; color = '#0f172a'; w = 140; h = 140;
    }

    setBossName(name);
    audio.playBossIntro(bossVariant);

    enemies.push({
        id: 'boss',
        x: level.levelWidth - 800 + 500,
        y: CANVAS_HEIGHT - 250,
        w, h, vx: 0, vy: 0, hp: maxHp, maxHp: maxHp,
        type: 'enemy', subType: 'boss', bossVariant, phase: 1,
        color, facing: -1, isGrounded: true, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0
    });
    setBossMaxHp(maxHp);
    setBossHp(maxHp);
};

export const spawnEnemy = (level: LevelState, cameraX: number, enemies: Enemy[]) => {
    if (level.bossSpawned) return;

    const x = cameraX + CANVAS_WIDTH + 50;
    const y = Math.random() > 0.5 ? CANVAS_HEIGHT - 120 : CANVAS_HEIGHT - 240;
    const rand = Math.random();
    let subType: Enemy['subType'] = 'bacteria';
    let w = 32, h = 32, hp = 20 + (level.stage * 4), color = COLORS.enemyBacteria;
    
    if (rand > 0.95) { subType = 'plaque_monster'; w = 48; h = 36; hp = 80 + (level.stage * 10); color = COLORS.enemyPlaque; }
    else if (rand > 0.9) { subType = 'gingivitis_grunt'; w = 40; h = 48; hp = 60 + (level.stage * 5); color = COLORS.enemyGrunt; }
    else if (rand > 0.8) { subType = 'tartar_turret'; w = 32; h = 48; hp = 50; color = COLORS.enemyTurret; }
    else if (rand > 0.7) { subType = 'acid_spitter'; w = 36; h = 36; hp = 40; color = COLORS.enemyAcidSpitter; }
    else if (rand > 0.6) { subType = 'candy_bomber'; w = 40; h = 24; hp = 30; color = COLORS.enemyCandy; }
    else if (rand > 0.5) { subType = 'sugar_fiend'; w = 28; h = 28; hp = 25; color = COLORS.enemySugarFiend; }
    else if (rand > 0.4) { subType = 'sugar_rusher'; w = 24; h = 24; hp = 20; color = COLORS.enemyRusher; }

    enemies.push({
      id: Math.random().toString(),
      x, y, w, h, vx: 0, vy: 0, hp, maxHp: hp, type: 'enemy', subType,
      color, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0
    });
};

const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) => {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,radius); ctx.fill();
};

export const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Enemy[]) => {
    enemies.forEach(e => {
        if (e.bossVariant === 'phantom' && e.bossState === 5) ctx.globalAlpha = 0.2;
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

// ... Drawing functions extracted from GameCanvas ...
const drawBacteria = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    const pulses = Math.sin(e.frameTimer * 10) * 2;
    const r = e.w / 2 + pulses;
    ctx.beginPath();
    const spikes = 12;
    for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const outerR = r + 4; const innerR = r - 2;
        const xOut = e.x + e.w/2 + Math.cos(angle) * outerR;
        const yOut = e.y + e.h/2 + Math.sin(angle) * outerR;
        const xIn = e.x + e.w/2 + Math.cos(angle + Math.PI/spikes) * innerR;
        const yIn = e.y + e.h/2 + Math.sin(angle + Math.PI/spikes) * innerR;
        if (i===0) ctx.moveTo(xOut, yOut); else ctx.lineTo(xOut, yOut);
        ctx.lineTo(xIn, yIn);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e.x + 10, e.y + 12, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 24, e.y + 10, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(e.x + 10, e.y + 12, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 24, e.y + 10, 1.5, 0, Math.PI*2); ctx.fill();
};

const drawPlaque = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + e.h);
    ctx.bezierCurveTo(e.x, e.y, e.x + e.w * 0.3, e.y - 10, e.x + e.w * 0.5, e.y + 5);
    ctx.bezierCurveTo(e.x + e.w * 0.7, e.y - 5, e.x + e.w, e.y, e.x + e.w, e.y + e.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath(); ctx.arc(e.x + 10, e.y + e.h - 5, 5, 0, Math.PI*2); ctx.arc(e.x + e.w - 15, e.y + e.h - 2, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 15, 8, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 15, 2, 0, Math.PI*2); ctx.fill();
};

const drawCandy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = '#f87171';
    ctx.beginPath(); ctx.moveTo(e.x, e.y + e.h/2); ctx.lineTo(e.x - 8, e.y); ctx.lineTo(e.x - 8, e.y + e.h); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(e.x + e.w, e.y + e.h/2); ctx.lineTo(e.x + e.w + 8, e.y); ctx.lineTo(e.x + e.w + 8, e.y + e.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(e.x + 10, e.y + 5); ctx.lineTo(e.x + 10, e.y + e.h - 5);
    ctx.moveTo(e.x + 20, e.y + 2); ctx.lineTo(e.x + 20, e.y + e.h - 2);
    ctx.moveTo(e.x + 30, e.y + 5); ctx.lineTo(e.x + 30, e.y + e.h - 5); ctx.stroke();
};

const drawTurret = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.moveTo(e.x - 5, e.y + e.h); ctx.lineTo(e.x + e.w/2, e.y + e.h - 10); ctx.lineTo(e.x + e.w + 5, e.y + e.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(e.x, e.y + 20); ctx.lineTo(e.x + e.w/2, e.y); ctx.lineTo(e.x + e.w, e.y + 20); ctx.lineTo(e.x + e.w/2, e.y + e.h - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.moveTo(e.x + e.w/2, e.y); ctx.lineTo(e.x + e.w - 5, e.y + 20); ctx.lineTo(e.x + e.w/2, e.y + 30); ctx.fill();
};

const drawRusher = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(e.x + e.w/2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h/2); ctx.lineTo(e.x + e.w/2, e.y + e.h); ctx.lineTo(e.x, e.y + e.h/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fce7f3';
    ctx.beginPath(); ctx.moveTo(e.x + e.w/2, e.y + 6); ctx.lineTo(e.x + e.w - 6, e.y + e.h/2); ctx.lineTo(e.x + e.w/2, e.y + e.h - 6); ctx.lineTo(e.x + 6, e.y + e.h/2); ctx.fill();
};

const drawSugarFiend = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(e.x + e.w/2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h * 0.3); ctx.lineTo(e.x + e.w * 0.8, e.y + e.h); ctx.lineTo(e.x + e.w * 0.2, e.y + e.h); ctx.lineTo(e.x, e.y + e.h * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath(); ctx.moveTo(e.x + e.w/2, e.y + 5); ctx.lineTo(e.x + e.w - 5, e.y + e.h * 0.3); ctx.lineTo(e.x + e.w/2, e.y + e.h * 0.6); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(e.x + 8, e.y + 12, 4, 4); ctx.fillRect(e.x + 16, e.y + 12, 4, 4);
};

const drawAcidSpitter = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + e.h/2 + 5, e.w/2, 0, Math.PI*2); ctx.fill();
    const pulse = Math.sin(Date.now() / 200) * 3;
    ctx.fillStyle = '#bef264';
    ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 5, 8 + pulse, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 15, 6, 8, 0, 0, Math.PI*2); ctx.fill();
};

const drawGingivitisGrunt = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#7f1d1d';
    const shieldX = e.facing === -1 ? e.x - 5 : e.x + e.w - 5;
    ctx.fillRect(shieldX, e.y + 5, 10, e.h - 10);
    ctx.fillStyle = '#000'; ctx.fillRect(e.x + 5, e.y + 8, e.w - 10, 6);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x + (e.facing === 1 ? 20 : 10), e.y + 9, 6, 4);
};

const drawBoss = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    if (e.bossVariant === 'phantom') {
        ctx.save();
        ctx.beginPath(); ctx.moveTo(e.x, e.y + e.h); ctx.quadraticCurveTo(e.x, e.y, e.x + e.w/2, e.y); ctx.quadraticCurveTo(e.x + e.w, e.y, e.x + e.w, e.y + e.h);
        for(let i=e.x+e.w; i>e.x; i-=20) { ctx.lineTo(i-10, e.y+e.h-20 + Math.sin(Date.now()/100 + i)*5); ctx.lineTo(i-20, e.y+e.h); }
        ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(e.x+30, e.y+40, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x+70, e.y+40, 8, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    } else if (e.bossVariant === 'tank') {
        ctx.fillStyle = '#292524'; 
        ctx.beginPath(); ctx.roundRect(e.x - 10, e.y + e.h - 30, e.w + 20, 30, 5); ctx.fill();
        ctx.fillStyle = '#57534e';
        for(let i=0; i<3; i++) { ctx.beginPath(); ctx.arc(e.x + 20 + (i*60), e.y + e.h - 15, 10, 0, Math.PI*2); ctx.fill(); }
        ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.w, e.h - 20);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(e.x, e.y + 20, e.w, 5); ctx.fillRect(e.x, e.y + 60, e.w, 5);
        ctx.fillStyle = '#44403c';
        ctx.save(); ctx.translate(e.x + e.w/2, e.y + 20); ctx.rotate(-Math.PI / 4);
        ctx.fillRect(0, -12, 70, 24); ctx.strokeStyle = '#000'; ctx.lineWidth=2; ctx.strokeRect(0, -12, 70, 24);
        ctx.restore();
    } else if (e.bossVariant === 'general') {
        ctx.beginPath(); const wobble = Math.sin(Date.now()/300)*5; ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2 + wobble, e.h/2 - wobble, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e3a8a'; ctx.fillRect(e.x + 10, e.y, e.w - 20, 30);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(e.x, e.y + 30); ctx.lineTo(e.x + e.w, e.y+30); ctx.lineTo(e.x + e.w + 10, e.y + 40); ctx.lineTo(e.x - 10, e.y + 40); ctx.fill();
        ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 8, 0, Math.PI*2); ctx.fill();
    } else if (e.bossVariant === 'deity') {
        ctx.fillStyle = e.phase === 2 ? '#7f1d1d' : '#0f172a';
        ctx.beginPath(); const spikes = 20; const r = e.w/2 + (Math.sin(Date.now()/100)*5);
        for(let i=0; i<spikes*2; i++) { const angle = (Math.PI*2*i)/(spikes*2); const len = i%2===0 ? r : r*0.8; ctx.lineTo(e.x + e.w/2 + Math.cos(angle)*len, e.y + e.h/2 + Math.sin(angle)*len); }
        ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(e.x + 40, e.y + 60, 15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x + e.w - 40, e.y + 60, 15, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = e.color;
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(e.x, e.y + 20); ctx.lineTo(e.x, e.y - 20); ctx.lineTo(e.x + 20, e.y + 10); ctx.lineTo(e.x + 40, e.y - 30); ctx.lineTo(e.x + 60, e.y + 10); ctx.lineTo(e.x + 80, e.y - 30); ctx.lineTo(e.x + 100, e.y + 10); ctx.lineTo(e.x + 120, e.y - 20); ctx.lineTo(e.x + 120, e.y + 20); ctx.fill();
        ctx.fillStyle = e.color; 
        ctx.beginPath(); ctx.roundRect(e.x, e.y + 20, e.w, e.h - 60, 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(e.x + 20, e.y + e.h - 40); ctx.lineTo(e.x + 40, e.y + e.h); ctx.lineTo(e.x + 60, e.y + e.h - 20); ctx.lineTo(e.x + 80, e.y + e.h); ctx.lineTo(e.x + 100, e.y + e.h - 40); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 80, 20, 30, 0, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(e.x + 30, e.y + 50, 8, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(e.x + e.w - 30, e.y + 50, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x + 20, e.y + 20); ctx.lineTo(e.x + 40, e.y + 60); ctx.lineTo(e.x + 30, e.y + 90); ctx.stroke();
    }
};
