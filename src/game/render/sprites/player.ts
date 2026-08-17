import type { CharacterType } from '../../../types';
import type { PlayerPose } from '../pose';
import type { PaletteKey } from '../../data/palette';
import type { SpriteDef } from './format';
import { shadeMask, unionMasks, withDetails } from './shade';
import {
  CROWN_MOLAR,
  CROWN_INCISOR,
  CROWN_CANINE,
  CROWN_PREMOLAR,
  TRUNK,
  FEET_IDLE,
  FEET_WALK,
  FEET_JUMP,
  FACE_IDLE,
  FACE_HURT,
} from './masks/player';

/**
 * Sprites del jugador: 4 clases × 4 poses.
 *
 * No hay 16 dibujos. Hay 4 coronas, un tronco y 3 juegos de pies, y las 16
 * combinaciones salen de unirlos antes de sombrear. Además de ahorrar trabajo,
 * garantiza que las cuatro clases se muevan igual y solo se distingan por lo que
 * las distingue de verdad: la forma del diente.
 */

const CROWNS: Record<CharacterType, readonly string[]> = {
  molar: CROWN_MOLAR,
  incisor: CROWN_INCISOR,
  canine: CROWN_CANINE,
  premolar: CROWN_PREMOLAR,
};

const FEET: Record<PlayerPose, readonly string[]> = {
  idle: FEET_IDLE,
  walk: FEET_WALK,
  jump: FEET_JUMP,
  // Al recibir el golpe los pies no cambian: cambia la cara.
  hurt: FEET_IDLE,
};

/**
 * Colores de la capa de detalle. Nada de esto es esmalte: la cinta es tela, los
 * ojos son oscuros con un destello metálico, y el surco de la corona es la sombra
 * más profunda del propio esmalte.
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

  const silhouette = unionMasks(
    CROWNS[character] ?? CROWN_MOLAR,
    TRUNK,
    FEET[pose] ?? FEET_IDLE
  );
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
