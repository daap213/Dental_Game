import { describe, it, expect } from 'vitest';
import { enemySprite, enemySpriteId, hasEnemySprite, ENEMY_SUBTYPES, ENEMY_POSES } from './enemies';
import { ENEMY_ART } from './masks/enemies';
import { validateSprite } from './format';
import { bossSprite, BOSS_VARIANTS } from '../bosses';
import { ENEMY_SPAWN_TABLE, STAGE_BOSSES, HIDDEN_BOSS } from '../../data/enemies';
import { ellipse, rect, spike, merge, subtract, shift, blank, clipTo, stamp } from './masks/shapes';

describe('arte de los enemigos', () => {
  it('las siluetas y las capas de detalle tienen las dimensiones que declaran', () => {
    // Una fila corta no da error en tiempo de ejecución: simplemente falta el
    // detalle en ese trozo, y eso se busca a ojo durante mucho rato. Se recogen
    // todos los problemas y se afirma una vez, para verlos de golpe en lugar de
    // ir arreglándolos de uno en uno.
    const problems: string[] = [];

    for (const [subType, art] of Object.entries(ENEMY_ART)) {
      const layers: [string, readonly string[] | undefined][] = [
        ['mask', art.mask],
        ['detail', art.detail],
        ['attack', art.attack],
        ['hurt', art.hurt],
      ];

      for (const [name, rows] of layers) {
        if (!rows) continue;
        if (rows.length !== art.h) {
          problems.push(`${subType}.${name}: ${rows.length} filas, se esperaban ${art.h}`);
        }
        rows.forEach((row, y) => {
          if (row.length !== art.w) {
            problems.push(`${subType}.${name} fila ${y}: ancho ${row.length}, se esperaba ${art.w}`);
          }
        });
      }
    }

    expect(problems).toEqual([]);
  });

  it('cada enemigo mide exactamente su hitbox', () => {
    // Si el arte y el hitbox se separan, el jugador dispara a lo que ve y no pasa
    // nada, que es de los defectos que peor se perdonan.
    for (const entry of ENEMY_SPAWN_TABLE) {
      const art = ENEMY_ART[entry.subType as keyof typeof ENEMY_ART];
      expect(art, `falta el arte de ${entry.subType}`).toBeDefined();
      expect(art.w, `${entry.subType}: ancho`).toBe(entry.w);
      expect(art.h, `${entry.subType}: alto`).toBe(entry.h);
    }
  });

  it('los 8 enemigos tienen sprite para las 4 poses y todos validan', () => {
    for (const subType of ENEMY_SUBTYPES) {
      for (const pose of ENEMY_POSES) {
        const def = enemySprite(subType, pose);
        expect(validateSprite(def), `${subType}:${pose}`).toEqual([]);
      }
    }
  });

  it('las poses de un enemigo no son todas el mismo dibujo', () => {
    for (const subType of ENEMY_SUBTYPES) {
      const drawings = new Set(ENEMY_POSES.map((p) => enemySprite(subType, p).rows.join('\n')));
      expect(drawings.size, `${subType} repite poses`).toBeGreaterThan(2);
    }
  });

  it('cada enemigo usa su propia rampa de color', () => {
    const bacteria = new Set(Object.values(enemySprite('bacteria', 'idle').map));
    const rusher = new Set(Object.values(enemySprite('sugar_rusher', 'idle').map));
    expect([...bacteria].some((k) => k.startsWith('bacteria.'))).toBe(true);
    expect([...rusher].some((k) => k.startsWith('rusher.'))).toBe(true);
  });

  it('hasEnemySprite distingue enemigos de jefes', () => {
    expect(hasEnemySprite('bacteria')).toBe(true);
    expect(hasEnemySprite('boss')).toBe(false);
    expect(hasEnemySprite('inventado')).toBe(false);
  });

  it('el id identifica tipo y pose', () => {
    expect(enemySpriteId('bacteria', 'walk')).toBe('enemy:bacteria:walk');
  });
});

describe('arte de los jefes', () => {
  it('las seis variantes producen un sprite válido', () => {
    for (const variant of BOSS_VARIANTS) {
      const def = bossSprite(variant, 0, 1);
      expect(validateSprite(def), variant).toEqual([]);
    }
  });

  it('cada jefe mide exactamente su hitbox', () => {
    for (const boss of [...STAGE_BOSSES, HIDDEN_BOSS]) {
      const def = bossSprite(boss.variant, 0, 1);
      expect(def.w, `${boss.variant}: ancho`).toBe(boss.w);
      expect(def.h, `${boss.variant}: alto`).toBe(boss.h);
    }
  });

  it('el estado cambia el dibujo de quien lo usa', () => {
    // El tanque levanta el cañón y el rey abre la boca.
    expect(bossSprite('tank', 1, 1).rows.join()).not.toBe(bossSprite('tank', 0, 1).rows.join());
    expect(bossSprite('king', 4, 1).rows.join()).not.toBe(bossSprite('king', 0, 1).rows.join());
    expect(bossSprite('deity', 0, 2).rows.join()).not.toBe(bossSprite('deity', 0, 1).rows.join());
  });

  it('una variante desconocida cae en el rey en vez de no dibujar nada', () => {
    const def = bossSprite('inventado', 0, 1);
    expect(def.w).toBe(STAGE_BOSSES[0].w);
    expect(validateSprite(def)).toEqual([]);
  });

  it('se memoiza por variante, estado y fase', () => {
    expect(bossSprite('deity', 0, 2)).toBe(bossSprite('deity', 0, 2));
  });
});

describe('primitivas de forma', () => {
  it('la elipse es simétrica y cabe en su caja', () => {
    const e = ellipse(11, 11, 5.5, 5.5, 5, 5);
    expect(e).toHaveLength(11);
    expect(e[5]).toBe(e[5].split('').reverse().join(''));
    expect(e[0].includes('#')).toBe(true);
    expect(e.every((row) => row.length === 11)).toBe(true);
  });

  it('el rectángulo recorta esquinas cuando se le pide', () => {
    const sharp = rect(6, 6, 0, 0, 6, 6);
    const round = rect(6, 6, 0, 0, 6, 6, 2);
    expect(sharp[0][0]).toBe('#');
    expect(round[0][0]).toBe('.');
    expect(round[3][3]).toBe('#');
  });

  it('el pincho se abre desde la punta hacia la base', () => {
    const s = spike(9, 6, 4, 0, 5, 4);
    const width = (row: string) => row.split('').filter((c) => c === '#').length;
    expect(width(s[0])).toBeLessThan(width(s[4]));
  });

  it('merge suma, subtract resta y shift mueve sin perder caracteres', () => {
    expect(merge(['#.'], ['.#'])).toEqual(['##']);
    expect(subtract(['##'], ['.#'])).toEqual(['#.']);
    expect(shift(['AB'], 1, 0)).toEqual(['.A']);
  });

  it('clipTo recorta el detalle a la silueta y stamp coloca dibujos', () => {
    expect(clipTo(['XY'], ['#.'])).toEqual(['X.']);
    expect(stamp(blank(4, 2), ['##'], 1, 0)).toEqual(['.##.', '....']);
  });
});
