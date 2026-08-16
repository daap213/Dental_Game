import { describe, it, expect } from 'vitest';
import { spawnProjectile } from './weapons';
import { getWeaponStats, ENEMY_BULLET } from './data/weapons';
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
    weaponLevels: { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1 },
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

const WEAPONS: WeaponType[] = ['normal', 'spread', 'laser', 'mouthwash', 'floss', 'toothbrush'];

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

  it('el enjuague añade ondas laterales desplazadas en 3 y en 5', () => {
    expect(shoot('mouthwash', 2)).toHaveLength(1);
    const l5 = shoot('mouthwash', 5);
    expect(l5).toHaveLength(3);
    // Disparando en horizontal, las laterales se separan en Y respecto a la central.
    expect(new Set(l5.map((p) => p.y)).size).toBe(3);
    for (const wave of l5) expect(wave.projectileType).toBe('wave');
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
