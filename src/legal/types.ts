/**
 * La forma de los documentos legales.
 *
 * Viven **fuera** de `Dictionary` (`src/i18n/en.ts`) a propósito. Ese
 * diccionario son etiquetas de interfaz, ninguna de más de unos 50 caracteres, y
 * `locales.test.ts` exige paridad exacta de rutas: metiendo prosa legal ahí, el
 * inglés y el español quedarían obligados a tener **el mismo número de
 * párrafos**, que es una camisa de fuerza absurda porque las dos tradiciones de
 * redacción dividen las cláusulas de forma distinta. Además la paridad de ese
 * test dejaría de significar "toda etiqueta está traducida".
 *
 * Aquí la paridad se hace por `LegalSection.id`, que no se traduce: una sección
 * puede llevar dos párrafos en un idioma y tres en el otro, pero no puede
 * faltar.
 */

/**
 * Un fragmento de párrafo. `strong` y `link` existen para que un texto pueda
 * llevar un término destacado o un enlace **sin meter JSX en los datos**: el
 * componente los traduce a `<strong>` y `<a>` al pintar.
 */
export type LegalSpan =
  string | { readonly strong: string } | { readonly link: string; readonly href: string };

export type LegalBlock =
  | { readonly kind: 'p'; readonly spans: readonly LegalSpan[] }
  | { readonly kind: 'ul'; readonly items: readonly (readonly LegalSpan[])[] }
  /** Caja destacada. La usa el resumen de la privacidad, que es lo que más importa. */
  | { readonly kind: 'note'; readonly spans: readonly LegalSpan[] };

export interface LegalSection {
  /** Estable y NO traducido: ancla del DOM y clave de paridad entre idiomas. */
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly LegalBlock[];
}

export type LegalDocId = 'terms' | 'privacy' | 'licenses';

export interface LegalDocument {
  readonly id: LegalDocId;
  readonly title: string;
  /** ISO. Idéntica en ambos idiomas: una política no puede ser más nueva en uno. */
  readonly updated: string;
  readonly sections: readonly LegalSection[];
}

/**
 * `es` se anota `: LegalPack`, **no** `typeof en`. Con `typeof`, cada frase
 * inglesa se convertiría en un tipo literal que el español tendría que igualar
 * carácter a carácter. El tipo cubre la forma; el test cubre el contenido, que
 * es el mismo reparto que ya hace `locales.test.ts`.
 */
export type LegalPack = Record<LegalDocId, LegalDocument>;
