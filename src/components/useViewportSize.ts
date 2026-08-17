import { useLayoutEffect, useRef, useState } from 'react';
import { viewportSize, type ViewportSize } from './scale';

const same = (a: ViewportSize, b: ViewportSize) =>
  a.width === b.width && a.height === b.height && a.supersample === b.supersample;

/**
 * Mide el hueco disponible y devuelve el tamaño de la pantalla virtual.
 *
 * Se mide con `clientWidth/clientHeight` del contenedor, que no dependen del
 * tamaño que le demos al hijo, así que no hay realimentación entre medir y
 * escalar.
 */
export const useViewportSize = <C extends HTMLElement>(baseW: number, baseH: number) => {
  const containerRef = useRef<C>(null);
  const [size, setSize] = useState<ViewportSize>(() => ({
    scale: 1,
    width: baseW,
    height: baseH,
    supersample: 1,
  }));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const next = viewportSize(
        container.clientWidth,
        container.clientHeight,
        baseW,
        baseH,
        window.devicePixelRatio
      );
      setSize((prev) => (same(prev, next) ? prev : next));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    // El zoom del navegador cambia `devicePixelRatio` —y con él el multiplicador
    // del búfer— sin que el contenedor cambie de tamaño en píxeles CSS, así que
    // el ResizeObserver por sí solo no basta.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [baseW, baseH]);

  return { containerRef, ...size };
};
