import { describe, expect, it } from 'vitest';
import type { Platform, Player, Projectile, ProjectileType } from '../types';
import { advanceProjectiles, type ProjectileWorld } from './projectiles';
import { PROJECTILES } from './data/projectiles';
import { projectileArt } from './render/sprites/masks/weapons';
import { GRAVITY, FIXED_STEP } from './data/physics';
import { HOMING_DAMAGE_THRESHOLD, TOOTHBRUSH } from './data/weapons';
import { createPlayer } from './player';

/**
 * El paso de simulación de los proyectiles.
 *
 * Vivía dentro de `GameCanvas.tsx` y **no tenía un solo test**, aunque de él dependen el
 * cuerpo a cuerpo, la parábola de los morteros y el guiado del jefe oculto. Esto es la red
 * que faltaba antes de tocar nada de eso.
 */

const player = (overrides: Partial<Player> = {}): Player =>
  Object.assign(createPlayer({ loadout: 'all', difficulty: 'normal', character: 'molar' }), {
    x: 100,
    y: 200,
    ...overrides,
  });

/** El mundo mínimo que el paso de proyectiles necesita: sin plataformas por defecto. */
const world = (p: Player, platforms: Platform[] = []): ProjectileWorld => ({
  player: p,
  platforms,
  particles: [],
  camera: { x: 0 },
  level: { levelWidth: 8000 },
});

const floor = (): Platform => ({
  type: 'platform',
  x: -1000,
  y: 390,
  w: 10000,
  h: 60,
  isGround: true,
});

const shot = (overrides: Partial<Projectile> = {}): Projectile => ({
  id: 'p1',
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  vx: 1,
  vy: 0,
  hp: 1,
  maxHp: 1,
  type: 'projectile',
  damage: 10,
  owner: 'player',
  lifeTime: 1,
  projectileType: 'bullet',
  hitIds: [],
  facing: 1,
  isGrounded: false,
  frameTimer: 0,
  color: '#ffffff',
  state: 0,
  ...overrides,
});

describe('paso de los proyectiles', () => {
  it('lo que vuela integra su velocidad', () => {
    const shots = [shot({ x: 10, y: 20, vx: 5, vy: -3 })];
    advanceProjectiles(shots, world(player()), FIXED_STEP);
    expect(shots[0].x).toBe(15);
    expect(shots[0].y).toBe(17);
  });

  it('el mortero cae, y la bala no', () => {
    const mortar = shot({ projectileType: 'mortar', vy: -10 });
    const bullet = shot({ projectileType: 'bullet', vy: -10 });
    advanceProjectiles([mortar, bullet], world(player()), FIXED_STEP);
    expect(mortar.vy).toBeCloseTo(-10 + GRAVITY * 0.5);
    expect(bullet.vy).toBe(-10);
  });

  /**
   * El charco se queda donde cayó. Es lo que hace que sea un charco y no una bala lenta.
   */
  it('el charco no se mueve', () => {
    const sludge = shot({ projectileType: 'sludge', x: 50, y: 60, vx: 9, vy: 9 });
    advanceProjectiles([sludge], world(player()), FIXED_STEP);
    expect(sludge.x).toBe(50);
    expect(sludge.y).toBe(60);
  });

  /**
   * Los golpes cuerpo a cuerpo **no** integran velocidad: su `vx`/`vy` es la dirección de
   * apuntado y la caja se recoloca sobre el jugador en cada paso. Es lo que hace que el
   * golpe siga acompañando al personaje aunque se mueva o dé un impulso a mitad del
   * mandoble.
   */
  it('el golpe acompaña al jugador, no vuela', () => {
    const p = player({ x: 300, y: 100 });
    const sword = shot({ projectileType: 'sword', w: 24, h: 56, vx: 1, vy: 0, x: 0, y: 0 });
    advanceProjectiles([sword], world(p), FIXED_STEP);
    const primera = sword.x;
    // Sale por delante del jugador, no encima de él.
    expect(primera).toBeGreaterThan(p.x + p.w / 2);

    // Y si el jugador se mueve, el golpe le sigue: se desplaza lo mismo que él.
    p.x = 400;
    advanceProjectiles([sword], world(p), FIXED_STEP);
    expect(sword.x - primera).toBeCloseTo(100, 0);
  });

  /**
   * El golpe **barre**: recorre un arco a lo largo de su vida.
   *
   * Sin esto el cuerpo a cuerpo era una caja quieta pegada al costado, y el arte de media
   * luna que ya se dibujaba no correspondía a nada.
   */
  it('la espada barre en arco a lo largo de su vida', () => {
    const p = player({ x: 0, y: 0 });
    const sword = shot({
      projectileType: 'sword',
      w: TOOTHBRUSH.radial(1),
      h: TOOTHBRUSH.tangential(1),
      vx: 1,
      vy: 0,
      lifeTime: TOOTHBRUSH.lifeTime,
    });

    const seen: number[] = [];
    while (sword.lifeTime > 0) {
      advanceProjectiles([sword], world(p), FIXED_STEP);
      seen.push(sword.y);
    }
    // Ha pasado por alturas distintas, y de un extremo al otro.
    expect(new Set(seen.map((y) => Math.round(y))).size).toBeGreaterThan(4);
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(20);
  });

  /**
   * Los dos sentidos barren igual **en cuerpo del personaje**.
   *
   * Girar `(1, 0)` un ángulo positivo baja en pantalla y girar `(-1, 0)` el mismo ángulo
   * sube, así que sin espejar el arco con la orientación el mismo botón daba un gancho
   * mirando a un lado y un tajo mirando al otro.
   */
  it('barre en el mismo sentido mire a donde mire', () => {
    const p = player({ x: 0, y: 0 });
    const trace = (facing: 1 | -1) => {
      const sword = shot({
        projectileType: 'sword',
        w: TOOTHBRUSH.radial(1),
        h: TOOTHBRUSH.tangential(1),
        vx: facing,
        vy: 0,
        facing,
        lifeTime: TOOTHBRUSH.lifeTime,
      });
      const ys: number[] = [];
      while (sword.lifeTime > 0) {
        advanceProjectiles([sword], world(p), FIXED_STEP);
        ys.push(sword.y);
      }
      return ys;
    };
    const derecha = trace(1);
    const izquierda = trace(-1);
    // Mismo recorrido vertical: si uno sube y el otro baja, el signo estaría sin espejar.
    expect(Math.sign(derecha[derecha.length - 1] - derecha[0])).toBe(
      Math.sign(izquierda[izquierda.length - 1] - izquierda[0])
    );
  });

  /**
   * El barrido no puede dejar huecos por los que un enemigo se cuele.
   *
   * La punta del filo avanza `r · Δθ` en cada paso; si eso pasa del largo del propio filo,
   * dos posiciones consecutivas ya no se solapan y hay un enemigo que no recibe nada. Es
   * invisible jugando —parece que el golpe «no ha entrado»— y ningún test de equilibrio
   * puede verlo, porque no mueve ni el daño ni la cadencia.
   */
  it('el barrido no deja huecos en ningún nivel', () => {
    const steps = TOOTHBRUSH.lifeTime / FIXED_STEP;
    for (let l = 1; l <= 5; l++) {
      const tangential = TOOTHBRUSH.tangential(l);
      const tip = tangential / 2 + 2 + tangential / 2;
      const travel = tip * (TOOTHBRUSH.arc / steps);
      expect(travel, `nivel ${l}: la punta salta ${travel.toFixed(1)} px`).toBeLessThan(
        tangential / 2
      );
    }
  });

  /**
   * El látigo se coloca a una distancia que sale de su **propio tamaño**, así que al subir
   * de nivel alcanza más lejos sin que nadie toque un número aparte.
   */
  it('el látigo se aleja al crecer su alcance', () => {
    const p = player({ x: 0, y: 0 });
    const corto = shot({ projectileType: 'floss', w: 100, h: 20, vx: 1, vy: 0 });
    const largo = shot({ projectileType: 'floss', w: 340, h: 60, vx: 1, vy: 0 });
    advanceProjectiles([corto, largo], world(p), FIXED_STEP);
    // El canto interior de cada uno: el largo empieza más allá.
    expect(largo.x + largo.w / 2).toBeGreaterThan(corto.x + corto.w / 2);
  });

  it('un golpe de enemigo no se pega al jugador', () => {
    const enemy = shot({ projectileType: 'sword', owner: 'enemy', x: 7, y: 9 });
    advanceProjectiles([enemy], world(player({ x: 500 })), FIXED_STEP);
    expect(enemy.x).toBe(7);
    expect(enemy.y).toBe(9);
  });

  /**
   * El jefe oculto guía sus balas sin llevar lógica propia: le basta con disparar balas de
   * daño por encima del umbral.
   */
  it('solo la bala enemiga de daño alto persigue', () => {
    const p = player({ x: 0, y: 0 });
    const guiada = shot({ owner: 'enemy', damage: HOMING_DAMAGE_THRESHOLD + 5, x: 200, y: 0, vx: -1, vy: 0 });
    const normal = shot({ owner: 'enemy', damage: HOMING_DAMAGE_THRESHOLD, x: 200, y: 0, vx: -1, vy: 0 });
    const mia = shot({ owner: 'player', damage: 99, x: 200, y: 0, vx: -1, vy: 0 });
    advanceProjectiles([guiada, normal, mia], world(p), FIXED_STEP);
    expect(guiada.vx).toBeLessThan(-1);
    expect(normal.vx).toBe(-1);
    expect(mia.vx).toBe(-1);
  });

  it('la onda se bambolea y la bala no', () => {
    const wave = shot({ projectileType: 'wave', y: 100, vx: 5, vy: 0 });
    const bullet = shot({ projectileType: 'bullet', y: 100, vx: 5, vy: 0 });
    advanceProjectiles([wave, bullet], world(player()), FIXED_STEP);
    expect(wave.y).not.toBe(100);
    expect(bullet.y).toBe(100);
  });

  it('devuelve solo los que siguen vivos', () => {
    const vivo = shot({ lifeTime: 1 });
    const muerto = shot({ id: 'p2', lifeTime: FIXED_STEP / 2 });
    const survivors = advanceProjectiles([vivo, muerto], world(player()), FIXED_STEP);
    expect(survivors).toHaveLength(1);
    expect(survivors[0].id).toBe('p1');
  });

  /**
   * El frasco cae, choca y estalla.
   *
   * Lo tres juntos, porque separados no dicen nada: un frasco con gravedad que atraviesa el
   * suelo no es una granada, y uno que choca sin dejar fogonazo es una piedra.
   */
  it('el frasco cae, choca con el suelo y deja su reventón', () => {
    const p = player({ x: 0, y: 300 });
    const flask = shot({
      projectileType: 'flask',
      x: 100,
      y: 340,
      w: 21,
      h: 21,
      vx: 6,
      vy: -8,
      damage: 44,
      lifeTime: 1.2,
    });

    let live = [flask];
    let pasos = 0;
    // Sube primero: la parábola tiene que existir.
    advanceProjectiles(live, world(p, [floor()]), FIXED_STEP);
    expect(flask.y).toBeLessThan(340);

    while (live.some((x) => x.projectileType === 'flask') && pasos < 200) {
      live = advanceProjectiles(live, world(p, [floor()]), FIXED_STEP);
      pasos++;
    }

    // Y acaba en un fogonazo, mucho más ancho que el frasco y con su mismo daño.
    const burst = live.find((x) => x.projectileType === 'burst');
    expect(burst, 'el frasco no ha dejado reventón').toBeDefined();
    expect(burst!.w).toBeGreaterThan(flask.w * 3);
    expect(burst!.damage).toBe(44);
    // Y avanzó de verdad antes de romperse, no reventó a los pies.
    expect(flask.x).toBeGreaterThan(200);
  });

  /**
   * Un frasco que se sale del nivel **no** estalla.
   *
   * Si estallara, un tiro perdido acabaría reventando abajo del mapa y el jugador oiría y
   * vería un fogonazo venido de ninguna parte.
   */
  it('lo que se va fuera del nivel no estalla', () => {
    const p = player();
    const perdido = shot({ projectileType: 'flask', x: 100, y: 5000, w: 21, h: 21, lifeTime: FIXED_STEP / 2 });
    const live = advanceProjectiles([perdido], world(p), FIXED_STEP);
    expect(live).toHaveLength(0);
  });

  /**
   * El racimo comparte un solo registro de impactos, y **eso es deliberado**.
   *
   * Tres frascos con registros propios dan tres fogonazos solapados que triplican el daño
   * sobre el mismo enemigo. Es la excepción al arreglo del `hitIds` compartido: allí el
   * problema era que se compartía sin querer.
   */
  it('los reventones de un racimo comparten el registro de impactos', () => {
    const p = player();
    const grupo: string[] = [];
    const racimo = [0, 1, 2].map((i) =>
      shot({
        id: `f${i}`,
        projectileType: 'flask',
        x: 100 + i,
        y: 100,
        w: 21,
        h: 21,
        hitIds: grupo,
        lifeTime: FIXED_STEP / 2,
      })
    );
    const live = advanceProjectiles(racimo, world(p), FIXED_STEP);
    const bursts = live.filter((x) => x.projectileType === 'burst');
    expect(bursts).toHaveLength(3);
    bursts[0].hitIds.push('enemigo-1');
    for (const b of bursts) expect(b.hitIds).toContain('enemigo-1');
  });

  /**
   * La tabla es un `Record` sobre el union, así que el compilador ya exige que estén todas.
   * Esto comprueba lo que el tipo no puede: que ninguna entrada se haya quedado a medias.
   */
  /**
   * Cada clase de proyectil tiene **su propio dibujo**.
   *
   * Este era el tercer agujero silencioso, y se colaron dos por él: `arrow` y `reap` se
   * añadieron al tipo y a la tabla de conducta, pero no al dibujo, y `projectileArt` acaba
   * en un `default` que devuelve una elipse de bala. Resultado: la flecha era un guion y el
   * barrido más contundente del juego, un borrón redondo. Compilaba, pasaban los 361 tests, y
   * solo se veía jugando.
   */
  it('cada clase de proyectil se dibuja distinta de las demás', () => {
    const kinds = Object.keys(PROJECTILES) as ProjectileType[];
    const seen = new Map<string, ProjectileType>();
    for (const kind of kinds) {
      const art = projectileArt(kind, 40, 40, 'player');
      const key = art.mask.join('\n') + '|' + art.material;
      const clash = seen.get(key);
      expect(clash, `${kind} se dibuja igual que ${clash}`).toBeUndefined();
      seen.set(key, kind);
    }
  });

  it('la tabla describe todas las clases de proyectil', () => {
    const kinds = Object.keys(PROJECTILES) as ProjectileType[];
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      const b = PROJECTILES[kind];
      expect(typeof b.pierce, kind).toBe('boolean');
      expect(b.anchor, kind).toBeTruthy();
      expect(b.gravity, kind).toBeGreaterThanOrEqual(0);
      // Barrer solo tiene sentido en lo que acompaña al jugador.
      if (b.sweep) expect(['held', 'reach'], kind).toContain(b.anchor.kind);
    }
  });
});
