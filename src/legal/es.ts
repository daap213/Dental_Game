import { LEGAL_LINKS } from './links';
import {
  BRAND,
  CONTACT_EMAIL,
  JURISDICTION_CITY,
  JURISDICTION_COUNTRY,
  LEGAL_UPDATED,
  SITE_DOMAIN,
  SITE_NAME,
} from './identity';
import type { LegalPack } from './types';

export const legalEs: LegalPack = {
  terms: {
    id: 'terms',
    title: 'Aviso legal y condiciones de uso',
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: 'who',
        title: 'Quién publica este juego',
        blocks: [
          {
            kind: 'p',
            spans: [
              `${SITE_NAME} es un proyecto publicado por `,
              { strong: BRAND },
              `, marca personal sin forma societaria, desde ${JURISDICTION_COUNTRY}. Puedes escribir a `,
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              ' para cualquier asunto relacionado con estas condiciones.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `El juego se distribuye únicamente en ${SITE_DOMAIN}. Cualquier copia alojada en otro sitio no está autorizada y no depende de nosotros.`,
            ],
          },
        ],
      },
      {
        id: 'object',
        title: 'Qué es y qué no es',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Es un videojuego gratuito que se ejecuta entero en tu navegador. No hay registro, ni cuentas, ni pagos, ni compras dentro del juego, ni publicidad, ni suscripciones.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'No se vende nada y no se pide nada a cambio de jugar. Tampoco existe la obligación de mantenerlo disponible para siempre.',
            ],
          },
        ],
      },
      {
        id: 'acceptance',
        title: 'Aceptación',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Al acceder al sitio y jugar aceptas estas condiciones. Si no estás de acuerdo con alguna, la solución es sencilla: no uses el juego.',
            ],
          },
        ],
      },
      {
        id: 'use',
        title: 'Uso permitido',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Puedes jugar cuanto quieras, para uso personal y no comercial, y compartir el enlace con quien te apetezca.',
            ],
          },
          { kind: 'p', spans: ['No está permitido:'] },
          {
            kind: 'ul',
            items: [
              ['descompilar, desensamblar o hacer ingeniería inversa del juego;'],
              ['extraer, copiar o reutilizar su código, sus sprites o su música;'],
              ['alojar una copia propia, ni siquiera sin ánimo de lucro;'],
              ['incrustarlo en otro sitio dentro de un marco sin permiso escrito;'],
              ['usarlo con fines comerciales, ni cobrar por el acceso;'],
              ['interferir con el servicio o intentar degradarlo.'],
            ],
          },
        ],
      },
      {
        id: 'ip',
        title: 'Propiedad intelectual',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Todo el arte del juego es ',
              { strong: 'procedural y original' },
              ': no hay ni un solo fichero de imagen. Cada diente, cada enemigo, cada fondo y cada efecto los dibuja nuestro propio código en tiempo real, y todo el sonido se sintetiza en el navegador.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `El código fuente, el diseño de niveles, los textos, los personajes y el audio son obra de ${BRAND}. `,
              { strong: 'Todos los derechos reservados.' },
              ' La única excepción es el software de terceros y la tipografía, que conservan sus propias licencias y están detallados en la pestaña de licencias.',
            ],
          },
          {
            kind: 'p',
            spans: [
              { strong: 'Jugar no otorga ninguna licencia' },
              ' sobre el código ni sobre el arte.',
            ],
          },
        ],
      },
      {
        id: 'ai',
        title: 'Uso de inteligencia artificial',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Parte del código y del arte de este proyecto se produjo con asistencia de herramientas de IA generativa, siempre bajo dirección y revisión humana. La obra resultante se reivindica como propia y queda amparada por el apartado anterior.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'El juego, tal y como se publica hoy, ',
              { strong: 'no ejecuta ninguna IA' },
              ': no hay llamadas a ningún servicio, ni durante la partida ni fuera de ella.',
            ],
          },
        ],
      },
      {
        id: 'parody',
        title: 'Esto no es consejo odontológico',
        blocks: [
          {
            kind: 'note',
            spans: [
              { strong: 'Es una parodia.' },
              ' Nada de lo que aparece en el juego es información sanitaria, diagnóstico ni tratamiento.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'El «Diagnóstico Médico» de la pantalla de derrota, los nombres de los enemigos (gingivitis, caries, sarro, absceso) y las «armas» (flúor, hilo dental, enjuague, cepillo) son humor, no odontología. Están exagerados, simplificados y, en muchos casos, directamente inventados.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'No tomes ninguna decisión sobre tu salud a partir de este juego. Para eso está tu dentista, que además existe.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `${BRAND} no tiene relación, patrocinio ni afiliación alguna con ninguna asociación odontológica, clínica, marca o producto dental real.`,
            ],
          },
        ],
      },
      {
        id: 'photosensitivity',
        title: 'Aviso de fotosensibilidad',
        blocks: [
          {
            kind: 'p',
            spans: [
              'El juego contiene destellos, parpadeos y, en las fases finales, efectos de distorsión rápidos. Un porcentaje muy pequeño de personas puede sufrir crisis epilépticas ante estímulos luminosos de este tipo.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Si notas mareo, desorientación, alteraciones de la visión o cualquier movimiento involuntario, deja de jugar y consulta a un profesional. El juego respeta la preferencia del sistema «reducir movimiento» en las pantallas animadas.',
            ],
          },
        ],
      },
      {
        id: 'age',
        title: 'Edad y público',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Apto para público general. Hay violencia fantástica contra criaturas no humanas —bacterias, caries y similares—, sin sangre realista, sin lenguaje ofensivo y sin contenido sexual.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'No está dirigido específicamente a menores. Como ',
              { strong: 'no se recoge ningún dato de nadie' },
              ', menores incluidos, no hay ningún mecanismo de consentimiento parental que aplicar. Aun así, se recomienda supervisión con los más pequeños.',
            ],
          },
        ],
      },
      {
        id: 'availability',
        title: 'Disponibilidad',
        blocks: [
          {
            kind: 'p',
            spans: [
              'El juego se ofrece «tal cual» y de forma gratuita. Puede interrumpirse, cambiar, perder funciones o retirarse en cualquier momento y sin aviso previo. No se garantiza continuidad, ni ausencia de errores, ni que se conserve ninguna partida.',
            ],
          },
        ],
      },
      {
        id: 'warranty',
        title: 'Garantías y responsabilidad',
        blocks: [
          {
            kind: 'p',
            spans: [
              'En la máxima medida que permita la ley aplicable, el juego se ofrece sin garantías de ningún tipo, expresas o implícitas, incluidas las de comerciabilidad, adecuación a un fin concreto y ausencia de errores.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `${BRAND} no responde de daños indirectos, incidentales o consecuentes derivados del uso o de la imposibilidad de uso del juego, incluida la pérdida de datos guardados localmente en tu navegador.`,
            ],
          },
          {
            kind: 'p',
            spans: [
              'Nada de lo anterior limita los derechos que te correspondan como consumidor cuando la ley no permita limitarlos.',
            ],
          },
        ],
      },
      {
        id: 'links',
        title: 'Enlaces a terceros',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Los únicos enlaces externos del sitio apuntan a textos de licencia y a políticas de privacidad de terceros, y están en las pestañas de licencias y de privacidad. No controlamos su contenido ni respondemos de él.',
            ],
          },
        ],
      },
      {
        id: 'changes',
        title: 'Cambios en estas condiciones',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Estas condiciones pueden actualizarse. La versión vigente es siempre la publicada en esta página, con su fecha de última actualización arriba. Seguir jugando después de un cambio supone aceptarlo.',
            ],
          },
        ],
      },
      {
        id: 'law',
        title: 'Ley aplicable y jurisdicción',
        blocks: [
          {
            kind: 'p',
            spans: [
              `Estas condiciones se rigen por la legislación de la República del ${JURISDICTION_COUNTRY}. Para cualquier controversia, las partes se someten a los juzgados y tribunales de ${JURISDICTION_CITY}, ${JURISDICTION_COUNTRY}.`,
            ],
          },
          {
            kind: 'p',
            spans: [
              { strong: 'Salvedad para consumidores: ' },
              'si resides en la Unión Europea o en cualquier otro país cuya normativa te reconozca un fuero propio o una protección imperativa como consumidor, esa protección no se ve afectada por la cláusula anterior.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: 'Contacto',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Para dudas, avisos legales o solicitudes de licencia: ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'Política de privacidad',
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: 'summary',
        title: 'Resumen',
        blocks: [
          {
            kind: 'note',
            spans: [
              { strong: 'Este juego no recoge ningún dato personal.' },
              ' Sin cookies. Sin analítica. Sin cuentas. Sin publicidad. Nada de lo que haces sale de tu dispositivo.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'El resto de esta página explica por qué eso es literalmente cierto y cuál es la única excepción honesta: el servidor que te entrega la página.',
            ],
          },
        ],
      },
      {
        id: 'controller',
        title: 'Responsable',
        blocks: [
          {
            kind: 'p',
            spans: [
              { strong: BRAND },
              `, marca personal sin forma societaria, con sede en ${JURISDICTION_COUNTRY}. Contacto: `,
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
      {
        id: 'scope',
        title: 'Alcance',
        blocks: [
          {
            kind: 'p',
            spans: [
              `Esta política cubre el sitio ${SITE_DOMAIN} y el juego que se ejecuta en él. No cubre ningún otro sitio al que puedas llegar desde aquí.`,
            ],
          },
        ],
      },
      {
        id: 'nodata',
        title: 'Qué datos tratamos',
        blocks: [
          { kind: 'p', spans: ['Ninguno. En concreto, no tratamos:'] },
          {
            kind: 'ul',
            items: [
              ['nombre, correo electrónico ni ningún dato de contacto;'],
              ['cuentas de usuario, contraseñas ni identificadores de sesión;'],
              ['ubicación, ni aproximada ni precisa;'],
              ['identificadores publicitarios ni huella digital del dispositivo;'],
              ['perfiles de comportamiento ni decisiones automatizadas;'],
              ['datos de salud, pese a la temática del juego.'],
            ],
          },
          {
            kind: 'p',
            spans: [
              'El juego ',
              { strong: 'no tiene ni un solo campo de texto' },
              ': no hay forma de introducir información aunque quisieras.',
            ],
          },
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies',
        blocks: [
          {
            kind: 'p',
            spans: [
              'No usamos cookies. Ni propias, ni de terceros, ni técnicas, ni de ningún tipo.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Por eso ',
              { strong: 'no verás ningún banner de consentimiento' },
              ': no hay nada que consentir. Un banner aquí sería una afirmación falsa sobre nuestro propio sitio.',
            ],
          },
        ],
      },
      {
        id: 'local',
        title: 'Almacenamiento local',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Hoy el juego ',
              { strong: 'no guarda nada' },
              ' en tu navegador: ni almacenamiento local, ni de sesión, ni bases de datos. Al recargar la página, todo vuelve a empezar.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'En el futuro el juego podrá guardar, ',
              { strong: 'únicamente en tu dispositivo' },
              ', tus preferencias (idioma, dificultad, clase, equipamiento, control y sonido) y un apodo elegido por ti junto con tus puntuaciones.',
            ],
          },
          {
            kind: 'ul',
            items: [
              ['Esa información no se envía a ningún servidor y nosotros no podemos verla.'],
              [
                'No se usa para publicidad, ni para perfilarte, ni para nada que no sea recordar tu partida.',
              ],
              [
                'El apodo es un campo libre: ',
                { strong: 'no pongas tu nombre real' },
                ' ni nada que te identifique.',
              ],
              [
                'Podrás borrarlo desde el propio juego, o en cualquier momento limpiando los datos del sitio en tu navegador.',
              ],
            ],
          },
          {
            kind: 'p',
            spans: [
              'Al no salir del dispositivo y ser estrictamente necesario para prestar la funcionalidad que tú mismo has pedido, ese almacenamiento no requiere consentimiento previo. Aun así queda declarado aquí, que es lo que sí es obligatorio.',
            ],
          },
        ],
      },
      {
        id: 'hosting',
        title: 'Alojamiento',
        blocks: [
          {
            kind: 'p',
            spans: [
              'El sitio lo sirve ',
              { strong: 'Cloudflare Pages' },
              ' (Cloudflare, Inc.). Como cualquier servidor web del mundo, para poder entregarte la página y protegerla de abusos procesa datos de conexión: tu dirección IP, el navegador que usas y la hora de la petición.',
            ],
          },
          {
            kind: 'p',
            spans: [
              `Es el único tratamiento que ocurre de verdad, y por eso está aquí: sin esta sección, decir «no recogemos nada» sería falso. ${BRAND} no consulta esos registros, no los descarga y no tiene analítica activada de ningún tipo.`,
            ],
          },
          {
            kind: 'p',
            spans: [
              'La base jurídica es el interés legítimo en prestar y proteger el servicio. Puedes consultar la ',
              { link: 'política de privacidad de Cloudflare', href: LEGAL_LINKS.cloudflarePrivacy },
              '.',
            ],
          },
        ],
      },
      {
        id: 'thirdparty',
        title: 'Terceros',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Aparte del alojamiento, ',
              { strong: 'el juego no habla con nadie' },
              ': no hay analítica, ni anuncios, ni botones de redes sociales, ni mapas, ni vídeos incrustados, ni CDN externas.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'La tipografía se sirve desde nuestro propio dominio y no desde Google Fonts, precisamente para que cargar la página no revele tu IP a un tercero. El juego tampoco carga ninguna imagen: todo el arte lo dibuja el código en tu navegador.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Hubo una integración con un servicio de IA que enviaba tu puntuación a un tercero al morir. ',
              { strong: 'Fue retirada' },
              ', y con ella la única petición de red que salía del juego.',
            ],
          },
        ],
      },
      {
        id: 'transfers',
        title: 'Transferencias internacionales',
        blocks: [
          {
            kind: 'p',
            spans: [
              `El responsable está en ${JURISDICTION_COUNTRY}. La página se sirve desde la red de distribución de Cloudflare, así que puede entregarse desde un servidor cercano a ti en cualquier parte del mundo. No hay ningún dato tratado por nosotros que transferir.`,
            ],
          },
        ],
      },
      {
        id: 'retention',
        title: 'Conservación',
        blocks: [
          {
            kind: 'p',
            spans: [
              'No conservamos nada, porque no recogemos nada. Los registros técnicos del alojamiento los gestiona Cloudflare según su propia política. Lo que en el futuro se guarde en local vivirá en tu navegador hasta que tú lo borres.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        title: 'Tus derechos',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Tienes derecho de acceso, rectificación, eliminación, oposición, portabilidad, limitación del tratamiento y a no ser objeto de decisiones automatizadas, conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador y, si resides en la Unión Europea, al Reglamento General de Protección de Datos.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Puedes ejercerlos escribiendo a ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '. Te responderemos en el plazo legal. Con toda honestidad: como no tratamos datos que te identifiquen, lo normal será que no haya nada que localizar, y eso mismo es lo que te contestaremos.',
            ],
          },
        ],
      },
      {
        id: 'authority',
        title: 'Autoridad de control',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la ',
              {
                link: 'Superintendencia de Protección de Datos Personales del Ecuador',
                href: LEGAL_LINKS.dataAuthority,
              },
              '. Si resides en la Unión Europea, también ante la autoridad de control de tu país.',
            ],
          },
        ],
      },
      {
        id: 'minors',
        title: 'Menores',
        blocks: [
          {
            kind: 'p',
            spans: [
              'No recogemos datos de nadie, y por tanto tampoco de menores. No pedimos la edad porque no hay ningún tratamiento que dependa de ella.',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: 'Seguridad',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Todo el sitio se sirve por HTTPS. La mejor medida de seguridad de este proyecto, sin embargo, es estructural: ',
              { strong: 'no hay base de datos ni servidor de aplicación que comprometer' },
              '. El juego es un fichero estático que se ejecuta en tu navegador.',
            ],
          },
        ],
      },
      {
        id: 'changes',
        title: 'Cambios',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Si en el futuro el juego empieza a tratar datos —por ejemplo, si aparece una tabla de puntuaciones en línea—, esta política se actualizará antes de que eso ocurra y verás la nueva fecha arriba.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: 'Contacto',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Para cualquier cuestión de privacidad: ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
    ],
  },

  licenses: {
    id: 'licenses',
    title: 'Licencias y atribuciones',
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: 'own',
        title: 'Este juego',
        blocks: [
          {
            kind: 'p',
            spans: [
              `${SITE_NAME} y todo su contenido original son propiedad de ${BRAND}. `,
              { strong: 'Todos los derechos reservados.' },
            ],
          },
          {
            kind: 'p',
            spans: [
              'El código y el arte no son de código abierto y no son reutilizables. Para cualquier uso distinto de jugar, escribe a ',
              { link: CONTACT_EMAIL, href: LEGAL_LINKS.contact },
              '.',
            ],
          },
        ],
      },
      {
        id: 'assets',
        title: 'Sin recursos de terceros',
        blocks: [
          {
            kind: 'note',
            spans: [
              'No se distribuye ',
              { strong: 'ninguna imagen ni ningún audio de terceros' },
              '. Todo el arte lo dibuja el código y todo el sonido se sintetiza en el navegador.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Eso elimina casi por completo la superficie habitual de licencias en un videojuego. Lo único que se sirve como fichero binario son las dos variantes de la tipografía, y a ellas se dedica el apartado siguiente.',
            ],
          },
        ],
      },
      {
        id: 'font',
        title: 'Tipografía: Press Start 2P',
        blocks: [
          {
            kind: 'p',
            spans: [
              'La tipografía del juego es Press Start 2P, distribuida bajo la ',
              { strong: 'SIL Open Font License, versión 1.1' },
              '.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P"',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Este sitio redistribuye los ficheros de la fuente a cada visitante, así que la licencia exige que su texto íntegro los acompañe: ',
              { link: 'texto completo de la OFL', href: LEGAL_LINKS.ofl },
              ' — ',
              { link: 'información sobre la licencia', href: LEGAL_LINKS.oflInfo },
              '.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'La fuente se redistribuye sin modificar, no se vende por separado y no se usa su Reserved Font Name para ninguna versión modificada.',
            ],
          },
        ],
      },
      {
        id: 'software',
        title: 'Software de terceros',
        blocks: [
          {
            kind: 'p',
            spans: [
              'El juego incluye las siguientes bibliotecas de código abierto. Sus licencias exigen que el aviso de copyright viaje con las copias distribuidas, y eso es lo que hace esta tabla.',
            ],
          },
          {
            kind: 'p',
            spans: [
              'Los textos completos de estas licencias están en ',
              { link: 'THIRD-PARTY.txt', href: LEGAL_LINKS.thirdParty },
              '.',
            ],
          },
        ],
      },
      {
        id: 'build',
        title: 'Herramientas de desarrollo',
        blocks: [
          {
            kind: 'p',
            spans: [
              'El proyecto se construye con Vite, TypeScript, ESLint, Prettier y Vitest, todas bajo licencia MIT. No se distribuyen con el juego y no imponen obligación de aviso, así que no se listan una a una: una lista así solo se queda desactualizada.',
            ],
          },
        ],
      },
      {
        id: 'ai',
        title: 'Asistencia de IA',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Parte del desarrollo se realizó con herramientas de IA generativa, cuyo resultado fue revisado y adaptado a mano. El juego publicado no ejecuta ninguna IA ni contacta con ningún servicio.',
            ],
          },
        ],
      },
      {
        id: 'trademarks',
        title: 'Marcas',
        blocks: [
          {
            kind: 'p',
            spans: [
              'Los nombres y marcas que puedan mencionarse pertenecen a sus respectivos titulares. Su mención es meramente descriptiva y no implica afiliación ni respaldo alguno.',
            ],
          },
        ],
      },
    ],
  },
};
