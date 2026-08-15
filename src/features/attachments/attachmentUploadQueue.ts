import { Q } from '@nozbe/watermelondb';
import { File } from 'expo-file-system';
import { database, collections } from '../../db/database';
import { supabase } from '../../services/supabase/client';
import { withTimeout } from '../../utils/withTimeout';
import { Attachment } from '../../db/models/Attachment';

const STORAGE_BUCKET = 'attachments';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — re-signed on every display, no caching (see plan notes)
// supabase/client.ts's fetchWithAuthTimeout deliberately leaves every
// non-auth request (including every Storage call below) unbounded — see its
// comment. On a slow-but-not-dead connection, or a host the device simply
// can't reach, upload()/createSignedUrl() would otherwise hang forever with
// nothing to catch, which for getDisplayUri means a permanent loading
// spinner with no way to distinguish it from "still working". withTimeout
// (src/utils/withTimeout.ts) guards against that.
const NETWORK_TIMEOUT_MS = 15000;

function buildStoragePath(attachment: Attachment): string {
  const parentTable = attachment.inspectionReportId ? 'inspection_reports' : 'survey_reports';
  const parentId = attachment.inspectionReportId ?? attachment.surveyReportId;
  return `${attachment.inspectorUid}/${parentTable}/${parentId}/${attachment.attachmentId}-${attachment.fileName}`;
}

// Uploads any attachment whose local file hasn't reached Storage yet. Runs
// at the start of runManagedSync, before the metadata push — a row only
// becomes push-eligible once uploadStatus is 'uploaded' (see
// watermelonAdapter.ts's getPendingRecords), so this must complete first
// for a newly-captured photo to sync at all. One failure doesn't block the
// rest of the batch; a failed upload is retried on the next sync pass.
export async function uploadPendingAttachments(): Promise<void> {
  const pending = await collections.attachments
    .query(
      Q.where('uploadStatus', Q.oneOf(['pending', 'failed'])),
      Q.where('localUri', Q.notEq(null)),
      Q.where('syncState', Q.notEq('pending_delete'))
    )
    .fetch();

  for (const attachment of pending) {
    try {
      const localUri = attachment.localUri;
      if (!localUri) continue;

      const file = new File(localUri);
      if (!file.exists) {
        throw new Error(`Local attachment file missing: ${localUri}`);
      }

      // 'uploading' is only ever true for this one attachment, for the
      // brief window this loop actually spends on it — everything else
      // still queued stays 'pending'. See AttachmentThumbnail's status
      // badge: 'pending' now renders a static waiting icon rather than a
      // spinner, since a row can sit there for a long time (this app has no
      // periodic auto-sync — only login and manual "Sync Now" trigger a
      // pass), and a spinner implies active progress that isn't happening.
      //
      // Every Model.update() must run inside database.write() — Watermelon
      // enforces this at runtime ("can only be called from inside of a
      // Writer") — hence the wrapper on each of the three updates below,
      // rather than calling .update() directly as a bare await.
      await database.write(async () => {
        await attachment.update((rec: Attachment) => {
          rec.uploadStatus = 'uploading';
        });
      });

      const bytes = await file.bytes();
      const storagePath = buildStoragePath(attachment);

      const { error } = await withTimeout(
        supabase.storage.from(STORAGE_BUCKET).upload(storagePath, bytes.buffer, {
          contentType: attachment.mimeType,
          upsert: true,
        }),
        NETWORK_TIMEOUT_MS,
        'attachment upload'
      );

      if (error) throw error;

      await database.write(async () => {
        await attachment.update((rec: Attachment) => {
          rec.storagePath = storagePath;
          rec.uploadStatus = 'uploaded';
          rec.uploadError = null;
          // Push-gating (watermelonAdapter.ts) only lets an 'uploaded' row
          // through, so in the normal flow syncState is still pending_create/
          // pending_update here. This only matters if a row somehow reached
          // 'synced' before its upload finished — re-flag it so the now-real
          // storage_path actually reaches the server on the next push.
          if (rec.syncState === 'synced') {
            rec.syncState = 'pending_update';
          }
        });
      });
    } catch (error) {
      await database.write(async () => {
        await attachment.update((rec: Attachment) => {
          rec.uploadStatus = 'failed';
          rec.uploadError = error instanceof Error ? error.message : String(error);
        });
      });
    }
  }
}

// Local-first, on-demand signed URL for remote images — no local caching or
// download pipeline (see plan). A not-yet-uploaded (or still-local) photo
// uses its local file directly; anything synced from another device is
// fetched via a freshly-signed URL each time it's displayed.
export async function getDisplayUri(attachment: Attachment): Promise<string | null> {
  if (attachment.localUri) {
    const file = new File(attachment.localUri);
    if (file.exists) return attachment.localUri;
  }

  if (!attachment.storagePath) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.storage.from(STORAGE_BUCKET).createSignedUrl(attachment.storagePath, SIGNED_URL_TTL_SECONDS),
      NETWORK_TIMEOUT_MS,
      'createSignedUrl'
    );
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    // Timed out, or the underlying fetch itself rejected (e.g. no network
    // reachability to the Supabase host) — either way, nothing to display.
    return null;
  }
}
