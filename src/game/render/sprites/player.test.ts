import { describe, it, expect } from 'vitest';
import { playerSprite, playerSpriteId, PLAYER_CHARACTERS, PLAYER_POSES } from './player';
import { validateSprite } from './format';
import { shadeMask, unionMasks, SOLID, EMPTY } from './shade';
import { PLAYER_SIZE } from '../../data/physics';
import { RAMPS } from '../../data/palette';

describe('sprites del jugador', () => {
  it('las 16 combinaciones de clase y pose existen y son válidas', () => {
    for (const character of PLAYER_CHARACTERS) {
      for (const pose of PLAYER_POSES) {
        const def = playerSprite(character, pose);
        expect(validateSprite(def), `${character}:${pose}`).toEqual([]);
      }
    }
  });

  it('todas miden exactamente el hitbox del jugador', () => {
    for (const character of PLAYER_CHARACTERS) {
      for (const pose of PLAYER_POSES) {
        const def = playerSprite(character, pose);
        expect(def.w, `${character}:${pose}`).toBe(PLAYER_SIZE);
        expect(def.h, `${character}:${pose}`).toBe(PLAYER_SIZE);
      }
    }
  });

  it('cada clase tiene una silueta distinta de las demás', () => {
    const shapes = PLAYER_CHARACTERS.map((c) => playerSprite(c, 'idle').rows.join('\n'));
    expect(new Set(shapes).size).toBe(PLAYER_CHARACTERS.length);
  });

  it('cada pose cambia el dibujo', () => {
    const poses = PLAYER_POSES.map((p) => playerSprite('molar', p).rows.join('\n'));
    expect(new Set(poses).size).toBe(PLAYER_POSES.length);
  });

  it('el id identifica clase y pose', () => {
    expect(playerSpriteId('canine', 'jump')).toBe('player:canine:jump');
    expect(new Set(PLAYER_CHARACTERS.flatMap((c) => PLAYER_POSES.map((p) => playerSpriteId(c, p)))).size).toBe(16);
  });

  it('se memoiza: pedir el mismo sprite devuelve el mismo objeto', () => {
    expect(playerSprite('molar', 'idle')).toBe(playerSprite('molar', 'idle'));
  });

  it('una clase inventada no rompe el dibujado', () => {
    const def = playerSprite('incisivo_de_sable' as never, 'idle');
    expect(validateSprite(def)).toEqual([]);
  });
});

describe('sombreado automático', () => {
  const square = (size: number) => Array<string>(size).fill(SOLID.repeat(size));

  /** Del más oscuro al más claro, para poder comparar dos píxeles. */
  const ORDER = ['o', 's', '3', '2', '1', '0'];
  const brightness = (ch: string) => ORDER.indexOf(ch);

  /** Media de claridad de una región, ignorando el vacío. */
  const meanBrightness = (rows: readonly string[], x0: number, y0: number, size: number) => {
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y0 + size; y++) {
      for (let x = x0; x < x0 + size; x++) {
        const ch = rows[y]?.[x];
        if (!ch || ch === EMPTY) continue;
        sum += brightness(ch);
        n++;
      }
    }
    return n ? sum / n : 0;
  };

  it('el contorno es selectivo: duro en el lado en sombra, suave en el iluminado', () => {
    // Un contorno negro uniforme aplana la silueta. Abrirlo por donde entra la
    // luz es lo que da bulto al sprite.
    const def = shadeMask(square(12), 'enamel');
    expect(def.rows[0][6]).toBe('s'); // borde de arriba: suave
    expect(def.rows[6][0]).toBe('s'); // borde izquierdo: suave
    expect(def.rows[11][6]).toBe('o'); // borde de abajo: duro
    expect(def.rows[6][11]).toBe('o'); // borde derecho: duro
  });

  it('la luz entra por arriba a la izquierda', () => {
    const def = shadeMask(square(20), 'enamel');
    const lit = meanBrightness(def.rows, 2, 2, 5);
    const shadow = meanBrightness(def.rows, 13, 13, 5);
    expect(lit).toBeGreaterThan(shadow);
  });

  it('el interior de una masa gruesa se queda en tonos medios', () => {
    const def = shadeMask(square(24), 'enamel');
    expect(['2', '1', '3']).toContain(def.rows[12][12]);
  });

  it('usa los seis tonos del material que se le pide y ninguno más', () => {
    const def = shadeMask(square(20), 'bacteria');
    const used = new Set(Object.values(def.map));
    expect([...used].every((key) => key.startsWith('bacteria.'))).toBe(true);
    expect(used.has('bacteria.out')).toBe(true);
    expect(used.has('bacteria.hi')).toBe(true);
    expect(RAMPS.bacteria.shade).toBeDefined();
  });

  it('las zonas finas se oscurecen: sin grosor no entra luz', () => {
    const thick = shadeMask(square(20), 'enamel');
    const thin = shadeMask(Array<string>(20).fill('..###...............'), 'enamel');
    expect(meanBrightness(thin.rows, 2, 5, 3)).toBeLessThan(meanBrightness(thick.rows, 5, 5, 3));
  });

  it('el bias desplaza todo el sprite hacia la luz o hacia la sombra', () => {
    const normal = shadeMask(square(20), 'enamel');
    const darker = shadeMask(square(20), 'enamel', { bias: -0.6 });
    const lighter = shadeMask(square(20), 'enamel', { bias: 0.6 });

    const mid = (rows: readonly string[]) => meanBrightness(rows, 6, 6, 8);
    expect(mid(darker.rows)).toBeLessThan(mid(normal.rows));
    expect(mid(lighter.rows)).toBeGreaterThan(mid(normal.rows));
  });

  it('es determinista: la misma silueta da el mismo sprite', () => {
    expect(shadeMask(square(16), 'gum').rows).toEqual(shadeMask(square(16), 'gum').rows);
  });

  it('el vacío se queda vacío', () => {
    const def = shadeMask(['..##..', '.####.', '..##..'], 'enamel');
    expect(def.rows[0][0]).toBe(EMPTY);
    expect(def.rows[0].startsWith('..')).toBe(true);
  });

  it('todo carácter que produce está en el mapa de colores', () => {
    const def = shadeMask(square(20), 'enamel');
    expect(validateSprite(def)).toEqual([]);
  });

  it('unionMasks superpone siluetas y respeta la mayor', () => {
    const a = ['##..', '##..'];
    const b = ['..##'];
    expect(unionMasks(a, b)).toEqual(['####', '##..']);
  });

  it('una silueta de 1 px de ancho es todo contorno: no hay sitio para sombrear', () => {
    const def = shadeMask(['#', '#', '#'], 'enamel');
    expect(def.rows.every((row) => row === 'o' || row === 's')).toBe(true);
  });

  it('el desplazamiento respecto al hitbox se conserva', () => {
    const def = shadeMask(square(8), 'enamel', { offsetX: -3, offsetY: -5 });
    expect(def.offsetX).toBe(-3);
    expect(def.offsetY).toBe(-5);
  });
});
