import { describe, expect, it } from 'vitest';
import {
  AIM_STEPS,
  BAKED_STEPS,
  aimStep,
  bakeStep,
  isCardinal,
  localAxes,
  orientedBox,
  stepAngle,
  stepVector,
  wrapStep,
} from './aim';
import { BOW, FLOSS, SCYTHE, TOOTHBRUSH } from './weapons';

/**
 * El apuntado cuantizado y la caja que sale de él.
 *
 * Es puro y no depende de nada del juego, así que se prueba solo y antes de que nada lo use.
 */

describe('paso de apuntado', () => {
  it('las cuatro direcciones rectas caen en los pasos que se esperan', () => {
    expect(aimStep(1, 0)).toBe(0);
    expect(aimStep(0, 1)).toBe(4);
    expect(aimStep(-1, 0)).toBe(8);
    expect(aimStep(0, -1)).toBe(12);
  });

  it('las diagonales de cuarenta y cinco grados caen en los pasos intermedios', () => {
    expect(aimStep(1, 1)).toBe(2);
    expect(aimStep(-1, 1)).toBe(6);
    expect(aimStep(-1, -1)).toBe(10);
    expect(aimStep(1, -1)).toBe(14);
  });

  it('cada paso se reconoce a sí mismo', () => {
    for (let step = 0; step < AIM_STEPS; step++) {
      const v = stepVector(step);
      expect(aimStep(v.x, v.y), `el paso ${step}`).toBe(step);
    }
  });

  /**
   * El cursor justo encima del jugador da un vector nulo. Pasa de verdad, y tenía que devolver
   * algo en lugar de un ángulo indefinido.
   */
  it('un vector nulo no rompe nada', () => {
    expect(aimStep(0, 0)).toBe(0);
  });

  it('un paso fuera de rango se envuelve', () => {
    expect(wrapStep(-1)).toBe(15);
    expect(wrapStep(AIM_STEPS)).toBe(0);
    expect(wrapStep(AIM_STEPS + 3)).toBe(3);
  });

  it('hay pasos intermedios de verdad entre los rectos', () => {
    expect(stepAngle(1)).toBeCloseTo(Math.PI / 8);
    expect(stepAngle(4)).toBeCloseTo(Math.PI / 2);
  });

  it('solo cuatro pasos son ejes', () => {
    expect([0, 4, 8, 12].every(isCardinal)).toBe(true);
    expect([1, 2, 3, 5, 7, 9, 11, 13, 15].some(isCardinal)).toBe(false);
  });

  /**
   * El teclado solo alcanza cinco de los dieciséis pasos: no tiene tecla para apuntar hacia
   * abajo. Queda escrito aquí porque es la diferencia entre jugar con ratón y con teclado, y
   * porque añadir esa tecla es una decisión de controles, no de dibujado.
   */
  it('el teclado alcanza cinco pasos, y el ratón los dieciséis', () => {
    const diagonal = Math.SQRT1_2;
    const reachable = new Set(
      [
        [1, 0],
        [-1, 0],
        [0, -1],
        [diagonal, -diagonal],
        [-diagonal, -diagonal],
      ].map(([x, y]) => aimStep(x, y))
    );

    expect([...reachable].sort((a, b) => a - b)).toEqual([0, 8, 10, 12, 14]);
  });
});

describe('espejado del horneado', () => {
  it('solo se hornean nueve de los dieciséis pasos', () => {
    expect(BAKED_STEPS).toEqual([0, 1, 2, 3, 4, 12, 13, 14, 15]);
  });

  it('lo que apunta a la derecha se hornea tal cual', () => {
    for (const step of BAKED_STEPS) {
      expect(bakeStep(step), `el paso ${step}`).toEqual({ step, flip: false });
    }
  });

  /**
   * Espejar tiene que dar de verdad la dirección pedida, y no una parecida.
   *
   * Si esta cuenta estuviera mal, apuntar a la izquierda dibujaría el arma en un ángulo
   * equivocado y costaría mucho verlo, porque sería *casi* correcto.
   */
  it('el paso espejado apunta a donde apuntaba el original', () => {
    for (let step = 0; step < AIM_STEPS; step++) {
      const { step: baked, flip } = bakeStep(step);
      const wanted = stepVector(step);
      const drawn = stepVector(baked);

      expect(flip ? -drawn.x : drawn.x, `la equis del paso ${step}`).toBeCloseTo(wanted.x);
      expect(drawn.y, `la ye del paso ${step}`).toBeCloseTo(wanted.y);
    }
  });

  it('todo paso se resuelve en uno de los que se hornean', () => {
    for (let step = 0; step < AIM_STEPS; step++) {
      expect(BAKED_STEPS, `el paso ${step}`).toContain(bakeStep(step).step);
    }
  });

  /**
   * Apuntando recto arriba o recto abajo el ángulo no dice de qué lado está el arma, así que lo
   * dice el cuerpo. Sin este desempate, girarse mientras se apunta al cielo cambiaba el arma de
   * mano.
   */
  it('recto arriba y recto abajo se espejan según hacia dónde mire el personaje', () => {
    for (const step of [4, 12]) {
      expect(bakeStep(step, 1), `el paso ${step} mirando a la derecha`).toEqual({
        step,
        flip: false,
      });
      expect(bakeStep(step, -1), `el paso ${step} mirando a la izquierda`).toEqual({
        step,
        flip: true,
      });
    }
  });
});

describe('caja de una hoja inclinada', () => {
  /**
   * En los cuatro ejes la caja tiene que salir **exactamente** la de siempre.
   *
   * Es la condición para poder cambiar el mecanismo sin tocar el equilibrio: en las direcciones
   * en las que ya se jugaba, el alcance y el área no se mueven ni un píxel.
   */
  it('en los ejes son las medidas de siempre', () => {
    const cases = [
      { name: 'cepillo', long: TOOTHBRUSH.tangential(1), thick: TOOTHBRUSH.radial(1) },
      { name: 'guadaña', long: SCYTHE.tangential(1), thick: SCYTHE.radial(1) },
    ] as const;

    for (const { name, long, thick } of cases) {
      // Apuntando de lado: estrecha y alta. Apuntando en vertical: ancha y baja.
      expect(orientedBox(long, thick, 0, 'across'), `${name} de lado`).toEqual({
        w: thick,
        h: long,
      });
      expect(orientedBox(long, thick, 4, 'across'), `${name} en vertical`).toEqual({
        w: long,
        h: thick,
      });
      expect(orientedBox(long, thick, 8, 'across'), `${name} al otro lado`).toEqual({
        w: thick,
        h: long,
      });
    }

    expect(orientedBox(FLOSS.range(1), FLOSS.thickness(1), 0, 'along')).toEqual({ w: 100, h: 20 });
    expect(orientedBox(FLOSS.range(1), FLOSS.thickness(1), 12, 'along')).toEqual({ w: 20, h: 100 });
    expect(orientedBox(BOW.w, BOW.h, 0, 'along')).toEqual({ w: BOW.w, h: BOW.h });
    expect(orientedBox(BOW.w, BOW.h, 4, 'along')).toEqual({ w: BOW.h, h: BOW.w });
  });

  /**
   * En diagonal la caja crece, y eso se compró a cambio de que alcance donde se ve que alcanza.
   *
   * Queda anotado el número para que nadie tenga que redescubrirlo a ojo: una hoja de 24×56
   * inclinada cuarenta y cinco grados ocupa 57×57, o sea **2,4 veces el área**. La caja es un
   * rectángulo alineado a los ejes y no puede girar; la alternativa de verdad es una prueba de
   * solape orientada, y eso es del port a Phaser.
   */
  it('en diagonal envuelve al dibujo, y por eso crece', () => {
    const long = TOOTHBRUSH.tangential(1);
    const thick = TOOTHBRUSH.radial(1);

    const straight = orientedBox(long, thick, 0, 'across');
    const tilted = orientedBox(long, thick, 2, 'across');

    expect(tilted).toEqual({ w: 57, h: 57 });
    expect((tilted.w * tilted.h) / (straight.w * straight.h)).toBeCloseTo(2.4, 1);
  });

  it('el largo manda: la caja nunca es más corta que el propio largo girado', () => {
    for (let step = 0; step < AIM_STEPS; step++) {
      const box = orientedBox(100, 20, step, 'along');
      expect(Math.max(box.w, box.h), `el paso ${step}`).toBeGreaterThanOrEqual(70);
    }
  });
});

describe('ejes locales de una hoja', () => {
  /**
   * Apuntando a la derecha los ejes tienen que ser la identidad, cada familia en su sentido.
   *
   * Eso es lo que hace que el arte de los cuatro ejes salga **idéntico** al de hoy: el dibujo
   * local ya está hecho en estos ejes, y en el paso 0 el giro no hace nada.
   */
  it('en el paso cero no giran nada', () => {
    const along = localAxes(0, 'along');
    expect(along.ax).toBeCloseTo(1);
    expect(along.ay).toBeCloseTo(0);
    expect(along.bx).toBeCloseTo(0);
    expect(along.by).toBeCloseTo(1);

    // El barrido lleva el largo en tangencial y el corto hacia fuera.
    const across = localAxes(0, 'across');
    expect(across.ax).toBeCloseTo(0);
    expect(across.ay).toBeCloseTo(1);
    expect(across.bx).toBeCloseTo(1);
    expect(across.by).toBeCloseTo(0);
  });

  it('los dos ejes siguen siendo perpendiculares y unitarios en todos los pasos', () => {
    for (let step = 0; step < AIM_STEPS; step++) {
      for (const frame of ['along', 'across'] as const) {
        const { ax, ay, bx, by } = localAxes(step, frame);
        expect(Math.hypot(ax, ay), `largo del paso ${step} en ${frame}`).toBeCloseTo(1);
        expect(Math.hypot(bx, by), `corto del paso ${step} en ${frame}`).toBeCloseTo(1);
        expect(ax * bx + ay * by, `perpendicularidad del paso ${step} en ${frame}`).toBeCloseTo(0);
      }
    }
  });

  /**
   * El eje corto de un barrido apunta **hacia fuera**, en la dirección a la que se apunta. Es
   * lo que pone la hoja por delante del jugador y no detrás.
   */
  it('el corto de un barrido apunta a donde se apunta', () => {
    for (let step = 0; step < AIM_STEPS; step++) {
      const { bx, by } = localAxes(step, 'across');
      const aim = stepVector(step);
      expect(bx * aim.x + by * aim.y, `el paso ${step}`).toBeCloseTo(1);
    }
  });
});
