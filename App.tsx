import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState } from './types';
import { Skull, RefreshCw, Trophy, Play, Home, Pause } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState("Diagnosis: Unknown");
  const [sessionId, setSessionId] = useState(0);

  const handleGameOver = (score: number, message: string) => {
    setFinalScore(score);
    setGameOverMessage(message);
    setGameState(GameState.GAME_OVER);
  };

  const startGame = () => {
    setSessionId(s => s + 1);
    setGameState(GameState.PLAYING);
  };

  const resumeGame = () => {
    setGameState(GameState.PLAYING);
  };

  const quitToMenu = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col overflow-hidden relative">
      {/* Game Layer */}
      <GameCanvas 
        onGameOver={handleGameOver} 
        gameState={gameState}
        setGameState={setGameState}
        sessionId={sessionId}
      />

      {/* Pause Menu Overlay */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-slate-800 p-8 rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col gap-4 min-w-[300px]">
              <h2 className="text-3xl font-bold text-white text-center mb-4 flex items-center justify-center gap-2">
                <Pause className="w-8 h-8 text-blue-400" />
                PAUSED
              </h2>
              
              <button 
                onClick={resumeGame}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:translate-y-1 active:shadow-none"
              >
                <Play className="w-5 h-5" />
                RESUME
              </button>

              <button 
                onClick={startGame}
                className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold flex items-center justify-center gap-2 transition-all active:translate-y-1"
              >
                <RefreshCw className="w-5 h-5" />
                RESTART
              </button>

              <button 
                onClick={quitToMenu}
                className="w-full px-6 py-4 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded font-bold flex items-center justify-center gap-2 transition-all border border-red-900 active:translate-y-1"
              >
                <Home className="w-5 h-5" />
                QUIT TO MENU
              </button>
           </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950 text-white p-8 animate-in fade-in duration-500">
          <Skull className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
          <h1 className="text-5xl font-bold mb-2 text-red-500 tracking-widest uppercase text-center">GAME OVER</h1>
          <h2 className="text-2xl mb-8 text-red-300 text-center">The Cavities Won...</h2>
          
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

          <div className="flex gap-4 flex-wrap justify-center">
            <button 
              onClick={quitToMenu}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold flex items-center gap-2 transition-all"
            >
              MAIN MENU
            </button>
            <button 
              onClick={startGame}
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