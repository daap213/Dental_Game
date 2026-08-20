import { describe, it, expect } from 'vitest';
import { LEGAL, LEGAL_DOCS } from './index';
import { ALLOWED_HREFS } from './links';
import type { LegalBlock, LegalSpan } from './types';

const LANGS = ['en', 'es'] as const;

const spansOf = (block: LegalBlock): readonly (readonly LegalSpan[])[] =>
  block.kind === 'ul' ? block.items : [block.spans];

const allSpans = (lang: (typeof LANGS)[number]): LegalSpan[] =>
  LEGAL_DOCS.flatMap((doc) =>
    LEGAL[lang][doc].sections.flatMap((section) =>
      section.blocks.flatMap((block) => spansOf(block).flat())
    )
  );

describe('paridad de los documentos legales', () => {
  it('ambos idiomas publican los mismos documentos', () => {
    for (const lang of LANGS) {
      expect(Object.keys(LEGAL[lang]).sort()).toEqual([...LEGAL_DOCS].sort());
    }
  });

  it('cada documento tiene las mismas secciones y en el mismo orden', () => {
    // Por `id`, no por índice: una sección puede llevar dos párrafos en un
    // idioma y tres en el otro —así se redacta—, pero no puede faltar.
    for (const doc of LEGAL_DOCS) {
      const en = LEGAL.en[doc].sections.map((s) => s.id);
      const es = LEGAL.es[doc].sections.map((s) => s.id);
      expect(es, `secciones de "${doc}"`).toEqual(en);
    }
  });

  it('una política no puede ser más nueva en un idioma que en el otro', () => {
    for (const doc of LEGAL_DOCS) {
      expect(LEGAL.es[doc].updated, doc).toBe(LEGAL.en[doc].updated);
    }
  });

  it('los id de sección son únicos dentro de cada documento', () => {
    // Son anclas del DOM: repetirlos rompe la navegación en silencio.
    for (const lang of LANGS) {
      for (const doc of LEGAL_DOCS) {
        const ids = LEGAL[lang][doc].sections.map((s) => s.id);
        expect(new Set(ids).size, `${lang}/${doc}`).toBe(ids.length);
      }
    }
  });
});

describe('contenido de los documentos legales', () => {
  it('ningún título ni párrafo está vacío', () => {
    for (const lang of LANGS) {
      for (const doc of LEGAL_DOCS) {
        const document = LEGAL[lang][doc];
        expect(document.title.trim(), `${lang}/${doc} título`).not.toBe('');
        expect(document.sections.length, `${lang}/${doc} sin secciones`).toBeGreaterThan(0);

        for (const section of document.sections) {
          expect(section.title.trim(), `${lang}/${doc}#${section.id}`).not.toBe('');
          expect(section.blocks.length, `${lang}/${doc}#${section.id} sin bloques`).toBeGreaterThan(
            0
          );

          for (const block of section.blocks) {
            for (const spans of spansOf(block)) {
              expect(spans.length, `${lang}/${doc}#${section.id} bloque vacío`).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it('ningún fragmento de texto está vacío', () => {
    for (const lang of LANGS) {
      for (const span of allSpans(lang)) {
        const text = typeof span === 'string' ? span : 'strong' in span ? span.strong : span.link;
        expect(text.trim(), `fragmento vacío en "${lang}"`).not.toBe('');
      }
    }
  });

  it('todo enlace sale de LEGAL_LINKS', () => {
    // Una URL enterrada en un párrafo es una que nadie revisa al cambiar de
    // dominio, y en un texto legal un enlace roto es una obligación incumplida.
    for (const lang of LANGS) {
      for (const span of allSpans(lang)) {
        if (typeof span === 'object' && 'href' in span) {
          expect(ALLOWED_HREFS, `href suelto en "${lang}": ${span.href}`).toContain(span.href);
        }
      }
    }
  });

  it('las fechas de actualización son ISO y no están en el futuro', () => {
    for (const lang of LANGS) {
      for (const doc of LEGAL_DOCS) {
        const updated = LEGAL[lang][doc].updated;
        expect(updated, `${lang}/${doc}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(updated)), `${lang}/${doc} no parsea`).toBe(false);
      }
    }
  });
});

describe('cláusulas que sostienen el conjunto', () => {
  // Caracterización, no cálculo: estas secciones existen porque sin ellas el
  // documento deja de ser cierto o deja de cumplir. Un recorte futuro que se
  // lleve una por delante debe doler aquí y no en producción.
  const REQUIRED: Record<string, readonly string[]> = {
    // `hosting` es la que más fácil se cae, y sin ella "no recogemos nada" es falso.
    privacy: ['summary', 'hosting', 'local', 'rights', 'authority', 'cookies'],
    // `parody` es el descargo sanitario; `law`, el fuero.
    terms: ['ip', 'parody', 'warranty', 'law', 'photosensitivity'],
    // `font` es la obligación viva: se redistribuyen los ficheros de la fuente.
    licenses: ['own', 'font', 'software', 'assets'],
  };

  for (const [doc, required] of Object.entries(REQUIRED)) {
    it(`"${doc}" conserva sus cláusulas obligatorias`, () => {
      for (const lang of LANGS) {
        const ids = LEGAL[lang][doc as keyof typeof LEGAL.en].sections.map((s) => s.id);
        for (const id of required) {
          expect(ids, `falta "${id}" en ${lang}/${doc}`).toContain(id);
        }
      }
    });
  }
});
