import type { CharacterType } from '../../../types';
import type { PlayerPose } from '../pose';
import { PLAYER_SIZE } from '../../data/physics';
import type { PaletteKey } from '../../data/palette';
import type { SpriteDef } from './format';
import { shadeMask, unionMasks, withDetails } from './shade';
import {
  ARMS,
  ARM_HAND,
  BODY_H,
  BODY_W,
  TOOTH_CANINE,
  TOOTH_INCISOR,
  TOOTH_MOLAR,
  TOOTH_PREMOLAR,
  armAt,
  detail,
  legs,
  type ArmPose,
  type EyeMood,
  type LegPhase,
  type ToothBuild,
} from './masks/player';

/**
 * Sprites del jugador: 4 clases × 8 poses de cuerpo, más 3 brazos compartidos.
 *
 * No hay 32 dibujos escritos a mano. Hay 4 coronas, un generador de piernas y cinco
 * miradas, y las combinaciones salen de unirlos **antes** de sombrear, que es lo que
 * hace que la luz cruce las costuras sin escalones.
 *
 * El dibujo mide `BODY_W × BODY_H` sobre una caja de `PLAYER_SIZE`, y se ancla por los
 * pies. Ese anclaje es la parte que se rompe en silencio si alguien cambia el tamaño sin
 * mirar: de ahí los dos invariantes que fija `player.test.ts`.
 */

const BUILDS: Record<CharacterType, ToothBuild> = {
  molar: TOOTH_MOLAR,
  incisor: TOOTH_INCISOR,
  canine: TOOTH_CANINE,
  premolar: TOOTH_PREMOLAR,
};

/** Qué hacen las piernas en cada pose. */
const LEG_PHASE: Record<PlayerPose, LegPhase> = {
  idle: 'stand',
  walk1: 'step-left',
  walk2: 'close',
  walk3: 'step-right',
  walk4: 'open',
  rise: 'tuck',
  fall: 'splay',
  // Al recibir el golpe las piernas no cambian: cambia la mirada.
  hurt: 'stand',
};

/** Qué mira en cada pose. Es el único canal expresivo que tiene el personaje. */
const EYE_MOOD: Record<PlayerPose, EyeMood> = {
  idle: 'idle',
  walk1: 'ahead',
  walk2: 'ahead',
  walk3: 'ahead',
  walk4: 'ahead',
  rise: 'up',
  fall: 'down',
  hurt: 'hurt',
};

/**
 * Colores de la capa de detalle. Nada de esto es esmalte: la cinta es tela, los ojos son
 * oscuros con un destello metálico, y el surco de la corona es la sombra más profunda del
 * propio esmalte.
 */
const FACE_COLORS: Record<string, PaletteKey> = {
  B: 'candy.mid',
  b: 'candy.shade',
  E: 'enamel.hi',
  P: 'metal.out',
  G: 'metal.hi',
  H: 'enamel.hi',
  F: 'enamel.shade',
};

/**
 * Los desplazamientos que anclan el dibujo a la caja.
 *
 * `offsetY` pone la última fila del dibujo en el suelo de la caja; `offsetX` lo centra.
 * Sin lo primero el personaje flota o se hunde; sin lo segundo, al girarse da un salto
 * lateral de un píxel.
 */
export const BODY_OFFSET_X = -(BODY_W - PLAYER_SIZE) / 2;
export const BODY_OFFSET_Y = PLAYER_SIZE - BODY_H;

const cache = new Map<string, SpriteDef>();

export const playerSpriteId = (character: CharacterType, pose: PlayerPose) =>
  `player:${character}:${pose}`;

export const playerSprite = (character: CharacterType, pose: PlayerPose): SpriteDef => {
  const id = playerSpriteId(character, pose);
  const hit = cache.get(id);
  if (hit) return hit;

  const build = BUILDS[character] ?? TOOTH_MOLAR;
  const silhouette = unionMasks(build.crown, legs(build.legs, LEG_PHASE[pose] ?? 'stand'));
  const eyes: SpriteDef = {
    w: BODY_W,
    h: BODY_H,
    rows: detail(EYE_MOOD[pose] ?? 'idle'),
    map: FACE_COLORS,
  };

  const def = withDetails(
    shadeMask(silhouette, 'enamel', { offsetX: BODY_OFFSET_X, offsetY: BODY_OFFSET_Y }),
    eyes
  );

  cache.set(id, def);
  return def;
};

// --- El brazo, aparte del cuerpo ---

const armCache = new Map<ArmPose, SpriteDef>();

export const armSpriteId = (pose: ArmPose) => `player:arm:${pose}`;

export const armSprite = (pose: ArmPose): SpriteDef => {
  const hit = armCache.get(pose);
  if (hit) return hit;
  const def = shadeMask(ARMS[pose], 'enamel');
  armCache.set(pose, def);
  return def;
};

/**
 * Dónde va el lienzo del brazo y dónde cae su puño, **en coordenadas de la caja**.
 *
 * Devuelve las dos cosas juntas a propósito: quien dibuja el brazo y quien cuelga el arma
 * tienen que estar de acuerdo, y con un solo origen no pueden desacoplarse.
 */
export const armPlacement = (character: CharacterType, pose: ArmPose) => {
  const build = BUILDS[character] ?? TOOTH_MOLAR;
  const at = armAt(build.body, pose);
  const hand = ARM_HAND[pose];
  return {
    x: at.x + BODY_OFFSET_X,
    y: at.y + BODY_OFFSET_Y,
    handX: at.x + BODY_OFFSET_X + hand.x,
    handY: at.y + BODY_OFFSET_Y + hand.y,
  };
};

export const PLAYER_POSES: readonly PlayerPose[] = [
  'idle',
  'walk1',
  'walk2',
  'walk3',
  'walk4',
  'rise',
  'fall',
  'hurt',
];
export const ARM_POSES: readonly ArmPose[] = ['side', 'up', 'recoil'];
export const PLAYER_CHARACTERS: readonly CharacterType[] = [
  'molar',
  'incisor',
  'canine',
  'premolar',
];
