import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useExportReports } from './useExportReports';
import type { ExportItem } from '../exportReports';

const mockExport = jest.fn();
jest.mock('../exportReports', () => ({
  exportReports: (...args: unknown[]) => mockExport(...args),
  deviceExportPorts: () => ({}),
}));
jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ session: { user: { id: 'u1' } }, province: 'P', role: 'Inspector' }),
}));

const signatories = { inspectorName: 'A', inspectorPosition: 'B', supervisorName: 'C', supervisorPosition: 'D' };
const item: ExportItem = { key: 'k', kind: 'inspection', reportId: 'r1', reportType: 'water_monitoring', title: 'Water', estabName: 'Alpha', date: '2026-09-05' };

function Harness({ onReady }: { onReady: (h: ReturnType<typeof useExportReports>) => void }) {
  onReady(useExportReports());
  return null;
}

function mount() {
  let hook!: ReturnType<typeof useExportReports>;
  act(() => { TestRenderer.create(<Harness onReady={h => { hook = h; }} />); });
  return () => hook;
}

describe('useExportReports', () => {
  beforeEach(() => mockExport.mockReset());

  it('moves idle → running → done and forwards progress', async () => {
    const get = mount();
    expect(get().phase).toEqual({ status: 'idle' });
    let resolve!: (r: unknown) => void;
    mockExport.mockImplementation((_items, options) => {
      options.onProgress({ index: 1, total: 2, title: 'Alpha' });
      return new Promise(r => { resolve = r; });
    });
    let run!: Promise<void>;
    act(() => { run = get().start([item], signatories); });
    expect(get().phase).toEqual({ status: 'running', progress: { index: 1, total: 2, title: 'Alpha' } });
    await act(async () => { resolve({ shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false }); await run; });
    expect(get().phase).toEqual({ status: 'done', result: { shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false } });
  });

  it('passes the viewer and a cancel flag to the orchestrator', async () => {
    const get = mount();
    mockExport.mockImplementation(async (_items, options) => {
      expect(options.isCancelled()).toBe(false);
      get().cancel();
      expect(options.isCancelled()).toBe(true);
      return { shareUri: null, succeeded: 0, failures: [], skippedPhotos: 0, cancelled: true };
    });
    await act(async () => { await get().start([item], signatories); });
    expect(get().phase).toMatchObject({ status: 'done', result: { cancelled: true } });
  });

  it('turns a thrown error into the error phase and reset clears it', async () => {
    const get = mount();
    mockExport.mockRejectedValue(new Error('disk full'));
    await act(async () => { await get().start([item], signatories); });
    expect(get().phase).toEqual({ status: 'error', message: 'disk full' });
    act(() => get().reset());
    expect(get().phase).toEqual({ status: 'idle' });
  });

  it('ignores a second start while one is already running, and allows a new run once it resolves', async () => {
    const get = mount();
    let resolveFirst!: (r: unknown) => void;
    mockExport.mockImplementationOnce(() => new Promise(r => { resolveFirst = r; }));

    let firstRun!: Promise<void>;
    act(() => { firstRun = get().start([item], signatories); });
    expect(mockExport).toHaveBeenCalledTimes(1);
    const phaseWhileRunning = get().phase;

    // A second start() call while the first is still pending must not touch
    // the orchestrator or the phase.
    let secondRun!: Promise<void>;
    act(() => { secondRun = get().start([item], signatories); });
    await act(async () => { await secondRun; });
    expect(mockExport).toHaveBeenCalledTimes(1);
    expect(get().phase).toEqual(phaseWhileRunning);

    await act(async () => {
      resolveFirst({ shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false });
      await firstRun;
    });
    expect(get().phase).toEqual({ status: 'done', result: { shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false } });

    // Now that the run finished, start() works again.
    mockExport.mockImplementationOnce(async () => ({ shareUri: 'u2', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false }));
    await act(async () => { await get().start([item], signatories); });
    expect(mockExport).toHaveBeenCalledTimes(2);
    expect(get().phase).toEqual({ status: 'done', result: { shareUri: 'u2', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false } });
  });
});
