import React, { useState } from 'react';
import {
  Crosshair,
  Globe,
  Infinity as InfinityIcon,
  Info,
  Rocket,
  Scissors,
  SlidersHorizontal,
  Sword,
  Target,
  Trophy,
  User,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { LoadoutType, Language, Difficulty, CharacterType, type WeaponType } from '../../types';
import { IntelDatabase } from './IntelDatabase';
import { TEXT } from '../../i18n';
import { characterSummary } from '../../game/data/characters';
import { WEAPONS } from '../../game/data/weapons';
import { briefingText, randomBriefingId } from '../../game/briefings';
import { ACTIONS, ACTION_SPECS, codeLabel, type Bindings } from '../../game/data/controls';
import { SITE_NAME, copyrightLine } from '../../legal/identity';
import { previewItem } from '../../game/render/preview';
import type { ScoreEntry } from '../../storage/scores';
import { PixelPanel, PixelButton, PixelLabel, PixelKey } from '../ui/Pixel';
import { PixelSegmented, type ChoiceOption } from '../ui/PixelChoice';
import { PixelCanvas } from '../PixelCanvas';
import { MenuBackground } from '../MenuBackground';
import type { LegalTabId } from './legalRoute';

/**
 * La portada.
 *
 * **Ya no usa `useFitScale`**, y esa es la diferencia que importa. Aquel encoge
 * el contenido para que quepa, y como el contenido va a `max-w`, en la práctica
 * solo encogía en vertical: en un teléfono la rejilla caía a una columna, el
 * alto se triplicaba y el hook respondía multiplicando **todo** por ~0,6,
 * incluida la tipografía de 7 px. Cuatro píxeles de letra no son un diseño
 * adaptable. Ahora hay puntos de ruptura de verdad y, cuando no cabe, se
 * desplaza —que es lo que se hace con una pantalla larga—.
 *
 * `useFitScale` sigue existiendo para los créditos y el fin de partida, que sí
 * son composiciones fijas que se quieren ver enteras.
 */

/** Cómo se presenta cada arma. `Record` sobre el union: un arma nueva no compila. */
const WEAPON_LOOK: Record<WeaponType, { icon: React.ReactNode; color: string }> = {
  normal: { icon: <Rocket className="h-4 w-4" strokeWidth={3} />, color: 'text-slate-300' },
  spread: { icon: <Target className="h-4 w-4" strokeWidth={3} />, color: 'text-blue-300' },
  laser: { icon: <Zap className="h-4 w-4" strokeWidth={3} />, color: 'text-cyan-300' },
  mouthwash: { icon: <Waves className="h-4 w-4" strokeWidth={3} />, color: 'text-purple-300' },
  floss: { icon: <Wind className="h-4 w-4" strokeWidth={3} />, color: 'text-green-300' },
  toothbrush: { icon: <Sword className="h-4 w-4" strokeWidth={3} />, color: 'text-orange-300' },
  bow: { icon: <Crosshair className="h-4 w-4" strokeWidth={3} />, color: 'text-yellow-300' },
  scythe: { icon: <Scissors className="h-4 w-4" strokeWidth={3} />, color: 'text-pink-300' },
};

/** Colores de la dificultad. Presentación, así que no bajan a `data/`. */
const DIFFICULTY_ACCENTS: Record<Difficulty, string> = {
  easy: 'bg-green-600 border-green-300 text-white',
  normal: 'bg-blue-600 border-blue-300 text-white',
  hard: 'bg-orange-600 border-orange-300 text-white',
  legend: 'bg-purple-600 border-purple-300 text-white',
};

/** Arte del catálogo, a la escala pedida. Mismo envoltorio que la base de datos. */
const Art: React.FC<{ id: string; scale?: number; className?: string }> = ({
  id,
  scale = 1,
  className = '',
}) => {
  const item = previewItem(id);
  if (!item) return null;
  return (
    <div className={`pixel-inset shrink-0 border-slate-800 bg-slate-950/80 p-1 ${className}`}>
      <PixelCanvas w={item.w} h={item.h} scale={scale} draw={item.draw} animated />
    </div>
  );
};

interface MainMenuProps {
  onStart: () => void;
  onCredits: () => void;
  onLegal: (tab: LegalTabId) => void;
  onRecords: () => void;
  onSettings: () => void;
  loadout: LoadoutType;
  setLoadout: (l: LoadoutType) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  character: CharacterType;
  setCharacter: (c: CharacterType) => void;
  bindings: Bindings;
  scores: readonly ScoreEntry[];
  lang: Language;
  setLang: (l: Language) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStart,
  onCredits,
  onLegal,
  onRecords,
  onSettings,
  loadout,
  setLoadout,
  difficulty,
  setDifficulty,
  character,
  setCharacter,
  bindings,
  scores,
  lang,
  setLang,
}) => {
  const [showIntel, setShowIntel] = useState(false);
  // Inicializador perezoso: se sortea una vez al montar el menú.
  const [briefingId] = useState(randomBriefingId);
  const t = TEXT[lang].menu;
  const tl = TEXT[lang].legal;
  const tr = TEXT[lang].records;
  const ts = TEXT[lang].settings;
  const c = TEXT[lang].characters;

  if (showIntel) {
    return <IntelDatabase onClose={() => setShowIntel(false)} lang={lang} />;
  }

  const weapons = TEXT[lang].weapons;

  /** Las opciones salen de la lista canónica: un arma nueva aparece sola. */
  const loadoutOptions: readonly ChoiceOption<LoadoutType>[] = [
    {
      id: 'all',
      label: 'ALL',
      icon: <InfinityIcon className="h-4 w-4" strokeWidth={3} />,
      accent: 'bg-slate-600 border-white text-white',
      title: t.loadout_all,
    },
    ...WEAPONS.map((weapon) => ({
      id: weapon as LoadoutType,
      // Sin `.slice(0, 6)`: destrozaba "Mouthwash" y era peor en español.
      label: weapons[weapon].name,
      icon: <span className={WEAPON_LOOK[weapon].color}>{WEAPON_LOOK[weapon].icon}</span>,
      accent: 'bg-slate-600 border-white text-white',
      title: weapons[weapon].desc,
    })),
  ];

  const difficulties: readonly ChoiceOption<Difficulty>[] = (
    ['easy', 'normal', 'hard', 'legend'] as const
  ).map((id) => ({
    id,
    label: t[`diff_${id}` as const],
    accent: DIFFICULTY_ACCENTS[id],
  }));

  const characters: readonly ChoiceOption<CharacterType>[] = (
    ['molar', 'incisor', 'canine', 'premolar'] as const
  ).map((id) => ({
    id,
    label: c[id],
    accent: 'bg-pink-600 border-pink-300 text-white',
    title: characterSummary(id),
  }));

  /** [nombre, subtítulo] del título, derivados del nombre del sitio. */
  const [title, subtitle] = SITE_NAME.split(':').map((part) => part.trim());
  const top = scores.slice(0, 3);

  /**
   * Las fichas de control, agrupadas por lo que **muestran**.
   *
   * Izquierda y derecha son dos acciones distintas pero un solo rótulo —«Mover»—,
   * así que una ficha por acción sacaba «A · Mover» y «D · Mover» seguidas, como
   * si fuesen cosas diferentes.
   */
  const controlChips = ACTIONS.reduce<Array<{ label: string; codes: string[] }>>(
    (chips, action) => {
      const label = t[ACTION_SPECS[action].labelKey];
      const codes = bindings[action].map(codeLabel);
      const existing = chips.find((chip) => chip.label === label);
      if (existing) existing.codes.push(...codes);
      else chips.push({ label, codes });
      return chips;
    },
    []
  );

  return (
    <div className="pixel-crt relative h-full w-full overflow-y-auto overflow-x-hidden bg-slate-900 text-white">
      <MenuBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 md:gap-4 md:p-6">
        {/* CABECERA: rejilla de tres celdas, así que el título se centra solo.
            Antes se centraba con un hueco vacío del mismo ancho que el botón. */}
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <PixelButton
            onClick={onSettings}
            className="flex min-h-11 items-center gap-1.5 px-3 py-2"
            title={ts.title}
            aria-label={ts.title}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={3} />
            <span className="hidden sm:inline">{ts.title}</span>
          </PixelButton>

          <div className="text-center">
            <h1 className="pixel-title text-lg leading-none tracking-[0.15em] text-pink-300 uppercase sm:text-2xl md:text-4xl">
              {title}
            </h1>
            <p className="pixel-text-shadow mt-1.5 text-[8px] tracking-[0.3em] text-blue-300 uppercase sm:text-[10px] md:text-xs">
              {subtitle}
            </p>
          </div>

          <PixelButton
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="flex min-h-11 items-center gap-1.5 px-3 py-2"
            title="Language"
            aria-label="Language"
          >
            <Globe className="h-4 w-4" strokeWidth={3} />
            {lang === 'en' ? 'ES' : 'EN'}
          </PixelButton>
        </header>

        {/* EMPEZAR: barra primaria a todo el ancho, no un botón más de una fila
            de cuatro iguales. Es lo que se viene a hacer aquí. */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <PixelButton
            onClick={onStart}
            variant="primary"
            className="flex min-h-14 flex-1 items-center justify-center gap-2 px-6 py-4 text-xs tracking-[0.2em] md:text-sm"
          >
            <span aria-hidden className="pixel-blink">
              ▶
            </span>
            {t.btn_start}
          </PixelButton>
          <PixelButton
            onClick={onRecords}
            className="flex min-h-14 items-center justify-center gap-2 px-5 py-4 sm:w-48"
          >
            <Trophy className="h-4 w-4" strokeWidth={3} />
            {tr.btn}
          </PixelButton>
        </div>

        {/* CONTENIDO: una columna en móvil, dos desde `sm`, con raíl desde `lg`. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_18rem]">
          {/* CLASE, con el diente elegido dibujado grande. */}
          <PixelPanel title={t.select_char} accent="border-pink-700" className="flex flex-col">
            <div className="mb-2 flex items-center gap-3">
              <Art id={`character:${character}`} scale={2} />
              <div className="min-w-0">
                <p className="text-[9px] leading-tight text-white">{c[character]}</p>
                <p className="mt-1 font-mono text-[8px] leading-none text-pink-200">
                  {characterSummary(character)}
                </p>
              </div>
            </div>
            <PixelSegmented
              options={characters}
              value={character}
              onSelect={setCharacter}
              label={t.select_char}
              marker
              className="grid grid-cols-1 gap-1.5"
              buttonClassName="min-h-11 px-2 py-2 text-left"
            />
          </PixelPanel>

          {/* EQUIPAMIENTO, con el arma elegida dibujada. */}
          <PixelPanel title={t.select_loadout} accent="border-cyan-800" className="flex flex-col">
            <div className="mb-2 flex items-center gap-3">
              {loadout === 'all' ? (
                <div className="pixel-inset flex h-12 w-16 shrink-0 items-center justify-center border-slate-800 bg-slate-950/80 text-slate-400">
                  <InfinityIcon className="h-6 w-6" strokeWidth={3} />
                </div>
              ) : (
                <Art id={`weapon:${loadout}`} className="max-h-20 overflow-hidden" />
              )}
              <p className="min-w-0 text-[8px] leading-relaxed text-slate-300">
                {loadout === 'all' ? t.loadout_all : weapons[loadout].desc}
              </p>
            </div>
            <PixelSegmented
              options={loadoutOptions}
              value={loadout}
              onSelect={setLoadout}
              label={t.select_loadout}
              className="grid grid-cols-3 gap-1.5 sm:grid-cols-3"
              buttonClassName="flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-2 text-[7px]"
            />
          </PixelPanel>

          {/* RAÍL: dificultad, récords e informe. Ocupa las dos columnas hasta
              `lg`, donde pasa a ser una tercera columna estrecha. */}
          <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
            <PixelPanel title={t.select_difficulty} accent="border-amber-700">
              <PixelSegmented
                options={difficulties}
                value={difficulty}
                onSelect={setDifficulty}
                label={t.select_difficulty}
                marker
                className="grid grid-cols-2 gap-1.5"
                buttonClassName="min-h-11 px-1 py-2"
              />
            </PixelPanel>

            {top.length > 0 && (
              <PixelPanel title={tr.title} accent="border-yellow-700">
                <ol className="flex flex-col gap-1">
                  {top.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex items-baseline justify-between gap-2 text-[8px]"
                    >
                      <span className="truncate text-slate-300">
                        <span className="text-slate-500">{index + 1}. </span>
                        {entry.nickname}
                      </span>
                      <span className="shrink-0 font-mono text-yellow-300">
                        {entry.score.toLocaleString(lang)}
                      </span>
                    </li>
                  ))}
                </ol>
              </PixelPanel>
            )}

            <PixelPanel title={t.mission_label} accent="border-green-700">
              <div className="flex items-start gap-2">
                <span className="pixel-blink mt-0.5 h-2 w-2 shrink-0 bg-green-400" aria-hidden />
                <p className="text-[8px] leading-[1.9] text-green-300">
                  {briefingText(briefingId, lang)}
                </p>
              </div>
            </PixelPanel>
          </div>
        </div>

        {/* SECUNDARIOS. El botón LEGAL se ha retirado: el pie ya enlaza los tres
            documentos por separado, así que era una cuarta ruta a lo mismo. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <PixelButton
            onClick={() => setShowIntel(true)}
            className="flex min-h-11 items-center gap-2 px-4 py-2.5"
          >
            <Info className="h-4 w-4" strokeWidth={3} />
            {t.btn_knowledge}
          </PixelButton>
          <PixelButton onClick={onCredits} className="flex min-h-11 items-center gap-2 px-4 py-2.5">
            <User className="h-4 w-4" strokeWidth={3} />
            {t.btn_credits}
          </PixelButton>
        </div>

        {/* CONTROLES: **derivados de la tabla**, no escritos a mano. Antes eran
            literales sueltos que ya mentían —nunca mencionaron ESC ni el clic
            derecho— y que mentirían del todo en cuanto se reasignase una tecla. */}
        <div className="flex w-full flex-col items-center gap-1.5">
          <PixelLabel>{t.controls}</PixelLabel>
          <div className="flex flex-wrap justify-center gap-1.5">
            {controlChips.map(({ label, codes }) => (
              <PixelKey key={label}>
                {codes.join(' / ')} · {label}
              </PixelKey>
            ))}
            <PixelKey>
              {ts.mouse_left} · {t.ctrl_shoot}
            </PixelKey>
            <PixelKey>
              {codeLabel('Escape')} · {ts.fixed_pause}
            </PixelKey>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-1 border-t-4 border-slate-800 pt-2 pb-2">
          <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1" aria-label={tl.title}>
            <button
              type="button"
              onClick={() => onLegal('terms')}
              className="pixel-link text-[8px] tracking-[0.2em] uppercase"
            >
              {tl.tab_terms}
            </button>
            <button
              type="button"
              onClick={() => onLegal('privacy')}
              className="pixel-link text-[8px] tracking-[0.2em] uppercase"
            >
              {tl.tab_privacy}
            </button>
            <button
              type="button"
              onClick={() => onLegal('licenses')}
              className="pixel-link text-[8px] tracking-[0.2em] uppercase"
            >
              {tl.tab_licenses}
            </button>
          </nav>
          <PixelLabel className="text-center">
            {copyrightLine()} · {TEXT[lang].credits.rights_reserved}
          </PixelLabel>
        </div>
      </div>
    </div>
  );
};
