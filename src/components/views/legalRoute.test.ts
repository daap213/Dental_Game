import { describe, it, expect } from 'vitest';
// `?raw` en vez de `node:fs`: los tipos de Node no están en esta capa a
// propósito. Si el fichero desapareciera, la importación fallaría al resolver,
// que es una forma perfectamente clara de suspender.
import redirectsFile from '../../../public/_redirects?raw';
import { LEGAL_PATHS, LEGAL_TABS, legalTargetFromLocation, pathForLegalTab } from './legalRoute';

describe('ruta de la pantalla legal', () => {
  it('sin parámetro ni ruta, no se abre nada', () => {
    expect(legalTargetFromLocation('/', '')).toBeNull();
    expect(legalTargetFromLocation('/', '?sprites=enemies')).toBeNull();
  });

  it('lee el parámetro', () => {
    expect(legalTargetFromLocation('/', '?legal=privacy')).toBe('privacy');
    expect(legalTargetFromLocation('/', '?legal=licenses')).toBe('licenses');
  });

  it('un valor desconocido cae en los términos, no en null', () => {
    // Mismo criterio que `galleryPageFromSearch`: pedir la pantalla legal con
    // una errata debe llevarte a la pantalla legal, no al juego.
    expect(legalTargetFromLocation('/', '?legal=gibberish')).toBe('terms');
    expect(legalTargetFromLocation('/', '?legal=')).toBe('terms');
  });

  it('lee las rutas amigables en los dos idiomas', () => {
    expect(legalTargetFromLocation('/privacy', '')).toBe('privacy');
    expect(legalTargetFromLocation('/privacidad', '')).toBe('privacy');
    expect(legalTargetFromLocation('/aviso-legal', '')).toBe('terms');
    expect(legalTargetFromLocation('/licencias', '')).toBe('licenses');
  });

  it('la barra final no cambia la página', () => {
    expect(legalTargetFromLocation('/privacy/', '')).toBe('privacy');
  });

  it('la ruta gana al parámetro', () => {
    expect(legalTargetFromLocation('/licenses', '?legal=privacy')).toBe('licenses');
  });

  it('la ruta canónica de cada pestaña se vuelve a leer igual', () => {
    for (const tab of LEGAL_TABS) {
      expect(legalTargetFromLocation(pathForLegalTab(tab), '')).toBe(tab);
    }
  });
});

describe('_redirects y el parser no se desincronizan', () => {
  const rewritten = redirectsFile
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.split(/\s+/)[0]);

  it('toda ruta reescrita por Cloudflare la reconoce el parser', () => {
    // Una reescritura sin entrada en `LEGAL_PATHS` sirve el juego con una URL
    // legal en la barra y sin abrir nada: un enlace muerto que solo se ve en
    // producción, porque `pnpm dev` y `pnpm preview` no leen `_redirects`.
    expect(rewritten.length).toBeGreaterThan(0);
    for (const path of rewritten) {
      expect(LEGAL_PATHS, `"${path}" se reescribe pero el parser no lo conoce`).toHaveProperty(
        path
      );
    }
  });

  it('toda ruta que el parser conoce está reescrita', () => {
    for (const path of Object.keys(LEGAL_PATHS)) {
      expect(rewritten, `"${path}" no está en _redirects: daría 404`).toContain(path);
    }
  });
});
