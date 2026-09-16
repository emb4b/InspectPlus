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
});
