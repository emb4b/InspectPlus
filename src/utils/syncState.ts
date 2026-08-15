// A record already created locally but not yet pushed (pending_create) must
// stay pending_create on a subsequent local edit — flipping it to
// pending_update would make the next push send an UPDATE for a row the
// server has never seen, silently dropping the edit instead of applying it.
export function nextSyncStateForEdit(current: string): 'pending_create' | 'pending_update' {
  return current === 'pending_create' ? 'pending_create' : 'pending_update';
}
