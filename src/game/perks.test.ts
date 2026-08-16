import { describe, it, expect } from 'vitest';
import { getRandomPerks, applyPerk } from './perks';
import type { Player } from '../types';

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
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
  frameTimer: 0,
  state: 0,
  character: 'molar',
  invincibleTimer: 0,
  slowTimer: 0,
  shield: 0,
  maxShield: 0,
  shieldRegenTimer: 0,
  lives: 0,
  weapon: 'normal',
  weaponLevel: 1,
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
  ...overrides,
});

describe('getRandomPerks', () => {
  it('devuelve la cantidad pedida', () => {
    expect(getRandomPerks(3, 'es')).toHaveLength(3);
    expect(getRandomPerks(1, 'en')).toHaveLength(1);
  });

  it('nunca repite un perk en la misma mano', () => {
    for (let i = 0; i < 200; i++) {
      const ids = getRandomPerks(3, 'en').map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('hidrata nombre y descripción en el idioma pedido', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const perk of getRandomPerks(3, lang)) {
        expect(perk.name.trim()).not.toBe('');
        expect(perk.description.trim()).not.toBe('');
      }
    }
  });

  it('no puede devolver más perks de los que existen', () => {
    expect(getRandomPerks(99, 'en').length).toBeLessThanOrEqual(10);
  });

  it('respeta los pesos: los comunes salen más que los legendarios', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 3000; i++) {
      for (const perk of getRandomPerks(1, 'en')) {
        counts.set(perk.id, (counts.get(perk.id) ?? 0) + 1);
      }
    }
    // enamel_shield pesa 100; extra_life pesa 5.
    expect(counts.get('enamel_shield') ?? 0).toBeGreaterThan(counts.get('extra_life') ?? 0);
  });
});

describe('getRandomPerks — no ofrece mejoras inútiles', () => {
  /** Todos los ids que pueden salir para este jugador. */
  const idsOfrecidos = (player: Player): Set<string> => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const perk of getRandomPerks(3, 'es', player)) ids.add(perk.id);
    }
    return ids;
  };

  it('con la vida y el escudo llenos no ofrece la cura total', () => {
    const p = makePlayer({ hp: 100, maxHp: 100, shield: 25, maxShield: 25 });
    expect(idsOfrecidos(p).has('extra_filling')).toBe(false);
  });

  it('si falta vida, la cura total vuelve a la baraja', () => {
    const p = makePlayer({ hp: 40, maxHp: 100 });
    expect(idsOfrecidos(p).has('extra_filling')).toBe(true);
  });

  it('si falta escudo aunque la vida esté llena, también', () => {
    const p = makePlayer({ hp: 100, maxHp: 100, shield: 5, maxShield: 25 });
    expect(idsOfrecidos(p).has('extra_filling')).toBe(true);
  });

  it('con la reducción de daño al tope no ofrece más esmalte', () => {
    const p = makePlayer();
    p.stats.damageReduction = 0.6;
    expect(idsOfrecidos(p).has('thick_enamel')).toBe(false);
  });

  it('sin jugador se comporta como antes y ofrece todo', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) for (const perk of getRandomPerks(3, 'es')) ids.add(perk.id);
    expect(ids.has('extra_filling')).toBe(true);
    expect(ids.has('thick_enamel')).toBe(true);
  });

  it('sigue devolviendo la cantidad pedida aunque se filtren mejoras', () => {
    const p = makePlayer({ hp: 100, maxHp: 100, shield: 25, maxShield: 25 });
    p.stats.damageReduction = 0.6;
    expect(getRandomPerks(3, 'en', p)).toHaveLength(3);
  });
});

describe('applyPerk', () => {
  it('enamel_shield añade escudo y lo deja lleno', () => {
    const p = makePlayer();
    applyPerk(p, 'enamel_shield');
    expect(p.maxShield).toBe(25);
    expect(p.shield).toBe(25);
  });

  it('vitality_root sube el máximo y cura sin pasarse del tope', () => {
    const p = makePlayer({ hp: 100, maxHp: 100 });
    applyPerk(p, 'vitality_root');
    expect(p.maxHp).toBe(120);
    expect(p.hp).toBe(120);
  });

  it('thick_enamel acumula reducción pero topa en 60%', () => {
    const p = makePlayer();
    for (let i = 0; i < 10; i++) applyPerk(p, 'thick_enamel');
    expect(p.stats.damageReduction).toBeLessThanOrEqual(0.6);
    expect(p.stats.damageReduction).toBeCloseTo(0.6);
  });

  it('extra_life suma una vida y cura del todo', () => {
    const p = makePlayer({ hp: 10 });
    applyPerk(p, 'extra_life');
    expect(p.lives).toBe(1);
    expect(p.hp).toBe(p.maxHp);
  });

  it('bristle_rage y fluoride_rush son multiplicativos', () => {
    const p = makePlayer();
    applyPerk(p, 'bristle_rage');
    applyPerk(p, 'bristle_rage');
    expect(p.stats.damageMultiplier).toBeCloseTo(1.15 * 1.15);

    applyPerk(p, 'fluoride_rush');
    expect(p.stats.speedMultiplier).toBeCloseTo(1.1);
  });

  it('un id desconocido no rompe ni muta nada', () => {
    const p = makePlayer();
    const before = JSON.stringify(p);
    applyPerk(p, 'no_existe');
    expect(JSON.stringify(p)).toBe(before);
  });
});
