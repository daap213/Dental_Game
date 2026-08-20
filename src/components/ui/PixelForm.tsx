import React, { useId } from 'react';

/**
 * Los dos únicos controles de entrada del juego.
 *
 * Hasta ahora no había ninguno: los únicos elementos interactivos del proyecto
 * eran `<button>`, `<a>` y `<canvas>`. `.pixel-inset` (`src/styles.css`) lleva
 * desde el principio un comentario diciendo que es el estilo para «huecos y
 * campos de texto» y nunca se había usado como tal.
 */

interface PixelFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  /** Texto de apoyo bajo el campo. Se enlaza con `aria-describedby`. */
  hint?: React.ReactNode;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

export const PixelField: React.FC<PixelFieldProps> = ({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  hint,
  autoFocus = false,
  onSubmit,
}) => {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-[8px] tracking-[0.2em] text-slate-400 uppercase">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="pixel-inset w-full border-slate-700 bg-slate-950 px-2 py-2 text-[10px] tracking-[0.15em] text-white uppercase placeholder:text-slate-600"
      />
      {hint && (
        <p id={hintId} className="text-[8px] leading-relaxed text-amber-300">
          {hint}
        </p>
      )}
    </div>
  );
};

interface PixelLevelProps {
  label: string;
  /** Entero de 0 a `steps`. */
  value: number;
  onChange: (value: number) => void;
  steps?: number;
  /** Cómo se lee el valor en voz alta. */
  format?: (value: number, steps: number) => string;
}

/**
 * Nivel en bloques: el mando de volumen.
 *
 * Es un `role="slider"` de verdad —flechas, Inicio y Fin— pero **no** un
 * `<input type="range">`: ese control no se puede vestir en un lenguaje visual
 * cuya primera regla es que nada sea redondeado ni difuminado, y esquivarlo
 * exige una pila de pseudoelementos con prefijo por navegador. Una fila de
 * bloques es lo que un juego de 8 bits usaría, se opera igual y además se
 * serializa y se prueba como un entero.
 */
export const PixelLevel: React.FC<PixelLevelProps> = ({
  label,
  value,
  onChange,
  steps = 10,
  format,
}) => {
  const clamp = (n: number) => Math.max(0, Math.min(steps, n));

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -1
          : 0;
    if (delta !== 0) {
      e.preventDefault();
      onChange(clamp(value + delta));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      onChange(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(steps);
    }
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[8px] tracking-[0.2em] text-slate-400 uppercase">{label}</span>
        <span className="font-mono text-[8px] text-slate-300">
          {format ? format(value, steps) : `${Math.round((value / steps) * 100)}%`}
        </span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={steps}
        aria-valuenow={value}
        aria-valuetext={format ? format(value, steps) : undefined}
        onKeyDown={onKeyDown}
        className="pixel-inset flex gap-1 border-slate-700 bg-slate-950 p-1.5"
      >
        {Array.from({ length: steps }, (_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => onChange(i + 1)}
            className={`h-4 flex-1 cursor-pointer ${
              i < value ? 'bg-cyan-400' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
