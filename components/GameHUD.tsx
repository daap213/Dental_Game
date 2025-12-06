
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
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 max-w-[800px] mx-auto flex justify-between items-start pointer-events-none px-4">
          <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700">
                      <Heart className="text-red-500 w-5 h-5 fill-red-500" />
                      <div className="w-32 h-4 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${hp}%` }} />
                      </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-yellow-400 font-mono text-sm">
                       <span className="text-xs text-slate-400">STAGE</span>
                       <span className="text-xl font-bold">{stage}</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-yellow-400 font-mono">
                  <span>SCORE:</span>
                  <span>{score.toString().padStart(6, '0')}</span>
              </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-blue-300">
              {player.weapon === 'normal' && <Rocket className="w-4 h-4" />}
              {player.weapon === 'spread' && <Crosshair className="w-4 h-4" />}
              {player.weapon === 'laser' && <Zap className="w-4 h-4" />}
              {player.weapon === 'mouthwash' && <Waves className="w-4 h-4" />}
              {player.weapon === 'floss' && <Wind className="w-4 h-4" />}
              {player.weapon === 'toothbrush' && <Sword className="w-4 h-4" />}
              <span className="text-xs uppercase mr-2">{player.weapon}</span>
              <div className="flex items-center text-yellow-400 border-l border-slate-600 pl-2">
                  <ChevronsUp className="w-3 h-3 mr-1" />
                  <span className="text-xs font-bold">LVL {player.weaponLevel}</span>
              </div>
              {player.slowTimer > 0 && (
                   <div className="flex items-center text-pink-400 border-l border-slate-600 pl-2 animate-pulse">
                        <Snail className="w-3 h-3 mr-1" />
                        <span className="text-xs font-bold">SLOWED</span>
                   </div>
              )}
          </div>
      </div>

      {/* Boss Health Bar */}
      {bossHp > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 md:w-96 bg-slate-900/90 p-2 rounded border-2 border-red-900 pointer-events-none">
              <div className="flex justify-between text-xs text-red-500 font-bold mb-1 uppercase">
                  <span>{bossName}</span>
                  <span>{Math.ceil((bossHp/bossMaxHp)*100)}%</span>
              </div>
              <div className="w-full h-4 bg-red-950 rounded overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${(bossHp/bossMaxHp)*100}%` }} />
              </div>
          </div>
      )}

      {/* Mobile Controls */}
      {isMobile && (
          <div className="absolute bottom-4 left-0 right-0 px-8 flex justify-between select-none touch-none">
              <div className="flex gap-4">
                  <button 
                    className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                    onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}
                    onMouseDown={handleTouch('left', true)} onMouseUp={handleTouch('left', false)}
                  >←</button>
                  <button 
                    className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                    onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}
                    onMouseDown={handleTouch('right', true)} onMouseUp={handleTouch('right', false)}
                  >→</button>
              </div>
              <div className="flex gap-4">
                  <button 
                    className="w-14 h-14 bg-yellow-500/40 rounded-full flex items-center justify-center active:bg-yellow-500/60 border-2 border-yellow-400"
                    onTouchStart={handleTouch('dash', true)} onTouchEnd={handleTouch('dash', false)}
                    onMouseDown={handleTouch('dash', true)} onMouseUp={handleTouch('dash', false)}
                  >D</button>
                  <button 
                    className="w-14 h-14 bg-blue-500/40 rounded-full flex items-center justify-center active:bg-blue-500/60 border-2 border-blue-400"
                    onTouchStart={handleTouch('shoot', true)} onTouchEnd={handleTouch('shoot', false)}
                    onMouseDown={handleTouch('shoot', true)} onMouseUp={handleTouch('shoot', false)}
                  >F</button>
                  <button 
                    className="w-14 h-14 bg-green-500/40 rounded-full flex items-center justify-center active:bg-green-500/60 border-2 border-green-400"
                    onTouchStart={handleTouch('jump', true)} onTouchEnd={handleTouch('jump', false)}
                    onMouseDown={handleTouch('jump', true)} onMouseUp={handleTouch('jump', false)}
                  >J</button>
              </div>
          </div>
      )}
    </>
  );
};
