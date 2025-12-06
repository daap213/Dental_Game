
import React from 'react';
import { Heart, Cpu, User, ArrowLeft } from 'lucide-react';

interface CreditsProps {
  onClose: () => void;
}

export const Credits: React.FC<CreditsProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-6 border-b-4 border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-widest uppercase">
          CREDITS
        </h2>
        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border-2 border-slate-600 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          BACK
        </button>
      </div>

      {/* Scrolling Content */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center gap-12">
        
        {/* Developer */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-100">
          <div className="p-4 bg-blue-950/50 rounded-full border-2 border-blue-500/30">
            <Cpu className="w-12 h-12 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-blue-500 tracking-[0.2em] uppercase mb-1">Lead Developer (AI)</h3>
            <p className="text-3xl font-bold text-white text-shadow-blue">GEMINI</p>
          </div>
        </div>

        <div className="w-12 h-1 bg-slate-800 rounded-full" />

        {/* Producer */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-200">
           <div className="p-4 bg-emerald-950/50 rounded-full border-2 border-emerald-500/30">
            <User className="w-12 h-12 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-500 tracking-[0.2em] uppercase mb-1">Created By</h3>
            <p className="text-3xl font-bold text-white">DANIEL</p>
          </div>
        </div>

        <div className="w-12 h-1 bg-slate-800 rounded-full" />

        {/* Dedication */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-300">
           <div className="p-4 bg-pink-950/50 rounded-full border-2 border-pink-500/30">
            <Heart className="w-12 h-12 text-pink-400 fill-pink-400/20 animate-pulse" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xs font-bold text-pink-500 tracking-[0.2em] uppercase mb-1">Special Dedication</h3>
            <p className="text-xl font-bold text-white mb-2">Dr. Melanie</p>
            <p className="text-sm text-pink-200 italic font-serif">"My favorite dentist."</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-slate-600 text-xs font-mono">
            SUPER MOLAR: PLAQUE ATTACK © {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
};
