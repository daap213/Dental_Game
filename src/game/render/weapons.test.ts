import { describe, expect, it } from 'vitest';
import { WEAPONS } from '../data/weapons';
import { POWERUP_EMBLEMS, HELD_WEAPONS } from './sprites/masks/weapons';
import { heldSprite } from './weapons';
import { validateSprite } from './sprites/format';

/**
 * El arte de las armas: lo que ningún test cubría.
 *
 * Las máscaras en mano y los emblemas de los botes **no tenían un solo test**, y son
 * exactamente el sitio donde un carácter sin color se cuela sin hacer ruido: `paintSprite`
 * busca la letra en el mapa, no la encuentra, y pinta magenta. En una pieza de treinta por
 * dieciocho eso son cuatro píxeles chillones que hay que ver en pantalla para descubrir.
 */

describe('arte de las armas', () => {
  it('las ocho armas en mano son sprites válidos, de lado y apuntando arriba', () => {
    for (const weapon of WEAPONS) {
      for (const up of [false, true]) {
        const def = heldSprite(weapon, up);
        expect(validateSprite(def), `${weapon}${up ? ' arriba' : ' de lado'}`).toEqual([]);
      }
    }
  });

  /**
   * Girar noventa grados intercambia ancho y alto, y nada más.
   *
   * Es la razón de que el mango vaya siempre a la izquierda: la versión apuntando hacia
   * arriba no es un dibujo aparte, es esta girada, y eso solo es exacto si la pieza no
   * depende de nada más que su propia orientación.
   */
  it('la versión hacia arriba es la de lado girada', () => {
    for (const weapon of WEAPONS) {
      const side = heldSprite(weapon, false);
      const up = heldSprite(weapon, true);
      expect(up.w, weapon).toBe(side.h);
      expect(up.h, weapon).toBe(side.w);
    }
  });

  /**
   * Una **máscara** solo lleva `#` y `.`; las letras son de la capa de detalle.
   *
   * `shadeMask` trata cualquier carácter distinto de `.` como relleno, así que una letra
   * colada en la máscara *funciona* —sombrea— y por eso no salta nada: simplemente dibuja
   * una silueta distinta de la que se escribió. Con un reemplazo global se me colaron letras
   * de madera en tres máscaras y dos armas perdieron su cuerpo.
   */
  it('las máscaras solo usan relleno y vacío', () => {
    for (const weapon of WEAPONS) {
      for (const [y, row] of HELD_WEAPONS[weapon].mask.entries()) {
        const stray = [...row].find((ch) => ch !== '#' && ch !== '.');
        expect(stray, `${weapon} fila ${y}: '${stray}' en la máscara`).toBeUndefined();
      }
    }
  });

  it('cada arma tiene su emblema de bote, y ninguno repetido', () => {
    const seen = new Map<string, string>();
    for (const key of ['health', ...WEAPONS] as const) {
      const emblem = POWERUP_EMBLEMS[key];
      expect(emblem, `falta el emblema de ${key}`).toBeDefined();
      // Un emblema vacío pasa el tipo y deja el bote en blanco.
      expect(emblem.join('').includes('S'), `el emblema de ${key} está vacío`).toBe(true);
      const art = emblem.join('\n');
      const clash = seen.get(art);
      expect(clash, `el emblema de ${key} es igual que el de ${clash}`).toBeUndefined();
      seen.set(art, key);
    }
  });

  it('ninguna arma se dibuja igual que otra en la mano', () => {
    const seen = new Map<string, string>();
    for (const weapon of WEAPONS) {
      const art = HELD_WEAPONS[weapon];
      const key = art.mask.join('\n') + '|' + art.material;
      const clash = seen.get(key);
      expect(clash, `${weapon} se dibuja igual que ${clash}`).toBeUndefined();
      seen.set(key, weapon);
    }
  });
});
