import React, { useState } from 'react';
import { Perk, Language } from '../../types';
import { Shield, Heart, Wind, Zap, Sword, Plus } from 'lucide-react';
import { TEXT } from '../../i18n';
import { useFitScale } from '../useFitScale';

interface PerkMenuProps {
  perks: Perk[];
  onSelect: (perkId: string) => void;
  lang: Language;
}

const ICONS: Record<string, React.ReactNode> = {
  shield: <Shield className="h-9 w-9" strokeWidth={3} />,
  heart: <Heart className="h-9 w-9" strokeWidth={3} />,
  wind: <Wind className="h-9 w-9" strokeWidth={3} />,
  zap: <Zap className="h-9 w-9" strokeWidth={3} />,
  sword: <Sword className="h-9 w-9" strokeWidth={3} />,
  plus: <Plus className="h-9 w-9" strokeWidth={3} />,
};

export const PerkMenu: React.FC<PerkMenuProps> = ({ perks, onSelect, lang }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const t = TEXT[lang].perks;
  const { containerRef, contentRef, scale } = useFitScale<HTMLDivElement, HTMLDivElement>();

  return (
    <div
      ref={containerRef}
      className="pixel-crt absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/90"
    >
      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})` }}
        className="flex w-full max-w-4xl flex-col items-center gap-5 p-4"
      >
        <div className="text-center">
          <h2 className="pixel-title text-xl tracking-[0.2em] text-yellow-300 uppercase md:text-2xl">
            {t.title}
          </h2>
          <p className="pixel-text-shadow mt-3 text-[9px] tracking-[0.2em] text-slate-300 uppercase">
            {t.subtitle}
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch justify-center gap-4 md:flex-row">
          {perks.map((perk) => {
            const isHovered = hovered === perk.id;
            return (
              <button
                key={perk.id}
                type="button"
                onClick={() => onSelect(perk.id)}
                onMouseEnter={() => setHovered(perk.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(perk.id)}
                onBlur={() => setHovered(null)}
                className="pixel-btn pixel-dither relative flex flex-1 cursor-pointer flex-col items-center gap-3 bg-slate-800 p-4"
                // El color de cada perk manda sobre el borde; al apuntarlo se
                // enciende del todo en vez de crecer con un scale.
                style={{
                  borderColor: isHovered ? perk.color : '#475569',
                  backgroundColor: isHovered ? '#1e293b' : undefined,
                }}
              >
                {perk.rarity === 'legendary' && (
                  <span className="pixel-inset pixel-blink absolute -top-2 -right-2 border-yellow-600 bg-yellow-400 px-1.5 py-0.5 text-[7px] tracking-wider text-black uppercase">
                    ★
                  </span>
                )}

                <div
                  className="pixel-inset border-slate-700 bg-slate-950 p-3"
                  style={{ color: perk.color, borderColor: perk.color }}
                >
                  {ICONS[perk.icon] ?? ICONS.zap}
                </div>

                <h3
                  className="pixel-text-shadow text-center text-[10px] leading-relaxed tracking-wider uppercase"
                  style={{ color: isHovered ? perk.color : '#ffffff' }}
                >
                  {perk.name}
                </h3>

                <p className="text-center text-[8px] leading-[1.9] text-slate-400">
                  {perk.description}
                </p>

                <span
                  aria-hidden
                  className={`text-[8px] ${isHovered ? 'pixel-blink text-white' : 'opacity-0'}`}
                >
                  ▶ SELECT
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
