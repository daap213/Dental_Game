
import { Platform } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

export const generateLevel = (width: number): Platform[] => {
    const platforms: Platform[] = [];
    
    // SAFE START ZONE: Guaranteed ground
    platforms.push({ x: 0, y: CANVAS_HEIGHT - 60, w: 800, h: 60, type: 'platform', isGround: true });
    
    // Continuous Floor with gaps
    let x = 800;
    while(x < width) {
        const gap = Math.random() > 0.8 ? 100 : 0;
        const w = 400 + Math.random() * 400;
        if (gap > 0 && x + gap + w < width) {
            x += gap;
        }
        platforms.push({ x: x, y: CANVAS_HEIGHT - 60, w: w, h: 60, type: 'platform', isGround: true });
        x += w;
    }
    
    // Floating Platforms
    for (let i = 300; i < width - 500; i += 200 + Math.random() * 150) {
        if (Math.random() > 0.3) {
            const y = CANVAS_HEIGHT - 140 - Math.random() * 100;
            platforms.push({ x: i, y, w: 80 + Math.random() * 60, h: 20, type: 'platform', isGround: false });
        }
    }
    
    // Boss Arena floor
    platforms.push({ x: width - 800, y: CANVAS_HEIGHT - 60, w: 800, h: 60, type: 'platform', isGround: true });
    
    return platforms;
};

const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y, x + h, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
};

export const drawBackground = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    // 1. Dark Interior Throat
    const throatGrad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 50, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH);
    throatGrad.addColorStop(0, '#580505');
    throatGrad.addColorStop(1, '#250202');
    ctx.fillStyle = throatGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Parallax Camera Offset
    const bgOffsetX = cameraX * 0.05;
    const midBgOffsetX = cameraX * 0.2;

    // 3. Mouth Opening
    const openingX = CANVAS_WIDTH/2 - bgOffsetX; 
    const openingY = CANVAS_HEIGHT/2;
    
    ctx.save();
    
    // Draw the "Opening"
    ctx.beginPath();
    ctx.ellipse(openingX, openingY, 250, 180, 0, 0, Math.PI*2);
    const lightGrad = ctx.createRadialGradient(openingX, openingY, 50, openingX, openingY, 250);
    lightGrad.addColorStop(0, '#bae6fd'); 
    lightGrad.addColorStop(0.7, '#f472b6');
    lightGrad.addColorStop(1, 'rgba(88, 5, 5, 0)');
    ctx.fillStyle = lightGrad;
    ctx.fill();

    // 4. The Dentist
    const dentistX = openingX;
    const dentistY = openingY - 40;
    
    // Head
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(dentistX, dentistY, 100, 0, Math.PI*2); ctx.fill();

    // Cap
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath(); ctx.arc(dentistX, dentistY - 20, 102, Math.PI, 0); ctx.fill();

    // Mask
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(dentistX - 80, dentistY + 10, 160, 80);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(dentistX - 80, dentistY + 30); ctx.lineTo(dentistX - 110, dentistY);
    ctx.moveTo(dentistX + 80, dentistY + 30); ctx.lineTo(dentistX + 110, dentistY); ctx.stroke();

    // Eyes
    const eyeY = dentistY - 10;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(dentistX - 35, eyeY, 20, 15, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(dentistX + 35, eyeY, 20, 15, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(dentistX - 35, eyeY + 2, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dentistX + 35, eyeY + 2, 8, 0, Math.PI*2); ctx.fill();

    // Headlamp
    ctx.beginPath(); ctx.arc(dentistX, dentistY - 60, 25, 0, Math.PI*2);
    ctx.fillStyle = '#fef08a'; ctx.fill();
    
    // Lens Flare
    ctx.globalCompositeOperation = 'overlay';
    const flareGrad = ctx.createRadialGradient(dentistX, dentistY - 60, 10, dentistX, dentistY, 400);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    flareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = flareGrad;
    ctx.beginPath(); ctx.moveTo(dentistX, dentistY - 60);
    ctx.lineTo(dentistX - 200, CANVAS_HEIGHT); ctx.lineTo(dentistX + 200, CANVAS_HEIGHT); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // 5. Background Teeth Rows (Realistic Molars)
    const toothW = 90;
    const startToothX = -(midBgOffsetX % toothW);
    
    const topToothGrad = ctx.createLinearGradient(0, -20, 0, 60);
    topToothGrad.addColorStop(0, '#94a3b8'); // Root/Gum shadow
    topToothGrad.addColorStop(0.3, '#cbd5e1');
    topToothGrad.addColorStop(1, '#e2e8f0'); // Tip

    const botToothGrad = ctx.createLinearGradient(0, CANVAS_HEIGHT + 20, 0, CANVAS_HEIGHT - 60);
    botToothGrad.addColorStop(0, '#94a3b8');
    botToothGrad.addColorStop(0.3, '#cbd5e1');
    botToothGrad.addColorStop(1, '#e2e8f0');

    for (let x = startToothX - toothW; x < CANVAS_WIDTH; x += toothW) {
        // TOP MOLARS
        ctx.fillStyle = topToothGrad;
        ctx.beginPath();
        ctx.moveTo(x, -30);
        // Left Cusp
        ctx.quadraticCurveTo(x + 5, 50, x + toothW * 0.3, 55);
        // Central Fissure (Valley)
        ctx.quadraticCurveTo(x + toothW * 0.5, 45, x + toothW * 0.7, 55);
        // Right Cusp
        ctx.quadraticCurveTo(x + toothW - 5, 50, x + toothW, -30);
        ctx.fill();

        // Top Gums
        ctx.fillStyle = '#9f1239'; // Dark pink
        ctx.beginPath();
        ctx.moveTo(x, -30);
        ctx.quadraticCurveTo(x + toothW/2, 0, x + toothW, -30);
        ctx.fill();

        // BOTTOM MOLARS
        ctx.fillStyle = botToothGrad;
        ctx.beginPath();
        ctx.moveTo(x, CANVAS_HEIGHT + 30);
        // Left Cusp
        ctx.quadraticCurveTo(x + 5, CANVAS_HEIGHT - 50, x + toothW * 0.3, CANVAS_HEIGHT - 55);
        // Central Fissure
        ctx.quadraticCurveTo(x + toothW * 0.5, CANVAS_HEIGHT - 45, x + toothW * 0.7, CANVAS_HEIGHT - 55);
        // Right Cusp
        ctx.quadraticCurveTo(x + toothW - 5, CANVAS_HEIGHT - 50, x + toothW, CANVAS_HEIGHT + 30);
        ctx.fill();

        // Bottom Gums
        ctx.fillStyle = '#9f1239';
        ctx.beginPath();
        ctx.moveTo(x, CANVAS_HEIGHT + 30);
        ctx.quadraticCurveTo(x + toothW/2, CANVAS_HEIGHT, x + toothW, CANVAS_HEIGHT + 30);
        ctx.fill();
    }
    
    // Vignette
    ctx.fillStyle = 'rgba(56, 4, 4, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

export const drawPlatforms = (ctx: CanvasRenderingContext2D, platforms: Platform[]) => {
    platforms.forEach(p => {
        if (p.isGround) {
             // TONGUE TEXTURE
             const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
             grad.addColorStop(0, '#db2777');
             grad.addColorStop(1, '#9d174d');
             ctx.fillStyle = grad;
             drawRoundRect(ctx, p.x, p.y, p.w, p.h + 20, 15);
             
             // Central Groove
             ctx.fillStyle = 'rgba(0,0,0,0.1)';
             ctx.fillRect(p.x, p.y + p.h/2 - 2, p.w, 4);

             // Taste Buds
             ctx.fillStyle = 'rgba(131, 24, 67, 0.3)';
             for(let i=0; i<p.w; i+=20) {
                 const offsetY = Math.sin(i)*5;
                 ctx.beginPath(); ctx.arc(p.x + i, p.y + 15 + offsetY, 2, 0, Math.PI*2); ctx.fill();
                 ctx.beginPath(); ctx.arc(p.x + i + 10, p.y + 40 + offsetY, 3, 0, Math.PI*2); ctx.fill();
             }
        } else {
             // BRACES PLATFORM
             ctx.fillStyle = '#f8fafc';
             ctx.beginPath(); drawRoundRect(ctx, p.x, p.y, p.w, p.h, 8); ctx.fill();
             
             ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();

             const toothWidth = 40;
             const yMid = p.y + p.h / 2;
             
             // Wire
             ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
             ctx.beginPath(); ctx.moveTo(p.x, yMid); ctx.lineTo(p.x + p.w, yMid); ctx.stroke();

             // Brackets
             ctx.fillStyle = '#94a3b8';
             const bracketSize = 12;
             for (let i = 0; i < p.w / toothWidth; i++) {
                 const bx = p.x + (i * toothWidth) + (toothWidth/2) - (bracketSize/2);
                 const by = yMid - (bracketSize/2);
                 ctx.fillRect(bx, by, bracketSize, bracketSize);
                 ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx+2, by+2, 4, 4);
                 ctx.fillStyle = '#94a3b8';
                 
                 if (i > 0) {
                     ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
                     ctx.beginPath(); ctx.moveTo(p.x + (i * toothWidth), p.y + 2); ctx.lineTo(p.x + (i * toothWidth), p.y + p.h - 2); ctx.stroke();
                 }
             }
        }
    });
};

const drawRealisticTooth = (ctx: CanvasRenderingContext2D, tx: number, ty: number, w: number, h: number, type: 'incisor'|'canine'|'molar', isTop: boolean) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

    ctx.beginPath();
    if (isTop) {
        ctx.moveTo(tx, ty); // Root
        if (type === 'incisor') {
            ctx.bezierCurveTo(tx, ty + h*0.6, tx - 2, ty + h - 5, tx + 5, ty + h);
            ctx.lineTo(tx + w - 5, ty + h);
            ctx.bezierCurveTo(tx + w + 2, ty + h - 5, tx + w, ty + h*0.6, tx + w, ty);
        } else if (type === 'canine') {
            ctx.bezierCurveTo(tx, ty + h*0.5, tx + 2, ty + h - 10, tx + w/2, ty + h + 5);
            ctx.bezierCurveTo(tx + w - 2, ty + h - 10, tx + w, ty + h*0.5, tx + w, ty);
        } else { 
            ctx.bezierCurveTo(tx - 5, ty + h*0.8, tx, ty + h, tx + 5, ty + h - 2);
            ctx.quadraticCurveTo(tx + w/4, ty + h + 5, tx + w/2, ty + h - 5);
            ctx.quadraticCurveTo(tx + 3*w/4, ty + h + 5, tx + w - 5, ty + h - 2);
            ctx.bezierCurveTo(tx + w, ty + h, tx + w + 5, ty + h*0.8, tx + w, ty);
        }
    } else {
            ctx.moveTo(tx, ty); 
            if (type === 'incisor') {
            ctx.bezierCurveTo(tx, ty - h*0.6, tx - 2, ty - h + 5, tx + 5, ty - h); 
            ctx.lineTo(tx + w - 5, ty - h); 
            ctx.bezierCurveTo(tx + w + 2, ty - h + 5, tx + w, ty - h*0.6, tx + w, ty); 
        } else if (type === 'canine') {
            ctx.bezierCurveTo(tx, ty - h*0.5, tx + 2, ty - h + 10, tx + w/2, ty - h - 5); 
            ctx.bezierCurveTo(tx + w - 2, ty - h + 10, tx + w, ty - h*0.5, tx + w, ty); 
        } else { 
            ctx.bezierCurveTo(tx - 5, ty - h*0.8, tx, ty - h, tx + 5, ty - h + 2); 
            ctx.quadraticCurveTo(tx + w/4, ty - h - 5, tx + w/2, ty - h + 5); 
            ctx.quadraticCurveTo(tx + 3*w/4, ty - h - 5, tx + w - 5, ty - h + 2); 
            ctx.bezierCurveTo(tx + w, ty - h, tx + w + 5, ty - h*0.8, tx + w, ty); 
        }
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(tx + w*0.4, isTop ? ty + h*0.4 : ty - h*0.4, 5, tx + w/2, isTop ? ty + h/2 : ty - h/2, w);
    grad.addColorStop(0, '#fffff0'); grad.addColorStop(0.5, '#fefce8'); grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad; ctx.fill();

    const stain = ctx.createLinearGradient(0, isTop ? ty : ty - h*0.4, 0, isTop ? ty + h*0.4 : ty);
    stain.addColorStop(isTop ? 0 : 1, 'rgba(217, 119, 6, 0.15)');
    stain.addColorStop(isTop ? 1 : 0, 'rgba(255,255,255,0)');
    ctx.fillStyle = stain; ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    if (isTop) ctx.ellipse(tx + w*0.3, ty + h*0.35, w*0.15, h*0.2, -0.2, 0, Math.PI*2);
    else ctx.ellipse(tx + w*0.3, ty - h*0.35, w*0.15, h*0.2, 0.2, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
};

export const drawTransition = (ctx: CanvasRenderingContext2D, progress: number, stage: number) => {
    if (progress <= 0) return;

    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const centerH = CANVAS_HEIGHT / 2;
    const topY = -150 + ((centerH + 150) * ease); 
    const botY = CANVAS_HEIGHT + 150 - ((centerH + 150) * ease);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const drawJaw = (yPos: number, isTop: boolean) => {
        const curveHeight = 80;
        
        ctx.beginPath();
        if (isTop) {
            ctx.moveTo(0, -300); ctx.lineTo(0, yPos); 
            ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos + curveHeight, CANVAS_WIDTH*0.7, yPos + curveHeight, CANVAS_WIDTH, yPos);
            ctx.lineTo(CANVAS_WIDTH, -300);
        } else {
            ctx.moveTo(0, CANVAS_HEIGHT + 300); ctx.lineTo(0, yPos);
            ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos - curveHeight, CANVAS_WIDTH*0.7, yPos - curveHeight, CANVAS_WIDTH, yPos);
            ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT + 300);
        }
        
        const gumGrad = ctx.createLinearGradient(0, isTop ? yPos - 200 : yPos + 200, 0, yPos);
        gumGrad.addColorStop(0, '#831843'); gumGrad.addColorStop(1, '#db2777');
        ctx.fillStyle = gumGrad; ctx.fill();

        const toothCount = 12;
        const toothW = 45;
        const totalW = toothCount * toothW;
        const startX = (CANVAS_WIDTH - totalW) / 2;
        
        for(let i=0; i<toothCount; i++) {
            const t = i / (toothCount - 1);
            const archOffset = (4 * t * (1-t)) * curveHeight * 0.9;
            const tx = startX + i * toothW;
            const ty = isTop ? yPos + archOffset : yPos - archOffset;
            
            let type: 'incisor' | 'canine' | 'molar' = 'molar';
            if (i >= 4 && i <= 7) type = 'incisor';
            else if (i === 3 || i === 8) type = 'canine';
            
            drawRealisticTooth(ctx, tx, ty, toothW-4, 70, type, isTop);
        }
        
        ctx.beginPath();
        if (isTop) {
            ctx.moveTo(0, yPos - 30);
            ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos + curveHeight - 30, CANVAS_WIDTH*0.7, yPos + curveHeight - 30, CANVAS_WIDTH, yPos - 30);
            ctx.bezierCurveTo(CANVAS_WIDTH*0.5, yPos + curveHeight - 80, CANVAS_WIDTH*0.5, yPos + curveHeight - 80, 0, yPos - 30);
        } else {
                ctx.moveTo(0, yPos + 30);
                ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos - curveHeight + 30, CANVAS_WIDTH*0.7, yPos - curveHeight + 30, CANVAS_WIDTH, yPos + 30);
                ctx.bezierCurveTo(CANVAS_WIDTH*0.5, yPos - curveHeight + 80, CANVAS_WIDTH*0.5, yPos - curveHeight + 80, 0, yPos + 30);
        }
        ctx.fillStyle = '#be185d'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4; ctx.stroke();
    };

    drawJaw(topY, true);
    drawJaw(botY, false);
    
    if (progress > 0.4) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#2a0a18';
        ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalCompositeOperation = 'source-over';
    }

    if (progress > 0.95) {
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P", system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#be185d'; ctx.shadowBlur = 10;
        ctx.fillText(`STAGE ${stage} COMPLETE`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 25);
        ctx.fillStyle = '#fef08a';
        ctx.fillText("BRUSHING...", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 25);
        ctx.shadowBlur = 0;
    }

    ctx.restore();
};
