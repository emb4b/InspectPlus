import { useEffect, useState } from 'react';
import { resolveInspectorNames } from '../../services/inspectorNames';

// Resolves a single inspector uid to a display name, for any inspector —
// not just the currently signed-in user (see services/inspectorNames.ts).
export function useInspectorName(uid: string | null | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    let cancelled = false;

    if (!uid) {
      setName(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    resolveInspectorNames([uid]).then(map => {
      if (!cancelled) {
        setName(map[uid] ?? null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { name, loading };
}
