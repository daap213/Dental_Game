import { describe, expect, it } from 'vitest';
import { STAGE_SCENES } from '../../data/stages';
import { openingAt, toothSizeAt } from '../../data/opening';
import { LAYERS } from './index';
import { TOOLS, toolAxisY, toolTipX, toolsForStage, type ToolId } from './tools';

/**
 * Lo que se comprueba del instrumental es su **colocación**, no su dibujo.
 *
 * El catálogo se hornea, así que su aspecto se revisa en pantalla; lo que un test sí
 * puede atar es que cada pieza asome por donde se puede ver y que las fases tengan
 * instrumental de verdad. Es justo lo que falló: la primera versión medía la altura en
 * fracción de pantalla y las subió por encima de la arcada para que el vástago no se
 * leyera como plataforma. Ahí quedaban dibujadas sobre la encía, o sea un instrumento
 * incrustado en la carne, que desde dentro de una boca no se puede ver.
 */

/** Cuánto se desplaza una pieza en su vaivén, en píxeles. El caso más amplio. */
const SWING = 30;

describe('catálogo de instrumental', () => {
  const inMouth = STAGE_SCENES.filter((scene) => scene.zone !== 'clinic');
  const instruments = STAGE_SCENES.map((scene) => scene.instrument);

  it('cada fase dentro de la boca trae al menos un instrumento', () => {
    for (const scene of inMouth) {
      expect(toolsForStage(scene.instrument, 1).length).toBeGreaterThan(0);
    }
  });

  it('el quirófano no trae ninguno: su instrumental es el de la unidad', () => {
    // Ahí ya estamos fuera de la boca y la sala es el escenario. Un vástago entrando
    // por el borde se solapaba con el sillón, el visor de radiografías y la pila.
    for (const scene of STAGE_SCENES.filter((s) => s.zone === 'clinic')) {
      expect(toolsForStage(scene.instrument, 1)).toHaveLength(0);
    }
  });

  it('toda pieza asoma por la abertura, no por dentro de la carne', () => {
    for (const scene of inMouth) {
      for (const entry of toolsForStage(scene.instrument, 1)) {
        // A lo ancho de su vaivén, no solo en reposo: entrar y salir cambia la x de la
        // punta, y con ella el alto de la lente en ese punto.
        for (const dx of [-SWING, 0, SWING]) {
          const tipX = entry.side === 'left' ? toolTipX(entry) + dx : toolTipX(entry) - dx;
          const edge = openingAt(scene.opening, tipX);
          const tooth = toothSizeAt(edge.depth).h;
          const y = toolAxisY(scene.opening, entry, dx);
          const label = `${scene.id}/${entry.id} eje a y=${y}, hueco ${edge.top + tooth}..${edge.bottom - tooth}`;

          // Dentro de la abertura, y además fuera de las dos bandas que ocupan los
          // dientes: un eje pegado al canto queda detrás de la arcada y no asoma nada.
          expect(y, label).toBeGreaterThan(edge.top + tooth);
          expect(y, label).toBeLessThan(edge.bottom - tooth);
        }
      }
    }
  });

  it('el instrumental se dibuja antes del marco, para que la arcada lo tape', () => {
    // Si `props` volviera a ir después de `mouth`, el instrumental se pintaría por
    // delante de la encía y de los dientes y volvería a verse dentro de la boca.
    const ids = LAYERS.map((l) => l.id);
    expect(ids.indexOf('props')).toBeLessThan(ids.indexOf('mouth'));
  });

  it('las piezas de un mismo lado no se solapan entre sí', () => {
    for (const instrument of instruments) {
      const entries = toolsForStage(instrument, 1);
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i];
          const b = entries[j];
          if (a.side !== b.side) continue;
          expect(Math.abs(a.lane - b.lane), `${instrument}: ${a.id} y ${b.id}`).toBeGreaterThan(
            0.15
          );
        }
      }
    }
  });

  it('no van a compás: cada pieza lleva su propio desfase', () => {
    for (const instrument of instruments) {
      const phases = toolsForStage(instrument, 1).map((e) => e.phase);
      expect(new Set(phases).size).toBe(phases.length);
    }
  });

  it('todo lo que se lista existe en el catálogo, y con movimiento', () => {
    for (const instrument of instruments) {
      for (const entry of toolsForStage(instrument, 1)) {
        const tool = TOOLS[entry.id as ToolId];
        expect(tool).toBeDefined();
        expect(tool.tilts).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
