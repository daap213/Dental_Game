import React from 'react';
import { previewGroups, type PreviewGroupId } from '../../game/render/preview';
import { PixelCanvas } from '../PixelCanvas';
import { useIntegerScale } from '../useIntegerScale';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../game/data/physics';

/**
 * Galería de desarrollo, detrás de `?sprites=<grupo>`.
 *
 * Es la misma información que la ficha del juego, sin la interfaz: sirve para
 * revisar un grupo de arte de un vistazo sin abrir menús. Consume el **mismo
 * catálogo** (`render/preview.ts`), así que no hay dos sitios dibujando lo mismo con
 * el riesgo de que uno se quede atrás.
 */

const SCALES: Partial<Record<PreviewGroupId, number>> = {
  characters: 3,
  enemies: 2,
  items: 3,
  effects: 3,
  weapons: 1,
  bosses: 1,
  terrain: 1,
  stages: 1,
  materials: 2,
  scenes: 1,
};

export const SpriteGallery: React.FC<{ page: PreviewGroupId }> = ({ page }) => {
  const groups = previewGroups();
  const { containerRef, width } = useIntegerScale<HTMLDivElement>(CANVAS_WIDTH, CANVAS_HEIGHT);
  const scale = SCALES[page] ?? 1;

  return (
    <div ref={containerRef} className="min-h-screen w-full bg-black p-4 text-slate-300">
      <div className="mx-auto" style={{ maxWidth: Math.max(width, 640) }}>
        <p className="mb-3 font-mono text-[10px] tracking-widest text-slate-500">
          {groups.map((group) => (
            <span key={group.id}>
              {group.id === page ? `[${group.id}]` : group.id}
              {'  ·  '}
            </span>
          ))}
        </p>

        {groups
          .filter((group) => group.id === page)
          .map((group) => (
            <div key={group.id} className="flex flex-wrap items-end gap-4">
              {group.items.map((item) => (
                <figure key={item.id} className="flex flex-col items-center gap-1">
                  <div className="border border-slate-800 bg-slate-950 p-1">
                    <PixelCanvas
                      w={item.w}
                      h={item.h}
                      scale={scale}
                      draw={item.draw}
                      animated
                      label={item.key}
                    />
                  </div>
                  <figcaption className="font-mono text-[9px] text-slate-500">
                    {item.key} · {item.w}×{item.h}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
};

const PAGES: PreviewGroupId[] = [
  'characters',
  'enemies',
  'bosses',
  'weapons',
  'items',
  'terrain',
  'stages',
  'effects',
  'materials',
  'scenes',
];

/** Lee el grupo pedido en la URL. Cualquier valor raro cae en los personajes. */
export const galleryPageFromSearch = (search: string): PreviewGroupId | null => {
  const value = new URLSearchParams(search).get('sprites');
  if (value === null) return null;
  return (PAGES as string[]).includes(value) ? (value as PreviewGroupId) : 'characters';
};
