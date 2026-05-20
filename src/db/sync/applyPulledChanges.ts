import {
  syncSchema,
  SyncEntityName,
  getSyncEntitySchema,
} from '../../services/sync/syncSchema';

import {
  mapBackendToLocal,
  normalizeMappedRecord,
  LocalSyncRecord,
} from '../../services/sync/syncMappers';

import { PullChangesResponse } from '../../services/sync/syncTypes';

export interface ApplyEntityChangesParams {
  entity: SyncEntityName;
  created: object[];
  updated: object[];
  deleted: string[];
}

export interface LocalEntitySyncAdapter {
  upsertMany(
    entity: SyncEntityName,
    records: LocalSyncRecord[]
  ): Promise<void>;

  deleteMany(
    entity: SyncEntityName,
    ids: string[]
  ): Promise<void>;

  softDeleteMany?(
    entity: SyncEntityName,
    ids: string[],
    options?: {
      deletedAtField?: string;
      updatedAtField?: string;
      now?: string;
    }
  ): Promise<void>;
}

function toLocalRecords(
  entity: SyncEntityName,
  rows: object[]
): LocalSyncRecord[] {
  return rows.map((row) =>
    normalizeMappedRecord(
      mapBackendToLocal(entity, row),
      {
        nullifyUndefined: false,
      }
    )
  );
}

export async function applyEntityChanges(
  adapter: LocalEntitySyncAdapter,
  params: ApplyEntityChangesParams
): Promise<void> {
  const {
    entity,
    created,
    updated,
    deleted,
  } = params;

  const entitySchema = getSyncEntitySchema(entity);

  const createdRecords = toLocalRecords(entity, created);
  const updatedRecords = toLocalRecords(entity, updated);

  if (createdRecords.length > 0) {
    await adapter.upsertMany(entity, createdRecords);
  }

  if (updatedRecords.length > 0) {
    await adapter.upsertMany(entity, updatedRecords);
  }

  if (deleted.length > 0) {
    if (entitySchema.softDelete && adapter.softDeleteMany) {
      await adapter.softDeleteMany(entity, deleted, {
        deletedAtField: entitySchema.deletedAtField ?? undefined,
        updatedAtField: entitySchema.updatedAtField ?? undefined,
        now: new Date().toISOString(),
      });
    } else {
      await adapter.deleteMany(entity, deleted);
    }
  }
}

export async function applyPulledChanges(
  adapter: LocalEntitySyncAdapter,
  changes: PullChangesResponse['changes']
): Promise<void> {
  const orderedEntities = Object.keys(
    syncSchema
  ) as SyncEntityName[];

  for (const entity of orderedEntities) {
    const entityChanges = changes[entity];

    if (!entityChanges) {
      continue;
    }

    await applyEntityChanges(adapter, {
      entity,
      created: entityChanges.created as object[],
      updated: entityChanges.updated as object[],
      deleted: entityChanges.deleted ?? [],
    });
  }
}