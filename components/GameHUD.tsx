
import React from 'react';
import { Heart, Rocket, Crosshair, Zap, Waves, Wind, Sword, ChevronsUp, Snail, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Shield, Activity, TrendingUp, Timer } from 'lucide-react';
import { Player, Language } from '../types';
import { TEXT } from '../utils/locales';

interface GameHUDProps {
    player: Player;
    score: number;
    stage: number;
    hp: number;
    bossHp: number;
    bossMaxHp: number;
    bossName: string;
    isMobile: boolean;
    handleTouch: (action: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => void;
    lang: Language;
}

export const GameHUD: React.FC<GameHUDProps> = ({ player, score, stage, hp, bossHp, bossMaxHp, bossName, isMobile, handleTouch, lang }) => {
  const t = TEXT[lang].hud;

  // Calculate stats for display
  const cdr = Math.round((1 - player.stats.dashCooldownMultiplier) * 100); // Cooldown Reduction %
  const def = Math.round(player.stats.damageReduction * 100); // Defense %

  return (
    <>
      {/* Top HUD Bar - Retro Style & Compact */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none font-sans">
          
          {/* Main Status Bar (Black Strip) */}
          <div className="h-12 md:h-14 bg-[#111] border-b-2 border-slate-600 flex items-center justify-between px-2 md:px-4 shadow-xl w-full">
            
            {/* 1. LEFT: HEALTH & LIVES */}
            <div className="flex items-center gap-2 pr-2 h-full min-w-[130px] md:min-w-[180px]">
                <div className="relative shrink-0">
                    <Heart className="text-red-600 w-5 h-5 md:w-6 md:h-6 fill-red-600 animate-pulse drop-shadow-md" />
                    {player.shield > 0 && (
                        <Shield className="absolute -top-1 -right-1 w-3 h-3 text-cyan-400 fill-cyan-400/50 animate-bounce" />
                    )}
                    {player.lives > 0 && (
                        <span className="absolute -bottom-2 -right-1 bg-yellow-500 text-black font-bold text-[9px] px-1 rounded-sm shadow-sm border border-yellow-600">
                            x{player.lives}
                        </span>
                    )}
                </div>
                
                <div className="flex flex-col gap-0.5 w-full">
                    {/* Health Bar Container */}
                    <div className="w-full h-3 md:h-4 bg-slate-900 border border-slate-600 relative overflow-hidden rounded-sm">
                        {/* Red HP */}
                        <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200" style={{ width: `${(hp/player.maxHp)*100}%` }} />
                        {/* Cyan Shield Overlay */}
                        {player.maxShield > 0 && (
                            <div 
                                className="absolute top-0 left-0 h-full bg-cyan-400/70 border-r border-white/50 transition-all duration-200" 
                                style={{ width: `${Math.min(100, (player.shield / player.maxShield) * 100)}%` }} 
                            />
                        )}
                        {/* Scanline Effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0.2)_50%,rgba(0,0,0,0)_100%)] bg-[length:100%_4px]" />
                    </div>
                    {/* Text Values (HP/Shield) */}
                    <div className="flex justify-between text-[8px] leading-none font-mono opacity-80">
                         <span className="text-red-300">{Math.ceil(hp)}/{Math.ceil(player.maxHp)}</span>
                         {player.maxShield > 0 && <span className="text-cyan-300">SHIELD {Math.ceil(player.shield)}</span>}
                    </div>
                </div>
            </div>

            {/* 2. CENTER-LEFT: STAGE (Hidden on very small screens) */}
            <div className="hidden sm:flex flex-col items-center justify-center px-4 border-l border-r border-slate-800 h-full bg-slate-900/50">
                <span className="text-[8px] text-yellow-600 leading-none font-bold tracking-widest">{t.stage}</span>
                <span className="text-xl text-yellow-400 drop-shadow-[1px_1px_0_#000] font-bold">{stage}</span>
            </div>

            {/* 3. CENTER: STATS (DESKTOP ONLY) & SCORE */}
            <div className="flex flex-grow items-center justify-center gap-4 md:gap-8 overflow-hidden">
                {/* Desktop Stats (Integrated into Top Bar) */}
                <div className="hidden lg:flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                     <StatPill icon={<Sword className="w-3 h-3 text-red-400"/>} val={`${t.stat_dmg} x${player.stats.damageMultiplier.toFixed(2)}`} />
                     <StatPill icon={<TrendingUp className="w-3 h-3 text-green-400"/>} val={`${t.stat_spd} x${player.stats.speedMultiplier.toFixed(2)}`} />
                     {def > 0 && <StatPill icon={<Shield className="w-3 h-3 text-blue-400"/>} val={`${t.stat_def} +${def}%`} />}
                     {cdr > 0 && <StatPill icon={<Timer className="w-3 h-3 text-yellow-400"/>} val={`CD -${cdr}%`} />}
                     {player.maxShield > 0 && <StatPill icon={<Activity className="w-3 h-3 text-cyan-400"/>} val={`SHLD ${player.maxShield}`} />}
                     {player.stats.maxDashes > 1 && <StatPill icon={<Wind className="w-3 h-3 text-white"/>} val={`${t.stat_dash} ${player.stats.maxDashes}`} />}
                     {player.lives > 0 && <StatPill icon={<Heart className="w-3 h-3 text-yellow-500"/>} val={`LIVES ${player.lives}`} />}
                     {player.maxHp > 130 && <StatPill icon={<Heart className="w-3 h-3 text-pink-400"/>} val={`MAX HP ${Math.ceil(player.maxHp)}`} />}
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[8px] text-slate-500 leading-none tracking-widest hidden sm:block">{t.score}</span>
                    <span className="text-lg md:text-2xl text-white tracking-[0.1em] font-mono drop-shadow-[2px_2px_0_#000]">
                        {score.toString().padStart(6, '0')}
                    </span>
                </div>
            </div>

            {/* 4. RIGHT: WEAPON */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700 h-full min-w-[90px] justify-end">
                <div className="flex flex-col items-end">
                    <span className="text-[8px] md:text-[9px] text-slate-400 uppercase leading-none mb-1 max-w-[80px] truncate text-right font-bold">
                        {TEXT[lang].weapons[player.weapon].name}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600">
                        <span className="text-[9px] text-slate-400 font-bold">{t.lvl}</span>
                        <span className="text-xs font-bold text-yellow-400">{player.weaponLevel}</span>
                    </div>
                </div>
                <div className="text-cyan-400">
                    {player.weapon === 'normal' && <Rocket className="w-5 h-5 md:w-6 md:h-6" />}
                    {player.weapon === 'spread' && <Crosshair className="w-5 h-5 md:w-6 md:h-6" />}
                    {player.weapon === 'laser' && <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                    {player.weapon === 'mouthwash' && <Waves className="w-5 h-5 md:w-6 md:h-6" />}
                    {player.weapon === 'floss' && <Wind className="w-5 h-5 md:w-6 md:h-6" />}
                    {player.weapon === 'toothbrush' && <Sword className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
            </div>
          </div>
          
          {/* MOBILE/TABLET STATS BAR (Thin Strip) - Hidden on LG screens */}
          <div className="lg:hidden w-full bg-black/80 backdrop-blur-[2px] border-b border-white/10 flex justify-center items-center gap-3 py-0.5 px-2 overflow-x-auto h-6 no-scrollbar">
               <StatTiny icon={<Sword className="w-2.5 h-2.5 text-red-400" />} text={`x${player.stats.damageMultiplier.toFixed(2)}`} />
               <StatTiny icon={<TrendingUp className="w-2.5 h-2.5 text-green-400" />} text={`x${player.stats.speedMultiplier.toFixed(2)}`} />
               {def > 0 && <StatTiny icon={<Shield className="w-2.5 h-2.5 text-blue-400" />} text={`+${def}%`} />}
               {cdr > 0 && <StatTiny icon={<Timer className="w-2.5 h-2.5 text-yellow-400" />} text={`CD -${cdr}%`} />}
               {player.maxShield > 0 && <StatTiny icon={<Activity className="w-2.5 h-2.5 text-cyan-400" />} text={`MAX ${player.maxShield}`} />}
               {player.stats.maxDashes > 1 && <StatTiny icon={<Wind className="w-2.5 h-2.5 text-white" />} text={`DASH x${player.stats.maxDashes}`} />}
               {player.lives > 0 && <StatTiny icon={<Heart className="w-2.5 h-2.5 text-yellow-500" />} text={`LIVES ${player.lives}`} />}
               {player.maxHp > 130 && <StatTiny icon={<Heart className="w-2.5 h-2.5 text-pink-400" />} text={`HP ${Math.ceil(player.maxHp)}`} />}
          </div>

          {/* Status Effects (Right Side, Below HUD) */}
          {player.slowTimer > 0 && (
               <div className="absolute right-2 top-20 text-pink-500 text-[10px] font-bold animate-bounce flex items-center gap-1 bg-black/70 px-2 py-1 rounded border border-pink-500/30">
                    <Snail className="w-3 h-3" /> {t.slow}
               </div>
          )}
      </div>

      {/* Boss Health Bar */}
      {bossHp > 0 && (
          <div className="absolute top-24 md:bottom-24 left-1/2 -translate-x-1/2 w-64 md:w-96 pointer-events-none z-10">
              <div className="flex justify-between items-end mb-1 px-1">
                  <span className="text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-wider drop-shadow-sm bg-black/50 px-1 rounded">{bossName}</span>
                  <span className="text-[10px] md:text-xs text-red-400 font-mono bg-black/50 px-1 rounded">{Math.ceil((bossHp/bossMaxHp)*100)}%</span>
              </div>
              <div className="w-full h-3 md:h-5 bg-slate-900 border-2 border-slate-800 relative shadow-xl">
                  <div className="h-full bg-red-700 transition-all duration-200" style={{ width: `${(bossHp/bossMaxHp)*100}%` }}>
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
                        className="absolute top-0 left-[3.25rem] w-10 h-12 bg-slate-800/80 rounded-t-lg border border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('up', true)} onTouchEnd={handleTouch('up', false)}
                        onMouseDown={handleTouch('up', true)} onMouseUp={handleTouch('up', false)}
                      >
                          <ArrowUp className="text-slate-300 w-5 h-5" />
                      </button>
                      {/* DOWN */}
                      <button 
                        className="absolute bottom-0 left-[3.25rem] w-10 h-12 bg-slate-800/80 rounded-b-lg border border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('down', true)} onTouchEnd={handleTouch('down', false)}
                        onMouseDown={handleTouch('down', true)} onMouseUp={handleTouch('down', false)}
                      >
                          <ArrowDown className="text-slate-300 w-5 h-5" />
                      </button>
                      {/* LEFT */}
                      <button 
                        className="absolute top-[3.25rem] left-0 w-12 h-10 bg-slate-800/80 rounded-l-lg border border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}
                        onMouseDown={handleTouch('left', true)} onMouseUp={handleTouch('left', false)}
                      >
                          <ArrowLeft className="text-slate-300 w-5 h-5" />
                      </button>
                      {/* RIGHT */}
                      <button 
                        className="absolute top-[3.25rem] right-0 w-12 h-10 bg-slate-800/80 rounded-r-lg border border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}
                        onMouseDown={handleTouch('right', true)} onMouseUp={handleTouch('right', false)}
                      >
                          <ArrowRight className="text-slate-300 w-5 h-5" />
                      </button>
                      {/* Center Decor */}
                      <div className="absolute top-[3.25rem] left-[3.25rem] w-10 h-10 bg-slate-900 border border-slate-700 rounded" />
                  </div>

                  {/* RIGHT: ACTION BUTTONS (Compact Arc) */}
                  <div className="relative w-40 h-36 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                      {/* DASH (Top) */}
                      <button 
                        className="absolute top-0 right-14 w-12 h-12 bg-yellow-600/80 rounded-full border-2 border-yellow-400 flex items-center justify-center shadow-lg active:bg-yellow-500 active:scale-95"
                        onTouchStart={handleTouch('dash', true)} onTouchEnd={handleTouch('dash', false)}
                        onMouseDown={handleTouch('dash', true)} onMouseUp={handleTouch('dash', false)}
                      >
                          <span className="font-bold text-white text-[10px]">DASH</span>
                      </button>
                      
                      {/* SHOOT (Left) */}
                      <button 
                        className="absolute bottom-4 left-0 w-14 h-14 bg-red-600/80 rounded-full border-2 border-red-400 flex items-center justify-center shadow-lg active:bg-red-500 active:scale-95"
                        onTouchStart={handleTouch('shoot', true)} onTouchEnd={handleTouch('shoot', false)}
                        onMouseDown={handleTouch('shoot', true)} onMouseUp={handleTouch('shoot', false)}
                      >
                           <Crosshair className="w-6 h-6 text-white" />
                      </button>

                      {/* JUMP (Right/Bottom) */}
                      <button 
                        className="absolute bottom-0 right-0 w-16 h-16 bg-blue-600/80 rounded-full border-2 border-blue-400 flex items-center justify-center shadow-lg active:bg-blue-500 active:scale-95"
                        onTouchStart={handleTouch('jump', true)} onTouchEnd={handleTouch('jump', false)}
                        onMouseDown={handleTouch('jump', true)} onMouseUp={handleTouch('jump', false)}
                      >
                          <span className="font-bold text-white text-sm">JUMP</span>
                      </button>
                  </div>

              </div>
          </div>
      )}
    </>
  );
};

// Helper Components for Stats
const StatPill = ({ icon, val }: { icon: React.ReactNode, val: string }) => (
    <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
        {icon}
        <span className="text-white whitespace-nowrap">{val}</span>
    </div>
);

const StatTiny = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-center gap-1 min-w-fit px-1">
        {icon}
        <span className="text-[9px] text-slate-200 font-mono font-bold leading-none whitespace-nowrap">{text}</span>
    </div>
);
