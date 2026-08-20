import { CONTACT_EMAIL, SITE_URL } from './identity';

/**
 * Todos los destinos que aparecen en la prosa legal, en un solo sitio.
 *
 * `legal.test.ts` exige que cualquier `{link, href}` de los documentos salga de
 * aquí: una URL enterrada en un párrafo es una que nadie revisa cuando cambia el
 * dominio, y en un texto legal un enlace roto es una obligación incumplida.
 */
export const LEGAL_LINKS = {
  contact: `mailto:${CONTACT_EMAIL}`,
  site: SITE_URL,

  /** Servidos desde `public/legal/`, no empaquetados: la OFL exige el texto íntegro. */
  ofl: '/legal/OFL.txt',
  thirdParty: '/legal/THIRD-PARTY.txt',
  oflInfo: 'https://openfontlicense.org',

  cloudflarePrivacy: 'https://www.cloudflare.com/privacypolicy/',
  dataAuthority: 'https://www.protecciondatos.gob.ec/',
} as const;

export type LegalLinkId = keyof typeof LEGAL_LINKS;

/** Los `href` admitidos en la prosa. */
export const ALLOWED_HREFS: readonly string[] = Object.values(LEGAL_LINKS);
