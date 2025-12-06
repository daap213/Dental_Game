
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/views/MainMenu';
import { GameOver } from './components/views/GameOver';
import { PauseMenu } from './components/views/PauseMenu';
import { PerkMenu } from './components/views/PerkMenu';
import { Credits } from './components/views/Credits';
import { GameState, InputMethod, Perk, LoadoutType, Language } from './types';
import { generateBriefing } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState("Diagnosis: Unknown");
  const [sessionId, setSessionId] = useState(0);
  const [briefing, setBriefing] = useState<string>("Loading Mission...");
  const [inputMethod, setInputMethod] = useState<InputMethod>('mouse');
  const [loadout, setLoadout] = useState<LoadoutType>('all');
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    if (gameState === GameState.MENU) {
       generateBriefing(language).then(setBriefing);
    }
  }, [gameState, language]);

  const handleGameOver = (score: number, message: string) => {
    setFinalScore(score);
    setGameOverMessage(message);
    setGameState(GameState.GAME_OVER);
  };

  const startGame = () => {
    setSessionId(s => s + 1);
    setGameState(GameState.PLAYING);
  };

  const handlePerkSelectionStart = (perks: Perk[]) => {
      setAvailablePerks(perks);
      setSelectedPerkId(null);
      setGameState(GameState.PERK_SELECTION);
  };

  const handlePerkSelect = (perkId: string) => {
      setSelectedPerkId(perkId);
      // Actual application handled in GameCanvas via effect, then it calls back
  };

  const handlePerkApplied = () => {
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
        loadout={loadout}
        onPerkSelectStart={handlePerkSelectionStart}
        selectedPerkId={selectedPerkId}
        onPerkApplied={handlePerkApplied}
        onVictory={() => setGameState(GameState.VICTORY)}
        lang={language}
      />

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50">
          <MainMenu 
            onStart={startGame} 
            briefing={briefing} 
            inputMethod={inputMethod}
            setInputMethod={setInputMethod}
            loadout={loadout}
            setLoadout={setLoadout}
            lang={language}
            setLang={setLanguage}
          />
        </div>
      )}

      {gameState === GameState.PAUSED && (
        <PauseMenu 
          onResume={() => setGameState(GameState.PLAYING)}
          onRestart={startGame}
          onQuit={() => setGameState(GameState.MENU)}
          lang={language}
        />
      )}

      {gameState === GameState.PERK_SELECTION && (
          <PerkMenu 
             perks={availablePerks}
             onSelect={handlePerkSelect}
             lang={language}
          />
      )}

      {gameState === GameState.GAME_OVER && (
        <GameOver 
          score={finalScore}
          message={gameOverMessage}
          onRestart={startGame}
          onQuit={() => setGameState(GameState.MENU)}
          lang={language}
        />
      )}

      {gameState === GameState.VICTORY && (
          <Credits onClose={() => setGameState(GameState.MENU)} lang={language} />
      )}
    </div>
  );
};

export default App;
