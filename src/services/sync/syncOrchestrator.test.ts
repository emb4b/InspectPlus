import { runManagedSync } from './syncOrchestrator';
import { checkOnline } from '../../utils/network';
import { assertAppVersionSupported } from './appVersionGate';
import { refreshUrgencyConfig } from '../config/urgencyConfig';
import { syncClient } from './syncClient';

// runManagedSync is pure wiring over these collaborators — every one of them
// reaches the network, the database or native storage, so they are all
// replaced here and the assertions are about call order and call count.
jest.mock('../../db/sync/watermelonAdapter', () => ({ clearSyncedRecords: jest.fn() }));
jest.mock('../../utils/network', () => ({ checkOnline: jest.fn() }));
jest.mock('../supabase/client', () => ({ supabase: { marker: 'the-client' } }));
jest.mock('./syncClient', () => ({ syncClient: { runFullSync: jest.fn() } }));
jest.mock('./syncState', () => ({
  getLastSyncedUserId: jest.fn(() => Promise.resolve(null)),
  setLastSyncedUserId: jest.fn(() => Promise.resolve()),
  resetSyncMetadata: jest.fn(() => Promise.resolve()),
}));
jest.mock('./syncEvents', () => ({ notifySyncDataChanged: jest.fn() }));
jest.mock('./appVersionGate', () => ({ assertAppVersionSupported: jest.fn(() => Promise.resolve()) }));
jest.mock('../../features/attachments/attachmentUploadQueue', () => ({
  uploadPendingAttachments: jest.fn(() => Promise.resolve()),
}));
jest.mock('../config/urgencyConfig', () => ({ refreshUrgencyConfig: jest.fn(() => Promise.resolve()) }));

const mockedCheckOnline = checkOnline as jest.Mock;
const mockedAssertVersion = assertAppVersionSupported as jest.Mock;
const mockedRefreshConfig = refreshUrgencyConfig as jest.Mock;
const mockedRunFullSync = syncClient.runFullSync as jest.Mock;

describe('runManagedSync urgency config refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCheckOnline.mockResolvedValue(true);
    mockedRunFullSync.mockResolvedValue({ pushed: false, pulled: true });
  });

  it('refreshes the thresholds with the shared client on every run', async () => {
    await runManagedSync('uid-1');

    expect(mockedRefreshConfig).toHaveBeenCalledTimes(1);
    expect(mockedRefreshConfig).toHaveBeenCalledWith({ marker: 'the-client' });
  });

  it('refreshes only after the version gate has passed', async () => {
    await runManagedSync('uid-1');

    // An unsupported build must be turned away before it acts on config it
    // may be too old to honour.
    expect(mockedAssertVersion.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRefreshConfig.mock.invocationCallOrder[0],
    );
  });

  it('refreshes before the sync itself, so the run notifies listeners with the new values', async () => {
    await runManagedSync('uid-1');

    expect(mockedRefreshConfig.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRunFullSync.mock.invocationCallOrder[0],
    );
  });

  it('does not attempt a refresh while offline', async () => {
    mockedCheckOnline.mockResolvedValue(false);

    await expect(runManagedSync('uid-1')).resolves.toBeNull();
    expect(mockedRefreshConfig).not.toHaveBeenCalled();
  });

  it('does not run when the version gate rejects', async () => {
    mockedAssertVersion.mockRejectedValueOnce(new Error('update required'));

    await expect(runManagedSync('uid-1')).rejects.toThrow('update required');
    expect(mockedRefreshConfig).not.toHaveBeenCalled();
  });

  it('completes the sync run even if the config refresh rejects', async () => {
    mockedRefreshConfig.mockRejectedValueOnce(new Error('config read blew up'));

    await expect(runManagedSync('uid-1')).resolves.not.toBeNull();
    expect(mockedRunFullSync).toHaveBeenCalled();
  });
});
