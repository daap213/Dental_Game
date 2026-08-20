/**
 * Quién publica el juego, dónde y bajo qué ley.
 *
 * Fuente única a propósito. Estos valores aparecen en el aviso legal, en la
 * política de privacidad, en la página de licencias, en el pie de los créditos
 * y en las etiquetas de `index.html`; escritos a mano en cada sitio, cambiar de
 * dominio o de año sería una cacería. Y sobre todo **no pueden vivir dentro de
 * un texto traducido**: habría dos copias que se desincronizan en silencio, que
 * es exactamente lo que `CLAUDE.md` ya prohíbe para los números del juego.
 */

export const BRAND = 'DaapTech';
export const SITE_NAME = 'Super Molar: Plaque Attack';

export const SITE_DOMAIN = 'supermolar.daaptech.org';
export const SITE_URL = `https://${SITE_DOMAIN}`;

/**
 * El alias va en el dominio raíz, no en el subdominio del juego: el correo es de
 * la marca y tiene que seguir siendo válido aunque el juego cambie de sitio.
 */
export const CONTACT_EMAIL = 'legal@daaptech.org';

/** Primera publicación, según el commit inicial del repositorio. */
export const COPYRIGHT_SINCE = 2025;

export const JURISDICTION_COUNTRY = 'Ecuador';
export const JURISDICTION_CITY = 'Guayaquil';

/** Última revisión de los tres documentos legales. ISO, y la misma para los dos idiomas. */
export const LEGAL_UPDATED = '2026-08-19';

/**
 * `© 2025 DaapTech` mientras no haya pasado un año, `© 2025–2027 DaapTech`
 * después. El rango se colapsa solo: un `© 2025–2025` delata que nadie lo mira.
 */
export const copyrightYears = (now = new Date().getFullYear()): string =>
  now > COPYRIGHT_SINCE ? `${COPYRIGHT_SINCE}–${now}` : `${COPYRIGHT_SINCE}`;

export const copyrightLine = (now?: number): string => `© ${copyrightYears(now)} ${BRAND}`;
