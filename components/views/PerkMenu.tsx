
import React, { useState } from 'react';
import { Perk, Language } from '../../types';
import { Shield, Heart, Wind, Zap, Sword, Plus } from 'lucide-react';
import { TEXT } from '../../utils/locales';

interface PerkMenuProps {
  perks: Perk[];
  onSelect: (perkId: string) => void;
  lang: Language;
}

export const PerkMenu: React.FC<PerkMenuProps> = ({ perks, onSelect, lang }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const t = TEXT[lang].perks;

  const getIcon = (icon: string) => {
      switch(icon) {
          case 'shield': return <Shield className="w-12 h-12" />;
          case 'heart': return <Heart className="w-12 h-12" />;
          case 'wind': return <Wind className="w-12 h-12" />;
          case 'zap': return <Zap className="w-12 h-12" />;
          case 'sword': return <Sword className="w-12 h-12" />;
          case 'plus': return <Plus className="w-12 h-12" />;
          default: return <Zap className="w-12 h-12" />;
      }
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <h2 className="text-3xl md:text-5xl font-bold text-yellow-400 mb-8 uppercase tracking-widest drop-shadow-lg text-center">
        {t.title}
      </h2>
      <p className="text-slate-300 mb-8 font-mono text-center">{t.subtitle}</p>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch">
        {perks.map((perk) => (
          <button
            key={perk.id}
            onClick={() => onSelect(perk.id)}
            onMouseEnter={() => setHovered(perk.id)}
            onMouseLeave={() => setHovered(null)}
            className={`
                relative flex-1 bg-slate-800 border-4 rounded-xl p-6 flex flex-col items-center gap-4 transition-all duration-300
                ${hovered === perk.id ? 'scale-105 border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'border-slate-600 hover:border-slate-400'}
            `}
            style={{ borderColor: hovered === perk.id ? perk.color : undefined }}
          >
            <div 
                className={`p-4 rounded-full bg-slate-900 border-2`}
                style={{ borderColor: perk.color, color: perk.color }}
            >
                {getIcon(perk.icon)}
            </div>
            
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">{perk.name}</h3>
            
            <p className="text-sm text-slate-400 text-center font-mono leading-relaxed">
                {perk.description}
            </p>

            {perk.rarity === 'legendary' && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-bold uppercase rounded">
                    LEGENDARY
                </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
