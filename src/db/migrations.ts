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
          `UPDATE establishments SET syncState = 'pending_create' WHERE syncState = 'pending';`
        ),
        unsafeExecuteSql(
          `UPDATE purpose_of_inspection SET syncState = 'pending_create' WHERE syncState = 'pending';`
        ),
        unsafeExecuteSql(
          `UPDATE inspection_reports SET syncState = 'pending_create' WHERE syncState = 'pending';`
        ),
      ],
    },
  ],
});
