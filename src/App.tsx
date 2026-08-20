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
import { GameState, Perk, type RunResult } from './types';
import { useSettings } from './storage/useSettings';
import type { ScoreEntry } from './storage/scores';
import { HighScores } from './components/views/HighScores';
import { Settings } from './components/views/Settings';
import { NicknameDialog } from './components/views/NicknameDialog';

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
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);

  /**
   * Idioma, dificultad, clase, equipamiento, teclas y volumen **ya no son estado
   * suelto**: viven en los ajustes, que se leen del navegador al arrancar y se
   * guardan solos. Antes eran cinco `useState` que se perdían en cada recarga.
   */
  const store = useSettings();
  const { settings, scores } = store;
  const { language, difficulty, character, loadout, bindings } = settings;

  /** Partida terminada a la espera de apodo, y la fila que se acaba de anotar. */
  const [pendingRun, setPendingRun] = useState<RunResult | null>(null);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  /**
   * El **único** embudo de fin de partida, gane o pierda.
   *
   * Antes eran dos caminos separados y la victoria no publicaba puntuación
   * ninguna, así que al ganar la pantalla mostraba el cero —o lo de la partida
   * anterior—. Ahora las dos salidas traen el mismo resultado y pasan por aquí.
   *
   * Si aún no hay apodo se abre el diálogo **antes** de cambiar de pantalla; con
   * apodo, la partida se anota y se sigue. Se pregunta una sola vez en la vida.
   */
  const handleRunEnd = (result: RunResult) => {
    setFinalScore(result.score);
    if (settings.nickname) {
      commitRun(result, settings.nickname);
      setGameState(result.outcome === 'victory' ? GameState.VICTORY : GameState.GAME_OVER);
      return;
    }
    setPendingRun(result);
  };

  const commitRun = (result: RunResult, nickname: string) => {
    const entry: ScoreEntry = {
      // La fecha se toma **aquí**, en la capa de React: dentro de la simulación
      // no puede haber relojes de pared.
      id: `${Date.now()}-${result.score}`,
      date: new Date().toISOString().slice(0, 10),
      nickname,
      score: result.score,
      character: settings.character,
      difficulty: settings.difficulty,
      stage: result.stage,
      kills: result.kills,
      ms: result.ms,
      outcome: result.outcome,
    };
    store.recordScore(entry);
    setLastEntryId(entry.id);
  };

  const startGame = () => {
    setSessionId((s) => s + 1);
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
          onRunEnd={handleRunEnd}
          gameState={gameState}
          setGameState={setGameState}
          sessionId={sessionId}
          loadout={loadout}
          difficulty={difficulty}
          character={character}
          onPerkSelectStart={handlePerkSelectionStart}
          selectedPerkId={selectedPerkId}
          onPerkApplied={handlePerkApplied}
          lang={language}
          bindings={bindings}
          music={settings.music}
          sfx={settings.sfx}
          overlayOpen={
            showSettings || showRecords || showCredits || legal !== null || pendingRun !== null
          }
          supersample={supersample}
        />
      </div>

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50">
          <MainMenu
            onStart={startGame}
            loadout={loadout}
            setLoadout={store.setLoadout}
            difficulty={difficulty}
            setDifficulty={store.setDifficulty}
            character={character}
            setCharacter={store.setCharacter}
            lang={language}
            setLang={store.setLanguage}
            onCredits={() => setShowCredits(true)}
            onLegal={openLegal}
            onRecords={() => setShowRecords(true)}
            onSettings={() => setShowSettings(true)}
            bindings={bindings}
            scores={scores}
          />
        </div>
      )}

      {gameState === GameState.PAUSED && (
        <PauseMenu
          onResume={() => setGameState(GameState.PLAYING)}
          onRestart={startGame}
          onQuit={() => setGameState(GameState.MENU)}
          onSettings={() => setShowSettings(true)}
          lang={language}
        />
      )}

      {gameState === GameState.PERK_SELECTION && (
        <PerkMenu perks={availablePerks} onSelect={handlePerkSelect} lang={language} />
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

      {showRecords && (
        <HighScores
          scores={scores}
          highlight={lastEntryId}
          onClose={() => setShowRecords(false)}
          lang={language}
        />
      )}

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          lang={language}
          setLang={store.setLanguage}
          nickname={settings.nickname}
          setNickname={store.setNickname}
          bindings={bindings}
          setBindings={store.setBindings}
          music={settings.music}
          sfx={settings.sfx}
          setMusic={store.setMusic}
          setSfx={store.setSfx}
          onErase={store.eraseEverything}
          onPrivacy={() => {
            setShowSettings(false);
            openLegal('privacy');
          }}
        />
      )}

      {/* Se pregunta antes de cambiar de pantalla, así que va por encima de todo
          y sin salida que no guarde la partida. */}
      {pendingRun && (
        <NicknameDialog
          score={pendingRun.score}
          lang={language}
          onSubmit={(nickname) => {
            store.setNickname(nickname);
            commitRun(pendingRun, nickname);
            setGameState(
              pendingRun.outcome === 'victory' ? GameState.VICTORY : GameState.GAME_OVER
            );
            setPendingRun(null);
          }}
          onPrivacy={() => openLegal('privacy')}
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
          setLang={store.setLanguage}
        />
      )}
    </div>
  );
};

export default App;
