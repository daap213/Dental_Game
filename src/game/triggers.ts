import { HIDDEN_BOSS_TRIGGERS as T } from './data/enemies';

/**
 * Relojes de comportamiento que invocan al jefe oculto.
 *
 * Antes esto era un `useRef` en `GameCanvas` que comparaba `Date.now()`. Ese
 * reloj no se detiene al pausar ni cuando el navegador congela la pestaña —y la
 * congela del todo: con la pestaña oculta Chrome no ejecuta ni un
 * `requestAnimationFrame`—, así que pausar tres minutos invocaba al jefe al
 * volver. Aquí todo se mide con `dt` acumulado: si la simulación no corre, los
 * relojes no corren.
 *
 * Es estado de la partida, así que vive en el `World` y se reinicia por nivel.
 */
export interface TriggerState {
  /** Segundos de simulación transcurridos en este nivel. */
  levelTime: number;
  /** Segundos seguidos sin avanzar de forma significativa. */
  idleTime: number;
  /** Última x desde la que se mide la inactividad. */
  lastX: number;
  /** Bajas conseguidas en este nivel. */
  kills: number;
  /** `levelTime` en que apareció el jefe del stage; -1 si aún no ha aparecido. */
  bossSpawnTime: number;
  /** El jefe oculto ya ha sido invocado en este nivel. */
  fired: boolean;
}

export const createTriggerState = (playerX = 0): TriggerState => ({
  levelTime: 0,
  idleTime: 0,
  lastX: playerX,
  kills: 0,
  bossSpawnTime: -1,
  fired: false,
});

export interface TriggerContext {
  /** El jefe del stage ya está en el escenario. */
  bossSpawned: boolean;
  /** El nivel está en su secuencia de cierre. */
  transitioning: boolean;
}

/**
 * Avanza los relojes un paso de simulación y responde si toca invocar al jefe
 * oculto. Muta `state`.
 *
 * Los tres motivos son los de siempre: quedarse quieto, no avanzar en el nivel,
 * y matar en cadena. El cuarto —matar al jefe del stage muy rápido— se comprueba
 * aparte, con `isBossSpeedkill`, porque depende de un suceso y no del reloj.
 */
export const advanceTriggers = (
  state: TriggerState,
  dt: number,
  playerX: number,
  ctx: TriggerContext
): boolean => {
  state.levelTime += dt;

  if (Math.abs(playerX - state.lastX) < T.idleDistance) {
    state.idleTime += dt;
  } else {
    state.idleTime = 0;
    state.lastX = playerX;
  }

  if (state.fired || ctx.transitioning) return false;

  // 1. Pereza: mucho tiempo sin moverse del sitio.
  if (state.idleTime > T.idleSeconds) return true;

  // 2. Estancamiento: mucho tiempo de nivel sin avanzar, y sin jefe delante.
  if (state.levelTime > T.stagnantSeconds && playerX < T.stagnantX && !ctx.bossSpawned) return true;

  // 3. Ira: matanza rápida al principio del nivel.
  if (state.levelTime < T.rushSeconds && state.kills > T.rushKills) return true;

  return false;
};

/** ¿Ha caído el jefe del stage demasiado rápido? */
export const isBossSpeedkill = (state: TriggerState): boolean =>
  state.bossSpawnTime >= 0 &&
  state.levelTime - state.bossSpawnTime < T.bossSpeedkillSeconds;
