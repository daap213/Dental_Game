import { describe, expect, it } from 'vitest';
import { WEAPONS } from '../data/weapons';
import { POWERUP_EMBLEMS, HELD_WEAPONS } from './sprites/masks/weapons';
import { heldVisual } from './weapons';
import { BAKED_STEPS } from '../data/aim';
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
  /**
   * Las ocho armas en **las nueve inclinaciones que se hornean**.
   *
   * Comprobaba dos orientaciones, y era el sitio donde una letra de detalle sin color se cuela
   * sin hacer ruido. Ahora que hay nueve dibujos por arma en vez de dos, la superficie donde eso
   * puede pasar es cuatro veces mayor, y el giro además mueve las letras de sitio.
   *
   * Lo que era «la versión hacia arriba es la de lado girada» —que solo miraba las medidas, y por
   * eso no vio que el giro iba al revés— está ahora en `orientation.test.ts`, que comprueba hacia
   * dónde apunta.
   */
  it('las ocho armas en mano son sprites válidos en todas sus inclinaciones', () => {
    for (const weapon of WEAPONS) {
      for (const step of BAKED_STEPS) {
        const { def } = heldVisual(weapon, step);
        expect(validateSprite(def), `${weapon} en el paso ${step}`).toEqual([]);
      }
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
