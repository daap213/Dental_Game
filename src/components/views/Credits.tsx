import React, { useEffect, useRef } from 'react';
import { Heart, Cpu, User, ArrowLeft, Gamepad2, ScrollText } from 'lucide-react';
import { Language } from '../../types';
import { TEXT } from '../../i18n';
import {
  CREDITS_BAKE_PREFIX,
  CREDITS_H,
  creditsSceneSize,
  drawCreditsScene,
} from '../../game/render/credits';
import { dropBakes, setupPixelContext } from '../../game/render/pixel';
import { prefersReducedMotion } from '../previewClock';
import { PixelPanel, PixelLabel } from '../ui/Pixel';
import { useFitScale } from '../useFitScale';
import { supersampleFor } from '../scale';
import { copyrightLine } from '../../legal/identity';

interface CreditsProps {
  onClose: () => void;
  onLegal: () => void;
  lang: Language;
}

export const Credits: React.FC<CreditsProps> = ({ onClose, onLegal, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    containerRef,
    contentRef,
    scale: fitScale,
  } = useFitScale<HTMLDivElement, HTMLDivElement>();
  const t = TEXT[lang].credits;
  const tl = TEXT[lang].legal;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sceneW = 0;
    let elapsed = 0;

    /**
     * La escena se hornea al ancho de la caja para que llene la ventana sin
     * recortarse ni estirarse, así que un cambio de proporción obliga a
     * rehacerla —y a desalojar la anterior, porque la caché de horneados no
     * expira sola y cada una es un lienzo de dos megapíxeles—.
     */
    const resize = () => {
      const { w } = creditsSceneSize(host.clientWidth, host.clientHeight);
      const ss = supersampleFor(
        host.clientHeight / CREDITS_H,
        w,
        CREDITS_H,
        window.devicePixelRatio
      );
      if (w === sceneW && canvas.width === w * ss) return;

      dropBakes(CREDITS_BAKE_PREFIX);
      sceneW = w;
      canvas.width = w * ss;
      canvas.height = CREDITS_H * ss;
      // Redimensionar reinicia el estado del contexto, transformación e
      // interpolación incluidas.
      setupPixelContext(ctx);
      ctx.setTransform(ss, 0, 0, ss, 0, 0);
      drawCreditsScene(ctx, elapsed, sceneW);
    };

    // La escena está horneada; solo cae la ceniza, así que basta con
    // repintar despacio en lugar de a 60 fps.
    let raf = 0;
    let start = 0;
    const paint = (now: number) => {
      if (!start) start = now;
      elapsed = (now - start) / 1000;
      drawCreditsScene(ctx, elapsed, sceneW);
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
      dropBakes(CREDITS_BAKE_PREFIX);
    };
  }, []);

  const roles = [
    {
      icon: <User className="h-7 w-7" strokeWidth={3} />,
      role: t.creator_role,
      name: 'DANIEL',
      color: '#34d399',
      border: 'border-emerald-600',
    },
    {
      icon: <Gamepad2 className="h-7 w-7" strokeWidth={3} />,
      role: t.tester_role,
      name: 'CALI',
      color: '#facc15',
      border: 'border-yellow-600',
    },
  ];

  return (
    <div
      ref={containerRef}
      className="pixel-crt absolute inset-0 z-50 flex flex-col overflow-hidden bg-slate-950"
    >
      {/* Fondo procedural, horneado a la proporción de la caja: llena la
          ventana sin `object-cover`, que recortaba justo la franja de abajo
          —el acantilado y el héroe— en cuanto la ventana era más ancha que
          16:9. Sin `image-rendering: pixelated` porque aquí se reduce un búfer
          mayor, igual que en el lienzo del juego. */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* Velo plano en vez de degradado, para no romper la estética. Al 75 % se
          comía la escena entera —el castillo, las sondas y la capa del héroe
          quedaban en penumbra—; los paneles llevan su propio fondo, así que la
          legibilidad del texto no depende de esto. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-slate-950/50" />

      {/* Cabecera */}
      <header className="pixel-frame relative z-10 flex shrink-0 items-center justify-between gap-3 border-slate-700 bg-slate-950 px-4 py-3">
        <h2 className="pixel-text-shadow text-sm tracking-[0.25em] text-blue-300 uppercase md:text-base">
          {t.title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLegal}
            className="pixel-btn pixel-text-shadow flex cursor-pointer items-center gap-2 border-slate-600 bg-slate-800 px-3 py-2 text-[10px] tracking-wider text-slate-300 uppercase hover:bg-slate-700"
          >
            <ScrollText className="h-4 w-4" strokeWidth={3} />
            {tl.title}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn pixel-text-shadow flex cursor-pointer items-center gap-2 border-slate-500 bg-slate-700 px-4 py-2 text-[10px] tracking-wider text-white uppercase hover:bg-slate-600"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            {t.back}
          </button>
        </div>
      </header>

      {/* Contenido: cabe entero, se encoge en ventanas bajas en vez de scrollear. */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden">
        <div
          ref={contentRef}
          style={{ transform: `scale(${fitScale})` }}
          className="flex w-full max-w-3xl flex-col items-center gap-4 p-4"
        >
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {roles.map((entry) => (
              <PixelPanel key={entry.name} accent={entry.border} bodyClassName="p-3">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div
                    className="pixel-inset bg-slate-950 p-2"
                    style={{ color: entry.color, borderColor: entry.color }}
                  >
                    {entry.icon}
                  </div>
                  <p
                    className="text-[7px] tracking-[0.25em] uppercase"
                    style={{ color: entry.color }}
                  >
                    {entry.role}
                  </p>
                  <p className="pixel-text-shadow text-base tracking-[0.1em] text-white">
                    {entry.name}
                  </p>
                </div>
              </PixelPanel>
            ))}
          </div>

          {/* La IA aparece como nota, no como tarjeta de rol: se hizo con
              asistencia de herramientas generativas, no lo firmó un proveedor. */}
          <PixelPanel accent="border-blue-700" className="w-full" bodyClassName="p-3">
            <div className="flex items-center justify-center gap-3 text-center">
              <Cpu className="h-5 w-5 shrink-0 text-blue-400" strokeWidth={3} />
              <p className="text-[8px] leading-[1.9] text-blue-200">{t.ai_note}</p>
            </div>
          </PixelPanel>

          {/* Dedicatoria */}
          <PixelPanel
            accent="border-pink-600"
            className="w-full bg-pink-950/40"
            bodyClassName="p-4"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <Heart className="pixel-blink h-9 w-9 fill-pink-500 text-pink-500" strokeWidth={3} />
              <p className="text-[7px] tracking-[0.25em] text-pink-300 uppercase">
                {t.dedication_title}
              </p>
              {/* Solo la inicial: es una persona real y esto es una página
                  pública. La dedicatoria se lee igual de bien. */}
              <p className="pixel-title text-lg tracking-[0.1em] text-white">Dra. M.</p>
              <p className="text-[9px] leading-[1.9] text-pink-200">{t.dedication_quote}</p>
            </div>
          </PixelPanel>

          <PixelLabel className="text-center">
            {t.footer} · {copyrightLine()} · {t.rights_reserved}
          </PixelLabel>
        </div>
      </div>
    </div>
  );
};
