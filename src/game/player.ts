import type { Player, WeaponType, LoadoutType, Difficulty, CharacterType, Platform } from '../types';
import {
  PLAYER_SIZE,
  PLAYER_MAX_JUMPS,
  SCORE_MILESTONE_START,
  KILL_MILESTONE_START,
  KILL_MILESTONE_INCREMENT_START,
  PIT_FALL_DAMAGE,
  RESPAWN_INVULNERABILITY,
} from './data/physics';
import { COLORS } from './data/palette';
import { getDifficulty } from './data/difficulty';
import { getCharacter } from './data/characters';
import { findRespawn } from './level';

/** Lo que el jugador elige en el menú antes de empezar una partida. */
export interface RunConfig {
  loadout: LoadoutType;
  difficulty: Difficulty;
  character: CharacterType;
}

export const createPlayer = ({ loadout, difficulty, character }: RunConfig): Player => {
  const startingWeapon: WeaponType = loadout === 'all' ? 'normal' : loadout;
  const config = getDifficulty(difficulty);
  const profile = getCharacter(character);
  const initialMaxHp = Math.round(100 * config.hpMult * profile.hpMult);

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
    shield: profile.startingShield,
    maxShield: profile.startingShield,
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
      speedMultiplier: profile.speedMult,
      damageMultiplier: config.dmgDealt * profile.damageMult,
      dashCooldownMultiplier: profile.dashCooldownMult,
      maxDashes: 1,
      damageReduction: profile.damageReduction,
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

/**
 * Caerse del escenario.
 *
 * Antes esto era `p.hp = 0` y nada más, lo que dejaba la partida colgada si el
 * jugador tenía una vida extra: con vidas > 0 el bucle no da game over, y el
 * único sitio que gastaba una vida estaba dentro de la rama de "me han dado".
 * El jugador caía indefinidamente con 0 de vida.
 *
 * Ahora la caída reposiciona en suelo firme y cobra `PIT_FALL_DAMAGE`. Solo
 * mata si ese daño lo mata, y en ese caso gasta una vida si queda alguna.
 *
 * Muta el jugador. Devuelve `true` si sigue en pie.
 */
export const fallIntoPit = (player: Player, platforms: Platform[]): boolean => {
  const spot = findRespawn(platforms, player.x, player.h);

  player.x = spot.x;
  player.y = spot.y;
  player.vx = 0;
  player.vy = 0;
  player.isGrounded = true;
  player.jumpCount = 0;
  player.dashTimer = 0;
  player.slowTimer = 0;

  player.hp -= PIT_FALL_DAMAGE;

  if (player.hp <= 0) {
    if (player.lives <= 0) {
      player.hp = 0;
      return false;
    }
    player.lives--;
    player.hp = player.maxHp;
  }

  player.invincibleTimer = RESPAWN_INVULNERABILITY;
  return true;
};
