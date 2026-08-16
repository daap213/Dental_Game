import { describe, it, expect } from 'vitest';
import { generateLevel, findRespawn } from './level';
import { CANVAS_HEIGHT } from './data/physics';
import type { Platform } from '../types';

const ground = (x: number, w: number): Platform => ({
  x,
  y: CANVAS_HEIGHT - 60,
  w,
  h: 60,
  type: 'platform',
  isGround: true,
});

const floating = (x: number): Platform => ({
  x,
  y: 200,
  w: 100,
  h: 20,
  type: 'platform',
  isGround: false,
});

describe('generateLevel', () => {
  it('siempre garantiza la zona de inicio y la arena del jefe', () => {
    for (const width of [8000, 10000, 16000]) {
      const platforms = generateLevel(width);
      expect(platforms.some((p) => p.x === 0 && p.isGround)).toBe(true);
      expect(platforms.some((p) => p.x === width - 800 && p.isGround)).toBe(true);
    }
  });

  it('no genera plataformas de tamaño inválido', () => {
    for (const p of generateLevel(8000)) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });
});

describe('findRespawn', () => {
  const platforms = [ground(0, 800), ground(900, 500), floating(300)];

  it('si hay suelo debajo, deja la x y sube al borde', () => {
    const spot = findRespawn(platforms, 400, 32);
    expect(spot.x).toBe(400);
    expect(spot.y).toBe(CANVAS_HEIGHT - 60 - 32);
  });

  it('sobre un hueco, retrocede al suelo anterior', () => {
    const spot = findRespawn(platforms, 850, 32);
    expect(spot.x).toBe(400); // centro del suelo que acaba en 800
    expect(spot.y).toBe(CANVAS_HEIGHT - 60 - 32);
  });

  it('nunca devuelve una plataforma flotante', () => {
    const spot = findRespawn(platforms, 350, 32);
    expect(spot.y).toBe(CANVAS_HEIGHT - 60 - 32);
  });

  it('antes del primer suelo, usa la zona de inicio', () => {
    const spot = findRespawn([ground(500, 300)], 100, 32);
    expect(spot.x).toBe(650);
  });

  it('sin suelos no explota', () => {
    const spot = findRespawn([floating(0)], 100, 32);
    expect(Number.isFinite(spot.x)).toBe(true);
    expect(Number.isFinite(spot.y)).toBe(true);
  });

  it('sobre un nivel real siempre cae en suelo, en cualquier x', () => {
    const nivel = generateLevel(8000);
    const suelos = nivel.filter((p) => p.isGround);

    for (let x = 0; x <= 8000; x += 137) {
      const spot = findRespawn(nivel, x, 32);
      const sobreSuelo = suelos.some((p) => spot.x >= p.x && spot.x <= p.x + p.w);
      expect(sobreSuelo, `x=${x}`).toBe(true);
      expect(spot.y).toBeLessThan(CANVAS_HEIGHT);
    }
  });
});
