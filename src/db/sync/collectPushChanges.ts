import {
  syncSchema,
  SyncEntityName,
} from '../../services/sync/syncSchema';

import {
  mapLocalListToBackend,
  LocalSyncRecord,
} from '../../services/sync/syncMappers';

import { PushChangesPayload } from '../../services/sync/syncTypes';

export interface LocalPendingRecords {
  created: LocalSyncRecord[];
  updated: LocalSyncRecord[];
  deleted: string[];
}

export interface LocalPushSourceAdapter {
  getPendingRecords(entity: SyncEntityName): Promise<LocalPendingRecords>;
}

// The backend `sync_status` column is a 3-value enum ('pending' | 'synced' |
// 'conflict') — it has no notion of the local 'pending_create' /
// 'pending_update' / 'pending_delete' states, which exist purely so this
// module can bucket records into the right created/updated/deleted array.
// Sending one of those local values through verbatim makes the RPC's enum
// cast throw and the whole push fail, so it's normalized here before the
// record ever leaves the device.
const BACKEND_PENDING_SYNC_STATUS = 'pending';

function withBackendSyncStatus(
  dto: Record<string, unknown>
): Record<string, unknown> {
  if (!('sync_status' in dto)) {
    return dto;
  }

  return { ...dto, sync_status: BACKEND_PENDING_SYNC_STATUS };
}

export async function collectPushChanges(
  adapter: LocalPushSourceAdapter
): Promise<PushChangesPayload> {
  const payload: Record<string, unknown> = {};

  const entities = Object.keys(syncSchema) as SyncEntityName[];

  for (const entity of entities) {
    const entitySchema = syncSchema[entity];

    if (!entitySchema.pushEnabled) {
      continue;
    }

    const { created, updated, deleted } = await adapter.getPendingRecords(entity);

    if (created.length === 0 && updated.length === 0 && deleted.length === 0) {
      continue;
    }

    payload[entity] = {
      created: mapLocalListToBackend(entity, created).map(withBackendSyncStatus),
      updated: mapLocalListToBackend(entity, updated).map(withBackendSyncStatus),
      deleted,
    };
  }

  return payload as PushChangesPayload;
}
