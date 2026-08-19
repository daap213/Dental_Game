import { describe, expect, it } from 'vitest';
import { STAGE_SCENES } from '../../data/stages';
import { layerById } from './index';
import { breathBands } from './mouth';

/**
 * Lo que se comprueba del marco es lo que puede hacer daño, no su aspecto.
 *
 * El marco añade cosas que se mueven —la respiración, el brillo húmedo, el charco, la
 * espuma— y de todas ellas solo una toca el contraste de la escena: el pulso de la
 * respiración, que apaga la carne. Si alcanzara la franja donde se juega, apagaría al
 * jugador dos veces por ciclo, y eso no se vería revisando una captura: hay que
 * esperar a la mitad del ciclo para notarlo.
 */

/** La franja donde viven las plataformas y se pelea. */
const PLAY_TOP = 210;
const PLAY_BOTTOM = 330;

describe('el marco de la boca', () => {
  const inMouth = STAGE_SCENES.filter((scene) => scene.zone !== 'clinic');

  it('el pulso de la respiración nunca entra en la franja de juego', () => {
    for (const scene of STAGE_SCENES) {
      const { top, bottom } = breathBands(scene.opening);
      expect(top, `${scene.id}: la banda de arriba baja hasta ${top}`).toBeLessThanOrEqual(
        PLAY_TOP
      );
      expect(bottom, `${scene.id}: la banda de abajo sube hasta ${bottom}`).toBeGreaterThanOrEqual(
        PLAY_BOTTOM
      );
    }
  });

  it('las dos bandas de la respiración no se cruzan', () => {
    for (const scene of STAGE_SCENES) {
      const { top, bottom } = breathBands(scene.opening);
      expect(bottom, scene.id).toBeGreaterThan(top);
    }
  });

  it('toda boca tiene saliva, o lo húmedo no aparece en ninguna parte', () => {
    // El charco, la espuma, las burbujas y los hilos están todos condicionados a
    // `scene.saliva`. Una fase a cero se quedaría con la arcada seca y sin que nada
    // fallara: el dato es lo que enciende la mitad de la vida del marco.
    for (const scene of inMouth) {
      expect(scene.saliva, scene.id).toBeGreaterThan(0);
    }
  });

  it('el marco se dibuja en vivo: si no, la boca no respira', () => {
    const mouth = layerById('mouth');
    expect(mouth).toBeDefined();
    expect(typeof mouth?.live).toBe('function');
  });
});
