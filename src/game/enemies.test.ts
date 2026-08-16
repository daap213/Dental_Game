import { describe, it, expect } from 'vitest';
import { cullEnemies } from './enemies';
import { ENEMY_CULL_MARGIN, contactDamageFor } from './data/enemies';
import { CANVAS_WIDTH } from './data/physics';
import type { Enemy } from '../types';

const enemy = (x: number, overrides: Partial<Enemy> = {}): Enemy => ({
  id: Math.random().toString(),
  x,
  y: 100,
  w: 32,
  h: 32,
  vx: 0,
  vy: 0,
  hp: 20,
  maxHp: 20,
  type: 'enemy',
  subType: 'bacteria',
  color: '#0f0',
  facing: -1,
  isGrounded: false,
  aiTimer: 0,
  attackTimer: 0,
  frameTimer: 0,
  state: 0,
  bossState: 0, animTimer: 0, hitTimer: 0, actionTimer: 0,
  ...overrides,
});

describe('cullEnemies', () => {
  it('descarta a los que quedaron muy por detrás de la cámara', () => {
    const cameraX = 5000;
    const enemies = [
      enemy(cameraX - ENEMY_CULL_MARGIN - 100), // fuera
      enemy(cameraX - 100), // dentro
      enemy(cameraX + CANVAS_WIDTH), // por delante
    ];

    const quedan = cullEnemies(enemies, cameraX);
    expect(quedan).toHaveLength(2);
    expect(quedan.every((e) => e.x + e.w > cameraX - ENEMY_CULL_MARGIN)).toBe(true);
  });

  it('nunca descarta a un jefe, esté donde esté', () => {
    const cameraX = 8000;
    const enemies = [
      enemy(0, { subType: 'boss', bossVariant: 'king' }),
      enemy(0, { subType: 'boss', bossVariant: 'wisdom_warden' }),
      enemy(0),
    ];

    const quedan = cullEnemies(enemies, cameraX);
    expect(quedan).toHaveLength(2);
    expect(quedan.every((e) => e.subType === 'boss')).toBe(true);
  });

  it('al principio del nivel no descarta a nadie', () => {
    const enemies = [enemy(0), enemy(100), enemy(800)];
    expect(cullEnemies(enemies, 0)).toHaveLength(3);
  });

  it('mantiene el orden y no muta el array original', () => {
    const enemies = [enemy(1000), enemy(2000), enemy(3000)];
    const copia = [...enemies];
    const quedan = cullEnemies(enemies, 0);
    expect(enemies).toEqual(copia);
    expect(quedan.map((e) => e.x)).toEqual([1000, 2000, 3000]);
  });
});

describe('contactDamageFor', () => {
  it('cada tipo de enemigo pega lo suyo, no un 20 para todos', () => {
    const bacteria = contactDamageFor(enemy(0, { subType: 'bacteria' }));
    const placa = contactDamageFor(enemy(0, { subType: 'plaque_monster' }));
    expect(bacteria).toBeGreaterThan(0);
    expect(placa).toBeGreaterThan(bacteria);
  });

  it('los jefes usan el valor de su ficha', () => {
    const rey = contactDamageFor(enemy(0, { subType: 'boss', bossVariant: 'king' }));
    const deidad = contactDamageFor(enemy(0, { subType: 'boss', bossVariant: 'deity' }));
    expect(deidad).toBeGreaterThan(rey);
  });

  it('un jefe sin variante conocida no devuelve NaN', () => {
    const dmg = contactDamageFor(enemy(0, { subType: 'boss', bossVariant: undefined }));
    expect(dmg).toBeGreaterThan(0);
  });
});
