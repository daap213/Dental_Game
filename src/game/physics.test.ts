import { describe, it, expect } from 'vitest';
import { checkRectCollide } from './physics';
import type { Rect } from '../types';

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

describe('checkRectCollide', () => {
  it('detecta solapamiento parcial', () => {
    expect(checkRectCollide(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
  });

  it('detecta contención completa', () => {
    expect(checkRectCollide(rect(0, 0, 100, 100), rect(10, 10, 5, 5))).toBe(true);
  });

  it('no colisiona cuando están separados', () => {
    expect(checkRectCollide(rect(0, 0, 10, 10), rect(20, 0, 10, 10))).toBe(false);
    expect(checkRectCollide(rect(0, 0, 10, 10), rect(0, 20, 10, 10))).toBe(false);
  });

  it('los bordes que solo se tocan NO cuentan como colisión', () => {
    // El test es estrictamente <, así que compartir borde no es impacto.
    // De esto depende que el jugador pueda apoyarse en una plataforma sin
    // que la resolución de colisiones lo empuje cada frame.
    expect(checkRectCollide(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false);
    expect(checkRectCollide(rect(0, 0, 10, 10), rect(0, 10, 10, 10))).toBe(false);
  });

  it('es simétrico', () => {
    const a = rect(0, 0, 30, 30);
    const b = rect(15, 15, 30, 30);
    expect(checkRectCollide(a, b)).toBe(checkRectCollide(b, a));
  });

  it('un rectángulo de área cero se comporta como un punto', () => {
    // Estrictamente dentro: sí impacta. Sobre el borde: no.
    expect(checkRectCollide(rect(5, 5, 0, 0), rect(0, 0, 10, 10))).toBe(true);
    expect(checkRectCollide(rect(0, 5, 0, 0), rect(0, 0, 10, 10))).toBe(false);
  });
});
