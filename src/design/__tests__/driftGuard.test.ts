import * as fs from 'fs';
import * as path from 'path';
import { HEX_PATTERN, NUMERIC_TOKEN_PATTERN, DESIGN_DIR, findOffenders } from '../driftGuard';

// Read rather than import, so this doesn't depend on resolveJsonModule.
const allow = new Set<string>(
  JSON.parse(fs.readFileSync(path.join(DESIGN_DIR, 'driftGuardAllowlist.json'), 'utf8')),
);

// Each migration sweep deletes entries from driftGuardAllowlist.json. The
// allowlist only ever shrinks — a new file must be token-clean from the
// start, and nothing is added back.
describe('design token drift guard', () => {
  it('has no raw hex color literals outside src/design and the allowlist', () => {
    expect(findOffenders(HEX_PATTERN, allow)).toEqual([]);
  });

  it('has no numeric fontSize or borderRadius literals outside src/design and the allowlist', () => {
    expect(findOffenders(NUMERIC_TOKEN_PATTERN, allow)).toEqual([]);
  });
});
