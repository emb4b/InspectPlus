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
