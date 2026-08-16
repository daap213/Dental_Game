/**
 * Constantes de simulación y de progresión.
 *
 * Ojo con las unidades: velocidades y gravedad se integran **por paso de
 * simulación** (`p.x += p.vx`, `p.vy += GRAVITY`), mientras que dash, escudo y
 * cooldowns van en segundos escalados por `dt`. Las dos convenciones conviven
 * sin deformarse porque el bucle consume el tiempo real en pasos de tamaño
 * fijo (`FIXED_STEP`): un paso de simulación siempre representa lo mismo, sean
 * 60 o 144 los Hz del monitor.
 */

/**
 * Duración de un paso de simulación, en segundos. El bucle acumula el tiempo
 * real transcurrido y lo gasta en pasos de este tamaño, así que `update` recibe
 * siempre el mismo `dt`.
 */
export const FIXED_STEP = 1 / 60;

/**
 * Máximo de pasos de simulación por frame, que es también el límite de cuánto
 * tiempo real puede entrar en un frame (`MAX_FRAME_TIME` en `game/loop.ts`).
 *
 * Con 2, un frame que llegue tarde recupera como mucho 33 ms y el resto del
 * retraso se descarta: el juego puede ir más lento si la máquina no da, pero
 * nunca da un salto hacia delante. Subirlo devuelve los tirones de aceleración
 * tras cada parón del navegador.
 */
export const MAX_STEPS_PER_FRAME = 2;

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

// Empuje al recibir un golpe (por paso de simulación, como el resto de velocidades)
export const KNOCKBACK_X = 5;
export const KNOCKBACK_Y = -6;

// Invencibilidad (segundos)
/** Tras recibir un golpe normal. */
export const HIT_INVULNERABILITY = 2.0;
/** Tras gastar una vida o reaparecer de una caída. */
export const RESPAWN_INVULNERABILITY = 3.0;

// Caída al vacío
/**
 * Daño por caerse del escenario. La caída no mata directamente: reposiciona al
 * jugador en suelo firme y le cobra esto, así que solo es letal si ya venía
 * tocado. Ignora el escudo y la reducción de daño a propósito — es un castigo
 * por el error, no un ataque.
 */
export const PIT_FALL_DAMAGE = 25;

// Fin de nivel
/** Segundos entre la muerte del jefe y el cierre de mandíbulas. */
export const STAGE_CLEAR_DELAY = 3.0;
/** Curación al entrar en el stage siguiente. */
export const LEVEL_UP_HEAL = 20;
/** Curación del botiquín que sueltan los enemigos. */
export const HEALTH_PICKUP = 30;

// Puntuación
export const SCORE_PER_KILL = 100;
export const SCORE_PER_BOSS = 5000;
/** Recoger un arma ya conocida sube su nivel; al máximo, solo da puntos. */
export const SCORE_WEAPON_LEVEL_UP = 500;
export const SCORE_WEAPON_MAXED = 1000;
