
import React, { useEffect, useRef } from 'react';
import { Heart, Cpu, User, ArrowLeft, Gamepad2 } from 'lucide-react';

interface CreditsProps {
  onClose: () => void;
}

export const Credits: React.FC<CreditsProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set low resolution for pixelated look
    const w = 400;
    const h = 225;
    canvas.width = w;
    canvas.height = h;

    // --- ART GENERATION ---

    // 1. Sky / Background (Epic Void)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#020617'); // Dark Blue/Black
    skyGrad.addColorStop(1, '#1e1b4b'); // Indigo
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for(let i=0; i<50; i++) {
        ctx.fillStyle = Math.random() > 0.8 ? '#fbbf24' : '#fff';
        ctx.globalAlpha = Math.random();
        ctx.fillRect(Math.random()*w, Math.random()*h*0.6, 1, 1);
    }
    ctx.globalAlpha = 1.0;

    // Moon (A Giant Molar Silhouette)
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(w*0.8, h*0.2, 30, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Crater
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(w*0.8-10, h*0.2-5, 8, 0, Math.PI*2); ctx.fill();

    // 2. Mountain of Defeated Bacteria (Foreground)
    const mountainGrad = ctx.createLinearGradient(0, h/2, 0, h);
    mountainGrad.addColorStop(0, '#064e3b'); // Dark Green
    mountainGrad.addColorStop(1, '#022c22'); // Black Green
    ctx.fillStyle = mountainGrad;
    
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h - 40);
    // Jagged pile
    for(let x=0; x<=w; x+=10) {
        ctx.lineTo(x, h - 40 - Math.random()*15 - (Math.abs(x - w/2) < 50 ? 20 : 0)); // Higher in middle
    }
    ctx.lineTo(w, h - 40);
    ctx.lineTo(w, h);
    ctx.fill();

    // Dead Bacteria Details
    ctx.fillStyle = '#065f46';
    for(let i=0; i<20; i++) {
        const bx = Math.random() * w;
        const by = h - Math.random() * 40;
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#042f2e'; ctx.beginPath(); ctx.arc(bx+1, by+1, 1, 0, Math.PI*2); ctx.fill(); // Eye X
        ctx.fillStyle = '#065f46';
    }

    // 3. THE HERO (Warrior Tooth)
    const cx = w / 2;
    const cy = h - 70;
    
    ctx.save();
    
    // Cape (Flowing in wind)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 10);
    ctx.bezierCurveTo(cx - 40, cy + 20, cx - 50, cy + 40, cx - 60, cy + 10); // Flow left
    ctx.lineTo(cx - 10, cy + 30);
    ctx.fill();

    // Tooth Body
    const tw = 40; 
    const th = 50;
    ctx.translate(cx - tw/2, cy);

    // Body Shape
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(tw/2, -10, tw, 10); // Top
    ctx.quadraticCurveTo(tw+5, th/2, tw-5, th-5); // Right
    ctx.lineTo(tw/2+5, th); // Root R
    ctx.lineTo(tw/2, th-10); // Crotch
    ctx.lineTo(tw/2-5, th); // Root L
    ctx.lineTo(5, th-5); // Left
    ctx.quadraticCurveTo(-5, th/2, 0, 10);
    ctx.fill();

    // Shading (Muscle definition)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.arc(tw/2, 25, 10, 0, Math.PI, false); ctx.fill(); // Pecs?
    
    // Face (War Paint)
    ctx.fillStyle = '#ef4444'; // Red Bandana
    ctx.fillRect(0, 12, tw, 6);
    ctx.fillRect(tw, 12, 10, 4); // Knot flying
    
    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); 
    ctx.moveTo(10, 18); ctx.lineTo(18, 18); ctx.lineTo(14, 15); ctx.fill(); // Left angry
    ctx.moveTo(22, 18); ctx.lineTo(30, 18); ctx.lineTo(26, 15); ctx.fill(); // Right angry

    // Scar
    ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, 10); ctx.lineTo(12, 25); ctx.stroke();

    // 4. THE WEAPON (Toothbrush Greatsword)
    // Held over shoulder
    ctx.translate(tw, 15);
    ctx.rotate(-Math.PI / 4);

    // Handle
    ctx.fillStyle = '#3b82f6'; // Blue handle
    ctx.fillRect(-10, -60, 6, 80);
    // Grip details
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-10, -20, 6, 5);
    ctx.fillRect(-10, -10, 6, 5);

    // Head
    ctx.fillStyle = '#fff';
    ctx.fillRect(-14, -80, 14, 25);
    
    // Bristles (Glowing)
    ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#0ea5e9';
    for(let i=0; i<4; i++) {
        ctx.fillRect(-14 + (i*3), -80, 2, 25);
    }
    ctx.shadowBlur = 0;

    ctx.restore();

    // 5. Atmospheric Effects (Dust/Embers)
    ctx.fillStyle = '#fca5a5';
    for(let i=0; i<30; i++) {
        const px = Math.random() * w;
        const py = h - Math.random() * 80;
        const size = Math.random() * 2;
        ctx.globalAlpha = Math.random() * 0.6;
        ctx.fillRect(px, py, size, size);
    }

  }, []);

  return (
    <div className="absolute inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col animate-in fade-in duration-500">
      
      {/* EPIC BACKGROUND CANVAS */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Overlay gradient to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40 z-0" />

      {/* Header */}
      <div className="relative z-10 p-6 border-b-4 border-slate-700/50 bg-slate-900/80 backdrop-blur-sm flex justify-between items-center shrink-0">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-widest uppercase drop-shadow-md">
          CREDITS
        </h2>
        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border-2 border-slate-600 transition-all shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          BACK
        </button>
      </div>

      {/* Scrolling Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center gap-12 scroll-smooth">
        
        {/* Developer */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-100 group">
          <div className="p-4 bg-blue-950/80 rounded-full border-2 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
            <Cpu className="w-12 h-12 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-blue-400 tracking-[0.2em] uppercase mb-1 text-shadow">Lead Developer (AI)</h3>
            <p className="text-4xl font-bold text-white drop-shadow-lg font-mono">GEMINI</p>
          </div>
        </div>

        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent rounded-full" />

        {/* Producer */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-200 group">
           <div className="p-4 bg-emerald-950/80 rounded-full border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform">
            <User className="w-12 h-12 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-400 tracking-[0.2em] uppercase mb-1 text-shadow">Created By</h3>
            <p className="text-4xl font-bold text-white drop-shadow-lg font-mono">DANIEL</p>
          </div>
        </div>

        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent rounded-full" />

        {/* QA & Ideas */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-300 group">
           <div className="p-4 bg-yellow-950/80 rounded-full border-2 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.5)] group-hover:scale-110 transition-transform">
            <Gamepad2 className="w-12 h-12 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-yellow-400 tracking-[0.2em] uppercase mb-1 text-shadow">Tester & Ideas</h3>
            <p className="text-4xl font-bold text-white drop-shadow-lg font-mono">CALI</p>
          </div>
        </div>

        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent rounded-full" />

        {/* Dedication */}
        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom duration-700 delay-500">
           <div className="p-4 bg-pink-950/80 rounded-full border-2 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.6)] animate-pulse">
            <Heart className="w-12 h-12 text-pink-400 fill-pink-400/20" />
          </div>
          <div className="max-w-md bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-pink-500/20">
            <h3 className="text-xs font-bold text-pink-400 tracking-[0.2em] uppercase mb-2">Special Dedication</h3>
            <p className="text-2xl font-bold text-white mb-2 tracking-wide">Dr. Melanie</p>
            <p className="text-lg text-pink-200 italic font-serif">"My favorite dentist."</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-slate-500 text-xs font-mono bg-black/40 px-4 py-2 rounded">
            SUPER MOLAR: PLAQUE ATTACK © {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
};
