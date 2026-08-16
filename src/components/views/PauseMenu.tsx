import React from 'react';
import { Pause, Play, RefreshCw, Home } from 'lucide-react';
import { Language } from '../../types';
import { TEXT } from '../../i18n';
import { PixelPanel } from '../ui/Pixel';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  lang: Language;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRestart, onQuit, lang }) => {
  const t = TEXT[lang].pause;

  return (
    <div className="pixel-crt absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80">
      <PixelPanel accent="border-slate-500" className="min-w-[280px]" bodyClassName="p-4">
        <h2 className="pixel-text-shadow mb-5 flex items-center justify-center gap-2 text-center text-sm tracking-[0.25em] text-blue-300 uppercase">
          <Pause className="h-5 w-5" strokeWidth={3} />
          {t.title}
        </h2>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="pixel-btn pixel-text-shadow flex w-full cursor-pointer items-center justify-center gap-2 border-blue-300 bg-blue-600 px-5 py-3 text-[10px] tracking-wider text-white uppercase hover:bg-blue-500"
          >
            <span aria-hidden className="pixel-blink">
              ▶
            </span>
            <Play className="h-4 w-4" strokeWidth={3} />
            {t.resume}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="pixel-btn pixel-text-shadow flex w-full cursor-pointer items-center justify-center gap-2 border-slate-500 bg-slate-700 px-5 py-3 text-[10px] tracking-wider text-slate-200 uppercase hover:bg-slate-600"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={3} />
            {t.restart}
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="pixel-btn pixel-text-shadow flex w-full cursor-pointer items-center justify-center gap-2 border-red-800 bg-red-950 px-5 py-3 text-[10px] tracking-wider text-red-200 uppercase hover:bg-red-900"
          >
            <Home className="h-4 w-4" strokeWidth={3} />
            {t.quit}
          </button>
        </div>
      </PixelPanel>
    </div>
  );
};
