import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CONFIG, getDifficulty } from './difficulty';
import {
  getStageBoss,
  HIDDEN_BOSS,
  pickEnemySpawn,
  enemyHpForStage,
  ENEMY_SPAWN_TABLE,
} from './enemies';
import { getWeaponStats, getFireCooldown, MAX_LEVEL } from './weapons';
import type { Difficulty, WeaponType } from '../../types';

/**
 * Estos tests fijan el balance actual del juego. NO son tests de implementación:
 * son el criterio de aceptación de la migración a Phaser. Si un número cambia
 * aquí, es porque alguien decidió cambiar el balance, no por accidente.
 */

describe('dificultad', () => {
  const ALL: Difficulty[] = ['easy', 'normal', 'hard', 'legend'];

  it('todas las dificultades están definidas', () => {
    for (const d of ALL) expect(DIFFICULTY_CONFIG[d]).toBeDefined();
  });

  it('el drop rate baja según sube la dificultad', () => {
    const rates = ALL.map((d) => DIFFICULTY_CONFIG[d].dropRate);
    expect(rates).toEqual([...rates].sort((a, b) => b - a));
    expect(rates).toEqual([0.25, 0.15, 0.08, 0.05]);
  });

  it('easy es la única que regala vida y reduce daño recibido', () => {
    expect(DIFFICULTY_CONFIG.easy.hpMult).toBe(1.25);
    expect(DIFFICULTY_CONFIG.easy.dmgTaken).toBeLessThan(1);
    for (const d of ['normal', 'hard', 'legend'] as const) {
      expect(DIFFICULTY_CONFIG[d].hpMult).toBe(1);
    }
  });

  it('legend castiga en daño recibido y en umbrales de perk', () => {
    expect(DIFFICULTY_CONFIG.legend.dmgTaken).toBeGreaterThan(1);
    expect(DIFFICULTY_CONFIG.legend.milestoneMult).toBe(1.3);
  });

  it('un valor inesperado cae a normal', () => {
    expect(getDifficulty('inventada' as Difficulty)).toBe(DIFFICULTY_CONFIG.normal);
  });
});

describe('jefes', () => {
  it('cada stage 1-5 tiene su jefe con la vida esperada', () => {
    expect(getStageBoss(1)).toMatchObject({ variant: 'king', maxHp: 1500 });
    expect(getStageBoss(2)).toMatchObject({ variant: 'phantom', maxHp: 2200 });
    expect(getStageBoss(3)).toMatchObject({ variant: 'tank', maxHp: 3500 });
    expect(getStageBoss(4)).toMatchObject({ variant: 'general', maxHp: 3000 });
    expect(getStageBoss(5)).toMatchObject({ variant: 'deity', maxHp: 6000 });
  });

  it('cualquier stage por encima del 5 repite a la deidad', () => {
    expect(getStageBoss(6).variant).toBe('deity');
    expect(getStageBoss(99).variant).toBe('deity');
  });

  it('el jefe oculto no está en la rotación de stages', () => {
    expect(HIDDEN_BOSS.variant).toBe('wisdom_warden');
    expect(HIDDEN_BOSS.maxHp).toBe(5000);
    expect(getStageBoss(1).variant).not.toBe('wisdom_warden');
  });
});

describe('tabla de enemigos', () => {
  it('los umbrales están en orden descendente y terminan en 0', () => {
    const thresholds = ENEMY_SPAWN_TABLE.map((e) => e.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => b - a));
    expect(thresholds[thresholds.length - 1]).toBe(0);
  });

  it('reproduce la cadena de if/else original', () => {
    expect(pickEnemySpawn(0.99).subType).toBe('plaque_monster');
    expect(pickEnemySpawn(0.93).subType).toBe('gingivitis_grunt');
    expect(pickEnemySpawn(0.85).subType).toBe('tartar_turret');
    expect(pickEnemySpawn(0.75).subType).toBe('acid_spitter');
    expect(pickEnemySpawn(0.65).subType).toBe('candy_bomber');
    expect(pickEnemySpawn(0.55).subType).toBe('sugar_fiend');
    expect(pickEnemySpawn(0.45).subType).toBe('sugar_rusher');
    expect(pickEnemySpawn(0.2).subType).toBe('bacteria');
    expect(pickEnemySpawn(0).subType).toBe('bacteria');
  });

  it('la vida escala por stage solo en los enemigos que lo definen', () => {
    const bacteria = ENEMY_SPAWN_TABLE.find((e) => e.subType === 'bacteria')!;
    expect(enemyHpForStage(bacteria, 1)).toBe(24);
    expect(enemyHpForStage(bacteria, 5)).toBe(40);

    const turret = ENEMY_SPAWN_TABLE.find((e) => e.subType === 'tartar_turret')!;
    expect(enemyHpForStage(turret, 1)).toBe(50);
    expect(enemyHpForStage(turret, 5)).toBe(50);
  });

  it('ningún enemigo tiene dimensiones o vida inválidas', () => {
    for (const e of ENEMY_SPAWN_TABLE) {
      expect(e.w).toBeGreaterThan(0);
      expect(e.h).toBeGreaterThan(0);
      expect(enemyHpForStage(e, 1)).toBeGreaterThan(0);
    }
  });
});

describe('armas', () => {
  const WEAPONS: WeaponType[] = ['normal', 'spread', 'laser', 'mouthwash', 'floss', 'toothbrush'];

  it('el daño nunca baja al subir de nivel', () => {
    for (const weapon of WEAPONS) {
      for (let l = 2; l <= MAX_LEVEL; l++) {
        expect(
          getWeaponStats(weapon, l).damage,
          `${weapon} L${l} debería pegar al menos como L${l - 1}`
        ).toBeGreaterThan(getWeaponStats(weapon, l - 1).damage);
      }
    }
  });

  it('la cadencia nunca empeora al subir de nivel', () => {
    for (const weapon of WEAPONS) {
      for (let l = 2; l <= MAX_LEVEL; l++) {
        expect(getWeaponStats(weapon, l).cooldownFrames).toBeLessThanOrEqual(
          getWeaponStats(weapon, l - 1).cooldownFrames
        );
      }
    }
  });

  it('daño en L1 y L5 (valores de balance actuales)', () => {
    expect(getWeaponStats('normal', 1).damage).toBe(10);
    expect(getWeaponStats('normal', 5).damage).toBe(18);
    expect(getWeaponStats('spread', 1).damage).toBe(7);
    expect(getWeaponStats('spread', 5).damage).toBe(11);
    expect(getWeaponStats('laser', 1).damage).toBe(15);
    expect(getWeaponStats('laser', 5).damage).toBe(47);
    expect(getWeaponStats('mouthwash', 1).damage).toBe(20);
    expect(getWeaponStats('mouthwash', 5).damage).toBe(68);
    expect(getWeaponStats('floss', 1).damage).toBe(25);
    expect(getWeaponStats('floss', 5).damage).toBe(85);
    expect(getWeaponStats('toothbrush', 1).damage).toBe(35);
    expect(getWeaponStats('toothbrush', 5).damage).toBe(115);
  });

  it('número de proyectiles por nivel', () => {
    // La escopeta va de 3 a 11, dos más por nivel.
    expect([1, 2, 3, 4, 5].map((l) => getWeaponStats('spread', l).projectileCount)).toEqual([
      3, 5, 7, 9, 11,
    ]);
    // El arma normal se abre en abanico a partir del nivel 3.
    expect([1, 2, 3, 4, 5].map((l) => getWeaponStats('normal', l).projectileCount)).toEqual([
      1, 1, 2, 3, 5,
    ]);
    // El enjuague añade ondas laterales en 3 y en 5.
    expect([1, 2, 3, 4, 5].map((l) => getWeaponStats('mouthwash', l).projectileCount)).toEqual([
      1, 1, 2, 2, 3,
    ]);
  });

  it('cadencias por arma', () => {
    expect(getFireCooldown('normal', 1)).toBe(10);
    expect(getFireCooldown('normal', 2)).toBe(6);
    expect(getFireCooldown('spread', 5)).toBe(20);
    expect(getFireCooldown('laser', 5)).toBe(20);
    expect(getFireCooldown('mouthwash', 1)).toBe(30);
    expect(getFireCooldown('mouthwash', 2)).toBe(22);
    expect(getFireCooldown('floss', 3)).toBe(18);
    expect(getFireCooldown('toothbrush', 1)).toBe(20);
    expect(getFireCooldown('toothbrush', 2)).toBe(15);
  });

  it('el nivel se recorta al rango válido', () => {
    expect(getWeaponStats('laser', 0)).toEqual(getWeaponStats('laser', 1));
    expect(getWeaponStats('laser', 99)).toEqual(getWeaponStats('laser', MAX_LEVEL));
  });
});
