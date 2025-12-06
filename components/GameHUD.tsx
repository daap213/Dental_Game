
import React from 'react';
import { Heart, Rocket, Crosshair, Zap, Waves, Wind, Sword, ChevronsUp, Snail, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
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

  return (
    <>
      {/* Top HUD Bar - Retro Style */}
      <div className="absolute top-0 left-0 right-0 h-14 md:h-16 bg-[#111] border-b-4 border-slate-600 flex items-center justify-between px-2 md:px-6 pointer-events-none z-20 select-none shadow-xl">
          
          {/* 1. HEALTH & SHIELD SECTION */}
          <div className="flex items-center gap-2 md:gap-3 pr-2 md:pr-4 border-r-2 border-slate-700 h-10 min-w-[140px] md:min-w-[200px]">
              <div className="relative">
                 <Heart className="text-red-600 w-5 h-5 md:w-6 md:h-6 fill-red-600 animate-pulse drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]" />
                 {player.shield > 0 && (
                     <Shield className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 text-cyan-400 fill-cyan-400/50 animate-bounce" />
                 )}
                 {player.lives > 0 && (
                     <span className="absolute -bottom-1 -right-2 bg-yellow-500 text-black font-bold text-[8px] md:text-[10px] px-1 rounded-full">
                         x{player.lives}
                     </span>
                 )}
              </div>
              <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between w-full">
                    <span className="text-[8px] md:text-[10px] text-red-400 leading-none hidden sm:block">{t.vitals}</span>
                    {player.shield > 0 && <span className="text-[8px] md:text-[10px] text-cyan-400 leading-none font-bold">{t.shield_active}</span>}
                  </div>
                  
                  {/* Health Bar Container */}
                  <div className="w-full h-3 md:h-4 bg-slate-900 border-2 border-slate-600 relative overflow-hidden">
                      {/* Red HP */}
                      <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200" style={{ width: `${(hp/player.maxHp)*100}%` }} />
                      
                      {/* Cyan Shield Overlay */}
                      {player.maxShield > 0 && (
                        <div 
                            className="absolute top-0 left-0 h-full bg-cyan-400/80 border-r border-white/50 transition-all duration-200" 
                            style={{ width: `${Math.min(100, (player.shield / player.maxShield) * 100)}%` }} 
                        />
                      )}
                      
                      {/* Gloss */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-white opacity-20" />
                  </div>
              </div>
          </div>

          {/* 2. STAGE SECTION */}
          <div className="flex items-center gap-2 px-2 md:px-4 border-r-2 border-slate-700 h-10">
               <div className="flex flex-col items-center">
                   <span className="text-[8px] md:text-[10px] text-yellow-600 leading-none">{t.stage}</span>
                   <span className="text-lg md:text-xl text-yellow-400 drop-shadow-md">{stage}</span>
               </div>
          </div>
              
          {/* 3. SCORE SECTION */}
          <div className="flex flex-col items-center flex-grow">
              <span className="text-[8px] md:text-[10px] text-slate-500 leading-none tracking-widest mb-1 hidden sm:block">{t.score}</span>
              <span className="text-base md:text-2xl text-white tracking-[0.1em] font-mono drop-shadow-[2px_2px_0_#000]">
                  {score.toString().padStart(6, '0')}
              </span>
          </div>

          {/* 4. WEAPON SECTION */}
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l-2 border-slate-700 h-10">
              <div className="text-cyan-400 hidden sm:block">
                  {player.weapon === 'normal' && <Rocket className="w-6 h-6" />}
                  {player.weapon === 'spread' && <Crosshair className="w-6 h-6" />}
                  {player.weapon === 'laser' && <Zap className="w-6 h-6" />}
                  {player.weapon === 'mouthwash' && <Waves className="w-6 h-6" />}
                  {player.weapon === 'floss' && <Wind className="w-6 h-6" />}
                  {player.weapon === 'toothbrush' && <Sword className="w-6 h-6" />}
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-[8px] md:text-[10px] text-slate-400 uppercase leading-none mb-1 max-w-[60px] truncate text-right">
                      {TEXT[lang].weapons[player.weapon].name}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-800 px-2 rounded border border-slate-600">
                      <ChevronsUp className="w-3 h-3 text-yellow-500" />
                      <span className="text-[10px] md:text-xs text-white">{t.lvl}</span>
                      <span className="text-xs md:text-sm font-bold text-yellow-400">{player.weaponLevel}</span>
                  </div>
              </div>
          </div>

          {/* Status Effects */}
          {player.slowTimer > 0 && (
               <div className="absolute right-4 bottom-[-20px] text-pink-500 text-[10px] font-bold animate-bounce flex items-center gap-1">
                    <Snail className="w-3 h-3" /> {t.slow}
               </div>
          )}
      </div>

      {/* Boss Health Bar */}
      {bossHp > 0 && (
          <div className="absolute top-20 md:bottom-24 left-1/2 -translate-x-1/2 w-64 md:w-96 pointer-events-none z-10">
              <div className="flex justify-between items-end mb-1 px-1">
                  <span className="text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-wider drop-shadow-sm">{bossName}</span>
                  <span className="text-[10px] md:text-xs text-red-400 font-mono">{Math.ceil((bossHp/bossMaxHp)*100)}%</span>
              </div>
              <div className="w-full h-4 md:h-6 bg-slate-900 border-2 md:border-4 border-slate-800 relative shadow-xl">
                  <div className="h-full bg-red-700 transition-all duration-200" style={{ width: `${(bossHp/bossMaxHp)*100}%` }}>
                       <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
                  </div>
              </div>
          </div>
      )}

      {/* Mobile Controls Overlay */}
      {isMobile && (
          <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end pb-8 px-4 md:hidden">
              <div className="flex justify-between items-end w-full">
                  
                  {/* LEFT: D-PAD */}
                  <div className="relative w-40 h-40 pointer-events-auto opacity-70">
                      {/* UP */}
                      <button 
                        className="absolute top-0 left-14 w-12 h-14 bg-slate-800/90 rounded-t-lg border-2 border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('up', true)} onTouchEnd={handleTouch('up', false)}
                        onMouseDown={handleTouch('up', true)} onMouseUp={handleTouch('up', false)}
                      >
                          <ArrowUp className="text-slate-300 w-6 h-6" />
                      </button>
                      {/* DOWN */}
                      <button 
                        className="absolute bottom-0 left-14 w-12 h-14 bg-slate-800/90 rounded-b-lg border-2 border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('down', true)} onTouchEnd={handleTouch('down', false)}
                        onMouseDown={handleTouch('down', true)} onMouseUp={handleTouch('down', false)}
                      >
                          <ArrowDown className="text-slate-300 w-6 h-6" />
                      </button>
                      {/* LEFT */}
                      <button 
                        className="absolute top-14 left-0 w-14 h-12 bg-slate-800/90 rounded-l-lg border-2 border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}
                        onMouseDown={handleTouch('left', true)} onMouseUp={handleTouch('left', false)}
                      >
                          <ArrowLeft className="text-slate-300 w-6 h-6" />
                      </button>
                      {/* RIGHT */}
                      <button 
                        className="absolute top-14 right-0 w-14 h-12 bg-slate-800/90 rounded-r-lg border-2 border-slate-500 flex items-center justify-center active:bg-slate-600 active:scale-95"
                        onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}
                        onMouseDown={handleTouch('right', true)} onMouseUp={handleTouch('right', false)}
                      >
                          <ArrowRight className="text-slate-300 w-6 h-6" />
                      </button>
                      {/* Center Decor */}
                      <div className="absolute top-14 left-14 w-12 h-12 bg-slate-900 border border-slate-700" />
                  </div>

                  {/* RIGHT: ACTION BUTTONS (Arc Layout) */}
                  <div className="relative w-48 h-40 pointer-events-auto opacity-80">
                      {/* DASH (Top) */}
                      <button 
                        className="absolute top-0 right-16 w-14 h-14 bg-yellow-600/90 rounded-full border-4 border-yellow-400 flex items-center justify-center shadow-lg active:bg-yellow-500 active:scale-95"
                        onTouchStart={handleTouch('dash', true)} onTouchEnd={handleTouch('dash', false)}
                        onMouseDown={handleTouch('dash', true)} onMouseUp={handleTouch('dash', false)}
                      >
                          <span className="font-bold text-white text-xs">DASH</span>
                      </button>
                      
                      {/* SHOOT (Left) */}
                      <button 
                        className="absolute bottom-4 left-0 w-16 h-16 bg-red-600/90 rounded-full border-4 border-red-400 flex items-center justify-center shadow-lg active:bg-red-500 active:scale-95"
                        onTouchStart={handleTouch('shoot', true)} onTouchEnd={handleTouch('shoot', false)}
                        onMouseDown={handleTouch('shoot', true)} onMouseUp={handleTouch('shoot', false)}
                      >
                           <Crosshair className="w-8 h-8 text-white" />
                      </button>

                      {/* JUMP (Right/Bottom) */}
                      <button 
                        className="absolute bottom-0 right-0 w-20 h-20 bg-blue-600/90 rounded-full border-4 border-blue-400 flex items-center justify-center shadow-lg active:bg-blue-500 active:scale-95"
                        onTouchStart={handleTouch('jump', true)} onTouchEnd={handleTouch('jump', false)}
                        onMouseDown={handleTouch('jump', true)} onMouseUp={handleTouch('jump', false)}
                      >
                          <span className="font-bold text-white text-lg">JUMP</span>
                      </button>
                  </div>

              </div>
          </div>
      )}
    </>
  );
};
