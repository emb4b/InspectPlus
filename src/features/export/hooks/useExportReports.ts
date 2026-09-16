import { useCallback, useRef, useState } from 'react';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { deviceExportPorts, exportReports, ExportItem, ExportProgress } from '../exportReports';
import type { ExportResult, Signatories } from '../types';

export type ExportPhase =
  | { status: 'idle' }
  | { status: 'running'; progress: ExportProgress }
  | { status: 'done'; result: ExportResult }
  | { status: 'error'; message: string };

// The tab's view of an export run. One run at a time; cancel is a flag the
// orchestrator polls between reports, so the current one always finishes.
export function useExportReports() {
  const [phase, setPhase] = useState<ExportPhase>({ status: 'idle' });
  const cancelled = useRef(false);
  const { session, province, role } = useAuthContext();
  const uid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';

  const start = useCallback(
    async (items: ExportItem[], signatories: Signatories) => {
      cancelled.current = false;
      setPhase({ status: 'running', progress: { index: 0, total: items.length, title: '' } });
      try {
        const result = await exportReports(
          items,
          {
            signatories,
            onProgress: progress => setPhase({ status: 'running', progress }),
            isCancelled: () => cancelled.current,
          },
          deviceExportPorts({ uid, province: province ?? '', role: role ?? '' }),
        );
        setPhase({ status: 'done', result });
      } catch (e) {
        setPhase({ status: 'error', message: e instanceof Error && e.message ? e.message : 'Export failed' });
      }
    },
    [uid, province, role],
  );

  const cancel = useCallback(() => { cancelled.current = true; }, []);
  const reset = useCallback(() => setPhase({ status: 'idle' }), []);

  return { phase, start, cancel, reset };
}
