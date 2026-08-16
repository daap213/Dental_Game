
import { Platform } from '../types';
import { CANVAS_HEIGHT, PLAYER_SIZE } from './data/physics';

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

/**
 * Dónde devolver a alguien que se ha caído por un hueco.
 *
 * Busca el suelo que cubra esa x; si la x está justo sobre el hueco, coge el
 * suelo anterior más cercano, y como último recurso la zona de inicio. Nunca
 * devuelve una posición en el aire ni fuera del nivel, que es lo que hacía
 * falta para que la caída pueda reponerse en vez de dejar la partida colgada.
 */
export const findRespawn = (
    platforms: Platform[],
    x: number,
    height: number = PLAYER_SIZE
): { x: number; y: number } => {
    const grounds = platforms.filter(p => p.isGround);
    if (grounds.length === 0) return { x: 100, y: CANVAS_HEIGHT - 60 - height };

    const over = grounds.find(p => x >= p.x && x <= p.x + p.w);
    if (over) return { x, y: over.y - height };

    // Sin suelo debajo: el hueco. Retrocede al suelo anterior más cercano.
    const before = grounds
        .filter(p => p.x + p.w <= x)
        .sort((a, b) => b.x + b.w - (a.x + a.w))[0];
    const target = before ?? grounds[0];

    return { x: target.x + target.w / 2, y: target.y - height };
};
