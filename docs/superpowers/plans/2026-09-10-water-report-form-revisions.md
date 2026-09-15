# Water Report Form Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three revisions to the water report's "Information on Wastewater Pollution" section — a specify field for an "Others" WWTP type, a province-filtered Receiving Body of Water dropdown, and a WWTP column plus multi-select treatment components.

**Architecture:** A bundled offline dataset generated from EMB's classified-waterbodies PDF feeds a grouped dropdown filtered by the establishment's province. Two of the three revisions store into existing `jsonb` columns and need no migration; only the Type-of-WWTP specify text needs a new column. Every change lands twice — once in the create form (`WaterExtraFormSections.tsx`) and once in the per-section edit screen (`WaterComplianceEditSections.tsx`) — because that duplication is pre-existing and out of scope to collapse.

**Tech Stack:** React Native 0.83 / Expo 55, TypeScript, WatermelonDB (local), Supabase (Postgres + RPC sync), Jest with `react-test-renderer`.

**Spec:** [`docs/superpowers/specs/2026-09-10-water-report-form-revisions-design.md`](../specs/2026-09-10-water-report-form-revisions-design.md)

## Global Constraints

- Node `>= 22.11.0` (`.nvmrc`).
- `npm run lint` runs `eslint src --ext .ts,.tsx --max-warnings 0` — **zero warnings allowed**.
- `npm run typecheck` (`tsc --noEmit`) and `npm test` (jest) must both pass before any commit. A pre-commit hook runs the full suite, so a failing test blocks the commit.
- Baseline at the start of this work: **599 tests across 59 suites, all passing.** Every task must leave that number at or above where it started.
- **No new runtime dependencies.** `pdfplumber` is an authoring tool for `scripts/generate_waterbodies.py` only and must NOT be added to `package.json`.
- The app is offline-first: reference data is bundled at build time, never fetched at runtime.
- Commit messages follow `@commitlint/config-conventional` (enforced by a hook): `type(scope): subject`, subject in lower case, no trailing period. End every commit message with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Dropdown value format is exactly `Name (Classification)` — e.g. `Boac River (C)`, `Ulan Bay (SB, SC)`. No comma between name and parenthesis.
- The printed form reads "Tricking Filter". The app uses **"Trickling Filter"** — a deliberate, agreed divergence.
- Branch: `feat/water-report-form-revisions` (already created off `develop`).
- Several tasks **append** to a test file an earlier task created. Where a snippet opens with `import` or `jest.mock` lines, those belong at the top of the file with the existing ones — only the `describe` blocks are appended. Jest hoists `jest.mock` regardless, but a reader shouldn't have to know that.
- Test files here render real components against `react-test-renderer`, and `WaterExtraFormSectionsView` / `WaterComplianceEditSections` import `db/database` at module load. Every test file touching them needs the `db/database` and `react-native-keyboard-controller` mocks — see `nonWwtpTreatment.test.tsx:12-30` and the note in `dpConditionsVisibility.test.tsx:11` for why.

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `scripts/generate_waterbodies.py` | Extracts the waterbody table from EMB's PDF; refuses to write unless three totals match the PDF's own summary |
| `src/data/mimaropaWaterbodies.ts` | Generated data — province → group → options |
| `src/constants/waterbodies.ts` | Accessor: province filtering, fallback, the not-listed sentinel |
| `src/constants/waterbodies.test.ts` | Dataset integrity + accessor behaviour |
| `src/features/inspections/water/TreatmentCheckboxGroup.tsx` | One checkbox group with an "Others (specify)" reveal — used 3× per card, in both entry paths |
| `src/features/inspections/water/receivingBodyOfWater.test.tsx` | Item 2, both entry paths |
| `src/features/inspections/water/wwtpComponents.test.tsx` | Item 3, both entry paths |
| `src/features/inspections/water/wwtpTypeOther.test.tsx` | Item 1, both entry paths |
| `supabase/migrations/20260910120000_add_wwtp_type_other_to_compliance_water.sql` | The one schema migration |

**Modified:**

| File | Change |
|---|---|
| `src/components/form/SelectField.tsx` | Optional `groups` prop with non-selectable headers |
| `src/components/form/SelectField.test.tsx` | Header rendering, search interaction |
| `src/features/inspections/water/waterTypes.ts` | New fields on `WwtpDetailCard` / `WwtpComponentCard` / form state, plus the save and decode rules |
| `src/features/inspections/water/waterChecklistData.ts` | The three treatment option lists |
| `src/features/inspections/water/WaterExtraFormSections.tsx` | Create-form UI for all three items |
| `src/features/inspections/water/WaterComplianceEditSections.tsx` | Edit-screen UI + read-only cards for all three items |
| `src/features/inspections/water/WaterInspectionFormScreen.tsx` | Passes `province`; saves the new fields |
| `src/features/inspections/components/InspectionReportDetailScreen.tsx` | Passes `province` from the report snapshot |
| `src/db/schema.ts` | `version: 12` → `13`, new `wwtpTypeOther` column |
| `src/db/migrations.ts` | `toVersion: 13` step |
| `src/db/models/ComplianceWater.ts` | New field; corrects two stale comments |
| `src/services/sync/syncSchema.ts` | `wwtp_type_other` ↔ `wwtpTypeOther` |

**Task order:** Tasks 1–5 deliver item 2 (receiving body of water). Tasks 6–9 deliver item 3 (components). Tasks 10–11 deliver item 1 (Type of WWTP). Each phase is independently shippable; item 1 is last because it carries the only migration.

---

## Task 1: Waterbody dataset and accessor

**Files:**
- Create: `scripts/generate_waterbodies.py`
- Create (by running the script): `src/data/mimaropaWaterbodies.ts`
- Create: `src/constants/waterbodies.ts`
- Test: `src/constants/waterbodies.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `WaterbodyGroup { label: string; options: string[] }` from `src/data/mimaropaWaterbodies.ts`
  - `WATERBODIES: Record<string, WaterbodyGroup[]>` from `src/data/mimaropaWaterbodies.ts`
  - `getWaterbodyGroups(province: string): WaterbodyGroup[]` from `src/constants/waterbodies.ts`
  - `WATERBODY_NOT_LISTED: string` (value `'Not listed (specify)'`) from `src/constants/waterbodies.ts`

**Background:** The source PDF is `2020-updated-list_waterbodies-classified-and-monitored.pdf` (EMB MIMAROPA, January 2020). Ask the requester for it if it is not to hand — it is not committed to the repo. Its text layer is row-misaligned, so a naive `pdftotext -layout` pairs a river with another row's classification. The script below reads by word coordinates and gates on three totals printed in the PDF's own summary table.

- [ ] **Step 1: Install the authoring dependency (not a project dependency)**

```bash
python -m pip install pdfplumber
```

Do **not** add this to `package.json`.

- [ ] **Step 2: Create the generator script**

Create `scripts/generate_waterbodies.py`:

```python
#!/usr/bin/env python3
"""Regenerate src/data/mimaropaWaterbodies.ts from EMB's classified-waterbodies PDF.

The source PDF's text layer is row-misaligned: a naive extraction pairs a
river with a classification belonging to a different row, which would be
invisible in the app and would misstate which effluent standards apply. So
this reads the table by word coordinates, then refuses to write unless three
totals it did not compute itself -- the ones printed in the PDF's own
CLASSIFICATION STAT summary -- all match.

Not part of the app or its test run. Needs `pdfplumber` (pip install
pdfplumber) and is run by hand when EMB publishes an updated list:

    python scripts/generate_waterbodies.py path/to/waterbodies.pdf
"""
import re
import sys
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'mimaropaWaterbodies.ts'
PROVINCES = ['Occidental Mindoro', 'Oriental Mindoro', 'Marinduque', 'Romblon', 'Palawan']
GROUPS = [('principal', 'Principal Rivers'), ('minor', 'Minor Rivers'), ('other', 'Other Waterbodies')]
TABLE_HEADINGS = [('PRINCIPAL RIVERS', 'principal'), ('MINOR RIVERS', 'minor'), ('OTHER WATERBODIES', 'other')]
SKIP = ('ENVIRONMENTAL MANAGEMENT', 'MIMAROPA Region', 'ambient files', 'Note:', 'CLASSIFICATION STAT',
        'Total Number', 'Classifications', 'Assigned', 'PRINCIPAL RIVERS', 'MINOR RIVERS',
        'OTHER WATERBODIES', 'For Classification')

# Expected totals, read off the PDF's own summary table. Update these when the
# source document changes -- that is the point of the check.
EXPECT_TOTAL = 102
EXPECT_CLASSIFICATIONS = 125
EXPECT_PER_PROVINCE = {'Occidental Mindoro': 13, 'Oriental Mindoro': 24,
                       'Marinduque': 8, 'Romblon': 7, 'Palawan': 50}


def lines_of(page):
    """Cluster a page's words into visual lines, left to right."""
    words = sorted(page.extract_words(keep_blank_chars=False), key=lambda w: (round(w['top'], 1), w['x0']))
    out, cur = [], []
    for w in words:
        if cur and w['top'] - cur[0]['top'] > 4:
            out.append(sorted(cur, key=lambda x: x['x0']))
            cur = []
        cur.append(w)
    if cur:
        out.append(sorted(cur, key=lambda x: x['x0']))
    return out


def header_cols(line):
    """x-positions of the NAME/LOCATION/CLASSIFICATION/YEAR columns, if this line is the header."""
    text = ' '.join(w['text'] for w in line)
    if not ('LOCATION' in text and 'CLASSIFICATION' in text and 'NAME' in text):
        return None
    at = {w['text']: w['x0'] for w in line}
    cols = (at.get('NAME'), at.get('LOCATION'), at.get('CLASSIFICATION'), at.get('YEAR'))
    return cols if all(c is not None for c in cols) else None


def extract(pdf_path):
    records, table, province, cols = [], None, None, None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            lines = lines_of(page)
            for line in lines:  # a repeated header re-fixes the column geometry
                cols = header_cols(line) or cols
            starts = []
            for i, line in enumerate(lines):
                text = ' '.join(w['text'] for w in line).strip()
                for heading, key in TABLE_HEADINGS:
                    if heading in text:
                        table = key
                if text.startswith('Province of'):
                    province = text.split('Province of', 1)[1].strip()
                    continue
                if header_cols(line) or any(text.startswith(s) for s in SKIP):
                    continue
                if re.match(r'^\d+\.$|^\d+\.\S', line[0]['text']):
                    starts.append((i, table, province))
            if not cols:
                continue
            name_x0, loc_x0, cls_x0, year_x0 = cols
            for n, (i, tbl, prov) in enumerate(starts):
                end = starts[n + 1][0] if n + 1 < len(starts) else len(lines)
                name, classification = [], []
                for line in lines[i:end]:  # the whole vertical band, so wrapped values survive
                    text = ' '.join(w['text'] for w in line).strip()
                    if text.startswith('Province of') or header_cols(line) or any(text.startswith(s) for s in SKIP):
                        continue
                    for w in line:
                        if re.match(r'^\d+\.$', w['text']):
                            continue
                        mid = (w['x0'] + w['x1']) / 2
                        if name_x0 - 6 <= mid < loc_x0 - 6:
                            name.append(w['text'])
                        elif cls_x0 - 6 <= mid < year_x0 - 6:
                            classification.append(w['text'])
                records.append({'table': tbl, 'province': prov,
                                'name': ' '.join(name).strip(),
                                'classification': ' '.join(classification).strip()})
    return records


def clean(records):
    for r in records:
        r['name'] = re.sub(r'\s+', ' ', r['name']).strip()
        cls = re.sub(r'\s*,\s*', ', ', re.sub(r'\s+', ' ', r['classification']).strip())
        cls = re.sub(r'\s+(For|WATERBODY)$', '', cls)
        # A column-duplication artifact in the source: three rows repeat their
        # last class. The classification-count check below is what catches it.
        if cls == 'A, B, B':
            cls = 'A, B'
        r['classification'] = cls
        # Flatten a nested qualifier so the rendered value doesn't nest parens:
        # 'SC (brackish mangrove)' -> 'SC, brackish mangrove'.
        r['value'] = '{} ({})'.format(r['name'], re.sub(r'\s*\((.*)\)\s*$', r', \1', cls))
    return records


def verify(records):
    problems = []
    if len(records) != EXPECT_TOTAL:
        problems.append('waterbody count {}, expected {}'.format(len(records), EXPECT_TOTAL))
    tokens = sum(len(re.split(r',\s*', re.sub(r'\s*\(.*', '', r['classification']))) for r in records)
    if tokens != EXPECT_CLASSIFICATIONS:
        problems.append('classification count {}, expected {}'.format(tokens, EXPECT_CLASSIFICATIONS))
    for province, expected in EXPECT_PER_PROVINCE.items():
        got = sum(1 for r in records if r['province'] == province)
        if got != expected:
            problems.append('{} has {} waterbodies, expected {}'.format(province, got, expected))
    unknown = {r['province'] for r in records} - set(EXPECT_PER_PROVINCE)
    if unknown:
        problems.append('unexpected provinces: {}'.format(sorted(unknown)))
    blank = [r for r in records if not r['name'] or not r['classification']]
    if blank:
        problems.append('{} record(s) missing a name or classification'.format(len(blank)))
    return problems


def ts_str(value):
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def render(records):
    lines = [
        "// Bundled offline dataset (province -> waterbody group -> options) of the",
        "// receiving bodies of water an outlet can discharge into, for EMB Region 4-B",
        "// (MIMAROPA). Sourced from EMB's \"2020 Updated List of Waterbodies Classified",
        "// and Monitored\" (January 2020) and scoped to the same five provinces as",
        "// src/data/mimaropaLocations.ts. Bundled at build time (not fetched at",
        "// runtime) since the app is offline-first.",
        "//",
        "// GENERATED by scripts/generate_waterbodies.py - do not edit by hand. The",
        "// generator refuses to write unless its counts match the totals printed in",
        "// the source PDF's own summary table, so a hand edit here is unverified.",
        "//",
        "// Each option is \"Name (Classification)\" - the classification is what",
        "// determines the effluent standards an outlet is held to, so it travels with",
        "// the name rather than being looked up separately.",
        "export interface WaterbodyGroup {",
        "  label: string;",
        "  options: string[];",
        "}",
        "",
        "export const WATERBODIES: Record<string, WaterbodyGroup[]> = {",
    ]
    for province in PROVINCES:
        lines.append('  {}: ['.format(ts_str(province)))
        for key, label in GROUPS:
            options = sorted((r['value'] for r in records
                              if r['province'] == province and r['table'] == key), key=str.lower)
            if not options:
                continue
            lines.append("    {{ label: '{}', options: [".format(label))
            lines.extend('      {},'.format(ts_str(o)) for o in options)
            lines.append('    ] },')
        lines.append('  ],')
    lines += ['};', '']
    return '\n'.join(lines)


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: {} <path to waterbodies pdf>'.format(Path(sys.argv[0]).name))
    records = clean(extract(sys.argv[1]))
    problems = verify(records)
    if problems:
        print('Refusing to write - the extraction does not match the PDF summary:', file=sys.stderr)
        for p in problems:
            print('  - {}'.format(p), file=sys.stderr)
        sys.exit(1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render(records), encoding='utf-8')
    print('Wrote {} - {} waterbodies across {} provinces.'.format(OUT, len(records), len(EXPECT_PER_PROVINCE)))


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Run the generator**

```bash
python scripts/generate_waterbodies.py ~/Downloads/2020-updated-list_waterbodies-classified-and-monitored.pdf
```

Expected: `Wrote .../src/data/mimaropaWaterbodies.ts - 102 waterbodies across 5 provinces.`

If it instead prints "Refusing to write", the extraction disagrees with the PDF's own summary. **Do not bypass this.** Report the mismatch — it means either the wrong PDF was supplied or the extraction has drifted.

- [ ] **Step 4: Verify the generated file spot-checks correctly**

Open `src/data/mimaropaWaterbodies.ts` and confirm: `'Romblon'` has a `Minor Rivers` group and an `Other Waterbodies` group but **no** `Principal Rivers` group; `'Marinduque'` contains `'Ulan Bay (SB, SC)'`; `'Palawan'` contains `'Rio Tuba River (SC, brackish mangrove)'`.

- [ ] **Step 5: Write the failing test**

Create `src/constants/waterbodies.test.ts`:

```ts
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
    const every = Object.values(WATERBODIES).flatMap(gs => gs.flatMap(g => g.options));
    every.forEach(option => expect(option).toMatch(/^.+ \([A-Z]{1,2}(, [A-Za-z]+)*\)$/));
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
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npx jest src/constants/waterbodies.test.ts
```

Expected: FAIL — `Cannot find module './waterbodies'`.

- [ ] **Step 7: Write the accessor**

Create `src/constants/waterbodies.ts`:

```ts
// The receiving bodies of water an outlet can discharge into, filtered to
// the establishment's province. Backed by the bundled dataset in
// src/data/mimaropaWaterbodies.ts, mirroring how provinces.ts is backed by
// mimaropaLocations.ts.
import { WATERBODIES, WaterbodyGroup } from '../data/mimaropaWaterbodies';

export type { WaterbodyGroup };

// Appended to every province's list. The 2020 list is not exhaustive - an
// outlet can discharge into an unclassified creek or a drainage canal - and
// reports predating the dropdown hold free text here. Selecting this
// reveals a text box; see decodeReceivingBodyOfWater in waterTypes.ts.
export const WATERBODY_NOT_LISTED = 'Not listed (specify)';

const ALL_GROUPS: WaterbodyGroup[] = Object.values(WATERBODIES).reduce<WaterbodyGroup[]>(
  (merged, groups) => {
    groups.forEach(group => {
      const existing = merged.find(g => g.label === group.label);
      if (existing) existing.options = [...existing.options, ...group.options].sort();
      else merged.push({ label: group.label, options: [...group.options] });
    });
    return merged;
  },
  [],
);

// An establishment outside EMB Region 4-B, or one whose province was never
// filled in, gets every province's waterbodies rather than an empty picker.
// A dropdown with nothing in it is a dead end; a long one is merely long,
// and SelectField has a search box.
export function getWaterbodyGroups(province: string): WaterbodyGroup[] {
  return WATERBODIES[province] ?? ALL_GROUPS;
}
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
npx jest src/constants/waterbodies.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass; test count is 599 + the new cases.

- [ ] **Step 10: Commit**

```bash
git add scripts/generate_waterbodies.py src/data/mimaropaWaterbodies.ts src/constants/waterbodies.ts src/constants/waterbodies.test.ts
git commit -m "feat(water): bundle EMB's classified waterbodies as reference data

Adds the receiving bodies of water an outlet can discharge into, from
EMB's 2020 Updated List of Waterbodies Classified and Monitored, scoped
to the same five MIMAROPA provinces as the existing address dataset.

The generator reads the table by word coordinates rather than by text
layout - the PDF's text layer is row-misaligned and pairs a river with
another row's classification - and refuses to write unless the totals it
extracts match the three printed in the document's own summary table.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: SelectField group headers

**Files:**
- Modify: `src/components/form/SelectField.tsx`
- Test: `src/components/form/SelectField.test.tsx`

**Interfaces:**
- Consumes: nothing (deliberately — this primitive must not import from `src/data` or `src/features`).
- Produces: `SelectGroup { label: string; options: string[] }` and an optional `groups?: SelectGroup[]` prop on `SelectField`. Structurally identical to `WaterbodyGroup`, so a `WaterbodyGroup[]` may be passed directly.

**Background:** `SelectField` currently takes `options: string[]` and renders them in a `FlatList` with `keyExtractor={item => item}`. Palawan's list runs 21 principal → 19 minor → 10 other with no visual break, so the ordering is invisible without headers. Every existing caller passes `options` and must keep working untouched.

- [ ] **Step 1: Write the failing test**

Append to `src/components/form/SelectField.test.tsx`:

```ts
describe('SelectField groups', () => {
  const groups = [
    { label: 'Principal Rivers', options: ['Boac River (C)', 'Tagum River (C)'] },
    { label: 'Other Waterbodies', options: ['Ulan Bay (SB, SC)'] },
  ];

  const openPicker = (tree: renderer.ReactTestRenderer) => {
    act(() => {
      tree.root.findAll(n => n.type === TouchableOpacity)[0].props.onPress();
    });
  };

  it('renders a header above each group', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={() => {}} />,
      );
    });
    openPicker(tree);
    const texts = JSON.stringify(tree.toJSON());
    expect(texts).toContain('Principal Rivers');
    expect(texts).toContain('Other Waterbodies');
    expect(texts).toContain('Boac River (C)');
  });

  // A header is a label, not a choice. Tapping it must not select it, or an
  // inspector ends up with "Principal Rivers" recorded as their outlet's
  // receiving water.
  it('does not select a header when it is tapped', () => {
    const onSelect = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={onSelect} />,
      );
    });
    openPicker(tree);
    const header = tree.root.findAll(
      n => n.type === Text && [n.props.children].flat().includes('Principal Rivers'),
    )[0];
    expect(header.parent?.props.onPress).toBeUndefined();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still selects a real option', () => {
    const onSelect = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={onSelect} />,
      );
    });
    openPicker(tree);
    const option = tree.root.findAll(
      n => n.type === Text && [n.props.children].flat().includes('Boac River (C)'),
    )[0];
    act(() => { option.parent!.props.onPress(); });
    expect(onSelect).toHaveBeenCalledWith('Boac River (C)');
  });

  // Otherwise a search matching nothing in a group leaves its header
  // stranded above a gap.
  it('drops a header whose options all filter out', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={() => {}} />,
      );
    });
    openPicker(tree);
    const search = tree.root.findAll(n => n.type === TextInput)[0];
    act(() => { search.props.onChangeText('Ulan'); });
    const texts = JSON.stringify(tree.toJSON());
    expect(texts).toContain('Other Waterbodies');
    expect(texts).not.toContain('Principal Rivers');
  });
});
```

Add whatever imports the existing file lacks — it will already import `React`, `renderer`, `act`, and `SelectField`; you may need `Text`, `TextInput`, `TouchableOpacity` from `react-native`.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/components/form/SelectField.test.tsx -t "SelectField groups"
```

Expected: FAIL — headers are not rendered, because `groups` is not a recognised prop.

- [ ] **Step 3: Implement the grouped list**

In `src/components/form/SelectField.tsx`, add the exported type and the prop:

```ts
export interface SelectGroup {
  label: string;
  options: string[];
}
```

Add to `SelectFieldProps`:

```ts
  // An alternative to `options` for lists whose ordering carries meaning
  // the reader can't infer - a waterbody list runs principal rivers, then
  // minor, then other, which looks merely unsorted without headers. Headers
  // are labels, not choices, and are never selectable.
  groups?: SelectGroup[];
```

Make `options` optional (`options?: string[]`) and default it: `options = []`.

Replace the `filtered` memo with one that produces tagged rows:

```ts
type Row = { kind: 'header'; text: string } | { kind: 'option'; text: string };

const rows = useMemo<Row[]>(() => {
  const q = search.trim().toLowerCase();
  const keep = (o: string) => !q || o.toLowerCase().includes(q);
  if (!groups) {
    return options.filter(keep).map(text => ({ kind: 'option' as const, text }));
  }
  return groups.flatMap(group => {
    const kept = group.options.filter(keep);
    // A header with nothing under it would sit above a gap.
    if (kept.length === 0) return [];
    return [
      { kind: 'header' as const, text: group.label },
      ...kept.map(text => ({ kind: 'option' as const, text })),
    ];
  });
}, [groups, options, search]);

// Headers aren't choices, so they don't count toward the threshold that
// decides whether this list is long enough to need a search box.
const optionCount = groups
  ? groups.reduce((n, g) => n + g.options.length, 0)
  : options.length;
```

Change the search-box condition from `options.length > 6` to `optionCount > 6`.

Replace the `FlatList` with:

```tsx
<FlatList
  data={rows}
  keyExtractor={row => `${row.kind}:${row.text}`}
  style={{ maxHeight: 320 }}
  renderItem={({ item }) =>
    item.kind === 'header' ? (
      <View style={styles.groupHeader}>
        <Text style={styles.groupHeaderText}>{item.text}</Text>
      </View>
    ) : (
      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          onSelect(item.text);
          setSearch('');
          setOpen(false);
        }}>
        <Text style={item.text === value ? styles.optionTextActive : styles.optionText}>
          {item.text}
        </Text>
        {item.text === value && <Ionicons name="checkmark" size={16} color={Colors.green} />}
      </TouchableOpacity>
    )
  }
  ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
/>
```

Add to the `StyleSheet`:

```ts
  groupHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.surfaceMuted ?? Colors.background,
  },
  groupHeaderText: {
    ...Type.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
```

If `Colors.surfaceMuted` does not exist, use an existing muted background token from `src/design/colors.ts` rather than inventing a hex value; if `Type.caption` does not exist, use the smallest existing scale entry.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/components/form/SelectField.test.tsx
```

Expected: PASS, including every pre-existing test in the file — the `options` path must be unchanged.

- [ ] **Step 5: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass. Every existing `SelectField` caller still compiles.

- [ ] **Step 6: Commit**

```bash
git add src/components/form/SelectField.tsx src/components/form/SelectField.test.tsx
git commit -m "feat(form): let SelectField group its options under headers

A list whose ordering carries meaning - waterbodies run principal rivers,
then minor, then other - reads as merely unsorted without them. Headers
are labels rather than choices: they aren't selectable, they don't count
toward the threshold that shows the search box, and one whose options all
filter out is dropped rather than left above a gap.

Additive. Callers passing `options` are unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Receiving body of water — types, save rule, legacy decode

**Files:**
- Modify: `src/features/inspections/water/waterTypes.ts`
- Test: `src/features/inspections/water/receivingBodyOfWater.test.tsx` (create; component tests are added to it in Tasks 4–5)

**Interfaces:**
- Consumes: `getWaterbodyGroups`, `WATERBODY_NOT_LISTED` (Task 1).
- Produces, all from `waterTypes.ts`:
  - `WwtpDetailCard` gains `receivingBodyOfWaterOther: string`
  - `decodeReceivingBodyOfWater(stored: string, province: string): { selection: string; other: string }`
  - `receivingBodyOfWaterForSave(selection: string, other: string): string`
  - `describeReceivingBodyOfWater(detail: WwtpDetailCard): string`

**Background:** This mirrors the existing `nonWwtpTreatmentFor` / `describeNonWwtpTreatment` pair in the same file (`waterTypes.ts:166` and `:191`) — read those first; the comments there explain the "forgiving form, strict record" boundary this follows.

- [ ] **Step 1: Write the failing test**

Create `src/features/inspections/water/receivingBodyOfWater.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/receivingBodyOfWater.test.tsx
```

Expected: FAIL — `decodeReceivingBodyOfWater is not a function`.

- [ ] **Step 3: Implement**

In `src/features/inspections/water/waterTypes.ts`, add the import:

```ts
import { getWaterbodyGroups, WATERBODY_NOT_LISTED } from '../../../constants/waterbodies';
```

Add the field to `WwtpDetailCard` (after `receivingBodyOfWater`):

```ts
  receivingBodyOfWaterOther: string;
```

Add `receivingBodyOfWaterOther: ''` to `emptyWwtpDetail`.

Append these functions:

```ts
// ── Receiving body of water ──────────────────────────────────────────────────
// The field stores one string either way: the picked option, or - when the
// receiving water isn't on EMB's list - whatever the inspector typed. The
// form splits that back into a selection and a text box on open and rejoins
// it on save, so the record never holds a "Not listed (specify)" label
// standing in for a real name.

export function decodeReceivingBodyOfWater(
  stored: string,
  province: string,
): { selection: string; other: string } {
  if (!stored) return { selection: '', other: '' };
  const known = getWaterbodyGroups(province).some(g => g.options.includes(stored));
  return known
    ? { selection: stored, other: '' }
    : { selection: WATERBODY_NOT_LISTED, other: stored };
}

export function receivingBodyOfWaterForSave(selection: string, other: string): string {
  if (selection !== WATERBODY_NOT_LISTED) return selection;
  return other.trim();
}

export function describeReceivingBodyOfWater(detail: WwtpDetailCard): string {
  const value = receivingBodyOfWaterForSave(
    detail.receivingBodyOfWater,
    detail.receivingBodyOfWaterOther,
  );
  return value || '—';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/receivingBodyOfWater.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/inspections/water/waterTypes.ts src/features/inspections/water/receivingBodyOfWater.test.tsx
git commit -m "feat(water): split receiving body of water into option and free text

The field stores one string either way - the picked waterbody, or a typed
name when the receiving water isn't on EMB's list. Decoding splits that
back apart on open so legacy hand-typed values survive as \"not listed\"
with their text intact, and the save rule rejoins it, dropping text
stranded by re-picking a real option.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Receiving body of water — create form

**Files:**
- Modify: `src/features/inspections/water/WaterExtraFormSections.tsx:376-390` (the `receivingBodyOfWater` `TextField` inside `case 'wwtpDetails'`)
- Modify: `src/features/inspections/water/WaterInspectionFormScreen.tsx:209`
- Test: `src/features/inspections/water/receivingBodyOfWater.test.tsx` (append)

**Interfaces:**
- Consumes: `getWaterbodyGroups`, `WATERBODY_NOT_LISTED` (Task 1); `SelectGroup` prop on `SelectField` (Task 2); `WwtpDetailCard.receivingBodyOfWaterOther`, `decodeReceivingBodyOfWater` (Task 3).
- Produces: `WaterExtraFormSectionsViewProps` gains `province: string` (required).

- [ ] **Step 1: Write the failing test**

Append to `src/features/inspections/water/receivingBodyOfWater.test.tsx`. The mock block at the top is required — copy it from `nonWwtpTreatment.test.tsx:12-30`, which explains why:

```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SelectField, TextField } from '../../../components/form';
import { WaterExtraFormSectionsView } from './WaterExtraFormSections';
import { buildWaterReportTabs } from './waterReportTabs';
import { emptyWaterComplianceForm, emptyWwtpDetail, WaterComplianceFormState } from './waterTypes';

jest.mock('../../../db/database', () => ({
  database: { write: async (fn: () => Promise<void>) => fn() },
  collections: { complianceWater: { find: async () => ({ update: () => {} }) } },
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

const wastewaterTab = buildWaterReportTabs().find(t => t.key === 'wastewaterpollution')!;

function renderForm(
  value: WaterComplianceFormState,
  province: string,
  onChange: (v: WaterComplianceFormState) => void = () => {},
) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WaterExtraFormSectionsView
        value={value}
        onChange={onChange}
        mainTab={wastewaterTab}
        hasDp={false}
        province={province}
      />,
    );
  });
  return tree;
}

const withOneOutlet = (patch: Partial<ReturnType<typeof emptyWwtpDetail>> = {}) => ({
  ...emptyWaterComplianceForm(),
  hasWwtp: 'yes' as const,
  wwtpDetails: [{ ...emptyWwtpDetail('1'), ...patch }],
});

const receivingField = (tree: renderer.ReactTestRenderer) =>
  tree.root.find(
    n => n.type === SelectField && n.props.label === 'Receiving Body of Water (Water Classification)',
  );

describe('Receiving Body of Water (create form, section 5C)', () => {
  it('offers the establishment’s own province’s waterbodies', () => {
    const options = receivingField(renderForm(withOneOutlet(), 'Marinduque')).props.groups
      .flatMap((g: { options: string[] }) => g.options);
    expect(options).toContain('Boac River (C)');
    expect(options).not.toContain('Honda Bay (SB)');
  });

  it('groups them principal, then minor, then other', () => {
    const labels = receivingField(renderForm(withOneOutlet(), 'Marinduque')).props.groups
      .map((g: { label: string }) => g.label);
    expect(labels).toEqual(['Principal Rivers', 'Minor Rivers', 'Other Waterbodies']);
  });

  it('always offers the not-listed escape hatch', () => {
    const options = receivingField(renderForm(withOneOutlet(), 'Marinduque')).props.groups
      .flatMap((g: { options: string[] }) => g.options);
    expect(options).toContain('Not listed (specify)');
  });

  it('hides the free-text box until not-listed is picked', () => {
    const tree = renderForm(withOneOutlet(), 'Marinduque');
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify').length).toBe(0);
  });

  it('reveals the free-text box once not-listed is picked', () => {
    const tree = renderForm(
      withOneOutlet({ receivingBodyOfWater: 'Not listed (specify)' }),
      'Marinduque',
    );
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify').length).toBe(1);
  });

  it('records the picked waterbody', () => {
    const onChange = jest.fn();
    const tree = renderForm(withOneOutlet(), 'Marinduque', onChange);
    act(() => { receivingField(tree).props.onSelect('Boac River (C)'); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wwtpDetails: [expect.objectContaining({ receivingBodyOfWater: 'Boac River (C)' })],
      }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/receivingBodyOfWater.test.tsx -t "create form"
```

Expected: FAIL — the field is a `TextField` labelled `Receiving Body of Water`, so `receivingField` finds nothing.

- [ ] **Step 3: Implement**

In `WaterExtraFormSections.tsx`:

Add imports:

```ts
import { getWaterbodyGroups, WATERBODY_NOT_LISTED } from '../../../constants/waterbodies';
```

Add `province: string;` to `WaterExtraFormSectionsViewProps` and destructure `province` in the component signature.

Just inside the component body, add:

```ts
// The dropdown offers this establishment's own province plus a way to say
// "none of these" - see getWaterbodyGroups for the out-of-region fallback.
const waterbodyGroups = React.useMemo(
  () => [
    ...getWaterbodyGroups(province),
    { label: 'Not on the list', options: [WATERBODY_NOT_LISTED] },
  ],
  [province],
);
```

Replace the `receivingBodyOfWater` `TextField` (currently at lines 380–388, inside the `<View style={styles.row}>` that also holds `flowMeterDevice`) with:

```tsx
<SelectField
  label="Receiving Body of Water (Water Classification)"
  value={d.receivingBodyOfWater}
  groups={waterbodyGroups}
  onSelect={v => updateWwtpDetail(i, { receivingBodyOfWater: v })}
/>
```

Then, immediately after the `</View>` closing that row, add the conditional specify box:

```tsx
{d.receivingBodyOfWater === WATERBODY_NOT_LISTED && (
  <View style={styles.row}>
    <TextField
      ref={setRef(k('receivingBodyOfWaterOther'))}
      label="Specify"
      value={d.receivingBodyOfWaterOther}
      onChangeText={t => updateWwtpDetail(i, { receivingBodyOfWaterOther: t })}
      placeholder="e.g. Sapa Creek"
      returnKeyType="next"
      blurOnSubmit={false}
      onSubmitEditing={() => focus(k('flowMeterDevice'))}
    />
  </View>
)}
```

Because `receivingBodyOfWater` is no longer a `TextInput`, fix the keyboard chain: the `outletLocation` field's `onSubmitEditing` currently focuses `receivingBodyOfWater` — point it at `flowMeterDevice` instead.

In `WaterInspectionFormScreen.tsx:209`, pass the province:

```tsx
<WaterExtraFormSectionsView
  value={waterCompliance}
  onChange={setWaterCompliance}
  mainTab={activeMainTab}
  hasDp={hasDp}
  province={generalInfo.province}
/>
```

In the same file's `writeCompliance`, normalise each detail on save so a stranded specify string never reaches the record. Replace `wwtpDetails: waterCompliance.wwtpDetails,` with:

```ts
wwtpDetails: waterCompliance.wwtpDetails.map(d => ({
  ...d,
  receivingBodyOfWater: receivingBodyOfWaterForSave(
    d.receivingBodyOfWater,
    d.receivingBodyOfWaterOther,
  ),
  receivingBodyOfWaterOther: '',
})),
```

and import `receivingBodyOfWaterForSave` from `./waterTypes`.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/receivingBodyOfWater.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Fix the other callers the new required prop breaks**

```bash
npm run typecheck
```

`wwtpVisibility.test.tsx` and `dpConditionsVisibility.test.tsx` also render `WaterExtraFormSectionsView`. Add `province="Marinduque"` to each render there.

- [ ] **Step 6: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/inspections/water/WaterExtraFormSections.tsx src/features/inspections/water/WaterInspectionFormScreen.tsx src/features/inspections/water/receivingBodyOfWater.test.tsx src/features/inspections/water/wwtpVisibility.test.tsx src/features/inspections/water/dpConditionsVisibility.test.tsx
git commit -m "feat(water): pick the receiving body of water from EMB's list

Free text meant the same river arrived spelled three ways across three
reports and carried no water classification - the figure that decides
which effluent standards an outlet is held to. The picker offers the
establishment's own province, grouped principal/minor/other, with a
not-listed escape hatch for the creeks and canals the 2020 list doesn't
cover.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Receiving body of water — edit screen and read-only card

**Files:**
- Modify: `src/features/inspections/water/WaterComplianceEditSections.tsx` — `WwtpDetailsSection` (from `:397`), its editing fields (around `:507-520`) and its `DetailCard` (`:554`); `WaterExtraSectionsViewProps` (`:1420`) and the `wwtpDetails` case (`:1463`)
- Modify: `src/features/inspections/components/InspectionReportDetailScreen.tsx:226`
- Test: `src/features/inspections/water/receivingBodyOfWater.test.tsx` (append)

**Interfaces:**
- Consumes: everything from Tasks 1–3; the create-form pattern from Task 4.
- Produces: `WaterExtraSectionsViewProps` gains `province: string`; `WwtpDetailsSection` gains a `province: string` prop.

**Background:** The province must come from `report.establishmentSnapshot.province`, **not** from `liveEstablishment`. See the comment at `InspectionReportDetailScreen.tsx:117` — re-opening an old report must not re-scope its dropdown because the establishment record was since corrected.

- [ ] **Step 1: Write the failing test**

Append to `src/features/inspections/water/receivingBodyOfWater.test.tsx`:

```tsx
import { WwtpDetailsSection } from './WaterComplianceEditSections';

const renderEditSection = (details: Record<string, unknown>[], province: string) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WwtpDetailsSection
        complianceId="c1"
        value={details as never}
        canEdit
        onSaved={() => {}}
        province={province}
      />,
    );
  });
  return tree;
};

const startEditing = (tree: renderer.ReactTestRenderer) => {
  const edit = tree.root.findAll(n => typeof n.props.onStartEdit === 'function')[0];
  act(() => { edit.props.onStartEdit(); });
};

describe('Receiving Body of Water (edit screen, section 5C)', () => {
  it('shows the recorded waterbody on the read-only card', () => {
    const tree = renderEditSection(
      [{ ...emptyWwtpDetail('1'), receivingBodyOfWater: 'Boac River (C)' }],
      'Marinduque',
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Boac River (C)');
  });

  // A report written before the dropdown existed holds a hand-typed name.
  // Opening it must show that name, not a "Not listed (specify)" label.
  it('shows legacy free text rather than the not-listed label', () => {
    const tree = renderEditSection(
      [{ ...emptyWwtpDetail('1'), receivingBodyOfWater: 'creek behind the plant' }],
      'Marinduque',
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('creek behind the plant');
    expect(json).not.toContain('Not listed (specify)');
  });

  it('opens legacy free text into the specify box for editing', () => {
    const tree = renderEditSection(
      [{ ...emptyWwtpDetail('1'), receivingBodyOfWater: 'creek behind the plant' }],
      'Marinduque',
    );
    startEditing(tree);
    const specify = tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify');
    expect(specify).toHaveLength(1);
    expect(specify[0].props.value).toBe('creek behind the plant');
  });

  it('offers the establishment’s own province when editing', () => {
    const tree = renderEditSection([emptyWwtpDetail('1')], 'Romblon');
    startEditing(tree);
    const options = tree.root
      .find(n => n.type === SelectField
        && n.props.label === 'Receiving Body of Water (Water Classification)')
      .props.groups.flatMap((g: { options: string[] }) => g.options);
    expect(options).toContain('Cajimos Bay (SC)');
    expect(options).not.toContain('Boac River (C)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/receivingBodyOfWater.test.tsx -t "edit screen"
```

Expected: FAIL — `WwtpDetailsSection` has no `province` prop and still renders a `TextField`.

- [ ] **Step 3: Implement**

In `WaterComplianceEditSections.tsx`:

Add to the imports:

```ts
import { getWaterbodyGroups, WATERBODY_NOT_LISTED } from '../../../constants/waterbodies';
```

and add `decodeReceivingBodyOfWater`, `receivingBodyOfWaterForSave`, `describeReceivingBodyOfWater` to the existing `./waterTypes` import.

Change `WwtpDetailsSection`'s props to include `province: string`, and destructure it.

The section holds its draft through `useEditableSection`. Decode on entry and encode on save, so the draft carries a selection plus text while the record keeps one string:

```ts
const section = useEditableSection<WwtpDetailCard[]>({
  // A stored row holds one string; the form needs it split into the
  // dropdown's selection and the specify box beside it.
  value: value.map(d => {
    const { selection, other } = decodeReceivingBodyOfWater(d.receivingBodyOfWater, province);
    return { ...d, receivingBodyOfWater: selection, receivingBodyOfWaterOther: other };
  }),
  onSave: async wwtpDetails => {
    await patchComplianceWater(complianceId, {
      wwtpDetails: wwtpDetails.map(d => ({
        ...d,
        receivingBodyOfWater: receivingBodyOfWaterForSave(
          d.receivingBodyOfWater,
          d.receivingBodyOfWaterOther,
        ),
        receivingBodyOfWaterOther: '',
      })),
    });
    onSaved();
  },
});

const waterbodyGroups = React.useMemo(
  () => [
    ...getWaterbodyGroups(province),
    { label: 'Not on the list', options: [WATERBODY_NOT_LISTED] },
  ],
  [province],
);
```

Replace the editing-mode `receivingBodyOfWater` `TextField` with the same `SelectField` + conditional `Specify` `TextField` pair as Task 4 Step 3, using `updateDetail(i, …)` instead of `updateWwtpDetail(i, …)`. Repoint `outletLocation`'s `onSubmitEditing` at `flowMeterDevice`.

In the read-only `DetailCard`, replace:

```ts
{ label: 'Receiving Body of Water', value: d.receivingBodyOfWater },
```

with:

```ts
{ label: 'Receiving Body of Water (Water Classification)', value: describeReceivingBodyOfWater(d) },
```

Add `province: string;` to `WaterExtraSectionsViewProps`, destructure it, and pass it into `WwtpDetailsSection` in the `wwtpDetails` case.

In `InspectionReportDetailScreen.tsx:226`:

```tsx
<WaterExtraSectionsView
  compliance={compliance}
  canEdit={canEdit}
  onSaved={refetch}
  mainTab={activeWaterMainTab}
  hasDp={hasDp}
  province={report.establishmentSnapshot.province}
/>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/receivingBodyOfWater.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Fix the other callers the new required prop breaks**

```bash
npm run typecheck
```

`wwtpVisibility.test.tsx` and `dpConditionsVisibility.test.tsx` render `WaterExtraSectionsView` too — add `province="Marinduque"` there.

- [ ] **Step 6: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/inspections/water/WaterComplianceEditSections.tsx src/features/inspections/components/InspectionReportDetailScreen.tsx src/features/inspections/water/receivingBodyOfWater.test.tsx src/features/inspections/water/wwtpVisibility.test.tsx src/features/inspections/water/dpConditionsVisibility.test.tsx
git commit -m "feat(water): pick the receiving body of water on the edit screen too

Scoped to the report's establishment snapshot rather than the live
establishment, so re-opening an old report doesn't re-scope its dropdown
because the establishment record was since corrected. Legacy hand-typed
values open into the specify box with their text intact.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Treatment option lists and the shared checkbox group

**Files:**
- Modify: `src/features/inspections/water/waterChecklistData.ts`
- Create: `src/features/inspections/water/TreatmentCheckboxGroup.tsx`
- Test: `src/features/inspections/water/wwtpComponents.test.tsx` (create)

**Interfaces:**
- Consumes: `CheckboxRow`, `TextField` from `src/components/form`.
- Produces:
  - `PRIMARY_TREATMENT_OPTIONS`, `BIOLOGICAL_TREATMENT_OPTIONS`, `CHEMICAL_TREATMENT_OPTIONS`, `TREATMENT_OTHERS` (value `'Others (specify)'`) from `waterChecklistData.ts`
  - `TreatmentCheckboxGroup` from `TreatmentCheckboxGroup.tsx`, props:
    `{ label: string; options: string[]; selected: string[]; other: string; onChangeSelected: (next: string[]) => void; onChangeOther: (next: string) => void }`

- [ ] **Step 1: Write the failing test**

Create `src/features/inspections/water/wwtpComponents.test.tsx`:

```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { CheckboxRow, TextField } from '../../../components/form';
import { TreatmentCheckboxGroup } from './TreatmentCheckboxGroup';
import {
  PRIMARY_TREATMENT_OPTIONS,
  BIOLOGICAL_TREATMENT_OPTIONS,
  CHEMICAL_TREATMENT_OPTIONS,
  TREATMENT_OTHERS,
} from './waterChecklistData';

describe('treatment option lists', () => {
  it('lists the primary treatment units from the printed form', () => {
    expect(PRIMARY_TREATMENT_OPTIONS).toEqual([
      'Screening',
      'Grit Removal',
      'Oil/Water Separator',
      'Equalization Tank',
      TREATMENT_OTHERS,
    ]);
  });

  it('lists the biological treatment units from the printed form', () => {
    expect(BIOLOGICAL_TREATMENT_OPTIONS).toEqual([
      'Activated Sludge',
      'Anaerobic Digestion',
      'Anaerobic Baffled Reactor (ABR)',
      'Reed Bed System',
      'Trickling Filter',
      'Oxidation/Stabilization Batch',
      'Sequencing Batch Reactor',
      TREATMENT_OTHERS,
    ]);
  });

  it('lists the chemical treatment units from the printed form', () => {
    expect(CHEMICAL_TREATMENT_OPTIONS).toEqual([
      'pH Adjustment',
      'Disinfection',
      'Redox',
      'Flocculation/Coagulation',
      TREATMENT_OTHERS,
    ]);
  });

  // The printed form reads "Tricking Filter". Agreed with the requester
  // that the app uses the correct term.
  it('corrects the printed form’s "Tricking Filter" typo', () => {
    expect(BIOLOGICAL_TREATMENT_OPTIONS).not.toContain('Tricking Filter');
  });
});

const renderGroup = (props: Partial<React.ComponentProps<typeof TreatmentCheckboxGroup>> = {}) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <TreatmentCheckboxGroup
        label="Primary"
        options={PRIMARY_TREATMENT_OPTIONS}
        selected={[]}
        other=""
        onChangeSelected={() => {}}
        onChangeOther={() => {}}
        {...props}
      />,
    );
  });
  return tree;
};

const box = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.find(n => n.type === CheckboxRow && n.props.label === label);

describe('TreatmentCheckboxGroup', () => {
  it('offers every option as a checkbox', () => {
    const tree = renderGroup();
    PRIMARY_TREATMENT_OPTIONS.forEach(o => expect(box(tree, o)).toBeTruthy());
  });

  it('ticks the options already selected', () => {
    const tree = renderGroup({ selected: ['Screening'] });
    expect(box(tree, 'Screening').props.checked).toBe(true);
    expect(box(tree, 'Grit Removal').props.checked).toBe(false);
  });

  it('adds an option when it is ticked', () => {
    const onChangeSelected = jest.fn();
    const tree = renderGroup({ selected: ['Screening'], onChangeSelected });
    act(() => { box(tree, 'Grit Removal').props.onToggle(); });
    expect(onChangeSelected).toHaveBeenCalledWith(['Screening', 'Grit Removal']);
  });

  it('removes an option when it is unticked', () => {
    const onChangeSelected = jest.fn();
    const tree = renderGroup({ selected: ['Screening', 'Grit Removal'], onChangeSelected });
    act(() => { box(tree, 'Screening').props.onToggle(); });
    expect(onChangeSelected).toHaveBeenCalledWith(['Grit Removal']);
  });

  it('hides the free-text box until Others is ticked', () => {
    expect(renderGroup().root.findAll(n => n.type === TextField)).toHaveLength(0);
  });

  it('reveals the free-text box once Others is ticked', () => {
    const tree = renderGroup({ selected: [TREATMENT_OTHERS], other: 'Sedimentation' });
    const fields = tree.root.findAll(n => n.type === TextField);
    expect(fields).toHaveLength(1);
    expect(fields[0].props.value).toBe('Sedimentation');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx
```

Expected: FAIL — `Cannot find module './TreatmentCheckboxGroup'`.

- [ ] **Step 3: Add the option lists**

Append to `src/features/inspections/water/waterChecklistData.ts`:

```ts
// Section 5D's three treatment columns. A WWTP runs several units in each
// stage at once - a screen and a grit chamber ahead of an equalization tank
// is an ordinary train - so these are checkboxes rather than one choice,
// matching the printed inspection form.
export const TREATMENT_OTHERS = 'Others (specify)';

export const PRIMARY_TREATMENT_OPTIONS = [
  'Screening',
  'Grit Removal',
  'Oil/Water Separator',
  'Equalization Tank',
  TREATMENT_OTHERS,
];

// The printed form reads "Tricking Filter"; the app uses the correct term.
// Deliberate, and agreed with EMB - see the design doc.
export const BIOLOGICAL_TREATMENT_OPTIONS = [
  'Activated Sludge',
  'Anaerobic Digestion',
  'Anaerobic Baffled Reactor (ABR)',
  'Reed Bed System',
  'Trickling Filter',
  'Oxidation/Stabilization Batch',
  'Sequencing Batch Reactor',
  TREATMENT_OTHERS,
];

export const CHEMICAL_TREATMENT_OPTIONS = [
  'pH Adjustment',
  'Disinfection',
  'Redox',
  'Flocculation/Coagulation',
  TREATMENT_OTHERS,
];
```

- [ ] **Step 4: Create the shared group component**

Create `src/features/inspections/water/TreatmentCheckboxGroup.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckboxRow, TextField } from '../../../components/form';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { Colors } from '../../../constants/colors';
import { TREATMENT_OTHERS } from './waterChecklistData';

interface TreatmentCheckboxGroupProps {
  label: string;
  options: string[];
  selected: string[];
  other: string;
  onChangeSelected: (next: string[]) => void;
  onChangeOther: (next: string) => void;
}

// One stage of a WWTP's treatment train - Primary, Biological or Chemical.
// The same question three times per outlet card, in both the create form and
// the edit screen, so it lives here rather than being written out six times.
export const TreatmentCheckboxGroup: React.FC<TreatmentCheckboxGroupProps> = ({
  label,
  options,
  selected,
  other,
  onChangeSelected,
  onChangeOther,
}) => {
  const toggle = (option: string) =>
    onChangeSelected(
      selected.includes(option) ? selected.filter(o => o !== option) : [...selected, option],
    );

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {options.map(option => (
        <CheckboxRow
          key={option}
          label={option}
          checked={selected.includes(option)}
          onToggle={() => toggle(option)}
        />
      ))}
      {selected.includes(TREATMENT_OTHERS) && (
        <TextField
          label={`${label} — specify`}
          value={other}
          onChangeText={onChangeOther}
          placeholder="e.g. Sedimentation"
          returnKeyType="done"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.lg },
  label: {
    ...Type.bodySm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
});
```

If `Type.bodySm` is not the token the surrounding form labels use, match whatever `styles.fieldLabel` in `WaterExtraFormSections.tsx` uses instead.

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/inspections/water/waterChecklistData.ts src/features/inspections/water/TreatmentCheckboxGroup.tsx src/features/inspections/water/wwtpComponents.test.tsx
git commit -m "feat(water): add the WWTP treatment option lists and their shared group

A plant runs several units per stage at once, so the printed form asks
these as checkboxes rather than one choice. The group is the same question
three times per outlet across two entry paths, so it lives in one
component rather than six copies.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Component card shape, lenient decode, and summary

**Files:**
- Modify: `src/features/inspections/water/waterTypes.ts`
- Modify: `src/db/models/ComplianceWater.ts:30-36` (comments only)
- Test: `src/features/inspections/water/wwtpComponents.test.tsx` (append)

**Interfaces:**
- Consumes: the option lists and `TREATMENT_OTHERS` (Task 6).
- Produces, from `waterTypes.ts`:
  - `WwtpComponentCard` reshaped — see below
  - `decodeTreatment(stored: unknown, options: string[]): { selected: string[]; other: string }`
  - `decodeWwtpComponent(stored: Record<string, unknown>): WwtpComponentCard`
  - `treatmentForSave(selected: string[], other: string): { selected: string[]; other: string }`
  - `describeTreatment(selected: string[], other: string): string`

**Background:** Stored rows currently hold `primaryTreatment: "Screening, Grit Removal"` — a comma-separated string, because the UI hinted "Comma-separated" and `patchComplianceWater` is a bare `Object.assign` with no transform. There is no data migration: decoding is lenient at read time.

Note also that `ComplianceWater.ts:30-36` documents these columns as snake_case with array values. That has never been true — the stored keys are camelCase. Correct both comments in this task.

- [ ] **Step 1: Write the failing test**

Append to `src/features/inspections/water/wwtpComponents.test.tsx`:

```tsx
import {
  decodeTreatment,
  decodeWwtpComponent,
  treatmentForSave,
  describeTreatment,
  emptyWwtpComponent,
} from './waterTypes';

describe('decoding treatment stored by an older build', () => {
  // Rows written before this change hold a comma-separated string, because
  // the field was one free-text box hinted "Comma-separated".
  it('splits a comma-separated string into ticks', () => {
    expect(decodeTreatment('Screening, Grit Removal', PRIMARY_TREATMENT_OPTIONS)).toEqual({
      selected: ['Screening', 'Grit Removal'],
      other: '',
    });
  });

  it('matches option names case-insensitively', () => {
    expect(decodeTreatment('screening', PRIMARY_TREATMENT_OPTIONS)).toEqual({
      selected: ['Screening'],
      other: '',
    });
  });

  // Anything the list doesn't know is preserved rather than dropped - it's
  // what the inspector actually wrote.
  it('keeps unrecognised text under Others', () => {
    expect(decodeTreatment('Screening, Sedimentation', PRIMARY_TREATMENT_OPTIONS)).toEqual({
      selected: ['Screening', TREATMENT_OTHERS],
      other: 'Sedimentation',
    });
  });

  it('takes an array as it stands', () => {
    expect(decodeTreatment(['Screening'], PRIMARY_TREATMENT_OPTIONS)).toEqual({
      selected: ['Screening'],
      other: '',
    });
  });

  it('reads a missing value as nothing selected', () => {
    expect(decodeTreatment(undefined, PRIMARY_TREATMENT_OPTIONS)).toEqual({ selected: [], other: '' });
  });
});

describe('decoding a whole stored component row', () => {
  it('carries a legacy row across to the new shape', () => {
    expect(
      decodeWwtpComponent({
        outletNo: '1',
        primaryTreatment: 'Screening',
        biologicalTreatment: 'Activated Sludge',
        chemicalTreatment: 'Disinfection',
        otherTreatment: 'none',
      }),
    ).toEqual({
      outletNo: '1',
      wwtp: '',
      primaryTreatment: ['Screening'],
      primaryTreatmentOther: '',
      biologicalTreatment: ['Activated Sludge'],
      biologicalTreatmentOther: '',
      chemicalTreatment: ['Disinfection'],
      chemicalTreatmentOther: '',
      otherTreatment: 'none',
    });
  });
});

describe('what reaches the record', () => {
  it('keeps free text alongside an Others tick', () => {
    expect(treatmentForSave([TREATMENT_OTHERS], ' Sedimentation ')).toEqual({
      selected: [TREATMENT_OTHERS],
      other: 'Sedimentation',
    });
  });

  it('drops free text left behind by an unticked Others', () => {
    expect(treatmentForSave(['Screening'], 'Sedimentation')).toEqual({
      selected: ['Screening'],
      other: '',
    });
  });
});

describe('summarising for a read-only card', () => {
  it('joins the ticked options', () => {
    expect(describeTreatment(['Screening', 'Grit Removal'], '')).toBe('Screening, Grit Removal');
  });

  it('folds the free text into the Others tick it belongs to', () => {
    expect(describeTreatment(['Screening', TREATMENT_OTHERS], 'Sedimentation')).toBe(
      'Screening, Others (specify): Sedimentation',
    );
  });

  it('shows an em dash when nothing was recorded', () => {
    expect(describeTreatment([], '')).toBe('—');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx -t "decoding treatment"
```

Expected: FAIL — `decodeTreatment is not a function`.

- [ ] **Step 3: Implement**

In `waterTypes.ts`, add to the existing `./waterChecklistData` import: `TREATMENT_OTHERS`.

Replace the `WwtpComponentCard` interface with:

```ts
export interface WwtpComponentCard {
  outletNo: string;
  wwtp: string;
  primaryTreatment: string[];
  primaryTreatmentOther: string;
  biologicalTreatment: string[];
  biologicalTreatmentOther: string;
  chemicalTreatment: string[];
  chemicalTreatmentOther: string;
  otherTreatment: string;
}
```

Replace `emptyWwtpComponent` with:

```ts
export const emptyWwtpComponent = (outletNo: string): WwtpComponentCard => ({
  outletNo,
  wwtp: '',
  primaryTreatment: [],
  primaryTreatmentOther: '',
  biologicalTreatment: [],
  biologicalTreatmentOther: '',
  chemicalTreatment: [],
  chemicalTreatmentOther: '',
  otherTreatment: '',
});
```

Append:

```ts
// ── WWTP treatment components ────────────────────────────────────────────────
// Rows written before section 5D became checkboxes hold a comma-separated
// string here, because the field was one free-text box hinted
// "Comma-separated". Decoding is lenient and happens on read: no data
// migration, and a report nobody re-opens is never rewritten.

export function decodeTreatment(
  stored: unknown,
  options: string[],
): { selected: string[]; other: string } {
  const parts = Array.isArray(stored)
    ? stored.map(String)
    : typeof stored === 'string'
      ? stored.split(',').map(s => s.trim())
      : [];
  const selected: string[] = [];
  const unmatched: string[] = [];
  parts.filter(Boolean).forEach(part => {
    const match = options.find(o => o.toLowerCase() === part.toLowerCase());
    if (match) {
      if (!selected.includes(match)) selected.push(match);
    } else {
      unmatched.push(part);
    }
  });
  // What the list doesn't recognise is still what the inspector wrote, so it
  // moves under Others rather than being discarded.
  if (unmatched.length > 0 && !selected.includes(TREATMENT_OTHERS)) {
    selected.push(TREATMENT_OTHERS);
  }
  return { selected, other: unmatched.join(', ') };
}

export function decodeWwtpComponent(stored: Record<string, unknown>): WwtpComponentCard {
  const primary = decodeTreatment(stored.primaryTreatment, PRIMARY_TREATMENT_OPTIONS);
  const biological = decodeTreatment(stored.biologicalTreatment, BIOLOGICAL_TREATMENT_OPTIONS);
  const chemical = decodeTreatment(stored.chemicalTreatment, CHEMICAL_TREATMENT_OPTIONS);
  return {
    outletNo: String(stored.outletNo ?? ''),
    wwtp: String(stored.wwtp ?? ''),
    primaryTreatment: primary.selected,
    primaryTreatmentOther: primary.other,
    biologicalTreatment: biological.selected,
    biologicalTreatmentOther: biological.other,
    chemicalTreatment: chemical.selected,
    chemicalTreatmentOther: chemical.other,
    otherTreatment: String(stored.otherTreatment ?? ''),
  };
}

// Same boundary nonWwtpTreatmentFor draws: text stranded by an untick would
// contradict the boxes beside it, so it never reaches the record.
export function treatmentForSave(
  selected: string[],
  other: string,
): { selected: string[]; other: string } {
  return { selected, other: selected.includes(TREATMENT_OTHERS) ? other.trim() : '' };
}

export function describeTreatment(selected: string[], other: string): string {
  if (selected.length === 0) return '—';
  return selected.map(s => (s === TREATMENT_OTHERS && other ? `${s}: ${other}` : s)).join(', ');
}
```

Add `PRIMARY_TREATMENT_OPTIONS`, `BIOLOGICAL_TREATMENT_OPTIONS`, `CHEMICAL_TREATMENT_OPTIONS` to the `./waterChecklistData` import.

In `src/db/models/ComplianceWater.ts`, correct the two stale comments:

```ts
  // Each item: { outletNo, wwtpDetail, dateOfInstallation, designCapacity,
  //   annualMaintenanceCost, outletLocation, receivingBodyOfWater,
  //   flowMeterDevice, flowRate }. Keys are camelCase: the form object is
  //   written straight through by Object.assign, with no key transform.
  @json('wwtpDetails', asArray)              wwtpDetails!: any[];
  // Each item: { outletNo, wwtp, primaryTreatment[], primaryTreatmentOther,
  //   biologicalTreatment[], biologicalTreatmentOther, chemicalTreatment[],
  //   chemicalTreatmentOther, otherTreatment }. Rows written before section
  //   5D became checkboxes hold comma-separated strings where the arrays
  //   are; decodeWwtpComponent in waterTypes.ts reads both.
  @json('wwtpComponents', asArray)           wwtpComponents!: any[];
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

`typecheck` will now fail in `WaterExtraFormSections.tsx` and `WaterComplianceEditSections.tsx`, which still assign strings to the treatment fields. Those are Tasks 8 and 9 — if you are executing tasks one at a time with a commit gate, temporarily satisfy the compiler by leaving those call sites reading `.join(', ')` on the arrays, and remove that in the next task. Do not commit a red `typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/features/inspections/water/waterTypes.ts src/db/models/ComplianceWater.ts src/features/inspections/water/wwtpComponents.test.tsx
git commit -m "feat(water): model WWTP treatment components as multi-select

Each stage becomes an array plus its own specify text. Rows written by an
older build hold a comma-separated string; decoding is lenient at read
time, so their boxes tick where the text matched and anything else is
preserved under Others - no data migration, and a report nobody re-opens
is never rewritten.

Also corrects two model comments that documented snake_case keys with
array values. Neither was ever true: the form object is written straight
through by Object.assign, so the stored keys are camelCase.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Components — create form

**Files:**
- Modify: `src/features/inspections/water/WaterExtraFormSections.tsx:418-480` (the `case 'wwtpComponents'` block)
- Modify: `src/features/inspections/water/WaterInspectionFormScreen.tsx` (`writeCompliance`)
- Test: `src/features/inspections/water/wwtpComponents.test.tsx` (append)

**Interfaces:**
- Consumes: `TreatmentCheckboxGroup` and the option lists (Task 6); the reshaped `WwtpComponentCard` and `treatmentForSave` (Task 7); the `province` prop added in Task 4.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Append to `src/features/inspections/water/wwtpComponents.test.tsx`. Reuse the mocks and `renderForm` helper from `receivingBodyOfWater.test.tsx` — copy them in, since each test file stands alone.

**Put the `jest.mock` calls and the `import` lines at the top of the file**, alongside the imports Task 6 added, not partway down. Jest hoists `jest.mock` above imports, so a mock written below the tests still applies — but a reader can't tell that, and `WaterExtraFormSectionsView` pulls in `db/database` at import time, so the mock genuinely has to exist.

```tsx
import { WaterExtraFormSectionsView } from './WaterExtraFormSections';
import { buildWaterReportTabs } from './waterReportTabs';
import { emptyWaterComplianceForm, WaterComplianceFormState } from './waterTypes';
import { TextField } from '../../../components/form';

jest.mock('../../../db/database', () => ({
  database: { write: async (fn: () => Promise<void>) => fn() },
  collections: { complianceWater: { find: async () => ({ update: () => {} }) } },
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

const wastewaterTab = buildWaterReportTabs().find(t => t.key === 'wastewaterpollution')!;

function renderForm(
  value: WaterComplianceFormState,
  onChange: (v: WaterComplianceFormState) => void = () => {},
) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WaterExtraFormSectionsView
        value={value}
        onChange={onChange}
        mainTab={wastewaterTab}
        hasDp={false}
        province="Marinduque"
      />,
    );
  });
  return tree;
}

const withOneComponent = (patch: Partial<ReturnType<typeof emptyWwtpComponent>> = {}) => ({
  ...emptyWaterComplianceForm(),
  hasWwtp: 'yes' as const,
  wwtpComponents: [{ ...emptyWwtpComponent('1'), ...patch }],
});

const group = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.find(n => n.type === TreatmentCheckboxGroup && n.props.label === label);

describe('Components of the WWTP (create form, section 5D)', () => {
  // The printed form's section D has a WWTP column beside Outlet No. Without
  // it a report describing two plants gives no way to tell which one a
  // component set belongs to.
  it('offers a WWTP column beside the outlet number', () => {
    const tree = renderForm(withOneComponent());
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'WWTP')).toHaveLength(1);
  });

  it('records what is typed into the WWTP column', () => {
    const onChange = jest.fn();
    const tree = renderForm(withOneComponent(), onChange);
    const field = tree.root.find(n => n.type === TextField && n.props.label === 'WWTP');
    act(() => { field.props.onChangeText('Septic Tank'); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wwtpComponents: [expect.objectContaining({ wwtp: 'Septic Tank' })],
      }),
    );
  });

  it('offers all three treatment stages as checkbox groups', () => {
    const tree = renderForm(withOneComponent());
    expect(group(tree, 'Primary')).toBeTruthy();
    expect(group(tree, 'Biological')).toBeTruthy();
    expect(group(tree, 'Chemical')).toBeTruthy();
  });

  it('records a ticked treatment unit', () => {
    const onChange = jest.fn();
    const tree = renderForm(withOneComponent(), onChange);
    act(() => { group(tree, 'Primary').props.onChangeSelected(['Screening']); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wwtpComponents: [expect.objectContaining({ primaryTreatment: ['Screening'] })],
      }),
    );
  });

  // Each stage keeps its own specify text, so "Sedimentation" under Primary
  // can't leak into Chemical.
  it('keeps each stage’s specify text separate', () => {
    const onChange = jest.fn();
    const tree = renderForm(withOneComponent(), onChange);
    act(() => { group(tree, 'Chemical').props.onChangeOther('Ferric chloride'); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wwtpComponents: [
          expect.objectContaining({ chemicalTreatmentOther: 'Ferric chloride', primaryTreatmentOther: '' }),
        ],
      }),
    );
  });
});
```

Add `TreatmentCheckboxGroup` and `emptyWwtpComponent` to the file's imports if they are not already there.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx -t "create form"
```

Expected: FAIL — there is no `WWTP` field and no `TreatmentCheckboxGroup`.

- [ ] **Step 3: Implement**

In `WaterExtraFormSections.tsx`, add imports:

```ts
import { TreatmentCheckboxGroup } from './TreatmentCheckboxGroup';
import {
  PRIMARY_TREATMENT_OPTIONS,
  BIOLOGICAL_TREATMENT_OPTIONS,
  CHEMICAL_TREATMENT_OPTIONS,
} from './waterChecklistData';
```

Replace the body of each component card in `case 'wwtpComponents'` — everything from the `<View style={styles.row}>` holding `outletNo` through the `otherTreatment` field — with:

```tsx
<View style={styles.row}>
  <TextField
    ref={setRef(k('outletNo'))}
    label="Outlet No."
    value={c.outletNo}
    onChangeText={t => updateWwtpComponent(i, { outletNo: t })}
    returnKeyType="next"
    blurOnSubmit={false}
    onSubmitEditing={() => focus(k('wwtp'))}
  />
  <TextField
    ref={setRef(k('wwtp'))}
    label="WWTP"
    value={c.wwtp}
    onChangeText={t => updateWwtpComponent(i, { wwtp: t })}
    placeholder="e.g. Septic Tank"
    returnKeyType="next"
    blurOnSubmit={false}
  />
</View>
<TreatmentCheckboxGroup
  label="Primary"
  options={PRIMARY_TREATMENT_OPTIONS}
  selected={c.primaryTreatment}
  other={c.primaryTreatmentOther}
  onChangeSelected={v => updateWwtpComponent(i, { primaryTreatment: v })}
  onChangeOther={v => updateWwtpComponent(i, { primaryTreatmentOther: v })}
/>
<TreatmentCheckboxGroup
  label="Biological"
  options={BIOLOGICAL_TREATMENT_OPTIONS}
  selected={c.biologicalTreatment}
  other={c.biologicalTreatmentOther}
  onChangeSelected={v => updateWwtpComponent(i, { biologicalTreatment: v })}
  onChangeOther={v => updateWwtpComponent(i, { biologicalTreatmentOther: v })}
/>
<TreatmentCheckboxGroup
  label="Chemical"
  options={CHEMICAL_TREATMENT_OPTIONS}
  selected={c.chemicalTreatment}
  other={c.chemicalTreatmentOther}
  onChangeSelected={v => updateWwtpComponent(i, { chemicalTreatment: v })}
  onChangeOther={v => updateWwtpComponent(i, { chemicalTreatmentOther: v })}
/>
<View style={styles.row}>
  <TextField
    ref={setRef(k('otherTreatment'))}
    label="Others"
    value={c.otherTreatment}
    onChangeText={t => updateWwtpComponent(i, { otherTreatment: t })}
    returnKeyType="done"
  />
</View>
```

In `WaterInspectionFormScreen.tsx`'s `writeCompliance`, replace `wwtpComponents: waterCompliance.wwtpComponents,` with:

```ts
wwtpComponents: waterCompliance.wwtpComponents.map(c => {
  const primary = treatmentForSave(c.primaryTreatment, c.primaryTreatmentOther);
  const biological = treatmentForSave(c.biologicalTreatment, c.biologicalTreatmentOther);
  const chemical = treatmentForSave(c.chemicalTreatment, c.chemicalTreatmentOther);
  return {
    ...c,
    primaryTreatment: primary.selected,
    primaryTreatmentOther: primary.other,
    biologicalTreatment: biological.selected,
    biologicalTreatmentOther: biological.other,
    chemicalTreatment: chemical.selected,
    chemicalTreatmentOther: chemical.other,
  };
}),
```

and add `treatmentForSave` to the `./waterTypes` import.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/inspections/water/WaterExtraFormSections.tsx src/features/inspections/water/WaterInspectionFormScreen.tsx src/features/inspections/water/wwtpComponents.test.tsx
git commit -m "feat(water): tick WWTP treatment components on the create form

Section D gains the printed form's WWTP column - without it a report
describing two plants gave no way to tell which one a component set
belonged to - and its three treatment stages become checkbox groups, each
with its own specify text.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Components — edit screen and read-only card

**Files:**
- Modify: `src/features/inspections/water/WaterComplianceEditSections.tsx` — `WwtpComponentsSection` (from `:567`), its editing fields (`:600-670`) and its `DetailCard` (`:673-682`)
- Test: `src/features/inspections/water/wwtpComponents.test.tsx` (append)

**Interfaces:**
- Consumes: `TreatmentCheckboxGroup` and the option lists (Task 6); `decodeWwtpComponent`, `treatmentForSave`, `describeTreatment` (Task 7).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Append to `src/features/inspections/water/wwtpComponents.test.tsx`:

```tsx
import { WwtpComponentsSection } from './WaterComplianceEditSections';

const renderComponentsSection = (rows: Record<string, unknown>[]) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WwtpComponentsSection complianceId="c1" value={rows as never} canEdit onSaved={() => {}} />,
    );
  });
  return tree;
};

const startEditing = (tree: renderer.ReactTestRenderer) => {
  const edit = tree.root.findAll(n => typeof n.props.onStartEdit === 'function')[0];
  act(() => { edit.props.onStartEdit(); });
};

describe('Components of the WWTP (edit screen, section 5D)', () => {
  it('summarises the ticked units on the read-only card', () => {
    const tree = renderComponentsSection([
      { outletNo: '1', wwtp: 'STP-1', primaryTreatment: ['Screening', 'Grit Removal'] },
    ]);
    expect(JSON.stringify(tree.toJSON())).toContain('Screening, Grit Removal');
  });

  it('shows the WWTP name on the read-only card', () => {
    const tree = renderComponentsSection([{ outletNo: '1', wwtp: 'STP-1' }]);
    expect(JSON.stringify(tree.toJSON())).toContain('STP-1');
  });

  // A report written by an older build stored one comma-separated string.
  it('ticks the boxes a legacy comma-separated row named', () => {
    const tree = renderComponentsSection([
      { outletNo: '1', primaryTreatment: 'Screening, Grit Removal' },
    ]);
    startEditing(tree);
    const primary = tree.root.find(
      n => n.type === TreatmentCheckboxGroup && n.props.label === 'Primary',
    );
    expect(primary.props.selected).toEqual(['Screening', 'Grit Removal']);
  });

  it('preserves a legacy value the option list doesn’t know', () => {
    const tree = renderComponentsSection([
      { outletNo: '1', primaryTreatment: 'Screening, Sedimentation' },
    ]);
    startEditing(tree);
    const primary = tree.root.find(
      n => n.type === TreatmentCheckboxGroup && n.props.label === 'Primary',
    );
    expect(primary.props.selected).toContain(TREATMENT_OTHERS);
    expect(primary.props.other).toBe('Sedimentation');
  });

  it('offers a WWTP field when editing', () => {
    const tree = renderComponentsSection([{ outletNo: '1' }]);
    startEditing(tree);
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'WWTP')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx -t "edit screen"
```

Expected: FAIL — the section still renders `TextField`s for the treatment stages.

- [ ] **Step 3: Implement**

In `WaterComplianceEditSections.tsx`, add the imports from Task 6 and Task 7, then change `WwtpComponentsSection`'s `useEditableSection` to decode on entry and encode on save:

```ts
const section = useEditableSection<WwtpComponentCard[]>({
  // Rows written by an older build hold comma-separated strings where the
  // arrays now are; decodeWwtpComponent reads both shapes.
  value: value.map(c => decodeWwtpComponent(c as Record<string, unknown>)),
  onSave: async wwtpComponents => {
    await patchComplianceWater(complianceId, {
      wwtpComponents: wwtpComponents.map(c => {
        const primary = treatmentForSave(c.primaryTreatment, c.primaryTreatmentOther);
        const biological = treatmentForSave(c.biologicalTreatment, c.biologicalTreatmentOther);
        const chemical = treatmentForSave(c.chemicalTreatment, c.chemicalTreatmentOther);
        return {
          ...c,
          primaryTreatment: primary.selected,
          primaryTreatmentOther: primary.other,
          biologicalTreatment: biological.selected,
          biologicalTreatmentOther: biological.other,
          chemicalTreatment: chemical.selected,
          chemicalTreatmentOther: chemical.other,
        };
      }),
    });
    onSaved();
  },
});
```

Replace the editing-mode fields with the same `Outlet No.` + `WWTP` row and three `TreatmentCheckboxGroup`s as Task 8 Step 3, using `updateComponent(i, …)` instead of `updateWwtpComponent(i, …)`.

Replace the `DetailCard` fields with:

```ts
fields={[
  { label: 'WWTP', value: c.wwtp },
  { label: 'Primary', value: describeTreatment(c.primaryTreatment, c.primaryTreatmentOther) },
  { label: 'Biological', value: describeTreatment(c.biologicalTreatment, c.biologicalTreatmentOther) },
  { label: 'Chemical', value: describeTreatment(c.chemicalTreatment, c.chemicalTreatmentOther) },
  { label: 'Others', value: c.otherTreatment },
]}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/wwtpComponents.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/inspections/water/WaterComplianceEditSections.tsx src/features/inspections/water/wwtpComponents.test.tsx
git commit -m "feat(water): tick WWTP treatment components on the edit screen too

Reports written by an older build open with their boxes ticked where the
stored text matched an option, and anything the list doesn't know is kept
under Others rather than dropped.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: `wwtpTypeOther` persistence

**Files:**
- Modify: `src/db/schema.ts:28` (version) and `:208` (columns)
- Modify: `src/db/migrations.ts` (append a `toVersion: 13` step)
- Modify: `src/db/models/ComplianceWater.ts:29`
- Modify: `src/services/sync/syncSchema.ts:219`
- Create: `supabase/migrations/20260910120000_add_wwtp_type_other_to_compliance_water.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `ComplianceWater.wwtpTypeOther: string | null`; the sync field mapping `wwtp_type_other` ↔ `wwtpTypeOther`.

**Background:** `wwtpType` is a plain text column, so unlike every other field in this work its specify text has nowhere to go. This follows `supabase/migrations/20260909120000_add_non_wwtp_treatment_to_compliance_water.sql` exactly — read that file first. It is ~1082 lines because `push_changes` must be re-issued whole; the actual change is three insertions.

- [ ] **Step 1: Bump the WatermelonDB schema**

In `src/db/schema.ts`, change `version: 12` to `version: 13`, and add after the `wwtpType` column (line 208):

```ts
        { name: 'wwtpTypeOther',              type: 'string', isOptional: true },
```

- [ ] **Step 2: Add the migration step**

In `src/db/migrations.ts`, append after the `toVersion: 12` entry:

```ts
    {
      toVersion: 13,
      steps: [
        addColumns({
          table: 'compliance_water',
          columns: [{ name: 'wwtpTypeOther', type: 'string', isOptional: true }],
        }),
      ],
    },
```

- [ ] **Step 3: Add the model field**

In `src/db/models/ComplianceWater.ts`, replace the `wwtpType` block with:

```ts
  // wwtpType: 'Physical' | 'Biological' | 'Chemical' | 'Combined' | 'Others'
  @field('wwtpType')                         wwtpType!: string | null;
  // What "Others" means, when that's the answer. Empty otherwise - see
  // wwtpTypeOtherForSave in src/features/inspections/water/waterTypes.ts.
  @field('wwtpTypeOther')                    wwtpTypeOther!: string | null;
```

- [ ] **Step 4: Add the sync mapping**

In `src/services/sync/syncSchema.ts`, after the `wwtp_type` line:

```ts
      wwtp_type_other:             'wwtpTypeOther',
```

- [ ] **Step 5: Write the Supabase migration**

```bash
cp supabase/migrations/20260909120000_add_non_wwtp_treatment_to_compliance_water.sql \
   supabase/migrations/20260910120000_add_wwtp_type_other_to_compliance_water.sql
```

Then edit the copy:

1. Replace the header comment block (lines 1–26) with one describing this change: `compliance_water` gains `wwtp_type_other`, holding what "Others" means when that is the WWTP type; additive and nullable per `docs/sync-contract.md`; full body re-issued because `push_changes` must be redefined whole, based on `20260909120000_add_non_wwtp_treatment_to_compliance_water.sql`.
2. Replace the `alter table` at line 29 with:
   ```sql
   alter table public.compliance_water
     add column if not exists wwtp_type_other text;
   ```
3. In **both** `insert into public.compliance_water (...)` column lists (near lines 667 and 710), change `has_wwtp, non_wwtp_treatment, wwtp_type,` to `has_wwtp, non_wwtp_treatment, wwtp_type, wwtp_type_other,`.
4. In **both** corresponding `values (...)` lists, add after `compliance_water_record->>'wwtp_type',`:
   ```sql
   compliance_water_record->>'wwtp_type_other',
   ```
5. In the on-conflict `set` block (near line 744), add after `wwtp_type = excluded.wwtp_type,`:
   ```sql
   wwtp_type_other = excluded.wwtp_type_other,
   ```

- [ ] **Step 6: Verify the migration is balanced**

```bash
grep -c "wwtp_type_other" supabase/migrations/20260910120000_add_wwtp_type_other_to_compliance_water.sql
```

Expected: **6** — one `alter table`, two column lists, two value lists, one on-conflict set. (The header comment may add more; if so, confirm the six code occurrences individually with `grep -n`.)

- [ ] **Step 7: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass. No test changes yet — this task is persistence only.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts src/db/migrations.ts src/db/models/ComplianceWater.ts src/services/sync/syncSchema.ts supabase/migrations/20260910120000_add_wwtp_type_other_to_compliance_water.sql
git commit -m "feat(db): give compliance_water a wwtp_type_other column

\"Others\" on Type of WWTP recorded that the plant is none of the listed
kinds but not which kind it is, and wwtp_type is a plain text column with
nowhere to put the answer. Additive and nullable, so a client that
predates the field omits it and existing rows keep NULL - correct, since
no inspection before this was asked.

push_changes is re-issued whole because Postgres has no way to alter one
column of a function body; the change itself is three insertions.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Type of WWTP — "Others" specify field

**Files:**
- Modify: `src/features/inspections/water/waterTypes.ts`
- Modify: `src/features/inspections/water/WaterExtraFormSections.tsx:286-295` (`case 'wwtpType'`)
- Modify: `src/features/inspections/water/WaterComplianceEditSections.tsx:365-395` (`WwtpTypeSection`)
- Modify: `src/features/inspections/water/WaterInspectionFormScreen.tsx` (`writeCompliance`)
- Modify: `src/features/inspections/water/WaterComplianceEditSections.tsx:1455` (the `wwtpType` case, to pass the new value)
- Modify: `src/features/inspections/hooks/useInspectionReport.ts:76` and `:254` (the `WaterComplianceView` type and its mapping)
- Test: `src/features/inspections/water/wwtpTypeOther.test.tsx` (create)

**Interfaces:**
- Consumes: `ComplianceWater.wwtpTypeOther` (Task 10).
- Produces: `WaterComplianceFormState.wwtpTypeOther: string`; `wwtpTypeOtherForSave(wwtpType: string, other: string): string`; `describeWwtpType(wwtpType: string, other: string): string`.

**Background:** `WWTP_TYPE_OPTIONS` already ends in `'Others'` (`waterChecklistData.ts:82`). This mirrors `nonWwtpOther` exactly.

- [ ] **Step 1: Write the failing test**

Create `src/features/inspections/water/wwtpTypeOther.test.tsx`:

```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SelectField, TextField } from '../../../components/form';
import { WaterExtraFormSectionsView } from './WaterExtraFormSections';
import { WwtpTypeSection } from './WaterComplianceEditSections';
import { buildWaterReportTabs } from './waterReportTabs';
import {
  emptyWaterComplianceForm,
  wwtpTypeOtherForSave,
  describeWwtpType,
  WaterComplianceFormState,
} from './waterTypes';

jest.mock('../../../db/database', () => ({
  database: { write: async (fn: () => Promise<void>) => fn() },
  collections: { complianceWater: { find: async () => ({ update: () => {} }) } },
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

const wastewaterTab = buildWaterReportTabs().find(t => t.key === 'wastewaterpollution')!;

const renderForm = (
  value: WaterComplianceFormState,
  onChange: (v: WaterComplianceFormState) => void = () => {},
) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WaterExtraFormSectionsView
        value={value}
        onChange={onChange}
        mainTab={wastewaterTab}
        hasDp={false}
        province="Marinduque"
      />,
    );
  });
  return tree;
};

const specifyBoxes = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify the type of WWTP');

describe('Type of WWTP — Others (create form, section 5B)', () => {
  it('hides the specify box until Others is chosen', () => {
    const tree = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'yes', wwtpType: 'Physical' });
    expect(specifyBoxes(tree)).toHaveLength(0);
  });

  it('reveals the specify box once Others is chosen', () => {
    const tree = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'yes', wwtpType: 'Others' });
    expect(specifyBoxes(tree)).toHaveLength(1);
  });

  it('records what is typed', () => {
    const onChange = jest.fn();
    const tree = renderForm(
      { ...emptyWaterComplianceForm(), hasWwtp: 'yes', wwtpType: 'Others' },
      onChange,
    );
    act(() => { specifyBoxes(tree)[0].props.onChangeText('Membrane bioreactor'); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ wwtpTypeOther: 'Membrane bioreactor' }),
    );
  });

  it('asks nothing about the type when there is no WWTP', () => {
    const tree = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'no', wwtpType: 'Others' });
    expect(specifyBoxes(tree)).toHaveLength(0);
  });
});

describe('what reaches the record', () => {
  it('stores the text when Others is the type', () => {
    expect(wwtpTypeOtherForSave('Others', ' Membrane bioreactor ')).toBe('Membrane bioreactor');
  });

  // Text stranded by re-picking a real type would contradict the choice
  // beside it - the same rule nonWwtpTreatmentFor applies.
  it('drops text left behind by a re-picked type', () => {
    expect(wwtpTypeOtherForSave('Physical', 'Membrane bioreactor')).toBe('');
  });
});

describe('summarising for a read-only view', () => {
  it('folds the text into the Others it belongs to', () => {
    expect(describeWwtpType('Others', 'Membrane bioreactor')).toBe('Others: Membrane bioreactor');
  });

  it('shows a listed type as it stands', () => {
    expect(describeWwtpType('Physical', '')).toBe('Physical');
  });

  it('shows an em dash when nothing was recorded', () => {
    expect(describeWwtpType('', '')).toBe('—');
  });
});

describe('Type of WWTP — Others (edit screen, section 5B)', () => {
  const renderSection = (wwtpType: string | null, wwtpTypeOther: string | null) => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WwtpTypeSection
          complianceId="c1"
          value={wwtpType}
          otherValue={wwtpTypeOther}
          canEdit
          onSaved={() => {}}
        />,
      );
    });
    return tree;
  };

  it('shows the specify text on the read-only view', () => {
    const tree = renderSection('Others', 'Membrane bioreactor');
    expect(JSON.stringify(tree.toJSON())).toContain('Others: Membrane bioreactor');
  });

  it('reveals the specify box when editing an Others type', () => {
    const tree = renderSection('Others', 'Membrane bioreactor');
    const edit = tree.root.findAll(n => typeof n.props.onStartEdit === 'function')[0];
    act(() => { edit.props.onStartEdit(); });
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify the type of WWTP'))
      .toHaveLength(1);
  });

  it('does not reveal it for a listed type', () => {
    const tree = renderSection('Physical', '');
    const edit = tree.root.findAll(n => typeof n.props.onStartEdit === 'function')[0];
    act(() => { edit.props.onStartEdit(); });
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify the type of WWTP'))
      .toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/features/inspections/water/wwtpTypeOther.test.tsx
```

Expected: FAIL — `wwtpTypeOtherForSave is not a function`.

- [ ] **Step 3: Implement the state and rules**

In `waterTypes.ts`, add `wwtpTypeOther: string;` to `WaterComplianceFormState` after `wwtpType`, add `wwtpTypeOther: '',` to `emptyWaterComplianceForm`, and append:

```ts
// ── Type of WWTP ─────────────────────────────────────────────────────────────
// "Others" says the plant is none of the listed kinds; this says which kind
// it is. Same boundary as nonWwtpTreatmentFor: text stranded by re-picking a
// listed type would contradict the choice beside it, so it never reaches the
// record.

export function wwtpTypeOtherForSave(wwtpType: string, other: string): string {
  return wwtpType === 'Others' ? other.trim() : '';
}

export function describeWwtpType(wwtpType: string, other: string): string {
  if (!wwtpType) return '—';
  return wwtpType === 'Others' && other ? `${wwtpType}: ${other}` : wwtpType;
}
```

- [ ] **Step 4: Implement the create form**

In `WaterExtraFormSections.tsx`, replace the `case 'wwtpType'` return (the branch where a WWTP exists) with:

```tsx
return (
  <FormSection icon="business-outline" title="B. Type of WWTP">
    <SelectField
      label="WWTP Type"
      value={value.wwtpType}
      options={WWTP_TYPE_OPTIONS}
      onSelect={v => set('wwtpType', v)}
    />
    {value.wwtpType === 'Others' && (
      <TextField
        ref={setRef('wwtpTypeOther')}
        label="Specify the type of WWTP"
        value={value.wwtpTypeOther}
        onChangeText={t => set('wwtpTypeOther', t)}
        placeholder="e.g. Membrane bioreactor"
        returnKeyType="done"
      />
    )}
  </FormSection>
);
```

In `WaterInspectionFormScreen.tsx`'s `writeCompliance`, after `wwtpType: waterCompliance.wwtpType || null,` add:

```ts
wwtpTypeOther: wwtpTypeOtherForSave(waterCompliance.wwtpType, waterCompliance.wwtpTypeOther) || null,
```

and add `wwtpTypeOtherForSave` to the `./waterTypes` import.

- [ ] **Step 5: Implement the edit screen**

In `WaterComplianceEditSections.tsx`, change `WwtpTypeSection` to take both values and save both:

```tsx
export const WwtpTypeSection: React.FC<{
  complianceId: string;
  value: string | null;
  otherValue: string | null;
  canEdit: boolean;
  onSaved: () => void;
}> = ({ complianceId, value, otherValue, canEdit, onSaved }) => {
  const section = useEditableSection<{ wwtpType: string; wwtpTypeOther: string }>({
    value: { wwtpType: value || '', wwtpTypeOther: otherValue || '' },
    onSave: async draft => {
      await patchComplianceWater(complianceId, {
        wwtpType: draft.wwtpType || null,
        wwtpTypeOther: wwtpTypeOtherForSave(draft.wwtpType, draft.wwtpTypeOther) || null,
      });
      onSaved();
    },
  });

  return (
    <FormSection
      icon="business-outline"
      title="B. Type of WWTP"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} canEdit={canEdit} />
      }>
      {section.editing ? (
        <>
          <SelectField
            label="WWTP Type"
            value={section.draft.wwtpType}
            options={WWTP_TYPE_OPTIONS}
            onSelect={v => section.setDraft({ ...section.draft, wwtpType: v })}
          />
          {section.draft.wwtpType === 'Others' && (
            <TextField
              label="Specify the type of WWTP"
              value={section.draft.wwtpTypeOther}
              onChangeText={t => section.setDraft({ ...section.draft, wwtpTypeOther: t })}
              placeholder="e.g. Membrane bioreactor"
              returnKeyType="done"
            />
          )}
        </>
      ) : (
        <TextField
          label="WWTP Type"
          value={describeWwtpType(section.draft.wwtpType, section.draft.wwtpTypeOther)}
          readOnly
        />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};
```

Add `wwtpTypeOtherForSave` and `describeWwtpType` to the `./waterTypes` import.

At the `wwtpType` case in `WaterExtraSectionsView` (`:1455`), pass the new prop:

```tsx
<WwtpTypeSection
  complianceId={complianceId}
  value={compliance.wwtpType}
  otherValue={compliance.wwtpTypeOther}
  canEdit={canEdit}
  onSaved={onSaved}
/>
```

`WaterComplianceData` in that file is an alias for `WaterComplianceView`, imported from `../hooks/useInspectionReport` (`WaterComplianceEditSections.tsx:32`). Add the field there in two places:

- `src/features/inspections/hooks/useInspectionReport.ts:76` — after `wwtpType: string | null;` add:
  ```ts
  wwtpTypeOther: string | null;
  ```
- `src/features/inspections/hooks/useInspectionReport.ts:254` — after `wwtpType: c.wwtpType,` add:
  ```ts
  wwtpTypeOther: c.wwtpTypeOther,
  ```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npx jest src/features/inspections/water/wwtpTypeOther.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run the full checks**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/inspections/water/waterTypes.ts src/features/inspections/water/WaterExtraFormSections.tsx src/features/inspections/water/WaterComplianceEditSections.tsx src/features/inspections/water/WaterInspectionFormScreen.tsx src/features/inspections/water/wwtpTypeOther.test.tsx
git commit -m "feat(water): say what \"Others\" means on Type of WWTP

The option recorded that the plant is none of the listed kinds but not
which kind it is. Text stranded by re-picking a listed type is dropped on
save, so the record can't describe two answers at once.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Step 1: Full check from a clean state**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass. Test count is the 599 baseline plus roughly 60 new cases.

- [ ] **Step 2: Confirm the migration applies against a real database**

```bash
npx supabase db reset
```

Expected: every migration applies in order, including the new one, with no error.

- [ ] **Step 3: Manual smoke test on a device**

The schema went from 12 to 13, so a device with an existing install exercises the WatermelonDB migration path — a fresh install does not. Install over an existing build and confirm:

1. An existing water report opens without a crash (proves migration v13 applied).
2. Its section D shows ticked boxes matching whatever comma-separated text it held.
3. A new report's Receiving Body of Water dropdown shows the establishment's province, grouped with headers.
4. Sync completes and `wwtp_type_other` arrives in Supabase.

- [ ] **Step 4: Update the spec's status line**

In `docs/superpowers/specs/2026-09-10-water-report-form-revisions-design.md`, change `Status: designed, not implemented.` to `Status: implemented.` and commit:

```bash
git add docs/superpowers/specs/2026-09-10-water-report-form-revisions-design.md
git commit -m "docs(water): mark the form-revisions design implemented

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
