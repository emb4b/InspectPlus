import { PullChangesResponse } from './syncTypes';

const DEFAULT_RPC_NAME = 'pull_changes';

export interface PullChangesOptions {
  rpcName?: string;
  signal?: AbortSignal;
}

export interface SupabaseLikeClient {
  rpc<TResponse>(
    fn: string,
    args?: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ): Promise<{
    data: TResponse | null;
    error: { message?: string } | null;
  }>;
}

/**
 * Basic runtime guard so the app fails early if the backend returns
 * an unexpected payload shape.
 */
function isPullChangesResponse(value: unknown): value is PullChangesResponse {
  if (!value || typeof value !== 'object') return false;

  const v = value as Record<string, unknown>;

  if (typeof v.timestamp !== 'number') return false;
  if (!v.changes || typeof v.changes !== 'object') return false;

  return true;
}

/**
 * Calls the backend pull_changes RPC and returns the typed sync payload.
 *
 * @param supabase A Supabase client instance
 * @param lastPulledAt Milliseconds since Unix epoch; use 0 for initial sync
 * @param options Optional RPC config
 */
export async function pullChanges(
  supabase: SupabaseLikeClient,
  lastPulledAt: number,
  options: PullChangesOptions = {}
): Promise<PullChangesResponse> {
  const { rpcName = DEFAULT_RPC_NAME, signal } = options;

  if (!Number.isFinite(lastPulledAt) || lastPulledAt < 0) {
    throw new Error(`Invalid lastPulledAt value: ${lastPulledAt}`);
  }

  const { data, error } = await supabase.rpc<PullChangesResponse>(
    rpcName,
    { last_pulled_at: Math.floor(lastPulledAt) },
    { signal }
  );

  if (error) {
    throw new Error(
      `Failed to pull changes: ${error.message ?? 'Unknown RPC error'}`
    );
  }

  if (!data) {
    throw new Error('Failed to pull changes: RPC returned no data');
  }

  if (!isPullChangesResponse(data)) {
    throw new Error('Failed to pull changes: Invalid response shape');
  }

  return data;
}