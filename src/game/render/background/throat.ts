import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/physics';
import type { StageScene } from '../../data/stages';
import { bake } from '../pixel';
import { ditherBand } from '../dither';
import { registerLayer } from './stack';

/**
 * El fondo del fondo: la penumbra sobre la que se apoya todo lo demás.
 *
 * Aquí vivían las fauces —el arco del paladar blando, la úvula y las amígdalas— y el
 * dorso de la lengua. **Se han quitado**: eran la boca mirada hacia la garganta, y el
 * personaje mira hacia fuera. El centro de la pantalla ya no es un agujero oscuro,
 * es la salida iluminada (`clinic.ts`).
 *
 * Lo que queda es lo único que esta capa tiene que hacer: garantizar que no haya
 * lienzo en blanco por detrás, y dar un tono de ambiente a la fase. Clavada al
 * fondo, no se desplaza.
 */
export const throatLayer = registerLayer({
  id: 'throat',
  parallax: 0,

  bake: (scene: StageScene) =>
    bake(`bg:${scene.id}:throat`, CANVAS_WIDTH, CANVAS_HEIGHT, (ctx) => {
      const inner = scene.ramp;
      const half = CANVAS_HEIGHT / 2;
      ditherBand(ctx, 0, 0, CANVAS_WIDTH, half, `${inner}.out`, `${inner}.shade`, 7);
      ditherBand(ctx, 0, half, CANVAS_WIDTH, half, `${inner}.shade`, `${inner}.out`, 7);
    }),

  layout: () => ({ y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT, align: 'left' }),
});
