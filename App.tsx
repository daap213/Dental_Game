
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/views/MainMenu';
import { GameOver } from './components/views/GameOver';
import { PauseMenu } from './components/views/PauseMenu';
import { GameState, InputMethod } from './types';
import { generateBriefing } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState("Diagnosis: Unknown");
  const [sessionId, setSessionId] = useState(0);
  const [briefing, setBriefing] = useState<string>("Loading Mission...");
  const [inputMethod, setInputMethod] = useState<InputMethod>('mouse');

  useEffect(() => {
    if (gameState === GameState.MENU) {
       generateBriefing().then(setBriefing);
    }
  }, [gameState]);

  const handleGameOver = (score: number, message: string) => {
    setFinalScore(score);
    setGameOverMessage(message);
    setGameState(GameState.GAME_OVER);
  };

  const startGame = () => {
    setSessionId(s => s + 1);
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col overflow-hidden relative">
      <GameCanvas 
        onGameOver={handleGameOver} 
        gameState={gameState}
        setGameState={setGameState}
        sessionId={sessionId}
        inputMethod={inputMethod}
      />

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50">
          <MainMenu 
            onStart={startGame} 
            briefing={briefing} 
            inputMethod={inputMethod}
            setInputMethod={setInputMethod}
          />
        </div>
      )}

      {gameState === GameState.PAUSED && (
        <PauseMenu 
          onResume={() => setGameState(GameState.PLAYING)}
          onRestart={startGame}
          onQuit={() => setGameState(GameState.MENU)}
        />
      )}

      {gameState === GameState.GAME_OVER && (
        <GameOver 
          score={finalScore}
          message={gameOverMessage}
          onRestart={startGame}
          onQuit={() => setGameState(GameState.MENU)}
        />
      )}
    </div>
  );
};

export default App;
