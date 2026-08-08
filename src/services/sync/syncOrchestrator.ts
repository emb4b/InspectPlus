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
//
// Developer logins are exempt: a Developer's RLS visibility is a superset
// of any inspector's (read-all, plus write-all on establishments/reports/
// purpose records — see the supabase migrations granting the Developer
// role), so an incremental pull under a wider scope never has the
// under-scoping problem this wipe exists to prevent. Skipping it also
// means a Developer signing into a shared device to check on another
// inspector's work no longer destroys that inspector's still-unsynced
// local changes — see the incident that prompted this: switching to a Dev
// login wiped an inspector's pending-create establishment before it ever
// reached the server.
export async function ensureSyncScopedToUser(userId: string, role?: string | null): Promise<void> {
  const lastUserId = await getLastSyncedUserId();

  if (lastUserId && lastUserId !== userId && role !== 'Developer') {
    await database.write(() => database.unsafeResetDatabase());
    await resetSyncMetadata();
  }

  await setLastSyncedUserId(userId);
}

// Shared entry point for every sync trigger (login, the manual "Sync Now"
// button, and any future automatic trigger) so the user-switch check above
// always runs first and every trigger notifies listeners the same way.
// Returns null without syncing if the device is offline.
export async function runManagedSync(userId: string, role?: string | null): Promise<RunSyncResult | null> {
  if (!(await checkOnline())) {
    return null;
  }

  await ensureSyncScopedToUser(userId, role);

  try {
    return await syncClient.runFullSync();
  } finally {
    notifySyncDataChanged();
  }
}
