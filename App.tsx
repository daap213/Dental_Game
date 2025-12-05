import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState } from './types';
import { Skull, RefreshCw, Trophy } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState("Diagnosis: Unknown");

  const handleGameOver = (score: number, message: string) => {
    setFinalScore(score);
    setGameOverMessage(message);
    setGameState(GameState.GAME_OVER);
  };

  const restartGame = () => {
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col overflow-hidden">
      {gameState !== GameState.GAME_OVER ? (
        <GameCanvas 
          onGameOver={handleGameOver} 
          gameState={gameState}
          setGameState={setGameState}
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-red-950 text-white p-8 animate-in fade-in duration-500">
          <Skull className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
          <h1 className="text-5xl font-bold mb-2 text-red-500 tracking-widest uppercase">GAME OVER</h1>
          <h2 className="text-2xl mb-8 text-red-300">The Cavities Won...</h2>
          
          <div className="bg-red-900/50 p-6 rounded-lg border border-red-700 max-w-md w-full mb-8 text-center shadow-xl">
             <div className="flex flex-col items-center gap-2 mb-4">
                <Trophy className="text-yellow-400 w-8 h-8" />
                <span className="text-3xl font-mono text-yellow-400">{finalScore.toString().padStart(6, '0')}</span>
             </div>
             <hr className="border-red-800 mb-4" />
             <p className="text-lg italic font-serif text-red-200">
               "{gameOverMessage}"
             </p>
             <div className="mt-4 text-xs text-red-400 uppercase tracking-widest">- General Gingivitis</div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setGameState(GameState.MENU)}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold flex items-center gap-2 transition-all"
            >
              MAIN MENU
            </button>
            <button 
              onClick={restartGame}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded text-white font-bold flex items-center gap-2 shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
