import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Attachment extends Model {
  static table = 'attachments';

  @field('attachmentId')      attachmentId!: string;
  @field('inspectionReportId') inspectionReportId!: string | null;
  @field('surveyReportId')    surveyReportId!: string | null;
  @field('inspectorUid')      inspectorUid!: string;
  @field('storagePath')       storagePath!: string | null;
  @field('fileName')          fileName!: string;
  @field('mimeType')          mimeType!: string;
  @field('fileSize')          fileSize!: number;
  @field('geoLat')            geoLat!: number | null;
  @field('geoLng')            geoLng!: number | null;
  @field('capturedAt')        capturedAt!: string;
  @field('caption')           caption!: string | null;
  @field('deviceId')          deviceId!: string;
  @field('createdAt')         createdAt!: string;
  @field('updatedAt')         updatedAt!: string;
  @field('deletedAt')         deletedAt!: string | null;
  // ↓ 'syncState' instead of 'syncStatus'
  @field('syncState')         syncState!: string;
  // Local-only — never synced, see schema.ts's column comment.
  @field('localUri')          localUri!: string | null;
  // 'pending' | 'uploading' | 'uploaded' | 'failed'
  @field('uploadStatus')      uploadStatus!: string;
  @field('uploadError')       uploadError!: string | null;
}
