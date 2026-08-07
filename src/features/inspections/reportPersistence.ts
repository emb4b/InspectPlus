import { database, collections } from '../../db/database';

// Marks a local inspection report as pending_delete. The sync pipeline
// already treats inspection_reports as a soft-delete entity end-to-end
// (see syncSchema.ts's softDelete flag and watermelonAdapter.ts's
// getPendingRecords, which buckets pending_delete rows into the push
// payload's `deleted` array) — this is the only local mutation needed to
// trigger it. The row keeps existing locally with this syncState until a
// later pull reconciles it via applyPulledChanges' softDeleteMany; callers
// must filter out pending_delete/deletedAt rows from any list/detail query
// in the meantime (see useEstablishment.ts).
export async function deleteInspectionReportRecord(reportId: string): Promise<void> {
  const now = new Date().toISOString();
  await database.write(async () => {
    const reportRecord = await collections.inspectionReports.find(reportId);
    await reportRecord.update(rec => {
      rec.syncState = 'pending_delete';
      rec.updatedAt = now;
    });
  });
}
