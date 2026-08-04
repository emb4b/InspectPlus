import { PushChangesPayload, PushChangesResponse } from './syncTypes';

const DEFAULT_RPC_NAME = 'push_changes';

export interface PushChangesOptions {
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

function isPushChangesResponse(value: unknown): value is PushChangesResponse {
  if (!value || typeof value !== 'object') return false;

  const v = value as Record<string, unknown>;
  return v.status === 'ok';
}

/**
 * Removes undefined entity groups so the payload stays compact and predictable.
 */
function normalizePushPayload(payload: PushChangesPayload): PushChangesPayload {
  const entries = Object.entries(payload).filter(([, value]) => value != null);
  return Object.fromEntries(entries) as PushChangesPayload;
}

/**
 * Optional helper for the caller to avoid unnecessary network calls.
 */
export function hasPushChanges(payload: PushChangesPayload): boolean {
  return Object.values(payload).some((entityChanges) => {
    if (!entityChanges) return false;
    return (
      entityChanges.created.length > 0 ||
      entityChanges.updated.length > 0 ||
      entityChanges.deleted.length > 0
    );
  });
}

/**
 * Calls the backend push_changes RPC and returns the typed result.
 *
 * @param supabase A Supabase client instance
 * @param payload The sync changes grouped by entity
 * @param options Optional RPC config
 */
export async function pushChanges(
  supabase: SupabaseLikeClient,
  payload: PushChangesPayload,
  options: PushChangesOptions = {}
): Promise<PushChangesResponse> {
  const { rpcName = DEFAULT_RPC_NAME, signal } = options;

  const normalizedPayload = normalizePushPayload(payload);

  const { data, error } = await supabase.rpc<PushChangesResponse>(
    rpcName,
    { changes: normalizedPayload },
    { signal }
  );

  if (error) {
    throw new Error(
      `Failed to push changes: ${error.message ?? 'Unknown RPC error'}`
    );
  }

  if (!data) {
    throw new Error('Failed to push changes: RPC returned no data');
  }

  if (!isPushChangesResponse(data)) {
    throw new Error('Failed to push changes: Invalid response shape');
  }

  return data;
}