import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageSignatoryProvider, DEFAULT_APPROVERS, emptySignatories, SIGNATORIES_STORAGE_KEY } from './signatories';

describe('asyncStorageSignatoryProvider', () => {
  beforeEach(() => AsyncStorage.clear());

  it('returns null when nothing is saved', async () => {
    expect(await asyncStorageSignatoryProvider.load()).toBeNull();
  });

  it('round-trips what was saved, including custom approvers and extra inspectors', async () => {
    const s = {
      inspectorName: 'A', inspectorPosition: 'B', supervisorName: 'C', supervisorPosition: 'D',
      recommendingName: 'Custom Recommender', recommendingPosition: 'Custom Rec. Position',
      approverName: 'Custom Approver', approverPosition: 'Custom Approver Position',
      additionalInspectors: [{ name: 'Second Inspector', position: 'Engineer I' }],
    };
    await asyncStorageSignatoryProvider.save(s);
    expect(await asyncStorageSignatoryProvider.load()).toEqual(s);
    expect(await AsyncStorage.getItem(SIGNATORIES_STORAGE_KEY)).toBe(JSON.stringify(s));
  });

  it('ignores a corrupt value', async () => {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, '{not json');
    expect(await asyncStorageSignatoryProvider.load()).toBeNull();
  });

  // A record saved before the approvers/additionalInspectors fields existed
  // (or a hand-edited one missing them) must load with the printed
  // defaults, not blanks — the exported form should read exactly as it did
  // before this change until the inspector actually edits an approver.
  it('fills a legacy partial record with the default approvers and an empty inspector list', async () => {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify({ inspectorName: 'A' }));
    expect(await asyncStorageSignatoryProvider.load()).toEqual({
      inspectorName: 'A', inspectorPosition: '', supervisorName: '', supervisorPosition: '',
      ...DEFAULT_APPROVERS,
      additionalInspectors: [],
    });
  });

  it('falls back to the default for a blank or invalid approver field, and sanitises additionalInspectors', async () => {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify({
      inspectorName: 'A', recommendingName: '', approverPosition: 42,
      additionalInspectors: 'not an array',
    }));
    const loaded = await asyncStorageSignatoryProvider.load();
    expect(loaded?.recommendingName).toBe(DEFAULT_APPROVERS.recommendingName);
    expect(loaded?.approverPosition).toBe(DEFAULT_APPROVERS.approverPosition);
    expect(loaded?.additionalInspectors).toEqual([]);
  });

  it('sanitises additionalInspectors entries to {name, position} strings', async () => {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify({
      inspectorName: 'A',
      additionalInspectors: [{ name: 'Second', position: 'Eng I' }, { name: 42, position: null }, 'garbage'],
    }));
    const loaded = await asyncStorageSignatoryProvider.load();
    expect(loaded?.additionalInspectors).toEqual([
      { name: 'Second', position: 'Eng I' },
      { name: '', position: '' },
      { name: '', position: '' },
    ]);
  });

  it('emptySignatories prefills the inspector name and the default approvers', () => {
    expect(emptySignatories('Juan')).toEqual({
      inspectorName: 'Juan', inspectorPosition: '', supervisorName: '', supervisorPosition: '',
      ...DEFAULT_APPROVERS,
      additionalInspectors: [],
    });
    expect(emptySignatories(null).inspectorName).toBe('');
  });
});
