import { Q, Model, Collection } from '@nozbe/watermelondb';
import { database, collections } from '../database';
import { syncSchema, SyncEntityName } from '../../services/sync/syncSchema';
import { LocalSyncRecord } from '../../services/sync/syncMappers';
import { PushChangesPayload } from '../../services/sync/syncTypes';
import { LocalPendingRecords, LocalPushSourceAdapter } from './collectPushChanges';
import { LocalEntitySyncAdapter } from './applyPulledChanges';

const PENDING_SYNC_STATES = ['pending_create', 'pending_update', 'pending_delete'];

function collectionFor(entity: SyncEntityName): Collection<Model> {
  switch (entity) {
    case 'establishments':
      return collections.establishments as unknown as Collection<Model>;
    case 'purpose_of_inspection':
      return collections.purposeOfInspection as unknown as Collection<Model>;
    case 'inspection_reports':
      return collections.inspectionReports as unknown as Collection<Model>;
    case 'survey_reports':
      return collections.surveyReports as unknown as Collection<Model>;
    case 'compliance_air':
      return collections.complianceAir as unknown as Collection<Model>;
    case 'compliance_water':
      return collections.complianceWater as unknown as Collection<Model>;
    case 'compliance_hazwaste':
      return collections.complianceHazwaste as unknown as Collection<Model>;
    case 'compliance_eia':
      return collections.complianceEia as unknown as Collection<Model>;
  }
}

async function findById(entity: SyncEntityName, id: string): Promise<Model | null> {
  try {
    return await collectionFor(entity).find(id);
  } catch {
    return null;
  }
}

function toLocalRecord(model: Model, localFieldNames: string[]): LocalSyncRecord {
  const record: LocalSyncRecord = {};
  const source = model as unknown as Record<string, unknown>;

  for (const fieldName of localFieldNames) {
    record[fieldName] = source[fieldName];
  }

  return record;
}

// ── Push source (local -> collectPushChanges) ─────────────────────────────

async function getPendingRecords(entity: SyncEntityName): Promise<LocalPendingRecords> {
  const entitySchema = syncSchema[entity];
  const localFieldNames = Object.values(entitySchema.fields);

  const records = await collectionFor(entity)
    .query(Q.where('syncState', Q.oneOf(PENDING_SYNC_STATES)))
    .fetch();

  const created: LocalSyncRecord[] = [];
  const updated: LocalSyncRecord[] = [];
  const deleted: string[] = [];

  for (const record of records) {
    const syncState = (record as unknown as { syncState: string }).syncState;

    if (syncState === 'pending_delete') {
      deleted.push(record.id);
      continue;
    }

    const plain = toLocalRecord(record, localFieldNames);

    if (syncState === 'pending_create') {
      created.push(plain);
    } else {
      updated.push(plain);
    }
  }

  return { created, updated, deleted };
}

export const watermelonPushSource: LocalPushSourceAdapter = { getPendingRecords };

// ── Entity adapter (pull -> applyPulledChanges) ────────────────────────────

async function upsertMany(entity: SyncEntityName, records: LocalSyncRecord[]): Promise<void> {
  const entitySchema = syncSchema[entity];
  const localPk = entitySchema.localPrimaryKey;
  const collection = collectionFor(entity);

  await database.write(async () => {
    for (const record of records) {
      const id = String(record[localPk]);
      const existing = await findById(entity, id);

      if (existing) {
        await existing.update((r: unknown) => {
          const target = r as Record<string, unknown>;
          for (const [key, value] of Object.entries(record)) {
            if (key === localPk) continue;
            target[key] = value;
          }
          // Data pulled from the server is synced by definition, regardless
          // of what sync_status it happened to carry.
          target.syncState = 'synced';
        });
      } else {
        await collection.create((r: unknown) => {
          const target = r as Record<string, unknown> & { _raw: { id: string } };
          target._raw.id = id;
          for (const [key, value] of Object.entries(record)) {
            target[key] = value;
          }
          target.syncState = 'synced';
        });
      }
    }
  });
}

async function deleteMany(entity: SyncEntityName, ids: string[]): Promise<void> {
  await database.write(async () => {
    for (const id of ids) {
      const existing = await findById(entity, id);
      if (existing) {
        await existing.destroyPermanently();
      }
    }
  });
}

async function softDeleteMany(
  entity: SyncEntityName,
  ids: string[],
  options: { deletedAtField?: string; updatedAtField?: string; now?: string } = {}
): Promise<void> {
  const entitySchema = syncSchema[entity];
  const now = options.now ?? new Date().toISOString();
  const localDeletedAtField = options.deletedAtField
    ? entitySchema.fields[options.deletedAtField]
    : undefined;
  const localUpdatedAtField = options.updatedAtField
    ? entitySchema.fields[options.updatedAtField]
    : undefined;

  await database.write(async () => {
    for (const id of ids) {
      const existing = await findById(entity, id);
      if (!existing) continue;

      await existing.update((r: unknown) => {
        const target = r as Record<string, unknown>;
        if (localDeletedAtField) target[localDeletedAtField] = now;
        if (localUpdatedAtField) target[localUpdatedAtField] = now;
        target.syncState = 'synced';
      });
    }
  });
}

export const watermelonEntityAdapter: LocalEntitySyncAdapter = {
  upsertMany,
  deleteMany,
  softDeleteMany,
};

// ── Post-push bookkeeping ───────────────────────────────────────────────────

// Flips the local records that were just successfully pushed back to
// 'synced', using the primary key values already present on the pushed DTOs
// (the WatermelonDB row id always matches the entity's own primary key —
// see rec._raw.id assignments at record-creation sites).
export async function markLocalChangesAsSynced(payload: PushChangesPayload): Promise<void> {
  await database.write(async () => {
    for (const entity of Object.keys(payload) as SyncEntityName[]) {
      const entityChanges = (payload as Record<string, { created: object[]; updated: object[] } | undefined>)[entity];
      if (!entityChanges) continue;

      const primaryKey = syncSchema[entity].primaryKey;
      const ids = [...entityChanges.created, ...entityChanges.updated].map(dto =>
        String((dto as Record<string, unknown>)[primaryKey])
      );

      for (const id of ids) {
        const existing = await findById(entity, id);
        if (!existing) continue;

        await existing.update((r: unknown) => {
          (r as Record<string, unknown>).syncState = 'synced';
        });
      }
    }
  });
}
