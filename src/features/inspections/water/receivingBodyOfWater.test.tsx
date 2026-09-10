import {
  decodeReceivingBodyOfWater,
  receivingBodyOfWaterForSave,
  describeReceivingBodyOfWater,
  emptyWwtpDetail,
} from './waterTypes';
import { WATERBODY_NOT_LISTED } from '../../../constants/waterbodies';

describe('decoding a stored receiving body of water', () => {
  it('recognises a value from the establishment’s province', () => {
    expect(decodeReceivingBodyOfWater('Boac River (C)', 'Marinduque')).toEqual({
      selection: 'Boac River (C)',
      other: '',
    });
  });

  // Reports predate the dropdown, so this field is full of hand-typed
  // names. Presenting them as "not listed" with the text preserved keeps
  // the record readable; blanking them would destroy data.
  it('presents legacy free text as not-listed, keeping the text', () => {
    expect(decodeReceivingBodyOfWater('creek behind the plant', 'Marinduque')).toEqual({
      selection: WATERBODY_NOT_LISTED,
      other: 'creek behind the plant',
    });
  });

  // The same river in the wrong province is still not a valid choice here -
  // the dropdown only ever offered this establishment's own province.
  it('treats a value from another province as not-listed', () => {
    expect(decodeReceivingBodyOfWater('Honda Bay (SB)', 'Marinduque')).toEqual({
      selection: WATERBODY_NOT_LISTED,
      other: 'Honda Bay (SB)',
    });
  });

  it('leaves an empty value empty', () => {
    expect(decodeReceivingBodyOfWater('', 'Marinduque')).toEqual({ selection: '', other: '' });
  });
});

describe('what reaches the record', () => {
  it('stores the selected option', () => {
    expect(receivingBodyOfWaterForSave('Boac River (C)', '')).toBe('Boac River (C)');
  });

  it('stores the free text when not-listed is selected', () => {
    expect(receivingBodyOfWaterForSave(WATERBODY_NOT_LISTED, ' Sapa Creek ')).toBe('Sapa Creek');
  });

  // Text stranded by re-picking a real option would otherwise contradict
  // the option beside it - the same rule nonWwtpTreatmentFor applies.
  it('drops free text left behind by a re-picked option', () => {
    expect(receivingBodyOfWaterForSave('Boac River (C)', 'Sapa Creek')).toBe('Boac River (C)');
  });

  it('stores nothing when not-listed is selected but nothing is typed', () => {
    expect(receivingBodyOfWaterForSave(WATERBODY_NOT_LISTED, '   ')).toBe('');
  });
});

describe('summarising for a read-only card', () => {
  it('shows the selected option', () => {
    const detail = { ...emptyWwtpDetail('1'), receivingBodyOfWater: 'Boac River (C)' };
    expect(describeReceivingBodyOfWater(detail)).toBe('Boac River (C)');
  });

  it('shows the free text rather than the not-listed label', () => {
    const detail = {
      ...emptyWwtpDetail('1'),
      receivingBodyOfWater: WATERBODY_NOT_LISTED,
      receivingBodyOfWaterOther: 'Sapa Creek',
    };
    expect(describeReceivingBodyOfWater(detail)).toBe('Sapa Creek');
  });

  it('shows an em dash when nothing was recorded', () => {
    expect(describeReceivingBodyOfWater(emptyWwtpDetail('1'))).toBe('—');
  });
});
