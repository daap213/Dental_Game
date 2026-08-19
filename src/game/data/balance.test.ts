import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CONFIG, getDifficulty } from './difficulty';
import {
  getStageBoss,
  HIDDEN_BOSS,
  pickEnemySpawn,
  enemyHpForStage,
  ENEMY_SPAWN_TABLE,
  STAGE_BOSSES,
  waveInterval,
  WAVE_INTERVAL,
  HIDDEN_BOSS_TRIGGERS,
} from './enemies';
import { getWeaponStats, getFireCooldown, MAX_LEVEL } from './weapons';
import { CHARACTER_PROFILES, getCharacter, characterSummary } from './characters';
import type { CharacterType, Difficulty, WeaponType } from '../../types';

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

  /**
   * La tirada cae en el enemigo que toca.
   *
   * Esto fijaba la cadena de if/else original de ocho enemigos. Al entrar los
   * cuatro nuevos —biopelícula, coraza, absceso y barrena— hubo que redistribuir
   * los umbrales, así que **el reparto cambió a propósito** y estas cifras son las
   * nuevas. Es lo que este fichero existe para hacer notar.
   */
  it('la tirada cae en el enemigo que le toca', () => {
    expect(pickEnemySpawn(0.99).subType).toBe('abscess_bloater');
    expect(pickEnemySpawn(0.93).subType).toBe('plaque_monster');
    expect(pickEnemySpawn(0.88).subType).toBe('calculus_shell');
    expect(pickEnemySpawn(0.8).subType).toBe('gingivitis_grunt');
    expect(pickEnemySpawn(0.72).subType).toBe('tartar_turret');
    expect(pickEnemySpawn(0.66).subType).toBe('enamel_borer');
    expect(pickEnemySpawn(0.58).subType).toBe('acid_spitter');
    expect(pickEnemySpawn(0.52).subType).toBe('biofilm_crawler');
    expect(pickEnemySpawn(0.44).subType).toBe('candy_bomber');
    expect(pickEnemySpawn(0.36).subType).toBe('sugar_fiend');
    expect(pickEnemySpawn(0.28).subType).toBe('sugar_rusher');
    expect(pickEnemySpawn(0.1).subType).toBe('bacteria');
    expect(pickEnemySpawn(0).subType).toBe('bacteria');
  });

  it('todos los enemigos de la tabla pueden salir de verdad', () => {
    // Un umbral mal puesto deja a un enemigo con una franja de ancho cero: sigue
    // en la tabla, tiene arte y textos, y nunca aparece en una partida.
    const reachable = new Set<string>();
    for (let roll = 0; roll < 1; roll += 0.001) {
      reachable.add(pickEnemySpawn(roll).subType);
    }
    for (const entry of ENEMY_SPAWN_TABLE) {
      expect(reachable, `${entry.subType} nunca sale`).toContain(entry.subType);
    }
  });

  it('los enemigos duros son más raros que los básicos', () => {
    // La franja de cada uno es la distancia a la entrada anterior.
    const share = (subType: string) => {
      const i = ENEMY_SPAWN_TABLE.findIndex((e) => e.subType === subType);
      const upper = i === 0 ? 1 : ENEMY_SPAWN_TABLE[i - 1].threshold;
      return upper - ENEMY_SPAWN_TABLE[i].threshold;
    };
    expect(share('abscess_bloater')).toBeLessThan(share('bacteria'));
    expect(share('calculus_shell')).toBeLessThan(share('sugar_rusher'));
    // Y las franjas suman la unidad: si no, hay un hueco o un solape.
    const total = ENEMY_SPAWN_TABLE.reduce((sum, e) => sum + share(e.subType), 0);
    expect(total).toBeCloseTo(1, 6);
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

  it('todos declaran daño por contacto, y en un rango razonable', () => {
    for (const e of ENEMY_SPAWN_TABLE) {
      expect(e.contactDamage, e.subType).toBeGreaterThan(0);
      expect(e.contactDamage, e.subType).toBeLessThanOrEqual(30);
    }
    for (const b of [...STAGE_BOSSES, HIDDEN_BOSS]) {
      expect(b.contactDamage, b.variant).toBeGreaterThan(0);
      expect(b.contactDamage, b.variant).toBeLessThanOrEqual(35);
    }
  });

  it('los más duros pegan más al tocarte que los básicos', () => {
    const damage = (subType: string) =>
      ENEMY_SPAWN_TABLE.find((e) => e.subType === subType)!.contactDamage;
    expect(damage('plaque_monster')).toBeGreaterThan(damage('bacteria'));
    expect(damage('gingivitis_grunt')).toBeGreaterThan(damage('sugar_rusher'));
  });
});

describe('ritmo de oleadas', () => {
  it('se acelera con la puntuación y con el stage', () => {
    expect(waveInterval(0, 1)).toBeGreaterThan(waveInterval(20000, 1));
    expect(waveInterval(0, 1)).toBeGreaterThan(waveInterval(0, 5));
  });

  it('nunca baja del suelo, por muy alta que sea la puntuación', () => {
    expect(waveInterval(0, 1)).toBeCloseTo(WAVE_INTERVAL.base - WAVE_INTERVAL.perStage);
    expect(waveInterval(1_000_000, 99)).toBe(WAVE_INTERVAL.min);
    expect(waveInterval(1_000_000, 99)).toBeGreaterThan(0);
  });
});

describe('disparadores del jefe oculto', () => {
  it('los umbrales están en segundos y son positivos', () => {
    for (const [key, value] of Object.entries(HIDDEN_BOSS_TRIGGERS)) {
      expect(value, key).toBeGreaterThan(0);
    }
  });

  it('la matanza rápida se mide en una ventana menor que el estancamiento', () => {
    expect(HIDDEN_BOSS_TRIGGERS.rushSeconds).toBeLessThan(HIDDEN_BOSS_TRIGGERS.stagnantSeconds);
  });
});

describe('clases de diente', () => {
  const CLASSES = Object.keys(CHARACTER_PROFILES) as CharacterType[];

  it('las cuatro clases existen y ninguna es idéntica a otra', () => {
    expect(CLASSES).toHaveLength(4);
    const perfiles = CLASSES.map((c) => JSON.stringify(CHARACTER_PROFILES[c]));
    expect(new Set(perfiles).size).toBe(4);
  });

  it('los multiplicadores se mantienen en un rango sano', () => {
    for (const c of CLASSES) {
      const p = CHARACTER_PROFILES[c];
      expect(p.hpMult, c).toBeGreaterThanOrEqual(0.8);
      expect(p.hpMult, c).toBeLessThanOrEqual(1.3);
      expect(p.speedMult, c).toBeGreaterThanOrEqual(0.85);
      expect(p.speedMult, c).toBeLessThanOrEqual(1.2);
      expect(p.damageMult, c).toBeGreaterThanOrEqual(0.85);
      expect(p.damageMult, c).toBeLessThanOrEqual(1.2);
      expect(p.damageReduction, c).toBeLessThanOrEqual(0.15);
      expect(p.startingShield, c).toBeLessThanOrEqual(25);
    }
  });

  it('cada clase tiene algo que la distingue, y el menú lo puede mostrar', () => {
    for (const c of CLASSES) {
      expect(characterSummary(c), c).not.toBe('');
    }
  });

  it('una clase inventada cae al molar', () => {
    expect(getCharacter('incisivo_de_sable' as CharacterType)).toBe(CHARACTER_PROFILES.molar);
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
