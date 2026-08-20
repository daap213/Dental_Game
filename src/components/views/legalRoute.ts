import type { LegalDocId } from '../../legal';

/**
 * Qué documento legal pide la URL.
 *
 * Vive en su propio `.ts` y no dentro del componente porque `vitest.config.ts`
 * solo recoge `src/**‍/*.test.ts`: `galleryPageFromSearch` está metida en un
 * `.tsx` y por eso es el único parseo de URL del proyecto sin test.
 *
 * Se admiten rutas amigables además del parámetro, porque lo que se pega en un
 * correo —o en la casilla de una tienda, o en un formulario de abuso— es
 * `https://.../privacy`, no `?legal=privacy`. Las rutas las reescribe
 * `public/_redirects` a `/index.html` con estado 200, así que la URL que ve el
 * visitante es la que escribió.
 */
export const LEGAL_TABS = ['terms', 'privacy', 'licenses'] as const;

export type LegalTabId = (typeof LEGAL_TABS)[number] & LegalDocId;

/** Rutas amigables, en los dos idiomas. Debe cuadrar con `public/_redirects`. */
export const LEGAL_PATHS: Readonly<Record<string, LegalTabId>> = {
  '/legal': 'terms',
  '/terms': 'terms',
  '/aviso-legal': 'terms',
  '/privacy': 'privacy',
  '/privacidad': 'privacy',
  '/licenses': 'licenses',
  '/licencias': 'licenses',
};

const isTab = (value: string): value is LegalTabId =>
  (LEGAL_TABS as readonly string[]).includes(value);

/**
 * Ruta primero, luego `?legal=`. Un valor desconocido cae en los términos —igual
 * que `galleryPageFromSearch` cae en los personajes—, y la ausencia total
 * devuelve `null`, que es lo que significa "no abras la pantalla legal".
 */
export const legalTargetFromLocation = (pathname: string, search: string): LegalTabId | null => {
  // Se normaliza la barra final: `/privacy/` y `/privacy` son la misma página.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path in LEGAL_PATHS) return LEGAL_PATHS[path];

  const value = new URLSearchParams(search).get('legal');
  if (value === null) return null;
  return isTab(value) ? value : 'terms';
};

/** La ruta canónica de cada pestaña, que es la que se escribe en la barra. */
export const pathForLegalTab = (tab: LegalTabId): string => `/${tab === 'terms' ? 'legal' : tab}`;
