import { schemaMigrations, addColumns, unsafeExecuteSql } from '@nozbe/watermelondb/Schema/migrations';

// v5 -> v6: compliance_air/water/hazwaste/eia never had a syncState column,
// so edits to those tables couldn't be flagged for push sync. See
// src/services/sync/syncSchema.ts for the entities these correspond to.
//
// v6 -> v7: establishments gains lastSyncedSnapshot, a JSON snapshot of its
// content fields as of the last successful sync — see schema.ts's column
// comment and establishmentPersistence.ts's resolveEstablishmentContentEdit.
// Existing rows get NULL here (no known baseline yet); the dirty-check falls
// back to comparing against the live record until the next successful sync
// populates it.
//
// v7 -> v8: establishments, purpose_of_inspection, and inspection_reports
// rows created before the Supabase push/pull pipeline (see a4cba93) were
// stamped with the old generic syncState = 'pending'. getPendingRecords in
// src/db/sync/watermelonAdapter.ts only selects 'pending_create' /
// 'pending_update' / 'pending_delete', so those legacy rows were silently
// excluded from every push. Backfill them to 'pending_create' — correct
// here since a never-synced row has nothing to update on the server yet —
// so they're picked up on the next sync. compliance_* and survey_reports
// never used the old 'pending' literal (their syncState support was added
// together with the new convention), so they don't need backfilling.
//
// This also catches establishments stuck in a *false* 'synced' state: an
// early build of markLocalChangesAsSynced (before it started stamping
// lastSyncedSnapshot — see the v6->v7 migration above) flipped a row to
// 'synced' the moment push_changes returned {"status":"ok"}, without
// confirming that specific row actually landed server-side (e.g. it was
// silently dropped by `on conflict (estab_id) do nothing` or an RLS
// mismatch). Since every genuine successful sync now always sets
// lastSyncedSnapshot alongside 'synced', a 'synced' establishment with no
// snapshot is unreachable via current code and is a reliable signature of
// that earlier bug — reset it to 'pending_create' too.
//
// v8 -> v9: establishments gains operatingStatusSince — the date (kept as
// free text; see flexibleDate.ts) an establishment became closed/non-
// operational, shown in place of the operating hours/days fields once
// operatingStatus isn't 'Operational'.
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'compliance_air',
          columns: [{ name: 'syncState', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'compliance_water',
          columns: [{ name: 'syncState', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'compliance_hazwaste',
          columns: [{ name: 'syncState', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'compliance_eia',
          columns: [{ name: 'syncState', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'establishments',
          columns: [{ name: 'lastSyncedSnapshot', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        unsafeExecuteSql(
          `UPDATE establishments SET syncState = 'pending_create' WHERE syncState = 'pending' OR (syncState = 'synced' AND lastSyncedSnapshot IS NULL);`
        ),
        unsafeExecuteSql(
          `UPDATE purpose_of_inspection SET syncState = 'pending_create' WHERE syncState = 'pending';`
        ),
        unsafeExecuteSql(
          `UPDATE inspection_reports SET syncState = 'pending_create' WHERE syncState = 'pending';`
        ),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'establishments',
          columns: [{ name: 'operatingStatusSince', type: 'string', isOptional: true }],
        }),
      ],
    },
  ],
});
