/**
 * Los avisos de terceros que **llegan al navegador del jugador**.
 *
 * Vite borra los comentarios de licencia al empaquetar, así que sin esta tabla
 * el sitio distribuye código MIT, ISC y OFL sin ninguno de los avisos que esas
 * licencias exigen que viajen con las copias binarias.
 *
 * Escrita a mano y fijada por `attributions.test.ts`, **no autogenerada desde
 * `node_modules`**: la detección automática de licencias falla justo en el caso
 * que hay aquí —el aviso doble ISC-con-MIT de lucide— y ataría la compilación al
 * árbol instalado.
 */

export interface Attribution {
  /** Clave exacta en `package.json`. Es la que empareja el test. */
  readonly pkg: string;
  /** Versión mayor, para mostrar. Un parche no cambia la licencia. */
  readonly version: string;
  /** Identificador SPDX. */
  readonly license: string;
  /** Aviso de copyright, literal del fichero LICENSE del paquete. */
  readonly copyright: string;
  readonly url: string;
  readonly licenseUrl: string;
  /** ¿Se le envían bytes de este paquete al visitante? */
  readonly redistributed: boolean;
  /**
   * Nota para quien mantenga esta tabla. **No se pinta en pantalla**: la página
   * legal es bilingüe y esto no lo está, así que renderizarlo metía español en
   * la versión inglesa. Nada de lo que dice falta en la página: el doble aviso
   * de lucide va dentro de `copyright`, y las condiciones de la fuente son un
   * párrafo propio de la sección `font` en los dos idiomas.
   */
  readonly devNote?: string;
}

export const ATTRIBUTIONS: readonly Attribution[] = [
  {
    pkg: 'react',
    version: '19',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    url: 'https://react.dev',
    licenseUrl: 'https://github.com/facebook/react/blob/main/LICENSE',
    redistributed: true,
  },
  {
    pkg: 'react-dom',
    version: '19',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    url: 'https://react.dev',
    licenseUrl: 'https://github.com/facebook/react/blob/main/LICENSE',
    redistributed: true,
  },
  {
    pkg: 'lucide-react',
    version: '0.562',
    license: 'ISC',
    copyright:
      'Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.',
    url: 'https://lucide.dev',
    licenseUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
    redistributed: true,
    devNote:
      'ISC con un bloque MIT para las porciones heredadas de Feather. Hay que reproducir los dos avisos, no solo el primero.',
  },
  {
    pkg: '@fontsource/press-start-2p',
    version: '5.3',
    license: 'OFL-1.1',
    // Literal, y el test lo fija carácter a carácter: es la obligación de la
    // cláusula 2 de la OFL, que es la única licencia aquí cuyos binarios —los
    // dos ficheros .woff/.woff2— se sirven a cada visitante.
    copyright:
      'Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P"',
    url: 'https://fonts.google.com/specimen/Press+Start+2P',
    licenseUrl: 'https://openfontlicense.org',
    redistributed: true,
    devNote:
      'Se redistribuye sin modificar, no se vende por separado y no se usa el Reserved Font Name para ninguna versión modificada.',
  },
  {
    pkg: 'tailwindcss',
    version: '4',
    license: 'MIT',
    copyright: 'Copyright (c) Tailwind Labs, Inc.',
    url: 'https://tailwindcss.com',
    licenseUrl: 'https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE',
    redistributed: true,
    devNote:
      'Es dependencia de desarrollo, pero su CSS generado sí se distribuye, así que el aviso va igual.',
  },
];
