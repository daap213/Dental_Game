import { describe, it, expect } from 'vitest';
import { integerScale, scaledSize } from './scale';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/data/physics';

const scale = (w: number, h: number) => integerScale(w, h, CANVAS_WIDTH, CANVAS_HEIGHT);

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
