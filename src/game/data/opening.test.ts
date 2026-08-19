import { describe, it, expect } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './physics';
import { archSlots, openingAt, toothKindAt, toothSizeAt, type Opening } from './opening';
import { STAGE_SCENES } from './stages';

/**
 * La lente es de donde sale todo el encuadre, así que un número mal puesto aquí no
 * rompe nada: sale un fondo raro, o peor, un fondo que tapa la zona de juego.
 */

/** Dónde vive el terreno, medido en `game/level.ts`. */
const PLATFORM_TOP = 210;
const PLATFORM_BOTTOM = 330;
const GROUND_Y = 390;

describe('perfil de la abertura', () => {
  const lens: Opening = { halfW: 0.4, halfH: 80, cy: 260, taper: 0.9, drop: 40 };

  it('es simétrica respecto al centro', () => {
    const cx = CANVAS_WIDTH / 2;
    for (let d = 0; d < cx; d += 7) {
      const izq = openingAt(lens, cx - d);
      const der = openingAt(lens, cx + d);
      expect(der.top, `a ${d} del centro`).toBeCloseTo(izq.top, 6);
      expect(der.bottom, `a ${d} del centro`).toBeCloseTo(izq.bottom, 6);
    }
  });

  it('es más alta en el centro y se cierra hacia los bordes', () => {
    const centro = openingAt(lens, CANVAS_WIDTH / 2);
    const medio = openingAt(lens, CANVAS_WIDTH * 0.75);
    const borde = openingAt(lens, CANVAS_WIDTH - 1);
    expect(centro.half).toBeGreaterThan(medio.half);
    expect(medio.half).toBeGreaterThan(borde.half);
  });

  it('el borde de arriba nunca cruza el de abajo', () => {
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const e = openingAt(lens, x);
      expect(e.top, `x=${x}`).toBeLessThanOrEqual(e.bottom);
    }
  });

  it('con taper 0 es un pasillo de altura constante', () => {
    const recta: Opening = { ...lens, taper: 0 };
    const a = openingAt(recta, 0);
    const b = openingAt(recta, CANVAS_WIDTH / 2);
    expect(a.half).toBeCloseTo(b.half, 6);
  });

  it('la profundidad va de 0 en el centro a 1 en los bordes', () => {
    expect(openingAt(lens, CANVAS_WIDTH / 2).depth).toBe(0);
    expect(openingAt(lens, 0).depth).toBeCloseTo(1, 6);
    expect(openingAt(lens, CANVAS_WIDTH).depth).toBeCloseTo(1, 6);
  });
});

describe('el diente sale de la curva', () => {
  it('crece del centro hacia los bordes', () => {
    // Es la perspectiva de la herradura: el molar del borde está más cerca de la
    // cámara. Sin esto vuelve la valla de dientes iguales del fondo anterior.
    let previa = toothSizeAt(0);
    for (let d = 0.1; d <= 1; d += 0.1) {
      const actual = toothSizeAt(d);
      expect(actual.w, `profundidad ${d.toFixed(1)}`).toBeGreaterThan(previa.w);
      expect(actual.h, `profundidad ${d.toFixed(1)}`).toBeGreaterThan(previa.h);
      previa = actual;
    }
  });

  it('la clase de pieza va de incisivo en el centro a molar en el borde', () => {
    expect(toothKindAt(0)).toBe('incisor');
    expect(toothKindAt(0.5)).toBe('premolar');
    expect(toothKindAt(1)).toBe('molar');
  });
});

describe('la arcada cubre la pantalla', () => {
  const slots = archSlots();

  it('las piezas son contiguas y no dejan hueco', () => {
    // Los huecos de la arcada los decide el deterioro, no el redondeo: si dos piezas
    // no se tocan, la carne del marco deja pasar la clínica por una rendija.
    const ordenadas = [...slots].sort((a, b) => a.x - b.x);
    for (let i = 1; i < ordenadas.length; i++) {
      const fin = ordenadas[i - 1].x + ordenadas[i - 1].size.w;
      expect(Math.abs(ordenadas[i].x - fin), `entre la pieza ${i - 1} y la ${i}`).toBeLessThanOrEqual(1);
    }
  });

  it('rebasa los dos bordes de la pantalla', () => {
    const ordenadas = [...slots].sort((a, b) => a.x - b.x);
    expect(ordenadas[0].x).toBeLessThanOrEqual(0);
    const ultima = ordenadas[ordenadas.length - 1];
    expect(ultima.x + ultima.size.w).toBeGreaterThanOrEqual(CANVAS_WIDTH);
  });

  it('la pieza central está centrada', () => {
    // Se recorre del centro hacia fuera justamente para esto: empezando por un borde
    // el redondeo acumula error y el diente del medio acaba descentrado.
    const centro = slots[0];
    expect(Math.abs(centro.cx - CANVAS_WIDTH / 2)).toBeLessThanOrEqual(1);
  });

  it('las de la mitad izquierda se espejan y las de la derecha no', () => {
    for (const slot of slots) {
      if (slot.cx < CANVAS_WIDTH / 2 - 20) expect(slot.flip, `x=${slot.cx}`).toBe(true);
      if (slot.cx > CANVAS_WIDTH / 2 + 20) expect(slot.flip, `x=${slot.cx}`).toBe(false);
    }
  });
});

/**
 * El invariante que ata el encuadre al terreno.
 *
 * El marco es decorado, pero si se cierra de más tapa una plataforma o el suelo, y
 * eso no se nota hasta jugar. Aquí se comprueba con los números reales de
 * `game/level.ts`.
 */
describe('la abertura deja libre la zona de juego', () => {
  it('en el centro, la lente abarca la franja de las plataformas', () => {
    for (const scene of STAGE_SCENES) {
      if (!scene.layers.includes('mouth')) continue;
      const e = openingAt(scene.opening, CANVAS_WIDTH / 2);
      expect(e.top, `${scene.id}: la arcada de arriba baja demasiado`).toBeLessThanOrEqual(
        PLATFORM_TOP
      );
      expect(e.bottom, `${scene.id}: la de abajo sube demasiado`).toBeGreaterThanOrEqual(
        PLATFORM_BOTTOM
      );
    }
  });

  it('el canto inferior de la lente no se mete en el suelo', () => {
    // Si bajara de y=390 la arcada inferior quedaría enterrada en la lengua y no se
    // vería, que es trabajo tirado.
    for (const scene of STAGE_SCENES) {
      if (!scene.layers.includes('mouth')) continue;
      const e = openingAt(scene.opening, CANVAS_WIDTH / 2);
      expect(e.bottom, `${scene.id}`).toBeLessThan(GROUND_Y);
    }
  });

  it('la lente cabe en la pantalla', () => {
    for (const scene of STAGE_SCENES) {
      const e = openingAt(scene.opening, CANVAS_WIDTH / 2);
      expect(e.top, `${scene.id}`).toBeGreaterThanOrEqual(0);
      expect(e.bottom, `${scene.id}`).toBeLessThanOrEqual(CANVAS_HEIGHT);
    }
  });
});
