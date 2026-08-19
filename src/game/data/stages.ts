import type { Material } from './palette';
import type { Opening } from './opening';

/**
 * Escena de cada fase.
 *
 * Esto era solo una paleta: tres nombres de rampa por fase. Y ahí estaba la raíz
 * de que las cinco fases fuesen **la misma imagen con otro color**, porque la
 * composición del fondo estaba incrustada en el código de dibujo y lo único que
 * podía cambiar era el tinte.
 *
 * Ahora cada fase describe **qué se ve**: en qué parte de la boca estamos, cómo
 * son sus dientes, qué capas entran, cuánto deterioro tiene cada cosa y qué
 * instrumento trae el dentista. El código de las capas es el mismo para todas; lo
 * que cambia es este descriptor. Añadir variedad pasa a ser editar datos.
 *
 * La progresión sigue contando una historia clínica —de una boca sana a la
 * podredumbre— pero ahora también **recorre la boca**: del fondo hacia delante y,
 * al final, fuera de ella.
 */

export type StageId = 'healthy' | 'gingivitis' | 'tartar' | 'deep_infection' | 'void';

/** En qué parte de la boca ocurre la fase. Decide la composición. */
export type Zone = 'molars' | 'premolars' | 'front' | 'palate' | 'clinic';

/** Lo que el dentista trae en la mano. Uno por fase. */
export type Instrument = 'mirror' | 'probe' | 'scaler' | 'drill' | 'syringe';

/**
 * Capas del fondo que entran en una fase.
 *
 * Es un **conjunto**, no un orden: el orden de dibujado sale siempre de la pila
 * canónica de `render/background/stack.ts`, para que un dato mal escrito no pueda
 * poner una capa lejana por delante de una cercana. Aun así se escriben en el
 * orden de la pila, y un test lo comprueba, para que el fichero se lea honesto.
 *
 * Aquí solo pueden aparecer capas que existan de verdad; `stack.test.ts` lo
 * verifica.
 */
export type LayerId = 'throat' | 'clinic' | 'mouth' | 'props';

/**
 * Qué se ve por la abertura de la boca.
 *
 * Las referencias muestran las dos posibilidades: en una, el dentista llena el hueco;
 * en la otra no hay dentista y lo que hay es el foco reventado con el instrumental
 * entrando en cuadro. Alternarlas es lo que más diferencia unas fases de otras.
 */
export type ThroughOpening =
  /** Un resquicio de luz y poco más: estás al fondo de la boca. */
  | 'gap'
  /** El foco y la pared de azulejo. */
  | 'lamp'
  /** El dentista asomándose, a contraluz. */
  | 'dentist'
  /** Luz sucia y turbia: la boca a medio cerrar. */
  | 'grime';

/**
 * Cuánto está estropeada la boca, de 0 a 1 cada cosa.
 *
 * Están separados a propósito en vez de un único "nivel de asco": el sarro y la
 * caries no se dibujan igual ni van al mismo sitio —el sarro se acumula en el
 * cuello del diente, la caries agujerea la corona—, y la inflamación afecta a la
 * encía y no al esmalte.
 */
export interface Decay {
  /** Placa: película blanda, se pega al cuello del diente. */
  plaque: number;
  /** Sarro: costra dura y gris, crece desde la encía. */
  tartar: number;
  /** Caries: agujeros oscuros en la corona. */
  cavities: number;
  /** Manchas: el esmalte virado a amarillo. */
  stain: number;
  /** Inflamación: la encía hinchada y enrojecida. */
  inflammation: number;
}

export interface StageScene {
  /** Descriptivo, y clave de la Base de Datos del menú y de la galería. */
  id: StageId;
  zone: Zone;

  // --- Tinte (lo que ya existía) ---
  /** Rampa del fondo: la garganta y la carne. */
  ramp: Material;
  /** Rampa de las encías de primer plano. */
  gumRamp: Material;
  /** Rampa de los dientes del fondo. */
  toothRamp: Material;
  /** Rampa de las paredes laterales. */
  cheekRamp: Material;

  // --- Composición ---
  /** Capas que entran en esta fase, en orden de profundidad. */
  layers: readonly LayerId[];
  /**
   * La abertura de la boca, de la que sale todo el encuadre.
   *
   * Sustituye a las medidas del diente y a la curvatura de la arcada, que era lo que
   * había antes: el tamaño de cada pieza ya no es un dato, sale de su posición en la
   * curva —los de los bordes están más cerca de la cámara y por eso son mayores—.
   */
  opening: Opening;
  /** Qué se ve al fondo por ella. */
  throughOpening: ThroughOpening;
  /** Probabilidad de que falte un diente. Cuenta más historia que cualquier mancha. */
  gaps: number;

  // --- Estado clínico y ambiente ---
  decay: Decay;
  /** Hilos de saliva entre las arcadas. */
  saliva: number;
  /** Vaho de la lámpara y del instrumental. */
  steam: number;
  instrument: Instrument;
}

/** Sin deterioro. Base para no repetir cinco ceros en la fase sana. */
const CLEAN: Decay = { plaque: 0, tartar: 0, cavities: 0, stain: 0, inflammation: 0 };

export const STAGE_SCENES: readonly StageScene[] = [
  /**
   * Fase 1 · Molares del fondo. Boca sana: la primera imagen del juego, así que
   * es la que tiene que dejar claro de un vistazo dónde estamos. Arcada de
   * molares anchos, encía rosa, esmalte limpio y brillo húmedo.
   */
  {
    id: 'healthy',
    zone: 'molars',
    ramp: 'gum',
    gumRamp: 'gum',
    toothRamp: 'enamel',
    cheekRamp: 'mucosa',
    layers: ['throat', 'clinic', 'mouth', 'props'],
    // Al fondo de la boca: la abertura es un resquicio lejano y la herradura se
    // cierra casi del todo.
    opening: { halfW: 0.5, halfH: 70, cy: 262, taper: 0.5, drop: 72 },
    throughOpening: 'gap',
    gaps: 0,
    decay: CLEAN,
    saliva: 0.35,
    steam: 0,
    instrument: 'mirror',
  },

  /**
   * Fase 2 · Premolares. Gingivitis: la encía se inflama y sangra al roce, y
   * aparece la primera placa en los cuellos. Dientes algo más estrechos y ya se
   * ve la arcada inferior.
   */
  {
    id: 'gingivitis',
    zone: 'premolars',
    ramp: 'gum',
    gumRamp: 'gumSick',
    toothRamp: 'enamel',
    cheekRamp: 'mucosa',
    layers: ['throat', 'clinic', 'mouth', 'props'],
    // Premolares: la abertura ya deja ver el foco.
    opening: { halfW: 0.5, halfH: 78, cy: 256, taper: 0.4, drop: 62 },
    throughOpening: 'lamp',
    gaps: 0,
    decay: { plaque: 0.35, tartar: 0.1, cavities: 0, stain: 0.2, inflammation: 0.55 },
    saliva: 0.5,
    steam: 0,
    instrument: 'probe',
  },

  /**
   * Fase 3 · Caninos e incisivos. Sarro: costra gris desde la encía, esmalte
   * amarillo y la primera caries. Dientes estrechos y altos, y ya falta alguno.
   */
  {
    id: 'tartar',
    zone: 'front',
    ramp: 'gum',
    gumRamp: 'gumSick',
    toothRamp: 'enamelStained',
    cheekRamp: 'mucosa',
    layers: ['throat', 'clinic', 'mouth', 'props'],
    // Incisivos: la boca está bien abierta y por el hueco cabe el dentista entero.
    opening: { halfW: 0.5, halfH: 92, cy: 248, taper: 0.26, drop: 48 },
    throughOpening: 'dentist',
    gaps: 0.08,
    // La inflamación no baja respecto a la gingivitis: el sarro irrita la encía,
    // así que la sigue empujando hacia arriba.
    decay: { plaque: 0.6, tartar: 0.65, cavities: 0.3, stain: 0.7, inflammation: 0.62 },
    saliva: 0.6,
    steam: 0.15,
    instrument: 'scaler',
  },

  /**
   * Fase 4 · Paladar y garganta. Infección profunda: aquí la boca deja de ser un
   * pasillo de dientes y se mira hacia arriba y hacia dentro. El paladar y la
   * garganta se comen la pantalla, la encía está en carne viva y quedan pocos
   * dientes en pie.
   */
  {
    id: 'deep_infection',
    zone: 'palate',
    ramp: 'fiend',
    gumRamp: 'gumSick',
    toothRamp: 'enamelStained',
    cheekRamp: 'mucosa',
    layers: ['throat', 'clinic', 'mouth', 'props'],
    // Infección profunda: la boca a medio cerrar. La abertura se achata y la luz que
    // entra está sucia.
    opening: { halfW: 0.5, halfH: 68, cy: 264, taper: 0.55, drop: 78 },
    throughOpening: 'grime',
    gaps: 0.22,
    decay: { plaque: 0.8, tartar: 0.8, cavities: 0.75, stain: 0.85, inflammation: 0.9 },
    saliva: 0.8,
    steam: 0.35,
    instrument: 'drill',
  },

  /**
   * Fase 5 · Quirófano. Ya no estamos dentro de una boca: el Vacío es el campo
   * estéril visto desde la bandeja, con focos, piedra e instrumental. La carne
   * desaparece, y con ella las encías y la saliva.
   */
  {
    id: 'void',
    zone: 'clinic',
    ramp: 'void',
    gumRamp: 'void',
    toothRamp: 'stone',
    cheekRamp: 'void',
    // **Sin marco de boca**: en el quirófano ya se está fuera, sobre la bandeja, y
    // la clínica pasa de ser lo que se ve por un hueco a ser el escenario entero.
    layers: ['throat', 'clinic', 'props'],
    opening: { halfW: 0.5, halfH: 200, cy: 225, taper: 0, drop: 0 },
    throughOpening: 'lamp',
    gaps: 0.3,
    decay: { plaque: 0.9, tartar: 0.9, cavities: 0.9, stain: 1, inflammation: 1 },
    saliva: 0,
    steam: 0.6,
    instrument: 'syringe',
  },
];

/** Cualquier fase fuera de rango usa la última, igual que hacía el `else`. */
export const getStageScene = (stage: number): StageScene =>
  STAGE_SCENES[stage - 1] ?? STAGE_SCENES[STAGE_SCENES.length - 1];

/**
 * Vista reducida a las tres rampas de siempre.
 *
 * Se conserva porque hay consumidores —la Base de Datos del menú, la galería—
 * a los que solo les interesa el tinte, y no tienen por qué enterarse de que la
 * fase ahora describe una escena entera.
 */
export interface StagePalette {
  id: StageId;
  ramp: Material;
  gumRamp: Material;
  toothRamp: Material;
}

export const STAGE_PALETTES: readonly StagePalette[] = STAGE_SCENES.map(
  ({ id, ramp, gumRamp, toothRamp }) => ({ id, ramp, gumRamp, toothRamp })
);

export const getStagePalette = (stage: number): StagePalette => {
  const scene = getStageScene(stage);
  return {
    id: scene.id,
    ramp: scene.ramp,
    gumRamp: scene.gumRamp,
    toothRamp: scene.toothRamp,
  };
};
