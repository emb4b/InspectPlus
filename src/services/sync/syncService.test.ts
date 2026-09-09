import { createSyncService, SyncServiceDependencies } from './syncService';
import { PushChangesPayload, PushChangesResponse } from './syncTypes';

// push_changes can reject specific "updated" rows via its last-write-wins
// guard while still returning {status:'ok'} overall — the response's
// `conflicts` field is how the client finds out which ones. This only
// verifies the wiring: that runPushSync actually forwards conflicts to
// markLocalChangesAsSynced, since silently dropping that argument is
// exactly what caused a rejected row to get wrongly marked synced (and
// then clobbered by the next pull) before this fix.
describe('createSyncService — push conflict wiring', () => {
  const payload: PushChangesPayload = {
    establishments: {
      created: [],
      updated: [{ estab_id: 'est-1' } as never],
      deleted: [],
    },
  };

  function buildDeps(pushResponse: PushChangesResponse) {
    const markLocalChangesAsSynced = jest.fn().mockResolvedValue(undefined);
    const deps: SyncServiceDependencies = {
      supabase: {
        rpc: jest.fn().mockResolvedValue({ data: pushResponse, error: null }),
      },
      collectPushChanges: jest.fn().mockResolvedValue(payload),
      applyPulledChanges: jest.fn().mockResolvedValue(undefined),
      markLocalChangesAsSynced,
    };
    return { deps, markLocalChangesAsSynced };
  }

  it('forwards conflicts from the push response to markLocalChangesAsSynced', async () => {
    const conflicts = { establishments: ['est-1'] };
    const { deps, markLocalChangesAsSynced } = buildDeps({ status: 'ok', conflicts });

    const service = createSyncService(deps);
    await service.runPushSync();

    expect(markLocalChangesAsSynced).toHaveBeenCalledWith(payload, conflicts);
  });

  it('passes undefined conflicts through when the push had none', async () => {
    const { deps, markLocalChangesAsSynced } = buildDeps({ status: 'ok' });

    const service = createSyncService(deps);
    await service.runPushSync();

    expect(markLocalChangesAsSynced).toHaveBeenCalledWith(payload, undefined);
  });
});
