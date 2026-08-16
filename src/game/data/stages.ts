/**
 * Paleta de cada fase. Estaba dentro de la cadena de `if (stage === n)` de
 * `drawBackground`, mezclada con el código de dibujo.
 */
export interface StagePalette {
  /** Solo descriptivo, para depurar y para la Base de Datos del menú. */
  id: 'healthy' | 'gingivitis' | 'tartar' | 'deep_infection' | 'void';
  /** Degradado radial de la garganta, del centro al borde. */
  throatInner: string;
  throatOuter: string;
  /** Color intermedio del halo de la lámpara del dentista. */
  light: string;
  /** Degradado de las muelas de fondo. */
  toothTop: string;
  toothBottom: string;
  gum: string;
}

const DEFAULT_TOOTH_TOP = '#94a3b8';
const DEFAULT_TOOTH_BOTTOM = '#e2e8f0';
const DEFAULT_GUM = '#9f1239';
const PINK_LIGHT = '#f472b6';
const PURPLE_LIGHT = '#4c1d95';

export const STAGE_PALETTES: readonly StagePalette[] = [
  {
    id: 'healthy',
    throatInner: '#580505',
    throatOuter: '#250202',
    light: PINK_LIGHT,
    toothTop: DEFAULT_TOOTH_TOP,
    toothBottom: DEFAULT_TOOTH_BOTTOM,
    gum: DEFAULT_GUM,
  },
  {
    id: 'gingivitis',
    throatInner: '#991b1b',
    throatOuter: '#450a0a',
    light: PINK_LIGHT,
    toothTop: DEFAULT_TOOTH_TOP,
    toothBottom: DEFAULT_TOOTH_BOTTOM,
    // Encías inflamadas: rojo más vivo.
    gum: '#dc2626',
  },
  {
    id: 'tartar',
    throatInner: '#713f12',
    throatOuter: '#422006',
    light: PINK_LIGHT,
    // Sarro amarillento.
    toothTop: '#b45309',
    toothBottom: '#fcd34d',
    gum: DEFAULT_GUM,
  },
  {
    id: 'deep_infection',
    throatInner: '#4c0519',
    throatOuter: '#1e1b4b',
    light: PURPLE_LIGHT,
    toothTop: DEFAULT_TOOTH_TOP,
    toothBottom: DEFAULT_TOOTH_BOTTOM,
    gum: DEFAULT_GUM,
  },
  {
    id: 'void',
    throatInner: '#0f172a',
    throatOuter: '#020617',
    light: PURPLE_LIGHT,
    toothTop: DEFAULT_TOOTH_TOP,
    toothBottom: DEFAULT_TOOTH_BOTTOM,
    gum: DEFAULT_GUM,
  },
];

/** Cualquier stage fuera de rango usa El Vacío, igual que hacía el `else`. */
export const getStagePalette = (stage: number): StagePalette =>
  STAGE_PALETTES[stage - 1] ?? STAGE_PALETTES[STAGE_PALETTES.length - 1];
