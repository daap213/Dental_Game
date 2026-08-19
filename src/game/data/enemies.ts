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
  /**
   * Daño por contacto. Antes era un literal 20 igual para todos dentro del
   * bucle; ahora cada enemigo pega según lo que es. Los proyectiles llevan su
   * daño aparte, en `data/weapons.ts` y en la IA de los jefes.
   */
  contactDamage: number;
}

/**
 * Tabla de aparición de enemigos comunes, ordenada de mayor a menor umbral.
 * Se recorre en orden y gana la primera entrada cuyo umbral supera el dado;
 * la última (umbral 0) es el caso por defecto.
 */
export const ENEMY_SPAWN_TABLE: readonly EnemySpawnEntry[] = [
  /**
   * Absceso: el más raro y el más duro. Camina lentísimo y **al morir se abre en
   * tres bacterias**, así que matarlo de lejos no resuelve el problema.
   */
  {
    threshold: 0.96,
    subType: 'abscess_bloater',
    w: 52,
    h: 44,
    color: COLORS.enemyBloater,
    baseHp: 110,
    hpPerStage: 15,
    contactDamage: 26,
  },
  {
    threshold: 0.91,
    subType: 'plaque_monster',
    w: 48,
    h: 36,
    color: COLORS.enemyPlaque,
    baseHp: 80,
    hpPerStage: 10,
    contactDamage: 25,
  },
  /**
   * Coraza de sarro: **solo recibe daño por detrás**. Es el único enemigo que
   * obliga a moverse en lugar de a disparar de frente.
   */
  {
    threshold: 0.86,
    subType: 'calculus_shell',
    w: 40,
    h: 40,
    color: COLORS.enemyShell,
    baseHp: 90,
    hpPerStage: 12,
    contactDamage: 22,
  },
  {
    threshold: 0.78,
    subType: 'gingivitis_grunt',
    w: 40,
    h: 48,
    color: COLORS.enemyGrunt,
    baseHp: 60,
    hpPerStage: 5,
    contactDamage: 24,
  },
  {
    threshold: 0.7,
    subType: 'tartar_turret',
    w: 32,
    h: 48,
    color: COLORS.enemyTurret,
    baseHp: 50,
    hpPerStage: 0,
    contactDamage: 18,
  },
  /**
   * Barrena de esmalte: **se entierra y emerge junto al jugador**. Es el único que
   * no se puede esperar de frente.
   */
  {
    threshold: 0.64,
    subType: 'enamel_borer',
    w: 30,
    h: 26,
    color: COLORS.enemyBorer,
    baseHp: 55,
    hpPerStage: 8,
    contactDamage: 24,
  },
  {
    threshold: 0.56,
    subType: 'acid_spitter',
    w: 36,
    h: 36,
    color: COLORS.enemyAcidSpitter,
    baseHp: 40,
    hpPerStage: 0,
    contactDamage: 18,
  },
  /**
   * Biopelícula: **recorre el techo y se deja caer**. Antes nada atacaba desde
   * arriba, así que mirar al suelo bastaba.
   */
  {
    threshold: 0.5,
    subType: 'biofilm_crawler',
    w: 36,
    h: 20,
    color: COLORS.enemyCrawler,
    baseHp: 45,
    hpPerStage: 6,
    contactDamage: 20,
  },
  {
    threshold: 0.42,
    subType: 'candy_bomber',
    w: 40,
    h: 24,
    color: COLORS.enemyCandy,
    baseHp: 30,
    hpPerStage: 0,
    contactDamage: 16,
  },
  {
    threshold: 0.34,
    subType: 'sugar_fiend',
    w: 28,
    h: 28,
    color: COLORS.enemySugarFiend,
    baseHp: 25,
    hpPerStage: 0,
    contactDamage: 16,
  },
  {
    threshold: 0.24,
    subType: 'sugar_rusher',
    w: 24,
    h: 24,
    color: COLORS.enemyRusher,
    baseHp: 20,
    hpPerStage: 0,
    contactDamage: 14,
  },
  {
    threshold: 0,
    subType: 'bacteria',
    w: 32,
    h: 32,
    color: COLORS.enemyBacteria,
    baseHp: 20,
    hpPerStage: 4,
    contactDamage: 12,
  },
];

/**
 * ¿Está la barrena bajo tierra?
 *
 * Vive en `data/` porque la necesitan las dos capas de arriba y ninguna debe
 * depender de la otra: la simulación, para dejarla atravesar el suelo, y el
 * dibujado, para pintar el montículo en lugar del sprite. Escrita dos veces se
 * desincronizaría a la primera.
 */
export const isBurrowed = (enemy: Enemy): boolean =>
  enemy.subType === 'enamel_borer' && enemy.bossState !== 2;

/** Daño por contacto usado cuando un enemigo no está en la tabla. */
export const DEFAULT_CONTACT_DAMAGE = 20;

/**
 * Daño por contacto por tipo de enemigo, para consultarlo desde el bucle sin
 * volver a buscar la entrada de la tabla. Los jefes lo llevan en `STAGE_BOSSES`.
 */
export const contactDamageFor = (enemy: Enemy): number => {
  if (enemy.subType === 'boss') {
    return findBoss(enemy.bossVariant)?.contactDamage ?? DEFAULT_CONTACT_DAMAGE;
  }
  const entry = ENEMY_SPAWN_TABLE.find((e) => e.subType === enemy.subType);
  return entry?.contactDamage ?? DEFAULT_CONTACT_DAMAGE;
};

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
  /** Daño por embestida/contacto, aparte del de sus proyectiles. */
  contactDamage: number;
}

/** Jefe por stage. Cualquier stage por encima del último usa el final (`deity`). */
export const STAGE_BOSSES: readonly BossEntry[] = [
  { variant: 'king', nameKey: 'king', maxHp: 1500, w: 120, h: 160, color: '#3f3f46', contactDamage: 25 },
  { variant: 'phantom', nameKey: 'phantom', maxHp: 2200, w: 100, h: 100, color: '#22d3ee', contactDamage: 24 },
  { variant: 'tank', nameKey: 'tank', maxHp: 3500, w: 160, h: 140, color: '#57534e', contactDamage: 28 },
  { variant: 'general', nameKey: 'general', maxHp: 3000, w: 100, h: 180, color: '#dc2626', contactDamage: 24 },
  { variant: 'deity', nameKey: 'deity', maxHp: 6000, w: 140, h: 140, color: '#0f172a', contactDamage: 30 },
];

export const HIDDEN_BOSS: BossEntry = {
  variant: 'wisdom_warden',
  nameKey: 'wisdom',
  maxHp: 5000,
  w: 120,
  h: 140,
  color: COLORS.enemyWarden,
  contactDamage: 28,
};

export const getStageBoss = (stage: number): BossEntry =>
  STAGE_BOSSES[stage - 1] ?? STAGE_BOSSES[STAGE_BOSSES.length - 1];

/** Busca un jefe por su variante, incluido el oculto. */
export const findBoss = (variant: Enemy['bossVariant']): BossEntry | undefined =>
  variant === HIDDEN_BOSS.variant
    ? HIDDEN_BOSS
    : STAGE_BOSSES.find((boss) => boss.variant === variant);

/**
 * Umbrales de comportamiento que invocan al jefe oculto. Todos se miden con
 * tiempo de simulación acumulado, nunca con `Date.now()`: pausar la partida o
 * cambiar de pestaña no debe acercar la invocación.
 */
export const HIDDEN_BOSS_TRIGGERS = {
  /** Segundos sin avanzar `idleDistance` píxeles. */
  idleSeconds: 120,
  idleDistance: 50,
  /** Segundos de nivel sin pasar de `stagnantX`. */
  stagnantSeconds: 180,
  stagnantX: 1500,
  /** Más de `rushKills` bajas en menos de `rushSeconds`. */
  rushSeconds: 120,
  rushKills: 30,
  /** Matar al jefe del stage en menos de esto. */
  bossSpeedkillSeconds: 60,
  /** A qué distancia del jugador aparece. */
  spawnOffsetX: 300,
} as const;

/**
 * Segundos entre oleadas. Baja con la puntuación y con el stage, con un suelo
 * para que no se vuelva ingobernable. Era una expresión suelta en el bucle.
 */
export const WAVE_INTERVAL = {
  base: 2.0,
  min: 0.5,
  perScore: 1 / 10000,
  perStage: 0.1,
} as const;

export const waveInterval = (score: number, stage: number): number =>
  Math.max(
    WAVE_INTERVAL.min,
    WAVE_INTERVAL.base - score * WAVE_INTERVAL.perScore - stage * WAVE_INTERVAL.perStage
  );

/**
 * Margen por detrás de la cámara a partir del cual un enemigo se descarta. Sin
 * esto el array crecía durante toda la partida con enemigos que ya no se ven ni
 * se mueven, pero que seguían comprobándose contra cada proyectil.
 */
export const ENEMY_CULL_MARGIN = 600;
