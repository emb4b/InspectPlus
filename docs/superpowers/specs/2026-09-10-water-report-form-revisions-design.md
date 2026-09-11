# Water inspection report — form revisions

Status: designed, not implemented. Branch `feat/water-report-form-revisions`
off `develop` (9f91841).

Three revisions to the water report's "Information on Wastewater Pollution"
section, requested against the printed EMB inspection form:

1. **B. Type of WWTP** — an "Others" selection must be able to say what.
2. **C. WWTP Details** — Receiving Body of Water becomes a province-filtered
   dropdown sourced from EMB's classified-waterbodies list.
3. **D. Components of the WWTP** — a missing `WWTP` column, and the three
   treatment columns become multi-select checkboxes with free text.

Each revision touches both entry paths — the create form
(`WaterExtraFormSections.tsx`) and the per-section edit screen
(`WaterComplianceEditSections.tsx`) — plus the read-only cards a reviewer
sees. That duplication is pre-existing; this design does not attempt to
collapse it.

## Purpose

All three are places where the app asks a narrower question than the paper
form it replaces, and the inspector has nowhere to put the real answer.

"Others" on Type of WWTP records that the plant is none of the four listed
kinds, but not which kind it is. Receiving Body of Water is free text, so
the same river arrives spelled three ways across three reports and carries
no water classification — the figure that determines which effluent
standards apply. Section D's treatment columns are single free-text fields
hinted "Comma-separated", against a printed form that lists specific
checkboxes; and with only an `Outlet No.` column, a report describing two
WWTPs gives no way to tell which plant a component set belongs to.

## 1. The waterbody dataset

### Source and provenance

`2020 Updated List of Waterbodies Classified and Monitored`, EMB MIMAROPA,
January 2020. Eight pages, three tables — Principal Rivers, Minor Rivers,
Other Waterbodies — grouped by province across exactly the five provinces
this app already scopes to.

The PDF's text layer is row-misaligned: a naive `pdftotext -layout` pairs
`Boac River` with a classification belonging to a different row. A wrong
name-to-classification pairing would be invisible in the app and would
silently misstate which effluent standards apply, so extraction was done
twice by different methods and the results diffed:

- Xpdf `pdftotext -table`, which reconstructs rows by column alignment.
- `pdfplumber` word coordinates, clustering words into visual lines and
  assigning them to columns by x-position bands taken from each page's
  header row.

The two agreed on 96 of 102 rows. All six disagreements had an unambiguous
winner: five were multi-line values only the coordinate pass captured
(`San Isidro Bay (White Beach)`, `Marine Waters Surrounding Malampaya
Platform`, `Aramaywan River (Quezon Stream)`, `Aramaywan River (Narra
Stream)`, `Rio Tuba River`'s `SC (brackish mangrove)`), and one was a
header word bleeding into a name, which only the table pass got right.

Three independent totals then cross-check against the PDF's own summary
table, which is computed by EMB rather than by this extraction:

| Check | Extracted | PDF summary |
|---|---|---|
| Total waterbodies classified | 102 | 102 |
| Total classifications assigned | 125 | 125 |
| Per province (OccMin/OrMin/Mar/Rom/Pal) | 13/24/8/7/50 | 13/24/8/7/50 |

The classification-token count is the check that earned its keep. It came
out at 128 on the first pass, against a stated 125. The excess was three
rows extracted as `A, B, B` — a column-duplication artifact. Corrected to
`A, B`, the total is exactly 125. The resulting vocabulary is `AA, A, B, C,
D, SA, SB, SC`, with no `SD`, matching the summary's `SD = 0` row.

### Reproducibility

The extraction is committed as `scripts/generate_waterbodies.py`, following
the precedent of `scripts/generate_app_icon.py`. It reads the source PDF and
emits `src/data/mimaropaWaterbodies.ts`. It re-runs only the
coordinate-based `pdfplumber` pass — the Xpdf `pdftotext -table` pass was a
one-off planning check, not encoded, because it would pin a dependency on a
tool that is not portable. What the script does encode is a set of gates
against the PDF's own summary table, and it **refuses to write if any of
them fails**:

- total waterbody count (102) and per-province counts (13/24/8/7/50);
- total classification tokens (125);
- the per-class histogram — `AA 1, A 24, B 19, C 51, D 3, SA 4, SB 14,
  SC 9, SD 0` — which catches a class read as another, or dropped or
  doubled in one row, where two such errors would cancel in the total;
- section-heading text bleeding into a name band;
- vocabulary: no province outside the five, no blank name or class.

Every one of those is count-invariant under a permutation: if two rows swap
their classifications, all gates pass and both rows are wrong. The 2020
pairing was verified by the manual two-method diff described above; that
check is not encoded. So when EMB publishes an updated list, the dataset is
regenerated rather than hand-edited, the `EXPECT_*` constants are updated
from the new summary table first, and after the script writes, **a sample of
rows — every multi-line name and every multi-class row at minimum — is
cross-checked by hand against the PDF**.

The script depends on `pdfplumber`, which is *not* added to the project's
dependencies — it is a one-off authoring tool, documented in the script's
own header, not part of the app or its test run.

### Shape

```
src/data/mimaropaWaterbodies.ts    // the bundled data
src/constants/waterbodies.ts       // the accessor
```

This mirrors the existing `src/data/mimaropaLocations.ts` →
`src/constants/provinces.ts` pair exactly, including the rationale recorded
there: bundled at build time rather than fetched, because the app is
offline-first and an inspector in the field has no network.

```ts
// src/data/mimaropaWaterbodies.ts
export interface WaterbodyGroup {
  label: string;      // 'Principal Rivers' | 'Minor Rivers' | 'Other Waterbodies'
  options: string[];  // 'Boac River (C)', …
}
export const WATERBODIES: Record<string, WaterbodyGroup[]> = { … };
```

```ts
// src/constants/waterbodies.ts
export const WATERBODY_NOT_LISTED = 'Not listed (specify)';
export function getWaterbodyGroups(province: string): WaterbodyGroup[];
```

### Value format

`Name (Classification)` — `Boac River (C)`, `Ulan Bay (SB, SC)`,
`Tawiran River (A, B, C)`.

The parentheses carry the separation, so no comma sits between name and
classification. This matters for the 20 multi-class entries: `Ulan Bay (SB,
SC)` reads as one name with two classifications, where `Ulan Bay, SB, SC`
would not.

Three entries carry a qualifier that would otherwise nest parentheses. They
are flattened: `C (assigned)` becomes `Madugo River (C, assigned)`, and
`SC (brackish mangrove)` becomes `Rio Tuba River (SC, brackish mangrove)`.
Lossless, and avoids `Rio Tuba River (SC (brackish mangrove))`.

The stored value is this whole string. The app does not parse it back into
name and classification; nothing in the report needs those separately, and
storing the rendered string keeps the record readable if the dataset is
later revised.

### Ordering

Principal Rivers, then Minor Rivers, then Other Waterbodies; alphabetical
within each group. Group sizes vary sharply — Palawan is 21/19/10 while
Romblon has no principal rivers at all and opens on minor rivers — so the
ordering is signposted with headers rather than left implicit (see §4).

## 2. Province filtering

`getWaterbodyGroups(province)` returns only that province's waterbodies.
Province is already available on both entry paths and needs one new prop
each:

- **Create form** — `WaterFormShell` holds `generalInfo.province`; passes a
  `province` prop into `WaterExtraFormSectionsView`.
- **Edit screen** — `InspectionReportDetailScreen.tsx:124` already reads
  `report.establishmentSnapshot.province`; passes it through
  `WaterExtraSectionsView` into `WwtpDetailsSection`.

The edit screen takes the province from the report's **snapshot**, not from
`liveEstablishment`. This is deliberate and matches how that screen already
sources its address fields (see the comment at
`InspectionReportDetailScreen.tsx:117`): re-opening a two-year-old report
must not silently re-scope its dropdown because the establishment record was
since corrected.

**Fallback.** A blank province, or one outside MIMAROPA, yields no groups.
Rather than present a dropdown with nothing in it, the field falls back to
all five provinces' groups concatenated. A dead control is worse than a long
one, and `WATERBODY_NOT_LISTED` remains available regardless.

## 3. Not-listed escape hatch

The 2020 list is not exhaustive — an outlet can discharge into an
unclassified creek or a drainage canal — and existing reports already hold
free text in this field.

`WATERBODY_NOT_LISTED` (`'Not listed (specify)'`) is appended as a final,
ungrouped option in every province's list. Selecting it reveals a
`TextField` for the actual name, following the existing `nonWwtpOther`
pattern at `WaterExtraFormSections.tsx:263`.

This departs from the precedent set for 4C's abstracted-water source, which
chose to let unrecognised legacy free text sit inert until re-picked
(`waterChecklistData.ts:57`). That was defensible for a two-option cascade
where the correct answer is always present; it is not defensible here, where
the list provably cannot cover every receiving body an inspector meets.

**Legacy values.** On open, a stored `receivingBodyOfWater` that matches no
option in the establishment's province is presented as
`WATERBODY_NOT_LISTED` with the stored text moved into the specify box.
Nothing is lost and nothing is silently blanked.

### Storage

Both live inside the existing `wwtpDetails` **jsonb** column, so no
migration:

```ts
interface WwtpDetailCard {
  …
  receivingBodyOfWater: string;       // the selected option, or WATERBODY_NOT_LISTED
  receivingBodyOfWaterOther: string;  // free text, only when NOT_LISTED
  …
}
```

The same narrowing rule the codebase already applies to `nonWwtpOther`
applies here: the free text is dropped on save unless `NOT_LISTED` is
actually selected, so a stranded string cannot contradict the option beside
it. The rule is a `receivingBodyOfWaterForSave(selection, other)` helper in
`waterTypes.ts`, paired with `decodeReceivingBodyOfWater(stored, province)`
which splits a stored string back apart on open — shared by both entry
paths exactly as `nonWwtpTreatmentFor` is.

### Label

The field label becomes **Receiving Body of Water (Water Classification)**,
in the edit form, the create form, and the read-only `DetailCard` at
`WaterComplianceEditSections.tsx:554`.

## 4. SelectField group headers

`SelectField` currently takes `options: string[]` and renders them through a
`FlatList` with `keyExtractor={item => item}`.

It gains one optional prop, `groups?: WaterbodyGroup[]`, as an alternative
to `options`. Internally both are normalised to a single list of tagged
rows:

```ts
type Row = { kind: 'header'; text: string } | { kind: 'option'; text: string };
```

- `keyExtractor` prefixes by kind, so a header and an option may share text.
- Header rows are non-selectable and styled as headers.
- The existing search filters options only; a group whose options all
  filter out drops its header too, so no orphan header is left over a gap.
- The `options.length > 6` rule that decides whether to show the search box
  counts options, not headers.

Every current caller passes `options` and is untouched. This is the only
change to a shared primitive in this work, and it is additive.

## 5. Type of WWTP — "Others"

`WWTP_TYPE_OPTIONS` already ends in `'Others'`
(`waterChecklistData.ts:82`). Selecting it reveals a `TextField`, mirroring
`nonWwtpOther`. Form state gains `wwtpTypeOther: string`; the text is
dropped on save unless `wwtpType === 'Others'`.

### Storage — the one migration

`wwtpType` is a plain **text** column (`schema.ts:208`), not jsonb, so
unlike every other field in this design the specify text has nowhere to go.
It gets its own column.

The alternative considered was encoding into the existing column as
`'Others: Grease trap'` and parsing on read. Rejected: it turns an
enum-valued field into a format that every reader must know to parse, and
the codebase already faced this exact choice one week ago and chose the
explicit column (`20260909120000_add_non_wwtp_treatment_to_compliance_water.sql`).

Following that precedent exactly:

- **WatermelonDB** — schema `version: 12` → `13`, plus an `addColumns` step
  adding `wwtpTypeOther` (string, optional) to `compliance_water`.
- **Model** — `@field('wwtpTypeOther') wwtpTypeOther!: string | null`.
- **Sync map** — one line in `syncSchema.ts`:
  `wwtp_type_other: 'wwtpTypeOther'`.
- **Supabase** — `alter table public.compliance_water add column if not
  exists wwtp_type_other text`, then `push_changes` re-issued in full with
  the column added to the `compliance_water` insert list, its values, and
  the update loop's on-conflict set.

That last step is why this migration file will be ~1000 lines: `push_changes`
must be redefined whole, and the new migration is based on the previous one
that redefined it. The change itself is three insertions.

Additive and nullable, satisfying the backward-compatibility rules in
`docs/sync-contract.md`: a client that predates the field omits it from its
push payload and the `coalesce` defaults it; existing rows keep `NULL`,
which reads as empty — correct, since no inspection before this was asked.

## 6. Components of the WWTP

### A documentation bug found in passing

`ComplianceWater.ts:34` documents this column as:

```
// Each item: { outlet_no, primary_treatment[], biological_treatment[],
//   chemical_treatment[], other_treatment }
```

— snake_case keys, array values. That is not what is stored.
`patchComplianceWater` is a bare `Object.assign`
(`WaterComplianceEditSections.tsx:70`) with no key transform, and
`WaterInspectionFormScreen.tsx` passes the camelCase form objects straight
through. Actual stored rows are camelCase keys with comma-separated string
values. The comment has been wrong since it was written, and the same is
true of the `wwtpDetails` comment two lines above it.

This design moves the real data toward what the comment always claimed. The
comments are corrected to describe what is actually stored — camelCase, and
the new shape below.

### Shape

All inside the existing `wwtpComponents` **jsonb** column. No migration.

```ts
interface WwtpComponentCard {
  outletNo: string;
  wwtp: string;                    // new — free text, matching section C's "WWTP Detail"
  primaryTreatment: string[];      // was string
  primaryTreatmentOther: string;
  biologicalTreatment: string[];   // was string
  biologicalTreatmentOther: string;
  chemicalTreatment: string[];     // was string
  chemicalTreatmentOther: string;
  otherTreatment: string;          // existing — the form's sixth "Others" column
}
```

The `WWTP` column is free text rather than a dropdown fed from section C.
A dropdown would keep the two sections in step, but section D can be filled
before section C has any rows, and the printed form treats it as a written
name.

### Option lists

Added to `waterChecklistData.ts` beside `WWTP_TYPE_OPTIONS`, transcribed
from the printed form:

- **Primary** — Screening · Grit Removal · Oil/Water Separator ·
  Equalization Tank · Others (specify)
- **Biological** — Activated Sludge · Anaerobic Digestion · Anaerobic
  Baffled Reactor (ABR) · Reed Bed System · Trickling Filter ·
  Oxidation/Stabilization Batch · Sequencing Batch Reactor ·
  Others (specify)
- **Chemical** — pH Adjustment · Disinfection · Redox ·
  Flocculation/Coagulation · Others (specify)

The printed form reads "Tricking Filter". The app uses the correct
"Trickling Filter" — a deliberate divergence from the paper, agreed with the
requester.

Each of the three renders as `CheckboxRow`s with a per-section
"Others (specify)" that reveals its own `TextField`, and each drops its free
text on save unless its own "Others" is ticked. Three repetitions of one
rule, so the checkbox-plus-specify block becomes a small shared component
rather than being written out three times in each of the two entry paths.

### Reading legacy rows

Existing rows hold `primaryTreatment: "Screening, Grit Removal"` — a string
where an array is now expected. Decoding is lenient, at read time, with no
data migration:

- An array is taken as-is.
- A string is split on commas and trimmed.
- Fragments matching a known option (case-insensitively) become ticks.
- Fragments matching nothing are joined back into that section's
  "Others (specify)" text, and its "Others" box is ticked.

So an old report opens with its boxes ticked where the text happened to
match, and anything unrecognised is preserved verbatim rather than
discarded. A row that is re-saved is written in the new shape; a row that is
never re-opened is never rewritten, and still reads correctly.

### Read-only view

The `DetailCard` at `WaterComplianceEditSections.tsx:677` takes
`{ label, value: string }` pairs, so each array is summarised to one line by
a shared helper — the same folding `describeNonWwtpTreatment`
(`waterTypes.ts:191`) already does, where a ticked "Others" is rendered as
`Others: <text>` rather than as a bare "Others" beside a separate box.

## 7. Testing

TDD throughout. `nonWwtpTreatment.test.tsx` is the closest model: it already
covers reveal-on-Others, drop-orphaned-text-on-untick, and the read-view
summary, which this work repeats four more times.

| Area | Cases |
|---|---|
| Dataset | 102 entries; per-province counts 13/24/8/7/50; every classification in the known vocabulary; group order principal→minor→other |
| Province filter | Correct list per province; blank/unknown province falls back to all; edit screen reads the snapshot, not the live establishment |
| Not-listed | Reveals on select; text dropped unless selected; legacy free text opens as NOT_LISTED with text preserved |
| SelectField groups | Headers render and are not selectable; search drops emptied headers; existing `options` callers unchanged |
| Type of WWTP | Reveals on Others; dropped unless Others; round-trips through the new column |
| Components | Legacy string splits to ticks; unmatched fragments land in Others; new shape round-trips; each section's Others independent |
| Migration | Not written. The repo has no WatermelonDB migration test and no harness for one, so none was added here; the v12→v13 step follows the `non_wwtp_treatment` precedent line for line. A migration-test harness, and this case under it, is a follow-up outside this branch. |

`npm run lint`, `npm run typecheck`, and `npm test` must all pass before the
branch is considered done.

## Out of scope

- Collapsing the create-form / edit-screen duplication. Pre-existing, and
  four times the size of this change.
- Section E (Condition of the WWTP), visible in the same photo of the
  printed form. Its options already broadly match `WWTP_CONDITION_OPTIONS`
  and no revision was requested.
- Backfilling existing `wwtpComponents` rows into the new shape. Read-time
  decoding makes it unnecessary.
- Parsing the stored waterbody value back into name and classification.
