import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Encoge el contenido lo justo para que quepa en su contenedor, en vez de
 * dejar que aparezca scroll.
 *
 * Devuelve un factor **nunca mayor que 1**: mientras el diseño responsive
 * quepa por sí solo el factor es 1 y esto no hace nada. Solo entra en juego
 * en ventanas bajas, donde reduce la escala en lugar de recortar contenido.
 *
 * Se mide con `offsetWidth/offsetHeight`, que son medidas de maquetación y
 * no se ven afectadas por `transform`. Escalar no cambia lo medido, así que
 * no hay realimentación entre medida y escala.
 */
export const useFitScale = <C extends HTMLElement, T extends HTMLElement>() => {
  const containerRef = useRef<C>(null);
  const contentRef = useRef<T>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const availableW = container.clientWidth;
      const availableH = container.clientHeight;
      const naturalW = content.offsetWidth;
      const naturalH = content.offsetHeight;
      if (!naturalW || !naturalH || !availableW || !availableH) return;

      setScale(Math.min(1, availableW / naturalW, availableH / naturalH));
    };

    measure();

    // El contenido cambia de alto al traducir textos,
    // así que se observan los dos elementos y no solo la ventana.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { containerRef, contentRef, scale };
};
