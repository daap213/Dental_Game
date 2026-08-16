import { describe, it, expect } from 'vitest';
import { createPlayer, fallIntoPit } from './player';
import { generateLevel } from './level';
import { CHARACTER_PROFILES } from './data/characters';
import { PIT_FALL_DAMAGE, CANVAS_HEIGHT, PLAYER_SIZE } from './data/physics';
import type { CharacterType, Platform } from '../types';

const ground = (x: number, w: number): Platform => ({
  x,
  y: CANVAS_HEIGHT - 60,
  w,
  h: 60,
  type: 'platform',
  isGround: true,
});

describe('createPlayer — clase y dificultad', () => {
  const CLASSES = Object.keys(CHARACTER_PROFILES) as CharacterType[];

  it('las cuatro clases dejan de ser idénticas', () => {
    // Antes `character` solo elegía el sprite: mismas estadísticas para todas.
    const perfiles = CLASSES.map((character) => {
      const p = createPlayer({ loadout: 'all', difficulty: 'normal', character });
      return JSON.stringify([p.maxHp, p.stats, p.maxShield]);
    });
    expect(new Set(perfiles).size).toBe(CLASSES.length);
  });

  it('ninguna clase sale con valores absurdos', () => {
    for (const character of CLASSES) {
      const p = createPlayer({ loadout: 'all', difficulty: 'normal', character });
      expect(p.maxHp, character).toBeGreaterThan(50);
      expect(p.hp, character).toBe(p.maxHp);
      expect(p.stats.damageMultiplier, character).toBeGreaterThan(0.5);
      expect(p.stats.speedMultiplier, character).toBeGreaterThan(0.5);
      expect(p.stats.damageReduction, character).toBeLessThan(0.6);
      expect(p.shield, character).toBe(p.maxShield);
    }
  });

  it('el molar aguanta más que el incisivo, y el incisivo pega más', () => {
    const molar = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    const incisor = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'incisor' });
    expect(molar.maxHp).toBeGreaterThan(incisor.maxHp);
    expect(incisor.stats.damageMultiplier).toBeGreaterThan(molar.stats.damageMultiplier);
  });

  it('la clase se combina con la dificultad, no la sustituye', () => {
    const facil = createPlayer({ loadout: 'all', difficulty: 'easy', character: 'molar' });
    const normal = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    expect(facil.maxHp).toBeGreaterThan(normal.maxHp);
    expect(facil.stats.damageMultiplier).toBeGreaterThan(normal.stats.damageMultiplier);
  });

  it('una clase inventada cae al molar sin romperse', () => {
    const p = createPlayer({
      loadout: 'all',
      difficulty: 'normal',
      character: 'colmillo_de_sable' as CharacterType,
    });
    const molar = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    expect(p.maxHp).toBe(molar.maxHp);
  });
});

describe('fallIntoPit — caerse del escenario', () => {
  const platforms = [ground(0, 800), ground(900, 800)];

  it('devuelve al jugador a suelo firme, no al vacío', () => {
    const p = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    p.x = 850; // justo sobre el hueco
    p.y = CANVAS_HEIGHT + 200;
    p.vy = 30;

    expect(fallIntoPit(p, platforms)).toBe(true);
    expect(p.y).toBe(CANVAS_HEIGHT - 60 - p.h);
    expect(p.vy).toBe(0);
    expect(p.isGrounded).toBe(true);

    const sobreSuelo = platforms.some((pl) => p.x >= pl.x && p.x <= pl.x + pl.w);
    expect(sobreSuelo).toBe(true);
  });

  it('cobra el golpe de la caída', () => {
    const p = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    const antes = p.hp;
    fallIntoPit(p, platforms);
    expect(p.hp).toBe(antes - PIT_FALL_DAMAGE);
    expect(p.invincibleTimer).toBeGreaterThan(0);
  });

  it('con una vida extra, gasta la vida y sigue jugable', () => {
    // Este es el fallo 03: antes ponía hp a 0 sin gastar vida, y como el game
    // over exige lives <= 0 el jugador se quedaba cayendo para siempre.
    const p = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    p.hp = 10;
    p.lives = 1;

    expect(fallIntoPit(p, platforms)).toBe(true);
    expect(p.lives).toBe(0);
    expect(p.hp).toBe(p.maxHp);
    expect(p.y).toBeLessThan(CANVAS_HEIGHT);
  });

  it('sin vidas y con poca salud, se muere de verdad', () => {
    const p = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    p.hp = 10;
    p.lives = 0;

    expect(fallIntoPit(p, platforms)).toBe(false);
    expect(p.hp).toBe(0);
  });

  it('caerse con salud de sobra no mata', () => {
    const p = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    for (let i = 0; i < 3; i++) {
      expect(fallIntoPit(p, platforms), `caída ${i + 1}`).toBe(true);
    }
    expect(p.hp).toBeGreaterThan(0);
  });

  it('funciona sobre un nivel generado de verdad', () => {
    const p = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
    const nivel = generateLevel(8000);
    p.x = 4321;
    p.y = CANVAS_HEIGHT + 300;

    expect(fallIntoPit(p, nivel)).toBe(true);
    expect(p.y).toBeLessThanOrEqual(CANVAS_HEIGHT - PLAYER_SIZE);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(8000);
  });
});
