/**
 * Constantes de simulación y de progresión.
 *
 * Ojo con las unidades: velocidades y gravedad se integran **por frame**, no
 * por segundo (`p.x += p.vx`, `p.vy += GRAVITY`), mientras que los tiempos de
 * dash, escudo y cooldowns van en segundos escalados por `dt`. Esa mezcla es
 * la que hace que el juego corra más rápido a más Hz; se resuelve al pasar a
 * Phaser, con paso fijo. Hasta entonces, respeta la convención de cada valor.
 */

/** Resolución lógica del canvas. Todo el mundo del juego usa estas unidades. */
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Física (por frame)
export const GRAVITY = 0.65;
export const TERMINAL_VELOCITY = 16;
export const FRICTION = 0.8;

// Jugador
export const PLAYER_SPEED = 7.5;
export const PLAYER_JUMP = -14;
export const PLAYER_SIZE = 32;
export const PLAYER_MAX_JUMPS = 2;

// Dash (duración y cooldown en segundos)
export const PLAYER_DASH_SPEED = 20;
export const PLAYER_DASH_DURATION = 0.15;
export const PLAYER_DASH_COOLDOWN = 0.8;

// Umbrales que otorgan un perk
export const SCORE_MILESTONE_START = 6200;
export const SCORE_MILESTONE_INCREMENT = 8000;
export const KILL_MILESTONE_START = 20;
/** El paso sube 10 cada vez: 20, +30, +50, +80… */
export const KILL_MILESTONE_INCREMENT_START = 10;

// Escudo de pasta dental (segundos / puntos por segundo)
export const SHIELD_REGEN_DELAY = 5.0;
export const SHIELD_REGEN_RATE = 10;
