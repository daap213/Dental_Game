import React, { useEffect, useRef } from 'react';

/**
 * Capa modal con las tres cosas que las pantallas del juego venían haciendo a
 * medias, cada una por su cuenta: cerrar con Escape, llevar el foco dentro al
 * abrir y devolverlo al cerrar, y atrapar el tabulador.
 *
 * **Convención de teclas, y conviene que quede escrita**: la interfaz escucha
 * `e.key` y el juego escucha `e.code`. `e.key` es el carácter —lo que el
 * usuario cree que pulsa, y `'Escape'` es igual en todos los teclados—;
 * `e.code` es la posición física, que es lo que un juego necesita para que WASD
 * siga siendo WASD en AZERTY. Mezclarlos es la fuente clásica de teclas que
 * funcionan en un teclado y no en otro.
 */

interface PixelDialogProps {
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Al pulsar fuera. Se desactiva en diálogos que exigen una respuesta. */
  closeOnBackdrop?: boolean;
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export const PixelDialog: React.FC<PixelDialogProps> = ({
  onClose,
  label,
  children,
  className = '',
  closeOnBackdrop = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Se recuerda quién tenía el foco para devolvérselo: si no, al cerrar el
    // foco vuelve al `<body>` y el siguiente tabulador empieza por el principio
    // de la página en vez de por el botón que abrió esto.
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;

      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="pixel-crt absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`pixel-frame pixel-dither w-full max-w-sm border-slate-500 bg-slate-800 p-4 ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
