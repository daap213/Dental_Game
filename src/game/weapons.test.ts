import { describe, it, expect } from 'vitest';
import { spawnProjectile } from './weapons';
import { getWeaponStats, ENEMY_BULLET, WEAPONS as ALL_WEAPONS } from './data/weapons';
import type { Projectile, Player, WeaponType } from '../types';

const makePlayer = (weapon: WeaponType, weaponLevel: number): Player =>
  ({
    id: 'player',
    x: 0,
    y: 0,
    w: 32,
    h: 32,
    vx: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    type: 'player',
    color: '#fff',
    facing: 1,
    isGrounded: false,
    animTimer: 0,
    hitTimer: 0,
    frameTimer: 0,
    state: 0,
    character: 'molar',
    invincibleTimer: 0,
    slowTimer: 0,
    shield: 0,
    maxShield: 0,
    shieldRegenTimer: 0,
    lives: 0,
    weapon,
    weaponLevel,
    weaponLevels: { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1, bow: 1, scythe: 1 },
    ammo: -1,
    score: 0,
    jumpCount: 0,
    maxJumps: 2,
    dashTimer: 0,
    dashCooldown: 0,
    consecutiveDashes: 1,
    stats: {
      speedMultiplier: 1,
      damageMultiplier: 1,
      dashCooldownMultiplier: 1,
      maxDashes: 1,
      damageReduction: 0,
      damageTakenMultiplier: 1,
    },
    runStats: {
      killCount: 0,
      nextScoreMilestone: 6200,
      nextKillMilestone: 20,
      currentKillStep: 10,
    },
  }) satisfies Player;

/** Dispara hacia la derecha desde el origen y devuelve lo generado. */
const shoot = (weapon: WeaponType, level: number, dx = 1, dy = 0): Projectile[] => {
  const out: Projectile[] = [];
  spawnProjectile(out, 0, 0, dx, dy, 'player', weapon, makePlayer(weapon, level));
  return out;
};

// La lista sale de `data/weapons.ts`, no escrita a mano: así ningún arma se queda fuera.
const WEAPONS = ALL_WEAPONS;

/**
 * Armas cuyo disparo comparte **a propósito** un registro de impactos.
 *
 * El enjuague lanza un racimo que tiene que pegar una sola vez por enemigo, o sus tres
 * reventones solapados triplicarían el daño que la tabla de equilibrio le atribuye.
 */
const SHARED_REGISTRY: readonly WeaponType[] = ['mouthwash'];

describe('spawnProjectile — coherencia con la tabla de balance', () => {
  it('el número de proyectiles coincide con getWeaponStats en todos los niveles', () => {
    for (const weapon of WEAPONS) {
      for (let level = 1; level <= 5; level++) {
        const spawned = shoot(weapon, level);
        expect(spawned.length, `${weapon} L${level}`).toBe(
          getWeaponStats(weapon, level).projectileCount
        );
      }
    }
  });

  it('el daño de cada proyectil coincide con getWeaponStats', () => {
    for (const weapon of WEAPONS) {
      for (let level = 1; level <= 5; level++) {
        const expected = getWeaponStats(weapon, level).damage;
        for (const proj of shoot(weapon, level)) {
          expect(proj.damage, `${weapon} L${level}`).toBe(expected);
        }
      }
    }
  });

  it('todos los proyectiles del jugador salen marcados como suyos y sin impactos previos', () => {
    for (const weapon of WEAPONS) {
      for (const proj of shoot(weapon, 5)) {
        expect(proj.owner).toBe('player');
        expect(proj.hitIds).toEqual([]);
        expect(proj.type).toBe('projectile');
        expect(proj.lifeTime).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Cada proyectil de una ráfaga lleva **su propio** registro de impactos.
   *
   * Esto es lo que fallaba, y el test de arriba no lo veía porque solo mira que el
   * registro esté vacío al nacer. Lo común a la ráfaga se construía una vez y cada
   * proyectil hacía `{...base}`, lo que copia la *referencia* del array: los tres
   * compartían un mismo «a quién ya he golpeado». Las balas no lo notan porque no
   * perforan, pero las ondas del enjuague sí, y en cuanto una tocaba a un enemigo las
   * otras dos no podían dañarlo nunca.
   */
  it('cada proyectil de una ráfaga lleva su propio registro de impactos', () => {
    for (const weapon of WEAPONS) {
      if (SHARED_REGISTRY.includes(weapon)) continue;
      const volley = shoot(weapon, 5);
      if (volley.length < 2) continue;

      // Anotar un impacto en el primero no debe aparecer en los demás.
      volley[0].hitIds.push('enemigo-1');
      for (const other of volley.slice(1)) {
        expect(other.hitIds, `${weapon}: comparten el array de impactos`).toEqual([]);
      }

      // Y el registro no es el mismo objeto.
      const arrays = new Set(volley.map((p) => p.hitIds));
      expect(arrays.size, `${weapon}: arrays de impactos compartidos`).toBe(volley.length);
    }
  });

  it('ninguna ráfaga repite identidades', () => {
    for (const weapon of WEAPONS) {
      const ids = new Set(shoot(weapon, 5).map((p) => p.id));
      expect(ids.size, `${weapon}: identidades repetidas`).toBe(shoot(weapon, 5).length);
    }
  });

  /**
   * El racimo del enjuague **sí** comparte registro, y a propósito.
   *
   * Tres frascos con registros propios dan tres reventones solapados que triplican el daño
   * sobre el mismo enemigo, y la tabla de equilibrio dice que el arma pega una vez. Es la
   * excepción deliberada: el fallo que se arregló era compartirlo **sin querer**.
   */
  it('el racimo del enjuague comparte registro para pegar una sola vez', () => {
    const racimo = shoot('mouthwash', 5);
    expect(racimo.length).toBeGreaterThan(1);
    racimo[0].hitIds.push('enemigo-1');
    for (const flask of racimo) expect(flask.hitIds).toContain('enemigo-1');
  });
});

describe('spawnProjectile — geometría por arma', () => {
  it('el láser crece en grosor con el nivel', () => {
    expect(shoot('laser', 1)[0].w).toBe(4);
    expect(shoot('laser', 5)[0].w).toBe(20);
    expect(shoot('laser', 1)[0].projectileType).toBe('laser');
  });

  it('el hilo dental se orienta según la dirección de disparo', () => {
    const horizontal = shoot('floss', 1, 1, 0)[0];
    expect(horizontal.w).toBeGreaterThan(horizontal.h);

    const vertical = shoot('floss', 1, 0, -1)[0];
    expect(vertical.h).toBeGreaterThan(vertical.w);
  });

  it('la escopeta abre las balas en abanico simétrico', () => {
    const pellets = shoot('spread', 5);
    expect(pellets).toHaveLength(11);
    const spread = pellets.map((p) => p.vy);
    // Al disparar en horizontal, las desviaciones verticales se compensan.
    expect(spread.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    expect(new Set(spread).size).toBe(11);
  });

  /**
   * El enjuague lanza un **racimo de frascos en abanico**, no ondas rectas desplazadas.
   *
   * El test anterior exigía tres alturas distintas, que era la forma vieja: las ondas nacían
   * separadas en perpendicular. Ahora los tres frascos salen del mismo punto con ángulos
   * distintos, así que lo que hay que comprobar es que sus **velocidades** difieren, no sus
   * posiciones. El recuento por nivel —1, 1, 2, 2, 3— no se mueve.
   */
  it('el enjuague lanza un racimo de frascos en abanico', () => {
    expect(shoot('mouthwash', 2)).toHaveLength(1);
    const l5 = shoot('mouthwash', 5);
    expect(l5).toHaveLength(3);
    expect(new Set(l5.map((p) => p.vy)).size).toBe(3);
    for (const flask of l5) expect(flask.projectileType).toBe('flask');
  });

  /**
   * El frasco sale **hacia arriba** aunque se apunte en horizontal.
   *
   * Sin ese impulso no hay parábola: el frasco nace a dos píxeles del suelo cuando el
   * jugador está de pie, así que lanzado recto tocaba tierra al segundo paso.
   */
  it('el frasco sale con impulso hacia arriba', () => {
    for (let level = 1; level <= 5; level++) {
      const central = shoot('mouthwash', level)[0];
      expect(central.vy, `nivel ${level}`).toBeLessThan(0);
      expect(central.vx, `nivel ${level}`).toBeGreaterThan(0);
    }
  });

  it('el arma normal abre el abanico a partir del nivel 3', () => {
    expect(shoot('normal', 2)).toHaveLength(1);
    const l5 = shoot('normal', 5);
    expect(l5).toHaveLength(5);
    // Una bala va centrada y las otras cuatro simétricas alrededor.
    expect(l5.map((p) => p.y).reduce((a, b) => a + b, 0)).toBeCloseTo(0);
  });

  it('el cepillo es melee: se queda con la velocidad de dirección sin escalar', () => {
    const sword = shoot('toothbrush', 1)[0];
    expect(sword.projectileType).toBe('sword');
    expect(Math.hypot(sword.vx, sword.vy)).toBeCloseTo(1);
  });
});

describe('spawnProjectile — multiplicador de daño', () => {
  const shootWithMult = (weapon: WeaponType, level: number, mult: number): Projectile[] => {
    const out: Projectile[] = [];
    const player = makePlayer(weapon, level);
    player.stats.damageMultiplier = mult;
    spawnProjectile(out, 0, 0, 1, 0, 'player', weapon, player);
    return out;
  };

  it('se aplica al crear el proyectil, una sola vez', () => {
    for (const weapon of WEAPONS) {
      const base = getWeaponStats(weapon, 3).damage;
      for (const proj of shootWithMult(weapon, 3, 1.15)) {
        expect(proj.damage, `${weapon} L3`).toBeCloseTo(base * 1.15);
      }
    }
  });

  it('disparar en ráfaga no acumula el multiplicador sobre los proyectiles ya vivos', () => {
    // Regresión del fallo 01: el bucle parcheaba el daño recorriendo el array
    // después de disparar, así que cada disparo volvía a multiplicar a los
    // anteriores y un +15% acababa siendo un x3,5.
    const out: Projectile[] = [];
    const player = makePlayer('normal', 1);
    player.stats.damageMultiplier = 1.15;
    const expected = getWeaponStats('normal', 1).damage * 1.15;

    for (let i = 0; i < 20; i++) spawnProjectile(out, 0, 0, 1, 0, 'player', 'normal', player);

    expect(out).toHaveLength(20);
    for (const proj of out) expect(proj.damage).toBeCloseTo(expected);
  });

  it('no toca el daño de las balas enemigas en vuelo', () => {
    const out: Projectile[] = [];
    spawnProjectile(out, 0, 0, -1, 0, 'enemy', 'normal');

    const player = makePlayer('normal', 1);
    player.stats.damageMultiplier = 2;
    for (let i = 0; i < 10; i++) spawnProjectile(out, 0, 0, 1, 0, 'player', 'normal', player);

    expect(out[0].owner).toBe('enemy');
    expect(out[0].damage).toBe(ENEMY_BULLET.damage);
  });

  it('un multiplicador de 1 deja el daño de tabla', () => {
    for (const weapon of WEAPONS) {
      for (const proj of shootWithMult(weapon, 5, 1)) {
        expect(proj.damage, weapon).toBe(getWeaponStats(weapon, 5).damage);
      }
    }
  });
});

describe('spawnProjectile — proyectil enemigo', () => {
  it('ignora el arma y el jugador, y usa siempre la bala enemiga', () => {
    const out: Projectile[] = [];
    spawnProjectile(out, 10, 20, -1, 0, 'enemy', 'laser');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      owner: 'enemy',
      damage: 10,
      w: 10,
      h: 10,
      vx: -9,
      vy: 0,
      projectileType: 'bullet',
    });
  });

  it('un disparo de jugador sin jugador no genera nada', () => {
    const out: Projectile[] = [];
    spawnProjectile(out, 0, 0, 1, 0, 'player', 'normal');
    expect(out).toEqual([]);
  });
});
