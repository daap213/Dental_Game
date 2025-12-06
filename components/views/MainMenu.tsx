
import React from 'react';
import { InputMethod } from '../../types';
import { MousePointer, Keyboard } from 'lucide-react';

interface MainMenuProps {
  onStart: () => void;
  briefing: string;
  inputMethod: InputMethod;
  setInputMethod: (method: InputMethod) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, briefing, inputMethod, setInputMethod }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-8">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-pink-400 text-center uppercase tracking-widest shadow-lg" style={{textShadow: '4px 4px 0px #be185d'}}>
          Super Molar
      </h1>
      <h2 className="text-xl md:text-2xl mb-6 text-blue-300">Plaque Attack</h2>
      
      <div className="max-w-md bg-slate-800 p-6 rounded-lg border-2 border-slate-600 mb-6 w-full">
          <h3 className="text-yellow-400 text-sm mb-2">MISSION BRIEFING (GenAI):</h3>
          <p className="font-mono text-sm leading-relaxed typing-effect min-h-[60px]">
              {briefing}
          </p>
      </div>

      <div className="flex flex-col items-center gap-4 mb-8">
          <h3 className="text-xs text-slate-400 uppercase tracking-widest">Select Aiming Style</h3>
          <div className="flex gap-4">
              <button
                  onClick={() => setInputMethod('mouse')}
                  className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${inputMethod === 'mouse' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
              >
                  <MousePointer className="w-4 h-4" />
                  MOUSE AIM
              </button>
              <button
                  onClick={() => setInputMethod('keyboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${inputMethod === 'keyboard' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
              >
                  <Keyboard className="w-4 h-4" />
                  KEYBOARD ONLY
              </button>
          </div>
      </div>

      <button 
        onClick={onStart}
        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xl shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
      >
          START OPERATION
      </button>

      <div className="mt-8 text-xs text-slate-500 flex flex-col items-center gap-2">
          <p>CONTROLS ({inputMethod === 'mouse' ? 'MOUSE' : 'KEYBOARD'})</p>
          <div className="flex gap-4 flex-wrap justify-center">
              <span className="bg-slate-700 px-2 py-1 rounded">A / D : Move</span>
              {inputMethod === 'keyboard' && <span className="bg-slate-700 px-2 py-1 rounded">W / UP : Aim Up</span>}
              <span className="bg-slate-700 px-2 py-1 rounded">SPACE : Jump (x2)</span>
              {inputMethod === 'mouse' ? <span className="bg-slate-700 px-2 py-1 rounded">CLICK : Shoot</span> : <span className="bg-slate-700 px-2 py-1 rounded">F / K : Shoot</span>}
              <span className="bg-slate-700 px-2 py-1 rounded">SHIFT : Dash</span>
          </div>
      </div>
    </div>
  );
};
