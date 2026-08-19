import { describe, it, expect } from 'vitest';
import {
  ARM_POSES,
  PLAYER_CHARACTERS,
  PLAYER_POSES,
  armPlacement,
  armSprite,
  playerSprite,
  playerSpriteId,
} from './player';
import { ARM_HAND } from './masks/player';
import type { PlayerPose } from '../pose';
import { validateSprite, type SpriteDef } from './format';
import { shadeMask, unionMasks, SOLID, EMPTY } from './shade';
import { PLAYER_SIZE } from '../../data/physics';
import { RAMPS } from '../../data/palette';

/** Las poses en las que el personaje está pisando el suelo. */
const GROUNDED: readonly PlayerPose[] = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'hurt'];

const everyDef = () =>
  PLAYER_CHARACTERS.flatMap((c) =>
    PLAYER_POSES.map((pose) => ({ c, pose, def: playerSprite(c, pose) }))
  );

/** Última fila con algo dibujado. */
const lastFilledRow = (def: SpriteDef): number => {
  for (let y = def.h - 1; y >= 0; y--) if (/[^.]/.test(def.rows[y])) return y;
  return -1;
};

/** Los píxeles llenos, como conjunto de claves, para poder comparar dos siluetas. */
const filled = (def: SpriteDef): Set<string> => {
  const out = new Set<string>();
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') out.add(`${x},${y}`);
  });
  return out;
};

const different = (a: Set<string>, b: Set<string>): number =>
  [...a].filter((k) => !b.has(k)).length + [...b].filter((k) => !a.has(k)).length;

const pairs = <T,>(items: readonly T[]): [T, T][] =>
  items.flatMap((a, i) => items.slice(i + 1).map((b) => [a, b] as [T, T]));

describe('sprites del jugador', () => {
  it('las 32 combinaciones de clase y pose existen y son válidas', () => {
    for (const { c, pose, def } of everyDef()) {
      expect(validateSprite(def), `${c}:${pose}`).toEqual([]);
    }
  });

  /**
   * Esto sustituye al viejo «todas miden exactamente el hitbox».
   *
   * El dibujo ya es mayor que la caja, así que el tamaño dejó de ser el invariante: lo que
   * hay que garantizar es **dónde cae la planta del pie**. Si el anclaje se pierde, el
   * personaje flota sobre el suelo o se hunde en él, y en una captura no se distingue de
   * una decisión estética.
   */
  it('el dibujo se ancla por los pies al suelo del hitbox', () => {
    for (const { c, pose, def } of everyDef()) {
      expect(def.offsetY, `${c}:${pose}`).toBe(PLAYER_SIZE - def.h);
      const last = lastFilledRow(def);
      if (GROUNDED.includes(pose)) expect(last, `${c}:${pose} apoya`).toBe(def.h - 1);
      else expect(last, `${c}:${pose} en el aire`).toBeLessThan(def.h - 1);
    }
  });

  /**
   * El otro medio anclaje: centrado con precisión de píxel.
   *
   * `blit` espeja dentro del rectángulo de destino, así que si la diferencia de anchos
   * fuese impar el eje del espejo caería a medio píxel del centro de la caja y el
   * personaje daría un salto lateral cada vez que se gira.
   */
  it('el dibujo está centrado en el hitbox, con diferencia de ancho par', () => {
    for (const { c, pose, def } of everyDef()) {
      // Con valor absoluto: `(32 - 34) % 2` da **-0** en JavaScript, y `toBe(0)` usa
      // `Object.is`, que distingue -0 de 0.
      expect(Math.abs((PLAYER_SIZE - def.w) % 2), `${c}:${pose}`).toBe(0);
      expect(def.offsetX, `${c}:${pose}`).toBe((PLAYER_SIZE - def.w) / 2);
    }
  });

  /**
   * Lo que sobresale por arriba tiene que ser poco y estrecho.
   *
   * Las plataformas se dibujan **antes** que el jugador y la colisión con ellas es sólida
   * por abajo, así que al golpear con la cabeza un tablón de 20 px el saliente se pinta
   * encima del tablón. Estrecho pasa por corona; ancho se lee como un fallo de dibujado.
   */
  it('solo la punta de la corona sale del hitbox, y nunca ancha', () => {
    for (const { c, pose, def } of everyDef()) {
      const over = -(def.offsetY ?? 0);
      expect(over, `${c}:${pose}`).toBeLessThanOrEqual(8);
      for (let y = 0; y < over; y++) {
        const width = [...def.rows[y]].filter((ch) => ch !== '.').length;
        expect(width, `${c}:${pose} fila ${y}`).toBeLessThanOrEqual(PLAYER_SIZE - 4);
      }
    }
  });

  /**
   * Las cuatro clases se distinguen en la **silueta**, no en un puñado de píxeles.
   *
   * El test anterior comparaba las filas con un `Set`, y eso pasaba con un solo píxel de
   * diferencia: se podía dejar a las cuatro clases prácticamente iguales sin que nada
   * fallara, que es justo el estado del que venimos.
   */
  it('cada clase difiere de las demás en toda la silueta', () => {
    for (const [a, b] of pairs(PLAYER_CHARACTERS)) {
      const gap = different(filled(playerSprite(a, 'idle')), filled(playerSprite(b, 'idle')));
      expect(gap, `${a} vs ${b}`).toBeGreaterThan(60);
    }
  });

  it('la clase ya se lee en el canto, sin ver el cuerpo', () => {
    for (const [a, b] of pairs(PLAYER_CHARACTERS)) {
      const band = (c: typeof a) => {
        const def = playerSprite(c, 'idle');
        return filled({ ...def, rows: def.rows.slice(0, 8) });
      };
      expect(different(band(a), band(b)), `${a} vs ${b}`).toBeGreaterThan(10);
    }
  });

  it('cada pose cambia el dibujo', () => {
    const poses = PLAYER_POSES.map((p) => playerSprite('molar', p).rows.join('\n'));
    expect(new Set(poses).size).toBe(PLAYER_POSES.length);
  });

  it('el id identifica clase y pose', () => {
    expect(playerSpriteId('canine', 'rise')).toBe('player:canine:rise');
    expect(
      new Set(PLAYER_CHARACTERS.flatMap((c) => PLAYER_POSES.map((p) => playerSpriteId(c, p)))).size
    ).toBe(PLAYER_CHARACTERS.length * PLAYER_POSES.length);
  });

  /**
   * El ancla del arma cae **dentro** del puño, no en su contorno.
   *
   * Es lo que sustituye a los dos números que `render/weapons.ts` tenía escritos a mano:
   * allí el arma no sabía nada del dibujo, así que mover el puño un píxel la dejaba
   * flotando y nada avisaba. Y se exige un tono de relleno, no solo «algo dibujado»:
   * con el ancla sobre el contorno el arma saldría por el borde de la mano.
   */
  it('el puño sostiene el arma: el ancla cae en el relleno de la mano', () => {
    for (const arm of ARM_POSES) {
      const def = armSprite(arm);
      const hand = ARM_HAND[arm];
      const ch = def.rows[hand.y]?.[hand.x];
      expect('3210', `brazo ${arm} → '${ch}'`).toContain(ch);
      expect(def.map[ch as string]).toMatch(/^enamel\./);
    }
  });

  it('girarse no desplaza el puño: es simétrico respecto al hitbox', () => {
    for (const character of PLAYER_CHARACTERS) {
      const place = armPlacement(character, 'side');
      const mirrored = PLAYER_SIZE - 1 - place.handX;
      expect(place.handX + mirrored, character).toBe(PLAYER_SIZE - 1);
    }
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
