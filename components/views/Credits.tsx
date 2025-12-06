
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

    // Higher internal resolution for more detail, scaled down by CSS
    const w = 640;
    const h = 360;
    canvas.width = w;
    canvas.height = h;

    // --- 1. EPIC SKY (The Dawn of Victory) ---
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0f172a'); // Deep Space Blue
    skyGrad.addColorStop(0.4, '#312e81'); // Indigo
    skyGrad.addColorStop(0.8, '#be185d'); // Pink/Red Horizon
    skyGrad.addColorStop(1, '#f59e0b'); // Golden Sunrise
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < 150; i++) {
        const opacity = Math.random();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        const size = Math.random() > 0.9 ? 1.5 : 0.8;
        ctx.fillRect(Math.random() * w, Math.random() * h * 0.6, size, size);
    }

    // The "Enamel Moon" (Giant Molar Planet)
    const mx = w * 0.85;
    const my = h * 0.25;
    const mr = 60;
    
    // Moon Glow
    const moonGlow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 3);
    moonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    moonGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, w, h);

    // Moon Body
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    const moonGrad = ctx.createRadialGradient(mx - 20, my - 20, 10, mx, my, mr);
    moonGrad.addColorStop(0, '#f8fafc');
    moonGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = moonGrad;
    ctx.fill();
    
    // Moon Craters (Decay spots)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
    for(let i=0; i<5; i++) {
        ctx.beginPath(); 
        ctx.arc(mx + (Math.random()-0.5)*60, my + (Math.random()-0.5)*60, 4 + Math.random()*8, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();

    // --- 2. DISTANT MOLAR MOUNTAINS ---
    // Massive silhouettes in the distance
    ctx.fillStyle = '#1e1b4b'; // Dark Indigo
    ctx.beginPath();
    ctx.moveTo(0, h);
    let mX = 0;
    while(mX < w) {
        const mW = 50 + Math.random() * 100;
        const mH = 50 + Math.random() * 80;
        // Draw molar shape silhouette
        ctx.bezierCurveTo(mX + mW/4, h - mH, mX + mW*0.75, h - mH - 20, mX + mW, h);
        mX += mW - 20; // Overlap
    }
    ctx.lineTo(w, h);
    ctx.fill();

    // Mist/Fog at the base
    const mistGrad = ctx.createLinearGradient(0, h - 50, 0, h);
    mistGrad.addColorStop(0, 'rgba(244, 114, 182, 0)');
    mistGrad.addColorStop(1, 'rgba(244, 114, 182, 0.3)'); // Pink mist
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, h - 100, w, 100);

    // --- 3. FOREGROUND CLIFF (Mountain of Defeated Foes) ---
    // Rugged terrain
    const cliffHeight = h * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h - cliffHeight);
    
    // Jagged surface
    let cX = 0;
    let cY = h - cliffHeight;
    while(cX < w) {
        const step = 5 + Math.random() * 10;
        const bump = (Math.random() - 0.4) * 10; // Tend upwards slightly
        cX += step;
        cY += bump;
        if (cX > w * 0.4 && cX < w * 0.6) cY -= 2; // Peak in middle
        ctx.lineTo(cX, cY);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    
    // Cliff Gradient
    const cliffGrad = ctx.createLinearGradient(0, h - cliffHeight, 0, h);
    cliffGrad.addColorStop(0, '#022c22'); // Black Green top
    cliffGrad.addColorStop(1, '#000000'); // Black bottom
    ctx.fillStyle = cliffGrad;
    ctx.fill();

    // Texture (Skulls/Debris)
    ctx.fillStyle = 'rgba(6, 78, 59, 0.5)';
    for(let i=0; i<400; i++) {
        const rx = Math.random() * w;
        const ry = h - cliffHeight + (Math.random() * cliffHeight);
        if (ry > h - cliffHeight + 20) { // Keep below "skyline" roughly
             const s = Math.random() * 4;
             ctx.fillRect(rx, ry, s, s);
        }
    }
    
    // Highlight edges of the debris
    ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
    for(let i=0; i<100; i++) {
        const rx = Math.random() * w;
        const ry = h - cliffHeight + 10 + (Math.random() * cliffHeight);
        ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI*2); ctx.fill();
    }

    // --- 4. THE HERO (Detailed Warrior Tooth) ---
    const heroX = w * 0.5;
    const heroY = h - cliffHeight - 40; // Planted on peak
    const scale = 1.5;

    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.scale(scale, scale);

    // -- CAPE (Dramatic flow) --
    ctx.fillStyle = '#b91c1c'; // Dark Red
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    // Beziers for folding cloth
    ctx.bezierCurveTo(-20, 15, -40, 5, -60, 15); // Top edge flying left
    ctx.lineTo(-55, 35); // End of cape
    ctx.bezierCurveTo(-30, 25, -10, 40, 5, 30); // Bottom edge
    ctx.closePath();
    ctx.fill();
    // Cape Highlights
    ctx.fillStyle = '#ef4444'; 
    ctx.beginPath();
    ctx.moveTo(-5, 10); ctx.bezierCurveTo(-20, 15, -40, 5, -60, 15);
    ctx.lineTo(-58, 18); ctx.bezierCurveTo(-38, 8, -18, 18, -5, 12);
    ctx.fill();

    // -- SWORD (The Excalibur Toothbrush) --
    // Planted in ground
    ctx.save();
    ctx.rotate(0.1); // Slight tilt
    
    // Blade/Bristles (Glowing Energy)
    ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ecfeff'; // Core white
    ctx.fillRect(12, -10, 8, 50); // Bristle block planted
    
    // Bristle details
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(14, -10, 1, 50); ctx.fillRect(17, -10, 1, 50);
    
    // Handle (Sword Hilt)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#475569'; // Grey metal
    ctx.fillRect(14, -40, 4, 30); // Shaft
    ctx.fillStyle = '#1e293b'; // Grip
    ctx.fillRect(13, -35, 6, 15);
    // Pommel
    ctx.fillStyle = '#f59e0b'; // Gold
    ctx.beginPath(); ctx.arc(16, -42, 3, 0, Math.PI*2); ctx.fill();
    // Crossguard
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(10, -10, 12, 4);

    ctx.restore();

    // -- BODY (Tooth Shape) --
    // Rim Lighting Effect
    ctx.shadowColor = '#fcd34d'; // Golden rim light from sun
    ctx.shadowBlur = 5;
    
    // Main Body
    const gradBody = ctx.createLinearGradient(-15, -20, 15, 20);
    gradBody.addColorStop(0, '#f8fafc');
    gradBody.addColorStop(1, '#94a3b8'); // Shadowed bottom
    ctx.fillStyle = gradBody;

    ctx.beginPath();
    // Crown
    ctx.moveTo(-12, -5);
    ctx.quadraticCurveTo(0, -15, 12, -5); 
    // Body
    ctx.quadraticCurveTo(18, 10, 12, 25); // Right side
    ctx.lineTo(6, 35); // Root R tip
    ctx.lineTo(0, 20); // Crotch
    ctx.lineTo(-6, 35); // Root L tip
    ctx.lineTo(-12, 25); // Left side
    ctx.quadraticCurveTo(-18, 10, -12, -5);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // -- DETAILS --
    // Red Headband
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-13, -2, 26, 4);
    // Bandana tails blowing left
    ctx.beginPath(); ctx.moveTo(-13, -2); ctx.quadraticCurveTo(-20, -5, -25, 0); ctx.lineTo(-25, 3); ctx.quadraticCurveTo(-20, 0, -13, 2); ctx.fill();

    // Face
    ctx.fillStyle = '#0f172a';
    // Angry Eyes
    ctx.beginPath();
    ctx.moveTo(-8, 5); ctx.lineTo(-2, 5); ctx.lineTo(-5, 8); ctx.fill(); // L
    ctx.moveTo(2, 5); ctx.lineTo(8, 5); ctx.lineTo(5, 8); ctx.fill(); // R
    
    // Battle Scars
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-5, 20); ctx.stroke();

    // Hand on Sword Hilt
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(15, -10, 4, 0, Math.PI*2); ctx.fill(); // Hand grabbing hilt

    ctx.restore();

    // --- 5. ATMOSPHERICS (Embers & Rays) ---
    // God Rays
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const rayGrad = ctx.createLinearGradient(w/2, 0, w/2, h);
    rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rayGrad.addColorStop(1, 'rgba(253, 186, 116, 0.2)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.lineTo(w/2, h/2); ctx.fill();
    ctx.restore();

    // Rising Embers
    for(let i=0; i<100; i++) {
        const x = Math.random() * w;
        const y = h - (Math.random() * h * 0.5);
        const s = Math.random() * 2;
        ctx.fillStyle = Math.random() > 0.5 ? '#fca5a5' : '#fcd34d';
        ctx.globalAlpha = Math.random();
        ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1.0;

    // Vignette
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.4, w/2, h/2, h);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

  }, []);

  return (
    <div className="absolute inset-0 bg-slate-950 z-50 overflow-hidden flex flex-col animate-in fade-in duration-500">
      
      {/* EPIC BACKGROUND CANVAS */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Heavy overlay gradient to ensure high readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-slate-950/90 z-0 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 p-6 border-b-4 border-slate-700/50 bg-slate-950/80 backdrop-blur-md flex justify-between items-center shrink-0 shadow-xl">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-widest uppercase drop-shadow-md">
          CREDITS
        </h2>
        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-600 transition-all shadow-lg font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          BACK
        </button>
      </div>

      {/* Scrolling Content - Centered Panel */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center scroll-smooth">
        
        <div className="w-full max-w-2xl bg-slate-950/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-8 md:p-12 shadow-2xl flex flex-col items-center gap-16 mb-20">
            
            {/* Developer */}
            <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-700 delay-100 group w-full border-b border-slate-800/50 pb-8">
            <div className="p-4 bg-blue-950 rounded-full border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform duration-500">
                <Cpu className="w-10 h-10 text-blue-400" />
            </div>
            <div className="text-center">
                <h3 className="text-xs font-bold text-blue-400 tracking-[0.3em] uppercase mb-2">Lead Developer (AI)</h3>
                <p className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-sans tracking-wide">GEMINI</p>
            </div>
            </div>

            {/* Producer */}
            <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-700 delay-200 group w-full border-b border-slate-800/50 pb-8">
            <div className="p-4 bg-emerald-950 rounded-full border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform duration-500">
                <User className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-center">
                <h3 className="text-xs font-bold text-emerald-400 tracking-[0.3em] uppercase mb-2">Created By</h3>
                <p className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-sans tracking-wide">DANIEL</p>
            </div>
            </div>

            {/* QA & Ideas */}
            <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-700 delay-300 group w-full border-b border-slate-800/50 pb-8">
            <div className="p-4 bg-yellow-950 rounded-full border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.3)] group-hover:scale-110 transition-transform duration-500">
                <Gamepad2 className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="text-center">
                <h3 className="text-xs font-bold text-yellow-400 tracking-[0.3em] uppercase mb-2">Tester & Ideas</h3>
                <p className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-sans tracking-wide">CALI</p>
            </div>
            </div>

            {/* Dedication */}
            <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom duration-700 delay-500 w-full bg-gradient-to-b from-pink-950/20 to-transparent p-6 rounded-lg border border-pink-500/10">
            <div className="p-4 bg-pink-950 rounded-full border-2 border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.4)] animate-pulse">
                <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />
            </div>
            <div className="text-center">
                <h3 className="text-xs font-bold text-pink-400 tracking-[0.3em] uppercase mb-3">Special Dedication</h3>
                <p className="text-3xl font-black text-white mb-2 tracking-wide drop-shadow-md">Dr. Melanie</p>
                <p className="text-xl text-pink-200 italic font-serif opacity-90">"My favorite dentist."</p>
            </div>
            </div>

            {/* Footer */}
            <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest pt-4">
                Super Molar: Plaque Attack © {new Date().getFullYear()}
            </div>
        </div>
      </div>
    </div>
  );
};
