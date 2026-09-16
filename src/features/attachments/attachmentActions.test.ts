import { resolveLocalFileUri } from './attachmentActions';

// Tracks which file:// uris "exist" on the fake filesystem so tests can
// drive File#exists without a real disk. Downloads add their destination
// uri to this set once mockDownloadFileAsync resolves. Prefixed with `mock`
// so jest's module-factory scoping rules allow referencing them below.
const mockExistingUris = new Set<string>();
const mockDownloadFileAsync = jest.fn(async (_url: string, destination: { uri: string }) => {
  mockExistingUris.add(destination.uri);
  return destination;
});

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(a: string | { uri: string }, b?: string) {
      if (typeof a === 'string' && b !== undefined) {
        this.uri = `${a.replace(/\/$/, '')}/${b}`;
      } else if (typeof a === 'string') {
        this.uri = a;
      } else {
        this.uri = a.uri;
      }
    }
    get exists() {
      return mockExistingUris.has(this.uri);
    }
    // A thin forwarder rather than `= mockDownloadFileAsync` directly: jest
    // hoists this jest.mock() factory above the `const mockDownloadFileAsync`
    // declaration below, so binding the value here would capture `undefined`.
    // Closing over the variable and reading it at call time (once the const
    // has actually run) avoids that.
    static downloadFileAsync(...args: Parameters<typeof mockDownloadFileAsync>) {
      return mockDownloadFileAsync(...args);
    }
  }
  return {
    File: MockFile,
    Paths: { cache: 'file:///cache' },
  };
});

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

const mockCreateSignedUrl = jest.fn();
jest.mock('../../services/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ createSignedUrl: mockCreateSignedUrl })),
    },
  },
}));

describe('resolveLocalFileUri', () => {
  beforeEach(() => {
    mockExistingUris.clear();
    mockDownloadFileAsync.mockClear();
    mockCreateSignedUrl.mockReset();
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x' } });
  });

  it('returns the local uri without touching the network when it already exists on device', async () => {
    mockExistingUris.add('file:///device/photo.jpg');

    const uri = await resolveLocalFileUri({
      attachmentId: 'a1',
      localUri: 'file:///device/photo.jpg',
      storagePath: 'a1.jpg',
    });

    expect(uri).toBe('file:///device/photo.jpg');
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    expect(mockDownloadFileAsync).not.toHaveBeenCalled();
  });

  it('returns an already-cached download without requesting a new signed url or re-downloading', async () => {
    mockExistingUris.add('file:///cache/download-a1.jpg');

    const uri = await resolveLocalFileUri({
      attachmentId: 'a1',
      localUri: null,
      storagePath: 'a1.jpg',
    });

    expect(uri).toBe('file:///cache/download-a1.jpg');
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    expect(mockDownloadFileAsync).not.toHaveBeenCalled();
  });

  it('downloads from the signed url and returns the downloaded uri when nothing is cached yet', async () => {
    const uri = await resolveLocalFileUri({
      attachmentId: 'a1',
      localUri: null,
      storagePath: 'a1.jpg',
    });

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('a1.jpg', 300);
    expect(mockDownloadFileAsync).toHaveBeenCalledWith('https://x', expect.objectContaining({ uri: 'file:///cache/download-a1.jpg' }));
    expect(uri).toBe('file:///cache/download-a1.jpg');
  });

  it('throws when the attachment has no storagePath and nothing local exists', async () => {
    await expect(
      resolveLocalFileUri({ attachmentId: 'a1', localUri: null, storagePath: null })
    ).rejects.toThrow('This photo has not finished uploading yet — nothing to download.');
  });
});
