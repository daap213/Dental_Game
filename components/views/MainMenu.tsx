
import React from 'react';
import { GameState } from '../../types';

interface MainMenuProps {
  setGameState: (state: GameState) => void;
  briefing: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({ setGameState, briefing }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-8">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-pink-400 text-center uppercase tracking-widest shadow-lg" style={{textShadow: '4px 4px 0px #be185d'}}>
          Super Molar
      </h1>
      <h2 className="text-xl md:text-2xl mb-8 text-blue-300">Plaque Attack</h2>
      
      <div className="max-w-md bg-slate-800 p-6 rounded-lg border-2 border-slate-600 mb-8">
          <h3 className="text-yellow-400 text-sm mb-2">MISSION BRIEFING (GenAI):</h3>
          <p className="font-mono text-sm leading-relaxed typing-effect min-h-[60px]">
              {briefing}
          </p>
      </div>

      <button 
        onClick={() => setGameState(GameState.PLAYING)}
        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xl shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
      >
          START OPERATION
      </button>

      <div className="mt-8 text-xs text-slate-500 flex flex-col items-center gap-2">
          <p>CONTROLS</p>
          <div className="flex gap-4 flex-wrap justify-center">
              <span className="bg-slate-700 px-2 py-1 rounded">A / D : Move</span>
              <span className="bg-slate-700 px-2 py-1 rounded">W : Aim Up</span>
              <span className="bg-slate-700 px-2 py-1 rounded">SPACE : Jump (x2)</span>
              <span className="bg-slate-700 px-2 py-1 rounded">CLICK / F : Shoot</span>
              <span className="bg-slate-700 px-2 py-1 rounded">SHIFT / R-CLICK : Dash</span>
          </div>
      </div>
    </div>
  );
};
