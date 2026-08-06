import { database } from '../../db/database';
import { checkOnline } from '../../utils/network';
import { syncClient } from './syncClient';
import { RunSyncResult } from './syncService';
import {
  getLastSyncedUserId,
  setLastSyncedUserId,
  resetSyncMetadata,
} from './syncState';
import { notifySyncDataChanged } from './syncEvents';

// The pull watermark (lastPulledAt) is a single incremental cursor: "we
// already have everything up to this point." That's only true if every
// prior pull was scoped to the same RLS-visible dataset. If a different
// inspector logs into the same device, their pull is scoped differently —
// an incremental pull would silently skip anything outside the previous
// user's jurisdiction whose updated_at is older than the watermark, even
// though the new user is allowed to see it. Wiping local data and the
// watermark on a detected user switch forces a full, correctly-scoped
// re-pull, and also keeps the outgoing user's data from lingering on a
// shared/multi-inspector device.
export async function ensureSyncScopedToUser(userId: string): Promise<void> {
  const lastUserId = await getLastSyncedUserId();

  if (lastUserId && lastUserId !== userId) {
    await database.write(() => database.unsafeResetDatabase());
    await resetSyncMetadata();
  }

  await setLastSyncedUserId(userId);
}

// Shared entry point for every sync trigger (login, the manual "Sync Now"
// button, and any future automatic trigger) so the user-switch check above
// always runs first and every trigger notifies listeners the same way.
// Returns null without syncing if the device is offline.
export async function runManagedSync(userId: string): Promise<RunSyncResult | null> {
  if (!(await checkOnline())) {
    return null;
  }

  await ensureSyncScopedToUser(userId);

  try {
    return await syncClient.runFullSync();
  } finally {
    notifySyncDataChanged();
  }
}
