
import { Projectile, Player, WeaponType, PowerUp } from '../types';
import { COLORS, tone } from './data/palette';
import { NORMAL, SPREAD, LASER, MOUTHWASH, FLOSS, TOOTHBRUSH, BOW, SCYTHE, ENEMY_BULLET, HEALTH_DROP_SHARE, weaponFromRoll } from './data/weapons';

export const spawnProjectile = (projectiles: Projectile[], x: number, y: number, dx: number, dy: number, owner: 'player' | 'enemy', type: WeaponType | 'normal', player?: Player) => {
    /**
     * Lo común a los proyectiles de este disparo, **como función y no como objeto**.
     *
     * Era un objeto que se creaba una vez y del que cada proyectil hacía `{...base}`, y
     * eso copia la *referencia* de `hitIds`: toda una ráfaga compartía el mismo array de
     * «a quién ya he golpeado». Con balas no se notaba porque no perforan, pero el
     * enjuague a nivel 5 lanza tres ondas y las ondas **sí** perforan: en cuanto una
     * tocaba a un enemigo, las otras dos no podían dañarlo nunca más. Y el `id`
     * compartido dejaba a los tres proyectiles de una ráfaga con la misma identidad.
     *
     * Cualquier arma cuerpo a cuerpo que lance más de una caja heredaría el mismo
     * defecto, así que esto va antes del rediseño y no después.
     */
    const base = (): Partial<Projectile> => ({
        id: Math.random().toString(), owner, facing: dx === 0 ? 1 : Math.sign(dx) as 1|-1,
        isGrounded: false, frameTimer: 0, state: 0, type: 'projectile', hitIds: []
    });

    if (owner === 'enemy') {
        projectiles.push({ ...base(), x, y, w: ENEMY_BULLET.size, h: ENEMY_BULLET.size, vx: dx * ENEMY_BULLET.speed, vy: 0, hp: 1, maxHp: 1, damage: ENEMY_BULLET.damage, lifeTime: ENEMY_BULLET.lifeTime, projectileType: 'bullet', color: COLORS.projectileEnemy } as Projectile);
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
          projectiles.push({ ...base(), x, y, w: SPREAD.size, h: SPREAD.size, vx: svx, vy: svy, hp: 1, maxHp: 1, damage: dmg, lifeTime: SPREAD.lifeTime, projectileType: 'bullet', color: COLORS.projectilePlayer } as Projectile);
        }
    } else if (type === 'laser') {
          const width = LASER.width(level);
          const dmg = scaled(LASER.damage(level));
          projectiles.push({ ...base(), x, y, w: width, h: width, vx: vx * LASER.speed, vy: vy * LASER.speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: LASER.lifeTime, projectileType: 'laser', color: COLORS.projectileLaser } as Projectile);
    } else if (type === 'mouthwash') {
          const speed = MOUTHWASH.speed(level);
          const dmg = scaled(MOUTHWASH.damage(level));
          const size = MOUTHWASH.size(level);
          /**
           * El racimo comparte **un solo registro de impactos**.
           *
           * Tres frascos con tres registros propios significan tres reventones que se
           * solapan y triplican el daño sobre el mismo enemigo. Compartiéndolo, el racimo
           * hace su daño una vez por enemigo, que es lo que la tabla de equilibrio dice que
           * hace el arma. Es la excepción deliberada al arreglo del `hitIds` compartido: ahí
           * el problema era que se compartía **sin querer**.
           */
          const group: string[] = [];
          // `offsets` son ángulos: el racimo se abre en abanico desde el mismo punto.
          MOUTHWASH.offsets(level).forEach(side => {
              const angle = side * MOUTHWASH.spread;
              const cos = Math.cos(angle); const sin = Math.sin(angle);
              const ax = vx * cos - vy * sin; const ay = vx * sin + vy * cos;
              projectiles.push({ ...base(), hitIds: group, x, y, w: size, h: size, vx: ax * speed, vy: ay * speed + MOUTHWASH.lift, hp: 1, maxHp: 1, damage: dmg, lifeTime: MOUTHWASH.lifeTime, projectileType: 'flask', color: COLORS.projectileWave } as Projectile);
          });
    } else if (type === 'floss') {
          const range = FLOSS.range(level); const dmg = scaled(FLOSS.damage(level)); const thickness = FLOSS.thickness(level);
          const isVertical = Math.abs(dy) > Math.abs(dx);
          const w = isVertical ? thickness : range; const h = isVertical ? range : thickness;
          projectiles.push({ ...base(), x, y, w, h, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: FLOSS.lifeTime, projectileType: 'floss', color: '#fff' } as Projectile);
    } else if (type === 'toothbrush') {
          const dmg = scaled(TOOTHBRUSH.damage(level));
          // El filo es estrecho a lo radial y largo a lo tangencial, y se orienta según se
          // apunte: barriendo en horizontal lo largo es vertical, y al revés.
          const radial = TOOTHBRUSH.radial(level);
          const tangential = TOOTHBRUSH.tangential(level);
          const vertical = Math.abs(dy) > Math.abs(dx);
          const w = vertical ? tangential : radial;
          const h = vertical ? radial : tangential;
          projectiles.push({ ...base(), x, y, w, h, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: TOOTHBRUSH.lifeTime, projectileType: 'sword', color: COLORS.projectileMelee } as Projectile);
    } else if (type === 'bow') {
          const dmg = scaled(BOW.damage(level));
          // Fina y larga en el sentido del vuelo: una flecha, no una bola.
          const vertical = Math.abs(dy) > Math.abs(dx);
          const w = vertical ? BOW.h : BOW.w;
          const h = vertical ? BOW.w : BOW.h;
          projectiles.push({ ...base(), x, y, w, h, vx: vx * BOW.speed, vy: vy * BOW.speed, hp: 1, maxHp: 1, damage: dmg, lifeTime: BOW.lifeTime, projectileType: 'arrow', color: COLORS.projectilePlayer } as Projectile);
    } else if (type === 'scythe') {
          const dmg = scaled(SCYTHE.damage(level));
          const radial = SCYTHE.radial(level);
          const tangential = SCYTHE.tangential(level);
          const vertical = Math.abs(dy) > Math.abs(dx);
          const w = vertical ? tangential : radial;
          const h = vertical ? radial : tangential;
          projectiles.push({ ...base(), x, y, w, h, vx: dx, vy: dy, hp: 1, maxHp: 1, damage: dmg, lifeTime: SCYTHE.lifeTime, projectileType: 'reap', color: COLORS.projectileMelee } as Projectile);
    } else if (type === 'normal') {
        const speed = NORMAL.speed;
        const bullet = { w: NORMAL.w, h: NORMAL.h, hp: 1, maxHp: 1, damage: scaled(NORMAL.damage(level)), lifeTime: NORMAL.lifeTime, projectileType: 'drill' as const, color: COLORS.projectilePlayer, vx: vx * speed, vy: vy * speed };
        // Abanico: una bala por cada desplazamiento perpendicular de la tabla.
        const perpX = -dy; const perpY = dx;
        NORMAL.offsets(level).forEach(offset => {
            projectiles.push({ ...base(), ...bullet, x: x - (perpX * offset), y: y - (perpY * offset) } as Projectile);
        });
    } else {
        /**
         * Aquí no debería llegar nunca nada.
         *
         * Antes esta rama **era** la del arma normal, así que un arma nueva a la que se le
         * olvidara su caso disparaba balas corrientes: funcionaba a medias y no fallaba
         * nada. Con `never`, olvidarse de un arma es un error de compilación que dice cuál.
         */
        const unhandled: never = type;
        throw new Error(`arma sin tratar en spawnProjectile: ${String(unhandled)}`);
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

    if (limitToType) {
        if (Math.random() > 0.4) {
            sub = limitToType;
        } else {
            sub = 'health';
        }
    } else {
        /**
         * La salud tiene una parte **fija** del reparto y las armas se dividen el resto.
         *
         * Era una escalera de umbrales escritos a mano en la que la salud se quedaba lo que
         * sobrara: añadir dos armas la habría bajado del 25 % al 12,5 % sin que nada avisara.
         */
        const r = Math.random();
        if (r >= HEALTH_DROP_SHARE) {
            sub = weaponFromRoll((r - HEALTH_DROP_SHARE) / (1 - HEALTH_DROP_SHARE));
        }
    }
    
    /**
     * El color sale de la paleta, no de una tabla de hexadecimales.
     *
     * Había un `switch` con colores escritos a mano que **nadie leía**: el renderizador
     * pinta el bote con `EMBLEM_COLORS`, así que esa tabla era una segunda verdad que solo
     * podía divergir. Se conserva el campo porque la entidad lo exige.
     */
    const c = tone(sub === 'health' ? 'candy.light' : 'laser.light');

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

