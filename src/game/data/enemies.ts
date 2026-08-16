import type { Enemy } from '../../types';
import { COLORS } from './palette';

export interface EnemySpawnEntry {
  /** Umbral inferior del `Math.random()` que selecciona este enemigo. */
  threshold: number;
  subType: Enemy['subType'];
  w: number;
  h: number;
  color: string;
  /** Vida base y cuánto sube por cada stage. */
  baseHp: number;
  hpPerStage: number;
}

/**
 * Tabla de aparición de enemigos comunes, ordenada de mayor a menor umbral.
 * Se recorre en orden y gana la primera entrada cuyo umbral supera el dado;
 * la última (umbral 0) es el caso por defecto.
 */
export const ENEMY_SPAWN_TABLE: readonly EnemySpawnEntry[] = [
  {
    threshold: 0.95,
    subType: 'plaque_monster',
    w: 48,
    h: 36,
    color: COLORS.enemyPlaque,
    baseHp: 80,
    hpPerStage: 10,
  },
  {
    threshold: 0.9,
    subType: 'gingivitis_grunt',
    w: 40,
    h: 48,
    color: COLORS.enemyGrunt,
    baseHp: 60,
    hpPerStage: 5,
  },
  {
    threshold: 0.8,
    subType: 'tartar_turret',
    w: 32,
    h: 48,
    color: COLORS.enemyTurret,
    baseHp: 50,
    hpPerStage: 0,
  },
  {
    threshold: 0.7,
    subType: 'acid_spitter',
    w: 36,
    h: 36,
    color: COLORS.enemyAcidSpitter,
    baseHp: 40,
    hpPerStage: 0,
  },
  {
    threshold: 0.6,
    subType: 'candy_bomber',
    w: 40,
    h: 24,
    color: COLORS.enemyCandy,
    baseHp: 30,
    hpPerStage: 0,
  },
  {
    threshold: 0.5,
    subType: 'sugar_fiend',
    w: 28,
    h: 28,
    color: COLORS.enemySugarFiend,
    baseHp: 25,
    hpPerStage: 0,
  },
  {
    threshold: 0.4,
    subType: 'sugar_rusher',
    w: 24,
    h: 24,
    color: COLORS.enemyRusher,
    baseHp: 20,
    hpPerStage: 0,
  },
  {
    threshold: 0,
    subType: 'bacteria',
    w: 32,
    h: 32,
    color: COLORS.enemyBacteria,
    baseHp: 20,
    hpPerStage: 4,
  },
];

export const pickEnemySpawn = (roll: number): EnemySpawnEntry =>
  ENEMY_SPAWN_TABLE.find((entry) => roll > entry.threshold) ??
  ENEMY_SPAWN_TABLE[ENEMY_SPAWN_TABLE.length - 1];

export const enemyHpForStage = (entry: EnemySpawnEntry, stage: number): number =>
  entry.baseHp + stage * entry.hpPerStage;

export interface BossEntry {
  variant: NonNullable<Enemy['bossVariant']>;
  /** Clave dentro de TEXT[lang].bosses. */
  nameKey: 'king' | 'phantom' | 'tank' | 'general' | 'deity' | 'wisdom';
  maxHp: number;
  w: number;
  h: number;
  color: string;
}

/** Jefe por stage. Cualquier stage por encima del último usa el final (`deity`). */
export const STAGE_BOSSES: readonly BossEntry[] = [
  { variant: 'king', nameKey: 'king', maxHp: 1500, w: 120, h: 160, color: '#3f3f46' },
  { variant: 'phantom', nameKey: 'phantom', maxHp: 2200, w: 100, h: 100, color: '#22d3ee' },
  { variant: 'tank', nameKey: 'tank', maxHp: 3500, w: 160, h: 140, color: '#57534e' },
  { variant: 'general', nameKey: 'general', maxHp: 3000, w: 100, h: 180, color: '#dc2626' },
  { variant: 'deity', nameKey: 'deity', maxHp: 6000, w: 140, h: 140, color: '#0f172a' },
];

export const HIDDEN_BOSS: BossEntry = {
  variant: 'wisdom_warden',
  nameKey: 'wisdom',
  maxHp: 5000,
  w: 120,
  h: 140,
  color: COLORS.enemyWarden,
};

export const getStageBoss = (stage: number): BossEntry =>
  STAGE_BOSSES[stage - 1] ?? STAGE_BOSSES[STAGE_BOSSES.length - 1];
