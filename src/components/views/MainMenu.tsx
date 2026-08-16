import React, { useState } from 'react';
import { InputMethod, LoadoutType, Language, Difficulty, CharacterType } from '../../types';
import {
  MousePointer,
  Keyboard,
  Info,
  X,
  ShieldAlert,
  Crosshair,
  Skull,
  Sword,
  Zap,
  Wind,
  Waves,
  Rocket,
  User,
  Trophy,
  Gift,
  Star,
  Activity,
  Shield,
  Heart,
  Infinity as InfinityIcon,
  Globe,
} from 'lucide-react';
import { Credits } from './Credits';
import { TEXT } from '../../i18n';
import { characterSummary } from '../../game/data/characters';
import { PixelPanel, PixelButton, PixelLabel, PixelKey } from '../ui/Pixel';
import { useFitScale } from '../useFitScale';

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
    {
      id: 'normal',
      icon: <Rocket className="h-5 w-5" strokeWidth={3} />,
      label: weapons.normal.name.slice(0, 6),
      color: 'text-slate-300',
    },
    {
      id: 'spread',
      icon: <Crosshair className="h-5 w-5" strokeWidth={3} />,
      label: weapons.spread.name.slice(0, 6),
      color: 'text-blue-400',
    },
    {
      id: 'laser',
      icon: <Zap className="h-5 w-5" strokeWidth={3} />,
      label: weapons.laser.name.slice(0, 6),
      color: 'text-cyan-400',
    },
    {
      id: 'mouthwash',
      icon: <Waves className="h-5 w-5" strokeWidth={3} />,
      label: weapons.mouthwash.name.slice(0, 6),
      color: 'text-purple-400',
    },
    {
      id: 'floss',
      icon: <Wind className="h-5 w-5" strokeWidth={3} />,
      label: weapons.floss.name.slice(0, 6),
      color: 'text-green-400',
    },
    {
      id: 'toothbrush',
      icon: <Sword className="h-5 w-5" strokeWidth={3} />,
      label: weapons.toothbrush.name.slice(0, 6),
      color: 'text-orange-400',
    },
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
                      className={`font-mono text-[7px] leading-none ${
                        character === option.id ? 'text-pink-100' : 'text-slate-500'
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

const IntelDatabase: React.FC<{ onClose: () => void; lang: Language }> = ({ onClose, lang }) => {
  const t = TEXT[lang].database;
  const w = TEXT[lang].weapons;
  const pn = TEXT[lang].perk_names;
  const en = TEXT[lang].enemy_names;
  const ed = TEXT[lang].enemy_desc;
  const bn = TEXT[lang].bosses;
  const bd = TEXT[lang].boss_desc;

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 overflow-y-auto p-4 md:p-8 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b-4 border-slate-700 pb-3 sticky top-0 bg-slate-900 z-10 pt-2">
          <h2 className="text-2xl md:text-3xl font-bold text-green-400 tracking-widest flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            {t.title}
          </h2>
          <button
            onClick={onClose}
            className="pixel-btn border-red-300 bg-red-600 p-2 text-white hover:bg-red-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
          {/* ACHIEVEMENTS (LOGROS) */}
          <section className="pixel-frame pixel-dither bg-slate-800 border-slate-600 p-4">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2 border-b border-yellow-900 pb-2">
              <Trophy className="w-5 h-5" /> {t.achievements_title}
            </h3>
            <p className="text-sm text-slate-400 mb-4">{t.achievements_desc}</p>
            <div className="space-y-3">
              <AchievementRow
                icon={<Star className="w-4 h-4" />}
                title={t.ach_score_title}
                desc={t.ach_score_desc}
                color="text-yellow-200"
              />
              <AchievementRow
                icon={<Skull className="w-4 h-4" />}
                title={t.ach_kill_title}
                desc={t.ach_kill_desc}
                color="text-red-300"
              />
              <AchievementRow
                icon={<Trophy className="w-4 h-4" />}
                title={t.ach_boss_title}
                desc={t.ach_boss_desc}
                color="text-purple-300"
              />
            </div>
          </section>

          {/* REWARDS (RECOMPENSAS) */}
          <section className="pixel-frame pixel-dither bg-slate-800 border-slate-600 p-4">
            <h3 className="text-xl font-bold text-pink-400 mb-4 flex items-center gap-2 border-b border-pink-900 pb-2">
              <Gift className="w-5 h-5" /> {t.rewards_title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PerkCard
                name={pn.enamel_shield.name}
                desc={pn.enamel_shield.desc}
                icon={<Shield className="w-4 h-4" />}
                color="text-cyan-400"
              />
              <PerkCard
                name={pn.vitality_root.name}
                desc={pn.vitality_root.desc}
                icon={<Activity className="w-4 h-4" />}
                color="text-red-400"
              />
              <PerkCard
                name={pn.aerodynamic_floss.name}
                desc={pn.aerodynamic_floss.desc}
                icon={<Wind className="w-4 h-4" />}
                color="text-yellow-400"
              />
              <PerkCard
                name={pn.extra_dash.name}
                desc={pn.extra_dash.desc}
                icon={<Wind className="w-4 h-4" />}
                color="text-orange-400"
              />
              <PerkCard
                name={pn.thick_enamel.name}
                desc={pn.thick_enamel.desc}
                icon={<Shield className="w-4 h-4" />}
                color="text-indigo-400"
              />
              <PerkCard
                name={pn.temp_immunity.name}
                desc={pn.temp_immunity.desc}
                icon={<Zap className="w-4 h-4" />}
                color="text-purple-400"
              />
              <PerkCard
                name={pn.extra_life.name}
                desc={pn.extra_life.desc}
                icon={<Heart className="w-4 h-4" />}
                color="text-yellow-300"
              />
              <PerkCard
                name={pn.bristle_rage.name}
                desc={pn.bristle_rage.desc}
                icon={<Sword className="w-4 h-4" />}
                color="text-pink-400"
              />
            </div>
          </section>

          {/* WEAPONS */}
          <section className="pixel-frame pixel-dither bg-slate-800 border-slate-600 p-4">
            <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2 border-b border-blue-900 pb-2">
              <Crosshair className="w-5 h-5" /> {t.arsenal_title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WeaponCard
                icon={<Rocket />}
                name={w.normal.name}
                desc={w.normal.desc}
                color="text-gray-300"
              />
              <WeaponCard
                icon={<Zap />}
                name={w.laser.name}
                desc={w.laser.desc}
                color="text-cyan-400"
              />
              <WeaponCard
                icon={<Crosshair />}
                name={w.spread.name}
                desc={w.spread.desc}
                color="text-blue-500"
              />
              <WeaponCard
                icon={<Waves />}
                name={w.mouthwash.name}
                desc={w.mouthwash.desc}
                color="text-purple-400"
              />
              <WeaponCard
                icon={<Wind />}
                name={w.floss.name}
                desc={w.floss.desc}
                color="text-green-400"
              />
              <WeaponCard
                icon={<Sword />}
                name={w.toothbrush.name}
                desc={w.toothbrush.desc}
                color="text-orange-400"
              />
            </div>
          </section>

          {/* BOSSES */}
          <section className="pixel-frame pixel-dither bg-slate-800 border-slate-600 p-4">
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2 border-b border-red-900 pb-2">
              <Skull className="w-5 h-5" /> {t.bosses_title}
            </h3>
            <div className="space-y-4">
              <EnemyRow name={bn.king} type="Level 1" desc={bd.king} color="text-gray-400" />
              <EnemyRow name={bn.phantom} type="Level 2" desc={bd.phantom} color="text-cyan-300" />
              <EnemyRow name={bn.tank} type="Level 3" desc={bd.tank} color="text-stone-400" />
              <EnemyRow name={bn.general} type="Level 4" desc={bd.general} color="text-red-500" />
              <EnemyRow name={bn.deity} type="Level 5" desc={bd.deity} color="text-purple-500" />
            </div>
          </section>

          {/* ENEMIES */}
          <section className="pixel-frame pixel-dither bg-slate-800 border-slate-600 p-4 lg:col-span-2">
            <h3 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2 border-b border-yellow-900/50 pb-2">
              <ShieldAlert className="w-5 h-5" /> {t.enemies_title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <EnemyCard name={en.bacteria} desc={ed.bacteria} />
              <EnemyCard name={en.plaque} desc={ed.plaque} />
              <EnemyCard name={en.bomber} desc={ed.bomber} />
              <EnemyCard name={en.turret} desc={ed.turret} />
              <EnemyCard name={en.rusher} desc={ed.rusher} />
              <EnemyCard name={en.fiend} desc={ed.fiend} />
              <EnemyCard name={en.spitter} desc={ed.spitter} />
              <EnemyCard name={en.grunt} desc={ed.grunt} />
            </div>
          </section>
        </div>

        <div className="text-center pb-8">
          <button
            onClick={onClose}
            className="pixel-btn border-slate-500 bg-slate-700 px-8 py-3 text-white hover:bg-slate-600"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

const AchievementRow = ({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) => (
  <div className="flex items-center gap-3 pixel-inset bg-slate-900 border-slate-700 p-2">
    <div className={`pixel-inset border-slate-700 bg-slate-800 p-1.5 ${color}`}>{icon}</div>
    <div>
      <h4 className={`font-bold text-sm ${color}`}>{title}</h4>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  </div>
);

const PerkCard = ({
  icon,
  name,
  desc,
  color,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  color: string;
}) => (
  <div className="flex items-start gap-3 pixel-inset bg-slate-900 border-slate-700 p-2">
    <div className={`pixel-inset border-slate-700 bg-slate-800 p-1.5 ${color}`}>{icon}</div>
    <div>
      <h4 className={`font-bold text-xs ${color} uppercase`}>{name}</h4>
      <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
    </div>
  </div>
);

const WeaponCard = ({
  icon,
  name,
  desc,
  color,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  color: string;
}) => (
  <div className="flex items-start gap-3 pixel-inset bg-slate-900 border-slate-700 p-2">
    <div className={`${color} pixel-inset border-slate-700 bg-slate-800 p-2`}>{icon}</div>
    <div>
      <h4 className={`font-bold text-sm ${color} uppercase`}>{name}</h4>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  </div>
);

const EnemyRow = ({
  name,
  type,
  desc,
  color,
}: {
  name: string;
  type: string;
  desc: string;
  color: string;
}) => (
  <div className="flex justify-between items-center pixel-inset bg-slate-900 border-red-900 p-2">
    <div>
      <h4 className={`font-bold ${color}`}>{name}</h4>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
    <span className="pixel-inset border-slate-700 bg-slate-800 px-2 py-1 text-[8px] text-slate-300">
      {type}
    </span>
  </div>
);

const EnemyCard = ({ name, desc }: { name: string; desc: string }) => (
  <div className="pixel-inset bg-slate-900 border-slate-700 p-2">
    <h4 className="font-bold text-sm text-yellow-100 mb-1">{name}</h4>
    <p className="text-xs text-slate-400 leading-tight">{desc}</p>
  </div>
);
