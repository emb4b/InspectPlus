import { resolveLocalFileUri } from './attachmentActions';

// Tracks which file:// uris "exist" on the fake filesystem so tests can
// drive File#exists without a real disk. `move` adds its destination uri to
// this set (mirroring a real move landing the completed file); `delete`
// removes the instance's own uri. Prefixed with `mock` so jest's
// module-factory scoping rules allow referencing them below.
const mockExistingUris = new Set<string>();
const mockDownloadFileAsync = jest.fn(async (_url: string, _destination: { uri: string }) => undefined);
const mockDelete = jest.fn((_uri: string) => undefined);
const mockMove = jest.fn((_fromUri: string, _toUri: string) => undefined);

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
    delete() {
      mockExistingUris.delete(this.uri);
      mockDelete(this.uri);
    }
    move(destination: { uri: string }) {
      mockExistingUris.add(destination.uri);
      mockMove(this.uri, destination.uri);
    }
    // A thin forwarder rather than `= mockDownloadFileAsync` directly: jest
    // hoists this jest.mock() factory above the `const mockDownloadFileAsync`
    // declaration below, so binding the value here would capture `undefined`.
    // Closing over the variable and reading it at call time (once the const
    // has actually run) avoids that. (`delete`/`move` above are regular
    // methods, not fields, so they don't need the same trick — they only
    // read `mockDelete`/`mockMove` once actually called.)
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
    mockDelete.mockClear();
    mockMove.mockClear();
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

  it('downloads to a partial file and moves it into the final destination when nothing is cached yet', async () => {
    const uri = await resolveLocalFileUri({
      attachmentId: 'a1',
      localUri: null,
      storagePath: 'a1.jpg',
    });

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('a1.jpg', 300);
    expect(mockDownloadFileAsync).toHaveBeenCalledWith('https://x', expect.objectContaining({ uri: 'file:///cache/download-a1.partial.jpg' }));
    expect(mockMove).toHaveBeenCalledWith('file:///cache/download-a1.partial.jpg', 'file:///cache/download-a1.jpg');
    expect(uri).toBe('file:///cache/download-a1.jpg');
  });

  it('deletes a stale leftover partial file before downloading into it again', async () => {
    mockExistingUris.add('file:///cache/download-a1.partial.jpg');

    const uri = await resolveLocalFileUri({
      attachmentId: 'a1',
      localUri: null,
      storagePath: 'a1.jpg',
    });

    expect(mockDelete).toHaveBeenCalledWith('file:///cache/download-a1.partial.jpg');
    expect(mockDownloadFileAsync).toHaveBeenCalledWith('https://x', expect.objectContaining({ uri: 'file:///cache/download-a1.partial.jpg' }));
    expect(mockMove).toHaveBeenCalledWith('file:///cache/download-a1.partial.jpg', 'file:///cache/download-a1.jpg');
    expect(uri).toBe('file:///cache/download-a1.jpg');
  });

  it('throws when the attachment has no storagePath and nothing local exists', async () => {
    await expect(
      resolveLocalFileUri({ attachmentId: 'a1', localUri: null, storagePath: null })
    ).rejects.toThrow('This photo has not finished uploading yet — nothing to download.');
  });
});
