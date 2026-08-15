import { Q } from '@nozbe/watermelondb';
import { Directory, File, Paths } from 'expo-file-system';
import { database, collections } from '../../db/database';
import { generateId } from '../../utils/crypto';
import { notifySyncDataChanged } from '../../services/sync/syncEvents';
import { Attachment } from '../../db/models/Attachment';

export type AttachmentParentType = 'inspection' | 'survey';

// Persistent app storage — the source URI from the camera/picker is often a
// transient cache path the OS can clear, so the file is copied here before
// the record is created. The upload pipeline (attachmentUploadQueue.ts)
// reads from this copy, not the original source URI.
const ATTACHMENTS_DIR = new Directory(Paths.document, 'attachments');

function ensureAttachmentsDir(): void {
  if (!ATTACHMENTS_DIR.exists) {
    ATTACHMENTS_DIR.create({ intermediates: true });
  }
}

export interface CreateAttachmentInput {
  parentType: AttachmentParentType;
  parentId: string;
  inspectorUid: string;
  deviceId: string;
  sourceUri: string;
  fileName: string;
  mimeType: string;
  geoLat?: number | null;
  geoLng?: number | null;
}

// Copies the picked/captured file into persistent app storage and creates
// the local WatermelonDB row with uploadStatus: 'pending'. The binary file
// itself uploads separately and later — see attachmentUploadQueue.ts — this
// only queues it; the row isn't push-eligible until that upload succeeds
// (enforced in watermelonAdapter.ts's getPendingRecords).
export async function createAttachmentRecord(input: CreateAttachmentInput): Promise<string> {
  ensureAttachmentsDir();

  const attachmentId = generateId();
  const sourceFile = new File(input.sourceUri);
  const destFile = new File(ATTACHMENTS_DIR, `${attachmentId}${sourceFile.extension}`);
  sourceFile.copy(destFile);

  const now = new Date().toISOString();

  await database.write(async () => {
    await collections.attachments.create((rec: Attachment) => {
      rec._raw.id = attachmentId;
      rec.attachmentId = attachmentId;
      rec.inspectionReportId = input.parentType === 'inspection' ? input.parentId : null;
      rec.surveyReportId = input.parentType === 'survey' ? input.parentId : null;
      rec.inspectorUid = input.inspectorUid;
      rec.storagePath = null;
      rec.fileName = input.fileName;
      rec.mimeType = input.mimeType;
      rec.fileSize = destFile.size;
      rec.geoLat = input.geoLat ?? null;
      rec.geoLng = input.geoLng ?? null;
      rec.capturedAt = now;
      rec.caption = null;
      rec.deviceId = input.deviceId;
      rec.createdAt = now;
      rec.updatedAt = now;
      rec.deletedAt = null;
      rec.syncState = 'pending_create';
      rec.localUri = destFile.uri;
      rec.uploadStatus = 'pending';
      rec.uploadError = null;
    });
  });

  notifySyncDataChanged();
  return attachmentId;
}

// Mirrors deleteInspectionReportRecord's pattern (reportPersistence.ts): a
// never-synced row (still pending_create) has nothing to reconcile with the
// server, so it's hard-deleted along with its local file copy; anything
// already synced (or mid-sync) is soft-deleted instead and reconciled by a
// later pull. Takes an array (used for the multi-select bulk-delete flow —
// there's no per-tile delete button, see AttachmentsSection) and does every
// row in one transaction rather than one per id.
export async function deleteAttachmentRecords(attachmentIds: string[]): Promise<void> {
  if (attachmentIds.length === 0) return;

  const now = new Date().toISOString();

  await database.write(async () => {
    for (const attachmentId of attachmentIds) {
      const record = await collections.attachments.find(attachmentId);

      if (record.localUri) {
        try {
          new File(record.localUri).delete();
        } catch {
          // Best-effort — a missing/already-cleared local file isn't fatal.
        }
      }

      if (record.syncState === 'pending_create') {
        await record.destroyPermanently();
      } else {
        await record.update((rec: Attachment) => {
          rec.syncState = 'pending_delete';
          rec.updatedAt = now;
        });
      }
    }
  });

  notifySyncDataChanged();
}

// Blank string is treated the same as clearing the caption entirely — an
// attachment with caption: '' vs caption: null is not a distinction worth
// keeping, and it keeps the "does this photo have a caption" check
// (`!!attachment.caption`) simple everywhere it's used.
export async function updateAttachmentCaption(attachmentId: string, caption: string): Promise<void> {
  const trimmed = caption.trim();
  const now = new Date().toISOString();

  await database.write(async () => {
    const record = await collections.attachments.find(attachmentId);
    await record.update((rec: Attachment) => {
      rec.caption = trimmed || null;
      rec.updatedAt = now;
      if (rec.syncState === 'synced') {
        rec.syncState = 'pending_update';
      }
    });
  });

  notifySyncDataChanged();
}

export async function getAttachmentsForParent(
  parentType: AttachmentParentType,
  parentId: string
): Promise<Attachment[]> {
  const field = parentType === 'inspection' ? 'inspectionReportId' : 'surveyReportId';

  return collections.attachments
    .query(
      Q.where(field, parentId),
      Q.where('deletedAt', null),
      Q.where('syncState', Q.notEq('pending_delete'))
    )
    .fetch();
}
