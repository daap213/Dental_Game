
import React from 'react';
import { Heart, Rocket, Crosshair, Zap, Waves, Wind, Sword, ChevronsUp, Snail } from 'lucide-react';
import { Player } from '../types';

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
}

export const GameHUD: React.FC<GameHUDProps> = ({ player, score, stage, hp, bossHp, bossMaxHp, bossName, isMobile, handleTouch }) => {
  return (
    <>
      {/* Top HUD Bar - Retro Style */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-[#111] border-b-4 border-slate-600 flex items-center justify-between px-2 md:px-6 pointer-events-none z-20 select-none shadow-xl">
          
          {/* 1. HEALTH SECTION */}
          <div className="flex items-center gap-3 pr-4 border-r-2 border-slate-700 h-10">
              <Heart className="text-red-600 w-6 h-6 fill-red-600 animate-pulse drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]" />
              <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-red-400 leading-none hidden md:block">HEALTH</span>
                  <div className="w-24 md:w-32 h-4 bg-slate-900 border-2 border-slate-600 relative">
                      <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200" style={{ width: `${hp}%` }} />
                      {/* Shine effect */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-white opacity-20" />
                  </div>
              </div>
          </div>

          {/* 2. STAGE SECTION */}
          <div className="flex items-center gap-2 px-4 border-r-2 border-slate-700 h-10">
               <div className="flex flex-col items-center">
                   <span className="text-[10px] text-yellow-600 leading-none">STAGE</span>
                   <span className="text-xl text-yellow-400 drop-shadow-md">{stage}</span>
               </div>
          </div>
              
          {/* 3. SCORE SECTION */}
          <div className="flex flex-col items-center flex-grow">
              <span className="text-[10px] text-slate-500 leading-none tracking-widest mb-1">SCORE</span>
              <span className="text-lg md:text-2xl text-white tracking-[0.1em] font-mono drop-shadow-[2px_2px_0_#000]">
                  {score.toString().padStart(6, '0')}
              </span>
          </div>

          {/* 4. WEAPON SECTION */}
          <div className="flex items-center gap-3 pl-4 border-l-2 border-slate-700 h-10">
              <div className="text-cyan-400 hidden sm:block">
                  {player.weapon === 'normal' && <Rocket className="w-6 h-6" />}
                  {player.weapon === 'spread' && <Crosshair className="w-6 h-6" />}
                  {player.weapon === 'laser' && <Zap className="w-6 h-6" />}
                  {player.weapon === 'mouthwash' && <Waves className="w-6 h-6" />}
                  {player.weapon === 'floss' && <Wind className="w-6 h-6" />}
                  {player.weapon === 'toothbrush' && <Sword className="w-6 h-6" />}
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase leading-none mb-1">{player.weapon}</span>
                  <div className="flex items-center gap-1 bg-slate-800 px-2 rounded border border-slate-600">
                      <ChevronsUp className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-white">LVL</span>
                      <span className="text-sm font-bold text-yellow-400">{player.weaponLevel}</span>
                  </div>
              </div>
          </div>

          {/* Status Effects overlay on Weapon area if needed */}
          {player.slowTimer > 0 && (
               <div className="absolute right-4 bottom-1 text-pink-500 text-[10px] font-bold animate-bounce flex items-center gap-1">
                    <Snail className="w-3 h-3" /> SLOW
               </div>
          )}
      </div>

      {/* Boss Health Bar - Bottom Centered */}
      {bossHp > 0 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-72 md:w-96 pointer-events-none z-10">
              <div className="flex justify-between items-end mb-1 px-1">
                  <span className="text-xs text-red-500 font-bold uppercase tracking-wider drop-shadow-sm">{bossName}</span>
                  <span className="text-xs text-red-400 font-mono">{Math.ceil((bossHp/bossMaxHp)*100)}%</span>
              </div>
              <div className="w-full h-6 bg-slate-900 border-4 border-slate-800 relative shadow-xl">
                  <div className="h-full bg-red-700 transition-all duration-200" style={{ width: `${(bossHp/bossMaxHp)*100}%` }}>
                       <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
                  </div>
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-white opacity-20" />
              </div>
          </div>
      )}

      {/* Mobile Controls */}
      {isMobile && (
          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between select-none touch-none z-30">
              <div className="flex gap-4">
                  <button 
                    className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center active:bg-slate-700/80 border-4 border-slate-500 shadow-lg"
                    onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}
                    onMouseDown={handleTouch('left', true)} onMouseUp={handleTouch('left', false)}
                  >
                      <span className="text-2xl text-slate-300 pb-1">←</span>
                  </button>
                  <button 
                    className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center active:bg-slate-700/80 border-4 border-slate-500 shadow-lg"
                    onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}
                    onMouseDown={handleTouch('right', true)} onMouseUp={handleTouch('right', false)}
                  >
                      <span className="text-2xl text-slate-300 pb-1">→</span>
                  </button>
              </div>
              <div className="flex gap-4">
                  <button 
                    className="w-14 h-14 bg-yellow-600/80 rounded-full flex items-center justify-center active:bg-yellow-500/80 border-4 border-yellow-400 shadow-lg"
                    onTouchStart={handleTouch('dash', true)} onTouchEnd={handleTouch('dash', false)}
                    onMouseDown={handleTouch('dash', true)} onMouseUp={handleTouch('dash', false)}
                  >
                      <span className="text-xs font-bold text-white">DASH</span>
                  </button>
                  <button 
                    className="w-16 h-16 bg-red-600/80 rounded-full flex items-center justify-center active:bg-red-500/80 border-4 border-red-400 shadow-lg"
                    onTouchStart={handleTouch('shoot', true)} onTouchEnd={handleTouch('shoot', false)}
                    onMouseDown={handleTouch('shoot', true)} onMouseUp={handleTouch('shoot', false)}
                  >
                      <Crosshair className="w-8 h-8 text-white" />
                  </button>
                  <button 
                    className="w-16 h-16 bg-blue-600/80 rounded-full flex items-center justify-center active:bg-blue-500/80 border-4 border-blue-400 shadow-lg"
                    onTouchStart={handleTouch('jump', true)} onTouchEnd={handleTouch('jump', false)}
                    onMouseDown={handleTouch('jump', true)} onMouseUp={handleTouch('jump', false)}
                  >
                      <span className="text-sm font-bold text-white">JUMP</span>
                  </button>
              </div>
          </div>
      )}
    </>
  );
};
