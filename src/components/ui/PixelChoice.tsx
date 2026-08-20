import React, { useRef } from 'react';
import { PixelButton } from './Pixel';

/**
 * Filas de opciones: pestañas y grupos de selección.
 *
 * Las dos se pintaban a mano seis veces —los dos tab bars de la base de datos y
 * la pantalla legal son idénticos carácter a carácter, y el menú tenía cuatro
 * grupos de opción con la misma forma—.
 *
 * **Comparten el renderizador pero no el componente**, y eso es deliberado.
 * Pintan igual, pero sus contratos de accesibilidad son incompatibles: unas
 * pestañas son `tablist/tab/aria-selected` y gobiernan un panel; un grupo de
 * opción es `radiogroup/radio/aria-checked` y fija un valor. Fundirlas en una
 * sola primitiva obliga a que una de las dos salga con los papeles cambiados,
 * que es peor que la duplicación que vienen a quitar.
 */

export interface ChoiceOption<T extends string> {
  readonly id: T;
  readonly label: React.ReactNode;
  readonly icon?: React.ReactNode;
  /** Clases de color al estar elegida. Presentación, nunca dato de juego. */
  readonly accent?: string;
  readonly title?: string;
}

interface ChoiceRowProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  value: T;
  onSelect: (id: T) => void;
  label: string;
  className?: string;
  buttonClassName?: string;
  marker?: boolean;
  /** `tablist` o `radiogroup`; decide también los papeles de cada botón. */
  kind: 'tabs' | 'radio';
}

/**
 * El teclado: flechas mueven entre opciones y solo la elegida es tabulable
 * («roving tabindex»). Sin esto, un grupo de nueve armas son nueve paradas de
 * tabulador, que es justo lo que las flechas existen para evitar.
 */
const ChoiceRow = <T extends string>({
  options,
  value,
  onSelect,
  label,
  className = '',
  buttonClassName = '',
  marker = false,
  kind,
}: ChoiceRowProps<T>) => {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const move = (from: T, step: number) => {
    const index = options.findIndex((o) => o.id === from);
    if (index < 0) return;
    const next = options[(index + step + options.length) % options.length];
    onSelect(next.id);
    refs.current.get(next.id)?.focus();
  };

  const onKeyDown = (id: T) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(id, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(id, -1);
    }
  };

  return (
    <div
      role={kind === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={label}
      className={className || 'flex flex-wrap gap-1.5'}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <PixelButton
            key={option.id}
            ref={(node) => {
              if (node) refs.current.set(option.id, node);
              else refs.current.delete(option.id);
            }}
            role={kind === 'tabs' ? 'tab' : 'radio'}
            aria-selected={kind === 'tabs' ? selected : undefined}
            aria-checked={kind === 'radio' ? selected : undefined}
            tabIndex={selected ? 0 : -1}
            onKeyDown={onKeyDown(option.id)}
            onClick={() => onSelect(option.id)}
            active={selected}
            activeClass={option.accent}
            marker={marker}
            title={option.title}
            className={buttonClassName || 'flex items-center gap-1.5 px-2 py-1.5'}
          >
            {option.icon}
            {option.label}
          </PixelButton>
        );
      })}
    </div>
  );
};

/** Pestañas que gobiernan un panel. */
export const PixelTabs = <T extends string>(props: Omit<ChoiceRowProps<T>, 'kind'>) => (
  <ChoiceRow {...props} kind="tabs" />
);

/** Grupo de opción excluyente: elige un valor, no cambia de panel. */
export const PixelSegmented = <T extends string>(props: Omit<ChoiceRowProps<T>, 'kind'>) => (
  <ChoiceRow {...props} kind="radio" />
);
