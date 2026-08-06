import { supabase } from '../supabase/client';
import { createSyncService, SyncServiceDependencies } from './syncService';
import { collectPushChanges } from '../../db/sync/collectPushChanges';
import { applyPulledChanges } from '../../db/sync/applyPulledChanges';
import {
  watermelonPushSource,
  watermelonEntityAdapter,
  markLocalChangesAsSynced,
} from '../../db/sync/watermelonAdapter';

// supabase-js's rpc() takes an AbortSignal via a chained .abortSignal() call,
// not as an `options.signal` — this adapts it to the plain rpc() shape the
// sync service depends on (see SyncServiceDependencies in ./syncService).
const supabaseRpc: SyncServiceDependencies['supabase'] = {
  async rpc<TResponse>(
    fn: string,
    args?: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ) {
    let builder = supabase.rpc(fn, args);
    if (options?.signal) {
      builder = builder.abortSignal(options.signal);
    }
    const { data, error } = await builder;
    return { data: data as TResponse | null, error };
  },
};

export const syncClient = createSyncService({
  supabase: supabaseRpc,
  collectPushChanges: () => collectPushChanges(watermelonPushSource),
  applyPulledChanges: changes => applyPulledChanges(watermelonEntityAdapter, changes),
  markLocalChangesAsSynced,
});
