import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';

const asObject = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

export class SurveyReport extends Model {
  static table = 'survey_reports';

  @field('surveyId')              surveyId!: string;
  @field('estabId')               estabId!: string;
  @field('inspectorUid')          inspectorUid!: string;
  @field('reportControlNumber')   reportControlNumber!: string | null;
  @field('inspectionDate')        inspectionDate!: string;
  @field('projectName')           projectName!: string;
  @field('referenceCode')         referenceCode!: string | null;
  @field('proponentName')         proponentName!: string;
  @field('contactPerson')         contactPerson!: string | null;
  @field('contactPosition')       contactPosition!: string | null;
  @field('contactNumber')         contactNumber!: string | null;
  @field('email')                 email!: string | null;
  @field('projectLocation')       projectLocation!: string;
  @field('geoLat')                geoLat!: number | null;
  @field('geoLng')                geoLng!: number | null;
  @field('areaSize')              areaSize!: number | null;
  @field('purpose')               purpose!: string;
  @field('documentType')          documentType!: string | null;
  @field('projectStatus')         projectStatus!: string | null;
  @json('physicalParameters',      asObject) physicalParameters!: Record<string, any>;
  @json('biologicalParameters',    asObject) biologicalParameters!: Record<string, any>;
  @json('socioeconomicParameters', asObject) socioeconomicParameters!: Record<string, any>;
  @field('otherFindings')          otherFindings!: string | null;
  @field('remarksRecommendations') remarksRecommendations!: string | null;
  @field('isArchived')             isArchived!: boolean;
  @field('createdAt')              createdAt!: string;
  @field('updatedAt')              updatedAt!: string;
  @field('deletedAt')              deletedAt!: string | null;
  // ↓ 'syncState' instead of 'syncStatus'
  @field('syncState')              syncState!: string;
  @field('deviceId')               deviceId!: string;
  // Mobile-only for now — no matching Supabase column yet.
  // 'draft' | 'submitted', null on rows written before this field existed.
  @field('reportStatus')          reportStatus!: string | null;
}
