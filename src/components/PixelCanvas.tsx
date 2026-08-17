import React, { useEffect, useRef } from 'react';
import { setupPixelContext } from '../game/render/pixel';
import { prefersReducedMotion, subscribePreviewClock } from './previewClock';

/**
 * Lienzo para dibujar arte del juego dentro de la interfaz.
 *
 * El lienzo se crea al **tamaño lógico** del dibujo y se agranda por CSS en un
 * múltiplo entero: es la misma regla que el juego, y la única forma de que un sprite
 * de 32 px se vea nítido en una ficha. Nada de escalar el contexto: eso interpolaría.
 *
 * Con `animated` se suscribe al reloj compartido, así que cuarenta vistas previas en
 * pantalla siguen siendo un solo bucle.
 */
export interface PixelCanvasProps {
  /** Tamaño lógico del dibujo, en píxeles de juego. */
  w: number;
  h: number;
  /** Aumento entero. 1 = tamaño real. */
  scale?: number;
  draw: (ctx: CanvasRenderingContext2D, seconds: number) => void;
  /** Repinta con el reloj compartido. Sin esto se dibuja una vez. */
  animated?: boolean;
  className?: string;
  /** Texto alternativo: el lienzo es contenido, no decoración. */
  label?: string;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  w,
  h,
  scale = 1,
  draw,
  animated = false,
  className,
  label,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // El dibujo cambia en cada render del padre; el efecto no debe reengancharse por
  // eso, así que se lee siempre la última versión desde un ref.
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setupPixelContext(ctx);

    const paint = (seconds: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      // Las funciones de dibujado del juego pueden dejar el contexto tocado (el
      // fantasma baja la opacidad, por ejemplo): se restaura por si acaso.
      drawRef.current(ctx, seconds);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    paint(0);
    if (!animated || prefersReducedMotion()) return;
    return subscribePreviewClock(paint);
  }, [w, h, animated]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: w * scale, height: h * scale, imageRendering: 'pixelated' }}
    />
  );
};
