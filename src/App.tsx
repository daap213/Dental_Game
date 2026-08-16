
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/views/MainMenu';
import { GameOver } from './components/views/GameOver';
import { PauseMenu } from './components/views/PauseMenu';
import { PerkMenu } from './components/views/PerkMenu';
import { Credits } from './components/views/Credits';
import { SpriteGallery } from './components/views/SpriteGallery';
import { useIntegerScale } from './components/useIntegerScale';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/data/physics';
import { GameState, InputMethod, Perk, LoadoutType, Language, Difficulty, CharacterType } from './types';
import { generateBriefing } from './services/geminiService';

/**
 * `?sprites=1` abre la galería de arte en lugar del juego. Es una herramienta de
 * revisión: permite ver la paleta y todos los sprites de una vez.
 */
const showGallery =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sprites');

const App: React.FC = () => {
  const {
    containerRef: viewportRef,
    width: viewportWidth,
    height: viewportHeight,
  } = useIntegerScale<HTMLDivElement>(CANVAS_WIDTH, CANVAS_HEIGHT);

  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState("Diagnosis: Unknown");
  const [sessionId, setSessionId] = useState(0);
  const [briefing, setBriefing] = useState<string>("Loading Mission...");
  const [inputMethod, setInputMethod] = useState<InputMethod>('mouse');
  const [loadout, setLoadout] = useState<LoadoutType>('all');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [character, setCharacter] = useState<CharacterType>('molar');

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
  };

  const handlePerkApplied = () => {
      setGameState(GameState.PLAYING);
  };

  if (showGallery) return <SpriteGallery />;

  return (
    /**
     * Pantalla virtual: el juego y toda su interfaz viven dentro de una caja de
     * 800×450 escalada por un número entero, centrada, con el resto en negro.
     *
     * Es lo que mantiene la interfaz pegada al juego: si los menús se
     * dimensionaran a la ventana y el lienzo a su múltiplo exacto, las tarjetas
     * de mejora acabarían siendo más anchas que el propio juego.
     */
    <div
      ref={viewportRef}
      className="flex h-screen w-full items-center justify-center overflow-hidden bg-black"
    >
      <div
        className="relative flex flex-col overflow-hidden bg-slate-900"
        style={{ width: viewportWidth, height: viewportHeight }}
      >
      <GameCanvas
        onGameOver={handleGameOver} 
        gameState={gameState}
        setGameState={setGameState}
        sessionId={sessionId}
        inputMethod={inputMethod}
        loadout={loadout}
        difficulty={difficulty}
        character={character}
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
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            character={character}
            setCharacter={setCharacter}
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
    </div>
  );
};

export default App;
