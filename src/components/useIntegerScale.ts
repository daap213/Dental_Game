import { useLayoutEffect, useRef, useState } from 'react';
import { scaledSize, type ScaledSize } from './scale';

/**
 * Mide el hueco disponible y devuelve el tamaño del lienzo en escala entera.
 *
 * Hermano de `useFitScale`, pero al contrario: aquel encoge el contenido con
 * `transform` para que quepa, y este agranda el lienzo en múltiplos exactos.
 * Se mide con `clientWidth/clientHeight` del contenedor, que no se ve afectado
 * por el tamaño que le demos al lienzo hijo, así que no hay realimentación.
 */
export const useIntegerScale = <C extends HTMLElement>(baseW: number, baseH: number) => {
  const containerRef = useRef<C>(null);
  const [size, setSize] = useState<ScaledSize>(() => ({
    scale: 1,
    width: baseW,
    height: baseH,
  }));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const next = scaledSize(container.clientWidth, container.clientHeight, baseW, baseH);
      setSize((prev) =>
        prev.scale === next.scale && prev.width === next.width && prev.height === next.height
          ? prev
          : next
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [baseW, baseH]);

  return { containerRef, ...size };
};
