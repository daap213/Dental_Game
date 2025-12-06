
import React from 'react';
import { Skull, Trophy, RefreshCw } from 'lucide-react';

interface GameOverProps {
  score: number;
  message: string;
  onRestart: () => void;
  onQuit: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ score, message, onRestart, onQuit }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950 text-white p-8 animate-in fade-in duration-500">
      <Skull className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
      <h1 className="text-5xl font-bold mb-2 text-red-500 tracking-widest uppercase text-center">GAME OVER</h1>
      <h2 className="text-2xl mb-8 text-red-300 text-center">The Cavities Won...</h2>
      
      <div className="bg-red-900/50 p-6 rounded-lg border border-red-700 max-w-md w-full mb-8 text-center shadow-xl">
         <div className="flex flex-col items-center gap-2 mb-4">
            <Trophy className="text-yellow-400 w-8 h-8" />
            <span className="text-3xl font-mono text-yellow-400">{score.toString().padStart(6, '0')}</span>
         </div>
         <hr className="border-red-800 mb-4" />
         <p className="text-lg italic font-serif text-red-200">
           "{message}"
         </p>
         <div className="mt-4 text-xs text-red-400 uppercase tracking-widest">- General Gingivitis</div>
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        <button 
          onClick={onQuit}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold flex items-center gap-2 transition-all"
        >
          MAIN MENU
        </button>
        <button 
          onClick={onRestart}
          className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded text-white font-bold flex items-center gap-2 shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          TRY AGAIN
        </button>
      </div>
    </div>
  );
};
