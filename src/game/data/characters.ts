import type { CharacterType } from '../../types';

/**
 * Perfil de cada clase de diente.
 *
 * El menú siempre ofreció cuatro clases con nombre propio (THE GRINDER, THE
 * CUTTER…), pero `createPlayer` solo guardaba el valor para elegir el sprite:
 * las cuatro jugaban idénticas. Estos multiplicadores son lo que faltaba, y se
 * combinan con los de dificultad de `data/difficulty.ts`.
 *
 * Están pensados como intercambios, no como niveles de poder: cada clase gana
 * algo y paga por ello. Se ven en el HUD, que ya muestra DMG, SPD, DEF y el
 * escudo máximo.
 */
export interface CharacterProfile {
  /** Multiplicador de la vida máxima inicial. */
  hpMult: number;
  /** Multiplicador de la velocidad de movimiento. */
  speedMult: number;
  /** Multiplicador del daño hecho. */
  damageMult: number;
  /** Multiplicador del enfriamiento del dash (menor = más dashes). */
  dashCooldownMult: number;
  /** Reducción plana del daño recibido (0-1). */
  damageReduction: number;
  /** Escudo máximo con el que empieza, antes de cualquier perk. */
  startingShield: number;
}

export const CHARACTER_PROFILES: Record<CharacterType, CharacterProfile> = {
  /** El de la casa: aguanta y golpea igual, pero se mueve algo pesado. */
  molar: {
    hpMult: 1.15,
    speedMult: 0.92,
    damageMult: 1.0,
    dashCooldownMult: 1.0,
    damageReduction: 0.05,
    startingShield: 0,
  },
  /** Corta más que nadie y se rompe antes. */
  incisor: {
    hpMult: 0.85,
    speedMult: 1.0,
    damageMult: 1.15,
    dashCooldownMult: 1.0,
    damageReduction: 0,
    startingShield: 0,
  },
  /** Vive del dash y de llegar antes. */
  canine: {
    hpMult: 0.9,
    speedMult: 1.12,
    damageMult: 1.0,
    dashCooldownMult: 0.8,
    damageReduction: 0,
    startingShield: 0,
  },
  /** Empieza con barrera de pasta dental, que además regenera. */
  premolar: {
    hpMult: 1.0,
    speedMult: 1.0,
    damageMult: 1.0,
    dashCooldownMult: 1.0,
    damageReduction: 0,
    startingShield: 20,
  },
};

/** Tolera un valor inesperado cayendo al molar, igual que hace `getDifficulty`. */
export const getCharacter = (character: CharacterType): CharacterProfile =>
  CHARACTER_PROFILES[character] ?? CHARACTER_PROFILES.molar;

/**
 * Resumen legible del perfil, en las mismas unidades que el HUD. Lo usa el menú
 * para que la clase elegida diga qué hace sin necesidad de textos traducidos
 * nuevos.
 */
export const characterSummary = (character: CharacterType): string => {
  const p = getCharacter(character);
  const parts: string[] = [];
  if (p.hpMult !== 1) parts.push(`HP x${p.hpMult.toFixed(2)}`);
  if (p.damageMult !== 1) parts.push(`DMG x${p.damageMult.toFixed(2)}`);
  if (p.speedMult !== 1) parts.push(`SPD x${p.speedMult.toFixed(2)}`);
  if (p.dashCooldownMult !== 1) parts.push(`CD -${Math.round((1 - p.dashCooldownMult) * 100)}%`);
  if (p.damageReduction > 0) parts.push(`DEF +${Math.round(p.damageReduction * 100)}%`);
  if (p.startingShield > 0) parts.push(`SHLD ${p.startingShield}`);
  return parts.join(' · ');
};
