// Soft, race-based timeout for a promise whose underlying work (usually a
// fetch) offers no cancellation hook of its own. It can't actually abort the
// in-flight work — it just stops the caller from waiting on it forever if
// the network is unreachable or very slow. See supabase/client.ts's
// fetchWithAuthTimeout comment: this codebase's Supabase client deliberately
// leaves every non-auth request (Storage calls, geocoding, etc.) unbounded.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}
