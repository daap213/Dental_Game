import { Language } from '../types';
import { TEXT } from '../i18n';

/**
 * Los informes de misión son fijos y escritos a mano. Antes los redactaba una
 * llamada a una API de IA en cada entrada al menú, con la latencia y el
 * "Cargando misión..." que eso arrastraba.
 *
 * Aquí solo viven los identificadores y el texto se hidrata del diccionario al
 * pedirlo, que es el patrón de `perks.ts`: así una traducción que falte es un
 * error de compilación en vez de un hueco en pantalla.
 */
export const BRIEFING_IDS = ['scrub', 'siege', 'decay', 'sweep', 'relief'] as const;

export type BriefingId = (typeof BRIEFING_IDS)[number];

/**
 * Se elige **al montar el menú**, nunca durante el render: el informe cambia de
 * alto según su longitud y `useFitScale` mide el contenido, así que un texto
 * distinto en cada repintado dispararía un recálculo de escala continuo.
 */
export const randomBriefingId = (): BriefingId =>
  BRIEFING_IDS[Math.floor(Math.random() * BRIEFING_IDS.length)];

export const briefingText = (id: BriefingId, lang: Language): string =>
  TEXT[lang].menu.briefings[id];
