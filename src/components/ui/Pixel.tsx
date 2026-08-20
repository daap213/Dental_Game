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

/**
 * Peso del botón. `primary` es el triplete rojo que EMPEZAR llevaba escrito a
 * mano en un `<button>` crudo, porque no había forma de pedir "este es el
 * importante": ocho botones del proyecto estaban fuera de esta primitiva solo
 * por eso.
 */
export type PixelButtonVariant = 'default' | 'primary' | 'danger';

const VARIANTS: Record<PixelButtonVariant, string> = {
  default: 'border-slate-600 bg-slate-700 text-slate-400 hover:text-white',
  primary: 'border-red-300 bg-red-600 text-white hover:bg-red-500',
  danger: 'border-amber-300 bg-amber-700 text-white hover:bg-amber-600',
};

type PixelButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  /** Marca visual de opción elegida: invierte el relleno y saca el cursor ▶. */
  active?: boolean;
  /** Clases de color aplicadas cuando está activo. */
  activeClass?: string;
  variant?: PixelButtonVariant;
  /**
   * Reserva un hueco a la izquierda para el cursor ▶. Va en el flujo normal
   * y no posicionado, para que en una rejilla de varias columnas no invada
   * el botón vecino; el hueco existe siempre para que no baile la anchura.
   * Desactívalo en botones pequeños de solo icono.
   */
  marker?: boolean;
  className?: string;
  title?: string;
  disabled?: boolean;
  /**
   * Nombre accesible. Los botones de solo icono se apoyaban únicamente en
   * `title`, que no es un nombre accesible fiable.
   */
  'aria-label'?: string;
  role?: string;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export const PixelButton = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
  (
    {
      onClick,
      children,
      active,
      activeClass = 'bg-pink-600 border-pink-300 text-white',
      variant = 'default',
      marker = false,
      className = '',
      title,
      disabled = false,
      role,
      tabIndex,
      onKeyDown,
      ...aria
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      /**
       * Solo se anuncia como interruptor si de verdad lo es. Salía siempre,
       * así que cada pestaña y cada botón de navegación —incluido VOLVER— se
       * leía como una casilla que se puede activar y desactivar.
       */
      aria-pressed={active !== undefined && role === undefined ? active : undefined}
      aria-label={aria['aria-label']}
      aria-selected={aria['aria-selected']}
      aria-checked={aria['aria-checked']}
      className={`pixel-btn pixel-text-shadow text-[9px] tracking-wider uppercase ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${active ? activeClass : VARIANTS[variant]} ${className}`}
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
  )
);

PixelButton.displayName = 'PixelButton';

/** Rótulo de sección: una línea corta de texto entre reglas. */
export const PixelLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`text-[8px] tracking-[0.2em] text-slate-500 uppercase ${className}`}>{children}</p>
);

/** Tecla dibujada como una tapa de teclado. */
export const PixelKey: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="pixel-inset border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[7px] whitespace-nowrap text-slate-300">
    {children}
  </span>
);

/**
 * Texto largo para leer, no para mirar.
 *
 * Press Start 2P es una fuente de display de ocho píxeles: perfecta para un
 * rótulo y penosa para dos mil palabras de política de privacidad, hasta el
 * punto de ser un problema de accesibilidad. La clase `legal-prose`
 * (`src/styles.css`) cambia **solo los párrafos** a la fuente del sistema; los
 * títulos, las pestañas y los botones siguen en píxel, así que la pantalla no
 * deja de ser del juego. Es una regla CSS: revertirlo es borrarla.
 */
export const PixelProse: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`legal-prose max-w-[68ch] text-slate-300 ${className}`}>{children}</div>;

/**
 * Enlace. No había ninguno en todo el proyecto, y el preflight de Tailwind v4
 * resetea `a` por completo: sin esto, un enlace se ve exactamente igual que el
 * texto que lo rodea. El anillo de foco tampoco existía en ningún sitio.
 */
export const PixelLink: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
}> = ({ href, children, className = '' }) => {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      className={`pixel-link ${className}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
};
