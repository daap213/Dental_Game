import { describe, it, expect } from 'vitest';
import { createTriggerState, advanceTriggers, isBossSpeedkill, type TriggerState } from './triggers';
import { HIDDEN_BOSS_TRIGGERS as T } from './data/enemies';

const STEP = 1 / 60;
const FREE = { bossSpawned: false, transitioning: false };

/**
 * Avanza `seconds` de simulación en pasos fijos. `playerX` puede ser una función
 * del tiempo para simular a alguien que se mueve. Devuelve en qué segundo se
 * invocó al jefe oculto, o null si no se invocó.
 */
const simulate = (
  state: TriggerState,
  seconds: number,
  playerX: number | ((t: number) => number) = 0,
  ctx = FREE
): number | null => {
  const at = typeof playerX === 'function' ? playerX : () => playerX;

  for (let t = 0; t < seconds; t += STEP) {
    if (advanceTriggers(state, STEP, at(t), ctx)) return state.levelTime;
  }
  return null;
};

describe('relojes del jefe oculto', () => {
  it('no usa el reloj del sistema: sin pasos de simulación no pasa el tiempo', () => {
    // Esto es el fallo 09. Antes se comparaba Date.now(), así que pausar tres
    // minutos (o dejar la pestaña de fondo, donde el navegador ni ejecuta el
    // requestAnimationFrame) invocaba al jefe al volver.
    const state = createTriggerState(0);
    expect(state.levelTime).toBe(0);
    expect(advanceTriggers(state, 0, 0, FREE)).toBe(false);
    expect(state.levelTime).toBe(0);
    expect(state.idleTime).toBe(0);
  });

  it('invoca por pereza tras dos minutos sin moverse del sitio', () => {
    const state = createTriggerState(0);
    const firedAt = simulate(state, T.idleSeconds + 5, 10);
    expect(firedAt).not.toBeNull();
    expect(firedAt!).toBeGreaterThan(T.idleSeconds);
    expect(firedAt!).toBeLessThan(T.idleSeconds + 2);
  });

  it('moverse reinicia el reloj de pereza', () => {
    const state = createTriggerState(0);
    // Avanza 100 px cada 10 segundos: nunca se queda quieto lo suficiente.
    const firedAt = simulate(state, T.idleSeconds + 30, (t) => Math.floor(t / 10) * 100);
    expect(firedAt).toBeNull();
    expect(state.idleTime).toBeLessThan(T.idleSeconds);
  });

  it('invoca por estancamiento a los tres minutos sin avanzar en el nivel', () => {
    const state = createTriggerState(0);
    // Se mueve lo justo para no contar como quieto, pero sin salir del principio.
    const firedAt = simulate(state, T.stagnantSeconds + 5, (t) => (Math.floor(t) % 2) * 200);
    expect(firedAt).not.toBeNull();
    expect(firedAt!).toBeGreaterThanOrEqual(T.stagnantSeconds);
  });

  it('no invoca por estancamiento si el jefe del stage ya está en pantalla', () => {
    const state = createTriggerState(0);
    const firedAt = simulate(state, T.stagnantSeconds + 5, (t) => (Math.floor(t) % 2) * 200, {
      bossSpawned: true,
      transitioning: false,
    });
    expect(firedAt).toBeNull();
  });

  it('invoca por matanza rápida al principio del nivel', () => {
    const state = createTriggerState(0);
    state.kills = T.rushKills + 1;
    // Se mueve para que no salte antes el reloj de pereza.
    const firedAt = simulate(state, 5, (t) => t * 100);
    expect(firedAt).not.toBeNull();
    expect(firedAt!).toBeLessThan(T.rushSeconds);
  });

  it('la misma matanza ya no cuenta pasado el margen de tiempo', () => {
    const state = createTriggerState(0);
    simulate(state, T.rushSeconds + 1, (t) => t * 100);
    state.kills = T.rushKills + 1;
    expect(advanceTriggers(state, STEP, 99999, FREE)).toBe(false);
  });

  it('durante el cierre del nivel no invoca nada', () => {
    const state = createTriggerState(0);
    const firedAt = simulate(state, T.idleSeconds + 10, 0, { bossSpawned: false, transitioning: true });
    expect(firedAt).toBeNull();
  });

  it('solo invoca una vez por nivel', () => {
    const state = createTriggerState(0);
    expect(simulate(state, T.idleSeconds + 5, 0)).not.toBeNull();
    state.fired = true;
    expect(simulate(state, T.idleSeconds + 5, 0)).toBeNull();
  });
});

describe('speedkill del jefe del stage', () => {
  it('cuenta desde que apareció el jefe, en tiempo de simulación', () => {
    const state = createTriggerState(0);
    simulate(state, 30, (t) => t * 100);
    state.bossSpawnTime = state.levelTime;

    simulate(state, T.bossSpeedkillSeconds - 10, (t) => 3000 + t * 100);
    expect(isBossSpeedkill(state)).toBe(true);

    simulate(state, 20, (t) => 9000 + t * 100);
    expect(isBossSpeedkill(state)).toBe(false);
  });

  it('sin jefe aparecido no hay speedkill', () => {
    const state = createTriggerState(0);
    expect(state.bossSpawnTime).toBe(-1);
    expect(isBossSpeedkill(state)).toBe(false);
  });
});
