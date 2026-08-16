
import { Projectile, Player, WeaponType, PowerUp } from '../types';
import { COLORS } from './data/palette';
import { NORMAL, SPREAD, LASER, MOUTHWASH, FLOSS, TOOTHBRUSH, ENEMY_BULLET } from './data/weapons';

export const spawnProjectile = (projectiles: Projectile[], x: number, y: number, dx: number, dy: number, owner: 'player' | 'enemy', type: WeaponType | 'normal', player?: Player) => {
    const base: Partial<Projectile> = {
        id: Math.random().toString(), owner, facing: dx === 0 ? 1 : Math.sign(dx) as 1|-1,
        isGrounded: false, frameTimer: 0, state: 0, type: 'projectile', hitIds: []
    };

    if (owner === 'enemy') {
        projectiles.push({ ...base, x, y, w: ENEMY_BULLET.size, h: ENEMY_BULLET.size, vx: dx * ENEMY_BULLET.speed, vy: 0, hp: 1, maxHp: 1, damage: ENEMY_BULLET.damage, lifeTime: ENEMY_BULLET.lifeTime, projectileType: 'bullet', color: COLORS.projectileEnemy } as Projectile);
        return;
    }
    if (!player) return;

    const level = player.weaponLevel;
    const vx = dx; const vy = dy;

    /**
     * Daño final de un proyectil del jugador.
     *
     * El multiplicador se aplica **aquí**, una sola vez por proyectil. Antes lo
     * parcheaba el bucle recorriendo el array después de disparar, lo que
     * reaplicaba el multiplicador a los proyectiles que aún estaban en el aire
     * —incluidos los del enemigo— y convertía un +15% en un x3,5 acumulado.
     */
    const scaled = (base: number) => base * player.stats.damageMultiplier;

    if (type === 'spread') {
        // Nivel 1: 3 balas ... nivel 5: 11.
        const bulletCount = SPREAD.count(level);
        const spreadFactor = SPREAD.spreadFactor(level);
        const dmg = scaled(SPREAD.damage(level));
        const start = -Math.floor(bulletCount/2); const end = Math.floor(bulletCount/2);
        const perpX = -dy; const perpY = dx;

        for(let i=start; i<=end; i++) {
          const svx = (vx * SPREAD.speed) + (perpX * i * spreadFactor);
          const svy = (vy * SPREAD.speed) + (perpY * i * spreadFactor);
          projectiles.push({ ...base, x, y, w: SPREAD.size, h: SPREAD.size, vx: svx, vy: svy, hp: 1, maxHp: 1, damage: dmg, lifeTime: SPREAD.lifeTime, projectileType: 'bullet', color: COLORS.projectilePlayer } as Projectile);
        }
    } else if (type === 'laser') {
          const width = LASER.width(level);
          const dmg = scaled(LASER.damage(level));
          projectiles.push({ ...base, x, y, w: width, h: width, vx: vx * LASER.speed, vy: vy * LASER.speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: LASER.lifeTime, projectileType: 'laser', color: COLORS.projectileLaser } as Projectile);
    } else if (type === 'mouthwash') {
          const speed = MOUTHWASH.speed(level);
          const dmg = scaled(MOUTHWASH.damage(level));
          const off = MOUTHWASH.sideOffset;
          // side === 0 es la onda central (tamaño propio); ±1 son las laterales.
          MOUTHWASH.offsets(level).forEach(side => {
              const size = side === 0 ? MOUTHWASH.size(level) : MOUTHWASH.sideSize(level);
              projectiles.push({ ...base, x: x + (side * dy * off), y: y - (side * dx * off), w: size, h: size, vx: vx * speed, vy: vy * speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: MOUTHWASH.lifeTime, projectileType: 'wave', color: COLORS.projectileWave } as Projectile);
          });
    } else if (type === 'floss') {
          const range = FLOSS.range(level); const dmg = scaled(FLOSS.damage(level)); const thickness = FLOSS.thickness(level);
          const isVertical = Math.abs(dy) > Math.abs(dx);
          const w = isVertical ? thickness : range; const h = isVertical ? range : thickness;
          projectiles.push({ ...base, x, y, w, h, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: FLOSS.lifeTime, projectileType: 'floss', color: '#fff' } as Projectile);
    } else if (type === 'toothbrush') {
          const size = TOOTHBRUSH.size(level); const dmg = scaled(TOOTHBRUSH.damage(level));
          projectiles.push({ ...base, x, y, w: size, h: size, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: TOOTHBRUSH.lifeTime, projectileType: 'sword', color: COLORS.projectileMelee } as Projectile);
    } else {
        const speed = NORMAL.speed;
        const bullet = { w: NORMAL.w, h: NORMAL.h, hp: 1, maxHp: 1, damage: scaled(NORMAL.damage(level)), lifeTime: NORMAL.lifeTime, projectileType: 'bullet' as const, color: COLORS.projectilePlayer, vx: vx * speed, vy: vy * speed };
        // Abanico: una bala por cada desplazamiento perpendicular de la tabla.
        const perpX = -dy; const perpY = dx;
        NORMAL.offsets(level).forEach(offset => {
            projectiles.push({ ...base, ...bullet, x: x - (perpX * offset), y: y - (perpY * offset) } as Projectile);
        });
    }
};

/**
 * Descarta los objetos que han quedado muy por detrás de la cámara.
 *
 * Como los enemigos: no se recogían ni se borraban nunca, así que el array
 * crecía durante toda la partida. El margen es generoso —casi una pantalla y
 * media por detrás del jugador— para no quitar de las manos un botiquín al que
 * se podía volver.
 */
export const cullPowerUps = (powerups: PowerUp[], cameraX: number, margin: number): PowerUp[] =>
    powerups.filter(pu => pu.x + pu.w > cameraX - margin);

export const spawnPowerUp = (powerups: PowerUp[], x: number, y: number, dropRate: number, limitToType?: WeaponType) => {
    // Dynamic drop rate based on difficulty
    if (Math.random() > dropRate) return;
    
    let sub: PowerUp['subType'] = 'health';
    let c: string;

    if (limitToType) {
        if (Math.random() > 0.4) {
            sub = limitToType;
        } else {
            sub = 'health';
        }
    } else {
        const r = Math.random(); 
        if (r > 0.85) { sub = 'spread'; } 
        else if (r > 0.7) { sub = 'laser'; }
        else if (r > 0.55) { sub = 'mouthwash'; } 
        else if (r > 0.4) { sub = 'floss'; }
        else if (r > 0.25) { sub = 'toothbrush'; }
    }
    
    switch(sub) {
        case 'spread': c = '#3b82f6'; break;
        case 'laser': c = '#06b6d4'; break;
        case 'mouthwash': c = '#a855f7'; break;
        case 'floss': c = '#10b981'; break;
        case 'toothbrush': c = '#f97316'; break;
        case 'health': c = '#ef4444'; break;
        case 'normal': c = '#9ca3af'; break; 
        default: c = '#ef4444'; break;
    }

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

