import React from 'react';
import { Skull, Trophy, RefreshCw, Home } from 'lucide-react';
import { Language } from '../../types';
import { TEXT } from '../../i18n';
import { PixelPanel, PixelLabel } from '../ui/Pixel';
import { useFitScale } from '../useFitScale';

interface GameOverProps {
  score: number;
  message: string;
  onRestart: () => void;
  onQuit: () => void;
  lang: Language;
}

export const GameOver: React.FC<GameOverProps> = ({ score, message, onRestart, onQuit, lang }) => {
  const t = TEXT[lang].gameover;
  const { containerRef, contentRef, scale } = useFitScale<HTMLDivElement, HTMLDivElement>();

  return (
    <div
      ref={containerRef}
      className="pixel-crt absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-red-950 text-white"
    >
      {/* Trama de fondo en rojo, del mismo grano que el resto de pantallas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fca5a5 1px, transparent 1px), linear-gradient(to bottom, #fca5a5 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})` }}
        className="relative z-10 flex w-full max-w-lg flex-col items-center gap-5 p-4"
      >
        <Skull className="pixel-blink h-16 w-16 text-red-500" strokeWidth={2.5} />

        <div className="text-center">
          <h1 className="pixel-title text-2xl tracking-[0.2em] text-red-400 uppercase md:text-3xl">
            {t.title}
          </h1>
          <p className="pixel-text-shadow mt-3 text-[10px] tracking-[0.25em] text-red-300 uppercase">
            {t.subtitle}
          </p>
        </div>

        <PixelPanel accent="border-red-800" className="w-full bg-red-900" bodyClassName="p-4">
          <div className="mb-4 flex flex-col items-center gap-2">
            <Trophy className="h-7 w-7 text-yellow-400" strokeWidth={3} />
            <span className="pixel-text-shadow text-2xl tracking-[0.15em] text-yellow-400">
              {score.toString().padStart(6, '0')}
            </span>
          </div>

          <div className="pixel-inset border-red-950 bg-red-950/60 p-3">
            <p className="text-[9px] leading-[1.9] text-red-100">&quot;{message}&quot;</p>
          </div>

          <PixelLabel className="mt-3 text-center text-red-400">— General Gingivitis</PixelLabel>
        </PixelPanel>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onQuit}
            className="pixel-btn pixel-text-shadow flex cursor-pointer items-center gap-2 border-slate-500 bg-slate-700 px-5 py-3 text-[10px] tracking-wider text-slate-200 uppercase hover:bg-slate-600"
          >
            <Home className="h-4 w-4" strokeWidth={3} />
            {t.menu}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="pixel-btn pixel-text-shadow flex cursor-pointer items-center gap-2 border-red-300 bg-red-600 px-6 py-3 text-[10px] tracking-wider text-white uppercase hover:bg-red-500"
          >
            <span aria-hidden className="pixel-blink">
              ▶
            </span>
            <RefreshCw className="h-4 w-4" strokeWidth={3} />
            {t.try_again}
          </button>
        </div>
      </div>
    </div>
  );
};
