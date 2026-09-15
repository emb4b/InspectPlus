# Export Inspection Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Export tab's Generate button produce filled-in copies of the official EMB `.docx` forms on the device and hand them to the OS share sheet.

**Architecture:** A `src/features/export/` module: a pure mapper layer turns a plain `ReportBundle` (read once from WatermelonDB) into a flat `TemplateData` object; a type-agnostic `renderDocx` fills a tagged template with docxtemplater + pizzip and embeds photos through docxtemplater's raw-XML tag; an orchestrator runs the selected reports sequentially, zips when there's more than one, and shares. Templates are the five EMB forms with merge tags inserted directly in `word/document.xml`, checked in under `assets/templates/`.

**Tech Stack:** React Native / Expo SDK 55, TypeScript, WatermelonDB, docxtemplater 3.x, pizzip 3.x, expo-asset, expo-file-system (File/Directory/Paths API), expo-sharing, expo-image-manipulator, Jest (jest-expo preset).

**Spec:** `docs/superpowers/specs/2026-09-15-export-inspection-report-design.md`

## Refinements the plan makes to the spec

Two details the spec left open or worded differently, decided here so every task agrees:

- **Tagging is recipe-driven, not hand-edited.** Untagged originals live in `assets/templates/originals/`, a JSON recipe per template in `assets/templates/recipes/`, and `npm run tag-templates` regenerates the tagged `assets/templates/*.docx` (Task 11). Same outcome the spec asked for — tagged copies checked in — but a re-tag after an EMB revision is a coordinate fix, not a repeat of 250 manual edits.
- **Photos are downscaled before embedding** to a 1600 px long edge, JPEG 0.8, via `expo-image-manipulator` (Task 15). The spec said "photos are what they are"; a twenty-photo report at camera resolution would be a 100 MB file that no mail client accepts, and the form prints them at 3 inches wide.
- **Photo layout data shape:** `photo_rows[]` → `left[]` / `right[]` (0- or 1-element lists) gives the spec's two-per-row grid with plain docxtemplater loops; `renderDocx` fills `photo_drawing` on any row carrying a `photo_id`.
- **The image XML is our own** (Task 4), not the community image module: the last release of `docxtemplater-image-module-free` is years old and the surface needed is ~100 lines that can be unit-tested in Node.

## Global Constraints

- Node ≥ 22.11.0; Expo SDK 55; React Native 0.83; TypeScript strict.
- `npm run lint` (eslint, `--max-warnings 0`), `npm run typecheck`, `npm test` must all pass before every commit. The pre-commit hook runs the full Jest suite (~2–3 min) — give Bash calls a 10-minute timeout.
- Commit messages follow commitlint: `type(scope): subject`, scope ∈ `[auth, sync, snapshot, air, water, hazwaste, eia, survey, establishments, reports, ci, repo, db, supabase, router]`. Use `reports` for the export feature, `repo` for scripts/deps/config, `water`/`air`/`eia`/`hazwaste`/`survey` for a template of that type. Every commit ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Export is on-device and offline. No network is required except the best-effort photo download.
- Checkbox glyphs: `☒` (U+2612) ticked, `☐` (U+2610) unticked.
- Dates print as `DD Month YYYY` (e.g. `05 September 2026`); null/invalid → `''`.
- Row loops pad to the printed row count (`ROW_MINIMUMS`), never truncate.
- Tag names are `snake_case`, section-prefixed. Checkbox tags are `cb_<name>`; loops `{#name}…{/name}`; the photo drawing tag is the raw tag `{@photo_drawing}`.
- Mappers never throw on data. Only a missing template or a render failure is an error.
- Output file names: `<ReportTypeLabel>-<EstablishmentSlug>-<YYYY-MM-DD>.docx`; zip `InspectPlus-exports-YYYYMMDD-HHmm.zip`.
- Templates: `assets/templates/*.docx` are the tagged versions (the untagged originals are in git history at commit `6de8f1c`). Never edit headers/footers, approver names, or legal text.
- Metro must treat `.docx` as an asset (`assetExts`), otherwise `require('…/Water Monitoring.docx')` fails at bundle time.
- Tests that touch a `.docx` run under Node: build the zip with `pizzip` in the test, never with `expo-file-system`.
- Existing test conventions: react-test-renderer with `act()`; module-level mocks prefixed `mock…`; `jest.mock('../../../db/database', () => ({ database: {}, collections: {} }))` in any suite whose import chain reaches WatermelonDB.

---

## File structure

```
scripts/
  docx-template.js                     unpack/pack a .docx (Node CLI + exported functions)
  docx-tags.js                         list the {tags} in a .docx (Node CLI + exported function)
  __tests__/docxTemplate.test.js       round-trip + tag listing tests

src/utils/
  formatReportDate.ts (+ .test.ts)     DD Month YYYY

src/features/export/
  types.ts                             TemplateData, ReportBundle, ExportPhoto, Signatories, ExportResult…
  templates/index.ts                   TEMPLATES: reportTypeKey → { module, label, minimums }; hasTemplate()
  rowMinimums.ts                       ROW_MINIMUMS per loop (single source of truth for padding)
  mappers/primitives.ts (+ .test.ts)   cb(), text(), padRows(), joinNonEmpty(), normalizeLabel()
  mappers/common.ts (+ .test.ts)       shared block (inspection kinds)
  mappers/water.ts (+ .test.ts)        water block
  mappers/survey.ts (+ .test.ts)       survey header block
  mappers/index.ts                     mapBundle(bundle, ctx) → TemplateData
  mappers/fixtures.ts                  full/empty/malformed bundles reused by every mapper + contract test
  render/renderDocx.ts (+ .test.ts)    docxtemplater render with linebreaks, nullGetter, raw photo tags
  render/imagePass.ts (+ .test.ts)     add media parts + rels + content types; build <w:drawing> XML
  render/templateContract.test.ts      every template's tag set == its mapper fixture's key set
  render/renderTemplates.test.ts       render every template with the full fixture; no `{` left
  loadReportBundle.ts (+ .test.ts)     WatermelonDB → ReportBundle
  photos.ts                            resolve + downscale attachment files on device (expo APIs)
  signatories.ts (+ .test.ts)          SignatoryProvider + AsyncStorage implementation
  fileNames.ts (+ .test.ts)            docx / zip names
  exportReports.ts (+ .test.ts)        orchestrator with injected ports (render, fs, share, clock)
  hooks/useExportReports.ts (+ .test.tsx)
  components/SignatorySheet.tsx (+ .test.tsx)
  components/ExportProgressBar.tsx

src/features/inspections/hooks/
  loadInspectionReportDetail.ts        extracted from useInspectionReport (behaviour-preserving)

src/features/attachments/attachmentActions.ts   export resolveLocalFileUri

src/features/establishments/components/
  ExportReportsTab.tsx (+ .test.tsx)   wire Generate → sheet → hook → progress → share
  ReportListCard.tsx                   "No template yet" badge + unselectable

assets/templates/*.docx, *.tags.md
docs/qa-plan.md, README.md, metro.config.js, package.json
```

---

### Task 1: docx unpack/pack + tag-listing scripts

**Files:**
- Create: `scripts/docx-template.js`, `scripts/docx-tags.js`, `scripts/__tests__/docxTemplate.test.js`
- Modify: `package.json` (devDependency `pizzip`), `.eslintrc.js` (Node env for `scripts/`)

**Interfaces:**
- Produces: `unpackDocx(docxPath, outDir)`, `packDocx(dir, docxPath)`, `listTags(docxPath): string[]` (sorted, unique, loop tags reported as their bare name with a `#`/`/`/`@` prefix stripped and recorded separately: `{ tags: string[], loops: string[], raw: string[] }`).

- [ ] **Step 1: Install pizzip and docxtemplater (both runtime deps — the app uses them too)**

```bash
npm install pizzip@^3.2.0 docxtemplater@^3.70.0
```

- [ ] **Step 2: Write the failing test**

`scripts/__tests__/docxTemplate.test.js`:

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const PizZip = require('pizzip');
const { unpackDocx, packDocx } = require('../docx-template');
const { listTags } = require('../docx-tags');

const DOC_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>{gi_name}</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>{#rows}{a}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>{b}{/rows}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>{@photo_drawing}</w:t></w:r></w:p>
<w:p><w:r><w:t>{cb_yes}</w:t></w:r></w:p>
</w:body></w:document>`;

function makeDocx(file) {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('word/document.xml', DOC_XML);
  fs.writeFileSync(file, zip.generate({ type: 'nodebuffer' }));
}

describe('docx-template scripts', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('unpacks to a folder and packs back to an equivalent docx', () => {
    const src = path.join(dir, 'a.docx');
    makeDocx(src);
    const out = path.join(dir, 'unpacked');
    unpackDocx(src, out);
    expect(fs.readFileSync(path.join(out, 'word/document.xml'), 'utf8')).toBe(DOC_XML);

    fs.writeFileSync(path.join(out, 'word/document.xml'), DOC_XML.replace('{gi_name}', '{gi_name2}'));
    const dst = path.join(dir, 'b.docx');
    packDocx(out, dst);
    const zip = new PizZip(fs.readFileSync(dst));
    expect(zip.file('word/document.xml').asText()).toContain('{gi_name2}');
    expect(zip.file('[Content_Types].xml').asText()).toBe('<Types/>');
  });

  it('lists plain, loop and raw tags separately, sorted and unique', () => {
    const src = path.join(dir, 'a.docx');
    makeDocx(src);
    expect(listTags(src)).toEqual({
      tags: ['a', 'b', 'cb_yes', 'gi_name'],
      loops: ['rows'],
      raw: ['photo_drawing'],
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest scripts/__tests__/docxTemplate.test.js`
Expected: FAIL — `Cannot find module '../docx-template'`.

- [ ] **Step 4: Write the scripts**

`scripts/docx-template.js`:

```js
#!/usr/bin/env node
// Unpack a .docx into a folder (so word/document.xml can be edited by hand
// or by a script) and pack it back. A .docx is a zip; nothing else about it
// is special. Used to insert merge tags into the EMB templates under
// assets/templates — see docs/superpowers/specs/2026-09-15-export-inspection-report-design.md.
//
//   node scripts/docx-template.js unpack "assets/templates/Water Monitoring.docx" tmp/water
//   node scripts/docx-template.js pack tmp/water "assets/templates/Water Monitoring.docx"
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function unpackDocx(docxPath, outDir) {
  const zip = new PizZip(fs.readFileSync(docxPath));
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const target = path.join(outDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.asNodeBuffer());
  }
}

function packDocx(dir, docxPath) {
  const zip = new PizZip();
  // [Content_Types].xml first, as Word writes it — some readers expect it.
  const names = walk(dir).sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : a.localeCompare(b)));
  for (const name of names) {
    const bytes = fs.readFileSync(path.join(dir, name));
    const isXml = /\.(xml|rels)$/.test(name);
    zip.file(name, bytes, { compression: isXml ? 'DEFLATE' : 'STORE' });
  }
  fs.writeFileSync(docxPath, zip.generate({ type: 'nodebuffer' }));
}

module.exports = { unpackDocx, packDocx };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'unpack' && a && b) unpackDocx(a, b);
  else if (cmd === 'pack' && a && b) packDocx(a, b);
  else {
    console.error('usage: docx-template.js unpack <file.docx> <dir> | pack <dir> <file.docx>');
    process.exit(1);
  }
}
```

`scripts/docx-tags.js`:

```js
#!/usr/bin/env node
// Lists every merge tag in a .docx's word/document.xml. Word may split a
// tag across runs ("{gi_" in one <w:t>, "name}" in the next) — docxtemplater
// copes with that at render time, but for listing we join all text first.
//
//   node scripts/docx-tags.js "assets/templates/Water Monitoring.docx"
const fs = require('fs');
const PizZip = require('pizzip');

function listTags(docxPath) {
  const zip = new PizZip(fs.readFileSync(docxPath));
  const xml = zip.file('word/document.xml').asText();
  const text = xml.replace(/<[^>]+>/g, '');
  const tags = new Set();
  const loops = new Set();
  const raw = new Set();
  for (const match of text.matchAll(/\{([#/@]?)([A-Za-z0-9_.]+)\}/g)) {
    const [, kind, name] = match;
    if (kind === '#' || kind === '/') loops.add(name);
    else if (kind === '@') raw.add(name);
    else tags.add(name);
  }
  const sorted = set => [...set].sort();
  return { tags: sorted(tags), loops: sorted(loops), raw: sorted(raw) };
}

module.exports = { listTags };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: docx-tags.js <file.docx>');
    process.exit(1);
  }
  const result = listTags(file);
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 5: Let eslint know `scripts/` is Node**

In `.eslintrc.js`, add to `overrides`:

```js
    {
      files: ['scripts/**/*.js'],
      env: { node: true, jest: true },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
```

- [ ] **Step 6: Run test to verify it passes, then lint**

Run: `npx jest scripts/__tests__/docxTemplate.test.js && npx eslint scripts`
Expected: PASS, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts .eslintrc.js
git commit -m "chore(repo): add docx unpack/pack and tag-listing scripts

Tooling for inserting merge tags into the EMB templates by editing
word/document.xml directly, plus pizzip and docxtemplater as runtime
dependencies for the on-device export engine.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Export types, row minimums, mapper primitives, date formatter

**Files:**
- Create: `src/features/export/types.ts`, `src/features/export/rowMinimums.ts`, `src/features/export/mappers/primitives.ts`, `src/features/export/mappers/primitives.test.ts`, `src/utils/formatReportDate.ts`, `src/utils/formatReportDate.test.ts`

**Interfaces:**
- Produces:
  - `type TemplateData = { [key: string]: string | TemplateData[] }`
  - `interface ExportPhoto { attachmentId: string; fileName: string; caption: string | null; capturedAt: string; geoLat: number | null; geoLng: number | null; localUri: string | null; storagePath: string | null; mimeType: string }`
  - `type ReportBundle = InspectionBundle | SurveyBundle` (see code)
  - `interface Signatories { inspectorName; inspectorPosition; supervisorName; supervisorPosition: string }`
  - `interface MapContext { signatories: Signatories }`
  - `cb(on: boolean): '☒' | '☐'`, `text(v: unknown): string`, `padRows<T>(rows: T[], min: number, blank: () => T): T[]`, `joinNonEmpty(parts: unknown[], sep = ', '): string`, `normalizeLabel(s: unknown): string`, `numberText(v: unknown): string`
  - `formatReportDate(iso: string | null | undefined): string`
  - `ROW_MINIMUMS` constants.

- [ ] **Step 1: Write the failing tests**

`src/utils/formatReportDate.test.ts`:

```ts
import { formatReportDate } from './formatReportDate';

describe('formatReportDate', () => {
  it('prints an ISO date as DD Month YYYY', () => {
    expect(formatReportDate('2026-09-05')).toBe('05 September 2026');
  });
  it('accepts a full ISO timestamp and ignores the time', () => {
    expect(formatReportDate('2026-01-31T15:04:05.000Z')).toBe('31 January 2026');
  });
  it('returns an empty string for null, undefined, blank and garbage', () => {
    expect(formatReportDate(null)).toBe('');
    expect(formatReportDate(undefined)).toBe('');
    expect(formatReportDate('')).toBe('');
    expect(formatReportDate('not a date')).toBe('');
  });
});
```

`src/features/export/mappers/primitives.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/formatReportDate.test.ts src/features/export/mappers/primitives.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

`src/utils/formatReportDate.ts`:

```ts
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The date format every exported form uses ("05 September 2026"). Parses
// the YYYY-MM-DD prefix directly rather than through Date so a bare date
// can't drift a day across time zones.
export function formatReportDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return '';
  const month = Number(match[2]);
  if (month < 1 || month > 12) return '';
  return `${match[3]} ${MONTHS[month - 1]} ${match[1]}`;
}
```

`src/features/export/mappers/primitives.ts`:

```ts
// The vocabulary every mapper is written in. A mapper's job is to turn a
// ReportBundle into strings a template can print, and never to throw on
// data — so each helper here accepts `unknown` and blanks what it can't use.

export const TICKED = '☒'; // ☒
export const UNTICKED = '☐'; // ☐

export function cb(on: boolean): string {
  return on ? TICKED : UNTICKED;
}

export function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function numberText(value: unknown): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

// Pads a loop's rows up to the count the printed form shows so a sparse
// report still looks like the official form; a fuller report simply grows.
export function padRows<T>(rows: readonly T[] | undefined | null, min: number, blank: () => T): T[] {
  const list = Array.isArray(rows) ? [...rows] : [];
  while (list.length < min) list.push(blank());
  return list;
}

export function joinNonEmpty(parts: readonly unknown[], separator = ', '): string {
  return parts.map(text).map(s => s.trim()).filter(Boolean).join(separator);
}

// Matches a stored label against a printed row label without caring about
// case, spacing or punctuation ("Water utilities" ↔ "Water Utilities").
export function normalizeLabel(value: unknown): string {
  return text(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    : [];
}
```

`src/features/export/rowMinimums.ts`:

```ts
// How many rows each looped table prints on the blank EMB form. The mapper
// pads every loop up to its minimum (see padRows) so a report with one
// outlet still prints the three outlet rows the form shows. Counted from
// the templates during tagging; each template's .tags.md restates the
// number beside the loop tag. Change both together.
export const ROW_MINIMUMS = {
  productLines: 1,
  permitsExtra: 0,
  abstractedWaterQuality: 5,
  wwtpOutlets: 3,
  wwtpComponents: 2,
  samplingPoints: 2,
  samplingParameters: 4,
  previousParameters: 4,
  dpConditions: 5,
  photoRows: 0,
} as const;
```

`src/features/export/types.ts`:

```ts
import type { InspectionReportSummary, ComplianceView } from '../inspections/hooks/useInspectionReport';
import type { PurposeFormState } from '../inspections/types';

// What a template consumes: flat strings, or arrays of the same shape for
// row loops. Nothing else — docxtemplater would print "[object Object]".
export type TemplateData = { [key: string]: string | TemplateData[] };

export interface ExportPhoto {
  attachmentId: string;
  fileName: string;
  caption: string | null;
  capturedAt: string;
  geoLat: number | null;
  geoLng: number | null;
  localUri: string | null;
  storagePath: string | null;
  mimeType: string;
}

export interface InspectionBundle {
  kind: 'inspection';
  report: InspectionReportSummary;
  purpose: PurposeFormState | null;
  compliance: ComplianceView;
  photos: ExportPhoto[];
}

// A plain copy of the survey_reports row; the survey form doesn't exist in
// the app yet, so this is deliberately just the model's own columns.
export interface SurveyReportData {
  surveyId: string;
  reportControlNumber: string | null;
  inspectionDate: string;
  projectName: string;
  referenceCode: string | null;
  proponentName: string;
  contactPerson: string | null;
  contactPosition: string | null;
  contactNumber: string | null;
  email: string | null;
  projectLocation: string;
  geoLat: number | null;
  geoLng: number | null;
  areaSize: number | null;
  purpose: string;
  documentType: string | null;
  projectStatus: string | null;
  otherFindings: string | null;
  remarksRecommendations: string | null;
  reportStatus: string | null;
}

export interface SurveyBundle {
  kind: 'survey';
  survey: SurveyReportData;
  photos: ExportPhoto[];
}

export type ReportBundle = InspectionBundle | SurveyBundle;

export interface Signatories {
  inspectorName: string;
  inspectorPosition: string;
  supervisorName: string;
  supervisorPosition: string;
}

export interface MapContext {
  signatories: Signatories;
}

// One photo as the renderer sees it: bytes already resolved and downscaled
// on the device (see photos.ts), or absent when the file isn't available.
export interface ImageInput {
  id: string;
  bytes: Uint8Array;
  mime: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

export interface ExportFailure {
  key: string;
  title: string;
  reason: string;
}

export interface ExportResult {
  // The single .docx or the .zip; null when nothing rendered.
  shareUri: string | null;
  succeeded: number;
  failures: ExportFailure[];
  skippedPhotos: number;
  cancelled: boolean;
}
```

- [ ] **Step 4: Run tests to verify they pass; typecheck**

Run: `npx jest src/utils/formatReportDate.test.ts src/features/export/mappers/primitives.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/utils/formatReportDate.ts src/utils/formatReportDate.test.ts src/features/export
git commit -m "feat(reports): add the export module's types, row minimums and mapper primitives

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `renderDocx` — docxtemplater render with linebreaks, blanks and raw photo tags

**Files:**
- Create: `src/features/export/render/renderDocx.ts`, `src/features/export/render/renderDocx.test.ts`
- Modify: `metro.config.js` (add `docx` to `assetExts`)

**Interfaces:**
- Consumes: `TemplateData`, `ImageInput` from Task 2; `embedImages` from Task 4 (stubbed in this task's tests — see note).
- Produces: `renderDocx(template: Uint8Array, data: TemplateData, images: ImageInput[]): Uint8Array` and `RenderError extends Error { tags: string[] }`. Convention: any loop row (at any depth) that carries a string `photo_id` and a `photo_missing_text` gets a `photo_drawing` value injected (raw XML) — either the embedded image's `<w:p><w:r><w:drawing>…` or a paragraph with the missing text. The mappers lay photos out two per row as `photo_rows[]` → `left[]` / `right[]`, each a 0- or 1-element list.

> The image XML itself comes from Task 4's `imagePass.ts`. Write this task with `imagePass.ts` exporting a minimal `embedImages` that returns a `Map<string, string>` of id → `<w:p>` XML using a plain-text paragraph, and let Task 4 replace its internals with the real drawing. The tests below only assert that the raw XML lands in `document.xml` verbatim.

- [ ] **Step 1: Tell Metro `.docx` is an asset**

In `metro.config.js`:

```js
config.resolver = {
  ...resolver,
  assetExts: [...resolver.assetExts.filter(ext => ext !== 'svg'), 'docx'],
  sourceExts: [...resolver.sourceExts, 'svg'],
```

- [ ] **Step 2: Write the failing test**

`src/features/export/render/renderDocx.test.ts`:

```ts
import PizZip from 'pizzip';
import { renderDocx, RenderError } from './renderDocx';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

function docx(body: string): Uint8Array {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('word/_rels/document.xml.rels', RELS);
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generate({ type: 'uint8array' });
}

const p = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const documentXml = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText();

describe('renderDocx', () => {
  it('fills plain tags and turns newlines into line breaks', () => {
    const out = renderDocx(docx(p('{gi_name}') + p('{remarks}')), { gi_name: 'Alpha', remarks: 'a\nb' }, []);
    const xml = documentXml(out);
    expect(xml).toContain('Alpha');
    expect(xml).toContain('<w:br/>');
    expect(xml).not.toContain('{');
  });

  it('prints an empty string for a tag the data does not mention', () => {
    const xml = documentXml(renderDocx(docx(p('[{missing}]')), {}, []));
    expect(xml).toContain('[]');
  });

  it('repeats a table row per loop item', () => {
    const body = `<w:tbl><w:tr><w:tc>${p('{#rows}{a}')}</w:tc><w:tc>${p('{b}{/rows}')}</w:tc></w:tr></w:tbl>`;
    const xml = documentXml(renderDocx(docx(body), { rows: [{ a: '1', b: '2' }, { a: '3', b: '4' }] }, []));
    expect(xml.match(/<w:tr>/g)).toHaveLength(2);
    expect(xml).toContain('3');
  });

  it('injects photo_drawing for every nested row with a photo_id, from the embedded images or the missing text', () => {
    const body = `<w:tbl><w:tr><w:tc>${p('{#photo_rows}{#left}')}${p('{@photo_drawing}')}${p('{caption}{/left}')}</w:tc><w:tc>${p('{#right}')}${p('{@photo_drawing}')}${p('{caption}{/right}{/photo_rows}')}</w:tc></w:tr></w:tbl>`;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const out = renderDocx(
      docx(body),
      {
        photo_rows: [
          {
            left: [{ photo_id: 'a1', caption: 'front gate', photo_missing_text: 'IMG_1.jpg (not downloaded)' }],
            right: [{ photo_id: 'a2', caption: 'outfall', photo_missing_text: 'IMG_2.jpg (not downloaded)' }],
          },
        ],
      },
      [{ id: 'a1', bytes: png, mime: 'image/png', width: 800, height: 600 }],
    );
    const xml = documentXml(out);
    expect(xml).toContain('front gate');
    expect(xml).toContain('IMG_2.jpg (not downloaded)');
    expect(xml).not.toContain('IMG_1.jpg (not downloaded)');
    expect(xml).not.toContain('{');
  });

  it('escapes XML-significant characters in values', () => {
    const xml = documentXml(renderDocx(docx(p('{v}')), { v: 'A & B <C>' }, []));
    expect(xml).toContain('A &amp; B &lt;C&gt;');
  });

  it('throws a RenderError naming the offending tag on a malformed template', () => {
    expect(() => renderDocx(docx(p('{#open}')), {}, [])).toThrow(RenderError);
    try {
      renderDocx(docx(p('{#open}')), {}, []);
    } catch (e) {
      expect((e as RenderError).tags).toContain('open');
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/features/export/render/renderDocx.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `imagePass.ts` (minimal, replaced in Task 4) and `renderDocx.ts`**

`src/features/export/render/imagePass.ts` (minimal version):

```ts
import type PizZip from 'pizzip';
import type { ImageInput } from '../types';

// Placeholder until Task 4: returns a plain paragraph per image so the
// renderer can be built and tested first.
export function embedImages(_zip: PizZip, images: ImageInput[]): Map<string, string> {
  return new Map(images.map(img => [img.id, `<w:p><w:r><w:t>[image ${img.id}]</w:t></w:r></w:p>`]));
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textParagraph(s: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(s)}</w:t></w:r></w:p>`;
}
```

`src/features/export/render/renderDocx.ts`:

```ts
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { ImageInput, TemplateData } from '../types';
import { embedImages, textParagraph } from './imagePass';

// The one place the app touches docxtemplater. Knows nothing about report
// types: bytes in, bytes out. The single convention it does carry is the
// photo rows — any loop row with a `photo_id` gets its `photo_drawing`
// raw-XML value filled here, because only the renderer knows the
// relationship ids the images were embedded under.
export class RenderError extends Error {
  tags: string[];
  constructor(message: string, tags: string[]) {
    super(message);
    this.name = 'RenderError';
    this.tags = tags;
  }
}

interface DocxtemplaterErrorLike {
  properties?: { errors?: { properties?: { id?: string; xtag?: string; explanation?: string } }[]; xtag?: string; explanation?: string };
  message?: string;
}

function toRenderError(error: unknown): RenderError {
  const e = error as DocxtemplaterErrorLike;
  const inner = e.properties?.errors ?? [];
  const tags = inner.map(x => x.properties?.xtag).filter((t): t is string => !!t);
  if (e.properties?.xtag) tags.push(e.properties.xtag);
  const explanation = inner[0]?.properties?.explanation ?? e.properties?.explanation ?? e.message ?? 'render failed';
  return new RenderError(tags.length ? `${explanation} (tag: ${tags.join(', ')})` : explanation, tags);
}

function withPhotoDrawings(data: TemplateData, drawings: Map<string, string>): TemplateData {
  const out: TemplateData = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = Array.isArray(value) ? value.map(row => withPhotoDrawings(row, drawings)) : value;
  }
  if (typeof data.photo_id === 'string') {
    const missing = typeof data.photo_missing_text === 'string' ? data.photo_missing_text : '';
    out.photo_drawing = drawings.get(data.photo_id) ?? textParagraph(missing);
  }
  return out;
}

export function renderDocx(template: Uint8Array, data: TemplateData, images: ImageInput[]): Uint8Array {
  let zip: PizZip;
  try {
    zip = new PizZip(template);
  } catch (e) {
    throw new RenderError(`template is not a valid .docx: ${(e as Error).message}`, []);
  }
  const drawings = embedImages(zip, images);

  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });
    doc.render(withPhotoDrawings(data, drawings));
  } catch (e) {
    throw toRenderError(e);
  }
  return doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' });
}
```

- [ ] **Step 5: Run test to verify it passes; typecheck**

Run: `npx jest src/features/export/render/renderDocx.test.ts && npm run typecheck`
Expected: PASS. If `docxtemplater` types complain about the constructor overload, import as `import Docxtemplater from 'docxtemplater'` and pass the zip as the first argument (v3.40+ API).

- [ ] **Step 6: Commit**

```bash
git add metro.config.js src/features/export/render
git commit -m "feat(reports): render a tagged docx with docxtemplater

Plain tags, row loops, line breaks, blanks for unknown tags, and the
photo-row convention that injects each photo's raw drawing XML.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `imagePass` — embed photos as media parts with `<w:drawing>` XML

**Files:**
- Modify: `src/features/export/render/imagePass.ts`
- Create: `src/features/export/render/imagePass.test.ts`

**Interfaces:**
- Produces: `embedImages(zip: PizZip, images: ImageInput[]): Map<string, string>` — adds `word/media/export_<n>.<ext>`, a `Relationship` per image in `word/_rels/document.xml.rels`, a `<Default Extension="jpeg|png">` in `[Content_Types].xml` if absent, and returns id → `<w:p>…<w:drawing>…</w:p>` sized to fit `MAX_WIDTH_EMU × MAX_HEIGHT_EMU` (3.0in × 3.0in) preserving aspect.

- [ ] **Step 1: Write the failing test**

`src/features/export/render/imagePass.test.ts`:

```ts
import PizZip from 'pizzip';
import { embedImages, MAX_WIDTH_EMU, MAX_HEIGHT_EMU } from './imagePass';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" Id="rId2"/></Relationships>`;

function zipWith(): PizZip {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('word/_rels/document.xml.rels', RELS);
  zip.file('word/document.xml', '<w:document/>');
  return zip;
}

describe('embedImages', () => {
  const jpeg = { id: 'a', bytes: new Uint8Array([0xff, 0xd8, 0xff]), mime: 'image/jpeg' as const, width: 4000, height: 3000 };
  const png = { id: 'b', bytes: new Uint8Array([0x89, 0x50]), mime: 'image/png' as const, width: 600, height: 1200 };

  it('adds a media part, a relationship and the jpeg content type', () => {
    const zip = zipWith();
    const drawings = embedImages(zip, [jpeg, png]);
    expect(zip.file('word/media/export_1.jpeg')).toBeTruthy();
    expect(zip.file('word/media/export_2.png')).toBeTruthy();
    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    expect(rels).toContain('Target="media/export_1.jpeg"');
    expect(rels).toContain('Target="media/export_2.png"');
    expect(rels).toContain('relationships/image');
    const types = zip.file('[Content_Types].xml')!.asText();
    expect(types).toContain('Extension="jpeg"');
    expect(types.match(/Extension="png"/g)).toHaveLength(1);
    expect(drawings.size).toBe(2);
  });

  it('picks relationship ids that do not collide with existing ones', () => {
    const zip = zipWith();
    const drawings = embedImages(zip, [jpeg]);
    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    const ids = [...rels.matchAll(/Id="(rId\d+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(drawings.get('a')).toContain(`r:embed="${ids.find(i => i !== 'rId2')}"`);
  });

  it('scales a landscape image to the max width and a portrait one to the max height', () => {
    const zip = zipWith();
    const drawings = embedImages(zip, [jpeg, png]);
    const extent = (xml: string) => {
      const m = /<wp:extent cx="(\d+)" cy="(\d+)"\/>/.exec(xml)!;
      return { cx: Number(m[1]), cy: Number(m[2]) };
    };
    const a = extent(drawings.get('a')!);
    expect(a.cx).toBe(MAX_WIDTH_EMU);
    expect(a.cy).toBe(Math.round((MAX_WIDTH_EMU * 3000) / 4000));
    const b = extent(drawings.get('b')!);
    expect(b.cy).toBe(MAX_HEIGHT_EMU);
    expect(b.cx).toBe(Math.round((MAX_HEIGHT_EMU * 600) / 1200));
  });

  it('wraps the drawing in a paragraph so the raw tag can replace its paragraph', () => {
    const zip = zipWith();
    const xml = embedImages(zip, [jpeg]).get('a')!;
    expect(xml.startsWith('<w:p>')).toBe(true);
    expect(xml.endsWith('</w:p>')).toBe(true);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('<pic:pic');
  });

  it('falls back to a 4:3 box when the dimensions are unusable', () => {
    const zip = zipWith();
    const xml = embedImages(zip, [{ ...jpeg, width: 0, height: 0 }]).get('a')!;
    expect(xml).toContain(`<wp:extent cx="${MAX_WIDTH_EMU}" cy="${Math.round((MAX_WIDTH_EMU * 3) / 4)}"/>`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/export/render/imagePass.test.ts`
Expected: FAIL — `MAX_WIDTH_EMU` undefined / no media part.

- [ ] **Step 3: Write the real `imagePass.ts`**

```ts
import type PizZip from 'pizzip';
import type { ImageInput } from '../types';

// Puts each photo into the package the way Word does — a part under
// word/media, a relationship from document.xml to it, a content type for
// its extension — and hands back the <w:drawing> paragraph the template's
// raw {@photo_drawing} tag prints. Hand-written because docxtemplater's
// image module is paid and the community fork is unmaintained; this is
// the whole surface the app needs.

const EMU_PER_INCH = 914400;
export const MAX_WIDTH_EMU = 3 * EMU_PER_INCH;
export const MAX_HEIGHT_EMU = 3 * EMU_PER_INCH;
const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const RELS_PATH = 'word/_rels/document.xml.rels';
const CONTENT_TYPES_PATH = '[Content_Types].xml';

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textParagraph(s: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(s)}</w:t></w:r></w:p>`;
}

function fitExtent(width: number, height: number): { cx: number; cy: number } {
  const usable = width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height);
  const w = usable ? width : 4;
  const h = usable ? height : 3;
  const scale = Math.min(MAX_WIDTH_EMU / w, MAX_HEIGHT_EMU / h);
  return { cx: Math.round(w * scale), cy: Math.round(h * scale) };
}

function nextRelId(rels: string): string {
  const used = new Set([...rels.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1])));
  let n = 1;
  while (used.has(n)) n += 1;
  return `rId${n}`;
}

function ensureContentType(zip: PizZip, ext: string, mime: string): void {
  const file = zip.file(CONTENT_TYPES_PATH);
  if (!file) return;
  const xml = file.asText();
  if (new RegExp(`Extension="${ext}"`, 'i').test(xml)) return;
  zip.file(CONTENT_TYPES_PATH, xml.replace('</Types>', `<Default Extension="${ext}" ContentType="${mime}"/></Types>`));
}

function drawingParagraph(relId: string, index: number, name: string, cx: number, cy: number): string {
  return (
    '<w:p><w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    `<wp:docPr id="${1000 + index}" name="${escapeXml(name)}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${index}" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
  );
}

export function embedImages(zip: PizZip, images: ImageInput[]): Map<string, string> {
  const drawings = new Map<string, string>();
  if (images.length === 0) return drawings;

  const relsFile = zip.file(RELS_PATH);
  let rels = relsFile ? relsFile.asText() : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

  images.forEach((img, i) => {
    const index = i + 1;
    const ext = img.mime === 'image/png' ? 'png' : 'jpeg';
    const target = `media/export_${index}.${ext}`;
    zip.file(`word/${target}`, img.bytes, { compression: 'STORE' });
    ensureContentType(zip, ext, img.mime);

    const relId = nextRelId(rels);
    rels = rels.replace('</Relationships>', `<Relationship Type="${IMAGE_REL_TYPE}" Target="${target}" Id="${relId}"/></Relationships>`);

    const { cx, cy } = fitExtent(img.width, img.height);
    drawings.set(img.id, drawingParagraph(relId, index, `export_${index}`, cx, cy));
  });

  zip.file(RELS_PATH, rels);
  return drawings;
}
```

- [ ] **Step 4: Run both render tests to verify they pass**

Run: `npx jest src/features/export/render && npm run typecheck`
Expected: PASS (renderDocx's photo test still passes — it only checks the missing-text branch and absence of `{`).

- [ ] **Step 5: Commit**

```bash
git add src/features/export/render
git commit -m "feat(reports): embed attachment photos into the exported docx

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: On-device spike — prove pizzip + docxtemplater + image XML under Hermes

**Files:**
- Create (throwaway, deleted in Task 18): `src/app/(app)/export-spike.tsx`
- Modify: `package.json` (add `expo-sharing`, `expo-asset`, `expo-image-manipulator`), `app.json` (nothing needed — none of the three requires a config plugin)

**Interfaces:**
- Consumes: `renderDocx`, `embedImages` via `renderDocx`.
- Produces: a go/no-go finding recorded in the plan (Step 6). No code kept.

- [ ] **Step 1: Install the Expo modules**

```bash
npx expo install expo-sharing expo-asset expo-image-manipulator
```

- [ ] **Step 2: Write the spike screen**

`src/app/(app)/export-spike.tsx`:

```tsx
// THROWAWAY — Task 5 spike. Deleted in Task 18.
import React, { useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { renderDocx } from '../../features/export/render/renderDocx';
import type { ImageInput } from '../../features/export/types';

export default function ExportSpike() {
  const [log, setLog] = useState<string[]>([]);
  const say = (s: string) => setLog(l => [...l, `${new Date().toISOString().slice(11, 19)} ${s}`]);

  async function run() {
    try {
      const t0 = Date.now();
      const asset = Asset.fromModule(require('../../../assets/templates/Water Monitoring.docx'));
      await asset.downloadAsync();
      const template = await new File(asset.localUri!).bytes();
      say(`template ${template.byteLength} bytes in ${Date.now() - t0}ms`);

      let images: ImageInput[] = [];
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!picked.canceled) {
        const ctx = ImageManipulator.manipulate(picked.assets[0].uri);
        const ref = await ctx.renderAsync();
        if (ref.width > 1600) ctx.resize({ width: 1600 });
        const saved = await (await ctx.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
        const bytes = await new File(saved.uri).bytes();
        images = [{ id: 'p1', bytes, mime: 'image/jpeg', width: saved.width, height: saved.height }];
        say(`photo ${saved.width}x${saved.height} ${bytes.byteLength} bytes`);
      }

      const t1 = Date.now();
      const out = renderDocx(
        template,
        { photo_rows: [{ left: [{ photo_id: 'p1', caption: 'spike', photo_missing_text: 'none' }], right: [] }] },
        images,
      );
      say(`rendered ${out.byteLength} bytes in ${Date.now() - t1}ms`);

      const dir = Paths.cache;
      const file = new File(dir, 'spike.docx');
      if (file.exists) file.delete();
      file.create();
      file.write(out);
      say(`wrote ${file.uri}`);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: 'Spike',
      });
      say('shared');
    } catch (e) {
      say(`ERROR ${(e as Error).message}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Button title="Run spike" onPress={run} />
      {log.map((l, i) => (
        <Text key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>{l}</Text>
      ))}
    </ScrollView>
  );
}
```

For the spike to exercise the raw photo tag on the untagged template, temporarily edit the template *in the spike only*: unpack `Water Monitoring.docx` with `node scripts/docx-template.js unpack "assets/templates/Water Monitoring.docx" tmp/spike`, then find the `<w:p>` whose `<w:t>` is `ATTACHMENTS` in `tmp/spike/word/document.xml` and replace that whole paragraph with the four below (a raw tag must sit alone in its paragraph):

```xml
<w:p><w:r><w:t>{#photo_rows}{#left}</w:t></w:r></w:p><w:p><w:r><w:t>{@photo_drawing}</w:t></w:r></w:p><w:p><w:r><w:t>{caption}{/left}</w:t></w:r></w:p><w:p><w:r><w:t>{#right}{caption}{/right}{/photo_rows}</w:t></w:r></w:p>
```

Pack it to `assets/templates/spike.docx` (`node scripts/docx-template.js pack tmp/spike assets/templates/spike.docx`) and point the spike's `require` at `spike.docx`. Do not commit `spike.docx`.

- [ ] **Step 3: Build and run on a real Android device**

Run: `npm run android`, then open `/export-spike` (add a temporary `router.push('/export-spike')` button on Home, or type the route in the dev menu's "Open route"). Tap **Run spike**, pick a photo, share to Word / WPS / Google Docs.

- [ ] **Step 4: Verify on-device**

Pass criteria, all required:
1. No `ERROR` line in the log; render time for the 370 KB `document.xml` under 5 s on the test device.
2. The shared file opens in Word (or WPS) without a repair prompt.
3. The photo appears on the last page at ≤ 3 in wide with `spike` beneath it.
4. Checkbox glyphs on the untouched pages still render as boxes (font survived the round trip).

- [ ] **Step 5: Try a 20-photo run**

Change the spike to embed the same picked photo 20 times (`images = Array.from({length: 20}, (_, i) => ({...img, id: 'p'+i}))`, `photos` rows to match). Note peak memory in Android Studio's profiler or `adb shell dumpsys meminfo <package>`; the app must not be killed and the file must still open.

- [ ] **Step 6: Record the finding**

Append to this plan under a `## Spike findings` heading at the bottom: device model, template load ms, render ms for 1 and 20 photos, output size, which viewers opened it, any deviation. If a criterion failed, STOP and report to the user before continuing — the fallback discussed in the spec (a hand-rolled engine) is a different plan.

- [ ] **Step 7: Commit only the dependencies and the finding**

```bash
git checkout -- src/app 2>/dev/null; rm -f "assets/templates/spike.docx"; rm -rf tmp
git add package.json package-lock.json docs/superpowers/plans/2026-09-15-export-inspection-report.md
git commit -m "chore(repo): add expo-sharing, expo-asset and expo-image-manipulator for report export

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

(Keep `export-spike.tsx` uncommitted and on disk until Task 18 deletes it — it is useful for eyeballing the real tagged template in Task 12.)

---

### Task 6: Extract `loadInspectionReportDetail` from the hook; export `resolveLocalFileUri`

**Files:**
- Create: `src/features/inspections/hooks/loadInspectionReportDetail.ts`, `src/features/inspections/hooks/loadInspectionReportDetail.test.ts`
- Modify: `src/features/inspections/hooks/useInspectionReport.ts` (the `run()` body inside `useEffect` moves out; behaviour unchanged), `src/features/attachments/attachmentActions.ts:20` (`export` the function)

**Interfaces:**
- Produces:
  ```ts
  export interface Viewer { uid: string; province: string; role: string }
  export interface InspectionReportDetail {
    report: InspectionReportSummary;
    purpose: PurposeFormState | null;
    compliance: ComplianceView;
    attachments: Attachment[];   // WatermelonDB models, as fetched
  }
  export async function loadInspectionReportDetail(reportId: string, viewer: Viewer): Promise<InspectionReportDetail | null>
  ```
  `null` when the report doesn't exist or the viewer can't see it (same jurisdiction rule the hook applies today).
- `resolveLocalFileUri(attachment: Attachment): Promise<string>` becomes exported (no other change).

- [ ] **Step 1: Write the failing test**

`src/features/inspections/hooks/loadInspectionReportDetail.test.ts`:

```ts
import { loadInspectionReportDetail } from './loadInspectionReportDetail';

const mockFetch = jest.fn();
jest.mock('../../../db/database', () => ({
  database: {},
  collections: new Proxy({}, {
    get: (_t, name: string) => ({ query: (...args: unknown[]) => ({ fetch: () => mockFetch(name, args) }) }),
  }),
}));
jest.mock('../../establishments/hooks/useEstablishment', () => ({
  isPrivilegedRole: (role: string) => role === 'Developer',
  isEstablishmentVisible: (estab: { province: string }, province: string) => estab.province === province,
  reportSyncStatusWithAttachments: () => 'synced',
}));

const report = {
  reportId: 'r1', estabId: 'e1', inspectorUid: 'u2', purposeId: 'p1', reportType: 'water_monitoring',
  reportControlNo: 'WQ-1', inspectionDate: '2026-09-01', reportStatus: 'submitted', syncState: 'synced',
  establishmentSnapshot: { name: 'Alpha' }, permitsSnapshot: [], createdAt: 'c', updatedAt: 'u',
};

function tables(map: Record<string, unknown[]>) {
  mockFetch.mockImplementation((name: string) => Promise.resolve(map[name] ?? []));
}

const viewer = { uid: 'u1', province: 'P', role: 'Inspector' };

describe('loadInspectionReportDetail', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns null when the report does not exist', async () => {
    tables({});
    expect(await loadInspectionReportDetail('r1', viewer)).toBeNull();
  });

  it("hides another inspector's report outside the viewer's province", async () => {
    tables({ inspectionReports: [report], establishments: [{ province: 'Q' }] });
    expect(await loadInspectionReportDetail('r1', viewer)).toBeNull();
  });

  it('loads report, purpose, water compliance and attachments', async () => {
    tables({
      inspectionReports: [report],
      establishments: [{ province: 'P' }],
      purposeOfInspection: [{ inspectionDate: '2026-09-01', verifyInfo: true, verifyInfoList: [], determineCompliance: false, investigateComplaints: false, checkCommitments: false, checkCommitmentsList: [], others: null }],
      complianceWater: [{ complianceId: 'c1', hasWwtp: true, samplingPoints: [], previousInspectionSummary: { hasRecords: true, dateOfSampling: '2026-01-01' } }],
      attachments: [{ attachmentId: 'a1', syncState: 'synced' }],
    });
    const detail = await loadInspectionReportDetail('r1', viewer);
    expect(detail?.report.reportControlNo).toBe('WQ-1');
    expect(detail?.purpose?.verifyInfo).toBe(true);
    expect(detail?.compliance.kind).toBe('water');
    if (detail?.compliance.kind === 'water') {
      expect(detail.compliance.hasWwtp).toBe(true);
      expect(detail.compliance.previousInspectionSummary.hasRecords).toBe('yes');
    }
    expect(detail?.attachments).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/inspections/hooks/loadInspectionReportDetail.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move the loader out of the hook**

Read `useInspectionReport.ts` fully first. Create `loadInspectionReportDetail.ts` by moving the body of `run()` (from `const reportMatches = …` through the last `complianceView = …` branch) into a plain async function:

```ts
import { Q } from '@nozbe/watermelondb';
import { collections } from '../../../db/database';
import type { Attachment } from '../../../db/models/Attachment';
import { isEstablishmentVisible, isPrivilegedRole, reportSyncStatusWithAttachments } from '../../establishments/hooks/useEstablishment';
import { buildPurposeFormFromModel, PurposeFormState } from '../types';
import type { ComplianceView, InspectionReportSummary } from './useInspectionReport';

export interface Viewer {
  uid: string;
  province: string;
  role: string;
}

export interface InspectionReportDetail {
  report: InspectionReportSummary;
  purpose: PurposeFormState | null;
  compliance: ComplianceView;
  attachments: Attachment[];
}

// One report with everything the detail screen and the export need, read
// once from WatermelonDB. Returns null for a report that doesn't exist or
// that this viewer may not see — the same jurisdiction rule as the
// "inspectors can read jurisdiction inspection reports" RLS policy.
export async function loadInspectionReportDetail(
  reportId: string,
  viewer: Viewer,
): Promise<InspectionReportDetail | null> {
  // The moved code, with myUid/myProvince/myRole → viewer.uid/province/role,
  // every `if (!cancelled) setX(...)` removed, and the "not found" branch
  // returning null. It ends with:
  // return { report: summary, purpose: purposeForm, compliance: complianceView, attachments: reportAttachments };
}
```

`useInspectionReport.ts`'s `run()` then becomes:

```ts
    async function run() {
      if (!reportId || !ready) {
        setReport(null);
        setPurpose(null);
        setCompliance({ kind: 'none' });
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const detail = await loadInspectionReportDetail(reportId, { uid: myUid, province: myProvince, role: myRole });
        if (cancelled) return;
        if (!detail) {
          setReport(null);
          setPurpose(null);
          setCompliance({ kind: 'none' });
          return;
        }
        setReport(detail.report);
        setPurpose(detail.purpose);
        setCompliance(detail.compliance);
      } catch (e) {
        // keep the existing catch body verbatim
      } finally {
        // keep the existing finally body verbatim
      }
    }
```

Keep the existing `catch`/`finally` bodies and error wording exactly. `ComplianceView`/`InspectionReportSummary` stay exported from `useInspectionReport.ts`; the new module imports them type-only, so there is no runtime cycle.

In `attachmentActions.ts` change `async function resolveLocalFileUri` to `export async function resolveLocalFileUri`.

- [ ] **Step 4: Run the new test, the inspections suite, typecheck and lint**

Run: `npx jest src/features/inspections && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/inspections/hooks src/features/attachments/attachmentActions.ts
git commit -m "refactor(reports): pull the report-detail loader out of useInspectionReport

The export needs the same report + purpose + compliance + attachments
read the detail screen does, without a hook. Behaviour unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `loadReportBundle` — WatermelonDB → `ReportBundle`

**Files:**
- Create: `src/features/export/loadReportBundle.ts`, `src/features/export/loadReportBundle.test.ts`

**Interfaces:**
- Consumes: `loadInspectionReportDetail` (Task 6), `collections.surveyReports`, `collections.attachments`.
- Produces: `loadReportBundle(item: { kind: 'inspection' | 'survey'; reportId: string }, viewer: Viewer): Promise<ReportBundle>` — throws `Error('Report not found')` when the report is missing or invisible.

- [ ] **Step 1: Write the failing test**

`src/features/export/loadReportBundle.test.ts`:

```ts
import { loadReportBundle } from './loadReportBundle';

const mockDetail = jest.fn();
jest.mock('../inspections/hooks/loadInspectionReportDetail', () => ({
  loadInspectionReportDetail: (...args: unknown[]) => mockDetail(...args),
}));
const mockFetch = jest.fn();
jest.mock('../../db/database', () => ({
  database: {},
  collections: new Proxy({}, {
    get: (_t, name: string) => ({ query: (...args: unknown[]) => ({ fetch: () => mockFetch(name, args) }) }),
  }),
}));

const viewer = { uid: 'u1', province: 'P', role: 'Inspector' };
const attachment = {
  attachmentId: 'a1', fileName: 'IMG_1.jpg', caption: 'gate', capturedAt: '2026-09-01T01:00:00Z',
  geoLat: 13.1, geoLng: 121.2, localUri: 'file:///a1.jpg', storagePath: 'x/a1.jpg', mimeType: 'image/jpeg', deletedAt: null,
};

describe('loadReportBundle', () => {
  beforeEach(() => { mockDetail.mockReset(); mockFetch.mockReset(); });

  it('wraps an inspection detail and its live attachments as plain data, oldest first', async () => {
    mockDetail.mockResolvedValue({
      report: { reportId: 'r1' }, purpose: null, compliance: { kind: 'none' },
      attachments: [
        { ...attachment, attachmentId: 'a3', capturedAt: '2026-09-02T00:00:00Z' },
        attachment,
        { ...attachment, attachmentId: 'a2', deletedAt: '2026-09-02' },
      ],
    });
    const bundle = await loadReportBundle({ kind: 'inspection', reportId: 'r1' }, viewer);
    expect(bundle.kind).toBe('inspection');
    expect(bundle.photos.map(p => p.attachmentId)).toEqual(['a1', 'a3']);
    expect(bundle.photos[0]).toEqual({
      attachmentId: 'a1', fileName: 'IMG_1.jpg', caption: 'gate', capturedAt: '2026-09-01T01:00:00Z',
      geoLat: 13.1, geoLng: 121.2, localUri: 'file:///a1.jpg', storagePath: 'x/a1.jpg', mimeType: 'image/jpeg',
    });
  });

  it('throws when the inspection report is missing or hidden', async () => {
    mockDetail.mockResolvedValue(null);
    await expect(loadReportBundle({ kind: 'inspection', reportId: 'r1' }, viewer)).rejects.toThrow('Report not found');
  });

  it('copies a survey row and its attachments', async () => {
    mockFetch.mockImplementation((name: string) => Promise.resolve(
      name === 'surveyReports'
        ? [{ surveyId: 's1', reportControlNumber: 'SR-1', inspectionDate: '2026-09-03', projectName: 'Bridge', referenceCode: null, proponentName: 'DPWH', contactPerson: null, contactPosition: null, contactNumber: null, email: null, projectLocation: 'Calapan', geoLat: null, geoLng: null, areaSize: 2.5, purpose: 'ECC Application', documentType: 'IEE Checklist', projectStatus: 'Pre-construction', otherFindings: null, remarksRecommendations: 'ok', reportStatus: 'draft' }]
        : name === 'attachments' ? [attachment] : [],
    ));
    const bundle = await loadReportBundle({ kind: 'survey', reportId: 's1' }, viewer);
    expect(bundle.kind).toBe('survey');
    if (bundle.kind === 'survey') {
      expect(bundle.survey.projectName).toBe('Bridge');
      expect(bundle.survey.areaSize).toBe(2.5);
    }
    expect(bundle.photos).toHaveLength(1);
  });

  it('throws when the survey is missing', async () => {
    mockFetch.mockResolvedValue([]);
    await expect(loadReportBundle({ kind: 'survey', reportId: 's1' }, viewer)).rejects.toThrow('Report not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/export/loadReportBundle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `loadReportBundle.ts`**

```ts
import { Q } from '@nozbe/watermelondb';
import { collections } from '../../db/database';
import type { Attachment } from '../../db/models/Attachment';
import { loadInspectionReportDetail, Viewer } from '../inspections/hooks/loadInspectionReportDetail';
import type { ExportPhoto, ReportBundle, SurveyReportData } from './types';

export type { Viewer };

export interface ReportRef {
  kind: 'inspection' | 'survey';
  reportId: string;
}

// Everything the mappers need for one report, as plain data. WatermelonDB
// models stop here so the mapper layer can be tested with literals.
function toPhoto(a: Attachment): ExportPhoto {
  return {
    attachmentId: a.attachmentId,
    fileName: a.fileName,
    caption: a.caption,
    capturedAt: a.capturedAt,
    geoLat: a.geoLat,
    geoLng: a.geoLng,
    localUri: a.localUri,
    storagePath: a.storagePath,
    mimeType: a.mimeType,
  };
}

const livePhotos = (attachments: Attachment[]): ExportPhoto[] =>
  attachments
    .filter(a => !a.deletedAt)
    .map(toPhoto)
    .sort((x, y) => x.capturedAt.localeCompare(y.capturedAt));

export async function loadReportBundle(item: ReportRef, viewer: Viewer): Promise<ReportBundle> {
  if (item.kind === 'inspection') {
    const detail = await loadInspectionReportDetail(item.reportId, viewer);
    if (!detail) throw new Error('Report not found');
    return {
      kind: 'inspection',
      report: detail.report,
      purpose: detail.purpose,
      compliance: detail.compliance,
      photos: livePhotos(detail.attachments),
    };
  }

  const surveys = await collections.surveyReports.query(Q.where('surveyId', item.reportId)).fetch();
  const s = surveys[0];
  if (!s) throw new Error('Report not found');
  const attachments = await collections.attachments.query(Q.where('surveyReportId', s.surveyId)).fetch();
  const survey: SurveyReportData = {
    surveyId: s.surveyId,
    reportControlNumber: s.reportControlNumber,
    inspectionDate: s.inspectionDate,
    projectName: s.projectName,
    referenceCode: s.referenceCode,
    proponentName: s.proponentName,
    contactPerson: s.contactPerson,
    contactPosition: s.contactPosition,
    contactNumber: s.contactNumber,
    email: s.email,
    projectLocation: s.projectLocation,
    geoLat: s.geoLat,
    geoLng: s.geoLng,
    areaSize: s.areaSize,
    purpose: s.purpose,
    documentType: s.documentType,
    projectStatus: s.projectStatus,
    otherFindings: s.otherFindings,
    remarksRecommendations: s.remarksRecommendations,
    reportStatus: s.reportStatus,
  };
  return { kind: 'survey', survey, photos: livePhotos(attachments) };
}
```

- [ ] **Step 4: Run test, typecheck**

Run: `npx jest src/features/export/loadReportBundle.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/export/loadReportBundle.ts src/features/export/loadReportBundle.test.ts
git commit -m "feat(reports): load a report and its photos as a plain export bundle

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Shared-block mapper (`mappers/common.ts`) + fixtures

**Files:**
- Create: `src/features/export/mappers/fixtures.ts`, `src/features/export/mappers/common.ts`, `src/features/export/mappers/common.test.ts`

**Interfaces:**
- Consumes: primitives (Task 2), `formatReportDate`, `formatEstablishmentLocation`, `formatDmsPair` (`src/features/attachments/geotagStamp.ts`), `DOCUMENTS_REVIEWED_OPTIONS`.
- Produces: `mapCommon(bundle: InspectionBundle, ctx: MapContext): TemplateData` and `mapPhotos(photos: ExportPhoto[]): TemplateData[]`, `mapSignatures(ctx: MapContext): TemplateData`. Fixtures: `fullWaterBundle()`, `emptyWaterBundle()`, `malformedWaterBundle()`, `fullSurveyBundle()`, `emptySurveyBundle()`, `signatories` — every later mapper/contract test imports these.

**Tag inventory produced by `mapCommon`** (this list is also the shared section of every `.tags.md` in Tasks 12–13):

| Tag | Source |
|---|---|
| `report_control_no` | `report.reportControlNo` |
| `inspection_date` | `formatReportDate(report.inspectionDate)` |
| `gi_establishment_name` | snapshot `name` (+ ` (formerly <former_name>)` when set) |
| `gi_address` | `formatEstablishmentLocation(snapshot)` |
| `gi_geo` | `"<lat>, <lng>"` to 6 dp, or `''` |
| `gi_nature_of_business`, `gi_psic_code` | snapshot |
| `gi_product` | product line names joined with `; ` |
| `gi_year_established` | `operating_status_since` only when `operating_status !== 'Operational'` |
| `gi_operating_hours_day`, `gi_operating_days_week`, `gi_operating_days_year` | `numberText(...)` |
| `product_lines[]` → `product_line`, `ecc_production_rate`, `actual_production_rate` | padded to `ROW_MINIMUMS.productLines` |
| `gi_managing_head`, `gi_pco_name`, `gi_pco_accreditation_no` | snapshot |
| `gi_pco_effectivity` | `formatReportDate(pco_effectivity)` |
| `gi_phone_fax`, `gi_email` | snapshot |
| `gi_contact_person` | `"<name> (<position>)"`; name alone when no position |
| `purpose_cb_verify`, `purpose_cb_compliance`, `purpose_cb_complaints`, `purpose_cb_commitments`, `purpose_cb_others` | purpose booleans; `purpose_cb_others` = `!!others.trim()` |
| `purpose_cb_<item>_new` / `purpose_cb_<item>_renewal` for item ∈ `pmpin, hazwaste_id, hazwaste_transporter, hazwaste_tsd, pto_air, discharge_permit` | `verifyInfoRows[].status` |
| `purpose_cb_industrial_ecowatch`, `purpose_cb_pepp`, `purpose_cb_pab`, `purpose_cb_commitment_others` | `commitmentRows[].checked` |
| `purpose_commitment_others` | remarks of the `others` commitment row |
| `purpose_others` | `purpose.others` |
| `permit_<row>_serial`, `permit_<row>_issued`, `permit_<row>_expiry` for row ∈ `ecc1, ecc2, ecc3, denr_registry_id, pcl_compliance_certificate, cco_registry, permit_to_transport, po_number, ecc_sanitary_landfill, discharge_permit_number` | matched from `permitsSnapshot` (rules in code) |
| `permits_extra[]` → `envi_law`, `permit_type`, `permit_serial`, `issued_date`, `expiry_date` | unmatched permits, min 0 |
| `doc_cb_record_file_folder`, `doc_cb_synology`, `doc_cb_opms`, `doc_cb_iis_transactions`, `doc_cb_cmr_online`, `doc_cb_smr_online`, `doc_cb_pco_online`, `doc_cb_others`, `doc_others` | `compliance.documentsReviewed` |
| `other_observations`, `remarks_recommendations` | `compliance.*` (any kind but `none`) |
| `sig_inspector_name`, `sig_inspector_position`, `sig_supervisor_name`, `sig_supervisor_position` | `ctx.signatories` |
| `photo_rows[]` → `left[]` / `right[]` → `photo_id`, `caption`, `photo_missing_text` | `bundle.photos`, two per row; `right` is `[]` for an odd last photo |

- [ ] **Step 1: Write the fixtures**

`src/features/export/mappers/fixtures.ts`:

```ts
import type { InspectionBundle, SurveyBundle, Signatories, ExportPhoto } from '../types';
import type { WaterComplianceView } from '../../inspections/hooks/useInspectionReport';

export const signatories: Signatories = {
  inspectorName: 'Juan Dela Cruz',
  inspectorPosition: 'Engineer II',
  supervisorName: 'Maria Santos',
  supervisorPosition: 'Chief, Water Quality Section',
};

export const photos: ExportPhoto[] = [
  { attachmentId: 'a1', fileName: 'IMG_0001.jpg', caption: 'Main gate', capturedAt: '2026-09-01T02:00:00Z', geoLat: 13.4117, geoLng: 121.1803, localUri: 'file:///a1.jpg', storagePath: 'u1/a1.jpg', mimeType: 'image/jpeg' },
  { attachmentId: 'a2', fileName: 'IMG_0002.jpg', caption: null, capturedAt: '2026-09-01T02:05:00Z', geoLat: null, geoLng: null, localUri: null, storagePath: 'u1/a2.jpg', mimeType: 'image/jpeg' },
];

const snapshot = {
  estab_id: 'e1', name: 'Alpha Water Refilling', former_name: 'Alpha Aqua', address_line: '12 Rizal St.',
  barangay: 'San Vicente', city: 'Calapan City', province: 'Oriental Mindoro', geo_lat: 13.4117, geo_lng: 121.1803,
  nature_of_business: 'Water refilling', psic_code: '36000', operating_status: 'Operational',
  operating_hours_day: 8, operating_days_week: 6, operating_days_year: 300, operating_status_since: null,
  owner_name: 'A. Owner', managing_head_name: 'M. Head', pco_name: 'P. Officer', pco_accreditation_no: 'PCO-123',
  pco_effectivity: '2027-03-01', phone_fax: '043-123-4567', email: 'alpha@example.com',
  contact_person_name: 'C. Person', contact_person_position: 'Manager',
  product_lines: [
    { product_line: 'Purified water', ecc_production_rate: '1000 L', actual_production_rate: '800 L' },
    { product_line: 'Ice', ecc_production_rate: '200 kg', actual_production_rate: '150 kg' },
  ],
};

export function fullWaterCompliance(): WaterComplianceView {
  return {
    kind: 'water',
    complianceId: 'c1',
    waterSources: [
      { source_type: 'Groundwater', daily_m3: '12', annual_m3: '3600', specify: '' },
      { source_type: 'Others', daily_m3: '1', annual_m3: '300', specify: 'Rainwater' },
      { source_type: 'Groundwater', daily_m3: '3', annual_m3: '900', specify: 'Well 2' },
    ],
    wastewaterSources: [
      { use_type: 'Process', consumed_m3_day: '10', generated_m3_day: '8', outlet_info: 'Outlet 1' },
      { use_type: 'Storm drain', consumed_m3_day: '', generated_m3_day: '2', outlet_info: 'Creek' },
    ],
    abstractedWaterQuality: [
      { source: 'Ground Water', specify: 'Deep well', bod_cod: '5', tss: '10', avfp: '', heavy_metal: 'ND' },
    ],
    hasWwtp: true,
    nonWwtpTreatment: {},
    wwtpType: 'Others',
    wwtpTypeOther: 'Constructed wetland',
    wwtpDetails: [
      { outletNo: '1', wwtpDetail: 'SBR', dateOfInstallation: '2020-05-01', designCapacity: '50', annualMaintenanceCost: '100000', outletLocation: 'North', receivingBodyOfWater: 'Calapan River (Class C)', receivingBodyOfWaterOther: '', flowMeterDevice: 'Ultrasonic', flowRate: '40' },
      { outletNo: '2', wwtpDetail: 'Septic', dateOfInstallation: '', designCapacity: '', annualMaintenanceCost: '', outletLocation: '', receivingBodyOfWater: '', receivingBodyOfWaterOther: 'Unnamed creek', flowMeterDevice: '', flowRate: '' },
    ],
    wwtpComponents: [
      { outletNo: '1', wwtp: 'SBR', primaryTreatment: ['Screening', 'Others'], primaryTreatmentOther: 'Sand trap', biologicalTreatment: ['Sequencing Batch Reactor', 'Trickling Filter'], biologicalTreatmentOther: '', chemicalTreatment: ['Disinfection'], chemicalTreatmentOther: '', otherTreatment: 'UV' },
      { outletNo: '2', wwtp: 'Septic', primaryTreatment: 'Screening, Grit Removal', primaryTreatmentOther: '', biologicalTreatment: '', biologicalTreatmentOther: '', chemicalTreatment: 'Ozonation', chemicalTreatmentOther: '', otherTreatment: '' },
    ],
    wwtpCondition: 'Others',
    wwtpConditionOther: 'Under repair',
    wwtpUnderConstruction: true,
    wwtpConstructionReported: false,
    wwtpConstructionUnits: 'Clarifier',
    wwtpConstructionCompletionDate: '2026-12-01',
    wwtpTreatmentUnitsUtilized: 'Bypass to lagoon',
    samplingConducted: true,
    samplingClassification: 'Effluent',
    samplingPoints: [
      { pointNo: '1', samplingStation: 'Outfall 1', samplingTime: '10:30 AM', typeOfSample: 'Grab', remarks: '', parameters: [
        { parameterName: 'pH', value: '7.2', unit: '', denrStandard: '6.0-9.0', compliant: 'Y', remarks: '' },
        { parameterName: 'BOD', value: '60', unit: 'mg/L', denrStandard: '50', compliant: 'N', remarks: 'Exceeds' },
      ] },
    ],
    previousInspectionSummary: {
      hasRecords: 'yes', dateOfSampling: '2025-11-10', samplingStation: 'Outfall 1', samplingTime: '9:00 AM', typeOfSample: 'Grab',
      parameters: [{ parameterName: 'TSS', value: '20', unit: 'mg/L', denrStandard: '100', compliant: 'Y', remarks: '' }],
    },
    checklistDao200510: [
      { key: 'dao2005-10-r14-1-has-dp', legal_ref: 'DAO 2005-10 Rule 14.1', requirement: 'Does the establishment have a discharge permit?', compliant: 'Y', remarks: 'DP-2026-001' },
      { key: 'other-pending-litigation', legal_ref: 'Other Requirements', requirement: 'Are there any pending litigation/PAB cases?', compliant: 'NA', remarks: '' },
      { key: 'retired-section-1', compliant: 'N', remarks: 'ignored' },
    ],
    dpConditions: [
      { conditionNo: '1', description: 'Maintain flow meter', compliant: 'Y', remarks: '' },
      { conditionNo: '2', description: 'Quarterly SMR', compliant: 'N', remarks: 'Late' },
    ],
    otherObservations: 'Line 1\nLine 2',
    remarksRecommendations: 'Renew DP',
    documentsReviewed: ['Synology', 'SMR Online', 'Others', 'Field notebook'],
  };
}

export function fullWaterBundle(): InspectionBundle {
  return {
    kind: 'inspection',
    report: {
      reportId: 'r1', estabId: 'e1', inspectorUid: 'u1', purposeId: 'p1', reportType: 'water_monitoring',
      reportControlNo: 'WQ-2026-001', inspectionDate: '2026-09-05', reportStatus: 'submitted', syncState: 'synced', syncStatus: 'synced',
      establishmentSnapshot: snapshot,
      permitsSnapshot: [
        { envi_law: 'PD 1586', permit_type: 'ECC', permit_serial: 'ECC-1', issued_date: '2020-01-01', expiry_date: '2030-01-01' },
        { envi_law: 'PD 1586', permit_type: 'ECC Amendment', permit_serial: 'ECC-2', issued_date: '2022-01-01', expiry_date: '2030-01-01' },
        { envi_law: 'RA 6969', permit_type: 'Hazardous Waste ID', permit_serial: 'GR-4B-001', issued_date: '2021-02-02', expiry_date: '2026-02-02' },
        { envi_law: 'RA 9275', permit_type: 'Discharge Permit', permit_serial: 'DP-2026-001', issued_date: '2026-01-15', expiry_date: '2027-01-14' },
        { envi_law: 'RA 8749', permit_type: 'Permit to Operate', permit_serial: 'PO-77', issued_date: '2025-06-01', expiry_date: '2030-06-01' },
        { envi_law: 'LLDA', permit_type: 'Clearance', permit_serial: 'LL-1', issued_date: '2024-01-01', expiry_date: '2025-01-01' },
      ],
      createdAt: '2026-09-05T00:00:00Z', updatedAt: '2026-09-06T00:00:00Z',
    },
    purpose: {
      inspectionDate: '2026-09-05',
      verifyInfo: true,
      verifyInfoRows: [
        { itemKey: 'pmpin', label: 'PMPIN Application', status: 'new', remarks: '' },
        { itemKey: 'hazwaste_id', label: 'Hazardous Waste ID Registration', status: null, remarks: '' },
        { itemKey: 'hazwaste_transporter', label: 'Hazardous Waste Transporter Registration', status: null, remarks: '' },
        { itemKey: 'hazwaste_tsd', label: 'Hazardous Waste TSD Registration', status: null, remarks: '' },
        { itemKey: 'pto_air', label: 'Permit to Operate Air Pollution', status: 'renewal', remarks: '' },
        { itemKey: 'discharge_permit', label: 'Discharge Permit', status: 'renewal', remarks: '' },
      ],
      determineCompliance: true,
      investigateComplaints: false,
      checkCommitments: true,
      commitmentRows: [
        { itemKey: 'industrial_ecowatch', label: 'Industrial EcoWatch', checked: false, remarks: '' },
        { itemKey: 'pepp', label: 'PEPP', checked: true, remarks: '' },
        { itemKey: 'pab', label: 'PAB', checked: false, remarks: '' },
        { itemKey: 'others', label: 'Others', checked: true, remarks: 'Green Choice' },
      ],
      others: 'Follow-up on complaint #12',
    },
    compliance: fullWaterCompliance(),
    photos,
  };
}

export function emptyWaterBundle(): InspectionBundle {
  return {
    kind: 'inspection',
    report: {
      reportId: 'r2', estabId: 'e2', inspectorUid: 'u1', purposeId: 'p2', reportType: 'water_monitoring',
      reportControlNo: null, inspectionDate: '', reportStatus: 'draft', syncState: 'created', syncStatus: 'pending',
      establishmentSnapshot: { ...snapshot, name: 'Beta', former_name: null, geo_lat: null, geo_lng: null, product_lines: [], operating_status: 'Temporarily Close', operating_status_since: '2024', pco_effectivity: null, contact_person_position: '' },
      permitsSnapshot: [],
      createdAt: '', updatedAt: '',
    },
    purpose: null,
    compliance: { kind: 'none' },
    photos: [],
  };
}

// Shapes an older build or a hand-edited row could hold: a JSON column that
// isn't an array, rows missing fields, unknown YnValues, treatment arrays
// stored as strings, hasRecords never asked.
export function malformedWaterBundle(): InspectionBundle {
  const full = fullWaterBundle();
  const c = fullWaterCompliance();
  return {
    ...full,
    compliance: {
      ...c,
      waterSources: 'not an array' as unknown as Record<string, unknown>[],
      wastewaterSources: [{}, { use_type: 'Cooling' }],
      abstractedWaterQuality: [null as unknown as Record<string, unknown>, { source: 'River' }],
      wwtpDetails: [{ outletNo: 7 } as unknown as WaterComplianceView['wwtpDetails'][number]],
      wwtpComponents: [{ outletNo: '1', primaryTreatment: 42 }],
      samplingPoints: [{ pointNo: '1', parameters: 'x' } as unknown as WaterComplianceView['samplingPoints'][number]],
      previousInspectionSummary: { hasRecords: null, dateOfSampling: '', samplingStation: '', samplingTime: '', typeOfSample: '', parameters: [] },
      checklistDao200510: [{ key: 'dao2005-10-r14-1-has-dp', compliant: 'maybe' as unknown as 'Y', remarks: 5 as unknown as string }],
      dpConditions: [{ conditionNo: '1', description: 'x', compliant: 'Y', remarks: 'ok' }, {} as WaterComplianceView['dpConditions'][number]],
      documentsReviewed: 'Synology' as unknown as string[],
      otherObservations: null,
      remarksRecommendations: null,
    },
  };
}

export function fullSurveyBundle(): SurveyBundle {
  return {
    kind: 'survey',
    survey: {
      surveyId: 's1', reportControlNumber: 'SR-2026-01', inspectionDate: '2026-09-07', projectName: 'Bucayao Bridge',
      referenceCode: 'REF-9', proponentName: 'DPWH', contactPerson: 'E. Ngineer', contactPosition: 'PM', contactNumber: '0917',
      email: 'pm@example.com', projectLocation: 'Bucayao, Calapan City', geoLat: 13.4, geoLng: 121.2, areaSize: 2.5,
      purpose: 'ECC Amendment', documentType: 'EPRMP', projectStatus: 'Construction', otherFindings: 'Erosion at abutment',
      remarksRecommendations: 'Install silt fence', reportStatus: 'submitted',
    },
    photos,
  };
}

export function emptySurveyBundle(): SurveyBundle {
  return {
    kind: 'survey',
    survey: {
      surveyId: 's2', reportControlNumber: null, inspectionDate: '', projectName: '', referenceCode: null, proponentName: '',
      contactPerson: null, contactPosition: null, contactNumber: null, email: null, projectLocation: '', geoLat: null, geoLng: null,
      areaSize: null, purpose: '', documentType: null, projectStatus: null, otherFindings: null, remarksRecommendations: null, reportStatus: 'draft',
    },
    photos: [],
  };
}
```

If `InspectionReportSummary`'s fields differ from the literal above (e.g. a field was added since), fix the literal — never loosen the type.

- [ ] **Step 2: Write the failing test**

`src/features/export/mappers/common.test.ts`:

```ts
import { mapCommon } from './common';
import { fullWaterBundle, emptyWaterBundle, malformedWaterBundle, signatories } from './fixtures';
import { TICKED, UNTICKED } from './primitives';
import type { TemplateData } from '../types';

const ctx = { signatories };

describe('mapCommon', () => {
  const full = mapCommon(fullWaterBundle(), ctx);
  const empty = mapCommon(emptyWaterBundle(), ctx);

  it('prints the header', () => {
    expect(full.report_control_no).toBe('WQ-2026-001');
    expect(full.inspection_date).toBe('05 September 2026');
    expect(empty.report_control_no).toBe('');
    expect(empty.inspection_date).toBe('');
  });

  it('prints general information from the snapshot', () => {
    expect(full.gi_establishment_name).toBe('Alpha Water Refilling (formerly Alpha Aqua)');
    expect(full.gi_address).toBe('12 Rizal St., San Vicente, Calapan City, Oriental Mindoro');
    expect(full.gi_geo).toBe('13.411700, 121.180300');
    expect(full.gi_product).toBe('Purified water; Ice');
    expect(full.gi_year_established).toBe('');
    expect(empty.gi_year_established).toBe('2024');
    expect(full.gi_operating_hours_day).toBe('8');
    expect(full.gi_pco_effectivity).toBe('01 March 2027');
    expect(full.gi_contact_person).toBe('C. Person (Manager)');
    expect(empty.gi_contact_person).toBe('C. Person');
    expect(empty.gi_geo).toBe('');
  });

  it('pads product lines to the printed minimum and grows past it', () => {
    expect(full.product_lines).toEqual([
      { product_line: 'Purified water', ecc_production_rate: '1000 L', actual_production_rate: '800 L' },
      { product_line: 'Ice', ecc_production_rate: '200 kg', actual_production_rate: '150 kg' },
    ]);
    expect(empty.product_lines).toEqual([{ product_line: '', ecc_production_rate: '', actual_production_rate: '' }]);
  });

  it('ticks purpose boxes', () => {
    expect(full.purpose_cb_verify).toBe(TICKED);
    expect(full.purpose_cb_complaints).toBe(UNTICKED);
    expect(full.purpose_cb_others).toBe(TICKED);
    expect(full.purpose_others).toBe('Follow-up on complaint #12');
    expect(full.purpose_cb_pmpin_new).toBe(TICKED);
    expect(full.purpose_cb_pmpin_renewal).toBe(UNTICKED);
    expect(full.purpose_cb_pto_air_renewal).toBe(TICKED);
    expect(full.purpose_cb_hazwaste_id_new).toBe(UNTICKED);
    expect(full.purpose_cb_pepp).toBe(TICKED);
    expect(full.purpose_cb_pab).toBe(UNTICKED);
    expect(full.purpose_cb_commitment_others).toBe(TICKED);
    expect(full.purpose_commitment_others).toBe('Green Choice');
    expect(empty.purpose_cb_verify).toBe(UNTICKED);
    expect(empty.purpose_cb_pmpin_new).toBe(UNTICKED);
    expect(empty.purpose_others).toBe('');
  });

  it('matches permits to the printed rows and overflows the rest', () => {
    expect(full.permit_ecc1_serial).toBe('ECC-1');
    expect(full.permit_ecc1_issued).toBe('01 January 2020');
    expect(full.permit_ecc2_serial).toBe('ECC-2');
    expect(full.permit_ecc3_serial).toBe('');
    expect(full.permit_denr_registry_id_serial).toBe('GR-4B-001');
    expect(full.permit_discharge_permit_number_serial).toBe('DP-2026-001');
    expect(full.permit_discharge_permit_number_expiry).toBe('14 January 2027');
    expect(full.permit_po_number_serial).toBe('PO-77');
    expect(full.permit_pcl_compliance_certificate_serial).toBe('');
    expect(full.permits_extra).toEqual([
      { envi_law: 'LLDA', permit_type: 'Clearance', permit_serial: 'LL-1', issued_date: '01 January 2024', expiry_date: '01 January 2025' },
    ]);
    expect(empty.permits_extra).toEqual([]);
  });

  it('ticks documents reviewed and collects the unknown ones as Others text', () => {
    expect(full.doc_cb_synology).toBe(TICKED);
    expect(full.doc_cb_smr_online).toBe(TICKED);
    expect(full.doc_cb_opms).toBe(UNTICKED);
    expect(full.doc_cb_record_file_folder).toBe(UNTICKED);
    expect(full.doc_cb_others).toBe(TICKED);
    expect(full.doc_others).toBe('Field notebook');
    expect(empty.doc_cb_others).toBe(UNTICKED);
  });

  it('prints observations, remarks and signatures', () => {
    expect(full.other_observations).toBe('Line 1\nLine 2');
    expect(full.remarks_recommendations).toBe('Renew DP');
    expect(empty.other_observations).toBe('');
    expect(full.sig_inspector_name).toBe('Juan Dela Cruz');
    expect(full.sig_supervisor_position).toBe('Chief, Water Quality Section');
  });

  it('lays photos out two per row with a caption that falls back to the file name and adds the geotag', () => {
    expect(full.photo_rows).toEqual([
      {
        left: [{ photo_id: 'a1', caption: 'Main gate — 13°24\'42.1"N 121°10\'49.1"E', photo_missing_text: 'IMG_0001.jpg (not downloaded)' }],
        right: [{ photo_id: 'a2', caption: 'IMG_0002.jpg', photo_missing_text: 'IMG_0002.jpg (not downloaded)' }],
      },
    ]);
    const three = mapCommon({ ...fullWaterBundle(), photos: [...fullWaterBundle().photos, { ...fullWaterBundle().photos[0], attachmentId: 'a3' }] }, ctx);
    expect((three.photo_rows as TemplateData[])[1]).toEqual({ left: [expect.objectContaining({ photo_id: 'a3' })], right: [] });
    expect(empty.photo_rows).toEqual([]);
  });

  it('never throws on malformed data', () => {
    const m = mapCommon(malformedWaterBundle(), ctx);
    expect(m.doc_cb_synology).toBe(UNTICKED);
    expect(m.doc_others).toBe('');
    expect(m.other_observations).toBe('');
  });

  it('emits only strings and arrays of string records', () => {
    const check = (data: Record<string, unknown>) => {
      for (const v of Object.values(data)) {
        if (Array.isArray(v)) v.forEach(row => check(row as Record<string, unknown>));
        else expect(typeof v).toBe('string');
      }
    };
    check(full);
    check(empty);
  });
});
```

The exact geotag string in the photos test must match `formatDmsPair(13.4117, 121.1803)` — run `node -e` against `src/features/attachments/geotagStamp.ts`'s logic if unsure and paste the real output; do not loosen the assertion to a regex.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/features/export/mappers/common.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `common.ts`**

```ts
import { formatReportDate } from '../../../utils/formatReportDate';
import { formatEstablishmentLocation } from '../../../utils/establishmentLocation';
import { formatDmsPair } from '../../attachments/geotagStamp';
import { DOCUMENTS_REVIEWED_OPTIONS } from '../../inspections/water/waterChecklistData';
import type { PermitSnapshotItem } from '../../../services/sync/syncTypes';
import { ROW_MINIMUMS } from '../rowMinimums';
import type { ExportPhoto, InspectionBundle, MapContext, TemplateData } from '../types';
import { asArray, cb, joinNonEmpty, normalizeLabel, numberText, padRows, text } from './primitives';

// The sections every inspection form shares: header, General Information,
// Purpose of Inspection, DENR permits, documents reviewed, the closing
// observations/remarks, signatures and the ATTACHMENTS page. Each
// report-type mapper spreads this in first, then adds its own block.

const VERIFY_ITEMS = ['pmpin', 'hazwaste_id', 'hazwaste_transporter', 'hazwaste_tsd', 'pto_air', 'discharge_permit'] as const;
const COMMITMENT_ITEMS = ['industrial_ecowatch', 'pepp', 'pab'] as const;

// Printed permit rows, in form order. `match` decides whether a snapshot
// permit belongs on that row; ECC rows take PD 1586 permits in order.
type PermitRow = 'ecc1' | 'ecc2' | 'ecc3' | 'denr_registry_id' | 'pcl_compliance_certificate' | 'cco_registry' | 'permit_to_transport' | 'po_number' | 'ecc_sanitary_landfill' | 'discharge_permit_number';
const PERMIT_ROWS: PermitRow[] = ['ecc1', 'ecc2', 'ecc3', 'denr_registry_id', 'pcl_compliance_certificate', 'cco_registry', 'permit_to_transport', 'po_number', 'ecc_sanitary_landfill', 'discharge_permit_number'];
const PERMIT_MATCHERS: [PermitRow | 'ecc', RegExp][] = [
  ['ecc_sanitary_landfill', /sanitary|landfill/],
  ['ecc', /ecc|1586/],
  ['denr_registry_id', /registry ?id|hazardous ?waste ?id|hwid|generator ?id/],
  ['pcl_compliance_certificate', /pcl/],
  ['cco_registry', /cco/],
  ['permit_to_transport', /transport/],
  ['po_number', /permit ?to ?operate|\bpto\b|po ?number|8749/],
  ['discharge_permit_number', /discharge|9275/],
];

function permitRowFor(p: PermitSnapshotItem): PermitRow | 'ecc' | null {
  const hay = `${text(p.permit_type)} ${text(p.envi_law)}`.toLowerCase();
  for (const [row, re] of PERMIT_MATCHERS) if (re.test(hay)) return row;
  return null;
}

function mapPermits(permits: readonly PermitSnapshotItem[]): TemplateData {
  const out: TemplateData = {};
  for (const row of PERMIT_ROWS) {
    out[`permit_${row}_serial`] = '';
    out[`permit_${row}_issued`] = '';
    out[`permit_${row}_expiry`] = '';
  }
  const extra: TemplateData[] = [];
  let eccCount = 0;
  const filled = new Set<PermitRow>();
  for (const p of asArray(permits) as unknown as PermitSnapshotItem[]) {
    let row = permitRowFor(p);
    if (row === 'ecc') {
      eccCount += 1;
      row = eccCount <= 3 ? (`ecc${eccCount}` as PermitRow) : null;
    } else if (row && filled.has(row)) {
      row = null;
    }
    if (row) {
      filled.add(row);
      out[`permit_${row}_serial`] = text(p.permit_serial);
      out[`permit_${row}_issued`] = formatReportDate(p.issued_date);
      out[`permit_${row}_expiry`] = formatReportDate(p.expiry_date);
    } else {
      extra.push({
        envi_law: text(p.envi_law),
        permit_type: text(p.permit_type),
        permit_serial: text(p.permit_serial),
        issued_date: formatReportDate(p.issued_date),
        expiry_date: formatReportDate(p.expiry_date),
      });
    }
  }
  out.permits_extra = padRows(extra, ROW_MINIMUMS.permitsExtra, () => ({ envi_law: '', permit_type: '', permit_serial: '', issued_date: '', expiry_date: '' }));
  return out;
}

const DOC_ROWS: [string, string][] = [
  ['record_file_folder', 'Record File Folder'],
  ...DOCUMENTS_REVIEWED_OPTIONS.filter(o => o !== 'Others').map(o => [o.toLowerCase().replace(/[^a-z0-9]+/g, '_'), o] as [string, string]),
];

function mapDocuments(reviewed: unknown): TemplateData {
  const list = Array.isArray(reviewed) ? reviewed.map(text).filter(Boolean) : [];
  const known = new Set(DOC_ROWS.map(([, label]) => normalizeLabel(label)));
  const out: TemplateData = {};
  for (const [key, label] of DOC_ROWS) out[`doc_cb_${key}`] = cb(list.some(d => normalizeLabel(d) === normalizeLabel(label)));
  const others = list.filter(d => !known.has(normalizeLabel(d)) && normalizeLabel(d) !== 'others');
  out.doc_cb_others = cb(others.length > 0 || list.some(d => normalizeLabel(d) === 'others'));
  out.doc_others = others.join(', ');
  return out;
}

// Two photos per printed row: photo_rows[] → left[] / right[], each a 0- or
// 1-element list so the template's cell loops print nothing for a missing
// right-hand photo.
export function mapPhotos(photos: readonly ExportPhoto[]): TemplateData[] {
  const cells = asArray(photos).map(p => {
    const photo = p as unknown as ExportPhoto;
    const base = text(photo.caption).trim() || text(photo.fileName);
    const geo = photo.geoLat != null && photo.geoLng != null ? formatDmsPair(photo.geoLat, photo.geoLng) : '';
    return {
      photo_id: text(photo.attachmentId),
      caption: geo ? `${base} — ${geo}` : base,
      photo_missing_text: `${text(photo.fileName)} (not downloaded)`,
    };
  });
  const rows: TemplateData[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push({ left: [cells[i]], right: cells[i + 1] ? [cells[i + 1]] : [] });
  }
  return padRows(rows, ROW_MINIMUMS.photoRows, () => ({ left: [], right: [] }));
}

export function mapSignatures(ctx: MapContext): TemplateData {
  return {
    sig_inspector_name: text(ctx.signatories.inspectorName),
    sig_inspector_position: text(ctx.signatories.inspectorPosition),
    sig_supervisor_name: text(ctx.signatories.supervisorName),
    sig_supervisor_position: text(ctx.signatories.supervisorPosition),
  };
}

export function mapCommon(bundle: InspectionBundle, ctx: MapContext): TemplateData {
  const { report, purpose, compliance } = bundle;
  const s = report.establishmentSnapshot ?? ({} as InspectionBundle['report']['establishmentSnapshot']);
  const lines = asArray(s.product_lines);

  const out: TemplateData = {
    report_control_no: text(report.reportControlNo),
    inspection_date: formatReportDate(report.inspectionDate),

    gi_establishment_name: s.former_name ? `${text(s.name)} (formerly ${text(s.former_name)})` : text(s.name),
    gi_address: formatEstablishmentLocation({ addressLine: s.address_line, barangay: s.barangay, city: s.city, province: s.province }),
    gi_geo: typeof s.geo_lat === 'number' && typeof s.geo_lng === 'number' ? `${s.geo_lat.toFixed(6)}, ${s.geo_lng.toFixed(6)}` : '',
    gi_nature_of_business: text(s.nature_of_business),
    gi_psic_code: text(s.psic_code),
    gi_product: joinNonEmpty(lines.map(l => l.product_line), '; '),
    gi_year_established: s.operating_status && s.operating_status !== 'Operational' ? text(s.operating_status_since) : '',
    gi_operating_hours_day: numberText(s.operating_hours_day),
    gi_operating_days_week: numberText(s.operating_days_week),
    gi_operating_days_year: numberText(s.operating_days_year),
    product_lines: padRows(
      lines.map(l => ({ product_line: text(l.product_line), ecc_production_rate: text(l.ecc_production_rate), actual_production_rate: text(l.actual_production_rate) })),
      ROW_MINIMUMS.productLines,
      () => ({ product_line: '', ecc_production_rate: '', actual_production_rate: '' }),
    ),
    gi_managing_head: text(s.managing_head_name),
    gi_pco_name: text(s.pco_name),
    gi_pco_accreditation_no: text(s.pco_accreditation_no),
    gi_pco_effectivity: formatReportDate(s.pco_effectivity),
    gi_phone_fax: text(s.phone_fax),
    gi_email: text(s.email),
    gi_contact_person: text(s.contact_person_position).trim()
      ? `${text(s.contact_person_name)} (${text(s.contact_person_position).trim()})`
      : text(s.contact_person_name),

    purpose_cb_verify: cb(!!purpose?.verifyInfo),
    purpose_cb_compliance: cb(!!purpose?.determineCompliance),
    purpose_cb_complaints: cb(!!purpose?.investigateComplaints),
    purpose_cb_commitments: cb(!!purpose?.checkCommitments),
    purpose_cb_others: cb(!!text(purpose?.others).trim()),
    purpose_others: text(purpose?.others),
    purpose_commitment_others: text(purpose?.commitmentRows?.find(r => r.itemKey === 'others')?.remarks),
    purpose_cb_commitment_others: cb(!!purpose?.commitmentRows?.find(r => r.itemKey === 'others')?.checked),

    ...mapPermits(report.permitsSnapshot ?? []),
    ...mapDocuments(compliance.kind === 'none' ? [] : compliance.documentsReviewed),
    other_observations: compliance.kind === 'none' ? '' : text(compliance.otherObservations),
    remarks_recommendations: compliance.kind === 'none' ? '' : text(compliance.remarksRecommendations),
    ...mapSignatures(ctx),
    photo_rows: mapPhotos(bundle.photos),
  };

  for (const item of VERIFY_ITEMS) {
    const status = purpose?.verifyInfoRows?.find(r => r.itemKey === item)?.status ?? null;
    out[`purpose_cb_${item}_new`] = cb(status === 'new');
    out[`purpose_cb_${item}_renewal`] = cb(status === 'renewal');
  }
  for (const item of COMMITMENT_ITEMS) {
    out[`purpose_cb_${item}`] = cb(!!purpose?.commitmentRows?.find(r => r.itemKey === item)?.checked);
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes; typecheck; lint**

Run: `npx jest src/features/export/mappers && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/export/mappers
git commit -m "feat(reports): map the sections every inspection form shares

Header, general information, purpose, DENR permits, documents reviewed,
closing remarks, signatures and photos — with fixtures the per-type
mappers and the template contract test reuse.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Water mapper (`mappers/water.ts`)

**Files:**
- Create: `src/features/export/mappers/water.ts`, `src/features/export/mappers/water.test.ts`

**Interfaces:**
- Consumes: `mapCommon`, primitives, `ROW_MINIMUMS`, `WATER_FINDINGS_CHECKLIST`, `decodeWwtpComponent`, `describeNonWwtpTreatment`, option constants from `waterChecklistData.ts`.
- Produces: `mapWater(bundle: InspectionBundle, ctx: MapContext): TemplateData` = `mapCommon(...)` plus the water block.

**Water tag inventory** (also the water section of `Water Monitoring.tags.md`):

| Tag | Source |
|---|---|
| `ws_<row>_daily`, `ws_<row>_annual`, `ws_<row>_specify`, row ∈ `surface, groundwater, utilities, desalination, recycled, others` | `waterSources[]` matched on `source_type` (normalized: `surfacewater`, `groundwater`, `waterutilities`, `desalination`, `recycled`, else others). Several rows on one source join with `; ` |
| `ww_<row>_consumed`, `ww_<row>_generated`, `ww_<row>_specify`, row ∈ `process, domestic, cooling, maintenance, storm_drain, others` | `wastewaterSources[]` on `use_type`; `specify` = `outlet_info` (+ `specify` if present) |
| `abstracted_rows[]` → `source, specify, bod_cod, tss, avfp, heavy_metal` | min `ROW_MINIMUMS.abstractedWaterQuality` |
| `cb_has_wwtp_yes`, `cb_has_wwtp_no` | `hasWwtp` |
| `cb_wwtp_type_physical`, `cb_wwtp_type_biological`, `cb_wwtp_type_chemical`, `cb_wwtp_type_others`, `wwtp_type_others` | `wwtpType`; `Combined` → others box + text `Combined`; `hasWwtp === false` → others text = `describeNonWwtpTreatment(...)` |
| `wwtp_outlets[]` → `outlet_no, wwtp_detail, date_of_installation, design_capacity, annual_maintenance_cost, outlet_location, receiving_body, flow_meter_device, flow_rate` | `wwtpDetails`, min `wwtpOutlets` |
| `wwtp_components[]` → `outlet_no, wwtp, cb_primary_screening, cb_primary_grit_removal, cb_primary_oil_water_separator, cb_primary_equalization_tank, cb_primary_others, primary_others, cb_bio_activated_sludge, cb_bio_anaerobic_digestion, cb_bio_abr, cb_bio_reed_bed, cb_bio_trickling_filter, cb_bio_oxidation_batch, cb_bio_sbr, cb_bio_others, bio_others, cb_chem_ph_adjustment, cb_chem_disinfection, cb_chem_redox, cb_chem_flocculation, cb_chem_others, chem_others, other_treatment` | `wwtpComponents` through `decodeWwtpComponent`, min `wwtpComponents` |
| `cb_wwtp_condition_properly`, `cb_wwtp_condition_inadequately`, `cb_wwtp_condition_poor`, `cb_wwtp_condition_others`, `wwtp_condition_others` | `wwtpCondition`, `wwtpConditionOther` |
| `cb_under_construction_yes/_no`, `cb_construction_reported_yes/_no`, `wwtp_construction_units`, `wwtp_construction_completion_date`, `wwtp_treatment_units_utilized` | 5E |
| `sampling_points[]` → `point_no, sampling_station, sampling_time, type_of_sample, parameters[]` → `parameter_name, value, unit, denr_standard, cb_compliant_y, cb_compliant_n, remarks` | `samplingPoints`; empty when `samplingConducted === false`; min 2 / 4 |
| `prev_date_of_sampling, prev_sampling_station, prev_sampling_time, prev_type_of_sample, prev_parameters[]` (same row keys) | `previousInspectionSummary` when `hasRecords === 'yes'` (or `null` with a date — never asked); blank otherwise; min 4 |
| `sf_<slug>_y`, `sf_<slug>_n`, `sf_<slug>_na`, `sf_<slug>_remarks`, slug = checklist key with `-` → `_` | `checklistDao200510` looked up by `key` |
| `dp_conditions[]` → `condition_no, description, cb_y, cb_n, cb_na, remarks` | `dpConditions`, min 5 |

- [ ] **Step 1: Write the failing test**

`src/features/export/mappers/water.test.ts`:

```ts
import { mapWater } from './water';
import { fullWaterBundle, emptyWaterBundle, malformedWaterBundle, fullWaterCompliance, signatories } from './fixtures';
import { TICKED, UNTICKED } from './primitives';
import { WATER_FINDINGS_CHECKLIST } from '../../inspections/water/waterChecklistData';
import { ROW_MINIMUMS } from '../rowMinimums';
import type { TemplateData } from '../types';

const ctx = { signatories };
const rows = (d: TemplateData, key: string) => d[key] as TemplateData[];

describe('mapWater', () => {
  const full = mapWater(fullWaterBundle(), ctx);
  const empty = mapWater(emptyWaterBundle(), ctx);

  it('includes the shared block', () => {
    expect(full.gi_establishment_name).toContain('Alpha');
    expect(full.sig_inspector_name).toBe('Juan Dela Cruz');
  });

  it('places water sources on their printed rows, joining repeats', () => {
    expect(full.ws_groundwater_daily).toBe('12; 3');
    expect(full.ws_groundwater_specify).toBe('Well 2');
    expect(full.ws_others_daily).toBe('1');
    expect(full.ws_others_specify).toBe('Rainwater');
    expect(full.ws_surface_daily).toBe('');
    expect(full.ww_process_consumed).toBe('10');
    expect(full.ww_process_specify).toBe('Outlet 1');
    expect(full.ww_storm_drain_generated).toBe('2');
    expect(full.ww_cooling_consumed).toBe('');
  });

  it('pads abstracted-water rows', () => {
    const r = rows(full, 'abstracted_rows');
    expect(r).toHaveLength(ROW_MINIMUMS.abstractedWaterQuality);
    expect(r[0]).toEqual({ source: 'Ground Water', specify: 'Deep well', bod_cod: '5', tss: '10', avfp: '', heavy_metal: 'ND' });
    expect(r[1].source).toBe('');
  });

  it('ticks WWTP presence and type', () => {
    expect(full.cb_has_wwtp_yes).toBe(TICKED);
    expect(full.cb_has_wwtp_no).toBe(UNTICKED);
    expect(full.cb_wwtp_type_others).toBe(TICKED);
    expect(full.cb_wwtp_type_physical).toBe(UNTICKED);
    expect(full.wwtp_type_others).toBe('Constructed wetland');
    expect(empty.cb_has_wwtp_yes).toBe(UNTICKED);
    expect(empty.cb_has_wwtp_no).toBe(UNTICKED);
  });

  it('describes a Combined type and a non-WWTP treatment in the Others text', () => {
    const combined = mapWater({ ...fullWaterBundle(), compliance: { ...fullWaterCompliance(), wwtpType: 'Combined', wwtpTypeOther: null } }, ctx);
    expect(combined.cb_wwtp_type_others).toBe(TICKED);
    expect(combined.wwtp_type_others).toBe('Combined');
    const none = mapWater({ ...fullWaterBundle(), compliance: { ...fullWaterCompliance(), hasWwtp: false, wwtpType: null, nonWwtpTreatment: { systems: ['Septic Tank', 'Others'], other: 'Lagoon' } } }, ctx);
    expect(none.cb_has_wwtp_no).toBe(TICKED);
    expect(none.cb_wwtp_type_others).toBe(UNTICKED);
    expect(none.wwtp_type_others).toContain('Septic Tank');
    expect(none.wwtp_type_others).toContain('Lagoon');
  });

  it('pads outlets to three and prints the receiving body', () => {
    const r = rows(full, 'wwtp_outlets');
    expect(r).toHaveLength(3);
    expect(r[0].receiving_body).toBe('Calapan River (Class C)');
    expect(r[0].date_of_installation).toBe('01 May 2020');
    expect(r[1].receiving_body).toBe('Unnamed creek');
    expect(r[2].outlet_no).toBe('');
  });

  it('decodes treatment components including legacy comma strings', () => {
    const r = rows(full, 'wwtp_components');
    expect(r).toHaveLength(2);
    expect(r[0].cb_primary_screening).toBe(TICKED);
    expect(r[0].cb_primary_grit_removal).toBe(UNTICKED);
    expect(r[0].cb_primary_others).toBe(TICKED);
    expect(r[0].primary_others).toBe('Sand trap');
    expect(r[0].cb_bio_sbr).toBe(TICKED);
    expect(r[0].cb_bio_trickling_filter).toBe(TICKED);
    expect(r[0].cb_chem_disinfection).toBe(TICKED);
    expect(r[0].other_treatment).toBe('UV');
    expect(r[1].cb_primary_screening).toBe(TICKED);
    expect(r[1].cb_primary_grit_removal).toBe(TICKED);
    expect(r[1].cb_chem_others).toBe(TICKED);
    expect(r[1].chem_others).toBe('Ozonation');
  });

  it('ticks the WWTP condition and construction answers', () => {
    expect(full.cb_wwtp_condition_others).toBe(TICKED);
    expect(full.wwtp_condition_others).toBe('Under repair');
    expect(full.cb_under_construction_yes).toBe(TICKED);
    expect(full.cb_construction_reported_no).toBe(TICKED);
    expect(full.cb_construction_reported_yes).toBe(UNTICKED);
    expect(full.wwtp_construction_completion_date).toBe('01 December 2026');
    expect(full.wwtp_treatment_units_utilized).toBe('Bypass to lagoon');
    expect(empty.cb_under_construction_yes).toBe(UNTICKED);
    expect(empty.cb_under_construction_no).toBe(UNTICKED);
  });

  it('pads sampling points and their parameters', () => {
    const points = rows(full, 'sampling_points');
    expect(points).toHaveLength(2);
    expect(points[0].sampling_station).toBe('Outfall 1');
    const params = points[0].parameters as TemplateData[];
    expect(params).toHaveLength(ROW_MINIMUMS.samplingParameters);
    expect(params[1]).toEqual({ parameter_name: 'BOD', value: '60', unit: 'mg/L', denr_standard: '50', cb_compliant_y: UNTICKED, cb_compliant_n: TICKED, remarks: 'Exceeds' });
    expect((points[1].parameters as TemplateData[])[0].parameter_name).toBe('');
  });

  it('leaves sampling blank when no sampling was conducted', () => {
    const none = mapWater({ ...fullWaterBundle(), compliance: { ...fullWaterCompliance(), samplingConducted: false } }, ctx);
    const points = rows(none, 'sampling_points');
    expect(points).toHaveLength(2);
    expect(points[0].sampling_station).toBe('');
  });

  it('prints the previous inspection only when records exist', () => {
    expect(full.prev_date_of_sampling).toBe('10 November 2025');
    expect(rows(full, 'prev_parameters')[0].parameter_name).toBe('TSS');
    const no = mapWater({ ...fullWaterBundle(), compliance: { ...fullWaterCompliance(), previousInspectionSummary: { ...fullWaterCompliance().previousInspectionSummary, hasRecords: 'no' } } }, ctx);
    expect(no.prev_date_of_sampling).toBe('');
    expect(rows(no, 'prev_parameters')[0].parameter_name).toBe('');
    const neverAsked = mapWater({ ...fullWaterBundle(), compliance: { ...fullWaterCompliance(), previousInspectionSummary: { ...fullWaterCompliance().previousInspectionSummary, hasRecords: null } } }, ctx);
    expect(neverAsked.prev_date_of_sampling).toBe('10 November 2025');
  });

  it('answers the summary of findings by key', () => {
    expect(full.sf_dao2005_10_r14_1_has_dp_y).toBe(TICKED);
    expect(full.sf_dao2005_10_r14_1_has_dp_n).toBe(UNTICKED);
    expect(full.sf_dao2005_10_r14_1_has_dp_remarks).toBe('DP-2026-001');
    expect(full.sf_other_pending_litigation_na).toBe(TICKED);
    expect(full.sf_dao2005_10_r13_1_wastewater_charge_y).toBe(UNTICKED);
    for (const def of WATER_FINDINGS_CHECKLIST) {
      const slug = def.key.replace(/-/g, '_');
      expect(typeof full[`sf_${slug}_y`]).toBe('string');
      expect(typeof full[`sf_${slug}_remarks`]).toBe('string');
    }
  });

  it('pads DP conditions', () => {
    const r = rows(full, 'dp_conditions');
    expect(r).toHaveLength(ROW_MINIMUMS.dpConditions);
    expect(r[1]).toEqual({ condition_no: '2', description: 'Quarterly SMR', cb_y: UNTICKED, cb_n: TICKED, cb_na: UNTICKED, remarks: 'Late' });
  });

  it('never throws on malformed data and still pads every loop', () => {
    const m = mapWater(malformedWaterBundle(), ctx);
    expect(m.ws_groundwater_daily).toBe('');
    expect(rows(m, 'wwtp_outlets')).toHaveLength(3);
    expect(rows(m, 'wwtp_outlets')[0].outlet_no).toBe('7');
    expect(rows(m, 'wwtp_components')[0].cb_primary_screening).toBe(UNTICKED);
    expect(rows(m, 'sampling_points')[0].parameters).toHaveLength(ROW_MINIMUMS.samplingParameters);
    expect(m.sf_dao2005_10_r14_1_has_dp_y).toBe(UNTICKED);
    expect(m.sf_dao2005_10_r14_1_has_dp_remarks).toBe('');
    expect(rows(m, 'dp_conditions')[1].description).toBe('');
  });

  it('a report with no compliance row prints the water block blank', () => {
    expect(empty.ws_groundwater_daily).toBe('');
    expect(rows(empty, 'wwtp_outlets')).toHaveLength(3);
    expect(empty.sf_dao2005_10_r14_1_has_dp_y).toBe(UNTICKED);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/export/mappers/water.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `water.ts`**

```ts
import type { YnValue } from '../../../components/form';
import { formatReportDate } from '../../../utils/formatReportDate';
import type { WaterComplianceView } from '../../inspections/hooks/useInspectionReport';
import { WATER_FINDINGS_CHECKLIST, WWTP_TYPE_OTHERS, WWTP_CONDITION_OTHERS } from '../../inspections/water/waterChecklistData';
import { decodeWwtpComponent, describeNonWwtpTreatment, findingsValuesFromEntries } from '../../inspections/water/waterTypes';
import { ROW_MINIMUMS } from '../rowMinimums';
import type { InspectionBundle, MapContext, TemplateData } from '../types';
import { mapCommon } from './common';
import { asArray, cb, joinNonEmpty, normalizeLabel, padRows, text } from './primitives';

// Water Quality Management form, sections 4–6 and III. Everything here reads
// the compliance_water row through WaterComplianceView; the shared sections
// come from mapCommon.

const WATER_SOURCE_ROWS: [string, string[]][] = [
  ['surface', ['surfacewater']],
  ['groundwater', ['groundwater']],
  ['utilities', ['waterutilities', 'utilities']],
  ['desalination', ['desalination']],
  ['recycled', ['recycled']],
];
const WASTEWATER_ROWS: [string, string[]][] = [
  ['process', ['process', 'processwater']],
  ['domestic', ['domestic', 'domesticwastewater']],
  ['cooling', ['cooling', 'coolingwater']],
  ['maintenance', ['maintenance']],
  ['storm_drain', ['stormdrain', 'storm']],
];

// Groups rows by printed label, joining repeats with "; " so a second
// groundwater source still appears rather than silently overwriting.
function fixedRows(
  prefix: string,
  rows: Record<string, unknown>[],
  labelKey: string,
  rowDefs: [string, string[]][],
  columns: [string, (row: Record<string, unknown>) => string][],
): TemplateData {
  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const label = normalizeLabel(row[labelKey]);
    const def = rowDefs.find(([, aliases]) => aliases.includes(label));
    const key = def ? def[0] : 'others';
    buckets.set(key, [...(buckets.get(key) ?? []), row]);
  }
  const out: TemplateData = {};
  for (const key of [...rowDefs.map(([k]) => k), 'others']) {
    const bucket = buckets.get(key) ?? [];
    for (const [col, read] of columns) {
      out[`${prefix}_${key}_${col}`] = joinNonEmpty(bucket.map(read), '; ');
    }
  }
  return out;
}

function ynBoxes(prefix: string, value: unknown): TemplateData {
  const v = value as YnValue;
  return { [`${prefix}_y`]: cb(v === 'Y'), [`${prefix}_n`]: cb(v === 'N'), [`${prefix}_na`]: cb(v === 'NA') };
}

function parameterRows(raw: unknown, min: number): TemplateData[] {
  return padRows(
    asArray(raw).map(p => ({
      parameter_name: text(p.parameterName),
      value: text(p.value),
      unit: text(p.unit),
      denr_standard: text(p.denrStandard),
      cb_compliant_y: cb(p.compliant === 'Y'),
      cb_compliant_n: cb(p.compliant === 'N'),
      remarks: text(p.remarks),
    })),
    min,
    () => ({ parameter_name: '', value: '', unit: '', denr_standard: '', cb_compliant_y: cb(false), cb_compliant_n: cb(false), remarks: '' }),
  );
}

const has = (list: string[], option: string) => list.some(x => normalizeLabel(x) === normalizeLabel(option));

function componentRow(stored: Record<string, unknown>): TemplateData {
  const c = decodeWwtpComponent(stored);
  return {
    outlet_no: c.outletNo,
    wwtp: c.wwtp,
    cb_primary_screening: cb(has(c.primaryTreatment, 'Screening')),
    cb_primary_grit_removal: cb(has(c.primaryTreatment, 'Grit Removal')),
    cb_primary_oil_water_separator: cb(has(c.primaryTreatment, 'Oil/Water Separator')),
    cb_primary_equalization_tank: cb(has(c.primaryTreatment, 'Equalization Tank')),
    cb_primary_others: cb(has(c.primaryTreatment, 'Others')),
    primary_others: c.primaryTreatmentOther,
    cb_bio_activated_sludge: cb(has(c.biologicalTreatment, 'Activated Sludge')),
    cb_bio_anaerobic_digestion: cb(has(c.biologicalTreatment, 'Anaerobic Digestion')),
    cb_bio_abr: cb(has(c.biologicalTreatment, 'Anaerobic Baffled Reactor (ABR)')),
    cb_bio_reed_bed: cb(has(c.biologicalTreatment, 'Reed Bed System')),
    cb_bio_trickling_filter: cb(has(c.biologicalTreatment, 'Trickling Filter')),
    cb_bio_oxidation_batch: cb(has(c.biologicalTreatment, 'Oxidation/Stabilization Batch')),
    cb_bio_sbr: cb(has(c.biologicalTreatment, 'Sequencing Batch Reactor')),
    cb_bio_others: cb(has(c.biologicalTreatment, 'Others')),
    bio_others: c.biologicalTreatmentOther,
    cb_chem_ph_adjustment: cb(has(c.chemicalTreatment, 'pH Adjustment')),
    cb_chem_disinfection: cb(has(c.chemicalTreatment, 'Disinfection')),
    cb_chem_redox: cb(has(c.chemicalTreatment, 'Redox')),
    cb_chem_flocculation: cb(has(c.chemicalTreatment, 'Flocculation/Coagulation')),
    cb_chem_others: cb(has(c.chemicalTreatment, 'Others')),
    chem_others: c.chemicalTreatmentOther,
    other_treatment: c.otherTreatment,
  };
}

const blankComponentRow = (): TemplateData => componentRow({});

function wwtpTypeBlock(c: WaterComplianceView): TemplateData {
  const type = text(c.wwtpType);
  const listed = ['Physical', 'Biological', 'Chemical'];
  const isListed = listed.some(l => normalizeLabel(l) === normalizeLabel(type));
  const isOthers = !!type && !isListed; // 'Others' and 'Combined' both print on the Others line
  let othersText = '';
  if (c.hasWwtp === false) {
    const nw = c.nonWwtpTreatment ?? {};
    const systems = Array.isArray(nw.systems) ? nw.systems.map(text) : [];
    othersText = describeNonWwtpTreatment(systems, text(nw.other));
    if (othersText === '—') othersText = '';
  } else if (isOthers) {
    othersText = normalizeLabel(type) === normalizeLabel(WWTP_TYPE_OTHERS) ? text(c.wwtpTypeOther) : type;
  }
  return {
    cb_wwtp_type_physical: cb(normalizeLabel(type) === 'physical'),
    cb_wwtp_type_biological: cb(normalizeLabel(type) === 'biological'),
    cb_wwtp_type_chemical: cb(normalizeLabel(type) === 'chemical'),
    cb_wwtp_type_others: cb(c.hasWwtp !== false && isOthers),
    wwtp_type_others: othersText,
  };
}

function conditionBlock(c: WaterComplianceView): TemplateData {
  const cond = normalizeLabel(c.wwtpCondition);
  const isOthers = !!cond && !['properlymaintained', 'inadequatelymaintained', 'poormaintenance'].includes(cond);
  return {
    cb_wwtp_condition_properly: cb(cond === 'properlymaintained'),
    cb_wwtp_condition_inadequately: cb(cond === 'inadequatelymaintained'),
    cb_wwtp_condition_poor: cb(cond === 'poormaintenance'),
    cb_wwtp_condition_others: cb(isOthers),
    wwtp_condition_others: isOthers ? (cond === normalizeLabel(WWTP_CONDITION_OTHERS) ? text(c.wwtpConditionOther) : text(c.wwtpCondition)) : '',
    cb_under_construction_yes: cb(c.wwtpUnderConstruction === true),
    cb_under_construction_no: cb(c.wwtpUnderConstruction === false),
    cb_construction_reported_yes: cb(c.wwtpConstructionReported === true),
    cb_construction_reported_no: cb(c.wwtpConstructionReported === false),
    wwtp_construction_units: text(c.wwtpConstructionUnits),
    wwtp_construction_completion_date: formatReportDate(c.wwtpConstructionCompletionDate) || text(c.wwtpConstructionCompletionDate),
    wwtp_treatment_units_utilized: text(c.wwtpTreatmentUnitsUtilized),
  };
}

const EMPTY_WATER: WaterComplianceView = {
  kind: 'water', complianceId: '', waterSources: [], wastewaterSources: [], abstractedWaterQuality: [], hasWwtp: null,
  nonWwtpTreatment: {}, wwtpType: null, wwtpTypeOther: null, wwtpDetails: [], wwtpComponents: [], wwtpCondition: null,
  wwtpConditionOther: null, wwtpUnderConstruction: null, wwtpConstructionReported: null, wwtpConstructionUnits: null,
  wwtpConstructionCompletionDate: null, wwtpTreatmentUnitsUtilized: null, samplingConducted: null, samplingClassification: null,
  samplingPoints: [], previousInspectionSummary: { hasRecords: null, dateOfSampling: '', samplingStation: '', samplingTime: '', typeOfSample: '', parameters: [] },
  checklistDao200510: [], dpConditions: [], otherObservations: null, remarksRecommendations: null, documentsReviewed: [],
};

export function mapWater(bundle: InspectionBundle, ctx: MapContext): TemplateData {
  const c = bundle.compliance.kind === 'water' ? bundle.compliance : EMPTY_WATER;

  const findings = findingsValuesFromEntries(asArray(c.checklistDao200510));
  const sf: TemplateData = {};
  WATER_FINDINGS_CHECKLIST.forEach((def, i) => {
    const slug = def.key.replace(/-/g, '_');
    Object.assign(sf, ynBoxes(`sf_${slug}`, findings[i]?.compliant));
    sf[`sf_${slug}_remarks`] = text(findings[i]?.remarks);
  });

  const prev = c.previousInspectionSummary ?? EMPTY_WATER.previousInspectionSummary;
  const showPrev = prev.hasRecords === 'yes' || (prev.hasRecords == null && !!text(prev.dateOfSampling));

  const samplingPoints = c.samplingConducted === false ? [] : asArray(c.samplingPoints);

  return {
    ...mapCommon(bundle, ctx),

    ...fixedRows('ws', asArray(c.waterSources), 'source_type', WATER_SOURCE_ROWS, [
      ['daily', r => text(r.daily_m3)],
      ['annual', r => text(r.annual_m3)],
      ['specify', r => text(r.specify)],
    ]),
    ...fixedRows('ww', asArray(c.wastewaterSources), 'use_type', WASTEWATER_ROWS, [
      ['consumed', r => text(r.consumed_m3_day)],
      ['generated', r => text(r.generated_m3_day)],
      ['specify', r => joinNonEmpty([r.outlet_info, r.specify], ' / ')],
    ]),
    abstracted_rows: padRows(
      asArray(c.abstractedWaterQuality).map(r => ({ source: text(r.source), specify: text(r.specify), bod_cod: text(r.bod_cod), tss: text(r.tss), avfp: text(r.avfp), heavy_metal: text(r.heavy_metal) })),
      ROW_MINIMUMS.abstractedWaterQuality,
      () => ({ source: '', specify: '', bod_cod: '', tss: '', avfp: '', heavy_metal: '' }),
    ),

    cb_has_wwtp_yes: cb(c.hasWwtp === true),
    cb_has_wwtp_no: cb(c.hasWwtp === false),
    ...wwtpTypeBlock(c),

    wwtp_outlets: padRows(
      asArray(c.wwtpDetails).map(d => ({
        outlet_no: text(d.outletNo),
        wwtp_detail: text(d.wwtpDetail),
        date_of_installation: formatReportDate(text(d.dateOfInstallation)) || text(d.dateOfInstallation),
        design_capacity: text(d.designCapacity),
        annual_maintenance_cost: text(d.annualMaintenanceCost),
        outlet_location: text(d.outletLocation),
        receiving_body: text(d.receivingBodyOfWaterOther).trim() || text(d.receivingBodyOfWater),
        flow_meter_device: text(d.flowMeterDevice),
        flow_rate: text(d.flowRate),
      })),
      ROW_MINIMUMS.wwtpOutlets,
      () => ({ outlet_no: '', wwtp_detail: '', date_of_installation: '', design_capacity: '', annual_maintenance_cost: '', outlet_location: '', receiving_body: '', flow_meter_device: '', flow_rate: '' }),
    ),
    wwtp_components: padRows(asArray(c.wwtpComponents).map(componentRow), ROW_MINIMUMS.wwtpComponents, blankComponentRow),
    ...conditionBlock(c),

    sampling_points: padRows(
      samplingPoints.map(p => ({
        point_no: text(p.pointNo),
        sampling_station: text(p.samplingStation),
        sampling_time: text(p.samplingTime),
        type_of_sample: text(p.typeOfSample),
        parameters: parameterRows(p.parameters, ROW_MINIMUMS.samplingParameters),
      })),
      ROW_MINIMUMS.samplingPoints,
      () => ({ point_no: '', sampling_station: '', sampling_time: '', type_of_sample: '', parameters: parameterRows([], ROW_MINIMUMS.samplingParameters) }),
    ),
    prev_date_of_sampling: showPrev ? formatReportDate(prev.dateOfSampling) || text(prev.dateOfSampling) : '',
    prev_sampling_station: showPrev ? text(prev.samplingStation) : '',
    prev_sampling_time: showPrev ? text(prev.samplingTime) : '',
    prev_type_of_sample: showPrev ? text(prev.typeOfSample) : '',
    prev_parameters: parameterRows(showPrev ? prev.parameters : [], ROW_MINIMUMS.previousParameters),

    ...sf,

    dp_conditions: padRows(
      asArray(c.dpConditions).map(d => ({ condition_no: text(d.conditionNo), description: text(d.description), ...ynBoxes('cb', d.compliant), remarks: text(d.remarks) })),
      ROW_MINIMUMS.dpConditions,
      () => ({ condition_no: '', description: '', ...ynBoxes('cb', null), remarks: '' }),
    ),
  };
}
```

Note on `ynBoxes('cb', …)` inside DP rows: it yields `cb_y`, `cb_n`, `cb_na` — the row keys the table lists.

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx jest src/features/export/mappers && npm run typecheck && npm run lint`
Expected: PASS. If `describeNonWwtpTreatment` returns something other than `—` for empty input, adjust the `if (othersText === '—')` guard to match its actual empty output (read `waterTypes.ts:238`).

- [ ] **Step 5: Commit**

```bash
git add src/features/export/mappers/water.ts src/features/export/mappers/water.test.ts
git commit -m "feat(water): map the water compliance row onto the form's tags

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Survey mapper, other-type mappers, `mapBundle` dispatcher

**Files:**
- Create: `src/features/export/mappers/survey.ts`, `src/features/export/mappers/survey.test.ts`, `src/features/export/mappers/index.ts`, `src/features/export/mappers/index.test.ts`

**Interfaces:**
- Produces: `mapSurvey(bundle: SurveyBundle, ctx): TemplateData`; `mapBundle(bundle: ReportBundle, ctx: MapContext): TemplateData` dispatching on `bundle.kind` and `report.reportType` (`water_monitoring` → `mapWater`; `air_monitoring`, `hazardous_waste`, `eia` → `mapCommon`; survey → `mapSurvey`); throws `Error('No mapper for report type <t>')` otherwise.

**Survey tag inventory** (`Survey.tags.md`):

| Tag | Source |
|---|---|
| `survey_report_control_no`, `survey_inspection_date` | header |
| `survey_project_name`, `survey_reference_code`, `survey_date` (= inspection date), `survey_proponent_name`, `survey_contact_person`, `survey_contact_position`, `survey_contact_number`, `survey_email`, `survey_project_location`, `survey_geo`, `survey_area_size` | model columns |
| `cb_survey_purpose_ecc_application`, `cb_survey_purpose_ecc_amendment` | `purpose` contains `amendment` → amendment; else contains `ecc` → application |
| `cb_survey_doc_iee`, `cb_survey_doc_eis`, `cb_survey_doc_eprmp`, `cb_survey_doc_peis`, `cb_survey_doc_permp`, `cb_survey_doc_others`, `survey_doc_others` | `documentType` normalized; unknown non-empty → others + text |
| `cb_survey_status_baseline`, `_preconstruction`, `_construction`, `_operation`, `_suspended`, `_abandoned` | `projectStatus` normalized: `baseline`; `preconstruction`; `construction` (and not pre); `operation`/`completed`; `suspended`; `abandoned` |
| `survey_other_findings`, `survey_remarks_recommendations` | model |
| `sig_*`, `photos[]` | shared |

- [ ] **Step 1: Write the failing tests**

`src/features/export/mappers/survey.test.ts`:

```ts
import { mapSurvey } from './survey';
import { fullSurveyBundle, emptySurveyBundle, signatories } from './fixtures';
import { TICKED, UNTICKED } from './primitives';

const ctx = { signatories };

describe('mapSurvey', () => {
  const full = mapSurvey(fullSurveyBundle(), ctx);
  const empty = mapSurvey(emptySurveyBundle(), ctx);

  it('prints the header block', () => {
    expect(full.survey_report_control_no).toBe('SR-2026-01');
    expect(full.survey_inspection_date).toBe('07 September 2026');
    expect(full.survey_date).toBe('07 September 2026');
    expect(full.survey_project_name).toBe('Bucayao Bridge');
    expect(full.survey_geo).toBe('13.400000, 121.200000');
    expect(full.survey_area_size).toBe('2.5');
    expect(empty.survey_geo).toBe('');
    expect(empty.survey_area_size).toBe('');
  });

  it('ticks purpose, document type and status', () => {
    expect(full.cb_survey_purpose_ecc_amendment).toBe(TICKED);
    expect(full.cb_survey_purpose_ecc_application).toBe(UNTICKED);
    expect(full.cb_survey_doc_eprmp).toBe(TICKED);
    expect(full.cb_survey_doc_others).toBe(UNTICKED);
    expect(full.cb_survey_status_construction).toBe(TICKED);
    expect(full.cb_survey_status_preconstruction).toBe(UNTICKED);
    const odd = mapSurvey({ ...fullSurveyBundle(), survey: { ...fullSurveyBundle().survey, purpose: 'ECC Application', documentType: 'Programmatic EIS', projectStatus: 'Pre-construction' } }, ctx);
    expect(odd.cb_survey_purpose_ecc_application).toBe(TICKED);
    expect(odd.cb_survey_doc_others).toBe(TICKED);
    expect(odd.survey_doc_others).toBe('Programmatic EIS');
    expect(odd.cb_survey_status_preconstruction).toBe(TICKED);
    expect(odd.cb_survey_status_construction).toBe(UNTICKED);
    expect(empty.cb_survey_purpose_ecc_application).toBe(UNTICKED);
    expect(empty.cb_survey_doc_others).toBe(UNTICKED);
  });

  it('prints findings, remarks, signatures and photos', () => {
    expect(full.survey_other_findings).toBe('Erosion at abutment');
    expect(full.survey_remarks_recommendations).toBe('Install silt fence');
    expect(full.sig_inspector_name).toBe('Juan Dela Cruz');
    expect(full.photo_rows).toHaveLength(1);
    expect(empty.photo_rows).toEqual([]);
  });
});
```

`src/features/export/mappers/index.test.ts`:

```ts
import { mapBundle } from './index';
import { fullWaterBundle, fullSurveyBundle, signatories } from './fixtures';

const ctx = { signatories };

describe('mapBundle', () => {
  it('routes water to the water mapper', () => {
    expect(mapBundle(fullWaterBundle(), ctx).cb_has_wwtp_yes).toBeDefined();
  });
  it('routes air/hazwaste/eia to the shared block only', () => {
    for (const reportType of ['air_monitoring', 'hazardous_waste', 'eia']) {
      const data = mapBundle({ ...fullWaterBundle(), report: { ...fullWaterBundle().report, reportType }, compliance: { kind: 'none' } }, ctx);
      expect(data.gi_establishment_name).toContain('Alpha');
      expect(data.cb_has_wwtp_yes).toBeUndefined();
    }
  });
  it('routes surveys to the survey mapper', () => {
    expect(mapBundle(fullSurveyBundle(), ctx).survey_project_name).toBe('Bucayao Bridge');
  });
  it('rejects an unknown type', () => {
    expect(() => mapBundle({ ...fullWaterBundle(), report: { ...fullWaterBundle().report, reportType: 'hazwaste_tsd' } }, ctx)).toThrow('No mapper for report type hazwaste_tsd');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/export/mappers/survey.test.ts src/features/export/mappers/index.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `survey.ts` and `index.ts`**

`survey.ts`:

```ts
import { formatReportDate } from '../../../utils/formatReportDate';
import type { MapContext, SurveyBundle, TemplateData } from '../types';
import { mapPhotos, mapSignatures } from './common';
import { cb, normalizeLabel, numberText, text } from './primitives';

// Site Inspection Report header block. The survey form doesn't exist in the
// app yet, so this reads only the survey_reports columns; the site
// validation tables stay as printed until that form is built.
const DOC_TYPES: [string, string[]][] = [
  ['iee', ['ieechecklist', 'iee']],
  ['eis', ['eis']],
  ['eprmp', ['eprmp']],
  ['peis', ['peis']],
  ['permp', ['permp']],
];

export function mapSurvey(bundle: SurveyBundle, ctx: MapContext): TemplateData {
  const s = bundle.survey;
  const date = formatReportDate(s.inspectionDate);
  const purpose = normalizeLabel(s.purpose);
  const doc = normalizeLabel(s.documentType);
  const docMatch = DOC_TYPES.find(([, aliases]) => aliases.includes(doc));
  const status = normalizeLabel(s.projectStatus);

  const out: TemplateData = {
    survey_report_control_no: text(s.reportControlNumber),
    survey_inspection_date: date,
    survey_date: date,
    survey_project_name: text(s.projectName),
    survey_reference_code: text(s.referenceCode),
    survey_proponent_name: text(s.proponentName),
    survey_contact_person: text(s.contactPerson),
    survey_contact_position: text(s.contactPosition),
    survey_contact_number: text(s.contactNumber),
    survey_email: text(s.email),
    survey_project_location: text(s.projectLocation),
    survey_geo: typeof s.geoLat === 'number' && typeof s.geoLng === 'number' ? `${s.geoLat.toFixed(6)}, ${s.geoLng.toFixed(6)}` : '',
    survey_area_size: numberText(s.areaSize),
    cb_survey_purpose_ecc_amendment: cb(purpose.includes('amendment')),
    cb_survey_purpose_ecc_application: cb(!purpose.includes('amendment') && purpose.includes('ecc')),
    cb_survey_doc_others: cb(!!doc && !docMatch),
    survey_doc_others: !!doc && !docMatch ? text(s.documentType) : '',
    cb_survey_status_baseline: cb(status.includes('baseline')),
    cb_survey_status_preconstruction: cb(status.includes('preconstruction')),
    cb_survey_status_construction: cb(status.includes('construction') && !status.includes('preconstruction')),
    cb_survey_status_operation: cb(status.includes('operation') || status.includes('completed')),
    cb_survey_status_suspended: cb(status.includes('suspended')),
    cb_survey_status_abandoned: cb(status.includes('abandoned')),
    survey_other_findings: text(s.otherFindings),
    survey_remarks_recommendations: text(s.remarksRecommendations),
    ...mapSignatures(ctx),
    photo_rows: mapPhotos(bundle.photos),
  };
  for (const [key] of DOC_TYPES) out[`cb_survey_doc_${key}`] = cb(docMatch?.[0] === key);
  return out;
}
```

`index.ts`:

```ts
import type { MapContext, ReportBundle, TemplateData } from '../types';
import { mapCommon } from './common';
import { mapSurvey } from './survey';
import { mapWater } from './water';

// inspection_reports.report_type → mapper. Air, hazwaste and EIA print only
// the shared block until their forms exist (see the design spec).
export function mapBundle(bundle: ReportBundle, ctx: MapContext): TemplateData {
  if (bundle.kind === 'survey') return mapSurvey(bundle, ctx);
  switch (bundle.report.reportType) {
    case 'water_monitoring':
      return mapWater(bundle, ctx);
    case 'air_monitoring':
    case 'hazardous_waste':
    case 'eia':
      return mapCommon(bundle, ctx);
    default:
      throw new Error(`No mapper for report type ${bundle.report.reportType}`);
  }
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx jest src/features/export/mappers && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/export/mappers
git commit -m "feat(reports): map surveys and route every report type to its mapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Recipe-driven template tagger (`scripts/docx-tag.js`)

Hand-editing ~250 places in a 370 KB `document.xml` is not repeatable, and EMB will reissue forms. So tagging is data: each template has a JSON recipe under `assets/templates/recipes/`, the untagged originals live in `assets/templates/originals/`, and `npm run tag-templates` regenerates every tagged `assets/templates/*.docx`. A re-tag after a form revision is "fix the coordinates in the recipe, rerun, contract test passes".

**Files:**
- Create: `scripts/docx-tag.js`, `scripts/docx-grid.js`, `scripts/docx-runs.js`, `scripts/__tests__/docxTag.test.js`
- Modify: `package.json` (`"tag-templates": "node scripts/docx-tag.js all"`), move the five untagged files: `git mv "assets/templates/<name>.docx" "assets/templates/originals/<name>.docx"`

**Interfaces:**
- Produces: `applyRecipe(documentXml: string, recipe: Recipe): string` and the CLI `node scripts/docx-tag.js <original.docx> <recipe.json> <out.docx>` / `node scripts/docx-tag.js all`.
- `docx-grid.js <file.docx>` prints every table as `TABLE n / rN: 1:<cell text>[cb×k] | 2:…` (the coordinate system the recipes use — 1-based table, row, cell in document order).
- `docx-runs.js <file.docx> [substring]` prints every `<w:t>` text with its 1-based occurrence index among identical texts, for authoring `replaceText` ops.

**Recipe format** (`Recipe`):

```jsonc
{
  "checkboxes": ["cb_a", "cb_b"],      // names for every remaining ☐ glyph, in document order, AFTER deletions
  "ops": [
    { "op": "cell", "table": 1, "row": 1, "cell": 2, "tag": "gi_establishment_name" },
    //   append a run "{tag}" to the LAST paragraph of that cell; the run copies the
    //   paragraph's last run rPr (or the paragraph-mark rPr) so size/font match
    { "op": "replaceText", "find": " __________", "with": " {report_control_no}", "nth": 1 },
    //   `find` is the EXACT text of one <w:t> (after XML unescaping); nth counts
    //   identical texts in document order; the whole <w:t> becomes `with`
    { "op": "loop", "table": 6, "fromRow": 19, "toRow": 19, "name": "abstracted_rows" },
    //   prepend "{#name}" to the first paragraph of fromRow's first cell and append
    //   "{/name}" to the last paragraph of toRow's last cell
    { "op": "deleteRows", "table": 6, "rows": [20, 21, 22, 23] },
    { "op": "cloneRowAfter", "table": 5, "row": 11, "cells": ["{#permits_extra}{envi_law}", "{permit_type}", "{permit_serial}", "{issued_date}", "{expiry_date}{/permits_extra}"] },
    //   duplicates the row (all cell text removed) and puts each string into the
    //   matching cell; fewer strings than cells leaves the rest empty
    { "op": "insertAfterParagraph", "find": "ATTACHMENTS", "xml": "<w:tbl>…</w:tbl>" }
    //   `find` is the exact text of a paragraph; raw XML goes right after that </w:p>
  ]
}
```

Every `table`/`row`/`cell` number refers to the **original** document: the script resolves all coordinates before applying any edit (edits are applied from the end of the file backwards), so ops can be listed in any order. Normalisation runs first: every `w14:checkbox` content control is unwrapped to its inner run, and every legacy `FORMCHECKBOX` field (Survey) is removed. `checkboxes` is applied last, to the ☐ glyphs that survive the deletions; a count mismatch is an error naming both numbers.

- [ ] **Step 1: Write the failing test**

`scripts/__tests__/docxTag.test.js`:

```js
const { applyRecipe } = require('../docx-tag');

const P = (t, rpr = '') => `<w:p><w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr>${t === null ? '' : `<w:r>${rpr}<w:t xml:space="preserve">${t}</w:t></w:r>`}</w:p>`;
const TC = (...ps) => `<w:tc><w:tcPr/>${ps.join('')}</w:tc>`;
const TR = (...tcs) => `<w:tr>${tcs.join('')}</w:tr>`;
const SDT = inner => `<w:sdt><w:sdtPr><w14:checkbox><w14:checked w14:val="0"/></w14:checkbox></w:sdtPr><w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
const CB = '<w:r><w:rPr><w:rFonts w:ascii="MS Gothic"/></w:rPr><w:t>☐</w:t></w:r>';

const doc = body => `<w:document><w:body>${body}<w:sectPr/></w:body></w:document>`;

describe('applyRecipe', () => {
  it('appends a tag run to a cell, copying the last run properties', () => {
    const xml = doc(`<w:tbl>${TR(TC(P('Name:')), TC(P('x', '<w:rPr><w:b/></w:rPr>')))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cell', table: 1, row: 1, cell: 2, tag: 'gi_name' }] });
    expect(out).toContain('<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{gi_name}</w:t></w:r></w:p></w:tc></w:tr>');
  });

  it('uses the paragraph-mark rPr when the paragraph has no runs', () => {
    const xml = doc(`<w:tbl>${TR(TC(P(null)))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cell', table: 1, row: 1, cell: 1, tag: 't' }] });
    expect(out).toContain('<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>');
  });

  it('replaces the nth exact text', () => {
    const xml = doc(P(' __') + P(' __') + P('Date: ____'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'replaceText', find: ' __', with: ' {b}', nth: 2 }] });
    expect(out.match(/\{b\}/g)).toHaveLength(1);
    expect(out.indexOf('{b}')).toBeGreaterThan(out.indexOf(' __'));
    expect(out).toContain('Date: ____');
  });

  it('wraps rows in a loop and deletes rows, resolving coordinates against the original', () => {
    const xml = doc(`<w:tbl>${TR(TC(P('h')))}${TR(TC(P(null)), TC(P(null)))}${TR(TC(P('gone')))}${TR(TC(P('keep')))}</w:tbl>`);
    const out = applyRecipe(xml, {
      checkboxes: [],
      ops: [
        { op: 'deleteRows', table: 1, rows: [3] },
        { op: 'loop', table: 1, fromRow: 2, toRow: 2, name: 'rows' },
        { op: 'cell', table: 1, row: 2, cell: 1, tag: 'a' },
        { op: 'cell', table: 1, row: 2, cell: 2, tag: 'b' },
        { op: 'cell', table: 1, row: 4, cell: 1, tag: 'k' },
      ],
    });
    expect(out).not.toContain('gone');
    expect(out).toContain('{#rows}');
    expect(out.indexOf('{#rows}')).toBeLessThan(out.indexOf('{a}'));
    expect(out.indexOf('{b}')).toBeLessThan(out.indexOf('{/rows}'));
    expect(out).toContain('keep');
    expect(out.indexOf('keep')).toBeLessThan(out.indexOf('{k}'));
    expect(out.match(/<w:tr>/g)).toHaveLength(3);
  });

  it('clones a row after another with the given cell texts', () => {
    const xml = doc(`<w:tbl>${TR(TC(P('a')), TC(P('b')), TC(P('c')))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'cloneRowAfter', table: 1, row: 1, cells: ['{#x}{p}', '{q}{/x}'] }] });
    expect(out.match(/<w:tr>/g)).toHaveLength(2);
    const second = out.slice(out.lastIndexOf('<w:tr>'));
    expect(second).toContain('{#x}{p}');
    expect(second).toContain('{q}{/x}');
    expect(second).not.toContain('>a<');
    expect(second.match(/<w:tc>/g)).toHaveLength(3);
  });

  it('inserts XML after a paragraph with exact text', () => {
    const xml = doc(P('ATTACHMENTS'));
    const out = applyRecipe(xml, { checkboxes: [], ops: [{ op: 'insertAfterParagraph', find: 'ATTACHMENTS', xml: '<w:tbl>T</w:tbl>' }] });
    expect(out).toContain('ATTACHMENTS</w:t></w:r></w:p><w:tbl>T</w:tbl>');
  });

  it('unwraps checkbox content controls and names the glyphs in order, after deletions', () => {
    const xml = doc(`<w:tbl>${TR(SDT(TC(P(null).replace('</w:p>', CB + '</w:p>'))))}${TR(TC(`<w:p>${SDT(CB)}${SDT(CB)}</w:p>`))}${TR(TC(`<w:p>${SDT(CB)}</w:p>`))}</w:tbl>`);
    const out = applyRecipe(xml, { checkboxes: ['one', 'two', 'three'], ops: [{ op: 'deleteRows', table: 1, rows: [3] }] });
    expect(out).not.toContain('<w:sdt>');
    expect(out).toContain('<w:t>{one}</w:t>');
    expect(out).toContain('<w:t>{two}</w:t><');
    expect(out).toContain('{three}');
    expect(out).not.toContain('☐');
  });

  it('removes legacy FORMCHECKBOX fields', () => {
    const field = '<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:checkBox/></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMCHECKBOX </w:instrText></w:r><w:r></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
    const xml = doc(`<w:p>${field}<w:r><w:t>__</w:t></w:r></w:p>`);
    const out = applyRecipe(xml, { checkboxes: [], ops: [] });
    expect(out).not.toContain('FORMCHECKBOX');
    expect(out).not.toContain('fldChar');
    expect(out).toContain('<w:t>__</w:t>');
  });

  it('fails loudly on a checkbox count mismatch or a missing target', () => {
    const xml = doc(`<w:tbl>${TR(TC(`<w:p>${SDT(CB)}</w:p>`))}</w:tbl>`);
    expect(() => applyRecipe(xml, { checkboxes: ['a', 'b'], ops: [] })).toThrow(/2 names .* 1 checkbox/);
    expect(() => applyRecipe(xml, { checkboxes: ['a'], ops: [{ op: 'cell', table: 2, row: 1, cell: 1, tag: 'x' }] })).toThrow(/table 2/);
    expect(() => applyRecipe(xml, { checkboxes: ['a'], ops: [{ op: 'replaceText', find: 'nope', with: 'x', nth: 1 }] })).toThrow(/nope/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest scripts/__tests__/docxTag.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `scripts/docx-tag.js`**

```js
#!/usr/bin/env node
// Inserts merge tags into an EMB .docx from a JSON recipe. See
// docs/superpowers/plans/2026-09-15-export-inspection-report.md (Task 11)
// for the recipe format and assets/templates/recipes/ for the real ones.
//
//   node scripts/docx-tag.js all
//   node scripts/docx-tag.js originals/X.docx recipes/x.json X.docx
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const TEMPLATES_DIR = path.join(__dirname, '..', 'assets', 'templates');

// ── XML helpers (string-based; the forms have no nested tables) ──────────────

function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Every element of `tag` as {start, end} spans, non-nested (tables/rows/cells here never nest).
function spans(xml, tag, from = 0, to = xml.length) {
  const out = [];
  const open = new RegExp(`<${tag}(?=[\\s>/])`, 'g');
  open.lastIndex = from;
  let m;
  while ((m = open.exec(xml)) && m.index < to) {
    const selfClose = xml.indexOf('>', m.index);
    if (xml[selfClose - 1] === '/') { out.push({ start: m.index, end: selfClose + 1 }); continue; }
    const close = xml.indexOf(`</${tag}>`, m.index);
    if (close < 0) throw new Error(`unclosed <${tag}> at ${m.index}`);
    out.push({ start: m.index, end: close + tag.length + 3 });
    open.lastIndex = close;
  }
  return out;
}

function normalise(xml) {
  // Unwrap checkbox content controls: keep what's inside <w:sdtContent>.
  let out = xml.replace(/<w:sdt>(?:(?!<w:sdt>)[\s\S])*?<w14:checkbox>[\s\S]*?<\/w:sdtPr><w:sdtContent>([\s\S]*?)<\/w:sdtContent><\/w:sdt>/g, '$1');
  // Remove legacy FORMCHECKBOX fields (begin … end runs, plus bookmarks around them).
  out = out.replace(/<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:fldChar w:fldCharType="begin">(?:(?!<w:fldChar w:fldCharType="end")[\s\S])*?FORMCHECKBOX[\s\S]*?<w:fldChar w:fldCharType="end"\s*\/><\/w:r>/g, '');
  out = out.replace(/<w:bookmarkStart w:name="Check\d+" w:id="\d+"\s*\/>|<w:bookmarkEnd w:id="\d+"\s*\/>/g, '');
  return out;
}

function tableGrid(xml) {
  return spans(xml, 'w:tbl').map(t => ({
    ...t,
    rows: spans(xml, 'w:tr', t.start, t.end).map(r => ({ ...r, cells: spans(xml, 'w:tc', r.start, r.end) })),
  }));
}

function locate(grid, table, row, cell) {
  const t = grid[table - 1];
  if (!t) throw new Error(`no table ${table} (document has ${grid.length})`);
  if (row == null) return { t };
  const r = t.rows[row - 1];
  if (!r) throw new Error(`no row ${row} in table ${table} (has ${t.rows.length})`);
  if (cell == null) return { t, r };
  const c = r.cells[cell - 1];
  if (!c) throw new Error(`no cell ${cell} in table ${table} row ${row} (has ${r.cells.length})`);
  return { t, r, c };
}

function lastParagraph(xml, span) {
  const ps = spans(xml, 'w:p', span.start, span.end);
  if (!ps.length) throw new Error(`no paragraph in cell at ${span.start}`);
  return ps[ps.length - 1];
}
function firstParagraph(xml, span) {
  const ps = spans(xml, 'w:p', span.start, span.end);
  if (!ps.length) throw new Error(`no paragraph in cell at ${span.start}`);
  return ps[0];
}

// rPr to give an inserted run: the paragraph's last run's, else the paragraph mark's.
function runPropsFor(xml, p) {
  const runs = spans(xml, 'w:r', p.start, p.end);
  const source = runs.length ? xml.slice(runs[runs.length - 1].start, runs[runs.length - 1].end) : xml.slice(p.start, p.end);
  const m = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(source);
  return m ? m[0] : '';
}
const run = (rpr, textXml) => `<w:r>${rpr}<w:t xml:space="preserve">${escapeXml(textXml)}</w:t></w:r>`;

// Text runs as {start, end, text} for replaceText / insertAfterParagraph.
function textRuns(xml) {
  const out = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) out.push({ start: m.index, end: m.index + m[0].length, text: unescapeXml(m[1]) });
  return out;
}
function paragraphText(xml, p) {
  return textRuns(xml.slice(p.start, p.end)).map(r => r.text).join('');
}

function applyRecipe(originalXml, recipe) {
  const xml = normalise(originalXml);
  const grid = tableGrid(xml);
  const edits = []; // {at, end, text} — replace xml[at, end) with text

  for (const op of recipe.ops ?? []) {
    switch (op.op) {
      case 'cell': {
        const { c } = locate(grid, op.table, op.row, op.cell);
        const p = lastParagraph(xml, c);
        edits.push({ at: p.end - '</w:p>'.length, end: p.end - '</w:p>'.length, text: run(runPropsFor(xml, p), `{${op.tag}}`) });
        break;
      }
      case 'loop': {
        const { r: from } = locate(grid, op.table, op.fromRow);
        const { r: to } = locate(grid, op.table, op.toRow);
        const pFirst = firstParagraph(xml, from.cells[0]);
        const pLast = lastParagraph(xml, to.cells[to.cells.length - 1]);
        const openAt = xml.indexOf('</w:pPr>', pFirst.start);
        const insertAt = openAt > 0 && openAt < pFirst.end ? openAt + '</w:pPr>'.length : xml.indexOf('>', pFirst.start) + 1;
        edits.push({ at: insertAt, end: insertAt, text: run(runPropsFor(xml, pFirst), `{#${op.name}}`) });
        edits.push({ at: pLast.end - '</w:p>'.length, end: pLast.end - '</w:p>'.length, text: run(runPropsFor(xml, pLast), `{/${op.name}}`) });
        break;
      }
      case 'deleteRows': {
        for (const rowNo of op.rows) {
          const { r } = locate(grid, op.table, rowNo);
          edits.push({ at: r.start, end: r.end, text: '' });
        }
        break;
      }
      case 'cloneRowAfter': {
        const { r } = locate(grid, op.table, op.row);
        let clone = xml.slice(r.start, r.end);
        const cells = spans(clone, 'w:tc');
        for (let i = cells.length - 1; i >= 0; i -= 1) {
          const cellXml = clone.slice(cells[i].start, cells[i].end);
          const ps = spans(cellXml, 'w:p');
          const first = ps[0];
          const rpr = runPropsFor(cellXml, first);
          const pOpen = cellXml.slice(first.start, cellXml.indexOf('>', first.start) + 1);
          const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(cellXml.slice(first.start, first.end));
          const text = op.cells[i] != null ? run(rpr, op.cells[i]) : '';
          const newCell = cellXml.slice(0, first.start) + pOpen + (pPr ? pPr[0] : '') + text + '</w:p>' + '</w:tc>';
          clone = clone.slice(0, cells[i].start) + newCell + clone.slice(cells[i].end);
        }
        edits.push({ at: r.end, end: r.end, text: clone });
        break;
      }
      case 'replaceText': {
        const matches = textRuns(xml).filter(t => t.text === op.find);
        const target = matches[(op.nth ?? 1) - 1];
        if (!target) throw new Error(`replaceText: text "${op.find}" occurrence ${op.nth ?? 1} not found (${matches.length} found)`);
        edits.push({ at: target.start, end: target.end, text: `<w:t xml:space="preserve">${escapeXml(op.with)}</w:t>` });
        break;
      }
      case 'insertAfterParagraph': {
        const p = spans(xml, 'w:p').find(s => paragraphText(xml, s) === op.find);
        if (!p) throw new Error(`insertAfterParagraph: no paragraph reads exactly "${op.find}"`);
        edits.push({ at: p.end, end: p.end, text: op.xml });
        break;
      }
      default:
        throw new Error(`unknown op ${op.op}`);
    }
  }

  // Apply from the end so earlier offsets stay valid; equal offsets keep recipe order.
  edits.sort((a, b) => b.at - a.at || b.end - a.end);
  let out = xml;
  for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.end);

  const names = recipe.checkboxes ?? [];
  const glyphs = out.match(/<w:t>☐<\/w:t>/g) ?? [];
  if (glyphs.length !== names.length) {
    throw new Error(`recipe lists ${names.length} names but the document has ${glyphs.length} checkbox glyphs after edits`);
  }
  let i = 0;
  out = out.replace(/<w:t>☐<\/w:t>/g, () => `<w:t>{${names[i++]}}</w:t>`);
  return out;
}

function tagFile(originalPath, recipePath, outPath) {
  const zip = new PizZip(fs.readFileSync(originalPath));
  const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
  zip.file('word/document.xml', applyRecipe(zip.file('word/document.xml').asText(), recipe));
  fs.writeFileSync(outPath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function tagAll() {
  const recipesDir = path.join(TEMPLATES_DIR, 'recipes');
  for (const file of fs.readdirSync(recipesDir).filter(f => f.endsWith('.json'))) {
    const recipe = JSON.parse(fs.readFileSync(path.join(recipesDir, file), 'utf8'));
    const original = path.join(TEMPLATES_DIR, 'originals', recipe.original);
    const out = path.join(TEMPLATES_DIR, recipe.output);
    tagFile(original, path.join(recipesDir, file), out);
    console.log(`${file} → ${recipe.output}`);
  }
}

module.exports = { applyRecipe, tagFile, normalise, tableGrid };

if (require.main === module) {
  const [a, b, c] = process.argv.slice(2);
  if (a === 'all') tagAll();
  else if (a && b && c) tagFile(a, b, c);
  else { console.error('usage: docx-tag.js all | <original.docx> <recipe.json> <out.docx>'); process.exit(1); }
}
```

Recipes carry `"original"` and `"output"` file names (used by `all`) besides `checkboxes`/`ops`.

`scripts/docx-grid.js`:

```js
#!/usr/bin/env node
// Prints the table/row/cell coordinates recipes are written against.
const fs = require('fs');
const PizZip = require('pizzip');
const { normalise, tableGrid } = require('./docx-tag');

const xml = normalise(new PizZip(fs.readFileSync(process.argv[2])).file('word/document.xml').asText());
tableGrid(xml).forEach((t, ti) => {
  console.log(`\nTABLE ${ti + 1} (${t.rows.length} rows)`);
  t.rows.forEach((r, ri) => {
    const cells = r.cells.map((c, ci) => {
      const cellXml = xml.slice(c.start, c.end);
      const boxes = (cellXml.match(/<w:t>☐<\/w:t>/g) || []).length;
      const text = cellXml.replace(/<w:t>☐<\/w:t>/g, '☐').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `${ci + 1}:${text || '∅'}${boxes ? `[cb×${boxes}]` : ''}`;
    });
    console.log(`r${ri + 1}: ${cells.join(' | ')}`);
  });
});
```

`scripts/docx-runs.js`:

```js
#!/usr/bin/env node
// Lists every <w:t> text with its occurrence index, for replaceText ops.
//   node scripts/docx-runs.js file.docx [substring]
const fs = require('fs');
const PizZip = require('pizzip');
const { normalise } = require('./docx-tag');

const [file, needle] = process.argv.slice(2);
const xml = normalise(new PizZip(fs.readFileSync(file)).file('word/document.xml').asText());
const seen = new Map();
for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
  const text = m[1];
  const n = (seen.get(text) ?? 0) + 1;
  seen.set(text, n);
  if (!needle || text.includes(needle)) console.log(`${JSON.stringify(text)} nth=${n}`);
}
```

Add to `package.json` scripts: `"tag-templates": "node scripts/docx-tag.js all"`.

- [ ] **Step 4: Move the originals**

```bash
mkdir -p assets/templates/originals assets/templates/recipes
git mv "assets/templates/Air Monitoring.docx" "assets/templates/originals/Air Monitoring.docx"
git mv "assets/templates/EIA.docx" "assets/templates/originals/EIA.docx"
git mv "assets/templates/Hazardous Waste Generators.docx" "assets/templates/originals/Hazardous Waste Generators.docx"
git mv "assets/templates/Survey.docx" "assets/templates/originals/Survey.docx"
git mv "assets/templates/Water Monitoring.docx" "assets/templates/originals/Water Monitoring.docx"
```

- [ ] **Step 5: Run tests and lint**

Run: `npx jest scripts && npx eslint scripts`
Expected: PASS. Then sanity-check the real file: `node scripts/docx-grid.js "assets/templates/originals/Water Monitoring.docx"` prints 12 tables; table 7 row 11 shows `[cb×5]`, `[cb×8]`, `[cb×5]`.

- [ ] **Step 6: Commit**

```bash
git add scripts package.json assets/templates
git commit -m "chore(repo): tag docx templates from JSON recipes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Tag the Water template; template registry; contract + render tests

**Files:**
- Create: `assets/templates/recipes/water.json`, `assets/templates/Water Monitoring.tags.md`, `src/features/export/templates/index.ts`, `src/features/export/render/templateContract.test.ts`, `src/features/export/render/renderTemplates.test.ts`
- Generated: `assets/templates/Water Monitoring.docx` (tagged)

**Interfaces:**
- Produces:
  ```ts
  export interface TemplateEntry { label: string; file: string; module: number /* require() */ }
  export const TEMPLATES: Partial<Record<string, TemplateEntry>>   // keyed by inspection report_type or 'survey'
  export function templateFor(kind: 'inspection' | 'survey', reportType: string): TemplateEntry | null
  export function hasTemplate(kind, reportType): boolean
  ```

**Water recipe** (`assets/templates/recipes/water.json`). Coordinates come from `docx-grid.js` on the original; the executor MUST rerun the grid and correct any drift before trusting them:

```json
{
  "original": "Water Monitoring.docx",
  "output": "Water Monitoring.docx",
  "checkboxes": [
    "purpose_cb_verify",
    "purpose_cb_pmpin_new", "purpose_cb_pmpin_renewal",
    "purpose_cb_hazwaste_id_new", "purpose_cb_hazwaste_id_renewal",
    "purpose_cb_hazwaste_transporter_new", "purpose_cb_hazwaste_transporter_renewal",
    "purpose_cb_hazwaste_tsd_new", "purpose_cb_hazwaste_tsd_renewal",
    "purpose_cb_pto_air_new", "purpose_cb_pto_air_renewal",
    "purpose_cb_discharge_permit_new", "purpose_cb_discharge_permit_renewal",
    "purpose_cb_compliance", "purpose_cb_complaints", "purpose_cb_commitments", "purpose_cb_others",
    "cb_has_wwtp_yes", "cb_has_wwtp_no",
    "cb_wwtp_type_physical", "cb_wwtp_type_biological", "cb_wwtp_type_chemical", "cb_wwtp_type_others",
    "cb_primary_screening", "cb_primary_grit_removal", "cb_primary_oil_water_separator", "cb_primary_equalization_tank", "cb_primary_others",
    "cb_bio_activated_sludge", "cb_bio_anaerobic_digestion", "cb_bio_abr", "cb_bio_reed_bed", "cb_bio_trickling_filter", "cb_bio_oxidation_batch", "cb_bio_sbr", "cb_bio_others",
    "cb_chem_ph_adjustment", "cb_chem_disinfection", "cb_chem_redox", "cb_chem_flocculation", "cb_chem_others",
    "cb_wwtp_condition_properly", "cb_wwtp_condition_inadequately", "cb_wwtp_condition_poor", "cb_wwtp_condition_others",
    "cb_under_construction_yes", "cb_under_construction_no",
    "cb_construction_reported_yes", "cb_construction_reported_no",
    "doc_cb_record_file_folder", "doc_cb_synology", "doc_cb_opms", "doc_cb_iis_transactions",
    "doc_cb_cmr_online", "doc_cb_smr_online", "doc_cb_pco_online", "doc_cb_others"
  ],
  "ops": [
    { "op": "replaceText", "find": " __________", "with": " {report_control_no}", "nth": 1 },
    { "op": "replaceText", "find": " ____________", "with": " {inspection_date}", "nth": 1 },

    { "op": "cell", "table": 1, "row": 1, "cell": 2, "tag": "gi_establishment_name" },
    { "op": "cell", "table": 1, "row": 2, "cell": 2, "tag": "gi_address" },
    { "op": "cell", "table": 1, "row": 2, "cell": 3, "tag": "gi_geo" },
    { "op": "cell", "table": 1, "row": 3, "cell": 2, "tag": "gi_nature_of_business" },
    { "op": "cell", "table": 1, "row": 4, "cell": 1, "tag": "gi_psic_code" },
    { "op": "cell", "table": 1, "row": 4, "cell": 2, "tag": "gi_product" },
    { "op": "cell", "table": 1, "row": 4, "cell": 3, "tag": "gi_year_established" },
    { "op": "cell", "table": 1, "row": 5, "cell": 1, "tag": "gi_operating_hours_day" },
    { "op": "cell", "table": 1, "row": 5, "cell": 2, "tag": "gi_operating_days_week" },
    { "op": "cell", "table": 1, "row": 5, "cell": 3, "tag": "gi_operating_days_year" },

    { "op": "loop", "table": 2, "fromRow": 2, "toRow": 2, "name": "product_lines" },
    { "op": "cell", "table": 2, "row": 2, "cell": 1, "tag": "product_line" },
    { "op": "cell", "table": 2, "row": 2, "cell": 2, "tag": "ecc_production_rate" },
    { "op": "cell", "table": 2, "row": 2, "cell": 3, "tag": "actual_production_rate" },

    { "op": "cell", "table": 3, "row": 1, "cell": 2, "tag": "gi_managing_head" },
    { "op": "cell", "table": 3, "row": 2, "cell": 2, "tag": "gi_pco_name" },
    { "op": "cell", "table": 3, "row": 3, "cell": 2, "tag": "gi_pco_accreditation_no" },
    { "op": "cell", "table": 3, "row": 3, "cell": 3, "tag": "gi_pco_effectivity" },
    { "op": "cell", "table": 3, "row": 4, "cell": 2, "tag": "gi_phone_fax" },
    { "op": "cell", "table": 3, "row": 4, "cell": 3, "tag": "gi_email" },
    { "op": "cell", "table": 3, "row": 5, "cell": 1, "tag": "gi_contact_person" },

    { "op": "cell", "table": 4, "row": 13, "cell": 2, "tag": "purpose_cb_industrial_ecowatch" },
    { "op": "cell", "table": 4, "row": 14, "cell": 2, "tag": "purpose_cb_pepp" },
    { "op": "cell", "table": 4, "row": 15, "cell": 2, "tag": "purpose_cb_pab" },
    { "op": "cell", "table": 4, "row": 16, "cell": 2, "tag": "purpose_cb_commitment_others" },
    { "op": "cell", "table": 4, "row": 16, "cell": 3, "tag": "purpose_commitment_others" },
    { "op": "replaceText", "find": "Others (Specify): _________________________", "with": "Others (Specify): {purpose_others}", "nth": 1 },

    { "op": "cell", "table": 5, "row": 2, "cell": 3, "tag": "permit_ecc1_serial" },
    { "op": "cell", "table": 5, "row": 2, "cell": 4, "tag": "permit_ecc1_issued" },
    { "op": "cell", "table": 5, "row": 2, "cell": 5, "tag": "permit_ecc1_expiry" },
    { "op": "cell", "table": 5, "row": 3, "cell": 3, "tag": "permit_ecc2_serial" },
    { "op": "cell", "table": 5, "row": 3, "cell": 4, "tag": "permit_ecc2_issued" },
    { "op": "cell", "table": 5, "row": 3, "cell": 5, "tag": "permit_ecc2_expiry" },
    { "op": "cell", "table": 5, "row": 4, "cell": 3, "tag": "permit_ecc3_serial" },
    { "op": "cell", "table": 5, "row": 4, "cell": 4, "tag": "permit_ecc3_issued" },
    { "op": "cell", "table": 5, "row": 4, "cell": 5, "tag": "permit_ecc3_expiry" },
    { "op": "cell", "table": 5, "row": 5, "cell": 3, "tag": "permit_denr_registry_id_serial" },
    { "op": "cell", "table": 5, "row": 5, "cell": 4, "tag": "permit_denr_registry_id_issued" },
    { "op": "cell", "table": 5, "row": 5, "cell": 5, "tag": "permit_denr_registry_id_expiry" },
    { "op": "cell", "table": 5, "row": 6, "cell": 3, "tag": "permit_pcl_compliance_certificate_serial" },
    { "op": "cell", "table": 5, "row": 6, "cell": 4, "tag": "permit_pcl_compliance_certificate_issued" },
    { "op": "cell", "table": 5, "row": 6, "cell": 5, "tag": "permit_pcl_compliance_certificate_expiry" },
    { "op": "cell", "table": 5, "row": 7, "cell": 3, "tag": "permit_cco_registry_serial" },
    { "op": "cell", "table": 5, "row": 7, "cell": 4, "tag": "permit_cco_registry_issued" },
    { "op": "cell", "table": 5, "row": 7, "cell": 5, "tag": "permit_cco_registry_expiry" },
    { "op": "cell", "table": 5, "row": 8, "cell": 3, "tag": "permit_permit_to_transport_serial" },
    { "op": "cell", "table": 5, "row": 8, "cell": 4, "tag": "permit_permit_to_transport_issued" },
    { "op": "cell", "table": 5, "row": 8, "cell": 5, "tag": "permit_permit_to_transport_expiry" },
    { "op": "cell", "table": 5, "row": 9, "cell": 3, "tag": "permit_po_number_serial" },
    { "op": "cell", "table": 5, "row": 9, "cell": 4, "tag": "permit_po_number_issued" },
    { "op": "cell", "table": 5, "row": 9, "cell": 5, "tag": "permit_po_number_expiry" },
    { "op": "cell", "table": 5, "row": 10, "cell": 3, "tag": "permit_ecc_sanitary_landfill_serial" },
    { "op": "cell", "table": 5, "row": 10, "cell": 4, "tag": "permit_ecc_sanitary_landfill_issued" },
    { "op": "cell", "table": 5, "row": 10, "cell": 5, "tag": "permit_ecc_sanitary_landfill_expiry" },
    { "op": "cell", "table": 5, "row": 11, "cell": 3, "tag": "permit_discharge_permit_number_serial" },
    { "op": "cell", "table": 5, "row": 11, "cell": 4, "tag": "permit_discharge_permit_number_issued" },
    { "op": "cell", "table": 5, "row": 11, "cell": 5, "tag": "permit_discharge_permit_number_expiry" },
    { "op": "cloneRowAfter", "table": 5, "row": 11, "cells": ["{#permits_extra}{envi_law}", "{permit_type}", "{permit_serial}", "{issued_date}", "{expiry_date}{/permits_extra}"] },

    { "op": "cell", "table": 6, "row": 3, "cell": 2, "tag": "ws_surface_daily" },
    { "op": "cell", "table": 6, "row": 3, "cell": 3, "tag": "ws_surface_annual" },
    { "op": "cell", "table": 6, "row": 3, "cell": 4, "tag": "ws_surface_specify" },
    { "op": "cell", "table": 6, "row": 4, "cell": 2, "tag": "ws_groundwater_daily" },
    { "op": "cell", "table": 6, "row": 4, "cell": 3, "tag": "ws_groundwater_annual" },
    { "op": "cell", "table": 6, "row": 4, "cell": 4, "tag": "ws_groundwater_specify" },
    { "op": "cell", "table": 6, "row": 5, "cell": 2, "tag": "ws_utilities_daily" },
    { "op": "cell", "table": 6, "row": 5, "cell": 3, "tag": "ws_utilities_annual" },
    { "op": "cell", "table": 6, "row": 5, "cell": 4, "tag": "ws_utilities_specify" },
    { "op": "cell", "table": 6, "row": 6, "cell": 2, "tag": "ws_desalination_daily" },
    { "op": "cell", "table": 6, "row": 6, "cell": 3, "tag": "ws_desalination_annual" },
    { "op": "cell", "table": 6, "row": 6, "cell": 4, "tag": "ws_desalination_specify" },
    { "op": "cell", "table": 6, "row": 7, "cell": 2, "tag": "ws_recycled_daily" },
    { "op": "cell", "table": 6, "row": 7, "cell": 3, "tag": "ws_recycled_annual" },
    { "op": "cell", "table": 6, "row": 7, "cell": 4, "tag": "ws_recycled_specify" },
    { "op": "cell", "table": 6, "row": 8, "cell": 2, "tag": "ws_others_daily" },
    { "op": "cell", "table": 6, "row": 8, "cell": 3, "tag": "ws_others_annual" },
    { "op": "cell", "table": 6, "row": 8, "cell": 4, "tag": "ws_others_specify" },
    { "op": "cell", "table": 6, "row": 11, "cell": 2, "tag": "ww_process_consumed" },
    { "op": "cell", "table": 6, "row": 11, "cell": 3, "tag": "ww_process_generated" },
    { "op": "cell", "table": 6, "row": 11, "cell": 4, "tag": "ww_process_specify" },
    { "op": "cell", "table": 6, "row": 12, "cell": 2, "tag": "ww_domestic_consumed" },
    { "op": "cell", "table": 6, "row": 12, "cell": 3, "tag": "ww_domestic_generated" },
    { "op": "cell", "table": 6, "row": 12, "cell": 4, "tag": "ww_domestic_specify" },
    { "op": "cell", "table": 6, "row": 13, "cell": 2, "tag": "ww_cooling_consumed" },
    { "op": "cell", "table": 6, "row": 13, "cell": 3, "tag": "ww_cooling_generated" },
    { "op": "cell", "table": 6, "row": 13, "cell": 4, "tag": "ww_cooling_specify" },
    { "op": "cell", "table": 6, "row": 14, "cell": 2, "tag": "ww_maintenance_consumed" },
    { "op": "cell", "table": 6, "row": 14, "cell": 3, "tag": "ww_maintenance_generated" },
    { "op": "cell", "table": 6, "row": 14, "cell": 4, "tag": "ww_maintenance_specify" },
    { "op": "cell", "table": 6, "row": 15, "cell": 2, "tag": "ww_storm_drain_consumed" },
    { "op": "cell", "table": 6, "row": 15, "cell": 3, "tag": "ww_storm_drain_generated" },
    { "op": "cell", "table": 6, "row": 15, "cell": 4, "tag": "ww_storm_drain_specify" },
    { "op": "cell", "table": 6, "row": 16, "cell": 2, "tag": "ww_others_consumed" },
    { "op": "cell", "table": 6, "row": 16, "cell": 3, "tag": "ww_others_generated" },
    { "op": "cell", "table": 6, "row": 16, "cell": 4, "tag": "ww_others_specify" },
    { "op": "loop", "table": 6, "fromRow": 19, "toRow": 19, "name": "abstracted_rows" },
    { "op": "cell", "table": 6, "row": 19, "cell": 1, "tag": "source" },
    { "op": "cell", "table": 6, "row": 19, "cell": 2, "tag": "bod_cod" },
    { "op": "cell", "table": 6, "row": 19, "cell": 3, "tag": "tss" },
    { "op": "cell", "table": 6, "row": 19, "cell": 4, "tag": "avfp" },
    { "op": "cell", "table": 6, "row": 19, "cell": 5, "tag": "heavy_metal" },
    { "op": "cell", "table": 6, "row": 19, "cell": 6, "tag": "specify" },
    { "op": "deleteRows", "table": 6, "rows": [20, 21, 22, 23] },

    { "op": "cell", "table": 7, "row": 2, "cell": 2, "tag": "wwtp_type_others" },
    { "op": "loop", "table": 7, "fromRow": 6, "toRow": 6, "name": "wwtp_outlets" },
    { "op": "replaceText", "find": "1", "with": "{outlet_no}", "nth": 1 },
    { "op": "cell", "table": 7, "row": 6, "cell": 2, "tag": "wwtp_detail" },
    { "op": "cell", "table": 7, "row": 6, "cell": 3, "tag": "date_of_installation" },
    { "op": "cell", "table": 7, "row": 6, "cell": 4, "tag": "design_capacity" },
    { "op": "cell", "table": 7, "row": 6, "cell": 5, "tag": "annual_maintenance_cost" },
    { "op": "cell", "table": 7, "row": 6, "cell": 6, "tag": "outlet_location" },
    { "op": "cell", "table": 7, "row": 6, "cell": 7, "tag": "receiving_body" },
    { "op": "cell", "table": 7, "row": 6, "cell": 8, "tag": "flow_meter_device" },
    { "op": "cell", "table": 7, "row": 6, "cell": 9, "tag": "flow_rate" },
    { "op": "deleteRows", "table": 7, "rows": [7, 8, 12] },
    { "op": "loop", "table": 7, "fromRow": 11, "toRow": 11, "name": "wwtp_components" },
    { "op": "replaceText", "find": "1", "with": "{outlet_no}", "nth": 2 },
    { "op": "cell", "table": 7, "row": 11, "cell": 2, "tag": "wwtp" },
    { "op": "cell", "table": 7, "row": 11, "cell": 3, "tag": "primary_others" },
    { "op": "cell", "table": 7, "row": 11, "cell": 4, "tag": "bio_others" },
    { "op": "cell", "table": 7, "row": 11, "cell": 5, "tag": "chem_others" },
    { "op": "cell", "table": 7, "row": 11, "cell": 6, "tag": "other_treatment" },
    { "op": "cell", "table": 7, "row": 14, "cell": 2, "tag": "wwtp_condition_others" },
    { "op": "cell", "table": 7, "row": 17, "cell": 2, "tag": "wwtp_construction_units" },
    { "op": "cell", "table": 7, "row": 18, "cell": 2, "tag": "wwtp_construction_completion_date" },
    { "op": "cell", "table": 7, "row": 19, "cell": 2, "tag": "wwtp_treatment_units_utilized" },

    { "op": "loop", "table": 8, "fromRow": 1, "toRow": 8, "name": "sampling_points" },
    { "op": "replaceText", "find": "Sampling Point No. 1", "with": "Sampling Point No. {point_no}", "nth": 1 },
    { "op": "cell", "table": 8, "row": 3, "cell": 2, "tag": "sampling_station" },
    { "op": "replaceText", "find": "AM/PM", "with": "{sampling_time}", "nth": 1 },
    { "op": "cell", "table": 8, "row": 4, "cell": 2, "tag": "type_of_sample" },
    { "op": "loop", "table": 8, "fromRow": 8, "toRow": 8, "name": "parameters" },
    { "op": "cell", "table": 8, "row": 8, "cell": 1, "tag": "parameter_name" },
    { "op": "cell", "table": 8, "row": 8, "cell": 2, "tag": "value" },
    { "op": "cell", "table": 8, "row": 8, "cell": 3, "tag": "unit" },
    { "op": "cell", "table": 8, "row": 8, "cell": 4, "tag": "denr_standard" },
    { "op": "cell", "table": 8, "row": 8, "cell": 5, "tag": "cb_compliant_y" },
    { "op": "cell", "table": 8, "row": 8, "cell": 6, "tag": "cb_compliant_n" },
    { "op": "cell", "table": 8, "row": 8, "cell": 7, "tag": "remarks" },
    { "op": "deleteRows", "table": 8, "rows": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 30] },
    { "op": "cell", "table": 8, "row": 22, "cell": 1, "tag": "prev_date_of_sampling" },
    { "op": "cell", "table": 8, "row": 23, "cell": 2, "tag": "prev_sampling_station" },
    { "op": "replaceText", "find": "AM/PM", "with": "{prev_sampling_time}", "nth": 3 },
    { "op": "cell", "table": 8, "row": 24, "cell": 2, "tag": "prev_type_of_sample" },
    { "op": "loop", "table": 8, "fromRow": 28, "toRow": 28, "name": "prev_parameters" },
    { "op": "cell", "table": 8, "row": 28, "cell": 1, "tag": "parameter_name" },
    { "op": "cell", "table": 8, "row": 28, "cell": 2, "tag": "value" },
    { "op": "cell", "table": 8, "row": 28, "cell": 3, "tag": "unit" },
    { "op": "cell", "table": 8, "row": 28, "cell": 4, "tag": "denr_standard" },
    { "op": "cell", "table": 8, "row": 28, "cell": 5, "tag": "cb_compliant_y" },
    { "op": "cell", "table": 8, "row": 28, "cell": 6, "tag": "cb_compliant_n" },
    { "op": "cell", "table": 8, "row": 28, "cell": 7, "tag": "remarks" },

    { "op": "cell", "table": 9, "row": 4, "cell": 3, "tag": "sf_dao2005_10_r13_1_wastewater_charge_y" },
    { "op": "cell", "table": 9, "row": 4, "cell": 4, "tag": "sf_dao2005_10_r13_1_wastewater_charge_n" },
    { "op": "cell", "table": 9, "row": 4, "cell": 5, "tag": "sf_dao2005_10_r13_1_wastewater_charge_na" },
    { "op": "cell", "table": 9, "row": 4, "cell": 6, "tag": "sf_dao2005_10_r13_1_wastewater_charge_remarks" },
    { "op": "cell", "table": 9, "row": 5, "cell": 3, "tag": "sf_dao2005_10_r14_1_has_dp_y" },
    { "op": "cell", "table": 9, "row": 5, "cell": 4, "tag": "sf_dao2005_10_r14_1_has_dp_n" },
    { "op": "cell", "table": 9, "row": 5, "cell": 5, "tag": "sf_dao2005_10_r14_1_has_dp_na" },
    { "op": "cell", "table": 9, "row": 5, "cell": 6, "tag": "sf_dao2005_10_r14_1_has_dp_remarks" },
    { "op": "cell", "table": 9, "row": 6, "cell": 3, "tag": "sf_dao2005_10_r14_5_dp_fee_y" },
    { "op": "cell", "table": 9, "row": 6, "cell": 4, "tag": "sf_dao2005_10_r14_5_dp_fee_n" },
    { "op": "cell", "table": 9, "row": 6, "cell": 5, "tag": "sf_dao2005_10_r14_5_dp_fee_na" },
    { "op": "cell", "table": 9, "row": 6, "cell": 6, "tag": "sf_dao2005_10_r14_5_dp_fee_remarks" },
    { "op": "cell", "table": 9, "row": 7, "cell": 3, "tag": "sf_dao2005_10_r14_9_dp_valid_y" },
    { "op": "cell", "table": 9, "row": 7, "cell": 4, "tag": "sf_dao2005_10_r14_9_dp_valid_n" },
    { "op": "cell", "table": 9, "row": 7, "cell": 5, "tag": "sf_dao2005_10_r14_9_dp_valid_na" },
    { "op": "cell", "table": 9, "row": 7, "cell": 6, "tag": "sf_dao2005_10_r14_9_dp_valid_remarks" },
    { "op": "cell", "table": 9, "row": 8, "cell": 3, "tag": "sf_dao2005_10_r14_11_discharge_points_y" },
    { "op": "cell", "table": 9, "row": 8, "cell": 4, "tag": "sf_dao2005_10_r14_11_discharge_points_n" },
    { "op": "cell", "table": 9, "row": 8, "cell": 5, "tag": "sf_dao2005_10_r14_11_discharge_points_na" },
    { "op": "cell", "table": 9, "row": 8, "cell": 6, "tag": "sf_dao2005_10_r14_11_discharge_points_remarks" },
    { "op": "cell", "table": 9, "row": 9, "cell": 3, "tag": "sf_dao2005_10_r14_11_discharge_volume_y" },
    { "op": "cell", "table": 9, "row": 9, "cell": 4, "tag": "sf_dao2005_10_r14_11_discharge_volume_n" },
    { "op": "cell", "table": 9, "row": 9, "cell": 5, "tag": "sf_dao2005_10_r14_11_discharge_volume_na" },
    { "op": "cell", "table": 9, "row": 9, "cell": 6, "tag": "sf_dao2005_10_r14_11_discharge_volume_remarks" },
    { "op": "cell", "table": 9, "row": 10, "cell": 3, "tag": "sf_dao2005_10_r14_11_dp_posted_y" },
    { "op": "cell", "table": 9, "row": 10, "cell": 4, "tag": "sf_dao2005_10_r14_11_dp_posted_n" },
    { "op": "cell", "table": 9, "row": 10, "cell": 5, "tag": "sf_dao2005_10_r14_11_dp_posted_na" },
    { "op": "cell", "table": 9, "row": 10, "cell": 6, "tag": "sf_dao2005_10_r14_11_dp_posted_remarks" },
    { "op": "cell", "table": 9, "row": 11, "cell": 3, "tag": "sf_dao2005_10_r14_16_smr_y" },
    { "op": "cell", "table": 9, "row": 11, "cell": 4, "tag": "sf_dao2005_10_r14_16_smr_n" },
    { "op": "cell", "table": 9, "row": 11, "cell": 5, "tag": "sf_dao2005_10_r14_16_smr_na" },
    { "op": "cell", "table": 9, "row": 11, "cell": 6, "tag": "sf_dao2005_10_r14_16_smr_remarks" },
    { "op": "cell", "table": 9, "row": 12, "cell": 3, "tag": "sf_dao1990_35_s4_6_effluent_standards_y" },
    { "op": "cell", "table": 9, "row": 12, "cell": 4, "tag": "sf_dao1990_35_s4_6_effluent_standards_n" },
    { "op": "cell", "table": 9, "row": 12, "cell": 5, "tag": "sf_dao1990_35_s4_6_effluent_standards_na" },
    { "op": "cell", "table": 9, "row": 12, "cell": 6, "tag": "sf_dao1990_35_s4_6_effluent_standards_remarks" },
    { "op": "cell", "table": 9, "row": 13, "cell": 3, "tag": "sf_dao1990_25_s8_additional_requirements_y" },
    { "op": "cell", "table": 9, "row": 13, "cell": 4, "tag": "sf_dao1990_25_s8_additional_requirements_n" },
    { "op": "cell", "table": 9, "row": 13, "cell": 5, "tag": "sf_dao1990_25_s8_additional_requirements_na" },
    { "op": "cell", "table": 9, "row": 13, "cell": 6, "tag": "sf_dao1990_25_s8_additional_requirements_remarks" },
    { "op": "cell", "table": 9, "row": 14, "cell": 3, "tag": "sf_dao1990_35_s9_pcf_operated_y" },
    { "op": "cell", "table": 9, "row": 14, "cell": 4, "tag": "sf_dao1990_35_s9_pcf_operated_n" },
    { "op": "cell", "table": 9, "row": 14, "cell": 5, "tag": "sf_dao1990_35_s9_pcf_operated_na" },
    { "op": "cell", "table": 9, "row": 14, "cell": 6, "tag": "sf_dao1990_35_s9_pcf_operated_remarks" },
    { "op": "cell", "table": 9, "row": 15, "cell": 3, "tag": "sf_dao1990_35_s10_methods_of_analysis_y" },
    { "op": "cell", "table": 9, "row": 15, "cell": 4, "tag": "sf_dao1990_35_s10_methods_of_analysis_n" },
    { "op": "cell", "table": 9, "row": 15, "cell": 5, "tag": "sf_dao1990_35_s10_methods_of_analysis_na" },
    { "op": "cell", "table": 9, "row": 15, "cell": 6, "tag": "sf_dao1990_35_s10_methods_of_analysis_remarks" },
    { "op": "cell", "table": 9, "row": 16, "cell": 3, "tag": "sf_other_analysis_reports_y" },
    { "op": "cell", "table": 9, "row": 16, "cell": 4, "tag": "sf_other_analysis_reports_n" },
    { "op": "cell", "table": 9, "row": 16, "cell": 5, "tag": "sf_other_analysis_reports_na" },
    { "op": "cell", "table": 9, "row": 16, "cell": 6, "tag": "sf_other_analysis_reports_remarks" },
    { "op": "cell", "table": 9, "row": 17, "cell": 3, "tag": "sf_other_emb_correspondence_y" },
    { "op": "cell", "table": 9, "row": 17, "cell": 4, "tag": "sf_other_emb_correspondence_n" },
    { "op": "cell", "table": 9, "row": 17, "cell": 5, "tag": "sf_other_emb_correspondence_na" },
    { "op": "cell", "table": 9, "row": 17, "cell": 6, "tag": "sf_other_emb_correspondence_remarks" },
    { "op": "cell", "table": 9, "row": 18, "cell": 3, "tag": "sf_other_violations_documented_y" },
    { "op": "cell", "table": 9, "row": 18, "cell": 4, "tag": "sf_other_violations_documented_n" },
    { "op": "cell", "table": 9, "row": 18, "cell": 5, "tag": "sf_other_violations_documented_na" },
    { "op": "cell", "table": 9, "row": 18, "cell": 6, "tag": "sf_other_violations_documented_remarks" },
    { "op": "cell", "table": 9, "row": 19, "cell": 3, "tag": "sf_other_pending_litigation_y" },
    { "op": "cell", "table": 9, "row": 19, "cell": 4, "tag": "sf_other_pending_litigation_n" },
    { "op": "cell", "table": 9, "row": 19, "cell": 5, "tag": "sf_other_pending_litigation_na" },
    { "op": "cell", "table": 9, "row": 19, "cell": 6, "tag": "sf_other_pending_litigation_remarks" },
    { "op": "cell", "table": 9, "row": 20, "cell": 3, "tag": "sf_other_spill_prevention_plan_y" },
    { "op": "cell", "table": 9, "row": 20, "cell": 4, "tag": "sf_other_spill_prevention_plan_n" },
    { "op": "cell", "table": 9, "row": 20, "cell": 5, "tag": "sf_other_spill_prevention_plan_na" },
    { "op": "cell", "table": 9, "row": 20, "cell": 6, "tag": "sf_other_spill_prevention_plan_remarks" },
    { "op": "cell", "table": 9, "row": 21, "cell": 3, "tag": "sf_other_spill_containment_y" },
    { "op": "cell", "table": 9, "row": 21, "cell": 4, "tag": "sf_other_spill_containment_n" },
    { "op": "cell", "table": 9, "row": 21, "cell": 5, "tag": "sf_other_spill_containment_na" },
    { "op": "cell", "table": 9, "row": 21, "cell": 6, "tag": "sf_other_spill_containment_remarks" },

    { "op": "loop", "table": 10, "fromRow": 4, "toRow": 4, "name": "dp_conditions" },
    { "op": "cell", "table": 10, "row": 4, "cell": 1, "tag": "condition_no" },
    { "op": "cell", "table": 10, "row": 4, "cell": 2, "tag": "description" },
    { "op": "cell", "table": 10, "row": 4, "cell": 3, "tag": "cb_y" },
    { "op": "cell", "table": 10, "row": 4, "cell": 4, "tag": "cb_n" },
    { "op": "cell", "table": 10, "row": 4, "cell": 5, "tag": "cb_na" },
    { "op": "cell", "table": 10, "row": 4, "cell": 6, "tag": "remarks" },
    { "op": "deleteRows", "table": 10, "rows": [5, 6, 7, 8] },

    { "op": "cell", "table": 11, "row": 2, "cell": 1, "tag": "other_observations" },
    { "op": "cell", "table": 11, "row": 4, "cell": 1, "tag": "remarks_recommendations" },
    { "op": "cell", "table": 11, "row": 6, "cell": 2, "tag": "doc_others" },

    { "op": "replaceText", "find": "NAME OF INSPECTOR", "with": "{sig_inspector_name}", "nth": 1 },
    { "op": "replaceText", "find": "Position/Designation of Inspector", "with": "{sig_inspector_position}", "nth": 1 },
    { "op": "replaceText", "find": "NAME OF IMMEDIATE SUPERVISOR", "with": "{sig_supervisor_name}", "nth": 1 },
    { "op": "replaceText", "find": "Position/Designation of Immediate Supervisor", "with": "{sig_supervisor_position}", "nth": 1 },

    { "op": "insertAfterParagraph", "find": "ATTACHMENTS", "xml": "<w:tbl><w:tblPr><w:tblW w:w=\"5000\" w:type=\"pct\"/><w:tblLook w:val=\"04A0\"/></w:tblPr><w:tblGrid><w:gridCol w:w=\"4680\"/><w:gridCol w:w=\"4680\"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w=\"2500\" w:type=\"pct\"/></w:tcPr><w:p><w:r><w:t>{#photo_rows}{#left}</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val=\"center\"/></w:pPr><w:r><w:t>{@photo_drawing}</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val=\"center\"/><w:rPr><w:sz w:val=\"18\"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val=\"18\"/></w:rPr><w:t>{caption}{/left}</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w=\"2500\" w:type=\"pct\"/></w:tcPr><w:p><w:r><w:t>{#right}</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val=\"center\"/></w:pPr><w:r><w:t>{@photo_drawing}</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val=\"center\"/><w:rPr><w:sz w:val=\"18\"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val=\"18\"/></w:rPr><w:t>{caption}{/right}{/photo_rows}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>" }
  ]
}
```

Notes the executor must act on while wiring this recipe:
1. The `replaceText` `"find": "1"` ops assume the outlet number `1` in table 7 rows 6 and 11 is its own `<w:t>` and is the 1st/2nd exact `"1"` text in the document; confirm with `node scripts/docx-runs.js "assets/templates/originals/Water Monitoring.docx" 1` and fix `nth`. Same for `"AM/PM"` (the point-2 block's `AM/PM` is deleted, so the previous-inspection one is the 3rd occurrence in the *original*, which is what `nth` counts).
2. Rows 19–23 of table 6 have 8 cells where the header has 6 — tag cells 1–6 and leave 7–8; check the rendered document doesn't show stray empty columns. If it does, the `cell` op for `specify` should target cell 8 instead (Word gridSpan quirk) — decide by looking at the output in Word.
3. The photo table's `{#photo_rows}{#left}` … `{/right}{/photo_rows}` loops match `mapPhotos` (Task 8) and the recursive `photo_drawing` injection in `renderDocx` (Task 3).

- [ ] **Step 1: Write the recipe and generate the tagged template**

Save the recipe above as `assets/templates/recipes/water.json`, then:

```bash
npm run tag-templates
node scripts/docx-tags.js "assets/templates/Water Monitoring.docx"
```

Expected: the second command lists 300-odd tags with loops `abstracted_rows, dp_conditions, left, parameters, permits_extra, photo_rows, prev_parameters, product_lines, right, sampling_points, wwtp_components, wwtp_outlets` and raw `photo_drawing`. Fix any recipe error the script throws (it names the table/row/cell or text).

- [ ] **Step 2: Write the template registry**

`src/features/export/templates/index.ts`:

```ts
// The tagged EMB forms shipped in the binary, by inspection_reports.report_type
// (or 'survey'). A type with no entry can't be exported yet — the tab shows
// "No template yet" on its cards. Recipes live next to the templates; see
// scripts/docx-tag.js.
export interface TemplateEntry {
  label: string; // used in the output file name
  file: string;
  module: number;
}

export const TEMPLATES: Partial<Record<string, TemplateEntry>> = {
  water_monitoring: { label: 'Water Monitoring', file: 'Water Monitoring.docx', module: require('../../../../assets/templates/Water Monitoring.docx') },
};

export const SURVEY_TEMPLATE_KEY = 'survey';

export function templateFor(kind: 'inspection' | 'survey', reportType: string): TemplateEntry | null {
  return (kind === 'survey' ? TEMPLATES[SURVEY_TEMPLATE_KEY] : TEMPLATES[reportType]) ?? null;
}

export function hasTemplate(kind: 'inspection' | 'survey', reportType: string): boolean {
  return templateFor(kind, reportType) !== null;
}
```

The `require()` of a `.docx` needs `// eslint-disable-next-line @typescript-eslint/no-require-imports` on each line (Metro resolves it as an asset module id). Jest can't `require()` a `.docx`; add to `jest.config.js` `moduleNameMapper`: `'\\.docx$': '<rootDir>/jest.docxStub.js'` with `jest.docxStub.js` containing `module.exports = 0;`. (The contract/render tests below read the files from disk with `fs`, not through this registry.)

- [ ] **Step 3: Write the contract test and the render test**

`src/features/export/render/templateContract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { mapBundle } from '../mappers';
import { fullWaterBundle, fullSurveyBundle, signatories } from '../mappers/fixtures';
import type { TemplateData } from '../types';

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'templates');
const ctx = { signatories };

// Every template's tags must be exactly the keys its mapper produces — a
// tag with no data prints "", a key with no tag is silently lost, and both
// are the failure mode of a re-tag after EMB revises a form.
function tagsOf(file: string) {
  const xml = new PizZip(fs.readFileSync(path.join(TEMPLATES_DIR, file))).file('word/document.xml')!.asText();
  const text = xml.replace(/<[^>]+>/g, '');
  const plain = new Set<string>();
  const loops = new Set<string>();
  const raw = new Set<string>();
  for (const m of text.matchAll(/\{([#/@]?)([A-Za-z0-9_]+)\}/g)) {
    if (m[1] === '#' || m[1] === '/') loops.add(m[2]);
    else if (m[1] === '@') raw.add(m[2]);
    else plain.add(m[2]);
  }
  return { plain, loops, raw };
}

// Keys at every level of the data: top-level strings, loop names, and the
// string keys inside loop rows (which is where docxtemplater resolves them).
function keysOf(data: TemplateData) {
  const plain = new Set<string>();
  const loops = new Set<string>();
  const walk = (d: TemplateData) => {
    for (const [k, v] of Object.entries(d)) {
      if (Array.isArray(v)) {
        loops.add(k);
        v.forEach(walk);
      } else plain.add(k);
    }
  };
  walk(data);
  plain.delete('photo_id');
  plain.delete('photo_missing_text');
  return { plain, loops };
}

const cases: [string, TemplateData][] = [
  ['Water Monitoring.docx', mapBundle(fullWaterBundle(), ctx)],
  // Task 13 adds: Air Monitoring, EIA, Hazardous Waste Generators (mapCommon), Survey (mapSurvey)
];

describe.each(cases)('%s', (file, data) => {
  const tags = tagsOf(file);
  const keys = keysOf(data);

  it('has no tag the mapper does not fill', () => {
    expect([...tags.plain].filter(t => !keys.plain.has(t)).sort()).toEqual([]);
    expect([...tags.loops].filter(t => !keys.loops.has(t)).sort()).toEqual([]);
  });
  it('prints every key the mapper produces', () => {
    expect([...keys.plain].filter(k => !tags.plain.has(k)).sort()).toEqual([]);
    expect([...keys.loops].filter(k => !tags.loops.has(k)).sort()).toEqual([]);
  });
  it('uses the photo drawing raw tag', () => {
    expect([...tags.raw]).toEqual(['photo_drawing']);
  });
});
```

`src/features/export/render/renderTemplates.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { renderDocx } from './renderDocx';
import { mapBundle } from '../mappers';
import { fullWaterBundle, emptyWaterBundle, signatories } from '../mappers/fixtures';
import { TICKED } from '../mappers/primitives';

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'templates');
const ctx = { signatories };
const load = (file: string) => new Uint8Array(fs.readFileSync(path.join(TEMPLATES_DIR, file)));
const docXml = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText();
const png1x1 = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));

describe('Water Monitoring.docx renders', () => {
  it('a full report with no tag left behind', () => {
    const out = renderDocx(load('Water Monitoring.docx'), mapBundle(fullWaterBundle(), ctx), [
      { id: 'a1', bytes: png1x1, mime: 'image/png', width: 1, height: 1 },
    ]);
    const xml = docXml(out);
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    expect(xml).toContain('Alpha Water Refilling');
    expect(xml).toContain('05 September 2026');
    expect(xml).toContain('Calapan River (Class C)');
    expect(xml).toContain('IMG_0002.jpg (not downloaded)');
    expect(xml).toContain('<w:drawing>');
    expect(xml.split(TICKED).length - 1).toBeGreaterThan(5);
    expect(new PizZip(out).file('word/media/export_1.png')).toBeTruthy();
  });

  it('an empty draft, still showing the printed row counts', () => {
    const xml = docXml(renderDocx(load('Water Monitoring.docx'), mapBundle(emptyWaterBundle(), ctx), []));
    expect(xml).not.toMatch(/\{[#/@]?[A-Za-z0-9_]+\}/);
    // 3 outlet rows + 2 component rows survive padding
    expect(xml).toContain('Receiving Body of Water');
  });
});
```

- [ ] **Step 4: Run the tests; iterate on the recipe until both pass**

Run: `npx jest src/features/export/render src/features/export/mappers && npm run typecheck && npm run lint`
Expected: PASS. When the contract test lists a tag the mapper lacks or vice-versa, the fix is in the recipe (wrong cell) or a typo — not in loosening the test.

- [ ] **Step 5: Eyeball it on the device**

With the spike screen from Task 5 still on disk, point its `require` at the tagged `Water Monitoring.docx`, replace its `renderDocx(...)` data with `mapBundle(fullWaterBundle(), { signatories })`, run, and open the result in Word. Check: no stray `{`, checkboxes are ☒/☐ in MS Gothic, three outlet rows, the photo page. Fix recipe cell numbers if anything landed in the wrong cell (see note 2 above) and rerun `npm run tag-templates`.

- [ ] **Step 6: Write `Water Monitoring.tags.md`**

A Markdown file listing every tag with its meaning, generated from the two inventory tables in Tasks 8 and 9 plus the loop minimums:

```markdown
# Water Monitoring.docx — merge tags

Regenerate with `npm run tag-templates` from `originals/Water Monitoring.docx` + `recipes/water.json`.
Loop minimums (rows padded by the mapper): product_lines 1 · permits_extra 0 · abstracted_rows 5 · wwtp_outlets 3 · wwtp_components 2 · sampling_points 2 · parameters 4 · prev_parameters 4 · dp_conditions 5 · photo_rows 0.

## Shared block
| Tag | Meaning |
… (copy the Task 8 table)

## Water block
| Tag | Meaning |
… (copy the Task 9 table)
```

- [ ] **Step 7: Commit**

```bash
git add assets/templates jest.config.js jest.docxStub.js src/features/export
git commit -m "feat(water): tag the Water Monitoring form and prove it against the mapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Tag the Air, EIA, Hazardous Waste Generators and Survey templates (shared block)

**Files:**
- Create: `assets/templates/recipes/air.json`, `eia.json`, `hazwaste.json`, `survey.json`; `assets/templates/<name>.tags.md` ×4
- Modify: `src/features/export/templates/index.ts` (four more entries), `templateContract.test.ts` (four more cases), `renderTemplates.test.ts` (render each with `mapBundle` of the fixture; assert no tag left)
- Generated: the four tagged `.docx`

**Interfaces:** none new. `TEMPLATES` gains `air_monitoring`, `eia`, `hazardous_waste`, `survey` (labels `Air Monitoring`, `EIA`, `Hazardous Waste Generators`, `Survey`).

- [ ] **Step 1: Air, EIA, Hazwaste recipes**

Run `node scripts/docx-grid.js` on each original. Tables 1–5 are identical to Water's (same cell coordinates → copy the Water recipe's table 1–5 ops and the first 17 `checkboxes` names verbatim). Then per template, from the grid:
- The closing "Other Observations / Remarks / Documents" table (Air: table 9, EIA: table 8, Hazwaste: table 12): `cell` ops for rows 2 and 4 cell 1, `doc_others` on row 6 cell 2, and the 8 `doc_cb_*` names appended to `checkboxes`. **Hazwaste's third box reads `HWMS`, not `OPMS`** — name it `doc_cb_hwms` in that recipe, and add `'HWMS'` handling: in `common.ts` `DOC_ROWS`, append `['hwms', 'HWMS']` so every template's mapper output includes `doc_cb_hwms` (the Water/Air/EIA templates simply don't print it; the contract test only checks tag ⊆ keys in that direction — adjust the "prints every key" assertion to ignore `doc_cb_hwms` and `doc_cb_opms`, documenting why).
- Signatures: the same four `replaceText` ops as Water.
- Photos: Air and Hazwaste have an `ATTACHMENTS` paragraph → same `insertAfterParagraph` op. EIA has none → use `insertAfterParagraph` with `find` = the exact text of the last paragraph before `<w:sectPr>` (read it with `docx-runs.js`), or, if that paragraph is empty, add a `"find": ""` special case to the script that targets the last body paragraph. Prefer adding an `ATTACHMENTS` heading paragraph in the inserted XML before the table so the page reads like the others.
- Every checkbox *not* in the shared block (all the type-specific checklists) still has to be named, because `checkboxes` must name every glyph. Name them `unused_1`, `unused_2`, … in document order. They must also be *filled*, or `nullGetter` would print `''` and erase the box: add `UNUSED_CHECKBOXES = { air_monitoring: N, eia: N, hazardous_waste: N }` to `templates/index.ts` (N counted from each recipe) and, in `mappers/index.ts`, spread `unusedBoxes(UNUSED_CHECKBOXES[reportType])` → `{ unused_1: UNTICKED, … }` into the `mapCommon` result for those three types. The contract test then passes without exceptions and the printed form keeps its empty boxes.

- [ ] **Step 2: Survey recipe**

The Survey form is one 28-row table plus a signature table. Legacy `__` blanks precede each option and are separate `<w:t>__</w:t>` runs; the normaliser has already removed the `FORMCHECKBOX` fields. With `node scripts/docx-runs.js "assets/templates/originals/Survey.docx" "__"` list the exact occurrence numbers, then:

```json
{
  "original": "Survey.docx",
  "output": "Survey.docx",
  "checkboxes": [],
  "ops": [
    { "op": "replaceText", "find": "Report Control Number __________", "with": "Report Control Number {survey_report_control_no}", "nth": 1 },
    { "op": "replaceText", "find": "Date of Inspection: ____________", "with": "Date of Inspection: {survey_inspection_date}", "nth": 1 },
    { "op": "replaceText", "find": "Project Name:", "with": "Project Name: {survey_project_name}", "nth": 1 },
    { "op": "replaceText", "find": "Reference Code:", "with": "Reference Code: {survey_reference_code}", "nth": 1 },
    { "op": "replaceText", "find": "Date:", "with": "Date: {survey_date}", "nth": 1 },
    { "op": "replaceText", "find": "Proponent Name:", "with": "Proponent Name: {survey_proponent_name}", "nth": 1 },
    { "op": "replaceText", "find": "Contact Person:", "with": "Contact Person: {survey_contact_person}", "nth": 1 },
    { "op": "replaceText", "find": "Position:", "with": "Position: {survey_contact_position}", "nth": 1 },
    { "op": "replaceText", "find": "Contact No.:", "with": "Contact No.: {survey_contact_number}", "nth": 1 },
    { "op": "replaceText", "find": "Email Address:", "with": "Email Address: {survey_email}", "nth": 1 },
    { "op": "replaceText", "find": "Project Location:", "with": "Project Location: {survey_project_location}", "nth": 1 },
    { "op": "replaceText", "find": "Geo Coordinates:", "with": "Geo Coordinates: {survey_geo}", "nth": 1 },
    { "op": "replaceText", "find": "Area Size:", "with": "Area Size: {survey_area_size}", "nth": 1 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_purpose_ecc_application}", "nth": 1 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_purpose_ecc_amendment}", "nth": 2 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_doc_iee}", "nth": 3 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_doc_eis}", "nth": 4 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_doc_eprmp}", "nth": 5 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_doc_peis}", "nth": 6 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_doc_permp}", "nth": 7 },
    { "op": "replaceText", "find": "Others: ________________________________________________________________________________", "with": "{cb_survey_doc_others} Others: {survey_doc_others}", "nth": 1 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_status_baseline}", "nth": 8 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_status_preconstruction}", "nth": 9 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_status_construction}", "nth": 10 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_status_operation}", "nth": 11 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_status_suspended}", "nth": 12 },
    { "op": "replaceText", "find": "__", "with": "{cb_survey_status_abandoned}", "nth": 13 },
    { "op": "replaceText", "find": "Other Findings and Observations:", "with": "Other Findings and Observations: {survey_other_findings}", "nth": 1 },
    { "op": "replaceText", "find": "Remarks and Recommendation:", "with": "Remarks and Recommendation: {survey_remarks_recommendations}", "nth": 1 },
    { "op": "replaceText", "find": "NAME OF INSPECTOR", "with": "{sig_inspector_name}", "nth": 1 },
    { "op": "replaceText", "find": "Position/Designation of Inspector", "with": "{sig_inspector_position}", "nth": 1 },
    { "op": "replaceText", "find": "NAME OF IMMEDIATE SUPERVISOR", "with": "{sig_supervisor_name}", "nth": 1 },
    { "op": "replaceText", "find": "Position/Designation of Immediate Supervisor", "with": "{sig_supervisor_position}", "nth": 1 }
  ]
}
```

The exact `find` strings and `nth` values above are the expected ones from the text dump; `docx-runs.js` is the authority — every `find` must match a whole `<w:t>` exactly, and the script says so when it doesn't. Where a label and its blank are split differently (e.g. `"Date:"` may be `" Date:"`), copy the run text verbatim from `docx-runs.js`. Add the photo table after the signature table with `insertAfterParagraph` on the last paragraph, preceded by an `ATTACHMENTS` heading paragraph in the inserted XML.

- [ ] **Step 3: Registry, tests, tags.md**

Add the four entries to `TEMPLATES` and the four `cases` to the contract test (`['Air Monitoring.docx', mapBundle({ ...fullWaterBundle(), report: { ...fullWaterBundle().report, reportType: 'air_monitoring' }, compliance: { kind: 'none' } }, ctx)]` etc., `['Survey.docx', mapBundle(fullSurveyBundle(), ctx)]`). Add a render case per template in `renderTemplates.test.ts` asserting no tag survives and one known value appears. Write each `.tags.md` (shared table + a line saying the type-specific sections are untagged pending its form; Survey lists its own table from Task 10).

Run: `npm run tag-templates && npx jest src/features/export && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit (one per template)**

```bash
git add assets/templates/recipes/air.json "assets/templates/Air Monitoring.docx" "assets/templates/Air Monitoring.tags.md"
git commit -m "feat(air): tag the shared sections of the Air Monitoring form

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Repeat for `eia` (`feat(eia): …`), `hazwaste` (`feat(hazwaste): …`), `survey` (`feat(survey): …`), then the registry/tests/mapper changes as `feat(reports): register every tagged template and prove them against their mappers`.

---

### Task 14: Signatory provider and output file names

**Files:**
- Create: `src/features/export/signatories.ts`, `src/features/export/signatories.test.ts`, `src/features/export/fileNames.ts`, `src/features/export/fileNames.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SignatoryProvider { load(): Promise<Signatories | null>; save(s: Signatories): Promise<void> }
  export const SIGNATORIES_STORAGE_KEY = 'export.signatories';
  export const asyncStorageSignatoryProvider: SignatoryProvider;
  export function emptySignatories(inspectorName?: string | null): Signatories;

  export function slugify(s: string): string;                       // "Alpha Water Refilling" → "Alpha-Water-Refilling"
  export function docxFileName(label: string, establishment: string, inspectionDate: string): string;
  export function zipFileName(now: Date): string;                    // InspectPlus-exports-YYYYMMDD-HHmm.zip
  export function uniqueFileNames(names: string[]): string[];        // second "X.docx" → "X (2).docx"
  ```

- [ ] **Step 1: Write the failing tests**

`src/features/export/signatories.test.ts`:

```ts
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
```

`src/features/export/fileNames.test.ts`:

```ts
import { docxFileName, slugify, uniqueFileNames, zipFileName } from './fileNames';

describe('fileNames', () => {
  it('slugifies to file-safe ASCII', () => {
    expect(slugify('Alpha Water Refilling & Ice, Inc.')).toBe('Alpha-Water-Refilling-Ice-Inc');
    expect(slugify('  Ñandú / Café ')).toBe('Nandu-Cafe');
    expect(slugify('')).toBe('report');
  });
  it('names a docx by type, establishment and date', () => {
    expect(docxFileName('Water Monitoring', 'Alpha Water', '2026-09-05')).toBe('Water-Monitoring-Alpha-Water-2026-09-05.docx');
    expect(docxFileName('Water Monitoring', 'Alpha', '')).toBe('Water-Monitoring-Alpha-undated.docx');
  });
  it('names the zip by local time', () => {
    expect(zipFileName(new Date(2026, 8, 5, 14, 7))).toBe('InspectPlus-exports-20260905-1407.zip');
  });
  it('disambiguates duplicates', () => {
    expect(uniqueFileNames(['a.docx', 'b.docx', 'a.docx', 'a.docx'])).toEqual(['a.docx', 'b.docx', 'a (2).docx', 'a (3).docx']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/export/signatories.test.ts src/features/export/fileNames.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

`signatories.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Signatories } from './types';

// Who signs the exported form. Today the inspector types this once and the
// device remembers it; the planned admin-defined chain of command replaces
// this provider with one that reads a synced profile — the sheet, the
// mappers and the templates don't change.
export interface SignatoryProvider {
  load(): Promise<Signatories | null>;
  save(signatories: Signatories): Promise<void>;
}

export const SIGNATORIES_STORAGE_KEY = 'export.signatories';

export function emptySignatories(inspectorName?: string | null): Signatories {
  return { inspectorName: inspectorName ?? '', inspectorPosition: '', supervisorName: '', supervisorPosition: '' };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export const asyncStorageSignatoryProvider: SignatoryProvider = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(SIGNATORIES_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        inspectorName: str(parsed.inspectorName),
        inspectorPosition: str(parsed.inspectorPosition),
        supervisorName: str(parsed.supervisorName),
        supervisorPosition: str(parsed.supervisorPosition),
      };
    } catch {
      return null;
    }
  },
  async save(signatories) {
    await AsyncStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify(signatories));
  },
};
```

`fileNames.ts`:

```ts
// Names for what the share sheet receives. ASCII-only so every mail client
// and file manager the inspector might pick shows the same name.
export function slugify(s: string): string {
  const ascii = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const slug = ascii.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'report';
}

export function docxFileName(label: string, establishment: string, inspectionDate: string): string {
  const date = /^\d{4}-\d{2}-\d{2}/.exec(inspectionDate)?.[0] ?? 'undated';
  return `${slugify(label)}-${slugify(establishment)}-${date}.docx`;
}

const two = (n: number) => String(n).padStart(2, '0');

export function zipFileName(now: Date): string {
  return `InspectPlus-exports-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.zip`;
}

export function uniqueFileNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map(name => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot < 0 ? `${name} (${n})` : `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
  });
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx jest src/features/export/signatories.test.ts src/features/export/fileNames.test.ts && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/export/signatories.ts src/features/export/signatories.test.ts src/features/export/fileNames.ts src/features/export/fileNames.test.ts
git commit -m "feat(reports): remember who signs an export and name the output files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Photo preparation and the export orchestrator

**Files:**
- Create: `src/features/export/photos.ts`, `src/features/export/exportReports.ts`, `src/features/export/exportReports.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // photos.ts (device-only, not unit-tested — exercised by the QA checklist)
  export const MAX_PHOTO_EDGE = 1600;
  export async function preparePhoto(photo: ExportPhoto): Promise<ImageInput | null>;   // null = not available

  // exportReports.ts
  export interface ExportPorts {
    loadBundle(item: ExportItem): Promise<ReportBundle>;
    loadTemplate(entry: TemplateEntry): Promise<Uint8Array>;
    preparePhoto(photo: ExportPhoto): Promise<ImageInput | null>;
    render(template: Uint8Array, data: TemplateData, images: ImageInput[]): Uint8Array;
    files: {
      resetExportDir(): Promise<string>;                       // returns the dir uri, emptied
      write(dir: string, name: string, bytes: Uint8Array): Promise<string>;  // returns file uri
    };
    zip(entries: { name: string; bytes: Uint8Array }[]): Uint8Array;
    share(uri: string, mimeType: string): Promise<void>;
    now(): Date;
  }
  export interface ExportItem { key: string; kind: 'inspection' | 'survey'; reportId: string; reportType: string; title: string; estabName: string; date: string }
  export interface ExportProgress { index: number; total: number; title: string }
  export interface ExportOptions {
    signatories: Signatories;
    onProgress?: (p: ExportProgress) => void;
    isCancelled?: () => boolean;
  }
  export async function exportReports(items: ExportItem[], options: ExportOptions, ports: ExportPorts): Promise<ExportResult>;
  export const deviceExportPorts: ExportPorts;   // the real implementation
  export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  export const ZIP_MIME = 'application/zip';
  ```

Behaviour: reset the export dir; for each item in order (stop before the next one when `isCancelled()`): `onProgress`, load bundle → `mapBundle` → prepare each photo (null → counted in `skippedPhotos`) → render → `write`. A failure at any step records `{ key, title, reason }` and continues. After the loop: 0 successes → `shareUri: null`; 1 → share that `.docx`; >1 → write the zip and share it. Files rendered but not shared are never left behind for a later run (the next run resets the dir).

- [ ] **Step 1: Write the failing test**

`src/features/export/exportReports.test.ts`:

```ts
import { exportReports, ExportPorts, ExportItem } from './exportReports';
import { RenderError } from './render/renderDocx';
import { fullWaterBundle, signatories } from './mappers/fixtures';

jest.mock('./templates', () => ({
  templateFor: (kind: string, type: string) => (type === 'water_monitoring' || kind === 'survey' ? { label: type === 'water_monitoring' ? 'Water Monitoring' : 'Survey', file: 'x', module: 0 } : null),
}));

const item = (key: string, extra: Partial<ExportItem> = {}): ExportItem => ({
  key, kind: 'inspection', reportId: key, reportType: 'water_monitoring', title: 'Water Monitoring',
  estabName: 'Alpha Water', date: '2026-09-05', ...extra,
});

function makePorts(overrides: Partial<ExportPorts> = {}) {
  const written: { dir: string; name: string; bytes: Uint8Array }[] = [];
  const shared: { uri: string; mime: string }[] = [];
  const ports: ExportPorts = {
    loadBundle: jest.fn(async () => fullWaterBundle()),
    loadTemplate: jest.fn(async () => new Uint8Array([1])),
    preparePhoto: jest.fn(async photo => (photo.localUri ? { id: photo.attachmentId, bytes: new Uint8Array([2]), mime: 'image/jpeg', width: 4, height: 3 } : null)),
    render: jest.fn(() => new Uint8Array([3])),
    files: {
      resetExportDir: jest.fn(async () => 'file:///cache/exports'),
      write: jest.fn(async (dir, name, bytes) => { written.push({ dir, name, bytes }); return `${dir}/${name}`; }),
    },
    zip: jest.fn(() => new Uint8Array([4])),
    share: jest.fn(async (uri, mime) => { shared.push({ uri, mime }); }),
    now: () => new Date(2026, 8, 5, 14, 7),
    ...overrides,
  };
  return { ports, written, shared };
}

describe('exportReports', () => {
  it('renders one report, writes it and shares the docx', async () => {
    const { ports, written, shared } = makePorts();
    const progress: unknown[] = [];
    const result = await exportReports([item('r1')], { signatories, onProgress: p => progress.push(p) }, ports);
    expect(ports.files.resetExportDir).toHaveBeenCalledTimes(1);
    expect(written.map(w => w.name)).toEqual(['Water-Monitoring-Alpha-Water-2026-09-05.docx']);
    expect(shared).toEqual([{ uri: 'file:///cache/exports/Water-Monitoring-Alpha-Water-2026-09-05.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }]);
    expect(result).toEqual({ shareUri: shared[0].uri, succeeded: 1, failures: [], skippedPhotos: 1, cancelled: false });
    expect(progress).toEqual([{ index: 1, total: 1, title: 'Alpha Water' }]);
    expect(ports.render).toHaveBeenCalledWith(new Uint8Array([1]), expect.objectContaining({ gi_establishment_name: expect.stringContaining('Alpha') }), [expect.objectContaining({ id: 'a1' })]);
  });

  it('zips several and disambiguates duplicate names', async () => {
    const { ports, written, shared } = makePorts();
    const result = await exportReports([item('r1'), item('r2'), item('r3', { estabName: 'Beta' })], { signatories }, ports);
    expect(written.map(w => w.name)).toEqual([
      'Water-Monitoring-Alpha-Water-2026-09-05.docx',
      'Water-Monitoring-Alpha-Water-2026-09-05 (2).docx',
      'Water-Monitoring-Beta-2026-09-05.docx',
      'InspectPlus-exports-20260905-1407.zip',
    ]);
    expect(ports.zip).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ name: 'Water-Monitoring-Beta-2026-09-05.docx' })]));
    expect(shared[0]).toEqual({ uri: 'file:///cache/exports/InspectPlus-exports-20260905-1407.zip', mime: 'application/zip' });
    expect(result.succeeded).toBe(3);
  });

  it('records a failure and carries on with the rest', async () => {
    const { ports, shared } = makePorts({
      render: jest.fn((_t, data) => {
        if ((data as { report_control_no: string }).report_control_no === 'WQ-2026-001' && (ports.render as jest.Mock).mock.calls.length === 1) throw new RenderError('bad tag', ['wwtp_outlets']);
        return new Uint8Array([3]);
      }),
    });
    const result = await exportReports([item('r1'), item('r2')], { signatories }, ports);
    expect(result.succeeded).toBe(1);
    expect(result.failures).toEqual([{ key: 'r1', title: 'Water Monitoring — Alpha Water', reason: 'bad tag' }]);
    expect(shared).toHaveLength(1);
    expect(shared[0].mime).toContain('wordprocessingml');
  });

  it('reports a missing template as a failure without loading the bundle', async () => {
    const { ports } = makePorts();
    const result = await exportReports([item('r1', { reportType: 'hazwaste_tsd', title: 'Hazwaste TSD' })], { signatories }, ports);
    expect(ports.loadBundle).not.toHaveBeenCalled();
    expect(result.failures[0].reason).toMatch(/no template/i);
    expect(result.shareUri).toBeNull();
  });

  it('stops after the current report when cancelled, sharing what finished', async () => {
    let cancelled = false;
    const { ports, shared } = makePorts({
      render: jest.fn(() => { cancelled = true; return new Uint8Array([3]); }),
    });
    const result = await exportReports([item('r1'), item('r2')], { signatories, isCancelled: () => cancelled }, ports);
    expect(ports.render).toHaveBeenCalledTimes(1);
    expect(result.cancelled).toBe(true);
    expect(result.succeeded).toBe(1);
    expect(shared).toHaveLength(1);
  });

  it('shares nothing when everything failed', async () => {
    const { ports, shared } = makePorts({ loadBundle: jest.fn(async () => { throw new Error('Report not found'); }) });
    const result = await exportReports([item('r1')], { signatories }, ports);
    expect(shared).toEqual([]);
    expect(result).toMatchObject({ shareUri: null, succeeded: 0, failures: [{ key: 'r1', reason: 'Report not found' }] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/export/exportReports.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `photos.ts`**

```ts
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { resolveLocalFileUri } from '../attachments/attachmentActions';
import type { Attachment } from '../../db/models/Attachment';
import type { ExportPhoto, ImageInput } from './types';

// A camera photo can be 4–6 MB; twenty of them would make a 100 MB .docx
// that no mail client will take. Long edge capped at 1600 px, JPEG 0.8 —
// still legible on an A4 print at the 3-inch box the form gives it.
export const MAX_PHOTO_EDGE = 1600;

// Best effort: the local file if the phone took the photo, else a download
// (resolveLocalFileUri already applies the network timeout). Null when
// neither works — the form prints "<file> (not downloaded)" instead.
export async function preparePhoto(photo: ExportPhoto): Promise<ImageInput | null> {
  let uri: string;
  try {
    // resolveLocalFileUri reads only these fields off the model.
    uri = await resolveLocalFileUri({
      attachmentId: photo.attachmentId,
      localUri: photo.localUri,
      storagePath: photo.storagePath,
    } as unknown as Attachment);
  } catch {
    return null;
  }
  try {
    const context = ImageManipulator.manipulate(uri);
    const original = await context.renderAsync();
    const longest = Math.max(original.width, original.height);
    if (longest > MAX_PHOTO_EDGE) {
      const scale = MAX_PHOTO_EDGE / longest;
      context.resize({ width: Math.round(original.width * scale), height: Math.round(original.height * scale) });
    }
    const saved = await (await context.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    const bytes = await new File(saved.uri).bytes();
    return { id: photo.attachmentId, bytes, mime: 'image/jpeg', width: saved.width, height: saved.height };
  } catch {
    return null;
  }
}
```

If `resolveLocalFileUri`'s parameter type makes the cast ugly, change its signature in `attachmentActions.ts` to `Pick<Attachment, 'attachmentId' | 'localUri' | 'storagePath'>` — it only reads those three.

- [ ] **Step 4: Write `exportReports.ts`**

```ts
import PizZip from 'pizzip';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { loadReportBundle, Viewer } from './loadReportBundle';
import { mapBundle } from './mappers';
import { renderDocx } from './render/renderDocx';
import { preparePhoto } from './photos';
import { templateFor, TemplateEntry } from './templates';
import { docxFileName, uniqueFileNames, zipFileName } from './fileNames';
import type { ExportFailure, ExportPhoto, ExportResult, ImageInput, ReportBundle, Signatories, TemplateData } from './types';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const ZIP_MIME = 'application/zip';
const EXPORT_DIR = 'exports';

export interface ExportItem {
  key: string;
  kind: 'inspection' | 'survey';
  reportId: string;
  reportType: string;
  title: string;
  estabName: string;
  date: string;
}

export interface ExportProgress {
  index: number;
  total: number;
  title: string;
}

export interface ExportOptions {
  signatories: Signatories;
  onProgress?: (progress: ExportProgress) => void;
  isCancelled?: () => boolean;
}

// Everything that touches the device, behind an interface so the sequencing
// rules below are unit-tested with fakes. deviceExportPorts is the real one.
export interface ExportPorts {
  loadBundle(item: ExportItem): Promise<ReportBundle>;
  loadTemplate(entry: TemplateEntry): Promise<Uint8Array>;
  preparePhoto(photo: ExportPhoto): Promise<ImageInput | null>;
  render(template: Uint8Array, data: TemplateData, images: ImageInput[]): Uint8Array;
  files: {
    resetExportDir(): Promise<string>;
    write(dir: string, name: string, bytes: Uint8Array): Promise<string>;
  };
  zip(entries: { name: string; bytes: Uint8Array }[]): Uint8Array;
  share(uri: string, mimeType: string): Promise<void>;
  now(): Date;
}

const reason = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Unknown error');

export async function exportReports(items: ExportItem[], options: ExportOptions, ports: ExportPorts): Promise<ExportResult> {
  const dir = await ports.files.resetExportDir();
  const rendered: { name: string; bytes: Uint8Array }[] = [];
  const failures: ExportFailure[] = [];
  let skippedPhotos = 0;
  let cancelled = false;

  const names = uniqueFileNames(items.map(i => docxFileName(templateFor(i.kind, i.reportType)?.label ?? i.title, i.estabName, i.date)));

  for (let i = 0; i < items.length; i += 1) {
    if (options.isCancelled?.()) {
      cancelled = true;
      break;
    }
    const item = items[i];
    options.onProgress?.({ index: i + 1, total: items.length, title: item.estabName });
    try {
      const entry = templateFor(item.kind, item.reportType);
      if (!entry) throw new Error(`No template for ${item.title} yet`);
      const [template, bundle] = await Promise.all([ports.loadTemplate(entry), ports.loadBundle(item)]);
      const data = mapBundle(bundle, { signatories: options.signatories });
      const images: ImageInput[] = [];
      for (const photo of bundle.photos) {
        const image = await ports.preparePhoto(photo);
        if (image) images.push(image);
        else skippedPhotos += 1;
      }
      rendered.push({ name: names[i], bytes: ports.render(template, data, images) });
    } catch (e) {
      failures.push({ key: item.key, title: `${item.title} — ${item.estabName}`, reason: reason(e) });
    }
  }

  let shareUri: string | null = null;
  if (rendered.length === 1) {
    shareUri = await ports.files.write(dir, rendered[0].name, rendered[0].bytes);
    await ports.share(shareUri, DOCX_MIME);
  } else if (rendered.length > 1) {
    for (const file of rendered) await ports.files.write(dir, file.name, file.bytes);
    shareUri = await ports.files.write(dir, zipFileName(ports.now()), ports.zip(rendered));
    await ports.share(shareUri, ZIP_MIME);
  }

  return { shareUri, succeeded: rendered.length, failures, skippedPhotos, cancelled };
}

// ── The real ports ──────────────────────────────────────────────────────────

export function deviceExportPorts(viewer: Viewer): ExportPorts {
  return {
    loadBundle: item => loadReportBundle(item, viewer),
    async loadTemplate(entry) {
      const asset = Asset.fromModule(entry.module);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`Template ${entry.file} could not be loaded`);
      return new File(asset.localUri).bytes();
    },
    preparePhoto,
    render: renderDocx,
    files: {
      async resetExportDir() {
        const dir = new Directory(Paths.cache, EXPORT_DIR);
        if (dir.exists) dir.delete();
        dir.create();
        return dir.uri;
      },
      async write(dirUri, name, bytes) {
        const file = new File(dirUri, name);
        file.create();
        file.write(bytes);
        return file.uri;
      },
    },
    zip(entries) {
      const zip = new PizZip();
      for (const e of entries) zip.file(e.name, e.bytes, { compression: 'STORE' });
      return zip.generate({ type: 'uint8array' });
    },
    async share(uri, mimeType) {
      await Sharing.shareAsync(uri, { mimeType, UTI: mimeType === ZIP_MIME ? 'public.zip-archive' : 'org.openxmlformats.wordprocessingml.document' });
    },
    now: () => new Date(),
  };
}
```

`.docx` bytes are already deflated, so the zip stores them (`STORE`) rather than deflating twice.

- [ ] **Step 5: Run tests, typecheck, lint**

Run: `npx jest src/features/export/exportReports.test.ts && npm run typecheck && npm run lint`
Expected: PASS. `photos.ts` and `deviceExportPorts` compile but aren't unit-tested; the Task 18 QA checklist covers them.

- [ ] **Step 6: Commit**

```bash
git add src/features/export/photos.ts src/features/export/exportReports.ts src/features/export/exportReports.test.ts src/features/attachments/attachmentActions.ts
git commit -m "feat(reports): render, zip and share the selected reports in sequence

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: `useExportReports` hook, `SignatorySheet`, `ExportProgressBar`

**Files:**
- Create: `src/features/export/hooks/useExportReports.ts`, `src/features/export/hooks/useExportReports.test.tsx`, `src/features/export/components/SignatorySheet.tsx`, `src/features/export/components/SignatorySheet.test.tsx`, `src/features/export/components/ExportProgressBar.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type ExportPhase =
    | { status: 'idle' }
    | { status: 'running'; progress: ExportProgress }
    | { status: 'done'; result: ExportResult }
    | { status: 'error'; message: string };
  export function useExportReports(): {
    phase: ExportPhase;
    start(items: ExportItem[], signatories: Signatories): Promise<void>;
    cancel(): void;
    reset(): void;
  }
  export const SignatorySheet: React.FC<{ visible: boolean; initial: Signatories; onCancel(): void; onConfirm(s: Signatories): void }>;
  export const ExportProgressBar: React.FC<{ phase: ExportPhase; onCancel(): void; onRetry(): void; onDismiss(): void }>;
  ```

- [ ] **Step 1: Write the failing tests**

`src/features/export/hooks/useExportReports.test.tsx`:

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useExportReports } from './useExportReports';
import type { ExportItem } from '../exportReports';

const mockExport = jest.fn();
jest.mock('../exportReports', () => ({
  exportReports: (...args: unknown[]) => mockExport(...args),
  deviceExportPorts: () => ({}),
}));
jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ session: { user: { id: 'u1' } }, province: 'P', role: 'Inspector' }),
}));

const signatories = { inspectorName: 'A', inspectorPosition: 'B', supervisorName: 'C', supervisorPosition: 'D' };
const item: ExportItem = { key: 'k', kind: 'inspection', reportId: 'r1', reportType: 'water_monitoring', title: 'Water', estabName: 'Alpha', date: '2026-09-05' };

function Harness({ onReady }: { onReady: (h: ReturnType<typeof useExportReports>) => void }) {
  onReady(useExportReports());
  return null;
}

function mount() {
  let hook!: ReturnType<typeof useExportReports>;
  act(() => { TestRenderer.create(<Harness onReady={h => { hook = h; }} />); });
  return () => hook;
}

describe('useExportReports', () => {
  beforeEach(() => mockExport.mockReset());

  it('moves idle → running → done and forwards progress', async () => {
    const get = mount();
    expect(get().phase).toEqual({ status: 'idle' });
    let resolve!: (r: unknown) => void;
    mockExport.mockImplementation((_items, options) => {
      options.onProgress({ index: 1, total: 2, title: 'Alpha' });
      return new Promise(r => { resolve = r; });
    });
    let run!: Promise<void>;
    act(() => { run = get().start([item], signatories); });
    expect(get().phase).toEqual({ status: 'running', progress: { index: 1, total: 2, title: 'Alpha' } });
    await act(async () => { resolve({ shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false }); await run; });
    expect(get().phase).toEqual({ status: 'done', result: { shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 0, cancelled: false } });
  });

  it('passes the viewer and a cancel flag to the orchestrator', async () => {
    const get = mount();
    mockExport.mockImplementation(async (_items, options) => {
      expect(options.isCancelled()).toBe(false);
      get().cancel();
      expect(options.isCancelled()).toBe(true);
      return { shareUri: null, succeeded: 0, failures: [], skippedPhotos: 0, cancelled: true };
    });
    await act(async () => { await get().start([item], signatories); });
    expect(get().phase).toMatchObject({ status: 'done', result: { cancelled: true } });
  });

  it('turns a thrown error into the error phase and reset clears it', async () => {
    const get = mount();
    mockExport.mockRejectedValue(new Error('disk full'));
    await act(async () => { await get().start([item], signatories); });
    expect(get().phase).toEqual({ status: 'error', message: 'disk full' });
    act(() => get().reset());
    expect(get().phase).toEqual({ status: 'idle' });
  });
});
```

`src/features/export/components/SignatorySheet.test.tsx`:

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextField } from '../../../components/form';
import { Button } from '../../../components/Button';
import { SignatorySheet } from './SignatorySheet';

jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
jest.mock('react-native-reanimated', () => ({ ...jest.requireActual('react-native-reanimated'), useReducedMotion: () => false }));

const initial = { inspectorName: 'Juan', inspectorPosition: '', supervisorName: '', supervisorPosition: '' };

describe('SignatorySheet', () => {
  it('prefills from initial and confirms the edited values', () => {
    const onConfirm = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={onConfirm} />); });
    const fields = r.root.findAllByType(TextField);
    expect(fields.map(f => f.props.label)).toEqual(['Inspector name', 'Inspector position/designation', 'Immediate supervisor name', 'Supervisor position/designation']);
    expect(fields[0].props.value).toBe('Juan');
    act(() => fields[1].props.onChangeText('Engineer II'));
    act(() => fields[2].props.onChangeText('Maria'));
    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    act(() => generate.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith({ inspectorName: 'Juan', inspectorPosition: 'Engineer II', supervisorName: 'Maria', supervisorPosition: '' });
  });

  it('disables Generate until the inspector name is filled', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={{ ...initial, inspectorName: '' }} onCancel={() => {}} onConfirm={() => {}} />); });
    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    expect(generate.props.disabled).toBe(true);
    act(() => r.root.findAllByType(TextField)[0].props.onChangeText('X'));
    expect(r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!.props.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/export/hooks src/features/export/components`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the hook**

`useExportReports.ts`:

```ts
import { useCallback, useRef, useState } from 'react';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { deviceExportPorts, exportReports, ExportItem, ExportProgress } from '../exportReports';
import type { ExportResult, Signatories } from '../types';

export type ExportPhase =
  | { status: 'idle' }
  | { status: 'running'; progress: ExportProgress }
  | { status: 'done'; result: ExportResult }
  | { status: 'error'; message: string };

// The tab's view of an export run. One run at a time; cancel is a flag the
// orchestrator polls between reports, so the current one always finishes.
export function useExportReports() {
  const [phase, setPhase] = useState<ExportPhase>({ status: 'idle' });
  const cancelled = useRef(false);
  const { session, province, role } = useAuthContext();
  const uid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';

  const start = useCallback(
    async (items: ExportItem[], signatories: Signatories) => {
      cancelled.current = false;
      setPhase({ status: 'running', progress: { index: 0, total: items.length, title: '' } });
      try {
        const result = await exportReports(
          items,
          {
            signatories,
            onProgress: progress => setPhase({ status: 'running', progress }),
            isCancelled: () => cancelled.current,
          },
          deviceExportPorts({ uid, province: province ?? '', role: role ?? '' }),
        );
        setPhase({ status: 'done', result });
      } catch (e) {
        setPhase({ status: 'error', message: e instanceof Error && e.message ? e.message : 'Export failed' });
      }
    },
    [uid, province, role],
  );

  const cancel = useCallback(() => { cancelled.current = true; }, []);
  const reset = useCallback(() => setPhase({ status: 'idle' }), []);

  return { phase, start, cancel, reset };
}
```

- [ ] **Step 4: Write the sheet and the progress bar**

`SignatorySheet.tsx` — same shell as `ReportFilterSheet` (Modal, overlay, keyboard-aware sheet, header with a close icon), body:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Keyboard, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { TextField } from '../../../components/form';
import { Button } from '../../../components/Button';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import type { Signatories } from '../types';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface SignatorySheetProps {
  visible: boolean;
  initial: Signatories;
  onCancel: () => void;
  onConfirm: (signatories: Signatories) => void;
}

// Asked before every export and remembered, so the second time it's a
// glance and a tap. Positions and the supervisor are free text until the
// admin-defined chain of command exists — see signatories.ts.
export const SignatorySheet: React.FC<SignatorySheetProps> = ({ visible, initial, onCancel, onConfirm }) => {
  const [value, setValue] = useState<Signatories>(initial);
  useEffect(() => { if (visible) setValue(initial); }, [visible, initial]);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const overlayStyle = useAnimatedStyle(() => ({ paddingBottom: -keyboardHeight.value }));
  const set = (key: keyof Signatories) => (text: string) => setValue(v => ({ ...v, [key]: text }));
  const canGenerate = value.inspectorName.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <AnimatedTouchableOpacity
        style={[styles.overlay, overlayStyle]}
        activeOpacity={1}
        onPress={() => (Keyboard.isVisible() ? Keyboard.dismiss() : onCancel())}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Who signs this report?</Text>
            <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <TextField label="Inspector name" value={value.inspectorName} onChangeText={set('inspectorName')} required style={styles.field} />
          <TextField label="Inspector position/designation" value={value.inspectorPosition} onChangeText={set('inspectorPosition')} style={styles.field} />
          <TextField label="Immediate supervisor name" value={value.supervisorName} onChangeText={set('supervisorName')} style={styles.field} />
          <TextField label="Supervisor position/designation" value={value.supervisorPosition} onChangeText={set('supervisorPosition')} style={styles.field} />
          <Text style={styles.hint}>The approvers printed on the form stay as they are. These details are remembered on this phone.</Text>
          <Button label="Generate" onPress={() => onConfirm({
            inspectorName: value.inspectorName.trim(),
            inspectorPosition: value.inspectorPosition.trim(),
            supervisorName: value.supervisorName.trim(),
            supervisorPosition: value.supervisorPosition.trim(),
          })} variant="primary" size="md" fullWidth disabled={!canGenerate} />
        </TouchableOpacity>
      </AnimatedTouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  title: { fontSize: Type.subheading.fontSize, lineHeight: Type.subheading.lineHeight, fontWeight: '700', color: Colors.navy },
  field: { flex: undefined },
  hint: { fontSize: Type.caption.fontSize, lineHeight: Type.caption.lineHeight, color: Colors.textMuted, marginBottom: Spacing.md },
});
```

`ExportProgressBar.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import type { ExportPhase } from '../hooks/useExportReports';

interface ExportProgressBarProps {
  phase: ExportPhase;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

// Replaces the selection bar while an export runs and until its outcome is
// dismissed. Registered through useScreenFooter by ExportReportsTab.
export const ExportProgressBar: React.FC<ExportProgressBarProps> = ({ phase, onCancel, onRetry, onDismiss }) => {
  if (phase.status === 'running') {
    const { index, total, title } = phase.progress;
    const fraction = total > 0 ? Math.max(0, index - 1) / total : 0;
    return (
      <View style={styles.bar}>
        <Text style={styles.heading}>{index > 0 ? `Generating ${index} of ${total}` : 'Preparing…'}</Text>
        {!!title && <Text style={styles.detail} numberOfLines={1}>{title}</Text>}
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} /></View>
        <Button label="Cancel" onPress={onCancel} variant="outline" size="md" fullWidth />
      </View>
    );
  }
  if (phase.status === 'error') {
    return (
      <View style={styles.bar}>
        <Text style={styles.heading}>Export failed</Text>
        <Text style={styles.detail}>{phase.message}</Text>
        <View style={styles.actions}>
          <Button label="Retry" onPress={onRetry} variant="primary" size="md" style={styles.action} />
          <Button label="Dismiss" onPress={onDismiss} variant="outline" size="md" style={styles.action} />
        </View>
      </View>
    );
  }
  if (phase.status === 'done') {
    const { succeeded, failures, skippedPhotos, cancelled } = phase.result;
    const summary = [
      cancelled ? 'Cancelled — ' : '',
      `${succeeded} ${succeeded === 1 ? 'report' : 'reports'} generated`,
      skippedPhotos > 0 ? `, ${skippedPhotos} ${skippedPhotos === 1 ? 'photo' : 'photos'} not downloaded` : '',
    ].join('');
    return (
      <View style={styles.bar}>
        <Text style={styles.heading}>{summary}</Text>
        {failures.map(f => (
          <Text key={f.key} style={styles.failure}>{`${f.title}: ${f.reason}`}</Text>
        ))}
        <View style={styles.actions}>
          {failures.length > 0 && <Button label="Retry failed" onPress={onRetry} variant="primary" size="md" style={styles.action} />}
          <Button label="Done" onPress={onDismiss} variant="outline" size="md" style={styles.action} />
        </View>
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm, ...Elevation.overlay },
  heading: { fontSize: Type.subheading.fontSize, lineHeight: Type.subheading.lineHeight, fontWeight: '700', color: Colors.textPrimary },
  detail: { fontSize: Type.bodySm.fontSize, lineHeight: Type.bodySm.lineHeight, color: Colors.textMuted },
  failure: { fontSize: Type.caption.fontSize, lineHeight: Type.caption.lineHeight, color: Colors.conflict },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.bgLight, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.accent },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1 },
});
```

Check `Colors.conflict`, `Colors.accent`, `Colors.overlay`, `Elevation.overlay` exist in `src/design/` (they're used by `ReportFilterSheet`/`ExportReportsTab` today); substitute the nearest existing token if a name differs — do not add a new colour.

- [ ] **Step 5: Run tests, typecheck, lint**

Run: `npx jest src/features/export && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/export/hooks src/features/export/components
git commit -m "feat(reports): add the export run hook, signatory sheet and progress bar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Wire the Export tab — untemplated types, Generate → sheet → run → share

**Files:**
- Modify: `src/features/establishments/components/ExportReportsTab.tsx`, `src/features/establishments/components/ExportReportsTab.test.tsx`, `src/features/establishments/components/ReportListCard.tsx`

**Interfaces:**
- Consumes: `hasTemplate`, `useExportReports`, `SignatorySheet`, `ExportProgressBar`, `asyncStorageSignatoryProvider`, `emptySignatories`, `ExportItem`.
- `ReportListCard` gains `selectDisabled?: boolean` and `selectDisabledReason?: string` — when set, the checkbox is rendered dimmed, `onToggleSelect` is not called, and a `Badge` with the reason is shown beside the type chip.

- [ ] **Step 1: Read the current tests and component**

Read `ExportReportsTab.test.tsx` fully — the mocks it sets up (`useReportBrowser`, `ScreenFooterContext`, `FabVisibilityContext`, `AuthProvider`, `useEstablishment`) are the harness the new tests extend. The existing "Generate button renders disabled / stays disabled" tests describe the old behaviour and are replaced below.

- [ ] **Step 2: Write the failing tests** (add to `ExportReportsTab.test.tsx`; delete the two old Generate tests)

Add these module mocks next to the existing ones:

```tsx
const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockReset = jest.fn();
let mockPhase: { status: string; [k: string]: unknown } = { status: 'idle' };
jest.mock('../../export/hooks/useExportReports', () => ({
  useExportReports: () => ({ phase: mockPhase, start: mockStart, cancel: mockCancel, reset: mockReset }),
}));
jest.mock('../../export/templates', () => ({
  hasTemplate: (_kind: string, type: string) => type !== 'hazwaste_tsd',
}));
const mockSignatoryLoad = jest.fn();
const mockSignatorySave = jest.fn();
jest.mock('../../export/signatories', () => ({
  asyncStorageSignatoryProvider: { load: () => mockSignatoryLoad(), save: (s: unknown) => mockSignatorySave(s) },
  emptySignatories: (name: string | null) => ({ inspectorName: name ?? '', inspectorPosition: '', supervisorName: '', supervisorPosition: '' }),
}));
```

Extend the `useAuthContext` mock's return with `fullName: 'Juan Dela Cruz', province: 'P'`.

New tests:

```tsx
import { SignatorySheet } from '../../export/components/SignatorySheet';
import { ExportProgressBar } from '../../export/components/ExportProgressBar';

describe('the Generate flow', () => {
  beforeEach(() => { mockPhase = { status: 'idle' }; mockStart.mockReset(); mockSignatoryLoad.mockResolvedValue(null); });

  it('is enabled once something is selected and opens the signatory sheet', async () => {
    const r = render();
    selectRow(r, 0);
    const generate = renderFooter().root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    expect(generate.props.disabled).toBe(false);
    await act(async () => { generate.props.onPress(); });
    const sheet = r.root.findByType(SignatorySheet);
    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.initial.inspectorName).toBe('Juan Dela Cruz');
  });

  it('prefills the sheet from the saved signatories', async () => {
    mockSignatoryLoad.mockResolvedValue({ inspectorName: 'Saved', inspectorPosition: 'Eng', supervisorName: 'Sup', supervisorPosition: 'Chief' });
    const r = render();
    selectRow(r, 0);
    await act(async () => { renderFooter().root.findAllByType(Button).find(b => b.props.label === 'Generate')!.props.onPress(); });
    expect(r.root.findByType(SignatorySheet).props.initial.inspectorName).toBe('Saved');
  });

  it('confirming the sheet saves the signatories and starts the run with the selected items', async () => {
    const r = render();
    selectRow(r, 0);
    await act(async () => { renderFooter().root.findAllByType(Button).find(b => b.props.label === 'Generate')!.props.onPress(); });
    const s = { inspectorName: 'J', inspectorPosition: 'E', supervisorName: 'M', supervisorPosition: 'C' };
    await act(async () => { r.root.findByType(SignatorySheet).props.onConfirm(s); });
    expect(mockSignatorySave).toHaveBeenCalledWith(s);
    expect(mockStart).toHaveBeenCalledWith(
      [{ key: 'inspection-r1', kind: 'inspection', reportId: 'r1', reportType: 'water_monitoring', title: 'Water Monitoring', estabName: 'Alpha Corp', date: '2026-08-01' }],
      s,
    );
    expect(r.root.findByType(SignatorySheet).props.visible).toBe(false);
  });

  it('shows the progress bar instead of the selection bar while running, and Cancel cancels', () => {
    mockPhase = { status: 'running', progress: { index: 1, total: 2, title: 'Alpha Corp' } };
    const r = render();
    selectRow(r, 0);
    const footer = renderFooter();
    expect(footer.root.findAllByType(ExportProgressBar)).toHaveLength(1);
    expect(footerText()).toContain('Generating 1 of 2');
    act(() => footer.root.findByType(ExportProgressBar).props.onCancel());
    expect(mockCancel).toHaveBeenCalled();
  });

  it('keeps the selection after a run and Done returns to the selection bar', () => {
    mockPhase = { status: 'done', result: { shareUri: 'u', succeeded: 1, failures: [], skippedPhotos: 2, cancelled: false } };
    const r = render();
    selectRow(r, 0);
    expect(footerText()).toContain('1 report generated, 2 photos not downloaded');
    act(() => renderFooter().root.findByType(ExportProgressBar).props.onDismiss());
    expect(mockReset).toHaveBeenCalled();
  });

  it('Retry failed re-runs only the failed reports', async () => {
    mockPhase = { status: 'done', result: { shareUri: null, succeeded: 0, failures: [{ key: 'inspection-r2', title: 'x', reason: 'y' }], skippedPhotos: 0, cancelled: false } };
    const r = render();
    selectRow(r, 0);
    selectRow(r, 1);
    await act(async () => { renderFooter().root.findByType(ExportProgressBar).props.onRetry(); });
    expect(mockStart).toHaveBeenCalledWith([expect.objectContaining({ key: 'inspection-r2' })], expect.anything());
  });
});

describe('a report type with no template', () => {
  const tsd: AllReportItem = { ...mockReports[0], key: 'inspection-r9', reportId: 'r9', reportType: 'hazwaste_tsd', title: 'Hazardous Waste TSD' };

  it('cannot be selected and says why; Select all skips it', () => {
    mockUseReportBrowser.mockImplementation(() => makeBrowserReturn({ reports: [mockReports[0], tsd] }));
    const r = render();
    const card = r.root.find(n => n.type === ReportListCard && (n.props as { item: AllReportItem }).item.key === tsd.key);
    expect(card.props.selectDisabled).toBe(true);
    expect(card.props.selectDisabledReason).toBe('No template yet');
    act(() => { r.root.findByProps({ accessibilityLabel: 'Select all reports' }).props.onPress(); });
    expect(footerText()).toContain('1 selected');
  });
});
```

And in `ReportListCard.test.tsx` add:

```tsx
it('renders a disabled selector with the reason and ignores taps', () => {
  const onToggleSelect = jest.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(<ReportListCard item={item} currentUid="u1" canManageAll={false} onPress={() => {}} onEdit={() => {}} onDelete={() => {}} selectable selectDisabled selectDisabledReason="No template yet" onToggleSelect={onToggleSelect} />); });
  expect(JSON.stringify(r.toJSON())).toContain('No template yet');
  act(() => { r.root.findByProps({ accessibilityLabel: 'Select report' }).props.onPress(); });
  expect(onToggleSelect).not.toHaveBeenCalled();
});
```

(Match `item` and the selector's `accessibilityLabel` to what `ReportListCard.test.tsx` and the component already use; read both first.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/features/establishments/components/ExportReportsTab.test.tsx src/features/establishments/components/ReportListCard.test.tsx`
Expected: FAIL on the new tests (old ones still pass).

- [ ] **Step 4: Implement**

`ReportListCard.tsx`: add the two props; where the selection checkbox is rendered, apply `opacity: 0.4` and `disabled` when `selectDisabled`, guard the press handler (`if (selectDisabled) return;`), and render `<Badge label={selectDisabledReason} tone="neutral" />` next to the existing type chip when `selectDisabledReason` is set.

`ExportReportsTab.tsx` changes:

```tsx
import { useExportReports } from '../../export/hooks/useExportReports';
import { hasTemplate } from '../../export/templates';
import { asyncStorageSignatoryProvider, emptySignatories } from '../../export/signatories';
import { SignatorySheet } from '../../export/components/SignatorySheet';
import { ExportProgressBar } from '../../export/components/ExportProgressBar';
import type { ExportItem } from '../../export/exportReports';
import type { Signatories } from '../../export/types';

const NO_TEMPLATE_REASON = 'No template yet';
const canExport = (item: AllReportItem) => hasTemplate(item.kind, item.reportType);
const toExportItem = (item: AllReportItem): ExportItem => ({
  key: item.key, kind: item.kind, reportId: item.reportId, reportType: item.reportType,
  title: item.title, estabName: item.estabName, date: item.date,
});
```

Inside the component:

```tsx
  const { fullName } = useAuthContext();            // alongside municipalities, session, role
  const exporter = useExportReports();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [signatories, setSignatories] = useState<Signatories>(() => emptySignatories(fullName));
  const exportable = useMemo(() => reports.filter(canExport), [reports]);
  const allSelected = exportable.length > 0 && selectedItems.length === exportable.length;

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(exportable.map(report => report.key)));
  };

  const openSheet = async () => {
    const saved = await asyncStorageSignatoryProvider.load();
    setSignatories(saved ?? emptySignatories(fullName));
    setSheetOpen(true);
  };

  const runExport = async (items: AllReportItem[], s: Signatories) => {
    setSheetOpen(false);
    setSignatories(s);
    await asyncStorageSignatoryProvider.save(s);
    await exporter.start(items.map(toExportItem), s);
  };

  const retryFailed = () => {
    if (exporter.phase.status !== 'done' && exporter.phase.status !== 'error') return;
    const failedKeys = exporter.phase.status === 'done' ? new Set(exporter.phase.result.failures.map(f => f.key)) : null;
    const items = failedKeys ? selectedItems.filter(i => failedKeys.has(i.key)) : selectedItems;
    void runExport(items, signatories);
  };

  const busy = exporter.phase.status !== 'idle';
```

The footer factory: when `exporter.phase.status !== 'idle'` render `<ExportProgressBar phase={exporter.phase} onCancel={exporter.cancel} onRetry={retryFailed} onDismiss={exporter.reset} />`; otherwise the existing selection bar with `Generate` now `onPress={() => { void openSheet(); }}`, `disabled={selectedItems.length === 0}`, and the "Document generation arrives in a future release." text removed. Deps: `[selectedItems, draftCount, exporter.phase, signatories]`.

Cards: pass `selectDisabled={!canExport(item)}`, `selectDisabledReason={canExport(item) ? undefined : NO_TEMPLATE_REASON}`; while `busy`, also pass `selectDisabled` so the selection can't change mid-run. `toggleSelect` ignores items that can't export. The `Select all` label logic uses `exportable`. Render `<SignatorySheet visible={sheetOpen} initial={signatories} onCancel={() => setSheetOpen(false)} onConfirm={s => { void runExport(selectedItems, s); }} />` beside the filter sheet. The filter button is `disabled={busy}`.

- [ ] **Step 5: Run the suites, typecheck, lint**

Run: `npx jest src/features/establishments && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Verify on device**

`npm run android`; Home → Export Inspection Reports; select a water report → Generate → sheet prefilled with your name → Generate → progress → Android share sheet → save to Files / send to yourself → open in Word. Then: multi-select two → zip arrives; a Hazwaste TSD card (if any) shows "No template yet" and can't be ticked. Turn on airplane mode, export a report with photos that aren't on the device → "(not downloaded)" placeholders and the toast count.

- [ ] **Step 7: Commit**

```bash
git add src/features/establishments/components
git commit -m "feat(reports): generate and share the selected reports from the Export tab

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 18: Docs, QA checklist, cleanup

**Files:**
- Modify: `docs/qa-plan.md`, `README.md`, `docs/superpowers/specs/2026-09-15-export-inspection-report-design.md` (status line + the "tooling" paragraph)
- Delete: `src/app/(app)/export-spike.tsx` (never committed; remove from disk), any `tmp/` from the spike

- [ ] **Step 1: QA checklist**

Append to `docs/qa-plan.md` under a new `## Export inspection reports` heading:

```markdown
## Export inspection reports

Device: a mid-range Android (≤ 4 GB RAM) and the newest one available.

1. Water report, submitted, with 3+ photos taken on this phone → Generate → share to Drive → open in Word: every section filled, checkboxes are ☒/☐, three outlet rows, photos two per row with captions, no `{` anywhere.
2. Same report exported from a *different* phone (photos not local) while online → photos downloaded and embedded; while in airplane mode → "(not downloaded)" placeholders and the "N photos not downloaded" line.
3. A draft with most sections empty → the form still shows its printed row counts (3 outlets, 2 sampling points, 5 DP-condition rows).
4. A report with 5 outlets and 12 sampling parameters → rows grow, table borders intact.
5. Multi-select 5 reports (mix water/air/eia) → one zip, five uniquely named .docx inside; air/eia have the shared block filled and their checklists blank.
6. Cancel mid-run → the reports finished so far are offered; the rest are not listed as failures.
7. Hazwaste TSD card → "No template yet", not selectable, Select all skips it.
8. Signatory sheet remembers last values; clearing app data resets it to the profile name.
9. 20-photo report on the low-RAM device → completes without the app being killed; file opens.
10. Export, dismiss the share sheet, export again → no stale files (only the new run's files in the cache dir).
```

- [ ] **Step 2: README**

Under "Project structure", add `features/export/` to the tree comment (`# .docx export: mappers, docxtemplater render, share`) and a short section:

```markdown
## Exporting reports to .docx

The Export tab fills the official EMB forms on the device. Templates are the tagged copies under `assets/templates/`, generated from the untagged originals by `npm run tag-templates` using the recipes in `assets/templates/recipes/` (see `scripts/docx-tag.js` for the recipe format and each `*.tags.md` for the tag list). When EMB revises a form: drop the new original into `assets/templates/originals/`, fix the coordinates in its recipe (`node scripts/docx-grid.js <file>` prints them), rerun `npm run tag-templates`, and let `templateContract.test.ts` tell you what's missing.
```

- [ ] **Step 3: Spec status**

In the spec, change `**Status:** Approved, awaiting implementation plan` to `**Status:** Implemented — see docs/superpowers/plans/2026-09-15-export-inspection-report.md`, and in "Template tagging conventions → Tooling" replace the `scripts/docx-template.js` sentence with one describing the recipe-driven `scripts/docx-tag.js` and the `originals/` + `recipes/` layout.

- [ ] **Step 4: Remove the spike; final checks**

```bash
rm -f "src/app/(app)/export-spike.tsx"
rm -rf tmp
npm run lint && npm run typecheck && npm test
```

Expected: all green; `git status` shows only the docs changes.

- [ ] **Step 5: Commit**

```bash
git add docs README.md
git commit -m "docs(reports): describe the docx export, its templates and the QA checklist

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Spike findings

_Filled in by Task 5._

