import { describe, it, expect } from 'vitest';
import {
  MAX_BUFFER_PIXELS,
  MAX_SUPERSAMPLE,
  integerScale,
  scaledSize,
  supersampleFor,
  viewportSize,
} from './scale';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/data/physics';

const scale = (w: number, h: number) => integerScale(w, h, CANVAS_WIDTH, CANVAS_HEIGHT);
const view = (w: number, h: number, dpr = 1) =>
  viewportSize(w, h, CANVAS_WIDTH, CANVAS_HEIGHT, dpr);

/** Ventanas reales, con la barra del navegador ya descontada. */
const WINDOWS: Array<[number, number, number]> = [
  [1536, 695, 1.25], // la del informe: aquí la escala entera daba ×1
  [1366, 600, 1],
  [1920, 955, 1],
  [1920, 1080, 1],
  [2560, 1300, 1],
  [3840, 2000, 2],
  [1280, 620, 1],
  [800, 450, 1],
  [640, 360, 1], // más pequeña que el lienzo
];

describe('escala entera', () => {
  it('da la mayor escala que cabe', () => {
    expect(scale(800, 450)).toBe(1);
    expect(scale(1600, 900)).toBe(2);
    expect(scale(2400, 1350)).toBe(3);
  });

  it('nunca devuelve una escala fraccionaria', () => {
    for (let w = 300; w <= 4000; w += 37) {
      for (let h = 200; h <= 2200; h += 53) {
        expect(Number.isInteger(scale(w, h)), `${w}x${h}`).toBe(true);
      }
    }
  });

  it('manda la dimensión que menos sitio deja', () => {
    // Ventana muy ancha pero baja: limita el alto.
    expect(scale(3000, 500)).toBe(1);
    // Ventana muy alta pero estrecha: limita el ancho.
    expect(scale(900, 3000)).toBe(1);
  });

  it('nunca baja de 1, aunque la ventana sea diminuta', () => {
    expect(scale(100, 80)).toBe(1);
    expect(scale(1, 1)).toBe(1);
    expect(scale(0, 0)).toBe(1);
    expect(scale(-500, -500)).toBe(1);
  });

  it('aguanta medidas no numéricas sin devolver NaN', () => {
    expect(integerScale(NaN, 500, 800, 450)).toBe(1);
    expect(integerScale(1600, NaN, 800, 450)).toBe(1);
    expect(integerScale(1600, 900, 0, 0)).toBe(1);
  });

  it('el tamaño resultante es siempre múltiplo exacto del lienzo', () => {
    for (const [w, h] of [
      [1366, 768],
      [1920, 1080],
      [2560, 1440],
      [1280, 720],
      [1440, 900],
    ]) {
      const size = scaledSize(w, h, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(size.width % CANVAS_WIDTH).toBe(0);
      expect(size.height % CANVAS_HEIGHT).toBe(0);
      expect(size.width / CANVAS_WIDTH).toBe(size.scale);
      expect(size.height / CANVAS_HEIGHT).toBe(size.scale);
    }
  });

  it('el resultado nunca desborda el hueco disponible', () => {
    for (let w = 800; w <= 3840; w += 111) {
      for (let h = 450; h <= 2160; h += 97) {
        const size = scaledSize(w, h, CANVAS_WIDTH, CANVAS_HEIGHT);
        expect(size.width, `${w}x${h}`).toBeLessThanOrEqual(w);
        expect(size.height, `${w}x${h}`).toBeLessThanOrEqual(h);
      }
    }
  });

  it('una pantalla 1080p da escala 2', () => {
    // El caso más común: 1920x1080 menos la barra del navegador.
    expect(scale(1920, 1000)).toBe(2);
    expect(scaledSize(1920, 1000, CANVAS_WIDTH, CANVAS_HEIGHT)).toMatchObject({
      scale: 2,
      width: 1600,
      height: 900,
    });
  });
});

describe('pantalla virtual', () => {
  it('llena el hueco por una de las dos dimensiones', () => {
    // Esto es el arreglo: la caja toca el borde. Con escala entera, una ventana
    // de 1536x695 dejaba el juego en 800x450 y dos tercios de la pantalla en
    // negro, y no había forma de mejorarlo redimensionando.
    for (const [w, h, dpr] of WINDOWS) {
      const size = view(w, h, dpr);
      const touches = size.width >= w - 1 || size.height >= h - 1;
      expect(touches, `${w}x${h} deja hueco de sobra: ${size.width}x${size.height}`).toBe(true);
    }
  });

  it('la ventana del informe pasa de un tercio a cuatro quintos de la pantalla', () => {
    const size = view(1536, 695, 1.25);
    const used = (size.width * size.height) / (1536 * 695);
    expect(used).toBeGreaterThan(0.79);

    // La escala entera de ese caso: 800x450, un 34% de la ventana.
    const before = scaledSize(1536, 695, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(before.width).toBe(800);
    expect((before.width * before.height) / (1536 * 695)).toBeLessThan(0.35);
  });

  it('conserva la proporción 16:9', () => {
    const target = CANVAS_WIDTH / CANVAS_HEIGHT;
    for (let w = 320; w <= 3840; w += 71) {
      for (let h = 240; h <= 2160; h += 83) {
        const size = view(w, h);
        // Un píxel de holgura: los lados se redondean al piso por separado.
        expect(Math.abs(size.width / size.height - target), `${w}x${h}`).toBeLessThan(0.01);
      }
    }
  });

  it('nunca desborda el hueco disponible', () => {
    for (let w = 320; w <= 3840; w += 71) {
      for (let h = 240; h <= 2160; h += 83) {
        const size = view(w, h);
        expect(size.width, `${w}x${h}`).toBeLessThanOrEqual(w);
        expect(size.height, `${w}x${h}`).toBeLessThanOrEqual(h);
      }
    }
  });

  it('el búfer siempre es un múltiplo entero del lienzo', () => {
    // Es la condición del pixel art: cada píxel lógico ha de ser un cuadrado
    // exacto en el búfer. Lo que ya no es entero es la caja CSS.
    for (const [w, h, dpr] of WINDOWS) {
      const { supersample } = view(w, h, dpr);
      expect(Number.isInteger(supersample), `${w}x${h}`).toBe(true);
      expect(supersample).toBeGreaterThanOrEqual(1);
    }
  });

  it('el búfer cubre la caja en píxeles de dispositivo, así que se reduce y no se amplía', () => {
    // Ampliar un búfer más pequeño que la caja es lo que dejaba el pixel art
    // borroso; reducir uno más grande solo lo suaviza un poco.
    for (let w = 320; w <= 3840; w += 137) {
      for (let h = 240; h <= 2160; h += 91) {
        for (const dpr of [1, 1.25, 1.5, 2]) {
          const size = view(w, h, dpr);
          const buffer = CANVAS_WIDTH * size.supersample;
          const covers = buffer >= size.width * dpr || size.supersample === MAX_SUPERSAMPLE;
          expect(covers, `${w}x${h} dpr ${dpr}: búfer ${buffer} para ${size.width * dpr}`).toBe(
            true
          );
        }
      }
    }
  });

  it('el búfer no se pasa del presupuesto de píxeles', () => {
    for (let scale = 0.5; scale <= 12; scale += 0.25) {
      const s = supersampleFor(scale, CANVAS_WIDTH, CANVAS_HEIGHT, 2);
      expect(s, `escala ${scale}`).toBeLessThanOrEqual(MAX_SUPERSAMPLE);
      expect(CANVAS_WIDTH * s * CANVAS_HEIGHT * s, `escala ${scale}`).toBeLessThanOrEqual(
        MAX_BUFFER_PIXELS
      );
    }
  });

  it('el múltiplo del búfer es el más pequeño que sirve', () => {
    expect(supersampleFor(1, CANVAS_WIDTH, CANVAS_HEIGHT, 1)).toBe(1);
    expect(supersampleFor(1.55, CANVAS_WIDTH, CANVAS_HEIGHT, 1)).toBe(2);
    expect(supersampleFor(2, CANVAS_WIDTH, CANVAS_HEIGHT, 1)).toBe(2);
    // Con densidad 1,25 la caja necesita más píxeles reales de los que aparenta.
    expect(supersampleFor(1.55, CANVAS_WIDTH, CANVAS_HEIGHT, 1.25)).toBe(2);
    expect(supersampleFor(2.4, CANVAS_WIDTH, CANVAS_HEIGHT, 1.25)).toBe(3);
  });

  it('en una ventana más pequeña que el lienzo encoge en vez de recortar', () => {
    const size = view(640, 360);
    expect(size.scale).toBeCloseTo(0.8, 5);
    expect(size.width).toBe(640);
    expect(size.supersample).toBe(1);
  });

  it('aguanta medidas y densidades disparatadas sin devolver NaN', () => {
    for (const size of [
      view(0, 0),
      view(-100, -100),
      view(NaN, 500),
      view(1600, NaN),
      viewportSize(1600, 900, 0, 0),
      view(1600, 900, 0),
      view(1600, 900, NaN),
    ]) {
      expect(Number.isFinite(size.width)).toBe(true);
      expect(Number.isFinite(size.height)).toBe(true);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
      expect(Number.isInteger(size.supersample)).toBe(true);
      expect(size.supersample).toBeGreaterThanOrEqual(1);
    }
  });
});
