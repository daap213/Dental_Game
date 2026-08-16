import React from 'react';

/**
 * Piezas de interfaz con estética pixel art. Las reglas visuales (relieve de
 * dos aristas, sombra dura, nada redondeado) viven en `src/styles.css`; aquí
 * solo se componen.
 */

/** Panel con marco y trama. `title` pinta la cabecera clásica de ventana. */
export const PixelPanel: React.FC<{
  title?: string;
  accent?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, accent = 'border-slate-500', className = '', bodyClassName = '', children }) => (
  <section className={`pixel-frame pixel-dither bg-slate-800 ${accent} ${className}`}>
    {title && (
      <h3
        className={`border-b-4 ${accent} bg-slate-900/70 px-2 py-1.5 text-center text-[8px] tracking-[0.2em] text-slate-300 uppercase`}
      >
        {title}
      </h3>
    )}
    <div className={`p-2 ${bodyClassName}`}>{children}</div>
  </section>
);

type PixelButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  /** Marca visual de opción elegida: invierte el relleno y saca el cursor ▶. */
  active?: boolean;
  /** Clases de color aplicadas cuando está activo. */
  activeClass?: string;
  /**
   * Reserva un hueco a la izquierda para el cursor ▶. Va en el flujo normal
   * y no posicionado, para que en una rejilla de varias columnas no invada
   * el botón vecino; el hueco existe siempre para que no baile la anchura.
   * Desactívalo en botones pequeños de solo icono.
   */
  marker?: boolean;
  className?: string;
  title?: string;
};

export const PixelButton: React.FC<PixelButtonProps> = ({
  onClick,
  children,
  active = false,
  activeClass = 'bg-pink-600 border-pink-300 text-white',
  marker = false,
  className = '',
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`pixel-btn pixel-text-shadow cursor-pointer text-[9px] tracking-wider uppercase ${
      active ? activeClass : 'border-slate-600 bg-slate-700 text-slate-400 hover:text-white'
    } ${className}`}
  >
    {marker && (
      <span
        aria-hidden
        className={`mr-1.5 inline-block w-2 ${active ? 'pixel-blink' : 'opacity-0'}`}
      >
        ▶
      </span>
    )}
    {children}
  </button>
);

/** Rótulo de sección: una línea corta de texto entre reglas. */
export const PixelLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`text-[8px] tracking-[0.2em] text-slate-500 uppercase ${className}`}>{children}</p>
);

/** Tecla dibujada como una tapa de teclado. */
export const PixelKey: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="pixel-inset border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[8px] whitespace-nowrap text-slate-300">
    {children}
  </span>
);
