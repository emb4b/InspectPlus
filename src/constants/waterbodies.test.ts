import { WATERBODIES } from '../data/mimaropaWaterbodies';
import { getWaterbodyGroups, WATERBODY_NOT_LISTED } from './waterbodies';

const PER_PROVINCE = {
  'Occidental Mindoro': 13,
  'Oriental Mindoro': 24,
  Marinduque: 8,
  Romblon: 7,
  Palawan: 50,
};
const countOptions = (province: string) =>
  WATERBODIES[province].reduce((n, g) => n + g.options.length, 0);

// These totals are printed in the source PDF's own summary table, so they
// are an independent check on the extraction rather than a restatement of
// it. If the dataset is ever regenerated from a newer list, these move only
// alongside that document's own figures.
describe('bundled waterbody dataset', () => {
  it('carries every waterbody the source PDF counts', () => {
    const total = Object.keys(PER_PROVINCE).reduce((n, p) => n + countOptions(p), 0);
    expect(total).toBe(102);
  });

  it.each(Object.entries(PER_PROVINCE))('has %s waterbodies for %s', (province, expected) => {
    expect(countOptions(province as string)).toBe(expected as number);
  });

  it('renders every option as "Name (Classification)"', () => {
    // Most qualifiers after the class letters are a single word ("assigned"),
    // but at least one ("brackish mangrove") is two - see 'Rio Tuba River
    // (SC, brackish mangrove)' in Palawan - so each token may itself be
    // space-separated words rather than a single word.
    const every = Object.values(WATERBODIES).flatMap(gs => gs.flatMap(g => g.options));
    every.forEach(option => expect(option).toMatch(/^.+ \([A-Z]{1,2}(, [A-Za-z]+(?: [A-Za-z]+)*)*\)$/));
  });

  it('orders groups principal, then minor, then other', () => {
    // Romblon has no principal rivers at all, so the assertion is about
    // relative order rather than a fixed list.
    const ORDER = ['Principal Rivers', 'Minor Rivers', 'Other Waterbodies'];
    Object.values(WATERBODIES).forEach(groups => {
      const positions = groups.map(g => ORDER.indexOf(g.label));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(positions).not.toContain(-1);
    });
  });
});

describe('getWaterbodyGroups', () => {
  it('returns only the named province’s waterbodies', () => {
    const groups = getWaterbodyGroups('Marinduque');
    expect(groups.flatMap(g => g.options)).toContain('Boac River (C)');
    expect(groups.flatMap(g => g.options)).not.toContain('Honda Bay (SB)');
  });

  // An establishment outside MIMAROPA, or one whose province was never
  // filled in, would otherwise face a dropdown with nothing in it. A long
  // list beats a dead control.
  it('falls back to every province when the province is unknown', () => {
    expect(getWaterbodyGroups('Cebu').flatMap(g => g.options)).toHaveLength(102);
  });

  it('falls back to every province when the province is blank', () => {
    expect(getWaterbodyGroups('').flatMap(g => g.options)).toHaveLength(102);
  });

  it('offers a not-listed escape hatch', () => {
    expect(WATERBODY_NOT_LISTED).toBe('Not listed (specify)');
  });
});
