import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
