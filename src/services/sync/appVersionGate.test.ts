import { SupabaseClient } from '@supabase/supabase-js';
import { assertAppVersionSupported, UpdateRequiredError } from './appVersionGate';
import { getCurrentAppVersion } from '../../utils/version';

jest.mock('../../utils/version', () => ({
  ...jest.requireActual('../../utils/version'),
  getCurrentAppVersion: jest.fn(),
}));

const mockedGetCurrentAppVersion = getCurrentAppVersion as jest.Mock;

function fakeSupabase(result: {
  data: { value: string } | null;
  error: { message: string } | null;
}): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(result),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('assertAppVersionSupported', () => {
  it('does nothing when the installed version meets the floor', async () => {
    mockedGetCurrentAppVersion.mockReturnValue('1.2.0');
    const supabase = fakeSupabase({ data: { value: '1.0.0' }, error: null });
    await expect(assertAppVersionSupported(supabase)).resolves.toBeUndefined();
  });

  it('throws UpdateRequiredError when the installed version is below the floor', async () => {
    mockedGetCurrentAppVersion.mockReturnValue('0.9.0');
    const supabase = fakeSupabase({ data: { value: '1.0.0' }, error: null });
    await expect(assertAppVersionSupported(supabase)).rejects.toThrow(UpdateRequiredError);
  });

  it('carries the minVersion on the thrown error', async () => {
    mockedGetCurrentAppVersion.mockReturnValue('0.9.0');
    const supabase = fakeSupabase({ data: { value: '1.4.0' }, error: null });
    await expect(assertAppVersionSupported(supabase)).rejects.toMatchObject({ minVersion: '1.4.0' });
  });

  it('fails open when the config row is missing', async () => {
    mockedGetCurrentAppVersion.mockReturnValue('0.1.0');
    const supabase = fakeSupabase({ data: null, error: null });
    await expect(assertAppVersionSupported(supabase)).resolves.toBeUndefined();
  });

  it('fails open when the read errors', async () => {
    mockedGetCurrentAppVersion.mockReturnValue('0.1.0');
    const supabase = fakeSupabase({ data: null, error: { message: 'network error' } });
    await expect(assertAppVersionSupported(supabase)).resolves.toBeUndefined();
  });
});
