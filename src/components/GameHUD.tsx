import React from 'react';
import {
  Heart,
  Rocket,
  Crosshair,
  Zap,
  Waves,
  Wind,
  Sword,
  Target,
  Scissors,
  Snail,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Shield,
  Activity,
  TrendingUp,
  Timer,
} from 'lucide-react';
import { Language, type WeaponType } from '../types';
import { TEXT } from '../i18n';
import type { HudSnapshot } from '../game/world';

/**
 * El HUD se dibuja **solo** con la instantánea que publica el bucle. Antes
 * recibía además el `Player` mutable y leía de él escudo, vidas, arma y
 * multiplicadores; como React solo re-renderiza cuando cambia la instantánea,
 * esos valores se quedaban congelados hasta que cambiaba otra cosa.
 */
interface GameHUDProps {
  hud: HudSnapshot;
  isMobile: boolean;
  handleTouch: (
    action: string,
    pressed: boolean
  ) => (e: React.TouchEvent | React.MouseEvent) => void;
  lang: Language;
}

export const GameHUD: React.FC<GameHUDProps> = ({ hud, isMobile, handleTouch, lang }) => {
  const t = TEXT[lang].hud;
  const { score, stage, hp, bossHp, bossMaxHp, bossName } = hud;

  // Calculate stats for display
  const cdr = Math.round((1 - hud.dashCooldownMultiplier) * 100); // Cooldown Reduction %
  const def = Math.round(hud.damageReduction * 100); // Defense %

  return (
    <>
      {/* Top HUD Bar - Retro Style & Compact */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none font-sans">
        {/* Main Status Bar (Black Strip) */}
        <div className="h-12 md:h-14 bg-[#111] border-b-4 border-slate-600 flex items-center justify-between px-2 md:px-4 w-full">
          {/* 1. LEFT: HEALTH & LIVES */}
          <div className="flex items-center gap-2 pr-2 h-full min-w-[130px] md:min-w-[180px]">
            <div className="relative shrink-0">
              <Heart className="text-red-600 w-5 h-5 md:w-6 md:h-6 fill-red-600 animate-pulse drop-shadow-md" />
              {hud.shield > 0 && (
                <Shield className="absolute -top-1 -right-1 w-3 h-3 text-cyan-400 fill-cyan-400/50 animate-bounce" />
              )}
              {hud.lives > 0 && (
                <span className="pixel-inset absolute -bottom-2 -right-1 bg-yellow-400 text-black text-[9px] px-1 border-yellow-600">
                  x{hud.lives}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-0.5 w-full">
              {/* Health Bar Container */}
              <div className="pixel-inset w-full h-3 md:h-4 bg-slate-900 border-slate-600 relative overflow-hidden">
                {/* Red HP */}
                <div
                  className="h-full bg-red-600"
                  style={{ width: `${(hp / hud.maxHp) * 100}%` }}
                />
                {/* Cyan Shield Overlay */}
                {hud.maxShield > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full bg-cyan-400 border-r-2 border-white"
                    style={{ width: `${Math.min(100, (hud.shield / hud.maxShield) * 100)}%` }}
                  />
                )}
                {/* Scanline Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0.2)_50%,rgba(0,0,0,0)_100%)] bg-[length:100%_4px]" />
              </div>
              {/* Text Values (HP/Shield) */}
              <div className="flex justify-between text-[8px] leading-none font-mono opacity-80">
                <span className="text-red-300">
                  {Math.ceil(hp)}/{Math.ceil(hud.maxHp)}
                </span>
                {hud.maxShield > 0 && (
                  <span className="text-cyan-300">SHIELD {Math.ceil(hud.shield)}</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. CENTER-LEFT: STAGE (Hidden on very small screens) */}
          <div className="hidden sm:flex flex-col items-center justify-center px-4 border-l border-r border-slate-800 h-full bg-slate-900/50">
            <span className="text-[8px] text-yellow-600 leading-none font-bold tracking-widest">
              {t.stage}
            </span>
            <span className="text-xl text-yellow-400 drop-shadow-[1px_1px_0_#000] font-bold">
              {stage}
            </span>
          </div>

          {/* 3. CENTER: STATS (DESKTOP ONLY) & SCORE */}
          <div className="flex flex-grow items-center justify-center gap-4 md:gap-8 overflow-hidden">
            {/* Desktop Stats (Integrated into Top Bar) */}
            <div className="hidden lg:flex items-center gap-2 text-[9px] text-slate-400 font-mono">
              <StatPill
                icon={<Sword className="w-3 h-3 text-red-400" />}
                val={`${t.stat_dmg} x${hud.damageMultiplier.toFixed(2)}`}
              />
              <StatPill
                icon={<TrendingUp className="w-3 h-3 text-green-400" />}
                val={`${t.stat_spd} x${hud.speedMultiplier.toFixed(2)}`}
              />
              {def > 0 && (
                <StatPill
                  icon={<Shield className="w-3 h-3 text-blue-400" />}
                  val={`${t.stat_def} +${def}%`}
                />
              )}
              {cdr > 0 && (
                <StatPill
                  icon={<Timer className="w-3 h-3 text-yellow-400" />}
                  val={`CD -${cdr}%`}
                />
              )}
              {hud.maxShield > 0 && (
                <StatPill
                  icon={<Activity className="w-3 h-3 text-cyan-400" />}
                  val={`SHLD ${hud.maxShield}`}
                />
              )}
              {hud.maxDashes > 1 && (
                <StatPill
                  icon={<Wind className="w-3 h-3 text-white" />}
                  val={`${t.stat_dash} ${hud.maxDashes}`}
                />
              )}
              {hud.lives > 0 && (
                <StatPill
                  icon={<Heart className="w-3 h-3 text-yellow-500" />}
                  val={`LIVES ${hud.lives}`}
                />
              )}
              {hud.maxHp > 130 && (
                <StatPill
                  icon={<Heart className="w-3 h-3 text-pink-400" />}
                  val={`MAX HP ${Math.ceil(hud.maxHp)}`}
                />
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[8px] text-slate-500 leading-none tracking-widest hidden sm:block">
                {t.score}
              </span>
              <span className="text-lg md:text-2xl text-white tracking-[0.1em] font-mono drop-shadow-[2px_2px_0_#000]">
                {score.toString().padStart(6, '0')}
              </span>
            </div>
          </div>

          {/* 4. RIGHT: WEAPON */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700 h-full min-w-[90px] justify-end">
            <div className="flex flex-col items-end">
              <span className="text-[8px] md:text-[9px] text-slate-400 uppercase leading-none mb-1 max-w-[80px] truncate text-right font-bold">
                {TEXT[lang].weapons[hud.weapon].name}
              </span>
              <div className="pixel-inset flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 border-slate-600">
                <span className="text-[9px] text-slate-400 font-bold">{t.lvl}</span>
                <span className="text-xs font-bold text-yellow-400">{hud.weaponLevel}</span>
              </div>
            </div>
            <div className="text-cyan-400">
              <WeaponIcon weapon={hud.weapon} />
            </div>
          </div>
        </div>

        {/* MOBILE/TABLET STATS BAR (Thin Strip) - Hidden on LG screens */}
        <div className="lg:hidden w-full bg-black border-b-2 border-slate-700 flex justify-center items-center gap-3 py-0.5 px-2 overflow-x-auto h-6 no-scrollbar">
          <StatTiny
            icon={<Sword className="w-2.5 h-2.5 text-red-400" />}
            text={`x${hud.damageMultiplier.toFixed(2)}`}
          />
          <StatTiny
            icon={<TrendingUp className="w-2.5 h-2.5 text-green-400" />}
            text={`x${hud.speedMultiplier.toFixed(2)}`}
          />
          {def > 0 && (
            <StatTiny icon={<Shield className="w-2.5 h-2.5 text-blue-400" />} text={`+${def}%`} />
          )}
          {cdr > 0 && (
            <StatTiny
              icon={<Timer className="w-2.5 h-2.5 text-yellow-400" />}
              text={`CD -${cdr}%`}
            />
          )}
          {hud.maxShield > 0 && (
            <StatTiny
              icon={<Activity className="w-2.5 h-2.5 text-cyan-400" />}
              text={`MAX ${hud.maxShield}`}
            />
          )}
          {hud.maxDashes > 1 && (
            <StatTiny
              icon={<Wind className="w-2.5 h-2.5 text-white" />}
              text={`DASH x${hud.maxDashes}`}
            />
          )}
          {hud.lives > 0 && (
            <StatTiny
              icon={<Heart className="w-2.5 h-2.5 text-yellow-500" />}
              text={`LIVES ${hud.lives}`}
            />
          )}
          {hud.maxHp > 130 && (
            <StatTiny
              icon={<Heart className="w-2.5 h-2.5 text-pink-400" />}
              text={`HP ${Math.ceil(hud.maxHp)}`}
            />
          )}
        </div>

        {/* Status Effects (Right Side, Below HUD) */}
        {hud.slowed && (
          <div className="pixel-inset pixel-blink absolute right-2 top-20 text-pink-400 text-[9px] flex items-center gap-1 bg-black px-2 py-1 border-pink-700">
            <Snail className="w-3 h-3" /> {t.slow}
          </div>
        )}
      </div>

      {/* Boss Health Bar */}
      {bossHp > 0 && (
        <div className="absolute top-24 md:bottom-24 left-1/2 -translate-x-1/2 w-64 md:w-96 pointer-events-none z-10">
          <div className="flex justify-between items-end mb-1 px-1">
            <span className="pixel-text-shadow text-[9px] md:text-[10px] text-red-400 uppercase tracking-wider bg-black/70 px-1">
              {bossName}
            </span>
            <span className="pixel-text-shadow text-[9px] md:text-[10px] text-red-300 bg-black/70 px-1">
              {Math.ceil((bossHp / bossMaxHp) * 100)}%
            </span>
          </div>
          <div className="pixel-inset w-full h-3 md:h-5 bg-slate-900 border-slate-800 relative">
            <div className="h-full bg-red-600" style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}>
              <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Controls Overlay */}
      {isMobile && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end pb-4 px-2 md:hidden">
          <div className="flex justify-between items-end w-full">
            {/* LEFT: D-PAD */}
            <div className="relative w-36 h-36 pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
              {/* UP */}
              <button
                className="pixel-btn absolute top-0 left-[3.25rem] w-10 h-12 bg-slate-800 border-slate-500 flex items-center justify-center active:bg-slate-600"
                onTouchStart={handleTouch('up', true)}
                onTouchEnd={handleTouch('up', false)}
                onMouseDown={handleTouch('up', true)}
                onMouseUp={handleTouch('up', false)}
              >
                <ArrowUp className="text-slate-300 w-5 h-5" />
              </button>
              {/* DOWN */}
              <button
                className="pixel-btn absolute bottom-0 left-[3.25rem] w-10 h-12 bg-slate-800 border-slate-500 flex items-center justify-center active:bg-slate-600"
                onTouchStart={handleTouch('down', true)}
                onTouchEnd={handleTouch('down', false)}
                onMouseDown={handleTouch('down', true)}
                onMouseUp={handleTouch('down', false)}
              >
                <ArrowDown className="text-slate-300 w-5 h-5" />
              </button>
              {/* LEFT */}
              <button
                className="pixel-btn absolute top-[3.25rem] left-0 w-12 h-10 bg-slate-800 border-slate-500 flex items-center justify-center active:bg-slate-600"
                onTouchStart={handleTouch('left', true)}
                onTouchEnd={handleTouch('left', false)}
                onMouseDown={handleTouch('left', true)}
                onMouseUp={handleTouch('left', false)}
              >
                <ArrowLeft className="text-slate-300 w-5 h-5" />
              </button>
              {/* RIGHT */}
              <button
                className="pixel-btn absolute top-[3.25rem] right-0 w-12 h-10 bg-slate-800 border-slate-500 flex items-center justify-center active:bg-slate-600"
                onTouchStart={handleTouch('right', true)}
                onTouchEnd={handleTouch('right', false)}
                onMouseDown={handleTouch('right', true)}
                onMouseUp={handleTouch('right', false)}
              >
                <ArrowRight className="text-slate-300 w-5 h-5" />
              </button>
              {/* Center Decor */}
              <div className="pixel-inset absolute top-[3.25rem] left-[3.25rem] w-10 h-10 bg-slate-900 border-slate-700" />
            </div>

            {/* RIGHT: ACTION BUTTONS (Compact Arc) */}
            <div className="relative w-40 h-36 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
              {/* DASH (Top) */}
              <button
                className="pixel-btn absolute top-0 right-14 w-12 h-12 bg-yellow-600 border-yellow-300 flex items-center justify-center active:bg-yellow-500"
                onTouchStart={handleTouch('dash', true)}
                onTouchEnd={handleTouch('dash', false)}
                onMouseDown={handleTouch('dash', true)}
                onMouseUp={handleTouch('dash', false)}
              >
                <span className="pixel-text-shadow text-white text-[9px]">DASH</span>
              </button>

              {/* SHOOT (Left) */}
              <button
                className="pixel-btn absolute bottom-4 left-0 w-14 h-14 bg-red-600 border-red-300 flex items-center justify-center active:bg-red-500"
                onTouchStart={handleTouch('shoot', true)}
                onTouchEnd={handleTouch('shoot', false)}
                onMouseDown={handleTouch('shoot', true)}
                onMouseUp={handleTouch('shoot', false)}
              >
                <Crosshair className="w-6 h-6 text-white" />
              </button>

              {/* JUMP (Right/Bottom) */}
              <button
                className="pixel-btn absolute bottom-0 right-0 w-16 h-16 bg-blue-600 border-blue-300 flex items-center justify-center active:bg-blue-500"
                onTouchStart={handleTouch('jump', true)}
                onTouchEnd={handleTouch('jump', false)}
                onMouseDown={handleTouch('jump', true)}
                onMouseUp={handleTouch('jump', false)}
              >
                <span className="pixel-text-shadow text-white text-[10px]">JUMP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper Components for Stats
/**
 * El icono del arma que se lleva.
 *
 * Es un `Record` sobre el union y no una cadena de comparaciones escrita a mano: así, un
 * arma nueva es un error de compilación y no un hueco vacío en el HUD.
 */
const WEAPON_ICONS: Record<WeaponType, React.ComponentType<{ className?: string }>> = {
  normal: Rocket,
  spread: Crosshair,
  laser: Zap,
  mouthwash: Waves,
  floss: Wind,
  toothbrush: Sword,
  bow: Target,
  scythe: Scissors,
};

const WeaponIcon = ({ weapon }: { weapon: WeaponType }) => {
  const Icon = WEAPON_ICONS[weapon];
  return <Icon className="w-5 h-5 md:w-6 md:h-6" />;
};

const StatPill = ({ icon, val }: { icon: React.ReactNode; val: string }) => (
  <div className="pixel-inset flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 border-slate-800">
    {icon}
    <span className="text-white whitespace-nowrap">{val}</span>
  </div>
);

const StatTiny = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-1 min-w-fit px-1">
    {icon}
    <span className="text-[9px] text-slate-200 font-mono font-bold leading-none whitespace-nowrap">
      {text}
    </span>
  </div>
);
