import type { InspectionReportSummary, ComplianceView } from '../inspections/hooks/useInspectionReport';
import type { PurposeFormState } from '../inspections/types';

// What a template consumes: flat strings, or arrays of the same shape for
// row loops. Nothing else — docxtemplater would print "[object Object]".
export type TemplateData = { [key: string]: string | TemplateData[] };

export interface ExportPhoto {
  attachmentId: string;
  fileName: string;
  caption: string | null;
  capturedAt: string;
  geoLat: number | null;
  geoLng: number | null;
  localUri: string | null;
  storagePath: string | null;
  mimeType: string;
}

export interface InspectionBundle {
  kind: 'inspection';
  report: InspectionReportSummary;
  purpose: PurposeFormState | null;
  compliance: ComplianceView;
  photos: ExportPhoto[];
}

// A plain copy of the survey_reports row; the survey form doesn't exist in
// the app yet, so this is deliberately just the model's own columns.
export interface SurveyReportData {
  surveyId: string;
  reportControlNumber: string | null;
  inspectionDate: string;
  projectName: string;
  referenceCode: string | null;
  proponentName: string;
  contactPerson: string | null;
  contactPosition: string | null;
  contactNumber: string | null;
  email: string | null;
  projectLocation: string;
  geoLat: number | null;
  geoLng: number | null;
  areaSize: number | null;
  purpose: string;
  documentType: string | null;
  projectStatus: string | null;
  otherFindings: string | null;
  remarksRecommendations: string | null;
  reportStatus: string | null;
}

export interface SurveyBundle {
  kind: 'survey';
  survey: SurveyReportData;
  photos: ExportPhoto[];
}

export type ReportBundle = InspectionBundle | SurveyBundle;

export interface Signatories {
  inspectorName: string;
  inspectorPosition: string;
  supervisorName: string;
  supervisorPosition: string;
  // The recommending and approving signatories used to be printed as
  // fixed text on every form (see DEFAULT_APPROVERS in signatories.ts);
  // they're now editable, defaulting to what the forms printed before.
  recommendingName: string;
  recommendingPosition: string;
  approverName: string;
  approverPosition: string;
  // Extra inspectors under "Submitted by", beyond the primary one above —
  // see mapSignatures' sig_inspectors loop.
  additionalInspectors: { name: string; position: string }[];
}

export interface MapContext {
  signatories: Signatories;
}

// One photo as the renderer sees it: bytes already resolved and downscaled
// on the device (see photos.ts), or absent when the file isn't available.
export interface ImageInput {
  id: string;
  bytes: Uint8Array;
  mime: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

export interface ExportFailure {
  key: string;
  title: string;
  reason: string;
}

export interface ExportResult {
  // The single .docx or the .zip; null when nothing rendered.
  shareUri: string | null;
  succeeded: number;
  failures: ExportFailure[];
  skippedPhotos: number;
  cancelled: boolean;
}
