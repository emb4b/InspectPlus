import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Signatories } from './types';

// Who signs the exported form. Today the inspector types this once and the
// device remembers it; the planned admin-defined chain of command replaces
// this provider with one that reads a synced profile — the sheet, the
// mappers and the templates don't change.
export interface SignatoryProvider {
  load(): Promise<Signatories | null>;
  save(signatories: Signatories): Promise<void>;
}

export const SIGNATORIES_STORAGE_KEY = 'export.signatories';

// What every form printed as fixed text before the approvers became
// editable — see assets/templates/recipes/*.json's sig_recommending_*/
// sig_approver_* ops. A record saved before this change (or one missing
// these fields entirely) fills them in from here rather than loading blank,
// so the exported form keeps reading the same as it always did until the
// inspector actually changes an approver.
export const DEFAULT_APPROVERS = {
  recommendingName: 'ERWIN R. LIZARDO',
  recommendingPosition: 'OIC, AWMS',
  approverName: 'ENGR. DAN GOODWIN S. BORJA',
  approverPosition: 'OIC-Chief, EMED',
};

export function emptySignatories(inspectorName?: string | null): Signatories {
  return {
    inspectorName: inspectorName ?? '',
    inspectorPosition: '',
    supervisorName: '',
    supervisorPosition: '',
    ...DEFAULT_APPROVERS,
    additionalInspectors: [],
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
// A missing or blank approver field falls back to the default rather than
// loading as an empty string, so a record saved before this change (or one
// with a field the inspector cleared by hand) still prints the name the
// form always has.
const strOrDefault = (v: unknown, fallback: string) => {
  const s = str(v);
  return s.trim() ? s : fallback;
};
const sanitizeInspectors = (v: unknown): { name: string; position: string }[] =>
  Array.isArray(v) ? v.map(row => ({ name: str((row as Record<string, unknown>)?.name), position: str((row as Record<string, unknown>)?.position) })) : [];

export const asyncStorageSignatoryProvider: SignatoryProvider = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(SIGNATORIES_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        inspectorName: str(parsed.inspectorName),
        inspectorPosition: str(parsed.inspectorPosition),
        supervisorName: str(parsed.supervisorName),
        supervisorPosition: str(parsed.supervisorPosition),
        recommendingName: strOrDefault(parsed.recommendingName, DEFAULT_APPROVERS.recommendingName),
        recommendingPosition: strOrDefault(parsed.recommendingPosition, DEFAULT_APPROVERS.recommendingPosition),
        approverName: strOrDefault(parsed.approverName, DEFAULT_APPROVERS.approverName),
        approverPosition: strOrDefault(parsed.approverPosition, DEFAULT_APPROVERS.approverPosition),
        additionalInspectors: sanitizeInspectors(parsed.additionalInspectors),
      };
    } catch {
      return null;
    }
  },
  async save(signatories) {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify(signatories));
  },
};
