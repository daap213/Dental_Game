
import { Platform } from '../types';
import { CANVAS_HEIGHT } from './data/physics';

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
