import { describe, it, expect } from 'vitest';
import { playerSprite, playerSpriteId, PLAYER_CHARACTERS, PLAYER_POSES } from './player';
import { validateSprite } from './format';
import { shadeMask, unionMasks, RIM, SOLID, EMPTY } from './shade';
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

  it('el borde de la silueta es contorno', () => {
    const def = shadeMask(square(8), 'enamel');
    expect(def.rows[0]).toBe('oooooooo');
    expect(def.rows[7]).toBe('oooooooo');
    expect(def.rows[3][0]).toBe('o');
    expect(def.rows[3][7]).toBe('o');
  });

  it('la luz viene de arriba a la izquierda y la sombra de abajo a la derecha', () => {
    const def = shadeMask(square(12), 'enamel');
    // Justo dentro del contorno de arriba: claro. Justo dentro del de abajo: oscuro.
    expect(def.rows[1][5]).toBe('1');
    expect(def.rows[10][5]).toBe('3');
    // Y en horizontal, lo mismo por la izquierda y por la derecha.
    expect(def.rows[5][1]).toBe('1');
    expect(def.rows[5][10]).toBe('3');
  });

  it('el reborde tiene el grosor declarado', () => {
    const def = shadeMask(square(16), 'enamel');
    const row = def.rows[8];
    expect(row.slice(0, 1 + RIM)).toBe('o' + '1'.repeat(RIM));
    expect(row.slice(-1 - RIM)).toBe('3'.repeat(RIM) + 'o');
  });

  it('el centro queda en el tono medio', () => {
    const def = shadeMask(square(16), 'enamel');
    expect(def.rows[8][8]).toBe('2');
    expect(def.map['2']).toBe('enamel.mid');
  });

  it('usa los cuatro tonos del material que se le pide', () => {
    const def = shadeMask(square(10), 'bacteria');
    expect(Object.values(def.map).sort()).toEqual(
      ['bacteria.dark', 'bacteria.light', 'bacteria.mid', 'bacteria.out'].sort()
    );
    expect(RAMPS.bacteria.mid).toBeDefined();
  });

  it('el vacío se queda vacío', () => {
    const def = shadeMask(['..##..', '.####.', '..##..'], 'enamel');
    expect(def.rows[0][0]).toBe(EMPTY);
    expect(def.rows[0].startsWith('..')).toBe(true);
  });

  it('unionMasks superpone siluetas y respeta la mayor', () => {
    const a = ['##..', '##..'];
    const b = ['..##'];
    expect(unionMasks(a, b)).toEqual(['####', '##..']);
  });

  it('una silueta de 1 px de ancho es todo contorno: no hay sitio para sombrear', () => {
    const def = shadeMask(['#', '#', '#'], 'enamel');
    expect(def.rows).toEqual(['o', 'o', 'o']);
  });
});
