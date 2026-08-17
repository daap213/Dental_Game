import type { CharacterType, Projectile, PowerUp, WeaponType } from '../../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/physics';
import { RAMPS, tone, type Material, type Tone } from '../data/palette';
import { ENEMY_SPAWN_TABLE, STAGE_BOSSES, HIDDEN_BOSS } from '../data/enemies';
import { STAGE_PALETTES } from '../data/stages';
import { CHARACTER_PROFILES } from '../data/characters';
import { MAX_LEVEL } from '../data/weapons';
import { createPlayer } from '../player';
import { spawnProjectile } from '../weapons';
import { px } from './pixel';
import { drawSprite } from './sprites/format';
import { playerSprite, playerSpriteId } from './sprites/player';
import { enemySprite, enemySpriteId, hasEnemySprite } from './sprites/enemies';
import { bossSprite, bossSpriteId } from './bosses';
import { drawProjectiles, drawHeldWeapon, drawPowerUp } from './weapons';
import { drawBackground, drawPlatforms } from './level';
import { drawParticles } from './particles';
import { drawCreditsScene, CREDITS_W, CREDITS_H } from './credits';
import type { EnemyPose } from './pose';

/**
 * Catálogo de vistas previas: una sola fuente de verdad para "todo el arte".
 *
 * Lo consumen la ficha de información del juego y la galería de desarrollo, y lo
 * importante es que **cada vista previa dibuja con el código del juego**: los mismos
 * sprites, los mismos proyectiles salidos de `spawnProjectile`, el mismo fondo. Así
 * la ficha no puede mentir. La versión anterior describía el arsenal con iconos de
 * librería y texto escrito a mano, y por eso ya se había desincronizado tres veces
 * del juego real.
 */

export type PreviewGroupId =
  | 'characters'
  | 'enemies'
  | 'bosses'
  | 'weapons'
  | 'items'
  | 'terrain'
  | 'stages'
  | 'effects'
  | 'scenes'
  | 'materials';

export interface PreviewItem {
  /** Único en todo el catálogo: `enemy:bacteria`, `weapon:laser`… */
  id: string;
  /** Clave del sujeto, sin el prefijo del grupo. Sirve para cruzar con i18n. */
  key: string;
  w: number;
  h: number;
  /** `t` en segundos, para las poses y el bamboleo. Dibuja en el origen. */
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
}

export interface PreviewGroup {
  id: PreviewGroupId;
  items: PreviewItem[];
}

/** Cada cuánto cambia de pose el ciclo de las vistas previas. */
const POSE_SECONDS = 0.9;

const ENEMY_POSE_CYCLE: readonly EnemyPose[] = ['idle', 'walk', 'attack', 'hurt'];

const cyclePose = <T,>(poses: readonly T[], t: number): T =>
  poses[Math.floor(Math.max(0, t) / POSE_SECONDS) % poses.length];

// --- Personajes ------------------------------------------------------------

const characterItems = (): PreviewItem[] =>
  (Object.keys(CHARACTER_PROFILES) as CharacterType[]).map((character) => ({
    id: `character:${character}`,
    key: character,
    w: 32,
    h: 32,
    draw: (ctx, t) => {
      const pose = cyclePose(['idle', 'walk', 'jump', 'hurt'] as const, t);
      drawSprite(ctx, playerSpriteId(character, pose), playerSprite(character, pose), 0, 0);
    },
  }));

// --- Enemigos --------------------------------------------------------------

const enemyItems = (): PreviewItem[] =>
  ENEMY_SPAWN_TABLE.filter((entry) => hasEnemySprite(entry.subType)).map((entry) => {
    const def = enemySprite(entry.subType as Parameters<typeof enemySprite>[0], 'idle');
    return {
      id: `enemy:${entry.subType}`,
      key: entry.subType,
      w: def.w,
      h: def.h,
      draw: (ctx, t) => {
        const pose = cyclePose(ENEMY_POSE_CYCLE, t);
        drawSprite(
          ctx,
          enemySpriteId(entry.subType, pose),
          enemySprite(entry.subType as Parameters<typeof enemySprite>[0], pose),
          0,
          0
        );
      },
    };
  });

// --- Jefes -----------------------------------------------------------------

/** Estado que mejor muestra a cada jefe atacando. */
const BOSS_ATTACK_STATE: Record<string, number> = {
  king: 4,
  phantom: 0,
  tank: 1,
  general: 6,
  deity: 1,
  wisdom_warden: 0,
};

const bossItems = (): PreviewItem[] =>
  [...STAGE_BOSSES, HIDDEN_BOSS].map((boss) => ({
    id: `boss:${boss.variant}`,
    key: boss.variant,
    w: boss.w,
    h: boss.h,
    draw: (ctx, t) => {
      // Alterna entre reposo y su ataque, para que se vea lo que cambia.
      const attacking = Math.floor(Math.max(0, t) / (POSE_SECONDS * 2)) % 2 === 1;
      const state = attacking ? (BOSS_ATTACK_STATE[boss.variant] ?? 0) : 0;
      const phase = boss.variant === 'deity' && attacking ? 2 : 1;
      drawSprite(
        ctx,
        bossSpriteId(boss.variant, state, phase),
        bossSprite(boss.variant, state, phase),
        0,
        0
      );
    },
  }));

// --- Armas -----------------------------------------------------------------

export const WEAPON_TYPES: readonly WeaponType[] = [
  'normal',
  'spread',
  'laser',
  'mouthwash',
  'floss',
  'toothbrush',
];

const WEAPON_PREVIEW_W = 140;
const WEAPON_PREVIEW_H = 56;

/**
 * Arma en mano y su ráfaga real.
 *
 * Los proyectiles no se dibujan a mano: se piden a `spawnProjectile` con un jugador
 * de verdad al nivel indicado, así que lo que se ve en la ficha es exactamente lo
 * que sale del cañón en la partida, con su tamaño y su cantidad.
 */
const weaponItems = (): PreviewItem[] =>
  WEAPON_TYPES.map((weapon) => ({
    id: `weapon:${weapon}`,
    key: weapon,
    w: WEAPON_PREVIEW_W,
    h: WEAPON_PREVIEW_H,
    draw: (ctx, t) => {
      const level = Math.floor(Math.max(0, t) / (POSE_SECONDS * 2)) % 2 === 0 ? 1 : MAX_LEVEL;
      const player = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
      player.weapon = weapon;
      player.weaponLevel = level;
      player.x = 4;
      player.y = 12;
      player.facing = 1;

      drawHeldWeapon(ctx, player, {
        usingMouse: false,
        aimUp: false,
        mouseX: 0,
        mouseY: 0,
        cameraX: 0,
        cameraY: 0,
      });

      const shots: Projectile[] = [];
      spawnProjectile(shots, 48, WEAPON_PREVIEW_H / 2, 1, 0, 'player', weapon, player);
      // El hilo y el cepillo se dibujan pegados al jugador, así que se recolocan
      // para que quepan en la ficha sin taparlo.
      shots.forEach((shot) => {
        shot.x = Math.min(shot.x, WEAPON_PREVIEW_W - shot.w - 2);
        shot.y = Math.max(2, Math.min(shot.y, WEAPON_PREVIEW_H - shot.h - 2));
      });
      drawProjectiles(ctx, shots);
    },
  }));

// --- Objetos ---------------------------------------------------------------

const ITEM_KEYS = ['health', ...WEAPON_TYPES] as const;

const itemItems = (): PreviewItem[] =>
  ITEM_KEYS.map((key) => ({
    id: `item:${key}`,
    key,
    w: 24,
    h: 30,
    draw: (ctx, t) => {
      const pu: PowerUp = {
        id: `preview:${key}`,
        x: 0,
        y: 0,
        w: 24,
        h: 24,
        vx: 0,
        vy: 0,
        hp: 0,
        maxHp: 0,
        type: 'powerup',
        subType: key,
        color: '#fff',
        facing: 1,
        isGrounded: false,
        frameTimer: 0,
        state: 0,
      };
      drawPowerUp(ctx, pu, t);
    },
  }));

// --- Terreno ---------------------------------------------------------------

const terrainItems = (): PreviewItem[] => [
  {
    id: 'terrain:tongue',
    key: 'tongue',
    w: 96,
    h: 64,
    draw: (ctx) => {
      drawPlatforms(ctx, [{ x: 0, y: 0, w: 96, h: 60, type: 'platform', isGround: true }]);
    },
  },
  {
    id: 'terrain:braces',
    key: 'braces',
    w: 96,
    h: 24,
    draw: (ctx) => {
      drawPlatforms(ctx, [{ x: 0, y: 2, w: 96, h: 20, type: 'platform', isGround: false }]);
    },
  },
];

// --- Fondos ----------------------------------------------------------------

const STAGE_PREVIEW_W = 200;
const STAGE_PREVIEW_H = 112;

/**
 * Recorte 1:1 del fondo real de cada fase.
 *
 * Se recorta en lugar de escalar: reducir pixel art a la mitad se come las líneas
 * de un píxel —justo los contornos— y deja de parecerse a lo que se ve jugando.
 */
const stageItems = (): PreviewItem[] =>
  STAGE_PALETTES.map((palette, index) => ({
    id: `stage:${index + 1}`,
    key: palette.id,
    w: STAGE_PREVIEW_W,
    h: STAGE_PREVIEW_H,
    draw: (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, STAGE_PREVIEW_W, STAGE_PREVIEW_H);
      ctx.clip();
      ctx.translate(-(CANVAS_WIDTH - STAGE_PREVIEW_W) / 2, -(CANVAS_HEIGHT - STAGE_PREVIEW_H) / 2 - 30);
      drawBackground(ctx, 0, index + 1);
      ctx.restore();
    },
  }));

// --- Efectos ---------------------------------------------------------------

/** Chispas deterministas: la misma vista previa en cada visita. */
const SPARK_SEEDS = [
  [6, 8],
  [14, 4],
  [22, 12],
  [30, 6],
  [10, 18],
  [26, 20],
  [18, 24],
  [34, 16],
] as const;

const effectItems = (): PreviewItem[] => [
  {
    id: 'effect:sparks',
    key: 'sparks',
    w: 44,
    h: 32,
    draw: (ctx, t) => {
      const spread = 1 + (Math.max(0, t) % 1);
      drawParticles(
        ctx,
        SPARK_SEEDS.map(([x, y], i) => ({
          id: `spark:${i}`,
          x: 22 + (x - 20) * spread,
          y: 16 + (y - 14) * spread,
          w: 4,
          h: 4,
          vx: 0,
          vy: 0,
          hp: 0,
          maxHp: 0,
          type: 'particle' as const,
          lifeTime: 1,
          alpha: 1 - (Math.max(0, t) % 1) * 0.6,
          color: i % 2 === 0 ? tone('enamel.hi') : tone('warden.light'),
          facing: 1 as const,
          isGrounded: false,
          frameTimer: 0,
          state: 0,
        }))
      );
    },
  },
  {
    id: 'effect:shield',
    key: 'shield',
    w: 40,
    h: 40,
    draw: (ctx, t) => {
      const player = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'premolar' });
      player.x = 4;
      player.y = 4;
      player.animTimer = t;
      // El escudo se dibuja con el jugador, así que se muestra el conjunto.
      drawSprite(ctx, playerSpriteId('premolar', 'idle'), playerSprite('premolar', 'idle'), 4, 4);
      shieldRing(ctx, 4, 4, 32, 32, t);
    },
  },
];

/** Anillo de escudo, el mismo trazo que usa `render/player.ts`. */
const shieldRing = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number
) => {
  const shell = Math.floor(t * 6) % 2 === 0 ? 'laser.mid' : 'laser.light';
  px(ctx, x - 3, y + 4, 1, h - 8, shell);
  px(ctx, x + w + 2, y + 4, 1, h - 8, shell);
  px(ctx, x + 4, y - 2, w - 8, 1, shell);
  px(ctx, x + 4, y + h + 1, w - 8, 1, shell);
};

// --- Escenas ---------------------------------------------------------------

/** Ilustraciones completas: por ahora, la pantalla de victoria. */
const sceneItems = (): PreviewItem[] => [
  {
    id: 'scene:credits',
    key: 'credits',
    w: CREDITS_W,
    h: CREDITS_H,
    draw: (ctx, t) => drawCreditsScene(ctx, t),
  },
];

// --- Materiales ------------------------------------------------------------

const RAMP_TONES: readonly Tone[] = ['out', 'shade', 'dark', 'mid', 'light', 'hi'];
const SWATCH = 14;

const materialItems = (): PreviewItem[] =>
  (Object.keys(RAMPS) as Material[]).map((material) => ({
    id: `material:${material}`,
    key: material,
    w: RAMP_TONES.length * SWATCH,
    h: SWATCH,
    draw: (ctx) => {
      RAMP_TONES.forEach((t, i) => {
        px(ctx, i * SWATCH, 0, SWATCH, SWATCH, `${material}.${t}`);
      });
    },
  }));

// --- Catálogo --------------------------------------------------------------

let cached: PreviewGroup[] | null = null;

export const previewGroups = (): PreviewGroup[] => {
  if (cached) return cached;
  cached = [
    { id: 'characters', items: characterItems() },
    { id: 'enemies', items: enemyItems() },
    { id: 'bosses', items: bossItems() },
    { id: 'weapons', items: weaponItems() },
    { id: 'items', items: itemItems() },
    { id: 'terrain', items: terrainItems() },
    { id: 'stages', items: stageItems() },
    { id: 'effects', items: effectItems() },
    { id: 'scenes', items: sceneItems() },
    { id: 'materials', items: materialItems() },
  ];
  return cached;
};

export const previewGroup = (id: PreviewGroupId): PreviewGroup =>
  previewGroups().find((group) => group.id === id) ?? { id, items: [] };

/** Una vista previa concreta, para las fichas que muestran su propio sujeto. */
export const previewItem = (id: string): PreviewItem | undefined =>
  previewGroups()
    .flatMap((group) => group.items)
    .find((item) => item.id === id);
