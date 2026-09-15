import { Q } from '@nozbe/watermelondb';
import { collections } from '../../db/database';
import type { Attachment } from '../../db/models/Attachment';
import { loadInspectionReportDetail, Viewer } from '../inspections/hooks/loadInspectionReportDetail';
import type { ExportPhoto, ReportBundle, SurveyReportData } from './types';

export type { Viewer };

export interface ReportRef {
  kind: 'inspection' | 'survey';
  reportId: string;
}

// Everything the mappers need for one report, as plain data. WatermelonDB
// models stop here so the mapper layer can be tested with literals.
function toPhoto(a: Attachment): ExportPhoto {
  return {
    attachmentId: a.attachmentId,
    fileName: a.fileName,
    caption: a.caption,
    capturedAt: a.capturedAt,
    geoLat: a.geoLat,
    geoLng: a.geoLng,
    localUri: a.localUri,
    storagePath: a.storagePath,
    mimeType: a.mimeType,
  };
}

const livePhotos = (attachments: Attachment[]): ExportPhoto[] =>
  attachments
    .filter(a => !a.deletedAt)
    .map(toPhoto)
    .sort((x, y) => x.capturedAt.localeCompare(y.capturedAt));

export async function loadReportBundle(item: ReportRef, viewer: Viewer): Promise<ReportBundle> {
  if (item.kind === 'inspection') {
    const detail = await loadInspectionReportDetail(item.reportId, viewer);
    if (!detail) throw new Error('Report not found');
    return {
      kind: 'inspection',
      report: detail.report,
      purpose: detail.purpose,
      compliance: detail.compliance,
      photos: livePhotos(detail.attachments),
    };
  }

  const surveys = await collections.surveyReports.query(Q.where('surveyId', item.reportId)).fetch();
  const s = surveys[0];
  if (!s) throw new Error('Report not found');
  const attachments = await collections.attachments.query(Q.where('surveyReportId', s.surveyId)).fetch();
  const survey: SurveyReportData = {
    surveyId: s.surveyId,
    reportControlNumber: s.reportControlNumber,
    inspectionDate: s.inspectionDate,
    projectName: s.projectName,
    referenceCode: s.referenceCode,
    proponentName: s.proponentName,
    contactPerson: s.contactPerson,
    contactPosition: s.contactPosition,
    contactNumber: s.contactNumber,
    email: s.email,
    projectLocation: s.projectLocation,
    geoLat: s.geoLat,
    geoLng: s.geoLng,
    areaSize: s.areaSize,
    purpose: s.purpose,
    documentType: s.documentType,
    projectStatus: s.projectStatus,
    otherFindings: s.otherFindings,
    remarksRecommendations: s.remarksRecommendations,
    reportStatus: s.reportStatus,
  };
  return { kind: 'survey', survey, photos: livePhotos(attachments) };
}
