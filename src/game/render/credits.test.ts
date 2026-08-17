import { describe, it, expect } from 'vitest';
import { CREDITS_H, CREDITS_W, creditsSceneSize } from './credits';

/**
 * El fondo de los créditos se hornea a la proporción de la caja para poder
 * pintarse a `width:100%` sin recortar ni estirar. Antes era un lienzo de
 * 800×450 fijo con `object-cover`, y en cuanto la ventana era más ancha que 16:9
 * el recorte se llevaba la franja de abajo: el acantilado y el héroe.
 */
describe('tamaño de la escena de créditos', () => {
  const BOXES: Array<[number, number]> = [
    [1536, 695],
    [1536, 400],
    [1920, 1080],
    [900, 860],
    [600, 900],
    [800, 450],
  ];

  it('iguala la proporción de la caja, así que se puede estirar sin deformar', () => {
    for (const [w, h] of BOXES) {
      const scene = creditsSceneSize(w, h);
      // Medio píxel de holgura por el redondeo del ancho.
      expect(Math.abs(scene.w / scene.h - w / h), `${w}x${h}`).toBeLessThan(0.005);
    }
  });

  it('mantiene el alto de referencia: es lo que fija el tamaño del píxel', () => {
    for (const [w, h] of BOXES) {
      expect(creditsSceneSize(w, h).h, `${w}x${h}`).toBe(CREDITS_H);
    }
  });

  it('en la caja de referencia devuelve el tamaño de referencia', () => {
    expect(creditsSceneSize(CREDITS_W, CREDITS_H)).toEqual({ w: CREDITS_W, h: CREDITS_H });
  });

  it('acota los extremos y aguanta medidas inválidas', () => {
    for (const [w, h] of [
      [0, 0],
      [-10, 40],
      [NaN, 450],
      [800, NaN],
      [40000, 100],
      [100, 40000],
    ]) {
      const scene = creditsSceneSize(w, h);
      expect(Number.isInteger(scene.w), `${w}x${h}`).toBe(true);
      expect(scene.w).toBeGreaterThanOrEqual(16);
      expect(scene.w).toBeLessThanOrEqual(4 * CREDITS_W);
      expect(scene.h).toBe(CREDITS_H);
    }
  });
});
