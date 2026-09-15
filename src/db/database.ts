import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { assertMigrationsCoverSchema } from './migrationGuard';
import {
  Establishment,
  InspectionReport,
  SurveyReport,
  PurposeOfInspection,
  ComplianceAir,
  ComplianceWater,
  ComplianceHazwaste,
  ComplianceEia,
  Attachment,
} from './models';

// A schema version the migrations can't reach makes the adapter reset the
// store instead of migrating it - see migrationGuard.ts. Crash here rather
// than let that happen to an inspector's unsynced work.
assertMigrationsCoverSchema(schema, migrations);

// ── SQLite adapter ────────────────────────────────────────────────────────────
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,        // uses JSI for better performance on Hermes
  onSetUpError: error => {
    console.error('[WatermelonDB] Database setup failed:', error);
  },
});

// ── Database instance ─────────────────────────────────────────────────────────
// Single shared instance — import `database` anywhere you need DB access.
export const database = new Database({
  adapter,
  modelClasses: [
    Establishment,
    InspectionReport,
    SurveyReport,
    PurposeOfInspection,
    ComplianceAir,
    ComplianceWater,
    ComplianceHazwaste,
    ComplianceEia,
    Attachment,
  ],
});

// ── Collection accessors ──────────────────────────────────────────────────────
// Use these instead of database.collections.get('table_name') to keep
// everything typed and centralized.
export const collections = {
  establishments:      database.collections.get<Establishment>('establishments'),
  inspectionReports:   database.collections.get<InspectionReport>('inspection_reports'),
  surveyReports:       database.collections.get<SurveyReport>('survey_reports'),
  purposeOfInspection: database.collections.get<PurposeOfInspection>('purpose_of_inspection'),
  complianceAir:       database.collections.get<ComplianceAir>('compliance_air'),
  complianceWater:     database.collections.get<ComplianceWater>('compliance_water'),
  complianceHazwaste:  database.collections.get<ComplianceHazwaste>('compliance_hazwaste'),
  complianceEia:       database.collections.get<ComplianceEia>('compliance_eia'),
  attachments:         database.collections.get<Attachment>('attachments'),
};
