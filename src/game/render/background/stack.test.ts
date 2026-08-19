import { describe, it, expect } from 'vitest';
import { STAGE_SCENES, getStageScene, type LayerId } from '../../data/stages';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import { LAYERS, layerById, layersFor, worldLayers } from './index';

/**
 * La pila del fondo declara la profundidad. Si el orden o el parallax se
 * desordenan, el fallo no es un error: es un fondo con la garganta por delante de
 * las encías, que en revisión se cuela.
 */
describe('pila de capas del fondo', () => {
  it('hay capas registradas y sus ids no se repiten', () => {
    expect(LAYERS.length).toBeGreaterThan(0);
    const ids = LAYERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('las capas de la escena van ordenadas por parallax', () => {
    // Es *el* invariante de la capa de fondo. El orden de dibujado es el de la
    // pila, así que si un parallax se sale de orden la profundidad se invierte.
    //
    // Solo rige para las capas `world`: las `screen` enmarcan la escena y no
    // están dentro de ella, así que van delante de todo con parallax 0.
    const mundo = worldLayers(LAYERS);
    const factores = mundo.map((l) => l.parallax);
    for (let i = 1; i < factores.length; i++) {
      expect(
        factores[i],
        `${mundo[i].id} (${factores[i]}) va después de ${mundo[i - 1].id} (${factores[i - 1]}) pero se mueve menos`
      ).toBeGreaterThanOrEqual(factores[i - 1]);
    }
  });

  it('una capa clavada a la pantalla no se desplaza', () => {
    for (const layer of LAYERS) {
      if ((layer.anchor ?? 'world') === 'screen') {
        expect(layer.parallax, `${layer.id} está clavada y aun así se mueve`).toBe(0);
      }
    }
  });

  it('el parallax está entre 0 y 1', () => {
    for (const layer of LAYERS) {
      expect(layer.parallax, layer.id).toBeGreaterThanOrEqual(0);
      expect(layer.parallax, layer.id).toBeLessThanOrEqual(1);
    }
  });

  it('toda capa que una fase pide existe en la pila', () => {
    // Sin esto, un id mal escrito en `stages.ts` se traduce en una capa que
    // simplemente no se dibuja, sin ruido.
    for (const scene of STAGE_SCENES) {
      for (const id of scene.layers) {
        expect(layerById(id), `${scene.id} pide "${id}" y no está en la pila`).toBeDefined();
      }
    }
  });

  it('cada fase lista sus capas en el orden de la pila, para que el dato se lea honesto', () => {
    // El orden de dibujado sale de la pila, así que esto no puede romper nada:
    // es para que `stages.ts` no engañe a quien lo lea.
    const rank = new Map<LayerId, number>(LAYERS.map((l, i) => [l.id, i]));
    for (const scene of STAGE_SCENES) {
      const posiciones = scene.layers.map((id) => rank.get(id) ?? -1);
      const ordenadas = [...posiciones].sort((a, b) => a - b);
      expect(posiciones, `${scene.id} lista las capas desordenadas`).toEqual(ordenadas);
    }
  });

  it('layersFor devuelve solo lo pedido, y en orden de pila', () => {
    for (const scene of STAGE_SCENES) {
      const capas = layersFor(scene);
      expect(capas.map((l) => l.id).sort()).toEqual([...scene.layers].sort());
      const factores = worldLayers(capas).map((l) => l.parallax);
      expect(factores).toEqual([...factores].sort((a, b) => a - b));
    }
  });

  it('layersFor ignora una capa que la fase no pide', () => {
    const soloGarganta = { ...getStageScene(1), layers: ['throat'] as LayerId[] };
    expect(layersFor(soloGarganta).map((l) => l.id)).toEqual(['throat']);
  });
});

describe('colocación de las capas', () => {
  it('ninguna capa se coloca fuera de la pantalla ni con tamaño nulo', () => {
    for (const scene of STAGE_SCENES) {
      for (const layer of layersFor(scene)) {
        // `layout` no debe necesitar el horneado para dar medidas coherentes; se
        // le pasa un lienzo falso para no depender de un canvas real en el test.
        const box = layer.layout(scene, { width: 1, height: 1 } as HTMLCanvasElement);
        expect(box.w, `${scene.id}/${layer.id}.w`).toBeGreaterThan(0);
        expect(box.h, `${scene.id}/${layer.id}.h`).toBeGreaterThan(0);
        expect(box.y, `${scene.id}/${layer.id}.y`).toBeGreaterThanOrEqual(-CANVAS_HEIGHT);
        expect(box.y, `${scene.id}/${layer.id}.y`).toBeLessThan(CANVAS_HEIGHT);
        if (box.tile !== undefined) {
          expect(box.tile, `${scene.id}/${layer.id}.tile`).toBeGreaterThan(0);
          expect(box.tile, `${scene.id}/${layer.id}.tile`).toBeLessThanOrEqual(CANVAS_WIDTH);
        }
      }
    }
  });

  it('el marco de la boca va clavado a la pantalla y la cubre entera', () => {
    // Tiene que tapar con carne opaca todo lo que queda fuera de la abertura: es lo
    // que permite que la clínica se hornee a pantalla completa sin recortarla.
    const mouth = layerById('mouth');
    expect(mouth).toBeDefined();
    expect(mouth?.anchor).toBe('screen');
    const box = mouth?.layout(getStageScene(1), { width: 1, height: 1 } as HTMLCanvasElement);
    expect(box?.w).toBe(CANVAS_WIDTH);
    expect(box?.h).toBe(CANVAS_HEIGHT);
    expect(box?.y).toBe(0);
  });

  it('la clínica se ve por detrás del marco, no por delante', () => {
    // Si se registrara después, taparía la dentadura y la boca dejaría de enmarcar.
    const ids = LAYERS.map((l) => l.id);
    expect(ids.indexOf('clinic')).toBeLessThan(ids.indexOf('mouth'));
  });
});
