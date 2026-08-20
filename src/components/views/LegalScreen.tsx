import React, { useEffect } from 'react';
import { FileText, Globe, ScrollText, ShieldCheck, User, X } from 'lucide-react';
import { Language } from '../../types';
import { TEXT } from '../../i18n';
import { LEGAL } from '../../legal';
import type { LegalBlock, LegalSpan } from '../../legal';
import { ATTRIBUTIONS } from '../../legal/attributions';
import { copyrightLine } from '../../legal/identity';
import { PixelButton, PixelLabel, PixelLink, PixelPanel, PixelProse } from '../ui/Pixel';
import { PixelTabs, type ChoiceOption } from '../ui/PixelChoice';
import { LEGAL_TABS, type LegalTabId } from './legalRoute';

/**
 * Los tres documentos legales, en pestañas.
 *
 * Es un calco de `IntelDatabase`: es la única pantalla del proyecto con scroll
 * de verdad y la única que se cierra con Escape, y las dos cosas hacen falta
 * aquí. La pareja `min-h-0` —en la columna **y** en el hijo que desplaza— es lo
 * que hace funcionar el `overflow-y-auto` dentro de un flex a pantalla completa;
 * quitar cualquiera de las dos deja la página entera desplazándose en vez del
 * panel, que es exactamente lo que no se quiere con una cabecera fija.
 *
 * `Credits` no sirve para esto: está escrita a propósito para **encogerse** con
 * `useFitScale` en vez de desplazarse, así que un texto largo se reduciría hasta
 * ser ilegible.
 */

/** Un fragmento: texto, término destacado o enlace. Sin JSX en los datos. */
const Span: React.FC<{ span: LegalSpan }> = ({ span }) => {
  if (typeof span === 'string') return <>{span}</>;
  if ('strong' in span) return <strong>{span.strong}</strong>;
  return <PixelLink href={span.href}>{span.link}</PixelLink>;
};

const Spans: React.FC<{ spans: readonly LegalSpan[] }> = ({ spans }) => (
  <>
    {spans.map((span, i) => (
      <Span key={i} span={span} />
    ))}
  </>
);

const Block: React.FC<{ block: LegalBlock }> = ({ block }) => {
  if (block.kind === 'ul') {
    return (
      <ul className="my-2 space-y-1">
        {block.items.map((item, i) => (
          <li key={i}>
            <Spans spans={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === 'note') {
    return (
      <div className="pixel-inset my-2 border-cyan-700 bg-cyan-950/40 p-3">
        <p className="text-cyan-100">
          <Spans spans={block.spans} />
        </p>
      </div>
    );
  }

  return (
    <p className="my-2">
      <Spans spans={block.spans} />
    </p>
  );
};

/** La tabla de terceros se pinta desde `ATTRIBUTIONS`, nunca escrita en la prosa. */
const AttributionTable: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = TEXT[lang].legal;
  return (
    <div className="my-3 overflow-x-auto">
      <table className="legal-prose w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-slate-600">
            <th className="py-1 pr-3 text-slate-400">{t.col_package}</th>
            <th className="py-1 pr-3 text-slate-400">{t.col_license}</th>
            <th className="py-1 text-slate-400">{t.col_copyright}</th>
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTIONS.map((entry) => (
            <tr key={entry.pkg} className="border-b border-slate-800 align-top">
              <td className="py-1.5 pr-3 whitespace-nowrap text-slate-200">
                <PixelLink href={entry.url}>{entry.pkg}</PixelLink>{' '}
                <span className="text-slate-500">{entry.version}</span>
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap">
                <PixelLink href={entry.licenseUrl}>{entry.license}</PixelLink>
              </td>
              {/* `devNote` no se pinta: es nota de mantenimiento y no está
                  traducida. Ver `attributions.ts`. */}
              <td className="py-1.5 text-slate-400">{entry.copyright}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface LegalScreenProps {
  tab: LegalTabId;
  onTab: (tab: LegalTabId) => void;
  onClose: () => void;
  onCredits: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export const LegalScreen: React.FC<LegalScreenProps> = ({
  tab,
  onTab,
  onClose,
  onCredits,
  lang,
  setLang,
}) => {
  const t = TEXT[lang].legal;
  const doc = LEGAL[lang][tab];

  /**
   * Escape cierra, igual que en la base de datos táctica.
   *
   * No choca con el listener global de `GameCanvas`: aquel sale antes en
   * cualquier estado que no sea jugando o en pausa, y esta pantalla solo se abre
   * desde el menú, desde los créditos o desde la URL. **Si algún día se expone
   * desde el menú de pausa, disparan los dos.**
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabs: readonly ChoiceOption<LegalTabId>[] = [
      {
        id: 'terms',
        label: t.tab_terms,
        icon: <ScrollText className="h-3 w-3" strokeWidth={3} />,
        accent: 'border-amber-300 bg-amber-700 text-white',
      },
      {
        id: 'privacy',
        label: t.tab_privacy,
        icon: <ShieldCheck className="h-3 w-3" strokeWidth={3} />,
        accent: 'border-cyan-300 bg-cyan-700 text-white',
      },
      {
        id: 'licenses',
        label: t.tab_licenses,
        icon: <FileText className="h-3 w-3" strokeWidth={3} />,
        accent: 'border-violet-300 bg-violet-700 text-white',
    },
  ];

  return (
    <div className="pixel-crt absolute inset-0 z-[60] flex flex-col bg-slate-900 p-3 md:p-6">
      {/* Más estrecha que la base de datos táctica (`max-w-5xl`) a propósito: aquí
          lo que manda es la medida de línea. Con la columna ancha, el texto se
          quedaba en su tope de 68 caracteres y dejaba medio panel vacío, que se
          lee como una maqueta rota y no como una decisión. */}
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-3">
        <header className="flex items-center justify-between gap-3 border-b-4 border-slate-700 pb-2">
          <h2 className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-amber-300 uppercase md:text-sm">
            <ScrollText className="h-4 w-4" strokeWidth={3} />
            {t.title}
          </h2>

          {/* La pantalla se puede abrir por URL sin pasar por el menú, así que
              necesita su propio selector de idioma y su propia salida. */}
          <div className="flex items-center gap-1.5">
            <PixelButton
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 px-2 py-1.5"
              title={lang === 'en' ? 'Español' : 'English'}
            >
              <Globe className="h-3 w-3" strokeWidth={3} />
              {lang === 'en' ? 'ES' : 'EN'}
            </PixelButton>
            <PixelButton
              onClick={onCredits}
              className="flex items-center gap-1.5 px-2 py-1.5"
              title={t.credits}
            >
              <User className="h-3 w-3" strokeWidth={3} />
              {t.credits}
            </PixelButton>
            <PixelButton
              onClick={onClose}
              className="border-red-300 bg-red-600 p-1.5 text-white"
              title={t.close}
            >
              <X className="h-3 w-3" strokeWidth={3} />
            </PixelButton>
          </div>
        </header>

        <PixelTabs options={tabs} value={tab} onSelect={onTab} label={t.title} marker />

        {/* Solo el documento desplaza: la cabecera y las pestañas nunca se van. */}
        <div className="pixel-scroll pb-4">
          <article key={tab} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="pixel-text-shadow text-[11px] tracking-[0.15em] text-white uppercase">
                {doc.title}
              </h3>
              <PixelLabel>
                {t.updated} {doc.updated}
              </PixelLabel>
            </div>

            {/* Índice: un documento legal se navega, no se lee de corrido. */}
            <PixelPanel title={t.contents} accent="border-slate-600" bodyClassName="p-2">
              <ul className="legal-prose flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                {doc.sections.map((section) => (
                  <li key={section.id} className="ml-0 list-none">
                    <PixelLink href={`#${tab}-${section.id}`}>{section.title}</PixelLink>
                  </li>
                ))}
              </ul>
            </PixelPanel>

            {doc.sections.map((section) => (
              <PixelPanel
                key={section.id}
                title={section.title}
                accent="border-slate-600"
                bodyClassName="p-3"
              >
                <div id={`${tab}-${section.id}`} className="scroll-mt-4">
                  <PixelProse>
                    {section.blocks.map((block, i) => (
                      <Block key={i} block={block} />
                    ))}
                    {/* La tabla de terceros se dibuja donde su sección la reclama. */}
                    {tab === 'licenses' && section.id === 'software' && (
                      <AttributionTable lang={lang} />
                    )}
                  </PixelProse>
                </div>
              </PixelPanel>
            ))}

            <PixelLabel className="pt-2 text-center">{copyrightLine()}</PixelLabel>
          </article>
        </div>
      </div>
    </div>
  );
};

export { LEGAL_TABS };
