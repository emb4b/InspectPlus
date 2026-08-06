import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncMetadata } from './syncTypes';

const SYNC_METADATA_KEY = 'inspectplus.sync.metadata';

const DEFAULT_SYNC_METADATA: SyncMetadata = {
  lastPulledAt: null,
  lastSyncAt: null,
  isSyncing: false,
  lastSyncedUserId: null,
};

function isValidSyncMetadata(value: unknown): value is SyncMetadata {
  if (!value || typeof value !== 'object') return false;

  const v = value as Record<string, unknown>;

  const validLastPulledAt =
    v.lastPulledAt === null || typeof v.lastPulledAt === 'number';

  const validLastSyncAt =
    v.lastSyncAt === undefined ||
    v.lastSyncAt === null ||
    typeof v.lastSyncAt === 'number';

  const validIsSyncing =
    v.isSyncing === undefined || typeof v.isSyncing === 'boolean';

  const validLastSyncedUserId =
    v.lastSyncedUserId === undefined ||
    v.lastSyncedUserId === null ||
    typeof v.lastSyncedUserId === 'string';

  return validLastPulledAt && validLastSyncAt && validIsSyncing && validLastSyncedUserId;
}

export async function getSyncMetadata(): Promise<SyncMetadata> {
  const raw = await AsyncStorage.getItem(SYNC_METADATA_KEY);

  if (!raw) {
    return DEFAULT_SYNC_METADATA;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isValidSyncMetadata(parsed)) {
      return DEFAULT_SYNC_METADATA;
    }

    return {
      ...DEFAULT_SYNC_METADATA,
      ...parsed,
    };
  } catch {
    return DEFAULT_SYNC_METADATA;
  }
}

export async function setSyncMetadata(
  metadata: SyncMetadata
): Promise<void> {
  await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
}

export async function patchSyncMetadata(
  partial: Partial<SyncMetadata>
): Promise<SyncMetadata> {
  const current = await getSyncMetadata();
  const next: SyncMetadata = {
    ...current,
    ...partial,
  };

  await setSyncMetadata(next);
  return next;
}

export async function getLastPulledAt(): Promise<number> {
  const metadata = await getSyncMetadata();
  return metadata.lastPulledAt ?? 0;
}

export async function setLastPulledAt(timestamp: number): Promise<void> {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error(`Invalid lastPulledAt value: ${timestamp}`);
  }

  await patchSyncMetadata({ lastPulledAt: Math.floor(timestamp) });
}

export async function setLastSyncAt(timestamp: number): Promise<void> {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error(`Invalid lastSyncAt value: ${timestamp}`);
  }

  await patchSyncMetadata({ lastSyncAt: Math.floor(timestamp) });
}

export async function setIsSyncing(isSyncing: boolean): Promise<void> {
  await patchSyncMetadata({ isSyncing });
}

export async function resetSyncMetadata(): Promise<void> {
  await setSyncMetadata(DEFAULT_SYNC_METADATA);
}

export async function getLastSyncedUserId(): Promise<string | null> {
  const metadata = await getSyncMetadata();
  return metadata.lastSyncedUserId ?? null;
}

export async function setLastSyncedUserId(userId: string): Promise<void> {
  await patchSyncMetadata({ lastSyncedUserId: userId });
}