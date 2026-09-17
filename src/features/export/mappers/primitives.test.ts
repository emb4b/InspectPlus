import { cb, text, padRows, joinNonEmpty, normalizeLabel, numberText } from './primitives';

describe('primitives', () => {
  it('cb maps booleans to the two checkbox glyphs', () => {
    expect(cb(true)).toBe('☒');
    expect(cb(false)).toBe('☐');
  });
  it('text stringifies and blanks null/undefined', () => {
    expect(text('a')).toBe('a');
    expect(text(12)).toBe('12');
    expect(text(null)).toBe('');
    expect(text(undefined)).toBe('');
    expect(text({ x: 1 })).toBe('');
  });
  it('numberText blanks NaN and null but keeps 0', () => {
    expect(numberText(0)).toBe('0');
    expect(numberText(3.5)).toBe('3.5');
    expect(numberText(null)).toBe('');
    expect(numberText('7')).toBe('7');
    expect(numberText('abc')).toBe('');
  });
  it('padRows pads up to min with blanks but never truncates', () => {
    const blank = () => ({ a: '' });
    expect(padRows([{ a: '1' }], 3, blank)).toEqual([{ a: '1' }, { a: '' }, { a: '' }]);
    expect(padRows([{ a: '1' }, { a: '2' }, { a: '3' }, { a: '4' }], 3, blank)).toHaveLength(4);
    expect(padRows([], 2, blank)).toEqual([{ a: '' }, { a: '' }]);
  });
  it('padRows treats a non-array as empty', () => {
    expect(padRows(undefined as unknown as string[], 1, () => 'x')).toEqual(['x']);
  });
  it('joinNonEmpty drops blanks', () => {
    expect(joinNonEmpty(['a', '', null, 'b'])).toBe('a, b');
    expect(joinNonEmpty(['a', 'b'], ' / ')).toBe('a / b');
  });
  it('normalizeLabel lowercases and strips non-alphanumerics', () => {
    expect(normalizeLabel(' Water Utilities ')).toBe('waterutilities');
    expect(normalizeLabel('Oil/Water Separator')).toBe('oilwaterseparator');
    expect(normalizeLabel(null)).toBe('');
  });
});
