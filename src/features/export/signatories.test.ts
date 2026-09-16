import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageSignatoryProvider, emptySignatories, SIGNATORIES_STORAGE_KEY } from './signatories';

describe('asyncStorageSignatoryProvider', () => {
  beforeEach(() => AsyncStorage.clear());

  it('returns null when nothing is saved', async () => {
    expect(await asyncStorageSignatoryProvider.load()).toBeNull();
  });

  it('round-trips what was saved', async () => {
    const s = { inspectorName: 'A', inspectorPosition: 'B', supervisorName: 'C', supervisorPosition: 'D' };
    await asyncStorageSignatoryProvider.save(s);
    expect(await asyncStorageSignatoryProvider.load()).toEqual(s);
    expect(await AsyncStorage.getItem(SIGNATORIES_STORAGE_KEY)).toBe(JSON.stringify(s));
  });

  it('ignores a corrupt or partial value', async () => {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, '{not json');
    expect(await asyncStorageSignatoryProvider.load()).toBeNull();
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify({ inspectorName: 'A' }));
    expect(await asyncStorageSignatoryProvider.load()).toEqual({ inspectorName: 'A', inspectorPosition: '', supervisorName: '', supervisorPosition: '' });
  });

  it('emptySignatories prefills the inspector name', () => {
    expect(emptySignatories('Juan')).toEqual({ inspectorName: 'Juan', inspectorPosition: '', supervisorName: '', supervisorPosition: '' });
    expect(emptySignatories(null).inspectorName).toBe('');
  });
});
