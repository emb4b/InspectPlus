import { clearSyncedRecords } from '../../db/sync/watermelonAdapter';
import { checkOnline } from '../../utils/network';
import { syncClient } from './syncClient';
import { RunSyncResult } from './syncService';
import {
  getLastSyncedUserId,
  setLastSyncedUserId,
  resetSyncMetadata,
} from './syncState';
import { notifySyncDataChanged } from './syncEvents';
import { uploadPendingAttachments } from '../../features/attachments/attachmentUploadQueue';

// The pull watermark (lastPulledAt) is a single incremental cursor: "we
// already have everything up to this point." That's only true if every
// prior pull was scoped to the same RLS-visible dataset. If a different
// inspector logs into the same device, their pull is scoped differently —
// an incremental pull would silently skip anything outside the previous
// user's jurisdiction whose updated_at is older than the watermark, even
// though the new user is allowed to see it. Clearing the already-synced
// local cache and the watermark on a detected user switch forces a full,
// correctly-scoped re-pull, and also keeps the outgoing user's synced data
// from lingering on a shared/multi-inspector device.
//
// Only rows already confirmed synced are cleared (see clearSyncedRecords) —
// anything still pending_create/pending_update/pending_delete, from *any*
// account, survives every switch untouched until it actually reaches the
// server. This used to be a full database.unsafeResetDatabase(), gated by
// an incoming-role check (skip on Developer login, since a Developer's RLS
// visibility is a superset of any inspector's and never under-scopes). That
// destroyed not-yet-synced local work on every switch it didn't skip (see
// the incident that prompted this: switching to a Dev login then back to
// the original inspector wiped that inspector's pending-create
// establishment before it ever reached the server — the role check only
// guarded the inbound Developer login, not the switch back). Since the
// clear is no longer destructive to unsynced rows, the role check is no
// longer needed for correctness.
export async function ensureSyncScopedToUser(userId: string): Promise<void> {
  const lastUserId = await getLastSyncedUserId();

  if (lastUserId && lastUserId !== userId) {
    await clearSyncedRecords();
    await resetSyncMetadata();
  }

  await setLastSyncedUserId(userId);
}

export interface RunManagedSyncOptions {
  // Skip pushing local changes to the server (pull-only sync). Also skips
  // the attachment upload pipeline below, since that's what makes
  // attachment rows push-eligible in the first place — running it while
  // skipping the push would upload files without ever syncing the metadata
  // that references them.
  skipPush?: boolean;
  // Skip pulling remote changes from the server (push-only sync).
  skipPull?: boolean;
}

// Shared entry point for every sync trigger (login, the manual "Sync Now"
// button, and any future automatic trigger) so the user-switch check above
// always runs first and every trigger notifies listeners the same way.
// Returns null without syncing if the device is offline.
export async function runManagedSync(
  userId: string,
  options: RunManagedSyncOptions = {}
): Promise<RunSyncResult | null> {
  if (!(await checkOnline())) {
    return null;
  }

  const { skipPush = false, skipPull = false } = options;

  await ensureSyncScopedToUser(userId);

  try {
    if (!skipPush) {
      // Attachments' binary files upload to Storage on their own pipeline,
      // separate from the metadata push below — a row only becomes
      // push-eligible once its file has actually landed (see
      // watermelonAdapter.ts's getPendingRecords), so this must run first for
      // a newly-captured photo to sync at all in this pass.
      await uploadPendingAttachments();
    }
    return await syncClient.runFullSync({ skipPush, skipPull });
  } finally {
    notifySyncDataChanged();
  }
}
