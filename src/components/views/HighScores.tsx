import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import type { Language } from '../../types';
import { TEXT } from '../../i18n';
import { SCORES_MAX, formatDuration, type ScoreEntry } from '../../storage/scores';
import { PixelButton, PixelLabel, PixelPanel } from '../ui/Pixel';

/**
 * La tabla de récords, guardada solo en este navegador.
 *
 * La fila recién añadida se resalta **por `id`**, nunca por posición: en cuanto
 * entra otra por encima, la posición señala a la equivocada.
 */
interface HighScoresProps {
  scores: readonly ScoreEntry[];
  onClose: () => void;
  lang: Language;
  /** Id de la partida que se acaba de jugar, si viene de terminar una. */
  highlight?: string | null;
}

export const HighScores: React.FC<HighScoresProps> = ({ scores, onClose, lang, highlight }) => {
  const t = TEXT[lang].records;
  const characters = TEXT[lang].characters;
  const menu = TEXT[lang].menu;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const difficultyLabel = (id: ScoreEntry['difficulty']) =>
    ({
      easy: menu.diff_easy,
      normal: menu.diff_normal,
      hard: menu.diff_hard,
      legend: menu.diff_legend,
    })[id];

  return (
    <div className="pixel-crt absolute inset-0 z-[60] flex flex-col bg-slate-900 p-3 md:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-col gap-3">
        <header className="flex items-center justify-between gap-3 border-b-4 border-slate-700 pb-2">
          <h2 className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-yellow-300 uppercase md:text-sm">
            <Trophy className="h-4 w-4" strokeWidth={3} />
            {t.title}
          </h2>
          <PixelButton
            onClick={onClose}
            variant="primary"
            className="p-1.5"
            aria-label={t.close}
            title={t.close}
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </PixelButton>
        </header>

        <div className="pixel-scroll pb-4">
          {scores.length === 0 ? (
            // Panel, no una tabla con las cabeceras y nada debajo: eso se lee
            // como algo roto, no como algo que aún no ha pasado.
            <PixelPanel accent="border-slate-600" bodyClassName="p-6">
              <p className="text-center text-[9px] leading-relaxed text-slate-400">{t.empty}</p>
            </PixelPanel>
          ) : (
            <PixelPanel accent="border-yellow-700" bodyClassName="p-2">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[8px]">
                  <thead>
                    <tr className="border-b-2 border-slate-600 text-slate-500 uppercase">
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">{t.col_name}</th>
                      <th className="py-1 pr-2 text-right">{t.col_score}</th>
                      <th className="py-1 pr-2">{t.col_class}</th>
                      <th className="py-1 pr-2">{t.col_diff}</th>
                      <th className="py-1 pr-2 text-right">{t.col_stage}</th>
                      <th className="py-1 pr-2 text-right">{t.col_kills}</th>
                      <th className="py-1 pr-2 text-right">{t.col_time}</th>
                      <th className="py-1">{t.col_date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-800 ${
                          entry.id === highlight
                            ? 'bg-yellow-900/40 text-yellow-100'
                            : 'text-slate-300'
                        }`}
                      >
                        <td className="py-1.5 pr-2 text-slate-500">{index + 1}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap text-white">
                          {entry.nickname}
                          {entry.outcome === 'victory' && (
                            <span className="ml-1.5 text-[7px] text-green-400">
                              {t.outcome_victory}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-mono text-yellow-300">
                          {entry.score.toLocaleString(lang)}
                        </td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          {characters[entry.character].split(' (')[0]}
                        </td>
                        <td className="py-1.5 pr-2">{difficultyLabel(entry.difficulty)}</td>
                        <td className="py-1.5 pr-2 text-right">{entry.stage}</td>
                        <td className="py-1.5 pr-2 text-right">{entry.kills}</td>
                        <td className="py-1.5 pr-2 text-right font-mono">
                          {formatDuration(entry.ms)}
                        </td>
                        <td className="py-1.5 whitespace-nowrap text-slate-500">{entry.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PixelPanel>
          )}

          {/* El tope sale de la constante, no escrito en el texto traducido. */}
          <PixelLabel className="mt-3 text-center">
            {scores.length} / {SCORES_MAX}
          </PixelLabel>
        </div>
      </div>
    </div>
  );
};
