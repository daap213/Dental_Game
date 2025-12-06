
import React, { useState } from 'react';
import { InputMethod, LoadoutType, Language } from '../../types';
import { MousePointer, Keyboard, Info, X, ShieldAlert, Crosshair, Skull, Sword, Zap, Wind, Waves, Rocket, User, Trophy, Gift, Star, Activity, Shield, Heart, Infinity, Globe } from 'lucide-react';
import { Credits } from './Credits';
import { TEXT } from '../../utils/locales';

interface MainMenuProps {
  onStart: () => void;
  briefing: string;
  inputMethod: InputMethod;
  setInputMethod: (method: InputMethod) => void;
  loadout: LoadoutType;
  setLoadout: (l: LoadoutType) => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, briefing, inputMethod, setInputMethod, loadout, setLoadout, lang, setLang }) => {
  const [showIntel, setShowIntel] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const t = TEXT[lang].menu;

  if (showCredits) {
    return <Credits onClose={() => setShowCredits(false)} lang={lang} />;
  }

  if (showIntel) {
    return <IntelDatabase onClose={() => setShowIntel(false)} lang={lang} />;
  }

  return (
    <div className="flex flex-col items-center justify-start w-full h-full bg-slate-900 text-white p-4 pt-16 md:pt-12 animate-in fade-in overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
      
      {/* LANGUAGE TOGGLE - Z-Index High to stay clickable */}
      <button 
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 hover:text-white hover:border-slate-400 transition-all text-xs font-bold shadow-lg"
      >
          <Globe className="w-4 h-4" />
          {lang === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
      </button>

      {/* HEADER SECTION */}
      <div className="flex flex-col items-center mb-6 shrink-0">
        <h1 className="text-4xl md:text-6xl font-bold mb-2 text-pink-400 text-center uppercase tracking-widest shadow-lg leading-tight" style={{textShadow: '4px 4px 0px #be185d'}}>
            Super Molar
        </h1>
        <h2 className="text-lg md:text-2xl text-blue-300 tracking-wider font-bold">{t.subtitle}</h2>
      </div>
      
      {/* BRIEFING BOX */}
      <div className="max-w-md bg-slate-800 p-4 rounded-lg border-2 border-slate-600 mb-6 w-full relative group overflow-hidden shrink-0 shadow-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 animate-pulse" />
          <h3 className="text-yellow-400 text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"/>
            {t.briefing_label}:
          </h3>
          <p className="font-mono text-xs md:text-sm leading-relaxed text-green-300">
              {briefing === "Loading Mission..." ? t.loading : briefing}
          </p>
      </div>

      <div className="flex flex-col items-center gap-6 mb-8 w-full max-w-2xl shrink-0">
          {/* CONTROL SELECTION */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{t.select_aim}</h3>
            <div className="flex gap-4">
                <button
                    onClick={() => setInputMethod('mouse')}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${inputMethod === 'mouse' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                >
                    <MousePointer className="w-4 h-4" />
                    <span className="text-xs font-bold">{t.mouse_aim}</span>
                </button>
                <button
                    onClick={() => setInputMethod('keyboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${inputMethod === 'keyboard' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                >
                    <Keyboard className="w-4 h-4" />
                    <span className="text-xs font-bold">{t.keyboard_aim}</span>
                </button>
            </div>
          </div>

          {/* LOADOUT SELECTION */}
          <div className="flex flex-col items-center gap-2 w-full">
            <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{t.select_loadout}</h3>
            <div className="flex flex-wrap justify-center gap-2">
                <LoadoutBtn active={loadout === 'all'} onClick={() => setLoadout('all')} icon={<Infinity className="w-5 h-5"/>} label="ALL" color="text-white" />
                <LoadoutBtn active={loadout === 'normal'} onClick={() => setLoadout('normal')} icon={<Rocket className="w-5 h-5"/>} label={TEXT[lang].weapons.normal.name.substring(0,6)} color="text-gray-300" />
                <LoadoutBtn active={loadout === 'spread'} onClick={() => setLoadout('spread')} icon={<Crosshair className="w-5 h-5"/>} label={TEXT[lang].weapons.spread.name.substring(0,6)} color="text-blue-400" />
                <LoadoutBtn active={loadout === 'laser'} onClick={() => setLoadout('laser')} icon={<Zap className="w-5 h-5"/>} label={TEXT[lang].weapons.laser.name.substring(0,6)} color="text-cyan-400" />
                <LoadoutBtn active={loadout === 'mouthwash'} onClick={() => setLoadout('mouthwash')} icon={<Waves className="w-5 h-5"/>} label={TEXT[lang].weapons.mouthwash.name.substring(0,6)} color="text-purple-400" />
                <LoadoutBtn active={loadout === 'floss'} onClick={() => setLoadout('floss')} icon={<Wind className="w-5 h-5"/>} label={TEXT[lang].weapons.floss.name.substring(0,6)} color="text-green-400" />
                <LoadoutBtn active={loadout === 'toothbrush'} onClick={() => setLoadout('toothbrush')} icon={<Sword className="w-5 h-5"/>} label={TEXT[lang].weapons.toothbrush.name.substring(0,6)} color="text-orange-400" />
            </div>
            <p className="text-[10px] text-slate-500 italic mt-1 text-center max-w-sm">
                {loadout === 'all' ? t.loadout_all : t.loadout_specific}
            </p>
          </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-4 flex-wrap justify-center mb-6 shrink-0">
        <button 
            onClick={() => setShowIntel(true)}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded text-sm md:text-base border-2 border-slate-500 flex items-center gap-2 transition-all shadow-md active:translate-y-1"
        >
            <Info className="w-5 h-5" />
            {t.btn_knowledge}
        </button>
        <button 
            onClick={onStart}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-base md:text-lg shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all border-2 border-red-400 animate-pulse"
        >
            {t.btn_start}
        </button>
      </div>
      
      {/* CREDITS BTN */}
      <div className="mb-8 shrink-0">
        <button 
            onClick={() => setShowCredits(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold rounded text-xs border border-slate-600 flex items-center gap-2 transition-all"
        >
            <User className="w-3 h-3" />
            {t.btn_credits}
        </button>
      </div>

      {/* CONTROLS LEGEND */}
      <div className="text-[10px] text-slate-500 flex flex-col items-center gap-2 pb-8 shrink-0">
          <p className="uppercase tracking-widest">{t.controls} ({inputMethod === 'mouse' ? 'MOUSE' : 'KEYBOARD'})</p>
          <div className="flex gap-2 flex-wrap justify-center font-mono max-w-lg">
              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">A / D : {t.ctrl_move}</span>
              {inputMethod === 'keyboard' && <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">W / UP : {t.ctrl_aim}</span>}
              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">SPACE : {t.ctrl_jump}</span>
              {inputMethod === 'mouse' ? <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">CLICK : {t.ctrl_shoot}</span> : <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">F / K : {t.ctrl_shoot}</span>}
              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">SHIFT / R-CLICK : {t.ctrl_dash}</span>
          </div>
      </div>
    </div>
  );
};

const LoadoutBtn = ({active, onClick, icon, label, color}: any) => (
    <button 
        onClick={onClick}
        className={`
            flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all w-16 h-16 md:w-20 md:h-20
            ${active ? `bg-slate-700 border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10` : 'bg-slate-800 border-slate-600 opacity-60 hover:opacity-100 hover:bg-slate-700'}
        `}
    >
        <div className={`${color} mb-1 transform scale-90 md:scale-100`}>{icon}</div>
        <span className={`text-[9px] md:text-[10px] font-bold uppercase ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
    </button>
);

const IntelDatabase: React.FC<{onClose: () => void, lang: Language}> = ({onClose, lang}) => {
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
                <div className="flex justify-between items-center mb-8 border-b-4 border-slate-700 pb-4 sticky top-0 bg-slate-900 z-10 pt-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-green-400 tracking-widest flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8" />
                        {t.title}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-red-600 hover:bg-red-500 rounded text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                    {/* ACHIEVEMENTS (LOGROS) */}
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2 border-b border-yellow-900 pb-2">
                            <Trophy className="w-5 h-5" /> {t.achievements_title}
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            {t.achievements_desc}
                        </p>
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
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-pink-400 mb-4 flex items-center gap-2 border-b border-pink-900 pb-2">
                            <Gift className="w-5 h-5" /> {t.rewards_title}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PerkCard name={pn.enamel_shield.name} desc={pn.enamel_shield.desc} icon={<Shield className="w-4 h-4"/>} color="text-cyan-400" />
                            <PerkCard name={pn.vitality_root.name} desc={pn.vitality_root.desc} icon={<Activity className="w-4 h-4"/>} color="text-red-400" />
                            <PerkCard name={pn.aerodynamic_floss.name} desc={pn.aerodynamic_floss.desc} icon={<Wind className="w-4 h-4"/>} color="text-yellow-400" />
                            <PerkCard name={pn.extra_dash.name} desc={pn.extra_dash.desc} icon={<Wind className="w-4 h-4"/>} color="text-orange-400" />
                            <PerkCard name={pn.thick_enamel.name} desc={pn.thick_enamel.desc} icon={<Shield className="w-4 h-4"/>} color="text-indigo-400" />
                            <PerkCard name={pn.temp_immunity.name} desc={pn.temp_immunity.desc} icon={<Zap className="w-4 h-4"/>} color="text-purple-400" />
                            <PerkCard name={pn.extra_life.name} desc={pn.extra_life.desc} icon={<Heart className="w-4 h-4"/>} color="text-yellow-300" />
                            <PerkCard name={pn.bristle_rage.name} desc={pn.bristle_rage.desc} icon={<Sword className="w-4 h-4"/>} color="text-pink-400" />
                        </div>
                    </section>

                    {/* WEAPONS */}
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2 border-b border-blue-900 pb-2">
                            <Crosshair className="w-5 h-5" /> {t.arsenal_title}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <WeaponCard icon={<Rocket />} name={w.normal.name} desc={w.normal.desc} color="text-gray-300" />
                            <WeaponCard icon={<Zap />} name={w.laser.name} desc={w.laser.desc} color="text-cyan-400" />
                            <WeaponCard icon={<Crosshair />} name={w.spread.name} desc={w.spread.desc} color="text-blue-500" />
                            <WeaponCard icon={<Waves />} name={w.mouthwash.name} desc={w.mouthwash.desc} color="text-purple-400" />
                            <WeaponCard icon={<Wind />} name={w.floss.name} desc={w.floss.desc} color="text-green-400" />
                            <WeaponCard icon={<Sword />} name={w.toothbrush.name} desc={w.toothbrush.desc} color="text-orange-400" />
                        </div>
                    </section>

                    {/* BOSSES */}
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
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
                    <section className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 lg:col-span-2">
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
                    <button onClick={onClose} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded border-2 border-slate-500 shadow-lg">
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AchievementRow = ({icon, title, desc, color}: any) => (
    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-800">
        <div className={`p-2 bg-slate-800 rounded-full ${color}`}>{icon}</div>
        <div>
            <h4 className={`font-bold text-sm ${color}`}>{title}</h4>
            <p className="text-xs text-slate-400">{desc}</p>
        </div>
    </div>
);

const PerkCard = ({icon, name, desc, color}: any) => (
    <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded border border-slate-800">
        <div className={`p-1.5 bg-slate-800 rounded ${color}`}>{icon}</div>
        <div>
            <h4 className={`font-bold text-xs ${color} uppercase`}>{name}</h4>
            <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
        </div>
    </div>
);

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
