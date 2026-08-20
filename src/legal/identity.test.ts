import { describe, it, expect } from 'vitest';
import {
  BRAND,
  CONTACT_EMAIL,
  COPYRIGHT_SINCE,
  LEGAL_UPDATED,
  SITE_DOMAIN,
  SITE_URL,
  copyrightLine,
  copyrightYears,
} from './identity';
import { LEGAL } from './index';
import { LEGAL_LINKS } from './links';

describe('identidad del titular', () => {
  it('el dominio es un dominio de verdad, no un marcador de posición', () => {
    // Publicar con `TODO.example` dentro del aviso legal es el fallo silencioso
    // que este test existe para impedir.
    expect(SITE_DOMAIN).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
    expect(SITE_DOMAIN).not.toMatch(/\.(example|test|invalid|localhost)$/);
    expect(SITE_DOMAIN.toLowerCase()).not.toContain('todo');
    expect(SITE_URL).toBe(`https://${SITE_DOMAIN}`);
  });

  it('el correo de contacto es válido', () => {
    expect(CONTACT_EMAIL).toMatch(/^[^\s@]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/);
    expect(LEGAL_LINKS.contact).toBe(`mailto:${CONTACT_EMAIL}`);
  });

  it('el año de copyright no está en el futuro', () => {
    expect(COPYRIGHT_SINCE).toBeLessThanOrEqual(new Date().getFullYear());
    expect(COPYRIGHT_SINCE).toBeGreaterThan(2000);
  });

  it('el rango de años se colapsa el primer año y se abre después', () => {
    // Un "© 2025–2025" delata que nadie mira el pie.
    expect(copyrightYears(COPYRIGHT_SINCE)).toBe(`${COPYRIGHT_SINCE}`);
    expect(copyrightYears(COPYRIGHT_SINCE + 2)).toBe(`${COPYRIGHT_SINCE}–${COPYRIGHT_SINCE + 2}`);
    expect(copyrightLine(COPYRIGHT_SINCE)).toBe(`© ${COPYRIGHT_SINCE} ${BRAND}`);
  });

  it('la fecha de revisión es ISO y no está en el futuro', () => {
    expect(LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Date.parse(LEGAL_UPDATED)).toBeLessThanOrEqual(Date.now());
  });

  it('los documentos llevan la fecha de revisión declarada', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const doc of ['terms', 'privacy', 'licenses'] as const) {
        expect(LEGAL[lang][doc].updated, `${lang}/${doc}`).toBe(LEGAL_UPDATED);
      }
    }
  });

  it('ningún enlace legal apunta a un dominio propio distinto', () => {
    // Cambiar de dominio tiene que ser una sola edición en `identity.ts`.
    const ours = Object.values(LEGAL_LINKS).filter((href) => href.includes('daaptech'));
    for (const href of ours) {
      expect(href, `enlace propio fuera de SITE_DOMAIN: ${href}`).toMatch(
        /daaptech\.org|supermolar\.daaptech\.org/
      );
    }
  });
});
