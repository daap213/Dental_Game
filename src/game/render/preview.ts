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
import {
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  PLAYER_POSES,
  armPlacement,
  armSprite,
  armSpriteId,
  playerSprite,
  playerSpriteId,
} from './sprites/player';
import { BODY_H, BODY_W } from './sprites/masks/player';
import { enemySprite, enemySpriteId, hasEnemySprite } from './sprites/enemies';
import { bossSprite, bossSpriteId } from './bosses';
import { drawProjectiles, drawHeldWeapon, drawPowerUp } from './weapons';
import { drawBackground } from './background';
import { drawPlatforms } from './level';
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

/**
 * El ciclo de poses de la ficha va más rápido que el de los enemigos, porque el jugador
 * tiene ocho y a 0,9 s por pose la tarjeta tardaba siete segundos en dar la vuelta.
 */
const PLAYER_POSE_SECONDS = 0.45;

const characterItems = (): PreviewItem[] =>
  (Object.keys(CHARACTER_PROFILES) as CharacterType[]).map((character) => ({
    id: `character:${character}`,
    key: character,
    // El tamaño sale del propio sprite, no de la caja de colisión: el dibujo es mayor.
    w: BODY_W + 6,
    h: BODY_H,
    draw: (ctx, t) => {
      const pose =
        PLAYER_POSES[Math.floor(Math.max(0, t) / PLAYER_POSE_SECONDS) % PLAYER_POSES.length];
      // Se compensan los desplazamientos de anclaje: `drawSprite` los aplica, y en una
      // tarjeta que empieza en el origen dejarían la corona cortada por arriba.
      drawSprite(
        ctx,
        playerSpriteId(character, pose),
        playerSprite(character, pose),
        -BODY_OFFSET_X,
        -BODY_OFFSET_Y
      );
      // Y el brazo, que va aparte del cuerpo pero es parte del personaje: sin él la ficha
      // mostraría algo distinto de lo que se ve en partida.
      const arm = armPlacement(character, 'side');
      drawSprite(ctx, armSpriteId('side'), armSprite('side'), arm.x - BODY_OFFSET_X, arm.y - BODY_OFFSET_Y);
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

      // El puño sale del propio dibujo del brazo, igual que en partida: así la ficha no
      // puede quedarse mostrando el arma en un sitio donde ya no está la mano.
      const hand = armPlacement(player.character, 'side');
      drawHeldWeapon(
        ctx,
        player,
        { usingMouse: false, aimUp: false, mouseX: 0, mouseY: 0, cameraX: 0, cameraY: 0 },
        { x: player.x + hand.handX, y: player.y + hand.handY }
      );

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


/**
 * El fondo real de cada fase, entero y a 1:1.
 *
 * Antes era un recorte de 200×112 centrado en la abertura, y por eso solo se veía
 * el óvalo de luz: ni la arcada, ni el dentista, ni las encías. Como el contenido
 * ocupa todo el alto de la pantalla, cualquier recorte se lleva por delante justo
 * lo que distingue una fase de otra.
 *
 * Y a 1:1 en lugar de reducido, porque reducir pixel art se come las líneas de un
 * píxel —los contornos— y deja de parecerse a lo que se ve jugando. Es el mismo
 * criterio que la escena de créditos, que también se enseña a tamaño completo.
 */
const stageItems = (): PreviewItem[] =>
  STAGE_PALETTES.map((palette, index) => ({
    id: `stage:${index + 1}`,
    key: palette.id,
    w: CANVAS_WIDTH,
    h: CANVAS_HEIGHT,
    draw: (ctx, t) => drawBackground(ctx, 0, index + 1, t),
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
    w: BODY_W + 10,
    h: BODY_H + 10,
    draw: (ctx, t) => {
      const player = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'premolar' });
      player.x = 4;
      player.y = 4;
      player.animTimer = t;
      // El escudo se dibuja con el jugador, así que se muestra el conjunto. Ciñe el
      // **dibujo**, no la caja: sobre la caja la corona asomaba fuera de la barrera.
      drawSprite(
        ctx,
        playerSpriteId('premolar', 'idle'),
        playerSprite('premolar', 'idle'),
        5 - BODY_OFFSET_X,
        5 - BODY_OFFSET_Y
      );
      shieldRing(ctx, 5, 5, BODY_W, BODY_H, t);
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
