import type { Material } from './palette';

/**
 * Paleta de cada fase.
 *
 * Ya no son colores sueltos: cada fase elige **qué rampa** usa para cada material
 * del escenario. Así una fase entera se retinta cambiando tres nombres, y el
 * sombreado sigue funcionando igual porque toda rampa tiene los mismos seis tonos.
 *
 * La progresión cuenta una historia clínica: de una boca sana a la podredumbre.
 */
export interface StagePalette {
  /** Solo descriptivo, para depurar y para la Base de Datos del menú. */
  id: 'healthy' | 'gingivitis' | 'tartar' | 'deep_infection' | 'void';
  /** Rampa del fondo: la garganta y la carne. */
  ramp: Material;
  /** Rampa de las encías de primer plano. */
  gumRamp: Material;
  /** Rampa de los molares del fondo. */
  toothRamp: Material;
}

export const STAGE_PALETTES: readonly StagePalette[] = [
  /** Boca sana: encía rosa, dientes limpios. */
  { id: 'healthy', ramp: 'gum', gumRamp: 'gum', toothRamp: 'enamel' },
  /** Gingivitis: la encía se inflama y enrojece. */
  { id: 'gingivitis', ramp: 'grunt', gumRamp: 'candy', toothRamp: 'enamel' },
  /** Sarro: todo se vuelve pardo y los dientes amarillean. */
  { id: 'tartar', ramp: 'plaque', gumRamp: 'gum', toothRamp: 'plaque' },
  /** Infección profunda: la carne va al magenta y la encía a la sangre seca. */
  { id: 'deep_infection', ramp: 'fiend', gumRamp: 'grunt', toothRamp: 'enamel' },
  /** El Vacío: ya no queda boca, solo piedra y oscuridad. */
  { id: 'void', ramp: 'void', gumRamp: 'void', toothRamp: 'stone' },
];

/** Cualquier fase fuera de rango usa El Vacío, igual que hacía el `else`. */
export const getStagePalette = (stage: number): StagePalette =>
  STAGE_PALETTES[stage - 1] ?? STAGE_PALETTES[STAGE_PALETTES.length - 1];
