import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

// v5 -> v6: compliance_air/water/hazwaste/eia never had a syncState column,
// so edits to those tables couldn't be flagged for push sync. See
// src/services/sync/syncSchema.ts for the entities these correspond to.
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
  ],
});
