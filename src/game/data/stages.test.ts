import { describe, it, expect } from 'vitest';
import { RAMPS } from './palette';
import {
  STAGE_PALETTES,
  STAGE_SCENES,
  getStagePalette,
  getStageScene,
  type Decay,
  type StageScene,
} from './stages';

const DECAY_KEYS: readonly (keyof Decay)[] = [
  'plaque',
  'tartar',
  'cavities',
  'stain',
  'inflammation',
];

const RAMP_FIELDS: readonly (keyof StageScene)[] = ['ramp', 'gumRamp', 'toothRamp', 'cheekRamp'];

/**
 * La fase pasó de ser tres nombres de color a describir una escena entera, y de
 * este descriptor cuelga todo el fondo. Un valor mal puesto aquí no rompe nada
 * —sale un fondo raro—, así que hacen falta tests.
 */
describe('escenas de fase', () => {
  it('hay cinco, con los ids de siempre y sin repetir', () => {
    expect(STAGE_SCENES).toHaveLength(5);
    expect(STAGE_SCENES.map((s) => s.id)).toEqual([
      'healthy',
      'gingivitis',
      'tartar',
      'deep_infection',
      'void',
    ]);
  });

  it('cada fase es una zona distinta de la boca', () => {
    // Es la mitad de la respuesta a "poco variado": si dos fases comparten zona,
    // vuelven a ser la misma imagen.
    const zonas = STAGE_SCENES.map((s) => s.zone);
    expect(new Set(zonas).size).toBe(STAGE_SCENES.length);
  });

  it('cada fase trae un instrumento distinto', () => {
    const instrumentos = STAGE_SCENES.map((s) => s.instrument);
    expect(new Set(instrumentos).size).toBe(STAGE_SCENES.length);
  });

  it('todas las rampas que citan existen en la paleta', () => {
    for (const scene of STAGE_SCENES) {
      for (const field of RAMP_FIELDS) {
        expect(RAMPS, `${scene.id}.${String(field)}`).toHaveProperty(scene[field] as string);
      }
    }
  });

  it('el deterioro está entre 0 y 1', () => {
    for (const scene of STAGE_SCENES) {
      for (const key of DECAY_KEYS) {
        const v = scene.decay[key];
        expect(v, `${scene.id}.${key}`).toBeGreaterThanOrEqual(0);
        expect(v, `${scene.id}.${key}`).toBeLessThanOrEqual(1);
      }
      for (const key of ['saliva', 'steam', 'gaps'] as const) {
        expect(scene[key], `${scene.id}.${key}`).toBeGreaterThanOrEqual(0);
        expect(scene[key], `${scene.id}.${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('el deterioro nunca retrocede de una fase a la siguiente', () => {
    // La otra mitad de la variedad es que se lea una progresión. Una fase más
    // avanzada con menos sarro que la anterior contaría la historia al revés.
    for (const key of DECAY_KEYS) {
      const serie = STAGE_SCENES.map((s) => s.decay[key]);
      for (let i = 1; i < serie.length; i++) {
        expect(serie[i], `${key}: fase ${i + 1} no puede mejorar respecto a la ${i}`).toBeGreaterThanOrEqual(
          serie[i - 1]
        );
      }
    }
    // Y de punta a punta tiene que haber recorrido de verdad.
    for (const key of DECAY_KEYS) {
      expect(STAGE_SCENES[4].decay[key] - STAGE_SCENES[0].decay[key], key).toBeGreaterThan(0.5);
    }
  });

  it('los huecos entre dientes también crecen', () => {
    const serie = STAGE_SCENES.map((s) => s.gaps);
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i]).toBeGreaterThanOrEqual(serie[i - 1]);
    }
  });

  it('la abertura de cada fase está dentro de rango', () => {
    for (const scene of STAGE_SCENES) {
      const o = scene.opening;
      expect(o.halfW, `${scene.id}.halfW`).toBeGreaterThan(0.1);
      expect(o.halfW, `${scene.id}.halfW`).toBeLessThanOrEqual(0.5);
      expect(o.halfH, `${scene.id}.halfH`).toBeGreaterThan(20);
      expect(o.taper, `${scene.id}.taper`).toBeGreaterThanOrEqual(0);
      expect(o.taper, `${scene.id}.taper`).toBeLessThanOrEqual(1);
    }
  });

  it('cada fase ve algo distinto por la abertura', () => {
    // Es lo que más diferencia unas de otras: en unas se asoma el dentista, en otras
    // solo el foco. Si dos fases coincidieran, volverían a parecerse.
    const vistas = STAGE_SCENES.map((s) => s.throughOpening);
    expect(new Set(vistas).size).toBeGreaterThanOrEqual(3);
  });

  it('ninguna fase se queda sin capas ni repite una', () => {
    for (const scene of STAGE_SCENES) {
      expect(scene.layers.length, scene.id).toBeGreaterThan(2);
      expect(new Set(scene.layers).size, `${scene.id} repite capa`).toBe(scene.layers.length);
    }
  });

  it('el quirófano no lleva carne: ni encías ni saliva', () => {
    const clinic = STAGE_SCENES[4];
    expect(clinic.layers).not.toContain('gums');
    expect(clinic.saliva).toBe(0);
  });
});

describe('acceso a la fase', () => {
  it('getStageScene indexa desde 1', () => {
    expect(getStageScene(1).id).toBe('healthy');
    expect(getStageScene(5).id).toBe('void');
  });

  it('fuera de rango cae en la última, como hacía el else', () => {
    for (const stage of [0, -3, 6, 99, NaN]) {
      expect(getStageScene(stage).id, `fase ${stage}`).toBe('void');
    }
  });

  it('la vista de paleta sigue coincidiendo con la escena', () => {
    // Se conserva para los consumidores a los que solo les interesa el tinte; si
    // se desincronizara, la Base de Datos del menú mentiría.
    expect(STAGE_PALETTES).toHaveLength(STAGE_SCENES.length);
    STAGE_SCENES.forEach((scene, i) => {
      expect(STAGE_PALETTES[i]).toEqual({
        id: scene.id,
        ramp: scene.ramp,
        gumRamp: scene.gumRamp,
        toothRamp: scene.toothRamp,
      });
      expect(getStagePalette(i + 1)).toEqual(STAGE_PALETTES[i]);
    });
  });
});
