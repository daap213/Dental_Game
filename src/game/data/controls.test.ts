import { describe, it, expect } from 'vitest';
import {
  ACTIONS,
  ACTION_SPECS,
  DEFAULT_BINDINGS,
  MAX_CODES_PER_ACTION,
  actionForCode,
  applyAction,
  bindingIndex,
  canRelease,
  codeLabel,
  conflictsFor,
  freshInputs,
  normaliseBindings,
  preventDefaultCodes,
  rebind,
  releaseAll,
  resetBindings,
  unbind,
  type Bindings,
} from './controls';

/**
 * La tabla de controles.
 *
 * Sustituye a cinco copias de la misma información repartidas por el monolito,
 * así que lo que hay que fijar no es "qué tecla hace qué" —eso se lee— sino las
 * invariantes que un refactor aplana en silencio: la asimetría entre banderas
 * mantenidas y de flanco, que ninguna acción se quede sin teclas, y que la
 * supresión de scroll no se coma ni de más ni de menos.
 */
describe('asignaciones por defecto', () => {
  it('ninguna acción se queda sin tecla', () => {
    for (const action of ACTIONS) {
      expect(DEFAULT_BINDINGS[action].length, action).toBeGreaterThan(0);
    }
  });

  it('ningún código sirve para dos acciones', () => {
    const seen = new Map<string, string>();
    for (const action of ACTIONS) {
      for (const code of DEFAULT_BINDINGS[action]) {
        expect(seen.get(code), `${code} ya era de ${seen.get(code)}`).toBeUndefined();
        seen.set(code, action);
      }
    }
  });

  it('ninguna acción pasa del tope de códigos', () => {
    for (const action of ACTIONS) {
      expect(DEFAULT_BINDINGS[action].length, action).toBeLessThanOrEqual(MAX_CODES_PER_ACTION);
    }
  });

  it('el índice inverso concuerda con la tabla', () => {
    const index = bindingIndex(DEFAULT_BINDINGS);
    for (const action of ACTIONS) {
      for (const code of DEFAULT_BINDINGS[action]) expect(actionForCode(index, code)).toBe(action);
    }
    expect(actionForCode(index, 'KeyZ')).toBeNull();
    expect(actionForCode(index, 'Escape')).toBeNull();
  });
});

describe('banderas mantenidas y de flanco', () => {
  /**
   * Esto es lo que el `switch` original codificaba caso a caso y lo que se
   * pierde al unificarlo: mantener el espacio no debe saltar sin parar, pero
   * mantener el clic **sí** debe seguir disparando.
   */
  it('saltar es solo flanco: mantener no repite', () => {
    const inputs = freshInputs();
    applyAction(inputs, 'jump', true);
    expect(inputs.jumpPressed).toBe(true);

    inputs.jumpPressed = false; // lo consume `update()`
    applyAction(inputs, 'jump', true); // sigue hundida
    expect(inputs.jumpPressed, 'mantener saltó otra vez').toBe(true);
  });

  it('disparar mantiene la bandera y solo levanta el flanco al empezar', () => {
    const inputs = freshInputs();
    applyAction(inputs, 'shoot', true);
    expect(inputs.shoot).toBe(true);
    expect(inputs.shootPressed).toBe(true);

    inputs.shootPressed = false;
    applyAction(inputs, 'shoot', true); // repetición del teclado
    expect(inputs.shoot).toBe(true);
    expect(inputs.shootPressed, 'la repetición levantó el flanco').toBe(false);

    applyAction(inputs, 'shoot', false);
    expect(inputs.shoot).toBe(false);
  });

  it('cada acción declara al menos una bandera', () => {
    for (const action of ACTIONS) {
      const spec = ACTION_SPECS[action];
      expect(spec.held ?? spec.edge, `${action} no escribe nada`).toBeTruthy();
    }
  });

  it('soltar todo deja el ratón donde estaba', () => {
    // El ratón no se ha ido a ninguna parte mientras se elegía una mejora.
    const inputs = freshInputs();
    inputs.left = true;
    inputs.shoot = true;
    inputs.mouseX = 400;
    inputs.mouseSeen = true;

    releaseAll(inputs);
    expect(inputs.left).toBe(false);
    expect(inputs.shoot).toBe(false);
    expect(inputs.mouseX).toBe(400);
    expect(inputs.mouseSeen).toBe(true);
  });
});

describe('supresión del scroll del navegador', () => {
  it('cubre las teclas asignadas que desplazan la página', () => {
    const codes = preventDefaultCodes(DEFAULT_BINDINGS);
    expect(codes.has('Space')).toBe(true);
    expect(codes.has('ArrowUp')).toBe(true);
    expect(codes.has('ArrowLeft')).toBe(true);
    expect(codes.has('ArrowRight')).toBe(true);
  });

  it('no suprime letras ni el tabulador', () => {
    // Suprimir una letra rompería escribir el apodo; suprimir el tabulador deja
    // atrapado a quien navegue con teclado.
    const codes = preventDefaultCodes(DEFAULT_BINDINGS);
    expect(codes.has('Tab'), 'el tabulador es la única vía de escape').toBe(false);
    expect(codes.has('KeyA')).toBe(false);
    expect(codes.has('KeyF')).toBe(false);
  });

  it('no suprime lo que ya no está asignado', () => {
    // `ArrowDown` se suprimía para una acción que dejó de existir.
    expect(preventDefaultCodes(DEFAULT_BINDINGS).has('ArrowDown')).toBe(false);
  });

  it('sigue a las asignaciones: al mover el salto, se mueve con él', () => {
    // El orden es el que impone la propia interfaz: primero se añade la nueva y
    // solo entonces se puede soltar la vieja, porque una acción nunca puede
    // quedarse sin ninguna. `PageDown` desplaza la página, así que en cuanto
    // queda asignada hay que interceptarla o el juego haría scroll al saltar.
    const added = rebind(resetBindings(), 'jump', 'PageDown');
    const moved = unbind(added, 'jump', 'Space');

    const codes = preventDefaultCodes(moved);
    expect(codes.has('PageDown')).toBe(true);
    expect(codes.has('Space')).toBe(false);
  });
});

describe('reasignar', () => {
  it('mover un código se lo quita a quien lo tenía', () => {
    const next = rebind(resetBindings(), 'jump', 'KeyF');
    expect(next.jump).toContain('KeyF');
    expect(next.shoot).not.toContain('KeyF');
  });

  it('se niega a dejar una acción sin ninguna tecla', () => {
    const base = resetBindings();
    expect(canRelease(base, 'jump')).toBe(false); // solo tiene 'Space'
    const next = rebind(base, 'shoot', 'Space');
    expect(next, 'robó la única tecla del salto').toBe(base);
    expect(next.jump).toContain('Space');
  });

  it('soltar la última tecla de una acción no hace nada', () => {
    const base = resetBindings();
    expect(unbind(base, 'jump', 'Space')).toBe(base);
    expect(unbind(base, 'shoot', 'KeyF').shoot).toEqual(['KeyK']);
  });

  it('en el tope, la nueva entra y sale la más antigua', () => {
    const base = resetBindings();
    expect(base.dash.length).toBe(MAX_CODES_PER_ACTION);
    const next = rebind(base, 'dash', 'KeyZ');
    expect(next.dash).toContain('KeyZ');
    expect(next.dash.length).toBe(MAX_CODES_PER_ACTION);
    expect(next.dash).not.toContain('ShiftLeft');
  });

  it('reasignar y restablecer no tocan los valores por defecto', () => {
    // Devolver la constante del módulo dejaría que la pantalla de ajustes la
    // mutase, y el "restablecer" siguiente ya no restablecería nada.
    const before = JSON.stringify(DEFAULT_BINDINGS);
    const copy = resetBindings();
    rebind(copy, 'jump', 'KeyJ');
    unbind(copy, 'dash', 'KeyL');
    expect(JSON.stringify(DEFAULT_BINDINGS)).toBe(before);
    expect(copy).not.toBe(DEFAULT_BINDINGS);
    expect(copy.left).not.toBe(DEFAULT_BINDINGS.left);
  });

  it('detecta el conflicto y solo con otra acción', () => {
    const base = resetBindings();
    expect(conflictsFor(base, 'KeyA', 'jump')).toBe('left');
    expect(conflictsFor(base, 'KeyA', 'left')).toBeNull();
    expect(conflictsFor(base, 'KeyZ', 'jump')).toBeNull();
  });
});

describe('saneado desde el almacenamiento', () => {
  const cases: Array<[string, unknown]> = [
    ['null', null],
    ['indefinido', undefined],
    ['una cadena', 'KeyA'],
    ['un número', 7],
    ['vacío', {}],
    ['un array', []],
    ['acción con cadena en vez de lista', { left: 'KeyA' }],
    ['acción con lista vacía', { left: [] }],
    ['acción con basura dentro', { left: [1, null, {}, ''] }],
    ['acción desconocida', { volar: ['KeyV'] }],
  ];

  for (const [name, raw] of cases) {
    it(`sobrevive a ${name} y no deja ninguna acción huérfana`, () => {
      const result = normaliseBindings(raw);
      for (const action of ACTIONS) {
        expect(result[action].length, action).toBeGreaterThan(0);
      }
    });
  }

  it('recorta una lista desmedida al tope', () => {
    const many = Array.from({ length: 50 }, (_, i) => `KeyX${i}`);
    expect(normaliseBindings({ left: many }).left.length).toBe(MAX_CODES_PER_ACTION);
  });

  it('quita duplicados', () => {
    expect(normaliseBindings({ left: ['KeyA', 'KeyA', 'KeyA'] }).left).toEqual(['KeyA']);
  });

  it('conserva lo válido', () => {
    const saved: Bindings = { ...resetBindings(), jump: ['KeyJ'] };
    expect(normaliseBindings(saved).jump).toEqual(['KeyJ']);
  });

  it('da la vuelta a los valores por defecto sin cambiarlos', () => {
    expect(normaliseBindings(resetBindings())).toEqual(resetBindings());
  });
});

describe('etiquetas', () => {
  it('nombra los códigos que no se leen solos', () => {
    expect(codeLabel('Space')).toBe('SPACE');
    expect(codeLabel('ShiftLeft')).toBe('L SHIFT');
    expect(codeLabel('ArrowUp')).toBe('↑');
  });

  it('recorta los prefijos de letra y dígito', () => {
    expect(codeLabel('KeyA')).toBe('A');
    expect(codeLabel('Digit4')).toBe('4');
    expect(codeLabel('Numpad7')).toBe('NUM 7');
  });

  it('nunca devuelve vacío, ni con un código desconocido', () => {
    for (const action of ACTIONS) {
      for (const code of DEFAULT_BINDINGS[action]) expect(codeLabel(code).trim()).not.toBe('');
    }
    expect(codeLabel('Semicolon').trim()).not.toBe('');
  });
});
