import { describe, it, expect } from 'vitest';
import { enemyPose, playerPose, walkPhase, WALK_FPS } from './pose';
import { createPlayer } from '../player';
import type { Enemy, Player } from '../../types';

const player = (overrides: Partial<Player> = {}): Player =>
  Object.assign(createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' }), {
    isGrounded: true,
    ...overrides,
  });

const enemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: 'e',
  x: 0,
  y: 0,
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
  isGrounded: true,
  frameTimer: 0,
  state: 0,
  animTimer: 0,
  hitTimer: 0,
  aiTimer: 0,
  attackTimer: 0,
  actionTimer: 0,
  bossState: 0,
  ...overrides,
});

describe('poses de enemigo', () => {
  it('quieto es idle', () => {
    expect(enemyPose(enemy())).toBe('idle');
  });

  it('el daño manda sobre todo lo demás', () => {
    expect(enemyPose(enemy({ hitTimer: 0.1, actionTimer: 0.2, vx: 5 }))).toBe('hurt');
  });

  it('atacar manda sobre andar', () => {
    expect(enemyPose(enemy({ actionTimer: 0.2, vx: 5 }))).toBe('attack');
  });

  it('moverse alterna entre andar e idle: el ciclo de dos fotogramas', () => {
    const poses = new Set<string>();
    for (let i = 0; i < 20; i++) {
      poses.add(enemyPose(enemy({ vx: 3, animTimer: i / WALK_FPS / 2 })));
    }
    expect(poses).toEqual(new Set(['walk', 'idle']));
  });

  it('un temblor mínimo no cuenta como andar', () => {
    expect(enemyPose(enemy({ vx: 0.1 }))).toBe('idle');
    expect(enemyPose(enemy({ vx: -0.2 }))).toBe('idle');
  });
});

describe('poses de jugador', () => {
  it('quieto en el suelo es idle', () => {
    expect(playerPose(player())).toBe('idle');
  });

  it('en el aire es salto, aunque se mueva', () => {
    expect(playerPose(player({ isGrounded: false, vx: 6 }))).toBe('jump');
  });

  it('el daño manda sobre el salto', () => {
    expect(playerPose(player({ isGrounded: false, hitTimer: 0.1 }))).toBe('hurt');
  });

  it('correr por el suelo alterna andar e idle', () => {
    const poses = new Set<string>();
    for (let i = 0; i < 20; i++) {
      poses.add(playerPose(player({ vx: 5, animTimer: i / WALK_FPS / 2 })));
    }
    expect(poses).toEqual(new Set(['walk', 'idle']));
  });
});

describe('ciclo de andar', () => {
  it('cambia de fotograma a la frecuencia declarada', () => {
    expect(walkPhase(0)).toBe(false);
    expect(walkPhase(1 / WALK_FPS)).toBe(true);
    expect(walkPhase(2 / WALK_FPS)).toBe(false);
  });

  it('aguanta un reloj negativo sin romperse', () => {
    expect(walkPhase(-1)).toBe(false);
  });
});
