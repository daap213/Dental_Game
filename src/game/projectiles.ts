import type { Particle, Platform, Player, Projectile } from '../types';
import { CANVAS_HEIGHT, GRAVITY } from './data/physics';
import { HOMING_DAMAGE_THRESHOLD } from './data/weapons';
import { tone } from './data/palette';
import { hitsAnyPlatform } from './physics';
import { spawnParticles } from './particles';
import {
  PROJECTILES,
  WOBBLE_FREQ,
  type Anchor,
  type ProjectileBehaviour,
} from './data/projectiles';

/**
 * Un paso de simulación de todos los proyectiles.
 *
 * Estaba dentro de `GameCanvas.tsx`, que está en la lista de **sustituir, no reparar**, y
 * sin un solo test. Aquí sigue el patrón del resto de `src/game/`: recibe lo que debe
 * mutar y devuelve los supervivientes, igual que `cullEnemies`.
 *
 * Lo que hace cada tipo no está escrito aquí: sale de la tabla de `data/projectiles.ts`.
 * Este módulo solo sabe **cómo** se aplica cada conducta, no **quién** la tiene.
 */

/** Hasta dónde persigue una bala guiada, y con cuánta fuerza gira. */
const HOMING_RANGE = 400;
const HOMING_PULL = 0.2;

/**
 * A qué distancia del centro del jugador se coloca un golpe.
 *
 * La distancia fija es la de la espada; la que sale del tamaño es la del látigo, cuyo
 * alcance crece con el nivel y que por eso tiene que colocarse más lejos sin que nadie
 * ajuste un número.
 */
const standOff = (anchor: Anchor, proj: Projectile): number => {
  if (anchor.kind === 'held') return anchor.gap;
  if (anchor.kind === 'reach') return Math.max(proj.w, proj.h) / 2 + anchor.margin;
  return 0;
};

/**
 * Gira la dirección del golpe a lo largo de su vida, para que barra.
 *
 * `lifeTime` **decrece**, así que el barrido va del extremo positivo al negativo: el golpe
 * sale adelantado y termina recogido, que es el sentido natural de una estocada. Se
 * reutiliza la vida como fase igual que ya hacía el bamboleo de las ondas, así que no hace
 * falta ningún campo nuevo ni rotar mapas de bits.
 */
const swept = (proj: Projectile, sweep: ProjectileBehaviour['sweep']) => {
  if (!sweep || sweep.over <= 0) return { x: proj.vx, y: proj.vy };
  // 1 al nacer, 0 al morir.
  const left = Math.max(0, Math.min(1, proj.lifeTime / sweep.over));
  /**
   * El sentido del arco se **espeja con la orientación**, y sin eso el mismo botón daba dos
   * golpes distintos: girar `(1, 0)` un ángulo positivo baja en pantalla, pero girar
   * `(-1, 0)` el mismo ángulo sube. Mirando a la derecha salía un gancho de abajo arriba y
   * mirando a la izquierda un tajo de arriba abajo.
   */
  const angle = (left - 0.5) * sweep.arc * proj.facing;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: proj.vx * cos - proj.vy * sin, y: proj.vx * sin + proj.vy * cos };
};

/** Margen fuera del cual un proyectil deja de existir sin estallar. */
const OUT_OF_PLAY = 200;

/**
 * Si el proyectil sigue dentro de la zona de juego.
 *
 * Se compara con `x + w` y no con `x` porque el rayo de suelo de la deidad ocupa el nivel
 * entero: mirando solo su `x` se descartaría en el mismo frame en que nace.
 *
 * Y **no** se descarta por delante de la cámara: un láser recorre legítimamente más de mil
 * píxeles y alcanza enemigos que todavía no se ven.
 */
const inPlay = (proj: Projectile, world: ProjectileWorld): boolean =>
  proj.y < CANVAS_HEIGHT + OUT_OF_PLAY &&
  proj.x + proj.w > world.camera.x - OUT_OF_PLAY &&
  proj.x < world.level.levelWidth + OUT_OF_PLAY;

/** Lo que el paso de proyectiles necesita del mundo. */
export interface ProjectileWorld {
  player: Player;
  platforms: readonly Platform[];
  particles: Particle[];
  camera: { x: number };
  level: { levelWidth: number };
}

/**
 * El reventón de lo que se rompe: un fogonazo corto y perforante centrado donde murió.
 *
 * Hereda el daño **ya multiplicado** del frasco y su mismo registro de impactos, así que un
 * racimo de tres reparte su daño una vez por enemigo y no tres.
 */
const detonate = (proj: Projectile, out: Projectile[], particles: Particle[]): void => {
  const burst = PROJECTILES[proj.projectileType].burst;
  if (!burst) return;

  const size = Math.round(Math.max(proj.w, proj.h) * burst.scale);
  out.push({
    ...proj,
    id: `${proj.id}:burst`,
    x: proj.x + proj.w / 2 - size / 2,
    y: proj.y + proj.h / 2 - size / 2,
    w: size,
    h: size,
    vx: 0,
    vy: 0,
    lifeTime: burst.life,
    projectileType: burst.of,
  });
  spawnParticles(particles, proj.x + proj.w / 2, proj.y + proj.h / 2, tone('wave.light'), 10);
};

export const advanceProjectiles = (
  projectiles: Projectile[],
  world: ProjectileWorld,
  dt: number
): Projectile[] => {
  const player = world.player;
  const survivors: Projectile[] = [];
  /**
   * Los reventones se juntan aparte y se añaden al final.
   *
   * Empujarlos al array que se está recorriendo haría que el propio bucle los recorriera
   * —`for...of` sí ve lo que se añade—, y un reventón que reventara sería un bucle infinito.
   */
  const spawned: Projectile[] = [];

  for (const proj of projectiles) {
    const behaviour = PROJECTILES[proj.projectileType];
    const { anchor } = behaviour;

    /**
     * Un proyectil que ya murió —lo mató el bucle de impactos de este mismo frame— no se
     * mueve más: se resuelve su final aquí mismo.
     *
     * Antes el descarte era un `filter` al terminar, así que un proyectil muerto todavía se
     * movía un paso y se dibujaba un frame más.
     */
    if (proj.lifeTime <= 0) {
      if (inPlay(proj, world)) detonate(proj, spawned, world.particles);
      continue;
    }

    if (anchor.kind !== 'free') {
      // Los golpes solo acompañan al **jugador**; si un enemigo llegara a usar uno, se
      // quedaría quieto donde nació en vez de pegarse a su dueño.
      if (anchor.kind !== 'static' && proj.owner === 'player') {
        const dir = swept(proj, behaviour.sweep);
        const gap = standOff(anchor, proj);
        proj.x = player.x + player.w / 2 + dir.x * gap - proj.w / 2;
        proj.y = player.y + player.h / 2 + dir.y * gap - proj.h / 2;
      }
    } else {
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (behaviour.gravity !== 0) proj.vy += GRAVITY * behaviour.gravity;

      // El jefe oculto guía sus balas sin llevar lógica propia: le basta con disparar
      // balas de daño alto.
      if (behaviour.homing && proj.owner === 'enemy' && proj.damage > HOMING_DAMAGE_THRESHOLD) {
        const dx = player.x - proj.x;
        const dy = player.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < HOMING_RANGE) {
          proj.vx += (dx / dist) * HOMING_PULL;
          proj.vy += (dy / dist) * HOMING_PULL;
        }
      }
    }

    proj.lifeTime -= dt;

    // El bamboleo se calcula con la vida del propio proyectil y no con el reloj del
    // sistema: es simulación, y así dos partidas iguales se comportan igual.
    if (behaviour.wobble !== 0) proj.y += Math.sin(proj.lifeTime * WOBBLE_FREQ) * behaviour.wobble;

    // Lo que estalla se rompe también contra el suelo, las paredes y los techos.
    if (behaviour.burst && hitsAnyPlatform(proj, world.platforms)) proj.lifeTime = 0;

    const alive = proj.lifeTime > 0;
    const playing = inPlay(proj, world);
    if (alive && playing) {
      survivors.push(proj);
    } else if (playing) {
      // Se agotó la mecha dentro del nivel: estalla. Si se ha ido fuera, no.
      detonate(proj, spawned, world.particles);
    }
  }

  return spawned.length ? survivors.concat(spawned) : survivors;
};
