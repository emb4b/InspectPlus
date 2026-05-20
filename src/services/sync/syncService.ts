import { pullChanges } from './pullChanges';
import { pushChanges, hasPushChanges } from './pushChanges';
import {
  getLastPulledAt,
  setIsSyncing,
  setLastPulledAt,
  setLastSyncAt,
} from './syncState';
import {
  PullChangesResponse,
  PushChangesPayload,
  PushChangesResponse,
} from './syncTypes';

export interface SyncServiceDependencies {
  supabase: {
    rpc<TResponse>(
      fn: string,
      args?: Record<string, unknown>,
      options?: { signal?: AbortSignal }
    ): Promise<{
      data: TResponse | null;
      error: { message?: string } | null;
    }>;
  };
  collectPushChanges: () => Promise<PushChangesPayload>;
  applyPulledChanges: (changes: PullChangesResponse['changes']) => Promise<void>;
  markLocalChangesAsSynced?: (payload: PushChangesPayload) => Promise<void>;
}

export interface RunSyncOptions {
  signal?: AbortSignal;
  skipPush?: boolean;
  skipPull?: boolean;
}

export interface RunSyncResult {
  pushed: boolean;
  pulled: boolean;
  pushResponse?: PushChangesResponse;
  pullResponse?: PullChangesResponse;
  lastPulledAtBefore: number;
  lastPulledAtAfter: number;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Sync aborted');
  }
}

export function createSyncService(deps: SyncServiceDependencies) {
  const {
    supabase,
    collectPushChanges,
    applyPulledChanges,
    markLocalChangesAsSynced,
  } = deps;

  async function runPushSync(
    options: Pick<RunSyncOptions, 'signal'> = {}
  ): Promise<{
    pushed: boolean;
    pushResponse?: PushChangesResponse;
    payload: PushChangesPayload;
  }> {
    const { signal } = options;

    throwIfAborted(signal);

    const payload = await collectPushChanges();

    throwIfAborted(signal);

    if (!hasPushChanges(payload)) {
      return {
        pushed: false,
        payload,
      };
    }

    const pushResponse = await pushChanges(supabase, payload, { signal });

    if (markLocalChangesAsSynced) {
      await markLocalChangesAsSynced(payload);
    }

    return {
      pushed: true,
      pushResponse,
      payload,
    };
  }

  async function runPullSync(
    options: Pick<RunSyncOptions, 'signal'> = {}
  ): Promise<{
    pulled: boolean;
    pullResponse: PullChangesResponse;
    lastPulledAtBefore: number;
    lastPulledAtAfter: number;
  }> {
    const { signal } = options;

    throwIfAborted(signal);

    const lastPulledAtBefore = await getLastPulledAt();

    const pullResponse = await pullChanges(supabase, lastPulledAtBefore, {
      signal,
    });

    throwIfAborted(signal);

    await applyPulledChanges(pullResponse.changes);
    await setLastPulledAt(pullResponse.timestamp);
    await setLastSyncAt(Date.now());

    return {
      pulled: true,
      pullResponse,
      lastPulledAtBefore,
      lastPulledAtAfter: pullResponse.timestamp,
    };
  }

  async function runFullSync(
    options: RunSyncOptions = {}
  ): Promise<RunSyncResult> {
    const { signal, skipPull = false, skipPush = false } = options;

    await setIsSyncing(true);

    try {
      throwIfAborted(signal);

      let pushed = false;
      let pulled = false;
      let pushResponse: PushChangesResponse | undefined;
      let pullResponse: PullChangesResponse | undefined;
      let lastPulledAtBefore = await getLastPulledAt();
      let lastPulledAtAfter = lastPulledAtBefore;

      if (!skipPush) {
        const pushResult = await runPushSync({ signal });
        pushed = pushResult.pushed;
        pushResponse = pushResult.pushResponse;
      }

      if (!skipPull) {
        const pullResult = await runPullSync({ signal });
        pulled = pullResult.pulled;
        pullResponse = pullResult.pullResponse;
        lastPulledAtBefore = pullResult.lastPulledAtBefore;
        lastPulledAtAfter = pullResult.lastPulledAtAfter;
      }

      return {
        pushed,
        pulled,
        pushResponse,
        pullResponse,
        lastPulledAtBefore,
        lastPulledAtAfter,
      };
    } finally {
      await setIsSyncing(false);
    }
  }

  return {
    runPushSync,
    runPullSync,
    runFullSync,
  };
}