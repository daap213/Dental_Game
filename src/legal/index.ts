import type { Language } from '../types';
import type { LegalDocId, LegalPack } from './types';
import { legalEn } from './en';
import { legalEs } from './es';

export const LEGAL: Record<Language, LegalPack> = { en: legalEn, es: legalEs };

/** El orden de las pestañas. Términos primero: es el documento de entrada. */
export const LEGAL_DOCS: readonly LegalDocId[] = ['terms', 'privacy', 'licenses'];

export type {
  LegalBlock,
  LegalDocId,
  LegalDocument,
  LegalPack,
  LegalSection,
  LegalSpan,
} from './types';
