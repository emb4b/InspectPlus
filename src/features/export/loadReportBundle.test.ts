import { loadReportBundle } from './loadReportBundle';

const mockDetail = jest.fn();
jest.mock('../inspections/hooks/loadInspectionReportDetail', () => ({
  loadInspectionReportDetail: (...args: unknown[]) => mockDetail(...args),
}));
const mockFetch = jest.fn();
jest.mock('../../db/database', () => ({
  database: {},
  collections: new Proxy({}, {
    get: (_t, name: string) => ({ query: (...args: unknown[]) => ({ fetch: () => mockFetch(name, args) }) }),
  }),
}));

const viewer = { uid: 'u1', province: 'P', role: 'Inspector' };
const attachment = {
  attachmentId: 'a1', fileName: 'IMG_1.jpg', caption: 'gate', capturedAt: '2026-09-01T01:00:00Z',
  geoLat: 13.1, geoLng: 121.2, localUri: 'file:///a1.jpg', storagePath: 'x/a1.jpg', mimeType: 'image/jpeg', deletedAt: null,
};

describe('loadReportBundle', () => {
  beforeEach(() => { mockDetail.mockReset(); mockFetch.mockReset(); });

  it('wraps an inspection detail and its live attachments as plain data, oldest first', async () => {
    mockDetail.mockResolvedValue({
      report: { reportId: 'r1' }, purpose: null, compliance: { kind: 'none' },
      attachments: [
        { ...attachment, attachmentId: 'a3', capturedAt: '2026-09-02T00:00:00Z' },
        attachment,
        { ...attachment, attachmentId: 'a2', deletedAt: '2026-09-02' },
      ],
    });
    const bundle = await loadReportBundle({ kind: 'inspection', reportId: 'r1' }, viewer);
    expect(bundle.kind).toBe('inspection');
    expect(bundle.photos.map(p => p.attachmentId)).toEqual(['a1', 'a3']);
    expect(bundle.photos[0]).toEqual({
      attachmentId: 'a1', fileName: 'IMG_1.jpg', caption: 'gate', capturedAt: '2026-09-01T01:00:00Z',
      geoLat: 13.1, geoLng: 121.2, localUri: 'file:///a1.jpg', storagePath: 'x/a1.jpg', mimeType: 'image/jpeg',
    });
  });

  it('throws when the inspection report is missing or hidden', async () => {
    mockDetail.mockResolvedValue(null);
    await expect(loadReportBundle({ kind: 'inspection', reportId: 'r1' }, viewer)).rejects.toThrow('Report not found');
  });

  it('copies a survey row and its attachments', async () => {
    mockFetch.mockImplementation((name: string) => Promise.resolve(
      name === 'surveyReports'
        ? [{ surveyId: 's1', reportControlNumber: 'SR-1', inspectionDate: '2026-09-03', projectName: 'Bridge', referenceCode: null, proponentName: 'DPWH', contactPerson: null, contactPosition: null, contactNumber: null, email: null, projectLocation: 'Calapan', geoLat: null, geoLng: null, areaSize: 2.5, purpose: 'ECC Application', documentType: 'IEE Checklist', projectStatus: 'Pre-construction', otherFindings: null, remarksRecommendations: 'ok', reportStatus: 'draft' }]
        : name === 'attachments' ? [attachment] : [],
    ));
    const bundle = await loadReportBundle({ kind: 'survey', reportId: 's1' }, viewer);
    expect(bundle.kind).toBe('survey');
    if (bundle.kind === 'survey') {
      expect(bundle.survey.projectName).toBe('Bridge');
      expect(bundle.survey.areaSize).toBe(2.5);
    }
    expect(bundle.photos).toHaveLength(1);
  });

  it('throws when the survey is missing', async () => {
    mockFetch.mockResolvedValue([]);
    await expect(loadReportBundle({ kind: 'survey', reportId: 's1' }, viewer)).rejects.toThrow('Report not found');
  });
});
