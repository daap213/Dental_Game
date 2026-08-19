import { CANVAS_WIDTH } from '../../data/physics';
import { getStageScene, type StageScene } from '../../data/stages';
import { blit, dropBakes } from '../pixel';
import { layersFor, type BackgroundLayer } from './stack';

// El registro se llena al importar cada capa, y el orden de estos imports **es**
// el orden de dibujado: de la más lejana a la más cercana.
import './throat';
import './clinic';
import './mouth';
import './props';

export { LAYERS, layerById, layersFor, worldLayers } from './stack';
export type { BackgroundLayer, LayerLayout, TileVariant } from './stack';

/** Estampa una capa que se repite, indexada por columna del mundo. */
const drawTiled = (
  ctx: CanvasRenderingContext2D,
  layer: BackgroundLayer,
  scene: StageScene,
  baked: HTMLCanvasElement,
  y: number,
  w: number,
  h: number,
  tile: number,
  world: number
) => {
  // Índice en coordenadas del **mundo**: es lo que hace que la columna 37 sea
  // siempre la columna 37 y su variante no cambie al desplazarse la cámara. Con
  // un índice de pantalla la arcada herviría.
  const first = Math.floor(world / tile) - 1;
  const last = Math.ceil((world + CANVAS_WIDTH) / tile) + 1;

  for (let index = first; index <= last; index++) {
    const piece = layer.variant?.(scene, baked, index);
    if (piece === null) continue; // hueco: falta el diente
    const image = piece?.baked ?? baked;
    blit(ctx, image, index * tile - world, y + (piece?.dy ?? 0), w, h, piece?.flip);
  }
};

/**
 * Pinta el fondo de la fase.
 *
 * `time` son segundos de **simulación** (`world.triggers.levelTime`), no de
 * reloj: así lo poco que se mueve se congela con la pausa, igual que ya hacía el
 * bamboleo de los objetos.
 */
export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  stage: number,
  time = 0
) => {
  const scene = getStageScene(stage);

  for (const layer of layersFor(scene)) {
    const baked = layer.bake(scene);
    const box = layer.layout(scene, baked);
    const world = cameraX * layer.parallax;

    let x = -world;
    if (box.tile && box.tile > 0) {
      drawTiled(ctx, layer, scene, baked, box.y, box.w, box.h, box.tile, world);
    } else {
      const anchored =
        box.anchorX !== undefined
          ? box.anchorX * CANVAS_WIDTH - box.w / 2
          : box.align === 'center'
            ? (CANVAS_WIDTH - box.w) / 2
            : 0;
      x = anchored - world;
      blit(ctx, baked, x, box.y, box.w, box.h);
    }

    layer.live?.(ctx, scene, { time, world, x, box });
  }
};

/**
 * Suelta los horneados del fondo.
 *
 * **No se llama al cambiar de fase a propósito.** Sería lo natural, pero la
 * galería de la ficha dibuja las cinco fases en el mismo frame: soltar la caché
 * al ver una fase distinta la haría rehornear cinco fondos completos diez veces
 * por segundo. El coste de no soltarla está acotado —dos capas a pantalla
 * completa por fase, que es lo mismo que ya ocupaba antes— así que se deja en
 * manos de quien sí sabe que ha terminado: la galería y los tests.
 */
export const clearBackgroundBakes = () => dropBakes('bg:');
