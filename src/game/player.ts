import type { Player, WeaponType, LoadoutType, Difficulty, CharacterType } from '../types';
import {
  PLAYER_SIZE,
  PLAYER_MAX_JUMPS,
  SCORE_MILESTONE_START,
  KILL_MILESTONE_START,
  KILL_MILESTONE_INCREMENT_START,
} from './data/physics';
import { COLORS } from './data/palette';
import { getDifficulty } from './data/difficulty';

/** Lo que el jugador elige en el menú antes de empezar una partida. */
export interface RunConfig {
  loadout: LoadoutType;
  difficulty: Difficulty;
  character: CharacterType;
}

export const createPlayer = ({ loadout, difficulty, character }: RunConfig): Player => {
  const startingWeapon: WeaponType = loadout === 'all' ? 'normal' : loadout;
  const config = getDifficulty(difficulty);
  const initialMaxHp = 100 * config.hpMult;

  return {
    id: 'player',
    x: 100,
    y: 200,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    hp: initialMaxHp,
    maxHp: initialMaxHp,
    type: 'player',
    color: COLORS.player,
    facing: 1,
    isGrounded: false,
    character,
    invincibleTimer: 0,
    slowTimer: 0,
    shield: 0,
    maxShield: 0,
    shieldRegenTimer: 0,
    lives: 0,
    weapon: startingWeapon,
    weaponLevel: 1,
    weaponLevels: { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1 },
    ammo: -1,
    score: 0,
    frameTimer: 0,
    state: 0,
    jumpCount: 0,
    maxJumps: PLAYER_MAX_JUMPS,
    dashTimer: 0,
    dashCooldown: 0,
    consecutiveDashes: 1,
    stats: {
      speedMultiplier: 1,
      damageMultiplier: config.dmgDealt,
      dashCooldownMultiplier: 1,
      maxDashes: 1,
      damageReduction: 0,
      damageTakenMultiplier: config.dmgTaken,
    },
    runStats: {
      killCount: 0,
      nextScoreMilestone: SCORE_MILESTONE_START * config.milestoneMult,
      nextKillMilestone: KILL_MILESTONE_START * config.milestoneMult,
      currentKillStep: KILL_MILESTONE_INCREMENT_START,
    },
  };
};
