import { describe, expect, it } from 'vitest';
import type { Projectile, ProjectileType, WeaponType } from '../../types';
import { heldVisual, projectileVisual } from './weapons';
import { AIM_STEPS, bakeStep, isCardinal, stepAngle, stepVector } from '../data/aim';
import { PROJECTILES } from '../data/projectiles';
import { MAX_LEVEL, WEAPONS } from '../data/weapons';
import { spawnProjectile } from '../weapons';
import { createPlayer } from '../player';

/**
 * Que las armas y sus efectos apunten a donde apuntan.
 *
 * Estos invariantes son el criterio de aceptación de la inclinación, y cada uno cubre un fallo
 * que estaba **enviado y era invisible** para los tests que había:
 *
 * - el identificador de horneado no llevaba la orientación, así que las cuatro del cepillo
 *   compartían un lienzo y solo se veía la primera;
 * - el arma «apuntando arriba» apuntaba abajo, porque el giro era el contrario;
 * - en vertical el dibujo salía girado noventa grados respecto a la caja con la que dañaba;
 * - y la flecha, la broca y la guadaña no se orientaban en absoluto.
 *
 * Ninguno mira una forma concreta: miran propiedades que cualquier dibujo con punta cumple, así
 * que siguen valiendo cuando el arte cambie.
 */

/** Las armas del jugador cuyo proyectil se inclina, con el tipo que sueltan. */
const ORIENTING: readonly { weapon: WeaponType; type: ProjectileType }[] = [
  { weapon: 'normal', type: 'drill' },
  { weapon: 'laser', type: 'laser' },
  { weapon: 'floss', type: 'floss' },
  { weapon: 'toothbrush', type: 'sword' },
  { weapon: 'bow', type: 'arrow' },
  { weapon: 'scythe', type: 'reap' },
];

const shoot = (weapon: WeaponType, level: number, step: number): Projectile[] => {
  const player = createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' });
  player.weapon = weapon;
  player.weaponLevel = level;
  const aim = stepVector(step);
  const shots: Projectile[] = [];
  spawnProjectile(shots, 100, 100, aim.x, aim.y, 'player', weapon, player);
  return shots;
};

// --- Medidas sobre el dibujo ------------------------------------------------

const pixels = (rows: readonly string[]): { x: number; y: number }[] => {
  const out: { x: number; y: number }[] = [];
  rows.forEach((row, y) => Array.from(row).forEach((ch, x) => ch !== '.' && out.push({ x, y })));
  return out;
};

/**
 * El eje del dibujo y lo alargado que es, por el segundo momento de sus píxeles.
 *
 * Es la manera de comprobar que un dibujo apunta a donde debe **sin saber qué forma tiene**. La
 * alternativa —«el píxel más extremo en la dirección de vuelo está en la punta»— no sirve: el
 * rayo es ancho por delante y afilado por detrás, y la flecha justo al revés, así que haría falta
 * una tabla de signos por tipo, y una tabla puede estar mal.
 */
const principal = (rows: readonly string[]): { angle: number; elongation: number } => {
  const points = pixels(rows);
  const n = points.length || 1;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }

  // Autovalores de la matriz de covarianza, que son las varianzas en los dos ejes propios.
  const mean = (sxx + syy) / 2;
  const spread = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
  return {
    angle: 0.5 * Math.atan2(2 * sxy, sxx - syy),
    elongation: Math.sqrt((mean + spread) / Math.max(1e-9, mean - spread)),
  };
};

/** La diferencia entre dos ángulos de eje, en grados. Un eje se repite cada 180°. */
const axisGap = (a: number, b: number): number => {
  const half = Math.PI;
  const diff = Math.abs(((a - b) % half) + half) % half;
  return (Math.min(diff, half - diff) * 180) / Math.PI;
};

describe('orientación de proyectiles', () => {
  /**
   * El fallo que explicaba el síntoma: la orientación se calculaba y se tiraba.
   *
   * `bake` cachea por identificador y por nada más, y el identificador no llevaba la orientación,
   * así que las cuatro del cepillo compartían un solo lienzo: **la primera dirección en la que
   * golpeabas era el dibujo que veías para las cuatro**. Ningún test lo veía porque todos miraban
   * lo que devuelve la memoria interna, que sí distinguía.
   *
   * El invariante que tiene que cumplir toda la capa de dibujado: mismo identificador, mismo
   * dibujo.
   */
  it('el mismo identificador de horneado siempre da el mismo dibujo', () => {
    const seen = new Map<string, { rows: string; from: string }>();

    for (const { weapon } of ORIENTING) {
      for (const level of [1, MAX_LEVEL]) {
        for (let step = 0; step < AIM_STEPS; step++) {
          for (const proj of shoot(weapon, level, step)) {
            const { bakeId, def } = projectileVisual(proj);
            const rows = def.rows.join('\n');
            const previous = seen.get(bakeId);
            const from = `${weapon} nivel ${level} paso ${step}`;

            if (previous) {
              expect(
                rows,
                `«${bakeId}» se hornea igual para ${previous.from} y para ${from}, pero el ` +
                  'dibujo es distinto: el segundo nunca se llega a ver'
              ).toBe(previous.rows);
            } else {
              seen.set(bakeId, { rows, from });
            }
          }
        }
      }
    }
  });

  /**
   * El dibujo y la caja con la que daña tienen que medir lo mismo, sin margen.
   *
   * Apuntando en vertical la caja del cepillo medía 56×24 y el dibujo salía 24×56: el arte estaba
   * girado noventa grados respecto a lo que golpeaba. Se comprueba pasando por el **código real**
   * de generación, no por medidas escritas en el test, que es lo que dejaría volver el fallo por
   * la puerta de atrás.
   */
  it('el dibujo mide lo que la caja de golpe', () => {
    for (const { weapon } of ORIENTING) {
      for (const level of [1, 3, MAX_LEVEL]) {
        for (let step = 0; step < AIM_STEPS; step++) {
          for (const proj of shoot(weapon, level, step)) {
            const { def } = projectileVisual(proj);
            expect([def.w, def.h], `${weapon} nivel ${level} en el paso ${step}`).toEqual([
              Math.round(proj.w),
              Math.round(proj.h),
            ]);
          }
        }
      }
    }
  });

  /**
   * El invariante fuerte: **el dibujo está inclinado al ángulo al que se apunta**.
   *
   * Se mide el eje propio de los píxeles y se compara con el ángulo que le toca a la hoja: el del
   * vuelo si el dibujo va en el sentido del disparo, y el perpendicular si es un barrido, que
   * cruza por delante. Un giro al revés, un dibujo que no gira o un dibujo girado respecto a su
   * caja fallan todos aquí.
   *
   * Se mide sobre el paso **horneado**, porque el espejado lo hace `blit` al pintar y no está en
   * la trama; que espejar dé de verdad la dirección pedida lo fija `data/aim.test.ts`.
   */
  it('el eje del dibujo es el ángulo al que se apunta', () => {
    for (const { weapon, type } of ORIENTING) {
      const frame = PROJECTILES[type].blade;
      if (!frame) continue;

      // El rayo es casi cuadrado, y en una forma poco alargada el eje propio no significa nada.
      const reference = principal(projectileVisual(shoot(weapon, MAX_LEVEL, 0)[0]).def.rows);
      if (reference.elongation < 1.5) continue;

      for (let step = 0; step < AIM_STEPS; step++) {
        const proj = shoot(weapon, MAX_LEVEL, step)[0];
        const { def } = projectileVisual(proj);
        const measured = principal(def.rows);

        const baked = bakeStep(proj.aimStep ?? 0, proj.facing).step;
        // Un barrido lleva el largo en tangencial: noventa grados sobre la dirección de apuntado.
        const wanted = stepAngle(baked) + (frame === 'across' ? Math.PI / 2 : 0);

        expect(
          axisGap(measured.angle, wanted),
          `el eje de ${weapon} en el paso ${step} (horneado ${baked})`
        ).toBeLessThan(15);

        expect(
          measured.elongation / reference.elongation,
          `lo alargado que se ve ${weapon} en el paso ${step}`
        ).toBeGreaterThan(0.7);
      }
    }
  });

  /**
   * Cuatro direcciones rectas, cuatro dibujos distintos.
   *
   * La flecha, la broca y la guadaña no se orientaban en absoluto: una flecha disparada a la
   * izquierda se dibujaba apuntando a la derecha, y hacia abajo apuntando hacia arriba. El
   * espejado cuenta como dibujo distinto, porque espejar sí cambia lo que se ve.
   */
  it('cada dirección recta se ve distinta de las otras tres', () => {
    for (const { weapon } of ORIENTING) {
      const looks = [0, 4, 8, 12].map((step) => {
        const { def, flip } = projectileVisual(shoot(weapon, 1, step)[0]);
        return { step, look: `${flip}\n${def.rows.join('\n')}` };
      });

      for (let i = 0; i < looks.length; i++) {
        for (let j = i + 1; j < looks.length; j++) {
          expect(
            looks[i].look === looks[j].look,
            `${weapon} se ve igual en el paso ${looks[i].step} que en el ${looks[j].step}`
          ).toBe(false);
        }
      }
    }
  });

  /**
   * Un barrido tiene un canto útil, y tiene que mirar al lado correcto en los dieciséis pasos.
   *
   * Es lo que separa un barrido bien orientado de uno girado del revés, y no se ve en una captura:
   * a este tamaño el rayado de las cerdas y el filo brillante son cuatro píxeles y no hay manera
   * de decir de qué lado están mirando una imagen. Medido, es inequívoco.
   *
   * Las cerdas del cepillo salen **hacia fuera**, porque son las que barren. El filo de la guadaña
   * va por el canto **interior**, que es el que corta: son los dos sentidos opuestos, y que cada
   * uno esté en el suyo en todos los pasos es lo que dice que el marco tangencial no se ha
   * invertido por el camino.
   */
  it('el canto útil de un barrido mira a donde le toca', () => {
    const cases = [
      { weapon: 'toothbrush' as WeaponType, outward: true, what: 'las cerdas del cepillo' },
      { weapon: 'scythe' as WeaponType, outward: false, what: 'el filo de la guadaña' },
    ];

    for (const { weapon, outward, what } of cases) {
      for (let step = 0; step < AIM_STEPS; step++) {
        const proj = shoot(weapon, MAX_LEVEL, step)[0];
        const { def } = projectileVisual(proj);

        const body = pixels(def.rows);
        const bright = pixels(def.rows.map((row) => row.replace(/[^C]/g, '.')));
        expect(bright.length, `${what} en el paso ${step}`).toBeGreaterThan(0);

        const mean = (points: { x: number; y: number }[], axis: 'x' | 'y') =>
          points.reduce((s, p) => s + p[axis], 0) / points.length;

        // El paso horneado, que es el que está dibujado; el espejado lo hace `blit`.
        const aim = stepVector(bakeStep(step, proj.facing).step);
        const reach =
          (mean(bright, 'x') - mean(body, 'x')) * aim.x +
          (mean(bright, 'y') - mean(body, 'y')) * aim.y;

        if (outward) expect(reach, `${what} en el paso ${step}`).toBeGreaterThan(0);
        else expect(reach, `${what} en el paso ${step}`).toBeLessThan(0);
      }
    }
  });

  /**
   * Qué se orienta y qué no, tipo por tipo.
   *
   * Esto es una **caracterización**, y conviene decir por qué no es una derivación. Intenté
   * deducirlo del propio dibujo —«si la forma es alargada, tiene que declarar su marco»— y no se
   * sostiene: el mortero lleva la cola hacia arriba y es asimétrico, pero **a propósito** no se
   * orienta, porque va en parábola y su cola apunta al cielo pase lo que pase. Si se orienta o no
   * es una decisión de diseño, no una propiedad medible del dibujo, y un umbral afinado hasta que
   * pasara parecería una red de seguridad sin serlo.
   *
   * Lo que sí da esta lista: añadir un tipo obliga a decidirlo —el `Record` ya obliga a que el
   * campo exista— y **cambiarlo sale en el diff**. La flecha y la guadaña entraron en el union y
   * en la tabla de conductas pero no en la orientación, y salían siempre apuntando a la derecha
   * sin que nada avisara.
   */
  it('está decidido, tipo por tipo, si se orienta y cómo', () => {
    const declared = Object.fromEntries(
      (Object.keys(PROJECTILES) as ProjectileType[]).map((type) => [type, PROJECTILES[type].blade])
    );

    expect(declared).toEqual({
      // En el sentido del vuelo: tienen punta, cola o filo, y se ven distintos por delante.
      laser: 'along',
      wave: 'along',
      floss: 'along',
      arrow: 'along',
      drill: 'along',
      // Cruzando por delante: son barridos, no disparos.
      sword: 'across',
      reap: 'across',
      // Y los que se ven igual desde cualquier ángulo, o que se apoyan en la gravedad y no en el
      // apuntado.
      bullet: null,
      mortar: null,
      acid: null,
      sludge: null,
      judgment_orb: null,
      flask: null,
      burst: null,
    });
  });
});

describe('orientación del arma en mano', () => {
  /**
   * Apuntando hacia arriba, la punta tiene que quedar **sobre** el mango.
   *
   * `rotate90` gira en sentido horario, así que girar una vez un arma que apunta a la derecha la
   * deja apuntando al suelo; y luego se colocaba encima del puño. Quedaba el mango arriba y el
   * filo en la mano. El test que había solo comprobaba que el ancho y el alto se intercambiaran,
   * y eso se cumple girando en cualquiera de los dos sentidos.
   *
   * Se comprueba en los dieciséis pasos: el arma se extiende **desde el puño hacia donde se
   * apunta**, así que el centro de masa del dibujo tiene que caer en esa dirección respecto al
   * mango.
   */
  it('el arma se extiende desde el puño hacia donde se apunta', () => {
    for (const weapon of WEAPONS) {
      for (let step = 0; step < AIM_STEPS; step++) {
        const { def, px, py } = heldVisual(weapon, step);
        const points = pixels(def.rows);
        const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const my = points.reduce((s, p) => s + p.y, 0) / points.length;

        // El paso horneado, que es el que de verdad está dibujado en la trama.
        const baked = bakeStep(step).step;
        const aim = stepVector(baked);
        const reach = (mx - px) * aim.x + (my - py) * aim.y;

        expect(reach, `el arma «${weapon}» en el paso ${step}`).toBeGreaterThan(0);
      }
    }
  });

  it('los cuatro ejes siguen siendo exactos', () => {
    for (const weapon of WEAPONS) {
      for (const step of [0, 4, 8, 12]) {
        expect(isCardinal(step)).toBe(true);
        const { def } = heldVisual(weapon, step);
        // Un giro de noventa grados intercambia las medidas sin inventarse píxeles.
        const side = heldVisual(weapon, 0).def;
        const swapped = step % 8 === 0;
        expect([def.w, def.h], `«${weapon}» en el paso ${step}`).toEqual(
          swapped ? [side.w, side.h] : [side.h, side.w]
        );
      }
    }
  });

  it('cada inclinación es un dibujo distinto', () => {
    for (const weapon of WEAPONS) {
      const looks = new Set<string>();
      for (let step = 0; step < AIM_STEPS; step++) {
        looks.add(heldVisual(weapon, step).def.rows.join('\n'));
      }
      // Nueve pasos horneados, nueve dibujos: los otros siete salen espejados de estos.
      expect(looks.size, `las inclinaciones de «${weapon}»`).toBe(9);
    }
  });

  it('el mango cae dentro del dibujo, que es lo que lo ancla al puño', () => {
    for (const weapon of WEAPONS) {
      for (let step = 0; step < AIM_STEPS; step++) {
        const { def, px, py } = heldVisual(weapon, step);
        expect(px, `el mango de «${weapon}» en el paso ${step}`).toBeGreaterThanOrEqual(-1);
        expect(px).toBeLessThanOrEqual(def.w + 1);
        expect(py).toBeGreaterThanOrEqual(-1);
        expect(py).toBeLessThanOrEqual(def.h + 1);
      }
    }
  });
});
