import React, { useState } from 'react';
import { InputMethod, LoadoutType, Language, Difficulty, CharacterType, type WeaponType } from '../../types';
import {
  Crosshair,
  Globe,
  Infinity as InfinityIcon,
  Info,
  Keyboard,
  MousePointer,
  Rocket,
  Sword,
  Target,
  Scissors,
  User,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { Credits } from './Credits';
import { IntelDatabase } from './IntelDatabase';
import { TEXT } from '../../i18n';
import { characterSummary } from '../../game/data/characters';
import { WEAPONS } from '../../game/data/weapons';
import { PixelPanel, PixelButton, PixelLabel, PixelKey } from '../ui/Pixel';
import { useFitScale } from '../useFitScale';

/**
 * Cómo se presenta cada arma en el menú: su icono y su color.
 *
 * `Record` sobre el union, así que un arma nueva sin aspecto es un error de compilación.
 */
const WEAPON_LOOK: Record<
  WeaponType,
  { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string }
> = {
  normal: { icon: Rocket, color: 'text-slate-300' },
  spread: { icon: Crosshair, color: 'text-blue-400' },
  laser: { icon: Zap, color: 'text-cyan-400' },
  mouthwash: { icon: Waves, color: 'text-purple-400' },
  floss: { icon: Wind, color: 'text-green-400' },
  toothbrush: { icon: Sword, color: 'text-orange-400' },
  bow: { icon: Target, color: 'text-amber-400' },
  scythe: { icon: Scissors, color: 'text-rose-400' },
};

interface MainMenuProps {
  onStart: () => void;
  briefing: string;
  inputMethod: InputMethod;
  setInputMethod: (method: InputMethod) => void;
  loadout: LoadoutType;
  setLoadout: (l: LoadoutType) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  character: CharacterType;
  setCharacter: (c: CharacterType) => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStart,
  briefing,
  inputMethod,
  setInputMethod,
  loadout,
  setLoadout,
  difficulty,
  setDifficulty,
  character,
  setCharacter,
  lang,
  setLang,
}) => {
  const [showIntel, setShowIntel] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const { containerRef, contentRef, scale } = useFitScale<HTMLDivElement, HTMLDivElement>();
  const t = TEXT[lang].menu;
  const c = TEXT[lang].characters;

  if (showCredits) {
    return <Credits onClose={() => setShowCredits(false)} lang={lang} />;
  }

  if (showIntel) {
    return <IntelDatabase onClose={() => setShowIntel(false)} lang={lang} />;
  }

  const weapons = TEXT[lang].weapons;
  /**
   * Las opciones de equipamiento salen de la lista canónica de armas, no de una lista
   * escrita a mano aquí.
   *
   * Estaban escritas una por una, así que un arma nueva quedaba **inseleccionable** sin que
   * nada fallara: ni error de compilación, ni test. El aspecto de cada una sí sigue siendo
   * un dato por arma, pero en un `Record` sobre el union, que sí exige la entrada nueva.
   */
  const loadoutOptions: Array<{
    id: LoadoutType;
    icon: React.ReactNode;
    label: string;
    color: string;
  }> = [
    {
      id: 'all',
      icon: <InfinityIcon className="h-5 w-5" strokeWidth={3} />,
      label: 'ALL',
      color: 'text-white',
    },
    ...WEAPONS.map((weapon) => ({
      id: weapon as LoadoutType,
      icon: React.createElement(WEAPON_LOOK[weapon].icon, {
        className: 'h-5 w-5',
        strokeWidth: 3,
      }),
      label: weapons[weapon].name.slice(0, 6),
      color: WEAPON_LOOK[weapon].color,
    })),
  ];

  const difficulties: Array<{ id: Difficulty; label: string; active: string }> = [
    { id: 'easy', label: t.diff_easy, active: 'bg-green-600 border-green-300 text-white' },
    { id: 'normal', label: t.diff_normal, active: 'bg-blue-600 border-blue-300 text-white' },
    { id: 'hard', label: t.diff_hard, active: 'bg-orange-600 border-orange-300 text-white' },
    { id: 'legend', label: t.diff_legend, active: 'bg-purple-600 border-purple-300 text-white' },
  ];

  // El resumen sale de `data/characters.ts`, así que la ficha de cada clase no
  // puede desviarse de lo que hace de verdad al empezar la partida.
  const characters: Array<{ id: CharacterType; label: string; summary: string }> = [
    { id: 'molar', label: c.molar, summary: characterSummary('molar') },
    { id: 'incisor', label: c.incisor, summary: characterSummary('incisor') },
    { id: 'canine', label: c.canine, summary: characterSummary('canine') },
    { id: 'premolar', label: c.premolar, summary: characterSummary('premolar') },
  ];

  return (
    <div
      ref={containerRef}
      className="pixel-crt relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-900 text-white"
    >
      {/* Rejilla de fondo: da profundidad sin usar degradados. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f472b6 1px, transparent 1px), linear-gradient(to bottom, #f472b6 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Todo el menú se escala hacia abajo si la ventana es baja, en vez de
          hacer scroll. A tamaños normales el factor es 1. */}
      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})` }}
        className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-3 p-3"
      >
        {/* CABECERA */}
        <header className="flex w-full shrink-0 items-center justify-between gap-3">
          <div className="w-28 shrink-0" />
          <div className="text-center">
            <h1 className="pixel-title text-2xl leading-none tracking-[0.15em] text-pink-300 uppercase md:text-4xl">
              Super Molar
            </h1>
            <p className="pixel-text-shadow mt-2 text-[10px] tracking-[0.3em] text-blue-300 uppercase md:text-xs">
              {t.subtitle}
            </p>
          </div>
          <PixelButton
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            activeClass=""
            className="flex w-28 shrink-0 items-center justify-center gap-1.5 px-2 py-2"
            title="Language"
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={3} />
            {lang === 'en' ? 'ES' : 'EN'}
          </PixelButton>
        </header>

        {/* TRES COLUMNAS: informe / equipo / reglas */}
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. INFORME DE MISIÓN */}
          <PixelPanel title={t.briefing_label} accent="border-green-700" className="flex flex-col">
            <div className="flex items-start gap-2">
              <span className="pixel-blink mt-0.5 h-2 w-2 shrink-0 bg-green-400" aria-hidden />
              <p className="text-[9px] leading-[1.9] text-green-300">
                {briefing === 'Loading Mission...' ? t.loading : briefing}
              </p>
            </div>
          </PixelPanel>

          {/* 2. CLASE + APUNTADO */}
          <div className="flex flex-col gap-3">
            <PixelPanel title={t.select_char} accent="border-pink-700">
              <div className="grid grid-cols-1 gap-1.5">
                {characters.map((option) => (
                  <PixelButton
                    key={option.id}
                    active={character === option.id}
                    onClick={() => setCharacter(option.id)}
                    activeClass="bg-pink-600 border-pink-300 text-white"
                    marker
                    className="flex flex-col items-start gap-1 px-2 py-2 text-left"
                  >
                    <span>{option.label}</span>
                    <span
                      // `slate-500` sobre el fondo de la tarjeta apagada daba
                      // 2,2:1 de contraste: los números de la clase que no está
                      // elegida —justo los que hacen falta para comparar— no se
                      // leían.
                      className={`font-mono text-[8px] leading-none ${
                        character === option.id ? 'text-pink-100' : 'text-slate-300'
                      }`}
                    >
                      {option.summary}
                    </span>
                  </PixelButton>
                ))}
              </div>
            </PixelPanel>

            <PixelPanel title={t.select_aim} accent="border-blue-800">
              <div className="grid grid-cols-2 gap-1.5">
                <PixelButton
                  active={inputMethod === 'mouse'}
                  onClick={() => setInputMethod('mouse')}
                  activeClass="bg-blue-600 border-blue-300 text-white"
                  className="flex items-center justify-center gap-1.5 px-1 py-2"
                >
                  <MousePointer className="h-3.5 w-3.5" strokeWidth={3} />
                  {t.mouse_aim}
                </PixelButton>
                <PixelButton
                  active={inputMethod === 'keyboard'}
                  onClick={() => setInputMethod('keyboard')}
                  activeClass="bg-blue-600 border-blue-300 text-white"
                  className="flex items-center justify-center gap-1.5 px-1 py-2"
                >
                  <Keyboard className="h-3.5 w-3.5" strokeWidth={3} />
                  {t.keyboard_aim}
                </PixelButton>
              </div>
            </PixelPanel>
          </div>

          {/* 3. DIFICULTAD + ARMAMENTO */}
          <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-1">
            <PixelPanel title={t.select_difficulty} accent="border-amber-700">
              <div className="grid grid-cols-2 gap-1.5">
                {difficulties.map((option) => (
                  <PixelButton
                    key={option.id}
                    active={difficulty === option.id}
                    onClick={() => setDifficulty(option.id)}
                    activeClass={option.active}
                    marker
                    className="px-1 py-2"
                  >
                    {option.label}
                  </PixelButton>
                ))}
              </div>
            </PixelPanel>

            <PixelPanel title={t.select_loadout} accent="border-cyan-800">
              <div className="grid grid-cols-4 gap-1.5">
                {loadoutOptions.map((option) => (
                  <PixelButton
                    key={option.id}
                    active={loadout === option.id}
                    onClick={() => setLoadout(option.id)}
                    activeClass="bg-slate-600 border-white text-white"
                    className="flex flex-col items-center justify-center gap-1 px-0.5 py-1.5"
                    title={option.label}
                  >
                    <span className={loadout === option.id ? 'text-white' : option.color}>
                      {option.icon}
                    </span>
                    <span className="text-[7px]">{option.label}</span>
                  </PixelButton>
                ))}
              </div>
              <p className="mt-2 text-center text-[7px] leading-relaxed text-slate-500">
                {loadout === 'all' ? t.loadout_all : t.loadout_specific}
              </p>
            </PixelPanel>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-3">
          <PixelButton
            onClick={() => setShowIntel(true)}
            activeClass=""
            className="flex items-center gap-2 px-4 py-3"
          >
            <Info className="h-4 w-4" strokeWidth={3} />
            {t.btn_knowledge}
          </PixelButton>

          <button
            type="button"
            onClick={onStart}
            className="pixel-btn pixel-text-shadow cursor-pointer border-red-300 bg-red-600 px-8 py-3 text-xs tracking-[0.2em] text-white uppercase hover:bg-red-500 md:text-sm"
          >
            <span aria-hidden className="pixel-blink mr-2">
              ▶
            </span>
            {t.btn_start}
          </button>

          <PixelButton
            onClick={() => setShowCredits(true)}
            activeClass=""
            className="flex items-center gap-2 px-4 py-3"
          >
            <User className="h-4 w-4" strokeWidth={3} />
            {t.btn_credits}
          </PixelButton>
        </div>

        {/* CONTROLES */}
        <div className="flex w-full shrink-0 flex-col items-center gap-1.5">
          <PixelLabel>
            {t.controls} · {inputMethod === 'mouse' ? 'MOUSE' : 'KEYBOARD'}
          </PixelLabel>
          <div className="flex flex-wrap justify-center gap-1.5">
            <PixelKey>A / D · {t.ctrl_move}</PixelKey>
            {inputMethod === 'keyboard' && <PixelKey>W · {t.ctrl_aim}</PixelKey>}
            <PixelKey>SPACE · {t.ctrl_jump}</PixelKey>
            <PixelKey>
              {inputMethod === 'mouse' ? 'CLICK' : 'F / K'} · {t.ctrl_shoot}
            </PixelKey>
            <PixelKey>SHIFT · {t.ctrl_dash}</PixelKey>
          </div>
        </div>
      </div>
    </div>
  );
};
