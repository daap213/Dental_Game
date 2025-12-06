
import { Enemy, LevelState, Projectile, Particle, Rect, Language, Player } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, GRAVITY } from '../constants';
import { AudioManager } from './audio';
import { spawnProjectile } from './weapons';
import { TEXT } from '../utils/locales';

export const spawnHiddenBoss = (p: Player, setBossName: (n:string)=>void, setBossMaxHp: (n:number)=>void, setBossHp: (n:number)=>void, audio: AudioManager, enemies: Enemy[], lang: Language) => {
    const maxHp = 5000;
    const name = TEXT[lang].bosses.wisdom;
    setBossName(name);
    setBossMaxHp(maxHp);
    setBossHp(maxHp);
    audio.playBossIntro('wisdom_warden');

    enemies.push({
        id: 'hidden_boss',
        x: p.x + 300,
        y: CANVAS_HEIGHT - 250,
        w: 120, h: 140, vx: 0, vy: 0, hp: maxHp, maxHp,
        type: 'enemy', subType: 'boss', bossVariant: 'wisdom_warden', phase: 1,
        color: COLORS.enemyWarden, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0
    });
};

export const spawnBoss = (level: LevelState, setBossName: (n:string)=>void, setBossMaxHp: (n:number)=>void, setBossHp: (n:number)=>void, audio: AudioManager, enemies: Enemy[], lang: Language) => {
    const stage = level.stage;
    const baseHp = 1500;
    let maxHp = baseHp + (stage * 800);
    let bossVariant: Enemy['bossVariant'] = 'king';
    let w = 120, h = 160;
    let color = COLORS.enemyBoss;
    
    let nameKey: keyof typeof TEXT['en']['bosses'] = 'king';

    if (stage === 1) {
        bossVariant = 'king'; nameKey = 'king'; maxHp = 1500; color = '#3f3f46';
    } else if (stage === 2) {
        bossVariant = 'phantom'; nameKey = 'phantom'; maxHp = 2200; color = '#22d3ee'; w = 100; h = 100;
    } else if (stage === 3) {
        bossVariant = 'tank'; nameKey = 'tank'; maxHp = 3500; color = '#57534e'; w = 160; h = 140;
    } else if (stage === 4) {
        bossVariant = 'general'; nameKey = 'general'; maxHp = 3000; color = '#dc2626'; w = 100; h = 180;
    } else {
        bossVariant = 'deity'; nameKey = 'deity'; maxHp = 6000; color = '#0f172a'; w = 140; h = 140;
    }
    
    const name = TEXT[lang].bosses[nameKey];

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
        else if (e.bossVariant === 'wisdom_warden') ctx.globalAlpha = 0.8 + Math.sin(Date.now()/200)*0.2;
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
    if (e.bossVariant === 'wisdom_warden') {
        // HIDDEN BOSS VISUALS
        ctx.save();
        ctx.translate(e.x + e.w/2, e.y + e.h/2);
        
        // Golden Aura
        ctx.shadowColor = '#facc15'; ctx.shadowBlur = 20 + Math.sin(Date.now()/100)*10;
        
        // Spectral Body
        const grad = ctx.createLinearGradient(0, -e.h/2, 0, e.h/2);
        grad.addColorStop(0, '#fef08a'); grad.addColorStop(1, '#ca8a04');
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
        ctx.beginPath(); ctx.ellipse(0, -20, 15, 25, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(0, -20, 3, 0, Math.PI*2); ctx.fill();

        // Standard Eyes (Closed)
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-30, 10); ctx.lineTo(-15, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, 10); ctx.lineTo(30, 10); ctx.stroke();
        
        ctx.restore();

    } else if (e.bossVariant === 'phantom') {
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
        // ENHANCED TANK VISUALS
        ctx.fillStyle = '#292524'; 
        ctx.beginPath(); ctx.roundRect(e.x - 10, e.y + e.h - 30, e.w + 20, 30, 5); ctx.fill();
        ctx.fillStyle = '#57534e';
        // Treads
        for(let i=0; i<3; i++) { 
            const offset = (Date.now()/5) % 20; 
            ctx.beginPath(); ctx.arc(e.x + 20 + (i*60), e.y + e.h - 15, 10, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#a8a29e'; ctx.fillRect(e.x + (i*60) + offset, e.y + e.h - 15, 5, 5); ctx.fillStyle = '#57534e';
        }
        ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.w, e.h - 20);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(e.x, e.y + 20, e.w, 5); ctx.fillRect(e.x, e.y + 60, e.w, 5);
        ctx.fillStyle = '#44403c';
        ctx.save(); ctx.translate(e.x + e.w/2, e.y + 20); ctx.rotate(e.bossState === 1 ? -Math.PI / 2 : -Math.PI / 4);
        ctx.fillRect(0, -12, 70, 24); ctx.strokeStyle = '#000'; ctx.lineWidth=2; ctx.strokeRect(0, -12, 70, 24);
        ctx.restore();
    } else if (e.bossVariant === 'general') {
        // ENHANCED GENERAL VISUALS
        ctx.beginPath(); const wobble = Math.sin(Date.now()/300)*5; ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2 + wobble, e.h/2 - wobble, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e3a8a'; ctx.fillRect(e.x + 10, e.y, e.w - 20, 30);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(e.x, e.y + 30); ctx.lineTo(e.x + e.w, e.y+30); ctx.lineTo(e.x + e.w + 10, e.y + 40); ctx.lineTo(e.x - 10, e.y + 40); ctx.fill();
        ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 8, 0, Math.PI*2); ctx.fill();
        if (e.bossState === 6 || e.bossState === 7) { // Grid Attack or Rain
            ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 5, 0, Math.PI*2); ctx.fill();
        }
    } else if (e.bossVariant === 'deity') {
        // ENHANCED DEITY ANIMATION (LEVEL 5)
        ctx.save();
        ctx.translate(e.x + e.w/2, e.y + e.h/2);
        
        // Multi-ring rotation
        const t = Date.now() / 1000;
        
        // Outer Ring
        ctx.rotate(t * 0.5);
        ctx.shadowColor = e.phase === 2 ? '#ef4444' : '#818cf8';
        ctx.shadowBlur = 20 + Math.sin(t*5)*10;
        ctx.fillStyle = e.phase === 2 ? '#450a0a' : '#020617';
        
        // Complex geometry
        ctx.beginPath();
        const petals = e.phase === 2 ? 12 : 8;
        for(let i=0; i<petals*2; i++) {
            const angle = (Math.PI*2 * i) / (petals*2);
            const r = (i%2===0) ? e.w*0.6 : e.w*0.3;
            ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
        }
        ctx.fill();

        // Inner Ring (Counter Rotate)
        ctx.rotate(-t * 1.5);
        ctx.fillStyle = e.phase === 2 ? '#b91c1c' : '#312e81';
        ctx.beginPath();
        for(let i=0; i<4; i++) {
             ctx.rect(-20, -20, 40, 40);
             ctx.rotate(Math.PI/4);
        }
        ctx.fill();

        // Core
        ctx.rotate(t * 3);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill();
        
        // Glitch effect in Phase 2
        if (e.phase === 2 && Math.random() > 0.8) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(Math.random()*100-50, Math.random()*100-50, 50, 5);
        }
        
        ctx.restore();
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

export const updateEnemyAI = (enemy: Enemy, p: any, s: any, audio: AudioManager, setBossHp?: (hp: number) => void) => {
     switch(enemy.subType) {
        case 'bacteria': enemy.vx = enemy.x > p.x ? -3 : 3; if(enemy.isGrounded && Math.random()<0.01) enemy.vy = -8; enemy.vy += GRAVITY; break;
        case 'plaque_monster': enemy.vx = enemy.x > p.x ? -2 : 2; enemy.vy += GRAVITY; break;
        case 'candy_bomber': enemy.vy = Math.sin(Date.now()/200); enemy.vx = -4; 
            if(enemy.attackTimer > 2 && Math.abs(enemy.x-p.x)<50) { spawnProjectile(s.projectiles, enemy.x, enemy.y+20, 0, 1, 'enemy', 'normal'); enemy.attackTimer=0; } break;
        case 'tartar_turret': enemy.vx = 0; enemy.vy += GRAVITY;
            if(enemy.attackTimer > 3 && Math.abs(p.x-enemy.x)<400) { 
                const angle = Math.atan2(p.y-enemy.y, p.x-enemy.x);
                s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:8,h:8,vx:Math.cos(angle)*5,vy:Math.sin(angle)*5,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:10,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileEnemy,facing:1,isGrounded:false,frameTimer:0,state:0});
                enemy.attackTimer=0; 
            } break;
        case 'sugar_rusher': enemy.vx = enemy.x > p.x ? -8 : 8; if(enemy.isGrounded && Math.random()<0.05) enemy.vy = -12; enemy.vy += GRAVITY; break;
        case 'sugar_fiend': enemy.vx = Math.abs(p.x-enemy.x)<150 ? (enemy.x>p.x?5:-5) : (enemy.x>p.x?-4:4); enemy.vy += GRAVITY;
            if(enemy.attackTimer>1) { s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+enemy.h-5,w:24,h:10,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'sludge',damage:0,owner:'enemy',lifeTime:4,hitIds:[],color:COLORS.projectileSludge,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; } break;
        case 'acid_spitter': enemy.vx = 0; enemy.vy += GRAVITY;
            if(enemy.attackTimer>2.5 && Math.abs(p.x-enemy.x)<500) { const dx=p.x-enemy.x; const dy=p.y-enemy.y-100; s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y,w:12,h:12,vx:dx*0.02,vy:dy*0.02-5,hp:1,maxHp:1,type:'projectile',projectileType:'acid',damage:15,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileAcid,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; } break;
        case 'gingivitis_grunt': enemy.vy += GRAVITY; 
            if(enemy.bossState === 1) { enemy.vx = enemy.facing * 12; if(enemy.aiTimer > 1) { enemy.bossState=0; enemy.aiTimer=0; } }
            else { enemy.vx = enemy.x > p.x ? -2 : 2; enemy.facing = enemy.vx > 0 ? 1 : -1; if(Math.abs((p.y+p.h)-(enemy.y+enemy.h))<30 && Math.abs(p.x-enemy.x)<300 && enemy.aiTimer>2) { enemy.bossState=1; enemy.aiTimer=0; } } break;
        case 'boss': 
             if (setBossHp) setBossHp(enemy.hp);
             if (enemy.bossVariant === 'deity' && enemy.hp < enemy.maxHp/2 && enemy.phase===1) { enemy.phase=2; enemy.color='#7f1d1d'; s.shake=30; }
             
             if(enemy.bossVariant==='wisdom_warden') {
                 // HIDDEN BOSS AI
                 enemy.vy = Math.sin(Date.now()/500) * 0.5; // Float
                 
                 if (enemy.bossState === 0) { // Idle/Chase
                     const targetX = p.x + (Math.sin(Date.now()/1000) * 200);
                     enemy.vx = (targetX - enemy.x) * 0.05;
                     
                     if (enemy.aiTimer > 2.5) {
                         const r = Math.random();
                         enemy.bossState = r > 0.6 ? 1 : 2; // 1: Teleport, 2: Judgment
                         enemy.aiTimer = 0;
                     }
                 } else if (enemy.bossState === 1) { // Teleport
                     if (enemy.aiTimer > 0.5) {
                         // Teleport near player
                         const offset = Math.random() > 0.5 ? -250 : 250;
                         enemy.x = p.x + offset;
                         enemy.y = p.y - 100;
                         // Clamp
                         if (enemy.y < 50) enemy.y = 50;
                         if (enemy.x < 0) enemy.x = 0;
                         if (enemy.x > s.level.levelWidth - 100) enemy.x = s.level.levelWidth - 100;
                         
                         audio.playBossAttack('charge');
                         enemy.bossState = 0;
                         enemy.aiTimer = 0;
                     }
                 } else if (enemy.bossState === 2) { // Judgment Orbs (Homing)
                     enemy.vx = 0;
                     if (enemy.attackTimer > 0.2) {
                         audio.playBossAttack('shoot');
                         const dx = p.x - enemy.x;
                         const dy = p.y - enemy.y;
                         const dist = Math.sqrt(dx*dx + dy*dy);
                         
                         s.projectiles.push({
                             id: Math.random().toString(),
                             x: enemy.x + enemy.w/2,
                             y: enemy.y + enemy.h/2,
                             w: 16, h: 16,
                             vx: (dx/dist) * 6 + (Math.random()-0.5)*2,
                             vy: (dy/dist) * 6 + (Math.random()-0.5)*2,
                             hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet', // Use standard bullet but high damage curves it in main loop
                             damage: 25, // Triggers curve logic in GameCanvas
                             owner: 'enemy', lifeTime: 4, hitIds: [], 
                             color: '#facc15', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                         });
                         enemy.attackTimer = 0;
                     }
                     if (enemy.aiTimer > 2) {
                         enemy.bossState = 0;
                         enemy.aiTimer = 0;
                     }
                 }
             } else if(enemy.bossVariant==='phantom') {
                 if(enemy.bossState===5) { enemy.vx=0; enemy.vy=0; if(enemy.aiTimer>2) { enemy.x=p.x>400?p.x-200:p.x+200; enemy.y=p.y-100; enemy.bossState=0; enemy.aiTimer=0; } return; }
                 enemy.vy = Math.sin(Date.now()/300)*2;
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.03; if(enemy.aiTimer>1.5) { enemy.bossState=Math.random()>0.7?5:1; enemy.aiTimer=0; } }
                 else if(enemy.bossState===1) { enemy.vx=0; if(enemy.aiTimer>0.5) { enemy.bossState=2; audio.playBossAttack('charge'); enemy.vx=(p.x<enemy.x)?-20:20; enemy.aiTimer=0; } }
                 else if(enemy.bossState===2) { enemy.vy=(p.y-enemy.y)*0.1; if(enemy.aiTimer>0.8) { enemy.bossState=3; enemy.aiTimer=0; enemy.vx=0; } }
                 else if(enemy.bossState===3 && enemy.aiTimer>0.3) { audio.playBossAttack('shoot'); for(let i=-2;i<=2;i++) spawnProjectile(s.projectiles, enemy.x+enemy.w/2, enemy.y+enemy.h/2, p.facing, 0, 'enemy', 'normal'); enemy.bossState=0; enemy.aiTimer=0; }
             } else if (enemy.bossVariant==='tank') {
                 // IMPROVED TANK AI (Level 3)
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)>0?3:-3; enemy.vy+=GRAVITY; if(enemy.aiTimer>2.5) { enemy.bossState=Math.random()>0.5?1:(Math.random()>0.5?2:3); enemy.aiTimer=0; } }
                 else if(enemy.bossState===1) { // Mortar (Enhanced: 3 shells)
                    enemy.vx=0; enemy.vy+=GRAVITY; 
                    if(enemy.aiTimer>0.8) { 
                        audio.playBossAttack('mortar'); 
                        for(let i=-1; i<=1; i++) {
                            // Spread shots to cover area
                            s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y,w:16,h:16,vx:(p.x-enemy.x)*0.015 + (i*4),vy:-14,hp:1,maxHp:1,type:'projectile',projectileType:'mortar',damage:25,owner:'enemy',lifeTime:4,hitIds:[],color:'#78716c',facing:1,isGrounded:false,frameTimer:0,state:0}); 
                        }
                        enemy.bossState=0; enemy.aiTimer=0; 
                    } 
                 }
                 else if(enemy.bossState===2) { // Slam
                    enemy.vx=0; enemy.vy+=GRAVITY; if(enemy.aiTimer>0.8) { audio.playBossAttack('slam'); [-1,1].forEach(d=>s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+enemy.h-10,w:40,h:40,vx:d*12,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'wave',damage:20,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileWave,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; } 
                 }
                 else if(enemy.bossState===3) { // Rapid Fire Move
                     enemy.vx = (p.x - enemy.x) > 0 ? 5 : -5; enemy.vy += GRAVITY;
                     if (Math.floor(Date.now() / 200) % 2 === 0 && enemy.attackTimer > 0.2) {
                         spawnProjectile(s.projectiles, enemy.x + (enemy.vx>0?enemy.w:0), enemy.y + 40, enemy.vx > 0 ? 1 : -1, 0, 'enemy', 'normal');
                         enemy.attackTimer = 0;
                     }
                     if (enemy.aiTimer > 3) { enemy.bossState = 0; enemy.aiTimer = 0; }
                 }
             } else if (enemy.bossVariant==='general') {
                 // IMPROVED GENERAL AI (Level 4)
                 enemy.vy = Math.sin(Date.now()/600)*0.5; if(enemy.y>100) enemy.y-=1;
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.03; if(enemy.aiTimer>1.5) { const r=Math.random(); enemy.bossState=r<0.3?1:(r<0.5?2:(r<0.7?5:(r<0.85?6:7))); enemy.aiTimer=0; } }
                 else if(enemy.bossState===1 && enemy.aiTimer>1) { // Summon
                    audio.playBossAttack('summon'); 
                    for(let i=0;i<4;i++) s.enemies.push({id:Math.random().toString(),x:enemy.x+enemy.w/2+(i*30-45),y:enemy.y+enemy.h,w:20,h:20,vx:(Math.random()-0.5)*12,vy:-8,hp:15,maxHp:15,type:'enemy',subType:'bacteria',color:COLORS.enemyBacteria,facing:-1,isGrounded:false,aiTimer:0,attackTimer:0,frameTimer:0,state:0,bossState:0}); enemy.bossState=0; enemy.aiTimer=0; 
                 }
                 else if(enemy.bossState===2 && enemy.aiTimer>0.5) { // Giant Laser
                    audio.playBossAttack('laser'); s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h,w:30,h:400,vx:(p.x-enemy.x)*0.03,vy:15,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:30,owner:'enemy',lifeTime:1,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; 
                 }
                 else if(enemy.bossState===5 && enemy.aiTimer>0.5) { // Homing Bullet
                    audio.playBossAttack('summon'); s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y,w:24,h:24,vx:0,vy:5,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:25,owner:'enemy',lifeTime:5,hitIds:[],color:'#a855f7',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; 
                 }
                 else if(enemy.bossState===6 && enemy.aiTimer>1.0) { // Grid Laser
                     audio.playBossAttack('laser');
                     s.projectiles.push({id:Math.random().toString(),x:p.x,y:0,w:20,h:CANVAS_HEIGHT,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:20,owner:'enemy',lifeTime:0.5,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0});
                     s.projectiles.push({id:Math.random().toString(),x:0,y:p.y+10,w:s.level.levelWidth,h:20,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:20,owner:'enemy',lifeTime:0.5,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0});
                     enemy.bossState=0; enemy.aiTimer=0;
                 }
                 else if(enemy.bossState===7 && enemy.aiTimer>0.5) { // Rain Fire (New Attack)
                     audio.playBossAttack('summon');
                     for(let i=0; i<10; i++) {
                         const rx = Math.random() * CANVAS_WIDTH;
                         s.projectiles.push({id:Math.random().toString(),x:s.camera.x + rx,y:0,w:10,h:30,vx:0,vy:10,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:15,owner:'enemy',lifeTime:2,hitIds:[],color:'#f97316',facing:1,isGrounded:false,frameTimer:0,state:0});
                     }
                     enemy.bossState=0; enemy.aiTimer=0;
                 }
             } else if (enemy.bossVariant==='deity') {
                 // IMPROVED DEITY AI (Level 5)
                 const phaseMult = enemy.phase === 2 ? 1.5 : 1.0;
                 
                 if(enemy.phase===1 && enemy.bossState===0) { 
                     enemy.vx=(CANVAS_WIDTH/2+s.camera.x-enemy.x-enemy.w/2)*0.05; enemy.vy=Math.sin(Date.now()/400); 
                     if(enemy.attackTimer>0.2) { 
                         // Spiral Attack
                         audio.playBossAttack('shoot'); 
                         const ang = Date.now()/200; 
                         for(let i=0;i<3;i++) spawnProjectile(s.projectiles, enemy.x+enemy.w/2,enemy.y+enemy.h/2, Math.cos(ang+i*2), Math.sin(ang+i*2), 'enemy', 'normal'); 
                         enemy.attackTimer=0; 
                     } 
                 }
                 else { 
                     // Phase 2: Berserk Logic
                     if(enemy.bossState===0) { // Hover & Shoot Nova
                         enemy.vx=(p.x-enemy.x)*0.08; enemy.vy=(p.y-enemy.y)*0.08; 
                         if (Math.random() < 0.05 && enemy.attackTimer > 0.5) {
                             audio.playBossAttack('shoot');
                             // Nova Burst
                             for(let i=0; i<8; i++) {
                                 const ang = (Math.PI*2 * i) / 8;
                                 s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:15,h:15,vx:Math.cos(ang)*8,vy:Math.sin(ang)*8,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:20,owner:'enemy',lifeTime:3,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0});
                             }
                             enemy.attackTimer = 0;
                         }
                         if(enemy.aiTimer>3) { enemy.bossState=Math.random()>0.5?1:2; enemy.aiTimer=0; } 
                     } 
                     else if(enemy.bossState===1) { // Slam
                         enemy.vy=25; enemy.vx=0; 
                     }
                     else if(enemy.bossState===2) { // Void Pulse (Spiral Dense)
                         enemy.vx = 0; enemy.vy = 0;
                         if (enemy.attackTimer > 0.1) {
                             audio.playBossAttack('laser');
                             const offset = enemy.aiTimer * 10;
                             for(let i=0; i<4; i++) {
                                 const ang = offset + (Math.PI*2*i)/4;
                                 s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:12,h:12,vx:Math.cos(ang)*10,vy:Math.sin(ang)*10,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:15,owner:'enemy',lifeTime:3,hitIds:[],color:'#7f1d1d',facing:1,isGrounded:false,frameTimer:0,state:0});
                             }
                             enemy.attackTimer = 0;
                         }
                         if (enemy.aiTimer > 2.0) { enemy.bossState = 0; enemy.aiTimer = 0; }
                     }
                 }
             } else { // King
                 if(enemy.bossState===0) { enemy.vy=Math.sin(Date.now()/500)*0.5; enemy.vx=(p.x-enemy.x)*0.02; if(enemy.aiTimer>2) { enemy.aiTimer=0; const r=Math.random(); enemy.bossState=r<0.3?4:(r<0.6?2:1); } }
                 else if(enemy.bossState===4 && enemy.attackTimer>0.5) { audio.playBossAttack('shoot'); for(let i=-2;i<=2;i++) spawnProjectile(s.projectiles, enemy.x, enemy.y, -9, i*3, 'enemy', 'normal'); enemy.attackTimer=0; enemy.bossState=0; enemy.aiTimer=0; }
                 else if(enemy.bossState===2) { enemy.vy=-8; if(enemy.y<50) { enemy.bossState=3; enemy.vx=(p.x-enemy.x)*0.1; } }
                 else if(enemy.bossState===3) enemy.vy+=2;
                 else if(enemy.bossState===1 && enemy.aiTimer>1) { audio.playBossAttack('summon'); s.enemies.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+20,w:20,h:20,vx:-5,vy:-5,hp:10,maxHp:10,type:'enemy',subType:'sugar_rusher',color:COLORS.enemyRusher,facing:-1,isGrounded:false,aiTimer:0,attackTimer:0,frameTimer:0,state:0,bossState:0}); enemy.bossState=0; enemy.aiTimer=0; }
             }
             break;
     }
};
