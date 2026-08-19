import React from 'react';
import type { Language } from '../../types';
import { TEXT } from '../../i18n';
import { groupTitle, previewLabel } from '../../i18n/subjects';
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

export const SpriteGallery: React.FC<{ page: PreviewGroupId; lang: Language }> = ({
  page,
  lang,
}) => {
  const groups = previewGroups();
  const { containerRef, width } = useIntegerScale<HTMLDivElement>(CANVAS_WIDTH, CANVAS_HEIGHT);
  const scale = SCALES[page] ?? 1;

  return (
    <div ref={containerRef} className="min-h-screen w-full bg-black p-4 text-slate-300">
      <div className="mx-auto" style={{ maxWidth: Math.max(width, 640) }}>
        <p className="mb-1 font-mono text-[10px] tracking-widest text-slate-500">
          {groups.map((group) => (
            <span key={group.id}>
              {group.id === page ? `[${group.id}]` : group.id}
              {'  ·  '}
            </span>
          ))}
        </p>
        {/*
         * El nombre del grupo, traducido, junto al identificador técnico de arriba.
         *
         * `groupTitle` y `previewLabel` existían para la galería que la ficha del juego llevaba
         * incrustada, y al quitarla de allí se quedaban sin ningún consumidor de producción: vivas
         * solo por sus tests. Aquí valen de verdad —saber que `tartar_spire` es la Aguja de Sarro
         * ahorra ir a buscarlo— y el identificador se queda, que es lo que una herramienta de
         * revisión necesita.
         */}
        <h1 className="text-[11px] tracking-[0.2em] text-slate-300 uppercase">
          {TEXT[lang].database.gallery_title} · {groupTitle(lang, page)}
        </h1>
        {/*
         * `gallery_title` y `gallery_desc` estaban en la ficha del juego, describiendo la galería
         * que llevaba incrustada. Al quitarla de allí su sitio es este, que es la galería de
         * verdad.
         */}
        <p className="mb-3 text-[8px] text-slate-600">{TEXT[lang].database.gallery_desc}</p>

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
                  <figcaption className="text-center">
                    <span className="block max-w-[10rem] truncate text-[8px] text-slate-400">
                      {previewLabel(lang, group.id, item.key)}
                    </span>
                    <span className="font-mono text-[9px] text-slate-600">
                      {item.key} · {item.w}×{item.h}
                    </span>
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
