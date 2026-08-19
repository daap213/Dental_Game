import type { Enemy } from '../../../types';
import type { Material, PaletteKey } from '../../data/palette';
import type { EnemyPose } from '../pose';
import type { SpriteDef } from './format';
import { shadeMask, withDetails } from './shade';
import { ENEMY_ART, type EnemyArt } from './masks/enemies';
import { shift } from './masks/shapes';

/**
 * Sprites de los ocho enemigos comunes: 8 × 4 poses.
 *
 * Cada enemigo aporta **una** silueta y tres capas de cara (reposo, ataque,
 * daño). Las cuatro poses salen de combinarlas con dos recursos que no cuestan
 * dibujo y se leen igual de bien:
 *
 *   · andar: la silueta se levanta un píxel, que es el bote del paso,
 *   · atacar: el sprite se ilumina un poco además de abrir la boca,
 *   · daño: se oscurece y los ojos se aprietan.
 *
 * El material de cada enemigo es el de su rampa, así que el bicho entero —cuerpo,
 * sombras y brillos— sale de la misma familia de color y no hay que elegir tonos
 * a mano en cada sprite.
 */

type EnemySubType = keyof typeof ENEMY_ART;

/** Material de la rampa que usa cada enemigo. */
const MATERIALS: Record<EnemySubType, Material> = {
  bacteria: 'bacteria',
  plaque_monster: 'plaque',
  candy_bomber: 'candy',
  tartar_turret: 'turret',
  sugar_rusher: 'rusher',
  sugar_fiend: 'fiend',
  acid_spitter: 'acid',
  gingivitis_grunt: 'grunt',
  biofilm_crawler: 'bacteria',
  calculus_shell: 'tartarCrust',
  abscess_bloater: 'fiend',
  enamel_borer: 'enamelStained',
};

/**
 * Colores de los caracteres de detalle, resueltos con la rampa del enemigo.
 *
 * Los ojos y el metal son siempre iguales —un ojo verde en un bicho verde no se
 * ve—, y el resto sale del propio material para que el detalle no parezca pegado.
 */
const detailColors = (material: Material): Record<string, PaletteKey> => ({
  E: 'enamel.hi',
  P: 'metal.out',
  G: 'metal.hi',
  M: `${material}.out`,
  T: 'enamel.light',
  H: `${material}.hi`,
  S: `${material}.shade`,
  N: `${material}.dark`,
  R: 'candy.light',
  W: 'metal.mid',
});

/** Cuánto se aclara al atacar y cuánto se oscurece al recibir daño. */
const POSE_BIAS: Record<EnemyPose, number> = {
  idle: 0,
  walk: 0,
  attack: 0.16,
  hurt: -0.3,
};

const detailFor = (art: EnemyArt, pose: EnemyPose): readonly string[] => {
  if (pose === 'attack') return art.attack ?? art.detail;
  if (pose === 'hurt') return art.hurt ?? art.detail;
  return art.detail;
};

const cache = new Map<string, SpriteDef>();

export const enemySpriteId = (subType: string, pose: EnemyPose) => `enemy:${subType}:${pose}`;

/** ¿Hay sprite dibujado para este enemigo? Los jefes se dibujan aparte. */
export const hasEnemySprite = (subType: string): subType is EnemySubType => subType in ENEMY_ART;

export const enemySprite = (subType: EnemySubType, pose: EnemyPose): SpriteDef => {
  const id = enemySpriteId(subType, pose);
  const hit = cache.get(id);
  if (hit) return hit;

  const art = ENEMY_ART[subType];
  const material = MATERIALS[subType];

  // El bote del paso: la silueta sube un píxel y el detalle con ella.
  const bob = pose === 'walk' ? -1 : 0;
  const mask = bob ? shift(art.mask, 0, bob) : art.mask;
  const detailRows = bob ? shift(detailFor(art, pose), 0, bob) : detailFor(art, pose);

  const def = withDetails(shadeMask(mask, material, { bias: POSE_BIAS[pose] }), {
    w: art.w,
    h: art.h,
    rows: detailRows,
    map: detailColors(material),
  });

  cache.set(id, def);
  return def;
};

/** Sprite que le toca a este enemigo ahora mismo, o null si es un jefe. */
export const spriteForEnemy = (enemy: Enemy, pose: EnemyPose): SpriteDef | null =>
  hasEnemySprite(enemy.subType) ? enemySprite(enemy.subType, pose) : null;

export const ENEMY_SUBTYPES = Object.keys(ENEMY_ART) as EnemySubType[];
export const ENEMY_POSES: readonly EnemyPose[] = ['idle', 'walk', 'attack', 'hurt'];
