
import { Projectile, Player, WeaponType, Entity, PowerUp } from '../types';
import { COLORS } from '../constants';

export const spawnProjectile = (projectiles: Projectile[], x: number, y: number, dx: number, dy: number, owner: 'player' | 'enemy', type: WeaponType | 'normal', player?: Player) => {
    const base: Partial<Projectile> = {
        id: Math.random().toString(), owner, facing: dx === 0 ? 1 : Math.sign(dx) as 1|-1,
        isGrounded: false, frameTimer: 0, state: 0, type: 'projectile', hitIds: []
    };

    if (owner === 'enemy') {
        // Faster enemy bullets (6 -> 9)
        projectiles.push({ ...base, x, y, w: 10, h: 10, vx: dx * 9, vy: 0, hp: 1, maxHp: 1, damage: 10, lifeTime: 2, projectileType: 'bullet', color: COLORS.projectileEnemy } as Projectile);
        return;
    }
    if (!player) return;

    const level = player.weaponLevel;
    const vx = dx; const vy = dy;

    if (type === 'spread') {
        const bulletCount = 3 + (level - 1) * 2;
        const spreadFactor = level === 3 ? 1.0 : 1.5; 
        const start = -Math.floor(bulletCount/2); const end = Math.floor(bulletCount/2);
        const perpX = -dy; const perpY = dx;
        const speed = 16; // Increased from 12

        for(let i=start; i<=end; i++) {
          const svx = (vx * speed) + (perpX * i * spreadFactor);
          const svy = (vy * speed) + (perpY * i * spreadFactor);
          projectiles.push({ ...base, x, y, w: 8, h: 8, vx: svx, vy: svy, hp: 1, maxHp: 1, damage: 6, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer } as Projectile);
        }
    } else if (type === 'laser') {
          const width = level >= 2 ? (level === 3 ? 12 : 6) : 4;
          const dmg = 15 + ((level-1) * 5);
          // Faster Laser (20 -> 28)
          projectiles.push({ ...base, x, y, w: width, h: width, vx: vx * 28, vy: vy * 28, hp: 1, maxHp: 1, damage: dmg, lifeTime: 0.8, projectileType: 'laser', color: COLORS.projectileLaser } as Projectile);
    } else if (type === 'mouthwash') {
          const speed = 10 + (level * 2); // Increased base speed
          const dmg = 20 + ((level-1)*10);
          projectiles.push({ ...base, x, y, w: 16 + (level*4), h: 16 + (level*4), vx: vx * speed, vy: vy * speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: 2.0, projectileType: 'wave', color: COLORS.projectileWave } as Projectile);
          if (level === 3) {
              projectiles.push({ ...base, x: x - (dy * 20), y: y + (dx * 20), w: 20, h: 20, vx: vx * speed, vy: vy * speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: 2.0, projectileType: 'wave', color: COLORS.projectileWave } as Projectile);
          }
    } else if (type === 'floss') {
          const range = 100 + ((level-1)*50); const dmg = 25 + ((level-1)*10); const thickness = 20 + ((level-1)*10);
          const isVertical = Math.abs(dy) > Math.abs(dx);
          const w = isVertical ? thickness : range; const h = isVertical ? range : thickness;
          projectiles.push({ ...base, x, y, w, h, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: 0.15, projectileType: 'floss', color: '#fff' } as Projectile);
    } else if (type === 'toothbrush') {
          const size = 60 + ((level-1)*30); const dmg = 35 + ((level-1)*15);
          projectiles.push({ ...base, x, y, w: size, h: size, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: 0.2, projectileType: 'sword', color: COLORS.projectileMelee } as Projectile);
    } else {
        const dmg = 8;
        const speed = 18; // Increased from 12
        if (level === 3) {
           const perpX = -dy; const perpY = dx; const offset = 5;
           projectiles.push({ ...base, x: x - (perpX*offset), y: y - (perpY*offset), w: 10, h: 6, vx: vx * speed, vy: vy * speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer } as Projectile);
           projectiles.push({ ...base, x: x + (perpX*offset), y: y + (perpY*offset), w: 10, h: 6, vx: vx * speed, vy: vy * speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer } as Projectile);
        } else {
           projectiles.push({ ...base, x, y, w: 10, h: 6, vx: vx * speed, vy: vy * speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer } as Projectile);
        }
    }
};

export const spawnPowerUp = (powerups: PowerUp[], x: number, y: number) => {
    // REDUCED FREQUENCY: 15% chance (was ~40%)
    if (Math.random() > 0.85) return;
    
    const r = Math.random(); 
    let sub: PowerUp['subType'] = 'health'; 
    let c = '#ef4444';
    
    if (r > 0.85) { sub = 'spread'; c = '#3b82f6'; } 
    else if (r > 0.7) { sub = 'laser'; c = '#06b6d4'; }
    else if (r > 0.55) { sub = 'mouthwash'; c = '#a855f7'; } 
    else if (r > 0.4) { sub = 'floss'; c = '#10b981'; }
    else if (r > 0.25) { sub = 'toothbrush'; c = '#f97316'; }

    powerups.push({ 
        id: Math.random().toString(), 
        x, y, w: 24, h: 24, 
        vx: 0, vy: 0, 
        hp: 0, maxHp: 0, 
        type: 'powerup', 
        subType: sub, 
        color: c, 
        facing: 1, 
        isGrounded: false, 
        frameTimer: 0, 
        state: 0 
    });
};

export const drawPowerUp = (ctx: CanvasRenderingContext2D, pu: PowerUp) => {
    const bounce = Math.sin(Date.now() / 200) * 5;
    const y = pu.y + bounce;
    const x = pu.x;
    const w = pu.w;
    const h = pu.h;

    ctx.save();
    
    // Draw Wings
    ctx.fillStyle = '#cbd5e1';
    const wingFlap = Math.sin(Date.now() / 100) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y + h/2);
    ctx.lineTo(x - 8, y + h/2 - 5 - wingFlap);
    ctx.lineTo(x - 8, y + h/2 + 5 + wingFlap);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y + h/2);
    ctx.lineTo(x + w + 8, y + h/2 - 5 - wingFlap);
    ctx.lineTo(x + w + 8, y + h/2 + 5 + wingFlap);
    ctx.fill();

    // Box Body (Metallic Container)
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner Screen
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 4);
    ctx.fill();

    // Icon / Letter
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px monospace';
    ctx.shadowColor = pu.color;
    ctx.shadowBlur = 5;
    ctx.fillStyle = pu.color;

    let symbol = '?';
    switch(pu.subType) {
        case 'health': symbol = '✚'; break; // Plus
        case 'spread': symbol = 'S'; break;
        case 'laser': symbol = 'L'; break;
        case 'mouthwash': symbol = 'W'; break;
        case 'floss': symbol = 'F'; break;
        case 'toothbrush': symbol = 'T'; break;
    }

    ctx.fillText(symbol, x + w/2, y + h/2 + 1);
    
    // Gloss
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(x + w - 8, y + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

export const drawHeldWeapon = (ctx: CanvasRenderingContext2D, p: Player, aimInput: {usingMouse: boolean, aimUp: boolean, mouseX: number, mouseY: number, cameraX: number, cameraY: number}) => {
    const type = p.weapon;
    const facing = p.facing;
    const hx = p.x + (facing === 1 ? 22 : 10);
    const hy = p.y + 20;

    ctx.save();
    ctx.translate(hx, hy);
    
    let rotation = 0;
    if (aimInput.usingMouse) {
        const mouseWorldX = aimInput.mouseX + aimInput.cameraX;
        const mouseWorldY = aimInput.mouseY + aimInput.cameraY;
        rotation = Math.atan2(mouseWorldY - hy, mouseWorldX - hx);
        if (facing === -1) rotation = rotation - Math.PI; 
    } else {
        if (aimInput.aimUp) rotation = (aimInput.usingMouse ? 0 : -Math.PI / 2 * facing); 
    }
    ctx.rotate(rotation);

    if (type === 'toothbrush') {
        if (!aimInput.aimUp && !aimInput.usingMouse) ctx.rotate(facing === 1 ? -Math.PI / 4 : Math.PI / 4);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, -3, 30 * facing, 6);
        ctx.fillStyle = '#fff'; ctx.fillRect(30 * facing, -2, 10 * facing, 4);
        ctx.fillRect(40 * facing, -4, 12 * facing, 8);
        ctx.fillStyle = '#0284c7'; 
        for(let i=0; i<3; i++) ctx.fillRect((42 * facing) + (i*3*facing), -4, 2*facing, -6);
    } else if (type === 'floss') {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-5, -5, 14, 14, 3); ctx.fill();
        ctx.fillStyle = '#10b981'; ctx.fillRect(-2, -2, 8, 8);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7*facing, 0); ctx.lineTo(15*facing, 5); ctx.stroke();
    } else if (type === 'mouthwash') {
        ctx.fillStyle = 'rgba(45, 212, 191, 0.8)'; 
        const bw = 24; const bh = 14;
        if (facing === 1) ctx.fillRect(0, -6, bw, bh); else ctx.fillRect(-bw, -6, bw, bh);
        ctx.fillStyle = '#0d9488'; 
        if (facing === 1) ctx.fillRect(2, 0, bw-4, bh-6); else ctx.fillRect(-bw+2, 0, bw-4, bh-6);
        ctx.fillStyle = '#fff'; 
        if (facing === 1) ctx.fillRect(bw, -4, 6, 10); else ctx.fillRect(-bw-6, -4, 6, 10);
    } else if (type === 'laser') {
        ctx.fillStyle = '#64748b'; ctx.beginPath();
        if (facing === 1) { ctx.moveTo(0, -4); ctx.lineTo(20, -2); ctx.lineTo(20, 8); ctx.lineTo(0, 10); } 
        else { ctx.moveTo(0, -4); ctx.lineTo(-20, -2); ctx.lineTo(-20, 8); ctx.lineTo(0, 10); }
        ctx.fill();
        ctx.fillStyle = '#06b6d4'; if (facing === 1) ctx.fillRect(20, -1, 4, 8); else ctx.fillRect(-24, -1, 4, 8);
    } else {
        ctx.fillStyle = '#4b5563'; const gunX = facing === 1 ? 0 : -22; ctx.fillRect(gunX, -3, 22, 6);
        ctx.fillStyle = '#1f2937'; ctx.fillRect(facing === 1 ? 0 : -6, 0, 6, 8);
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(facing === 1 ? gunX + 22 : gunX - 4, -2, 4, 4);
    }
    ctx.restore();
};

export const drawProjectiles = (ctx: CanvasRenderingContext2D, projectiles: Projectile[], p: Player) => {
    projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        if (proj.projectileType === 'floss') {
            ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
            const handX = p.x + (p.facing === 1 ? 25 : 5); const handY = p.y + 20;
            const endX = proj.x + proj.w/2; const endY = proj.y + proj.h/2;
            ctx.moveTo(handX, handY); ctx.quadraticCurveTo((handX + endX)/2, (handY + endY)/2 + 5, endX, endY); ctx.stroke();
            ctx.translate(endX, endY); ctx.rotate(Math.atan2(proj.vy, proj.vx));
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(10, 0); ctx.lineTo(0, 4); ctx.fill();
            ctx.restore();
        } else if (proj.projectileType === 'sword') {
            ctx.save(); 
            const centerX = proj.x + proj.w/2; const centerY = proj.y + proj.h/2;
            ctx.translate(centerX, centerY); ctx.rotate(Math.atan2(proj.vy, proj.vx));
            const radius = proj.w/2; const startAngle = -Math.PI / 3; const endAngle = Math.PI / 3;
            for(let i=0; i<3; i++) {
                 ctx.beginPath(); ctx.arc(0, 0, radius - (i*5), startAngle, endAngle);
                 ctx.strokeStyle = `rgba(34, 211, 238, ${1 - i*0.2})`; ctx.lineWidth = 4 - i; ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(0, 0, radius-2, startAngle, endAngle); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        } else if (proj.projectileType === 'wave') {
            ctx.save(); ctx.translate(proj.x, proj.y); ctx.fillStyle = '#5eead4'; 
            for(let i=0; i<5; i++) {
                const bx = (i / 5) * proj.w; const by = Math.sin(Date.now()/50 + i) * (proj.h/4) + proj.h/2;
                ctx.beginPath(); ctx.arc(bx, by, 3 + (i%3), 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        } else if (proj.projectileType === 'laser') {
            ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(proj.x, proj.y + proj.h * 0.25, proj.w, proj.h * 0.5);
            ctx.fillStyle = proj.color; ctx.globalAlpha = 0.5; ctx.fillRect(proj.x, proj.y, proj.w, proj.h); ctx.globalAlpha = 1.0; ctx.restore();
        } else if (proj.projectileType === 'mortar' || proj.projectileType === 'acid') {
             ctx.beginPath(); ctx.arc(proj.x+proj.w/2, proj.y+proj.h/2, proj.w/2, 0, Math.PI*2); ctx.fill();
        } else if (proj.projectileType === 'sludge') {
             ctx.fillStyle = proj.color; ctx.beginPath(); ctx.ellipse(proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2, proj.h/3, 0, 0, Math.PI * 2); ctx.fill();
             ctx.fillStyle = '#fff'; if (Math.random() > 0.5) ctx.fillRect(proj.x + 5, proj.y + 4, 2, 2);
        } else {
             ctx.beginPath(); ctx.arc(proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2, 0, Math.PI * 2); ctx.fill();
        }
    });
};
