import type { Enemy, Player } from '../../types';
import { AIM_STEPS, bakeStep, wrapStep } from '../data/aim';
import type { ArmPose } from './sprites/masks/player';

/**
 * Qué pose toca dibujar.
 *
 * Se deriva del estado que la simulación ya lleva —velocidad, si toca suelo, si
 * acaba de recibir daño, si acaba de atacar—, así que la animación no necesita
 * su propia máquina de estados y el dibujado sigue siendo una función del mundo.
 *
 * Cada personaje tiene cuatro sprites. El ciclo de andar se consigue alternando
 * entre `walk` e `idle` mientras se mueve: dos fotogramas gratis, que es lo justo
 * para que se lea el paso.
 */

export type EnemyPose = 'idle' | 'walk' | 'attack' | 'hurt';

/**
 * Las ocho poses del jugador.
 *
 * El ciclo de andar son **cuatro** fotogramas propios. Antes eran dos, y uno de los dos
 * era el `idle`: el paso no se leía porque la mitad del ciclo el personaje estaba quieto.
 * Y el salto se parte en subida y caída, que es lo que le da peso al salto doble.
 */
export type PlayerPose = 'idle' | 'walk1' | 'walk2' | 'walk3' | 'walk4' | 'rise' | 'fall' | 'hurt';

/** Fotogramas por segundo del ciclo de andar. */
export const WALK_FPS = 8;

/** Velocidad mínima para considerar que un enemigo camina. */
export const ENEMY_WALK_THRESHOLD = 0.3;
/** Velocidad mínima para considerar que el jugador camina. */
export const PLAYER_WALK_THRESHOLD = 0.5;

/**
 * true en la mitad "levantada" del ciclo de andar.
 *
 * Sigue siendo de dos fases porque es la de los **enemigos**, que tienen dos fotogramas.
 * El jugador usa `walkFrame`; cambiar esta función para él habría cambiado el paso de los
 * doce enemigos de rebote.
 */
export const walkPhase = (animTimer: number): boolean =>
  Math.floor(Math.max(0, animTimer) * WALK_FPS) % 2 === 1;

/**
 * Cadencia del paso del **jugador**, más viva que la de los enemigos.
 *
 * El jugador avanza a 7,5 px por paso de simulación —450 px por segundo—, así que a los 8
 * fotogramas por segundo de los enemigos cada zancada mediría más de doscientos píxeles y
 * las piernas parecerían patinar sobre el suelo en vez de empujarlo.
 */
export const PLAYER_WALK_FPS = 14;

/** En qué cuarto del ciclo de andar está el jugador. */
export const walkFrame = (animTimer: number): 0 | 1 | 2 | 3 =>
  (Math.floor(Math.max(0, animTimer) * PLAYER_WALK_FPS) % 4) as 0 | 1 | 2 | 3;

/** Las cuatro poses del paso, en orden de ciclo. */
const WALK_CYCLE = ['walk1', 'walk2', 'walk3', 'walk4'] as const;

export const enemyPose = (e: Enemy): EnemyPose => {
  if (e.hitTimer > 0) return 'hurt';
  if (e.actionTimer > 0) return 'attack';
  if (Math.abs(e.vx) > ENEMY_WALK_THRESHOLD) return walkPhase(e.animTimer) ? 'walk' : 'idle';
  return 'idle';
};

export const playerPose = (p: Player): PlayerPose => {
  if (p.hitTimer > 0) return 'hurt';
  // En el aire, el signo de la velocidad vertical decide. `vy` estaba ahí desde el
  // principio y el dibujado no lo miraba: subir y caer eran el mismo fotograma.
  if (!p.isGrounded) return p.vy < 0 ? 'rise' : 'fall';
  if (Math.abs(p.vx) > PLAYER_WALK_THRESHOLD) return WALK_CYCLE[walkFrame(p.animTimer)];
  return 'idle';
};

/**
 * Qué brazo toca para la inclinación a la que se apunta.
 *
 * Recibía un booleano —«¿apunta hacia arriba?»— y con él solo podía elegir entre dos brazos, así
 * que apuntando en diagonal el brazo salía tendido y el arma inclinada encima, como flotando. Y
 * apuntando recto hacia abajo también salía tendido.
 *
 * El brazo se pinta espejado **con el cuerpo**, así que la banda se elige sobre la mitad a la que
 * el cuerpo mira. Apuntando hacia atrás —que se puede, porque `facing` solo cambia al disparar—
 * la inclinación se pliega hacia delante: con seis siluetas no hay manera de dibujar un brazo que
 * apunte a la espalda, y antes tampoco se dibujaba.
 *
 * `frameTimer` es el enfriamiento del arma en pasos de simulación, y hasta ahora el
 * dibujado no lo usaba: disparar no se veía en el cuerpo. Recién disparado, el brazo
 * retrocede.
 */
export const armPose = (p: Player, step: number): ArmPose => {
  const facing = p.facing < 0 ? wrapStep(AIM_STEPS / 2 - step) : wrapStep(step);
  const band = bakeStep(facing).step;

  if (band === 3 || band === 4) return 'down';
  if (band === 2) return 'diagDown';
  if (band === 12 || band === 13) return 'up';
  if (band === 14) return 'diagUp';
  return p.frameTimer > 0 ? 'recoil' : 'side';
};
