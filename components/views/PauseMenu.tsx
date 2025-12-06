
import React from 'react';
import { Pause, Play, RefreshCw, Home } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRestart, onQuit }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-slate-800 p-8 rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col gap-4 min-w-[300px]">
          <h2 className="text-3xl font-bold text-white text-center mb-4 flex items-center justify-center gap-2">
            <Pause className="w-8 h-8 text-blue-400" />
            PAUSED
          </h2>
          
          <button 
            onClick={onResume}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:translate-y-1 active:shadow-none"
          >
            <Play className="w-5 h-5" />
            RESUME
          </button>

          <button 
            onClick={onRestart}
            className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold flex items-center justify-center gap-2 transition-all active:translate-y-1"
          >
            <RefreshCw className="w-5 h-5" />
            RESTART
          </button>

          <button 
            onClick={onQuit}
            className="w-full px-6 py-4 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded font-bold flex items-center justify-center gap-2 transition-all border border-red-900 active:translate-y-1"
          >
            <Home className="w-5 h-5" />
            QUIT TO MENU
          </button>
       </div>
    </div>
  );
};
