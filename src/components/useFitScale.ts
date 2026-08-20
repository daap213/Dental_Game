import { useLayoutEffect, useState } from 'react';

/**
 * Encoge el contenido lo justo para que quepa en su contenedor, en vez de
 * dejar que aparezca scroll.
 *
 * Devuelve un factor **nunca mayor que 1**: mientras el diseño quepa por sí
 * solo el factor es 1 y esto no hace nada. Solo entra en juego en ventanas
 * bajas, donde reduce la escala en lugar de recortar contenido.
 *
 * Se mide con `offsetWidth/offsetHeight`, que son medidas de maquetación y
 * no se ven afectadas por `transform`. Escalar no cambia lo medido, así que
 * no hay realimentación entre medida y escala.
 *
 * **Esto no es diseño adaptable, y no debe usarse como tal.** Sirve para una
 * composición fija que se quiere ver entera —los créditos, el fin de partida—,
 * no para una pantalla con muchos paneles: encoger no recoloca nada, así que
 * una pantalla larga en un móvil no se reordena, se hace pequeña. El menú
 * principal lo usaba y por eso su tipografía de 7 px acababa en unos 4.
 */

/**
 * Por debajo de esto, encoger deja de ayudar: el texto se vuelve ilegible y lo
 * correcto pasa a ser desplazar. Sin suelo, el factor bajaba sin límite.
 */
export const MIN_FIT_SCALE = 0.55;

export const useFitScale = <C extends HTMLElement, T extends HTMLElement>() => {
  /**
   * Refs de callback y no de objeto, y los dos nodos en las dependencias.
   *
   * Con `useRef` y dependencias vacías, el efecto solo corría una vez: una
   * pantalla que desmonta su árbol y vuelve —el menú lo hacía al abrir la base
   * de datos— dejaba al observador midiendo nodos desconectados, que informan
   * de tamaño cero. `measure` salía por su propia guardia y la escala se
   * quedaba **congelada en el último valor**, sin forma de recuperarse.
   */
  const [container, containerRef] = useState<C | null>(null);
  const [content, contentRef] = useState<T | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (!container || !content) return;

    const measure = () => {
      const availableW = container.clientWidth;
      const availableH = container.clientHeight;
      const naturalW = content.offsetWidth;
      const naturalH = content.offsetHeight;
      if (!naturalW || !naturalH || !availableW || !availableH) return;

      const fit = Math.min(1, availableW / naturalW, availableH / naturalH);
      setScale(Math.max(MIN_FIT_SCALE, fit));
    };

    measure();

    // El contenido cambia de alto al traducir textos,
    // así que se observan los dos elementos y no solo la ventana.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [container, content]);

  return { containerRef, contentRef, scale };
};
