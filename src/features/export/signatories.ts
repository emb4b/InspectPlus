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

export function emptySignatories(inspectorName?: string | null): Signatories {
  return { inspectorName: inspectorName ?? '', inspectorPosition: '', supervisorName: '', supervisorPosition: '' };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

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
      };
    } catch {
      return null;
    }
  },
  async save(signatories) {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify(signatories));
  },
};
