
import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/views/MainMenu';
import { GameOver } from './components/views/GameOver';
import { PauseMenu } from './components/views/PauseMenu';
import { PerkMenu } from './components/views/PerkMenu';
import { Credits } from './components/views/Credits';
import { SpriteGallery, galleryPageFromSearch } from './components/views/SpriteGallery';
import { LegalScreen } from './components/views/LegalScreen';
import {
  legalTargetFromLocation,
  pathForLegalTab,
  type LegalTabId,
} from './components/views/legalRoute';
import { useViewportSize } from './components/useViewportSize';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/data/physics';
import { GameState, InputMethod, Perk, LoadoutType, Language, Difficulty, CharacterType } from './types';

/**
 * `?sprites=palette|player|enemies|bosses` abre la galería de arte en lugar del
 * juego. Es una herramienta de revisión: permite ver toda la paleta y todos los
 * sprites de una vez, sin tener que jugar hasta encontrarse con cada cosa.
 */
const galleryPage =
  typeof window === 'undefined' ? null : galleryPageFromSearch(window.location.search);

const App: React.FC = () => {
  const {
    containerRef: viewportRef,
    width: viewportWidth,
    height: viewportHeight,
    supersample,
  } = useViewportSize<HTMLDivElement>(CANVAS_WIDTH, CANVAS_HEIGHT);

  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [sessionId, setSessionId] = useState(0);
  const [inputMethod, setInputMethod] = useState<InputMethod>('mouse');
  const [loadout, setLoadout] = useState<LoadoutType>('all');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [character, setCharacter] = useState<CharacterType>('molar');

  /**
   * Los créditos se abren desde el menú, desde la pantalla legal y al ganar, así
   * que el estado vive aquí en vez de dentro del menú: sin esto, la pantalla
   * legal no tendría forma de enlazarlos.
   */
  const [showCredits, setShowCredits] = useState(false);

  /**
   * La pantalla legal se inicializa **desde la URL** —para que
   * `.../privacy` sea un enlace que se pueda pegar en un correo— y a la vez vive
   * en estado, para poder cerrarse *hacia dentro* del juego.
   *
   * Va como capa superpuesta y **no** como corto-circuito antes de `GameCanvas`,
   * que es lo que hace `?sprites=`: ese patrón desmontaría el lienzo, y
   * "GameCanvas no se desmonta nunca" es un invariante del proyecto.
   * `SpriteGallery` se lo puede permitir porque es una herramienta interna que
   * se cierra cerrando la pestaña.
   */
  const [legal, setLegal] = useState<LegalTabId | null>(() =>
    typeof window === 'undefined'
      ? null
      : legalTargetFromLocation(window.location.pathname, window.location.search)
  );

  // `replaceState` y no `pushState`: una entrada de historial falsa a mitad de
  // sesión es peor que una capa a la que el botón Atrás no vuelve.
  const openLegal = (tab: LegalTabId) => {
    setShowCredits(false);
    setLegal(tab);
    window.history.replaceState(null, '', pathForLegalTab(tab));
  };

  const closeLegal = () => {
    setLegal(null);
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
  };

  // El idioma de la interfaz tiene que llegar al documento: los lectores de
  // pantalla y los traductores del navegador leen `lang`, y el juego lo cambia
  // en caliente desde el menú.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleGameOver = (score: number) => {
    setFinalScore(score);
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

  if (galleryPage) return <SpriteGallery page={galleryPage} lang={language} />;

  return (
    /**
     * Dos capas, y esto es la parte que importa:
     *
     * - **el juego** vive en una caja de proporción 16:9 centrada, porque su
     *   imagen es una retícula de 800×450 y estirarla a la ventana la
     *   deformaría;
     * - **la interfaz** ocupa la ventana entera.
     *
     * Antes los menús iban dentro de la caja, y como la caja se calculaba en
     * múltiplos exactos de 800×450, en una ventana de 1536×695 la interfaz
     * entera quedaba encerrada en un recuadro de 800×450 en medio de la
     * pantalla. Un menú es texto y cajas: no tiene retícula que respetar, así
     * que no tiene por qué pagar ese peaje.
     */
    <div
      ref={viewportRef}
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black"
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
        supersample={supersample}
      />
      </div>

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50">
          <MainMenu
            onStart={startGame}
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
            onCredits={() => setShowCredits(true)}
            onLegal={openLegal}
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
          onRestart={startGame}
          onQuit={() => setGameState(GameState.MENU)}
          lang={language}
        />
      )}

      {(gameState === GameState.VICTORY || showCredits) && (
        <Credits
          onClose={() => {
            setShowCredits(false);
            if (gameState === GameState.VICTORY) setGameState(GameState.MENU);
          }}
          onLegal={() => openLegal('terms')}
          lang={language}
        />
      )}

      {/* Por encima del resto de capas: se puede llegar desde el menú, desde los
          créditos y directamente por URL. */}
      {legal && (
        <LegalScreen
          tab={legal}
          onTab={openLegal}
          onClose={closeLegal}
          onCredits={() => {
            closeLegal();
            setShowCredits(true);
          }}
          lang={language}
          setLang={setLanguage}
        />
      )}
    </div>
  );
};

export default App;
