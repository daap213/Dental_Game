/**
 * Qué tecla hace qué.
 *
 * Antes no existía **ninguna** indirección: la misma tabla de teclas estaba
 * escrita a mano tres veces dentro de `GameCanvas` —el keyup global, el keydown
 * y el keyup de la partida—, la de botones del ratón dos, y encima una cuarta
 * lista con las teclas cuyo scroll hay que suprimir. Cinco sitios que había que
 * mantener a la vez y en los que nada avisaba de una discrepancia.
 *
 * Vive en `data/` por la misma razón que `PROJECTILES` o `WEAPONS`: lo que hace
 * cada cosa es un dato, no una cadena de `switch`.
 *
 * **Todo se identifica por `e.code`, nunca por `e.key`.** `code` es la posición
 * física de la tecla, así que WASD sigue siendo el mismo cuadrado en AZERTY o
 * Dvorak. La contrapartida es que la *etiqueta* que se enseña puede no coincidir
 * con lo que hay serigrafiado (ver `codeLabel`), y ese es el mal menor: que la
 * etiqueta mienta se ve y se corrige; que el juego no se pueda jugar, no.
 */

export type GameAction = 'left' | 'right' | 'aimUp' | 'jump' | 'shoot' | 'dash';

/** Las banderas que el bucle lee. Sus nombres son los del `inputs` de la partida. */
export type HeldFlag = 'left' | 'right' | 'aimUp' | 'shoot' | 'dash';
export type EdgeFlag = 'jumpPressed' | 'shootPressed' | 'dashPressed';

export interface ActionSpec {
  /** Bandera mientras la tecla está hundida. */
  readonly held?: HeldFlag;
  /** Bandera de flanco: se levanta en la transición 0→1 y la consume `update()`. */
  readonly edge?: EdgeFlag;
  /** Clave del rótulo en el diccionario, bajo `menu`. */
  readonly labelKey: 'ctrl_move' | 'ctrl_aim' | 'ctrl_jump' | 'ctrl_shoot' | 'ctrl_dash';
}

export const ACTIONS = ['left', 'right', 'aimUp', 'jump', 'shoot', 'dash'] as const;

/**
 * **La asimetría mantenida/flanco es la parte delicada**, y es lo que un
 * refactor aplana sin querer:
 *
 * - moverse y apuntar arriba son **solo mantenidas**;
 * - saltar es **solo flanco** —mantener el espacio no debe saltar sin parar—;
 * - disparar y el impulso tienen **las dos**: la mantenida sostiene el fuego
 *   continuo y la de flanco dispara la ráfaga del impulso una sola vez.
 */
export const ACTION_SPECS: Record<GameAction, ActionSpec> = {
  left: { held: 'left', labelKey: 'ctrl_move' },
  right: { held: 'right', labelKey: 'ctrl_move' },
  aimUp: { held: 'aimUp', labelKey: 'ctrl_aim' },
  jump: { edge: 'jumpPressed', labelKey: 'ctrl_jump' },
  shoot: { held: 'shoot', edge: 'shootPressed', labelKey: 'ctrl_shoot' },
  dash: { held: 'dash', edge: 'dashPressed', labelKey: 'ctrl_dash' },
};

/** Una acción admite **varios** códigos: el impulso siempre tuvo tres. */
export type Bindings = Record<GameAction, readonly string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  aimUp: ['KeyW', 'ArrowUp'],
  jump: ['Space'],
  shoot: ['KeyF', 'KeyK'],
  dash: ['ShiftLeft', 'ShiftRight', 'KeyL'],
};

/**
 * Los botones del ratón **no se reasignan**. Apuntar y disparar con el ratón es
 * la identidad del único modo de control que queda; moverlos convertiría el
 * juego en otro. Están aquí para que el índice de teclas y el del ratón no sean
 * dos mecanismos distintos.
 */
export const MOUSE_BINDINGS: Readonly<Record<number, GameAction>> = { 0: 'shoot', 2: 'dash' };

/** Cuántos códigos como mucho por acción. Tres es lo que ya usaba el impulso. */
export const MAX_CODES_PER_ACTION = 3;

/**
 * Teclas que el navegador usa para desplazar la página. Solo se suprimen las que
 * de verdad estén asignadas —ver `preventDefaultCodes`—, nunca la lista entera:
 * suprimir de más es tan malo como de menos.
 *
 * **`Tab` no está y no puede estar.** Es la única vía de escape del teclado; un
 * juego que se la come deja atrapado a quien no use ratón.
 */
const SCROLL_CODES = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/** Índice inverso: de código físico a acción. Es lo que consulta el manejador. */
export const bindingIndex = (bindings: Bindings): ReadonlyMap<string, GameAction> => {
  const index = new Map<string, GameAction>();
  for (const action of ACTIONS) {
    for (const code of bindings[action]) if (!index.has(code)) index.set(code, action);
  }
  return index;
};

export const actionForCode = (
  index: ReadonlyMap<string, GameAction>,
  code: string
): GameAction | null => index.get(code) ?? null;

/**
 * Qué códigos hay que interceptar. Derivado, no escrito a mano: la lista fija
 * suprimía `ArrowDown` para una acción que ya no existe, y en cuanto alguien
 * asignase el salto a `PageDown` la página se desplazaría bajo el jugador.
 */
export const preventDefaultCodes = (bindings: Bindings): ReadonlySet<string> => {
  const codes = new Set<string>();
  for (const action of ACTIONS) {
    for (const code of bindings[action]) if (SCROLL_CODES.has(code)) codes.add(code);
  }
  return codes;
};

/** Nombres cortos para los códigos que no se leen solos. */
const CODE_NAMES: Readonly<Record<string, string>> = {
  Space: 'SPACE',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ShiftLeft: 'L SHIFT',
  ShiftRight: 'R SHIFT',
  ControlLeft: 'L CTRL',
  ControlRight: 'R CTRL',
  AltLeft: 'L ALT',
  AltRight: 'R ALT',
  Enter: 'ENTER',
  Backspace: 'BKSP',
  Tab: 'TAB',
  Escape: 'ESC',
};

/**
 * Cómo se enseña un código.
 *
 * Es una aproximación **a propósito**: `KeyA` se rotula «A» aunque en un teclado
 * AZERTY esa tecla lleve escrita una Q. Saberlo de verdad exige
 * `navigator.keyboard.getLayoutMap()`, que es asíncrono y solo existe en
 * navegadores Chromium. Esto es la base fiable; una mejora opcional puede
 * sustituir la etiqueta cuando la API esté.
 */
export const codeLabel = (code: string): string => {
  const named = CODE_NAMES[code];
  if (named) return named;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  return code.toUpperCase();
};

/** Qué acción tiene ya ese código, si es otra distinta de la que lo pide. */
export const conflictsFor = (
  bindings: Bindings,
  code: string,
  action: GameAction
): GameAction | null => {
  for (const other of ACTIONS) {
    if (other !== action && bindings[other].includes(code)) return other;
  }
  return null;
};

/**
 * ¿Se le puede quitar ese código a esa acción?
 *
 * No, si es el último: una acción sin ninguna tecla es una acción que no se
 * puede ejecutar, y el juego se queda medio inservible sin que nada falle.
 */
export const canRelease = (bindings: Bindings, action: GameAction): boolean =>
  bindings[action].length > 1;

/**
 * Asigna `code` a `action`, quitándoselo a quien lo tuviera. Devuelve el mismo
 * objeto si el cambio dejaría a otra acción sin teclas.
 */
export const rebind = (bindings: Bindings, action: GameAction, code: string): Bindings => {
  const holder = conflictsFor(bindings, code, action);
  if (holder && !canRelease(bindings, holder)) return bindings;
  if (bindings[action].includes(code)) return bindings;

  const next = {} as Record<GameAction, readonly string[]>;
  for (const a of ACTIONS) {
    if (a === action) {
      // Si ya está en el tope, entra por el final y sale el más antiguo.
      const kept = bindings[a].slice(-(MAX_CODES_PER_ACTION - 1));
      next[a] =
        bindings[a].length >= MAX_CODES_PER_ACTION ? [...kept, code] : [...bindings[a], code];
    } else {
      next[a] = bindings[a].filter((c) => c !== code);
    }
  }
  return next;
};

/** Quita un código de una acción, salvo que fuera el último. */
export const unbind = (bindings: Bindings, action: GameAction, code: string): Bindings =>
  canRelease(bindings, action)
    ? { ...bindings, [action]: bindings[action].filter((c) => c !== code) }
    : bindings;

/**
 * Copia **profunda** de los valores por defecto. Devolver `DEFAULT_BINDINGS` tal
 * cual dejaría que la pantalla de ajustes mutase la constante del módulo, que es
 * justo la clase de fallo compartido que el resto de la suite existe para cazar.
 */
export const resetBindings = (): Bindings => {
  const fresh = {} as Record<GameAction, readonly string[]>;
  for (const action of ACTIONS) fresh[action] = [...DEFAULT_BINDINGS[action]];
  return fresh;
};

/**
 * Frontera con el almacenamiento: convierte cualquier cosa en asignaciones
 * válidas. Nunca lanza y **nunca deja una acción sin teclas**.
 */
export const normaliseBindings = (raw: unknown): Bindings => {
  const fresh = resetBindings();
  if (raw === null || typeof raw !== 'object') return fresh;

  const source = raw as Record<string, unknown>;
  const next = {} as Record<GameAction, readonly string[]>;
  for (const action of ACTIONS) {
    const value = source[action];
    const codes = Array.isArray(value)
      ? [...new Set(value.filter((c): c is string => typeof c === 'string' && c.length > 0))].slice(
          0,
          MAX_CODES_PER_ACTION
        )
      : [];
    next[action] = codes.length > 0 ? codes : fresh[action];
  }
  return next;
};

/**
 * El objeto de entrada de una partida.
 *
 * Estaba escrito tres veces —al crear, al reiniciar y en el barrido antitecla
 * pegada de después de elegir mejora—, y las tres había que mantenerlas a la vez.
 */
export interface GameInputs {
  left: boolean;
  right: boolean;
  aimUp: boolean;
  shoot: boolean;
  dash: boolean;
  jumpPressed: boolean;
  shootPressed: boolean;
  dashPressed: boolean;
  mouseX: number;
  mouseY: number;
  /**
   * Si el ratón ya se ha movido dentro de la partida. Hasta entonces
   * `mouseX/mouseY` son 0,0 y apuntar al ratón significaría disparar hacia la
   * esquina superior izquierda del nivel: el primer disparo salía hacia atrás.
   */
  mouseSeen: boolean;
}

export const freshInputs = (): GameInputs => ({
  left: false,
  right: false,
  aimUp: false,
  shoot: false,
  dash: false,
  jumpPressed: false,
  shootPressed: false,
  dashPressed: false,
  mouseX: 0,
  mouseY: 0,
  mouseSeen: false,
});

/**
 * Suelta todas las teclas conservando el ratón.
 *
 * Es el barrido antitecla pegada: el menú de mejoras se ha comido los `keyup`,
 * así que al volver hay que dar por soltado todo. La posición del ratón **no**
 * se toca, porque no se ha ido a ninguna parte.
 */
export const releaseAll = (inputs: GameInputs): void => {
  inputs.left = false;
  inputs.right = false;
  inputs.aimUp = false;
  inputs.shoot = false;
  inputs.dash = false;
  inputs.jumpPressed = false;
  inputs.shootPressed = false;
  inputs.dashPressed = false;
};

/**
 * Aplica una acción a las banderas. **Un solo sitio** donde vive la semántica de
 * mantenida y flanco, en lugar de repetirla por cada `case`.
 */
export const applyAction = (inputs: GameInputs, action: GameAction, down: boolean): void => {
  const spec = ACTION_SPECS[action];
  if (spec.held) {
    // El flanco solo se levanta en la transición 0→1: mantener disparado no
    // puede contar como un disparo nuevo cada fotograma.
    if (down && spec.edge && !inputs[spec.held]) inputs[spec.edge] = true;
    inputs[spec.held] = down;
    return;
  }
  if (spec.edge && down) inputs[spec.edge] = true;
};
