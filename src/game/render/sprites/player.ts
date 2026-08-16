import type { CharacterType } from '../../../types';
import type { PlayerPose } from '../pose';
import type { SpriteDef } from './format';
import { shadeMask, unionMasks, withDetails } from './shade';
import {
  CROWN_MOLAR,
  CROWN_INCISOR,
  CROWN_CANINE,
  CROWN_PREMOLAR,
  BODY_IDLE,
  BODY_WALK,
  BODY_JUMP,
  FACE_IDLE,
  FACE_HURT,
} from './masks/player';

/**
 * Sprites del jugador: 4 clases × 4 poses.
 *
 * No hay 16 dibujos: hay 4 coronas y 3 cuerpos, y las 16 combinaciones salen de
 * unirlos. Además de ahorrar trabajo, garantiza que las cuatro clases se muevan
 * exactamente igual y solo se distingan por lo que las distingue de verdad, que
 * es la forma del diente.
 */

const CROWNS: Record<CharacterType, readonly string[]> = {
  molar: CROWN_MOLAR,
  incisor: CROWN_INCISOR,
  canine: CROWN_CANINE,
  premolar: CROWN_PREMOLAR,
};

const BODIES: Record<PlayerPose, readonly string[]> = {
  idle: BODY_IDLE,
  walk: BODY_WALK,
  jump: BODY_JUMP,
  // Al recibir el golpe el cuerpo no cambia: cambia la cara.
  hurt: BODY_IDLE,
};

/** Colores de la capa de detalle. La cinta y los ojos no son esmalte. */
const FACE_COLORS = {
  R: 'candy.mid',
  r: 'candy.dark',
  e: 'metal.out',
  W: 'enamel.light',
} as const;

const face = (pose: PlayerPose): SpriteDef => ({
  w: 32,
  h: 32,
  rows: pose === 'hurt' ? FACE_HURT : FACE_IDLE,
  map: FACE_COLORS,
});

const cache = new Map<string, SpriteDef>();

export const playerSpriteId = (character: CharacterType, pose: PlayerPose) =>
  `player:${character}:${pose}`;

export const playerSprite = (character: CharacterType, pose: PlayerPose): SpriteDef => {
  const id = playerSpriteId(character, pose);
  const hit = cache.get(id);
  if (hit) return hit;

  const silhouette = unionMasks(CROWNS[character] ?? CROWN_MOLAR, BODIES[pose] ?? BODY_IDLE);
  const def = withDetails(shadeMask(silhouette, 'enamel'), face(pose));

  cache.set(id, def);
  return def;
};

export const PLAYER_POSES: readonly PlayerPose[] = ['idle', 'walk', 'jump', 'hurt'];
export const PLAYER_CHARACTERS: readonly CharacterType[] = [
  'molar',
  'incisor',
  'canine',
  'premolar',
];
