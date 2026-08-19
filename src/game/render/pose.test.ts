import { describe, it, expect } from 'vitest';
import { enemyPose, playerPose, walkPhase, PLAYER_WALK_FPS, WALK_FPS } from './pose';
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

  /**
   * En el aire, el signo de `vy` decide.
   *
   * Antes subir y caer eran el mismo fotograma: `vy` estaba en el estado desde el
   * principio y el dibujado no lo miraba, así que el salto doble no tenía peso.
   */
  it('en el aire distingue subir de caer, aunque se mueva', () => {
    expect(playerPose(player({ isGrounded: false, vx: 6, vy: -8 }))).toBe('rise');
    expect(playerPose(player({ isGrounded: false, vx: 6, vy: 4 }))).toBe('fall');
    // En la cima, con la velocidad ya a cero, cuenta como caída.
    expect(playerPose(player({ isGrounded: false, vy: 0 }))).toBe('fall');
  });

  it('el daño manda sobre el salto', () => {
    expect(playerPose(player({ isGrounded: false, hitTimer: 0.1 }))).toBe('hurt');
  });

  /**
   * Correr recorre las **cuatro** fases del paso, y ninguna de ellas es el idle.
   *
   * Antes el ciclo alternaba `walk` con `idle`: la mitad del tiempo el personaje estaba
   * en la pose de estar quieto, y el resultado se leía como un tic y no como un paso.
   */
  it('correr por el suelo recorre las cuatro fases del paso', () => {
    const poses = new Set<string>();
    for (let i = 0; i < 20; i++) {
      poses.add(playerPose(player({ vx: 5, animTimer: i / PLAYER_WALK_FPS })));
    }
    expect(poses).toEqual(new Set(['walk1', 'walk2', 'walk3', 'walk4']));
    expect(poses.has('idle')).toBe(false);
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
