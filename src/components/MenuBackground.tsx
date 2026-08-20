import React, { useEffect, useRef } from 'react';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/data/physics';
import { clearBackgroundBakes, drawBackground } from '../game/render/background';
import { setupPixelContext } from '../game/render/pixel';
import { prefersReducedMotion } from './previewClock';
import { supersampleFor } from './scale';

/**
 * El quirófano de la fase 5, de fondo del menú.
 *
 * Tres decisiones que lo separan del fondo de los créditos, y las tres a
 * propósito:
 *
 * 1. **No se hace `drawBackground` paramétrico en anchura.** Se dibuja la
 *    retícula lógica de 800×450 y se cubre con CSS. Hilar un ancho por cada
 *    horneado y cada disposición —más la geometría de la arcada— es un proyecto
 *    de la capa de dibujado, no un cambio de menú. Los créditos necesitaban esa
 *    parametrización porque su sujeto vive en la franja de abajo y recortarla se
 *    lo llevaba; aquí la masa de la sala está en el centro y aguanta el recorte.
 * 2. **Se desaloja solo al desmontar**, no al redimensionar: aquí no se hornea
 *    al ancho de la caja, así que cambiar de tamaño no invalida nada horneado.
 *    Solo hay que rehacer la transformación, porque redimensionar un lienzo
 *    reinicia el estado del contexto.
 * 3. **El paneo oscila** en vez de avanzar. Da parallax gratis (garganta 0,
 *    clínica 0,03, utillaje 0,12) y nunca saca de cuadro unas capas que existen
 *    en una sola copia, que es lo que haría un paneo monótono.
 *
 * La fase 5 es además la más barata de las cinco: sin capa de boca, sin arcada
 * y sin saliva, y la clínica está horneada del todo.
 */

/** Fase cuyo escenario se usa. El quirófano, que es donde acaba el juego. */
const MENU_STAGE = 5;

export const MenuBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let elapsed = 0;

    const resize = () => {
      const ss = supersampleFor(
        host.clientHeight / CANVAS_HEIGHT,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        window.devicePixelRatio
      );
      if (canvas.width === CANVAS_WIDTH * ss) return;

      canvas.width = CANVAS_WIDTH * ss;
      canvas.height = CANVAS_HEIGHT * ss;
      // Redimensionar reinicia el contexto, transformación e interpolación
      // incluidas, así que hay que rehacerlas después de cada cambio.
      setupPixelContext(ctx);
      ctx.setTransform(ss, 0, 0, ss, 0, 0);
      paintOnce(elapsed);
    };

    const paintOnce = (t: number) => {
      // Vaivén lento: 0 → 120 px y vuelta, en unos cincuenta segundos.
      const cameraX = 60 * (1 - Math.cos(t * 0.12));
      drawBackground(ctx, cameraX, MENU_STAGE, t);
    };

    let raf = 0;
    let start = 0;
    const paint = (now: number) => {
      if (!start) start = now;
      elapsed = (now - start) / 1000;
      paintOnce(elapsed);
      raf = requestAnimationFrame(paint);
    };

    resize();
    if (!prefersReducedMotion()) raf = requestAnimationFrame(paint);

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      // El prefijo `bg:` lo comparten los fondos del juego, así que al entrar a
      // jugar se rehornean las capas de la fase 1. Es un coste puntual en una
      // pantalla que ya está construyendo un nivel de ocho mil píxeles, y la
      // alternativa es dejar dos lienzos a pantalla completa vivos toda la
      // sesión.
      clearBackgroundBakes();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 40%' }}
      />
      {/* Velo: los paneles llevan su propio fondo, así que la legibilidad del
          texto no depende de esto —solo el contraste general—. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-slate-950/55" />
    </>
  );
};
