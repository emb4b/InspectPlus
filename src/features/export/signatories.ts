import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Signatories } from './types';
import { defaultApproversFor, type Approvers } from './templates';

// Who signs the exported form. Today the inspector types this once and the
// device remembers it; the planned admin-defined chain of command replaces
// this provider with one that reads a synced profile — the sheet, the
// mappers and the templates don't change.
export interface SignatoryProvider {
  load(): Promise<StoredSignatories | null>;
  // Resolves the remembered core fields plus that report type's own
  // remembered (or default) approvers — never null, since there's always a
  // sensible value to fall back to (defaultApproversFor).
  loadFor(kind: 'inspection' | 'survey', reportType: string): Promise<Signatories>;
  save(signatories: Signatories, kind: 'inspection' | 'survey', reportType: string): Promise<void>;
}

export const SIGNATORIES_STORAGE_KEY = 'export.signatories';

// What's actually persisted under SIGNATORIES_STORAGE_KEY. The inspector,
// supervisor and additional-inspectors fields are one value shared across
// every report type (there's only one inspector on the device); the
// recommending/approving signatories are remembered PER report type, keyed
// the same way templateFor looks templates up — editing the approvers for a
// Water export must never change what a Hazwaste export prefills, and vice
// versa.
export interface StoredSignatories {
  inspectorName: string;
  inspectorPosition: string;
  supervisorName: string;
  supervisorPosition: string;
  additionalInspectors: { name: string; position: string }[];
  approversByType: Record<string, Approvers>;
}

// survey reports share one key regardless of reportType, matching
// templateFor's own kind-first lookup (SURVEY_TEMPLATE_KEY).
function approversKey(kind: 'inspection' | 'survey', reportType: string): string {
  return kind === 'survey' ? 'survey' : reportType;
}

export function emptySignatories(inspectorName: string | null | undefined, kind: 'inspection' | 'survey', reportType: string): Signatories {
  return {
    inspectorName: inspectorName ?? '',
    inspectorPosition: '',
    supervisorName: '',
    supervisorPosition: '',
    ...defaultApproversFor(kind, reportType),
    additionalInspectors: [],
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
// A missing or blank approver field falls back to the given default rather
// than loading as an empty string, so a record saved before this change (or
// one with a field the inspector cleared by hand) still prints the name the
// form always has.
const strOrDefault = (v: unknown, fallback: string) => {
  const s = str(v);
  return s.trim() ? s : fallback;
};
const sanitizeInspectors = (v: unknown): { name: string; position: string }[] =>
  Array.isArray(v) ? v.map(row => ({ name: str((row as Record<string, unknown>)?.name), position: str((row as Record<string, unknown>)?.position) })) : [];

// Extracts whatever raw strings a stored approvers entry has, without
// applying any default — resolveApprovers (used by loadFor) is what
// fills blanks in with that type's own printed default, since only it
// knows which type this entry is for.
function rawApprovers(v: unknown): Partial<Approvers> {
  if (!v || typeof v !== 'object') return {};
  const row = v as Record<string, unknown>;
  return {
    recommendingName: str(row.recommendingName),
    recommendingPosition: str(row.recommendingPosition),
    approverName: str(row.approverName),
    approverPosition: str(row.approverPosition),
  };
}

function sanitizeApproversByType(v: unknown): Record<string, Approvers> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, Approvers> = {};
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const raw = rawApprovers(value);
    out[key] = {
      recommendingName: raw.recommendingName ?? '',
      recommendingPosition: raw.recommendingPosition ?? '',
      approverName: raw.approverName ?? '',
      approverPosition: raw.approverPosition ?? '',
    };
  }
  return out;
}

function resolveApprovers(saved: Approvers | undefined, fallback: Approvers): Approvers {
  return {
    recommendingName: strOrDefault(saved?.recommendingName, fallback.recommendingName),
    recommendingPosition: strOrDefault(saved?.recommendingPosition, fallback.recommendingPosition),
    approverName: strOrDefault(saved?.approverName, fallback.approverName),
    approverPosition: strOrDefault(saved?.approverPosition, fallback.approverPosition),
  };
}

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
        additionalInspectors: sanitizeInspectors(parsed.additionalInspectors),
        // A record saved by an earlier build (2a54578) has flat
        // recommendingName/etc. fields and no approversByType at all —
        // sanitizeApproversByType yields {} for it, and loadFor falls
        // through to defaultApproversFor per type below. Those flat fields
        // aren't migrated into approversByType: they were never saved
        // "for" any one report type, so there's no single type to seed.
        approversByType: sanitizeApproversByType(parsed.approversByType),
      };
    } catch {
      return null;
    }
  },

  async loadFor(kind, reportType) {
    const core = await asyncStorageSignatoryProvider.load();
    const key = approversKey(kind, reportType);
    const fallback = defaultApproversFor(kind, reportType);
    return {
      inspectorName: core?.inspectorName ?? '',
      inspectorPosition: core?.inspectorPosition ?? '',
      supervisorName: core?.supervisorName ?? '',
      supervisorPosition: core?.supervisorPosition ?? '',
      additionalInspectors: core?.additionalInspectors ?? [],
      ...resolveApprovers(core?.approversByType[key], fallback),
    };
  },

  async save(signatories, kind, reportType) {
    const core = await asyncStorageSignatoryProvider.load();
    const key = approversKey(kind, reportType);
    const next: StoredSignatories = {
      inspectorName: signatories.inspectorName,
      inspectorPosition: signatories.inspectorPosition,
      supervisorName: signatories.supervisorName,
      supervisorPosition: signatories.supervisorPosition,
      additionalInspectors: signatories.additionalInspectors,
      approversByType: {
        ...core?.approversByType,
        [key]: {
          recommendingName: signatories.recommendingName,
          recommendingPosition: signatories.recommendingPosition,
          approverName: signatories.approverName,
          approverPosition: signatories.approverPosition,
        },
      },
    };
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify(next));
  },
};
