
import React, { useState } from 'react';
import { InputMethod } from '../../types';
import { MousePointer, Keyboard, Info, X, ShieldAlert, Crosshair, Skull, Sword, Zap, Wind, Waves, Rocket, User } from 'lucide-react';
import { Credits } from './Credits';

interface MainMenuProps {
  onStart: () => void;
  briefing: string;
  inputMethod: InputMethod;
  setInputMethod: (method: InputMethod) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, briefing, inputMethod, setInputMethod }) => {
  const [showIntel, setShowIntel] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  if (showCredits) {
    return <Credits onClose={() => setShowCredits(false)} />;
  }

  if (showIntel) {
    return <IntelDatabase onClose={() => setShowIntel(false)} />;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-8 animate-in fade-in">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-pink-400 text-center uppercase tracking-widest shadow-lg" style={{textShadow: '4px 4px 0px #be185d'}}>
          Super Molar
      </h1>
      <h2 className="text-xl md:text-2xl mb-6 text-blue-300">Plaque Attack</h2>
      
      <div className="max-w-md bg-slate-800 p-6 rounded-lg border-2 border-slate-600 mb-6 w-full relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 animate-pulse" />
          <h3 className="text-yellow-400 text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"/>
            MISSION BRIEFING (GenAI):
          </h3>
          <p className="font-mono text-sm leading-relaxed text-green-300">
              {briefing}
          </p>
      </div>

      <div className="flex flex-col items-center gap-4 mb-8">
          <h3 className="text-xs text-slate-400 uppercase tracking-widest">Select Aiming Style</h3>
          <div className="flex gap-4">
              <button
                  onClick={() => setInputMethod('mouse')}
                  className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${inputMethod === 'mouse' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
              >
                  <MousePointer className="w-4 h-4" />
                  MOUSE AIM
              </button>
              <button
                  onClick={() => setInputMethod('keyboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${inputMethod === 'keyboard' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
              >
                  <Keyboard className="w-4 h-4" />
                  KEYBOARD ONLY
              </button>
          </div>
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        <button 
            onClick={() => setShowIntel(true)}
            className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded text-lg border-2 border-slate-500 flex items-center gap-2 transition-all"
        >
            <Info className="w-5 h-5" />
            INTEL DATABASE
        </button>
        <button 
            onClick={onStart}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xl shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all border-2 border-red-400"
        >
            START OPERATION
        </button>
      </div>
      
      <div className="mt-6">
        <button 
            onClick={() => setShowCredits(true)}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold rounded text-sm border border-slate-600 flex items-center gap-2 transition-all"
        >
            <User className="w-4 h-4" />
            CREDITS
        </button>
      </div>

      <div className="mt-8 text-xs text-slate-500 flex flex-col items-center gap-2">
          <p>CONTROLS ({inputMethod === 'mouse' ? 'MOUSE' : 'KEYBOARD'})</p>
          <div className="flex gap-4 flex-wrap justify-center font-mono">
              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">A / D : Move</span>
              {inputMethod === 'keyboard' && <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">W / UP : Aim Up</span>}
              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">SPACE : Jump (x2)</span>
              {inputMethod === 'mouse' ? <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">CLICK : Shoot</span> : <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">F / K : Shoot</span>}
              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">SHIFT / R-CLICK : Dash</span>
          </div>
      </div>
    </div>
  );
};

const IntelDatabase: React.FC<{onClose: () => void}> = ({onClose}) => {
    return (
        <div className="absolute inset-0 bg-slate-900 z-50 overflow-y-auto p-4 md:p-8 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8 border-b-4 border-slate-700 pb-4">
                    <h2 className="text-3xl font-bold text-green-400 tracking-widest flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8" />
                        TACTICAL DATABASE
                    </h2>
                    <button onClick={onClose} className="p-2 bg-red-600 hover:bg-red-500 rounded text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* WEAPONS */}
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2 border-b border-blue-900 pb-2">
                            <Crosshair className="w-5 h-5" /> ARSENAL (Level Up Max 3)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <WeaponCard icon={<Rocket />} name="Normal" desc="Standard issue dental drill. Reliable." color="text-gray-300" />
                            <WeaponCard icon={<Zap />} name="Laser" desc="High-tech curing light. Pierces enemies." color="text-cyan-400" />
                            <WeaponCard icon={<Crosshair />} name="Spread" desc="Shotgun spray. Good for crowds." color="text-blue-500" />
                            <WeaponCard icon={<Waves />} name="Mouthwash" desc="Wave launcher. Pierces walls & foes." color="text-purple-400" />
                            <WeaponCard icon={<Wind />} name="Floss" desc="Melee Whip. High damage, short range." color="text-green-400" />
                            <WeaponCard icon={<Sword />} name="Toothbrush" desc="Heavy Sword. Huge arc, deflects." color="text-orange-400" />
                        </div>
                    </section>

                    {/* BOSSES */}
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2 border-b border-red-900 pb-2">
                            <Skull className="w-5 h-5" /> MOST WANTED (Bosses)
                        </h3>
                        <div className="space-y-4">
                            <EnemyRow name="The Cavity King" type="Level 1" desc="Jumps and slams. Watch out for shockwaves." color="text-gray-400" />
                            <EnemyRow name="Plaque Phantom" type="Level 2" desc="Teleports and dashes. Hard to hit." color="text-cyan-300" />
                            <EnemyRow name="Tartar Tank" type="Level 3" desc="Heavily armored. Fires mortar shells." color="text-stone-400" />
                            <EnemyRow name="General Gingivitis" type="Level 4" desc="Summons minions and fires giant lasers." color="text-red-500" />
                            <EnemyRow name="The Decay Deity" type="Level 5" desc="Bullet hell nightmare. Good luck." color="text-purple-500" />
                        </div>
                    </section>
                    
                    {/* ENEMIES */}
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 lg:col-span-2">
                         <h3 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2 border-b border-yellow-900/50 pb-2">
                            <ShieldAlert className="w-5 h-5" /> COMMON THREATS
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                             <EnemyCard name="Bacteria" desc="Green germs. They jump." />
                             <EnemyCard name="Plaque Monster" desc="Orange sludge. Durable." />
                             <EnemyCard name="Candy Bomber" desc="Drops explosives from above." />
                             <EnemyCard name="Tartar Turret" desc="Stationary shooter." />
                             <EnemyCard name="Sugar Rusher" desc="Very fast, jumps high." />
                             <EnemyCard name="Sugar Fiend" desc="Leaves sticky slowing trails." />
                             <EnemyCard name="Acid Spitter" desc="Lobs corrosive blobs." />
                             <EnemyCard name="Gingivitis Grunt" desc="Armored. Charges at you." />
                        </div>
                    </section>
                </div>
                
                <div className="mt-8 text-center">
                    <button onClick={onClose} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded border-2 border-slate-500">
                        CLOSE DATABASE
                    </button>
                </div>
            </div>
        </div>
    );
};

const WeaponCard = ({icon, name, desc, color}: any) => (
    <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded border border-slate-800">
        <div className={`${color} p-2 bg-slate-800 rounded`}>{icon}</div>
        <div>
            <h4 className={`font-bold text-sm ${color} uppercase`}>{name}</h4>
            <p className="text-xs text-slate-400">{desc}</p>
        </div>
    </div>
);

const EnemyRow = ({name, type, desc, color}: any) => (
    <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded border-l-4 border-red-900">
        <div>
            <h4 className={`font-bold ${color}`}>{name}</h4>
            <p className="text-xs text-slate-400">{desc}</p>
        </div>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{type}</span>
    </div>
);

const EnemyCard = ({name, desc}: any) => (
    <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
        <h4 className="font-bold text-sm text-yellow-100 mb-1">{name}</h4>
        <p className="text-xs text-slate-400 leading-tight">{desc}</p>
    </div>
);
