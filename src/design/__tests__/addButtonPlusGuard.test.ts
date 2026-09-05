import * as fs from 'fs';
import { listTsxFiles, toRelative } from '../driftGuard';

// Regression guard for the doubled-plus bug: five components (DynamicRowTable,
// both water form sections' AddCardButton, and both DenrPermits sections)
// each paired an Ionicons "add" glyph with a label starting "+ Add ..." glued
// on by hand, so users saw "⊕ + Add Parameter" on screen. This scans every
// .tsx source file for a `label`/`addLabel` JSX prop whose value starts with
// a literal "+", so that pairing can't return at any call site — new or
// old — regardless of which component ends up rendering the icon. Unlike
// driftGuard's checks, this has no allowlist: a leading "+" next to an icon
// that already means "add" is never correct anywhere in the app.
const PLUS_LABEL_PATTERN = /\b(?:label|addLabel)\s*=\s*"\+/;

describe('add-button plus-prefix guard', () => {
  it('has no label or addLabel prop that starts with a literal "+"', () => {
    const offenders = listTsxFiles()
      .filter(file => PLUS_LABEL_PATTERN.test(fs.readFileSync(file, 'utf8')))
      .map(toRelative);
    expect(offenders).toEqual([]);
  });
});
