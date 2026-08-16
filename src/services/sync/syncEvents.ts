// Minimal pub/sub so screens can react when local data changes as a result
// of a sync run, without threading a callback through every navigation path
// that can trigger one (login, the manual Sync Now button, a future
// background trigger). Not for report/establishment creation — those stay
// visible to their own screen already; this is for "something changed
// somewhere else, please refetch."
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToSyncDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySyncDataChanged(): void {
  listeners.forEach(listener => listener());
}

// Separate pub/sub for "sync is blocked because this app version is no
// longer supported" — distinct from notifySyncDataChanged since nothing
// actually changed and listeners need the minVersion to show a useful
// message, not just a refetch signal.
type UpdateRequiredListener = (minVersion: string) => void;

const updateRequiredListeners = new Set<UpdateRequiredListener>();

export function subscribeToUpdateRequired(listener: UpdateRequiredListener): () => void {
  updateRequiredListeners.add(listener);
  return () => updateRequiredListeners.delete(listener);
}

export function notifyUpdateRequired(minVersion: string): void {
  updateRequiredListeners.forEach(listener => listener(minVersion));
}
