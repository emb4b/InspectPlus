import { useCallback, useRef } from 'react';

const DEFAULT_GUARD_MS = 800;

// A rapid double-tap fires the wrapped callback twice before the first
// screen transition finishes, pushing the same route onto the stack twice.
// The lock lives in a ref scoped to this one call site, so it only ever
// blocks a second tap on the SAME button — it can't swallow an unrelated
// tap elsewhere in the app the way a module-level/global lock would.
export function useGuardedPress<Args extends unknown[]>(
  fn: (...args: Args) => void,
  guardMs: number = DEFAULT_GUARD_MS,
): (...args: Args) => void {
  const busyUntil = useRef(0);

  return useCallback(
    (...args: Args) => {
      const now = Date.now();
      if (now < busyUntil.current) return;
      busyUntil.current = now + guardMs;
      fn(...args);
    },
    [fn, guardMs],
  );
}
