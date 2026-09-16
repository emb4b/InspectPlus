# Export Inspection Report — Design

**Date:** 2026-09-15
**Status:** Implemented — see docs/superpowers/plans/2026-09-15-export-inspection-report.md
**Supersedes:** the "out of scope" note on document generation in
`2026-09-03-modern-ui-harmony-design.md`

## Goal

Turn the Export Inspection Reports tab's disabled "Generate" button into a
working export: each selected report becomes a filled-in copy of the
official EMB `.docx` form, generated on the device (offline), and handed to
the OS share sheet — one `.docx` for a single report, one `.zip` for
several.

## Decisions taken during brainstorming

| Question | Decision |
|---|---|
| Output format | `.docx` filled from the official EMB templates |
| Templates | Five supplied in `assets/templates/` (Air, EIA, Hazardous Waste Generators, Survey, Water). No template for Hazwaste TSD yet — that type stays unexportable until one arrives |
| How the engine finds fields | Merge tags inserted into the templates (tagged copies checked in) — not positional lookup |
| Data outgrowing the printed rows | Row loops grow to fit, padded with blank rows up to the form's printed count so a sparse report still looks like the form |
| After Generate | OS share sheet (`expo-sharing`); nothing kept in the app beyond a cache cleared on the next run |
| Photos | Embedded on the ATTACHMENTS page, 2 per row, captioned "Figure N" (1-based across the report) plus the inspector's own caption when given; a photo not on the device prints "(photo not downloaded)" under its figure caption |
| Signature block | Inspector/supervisor name + position, the recommending/approving signatories, and any number of additional inspectors under "Submitted by", all asked in an on-device sheet. Inspector/supervisor/additional-inspectors are one value shared across every report type; the recommending/approving signatories are remembered PER report type (keyed the same way `templateFor` looks templates up) and default to that type's own printed names (see `defaultApproversFor` in `features/export/templates/index.ts`) — editing the approvers for a Water export never changes what a Hazwaste export prefills, or vice versa. Behind a `SignatoryProvider` seam so the future admin-defined chain of command replaces the storage, not the engine |
| Scope of mapping | Water end-to-end. The other four templates get the shared sections (General Information, Purpose, DENR Permits, Documents Reviewed, signatures, ATTACHMENTS) tagged and mapped now; their type-specific sections are tagged and mapped when each form is built, since only the Water form exists in the app today |
| Engine | docxtemplater + pizzip on-device (both MIT, pure JS, Hermes-safe). Image support decided by the spike: the MIT community image module if it holds up, otherwise a small post-pass of our own. Server-side rendering rejected — the app is offline-first |

## Architecture

New feature module:

```
src/features/export/
  templates/index.ts       reportType → template asset (tagged .docx via expo-asset)
  loadReportBundle.ts      reportId → ReportBundle (plain data; no WatermelonDB models leak out)
  mappers/
    common.ts              shared block: header, GI, purpose, permits, documents, signatures, photos
    water.ts               water block; air.ts / hazwaste.ts / eia.ts / survey.ts start as common-only
    padRows.ts             padRows(items, min) helper
  signatories.ts           SignatoryProvider interface + AsyncStorage-backed implementation
  render/
    renderDocx.ts          (templateBytes, TemplateData, images) → docx bytes
    imagePass.ts           attachment photos → media parts + <w:drawing> XML (if the spike picks "own pass")
  exportReports.ts         orchestrator: bundle → map → render → file; zip if >1; share
  hooks/useExportReports.ts  progress / cancel / error state for the tab
```

**Data flow.** `ExportReportsTab` → `useExportReports.run(selectedItems, signatories)` → for each item, sequentially: `loadReportBundle` reads the report, its purpose row, its `compliance_*` row, the establishment snapshot and attachments into a plain `ReportBundle` → the type's mapper produces a flat `TemplateData` (`{ gi_establishment_name, cb_wwtp_yes: '☒', wwtp_outlets: [...] }`) → `renderDocx` fills the tagged template → bytes are written to `Paths.cache/exports/<name>.docx`. One file is shared directly; several are zipped with pizzip into `InspectPlus-exports-YYYYMMDD-HHmm.zip`. Each inner file is `<ReportType>-<EstablishmentSlug>-<YYYY-MM-DD>.docx`.

**Boundaries.**
- Mappers are pure functions `ReportBundle → TemplateData`. Every "does this box tick" and "how does a null date print" rule lives here. This is the most-tested layer.
- `renderDocx` knows nothing about report types.
- `SignatoryProvider` returns `{ inspectorName, inspectorPosition, supervisorName, supervisorPosition }`. Today's implementation prompts and persists under the AsyncStorage key `export.signatories`; a future one reads a synced profile.
- Templates ship in the binary (`assets/templates/*.docx`, loaded through `expo-asset`) so export works offline.

**New dependencies:** `docxtemplater`, `pizzip`, `expo-sharing`, `expo-asset` made explicit. Image module per the spike.

## Template tagging conventions

- **Syntax:** docxtemplater default `{name}`. Names are `snake_case`, prefixed by section: `gi_establishment_name`, `purpose_cb_complaints`, `wwtp_outlets`, `sig_inspector_name`.
- **Checkboxes:** every `w14:checkbox` content control is replaced by a plain run with the same run properties and the text `{cb_<name>}`. The mapper emits `☒` (U+2612) or `☐` (U+2610). Survey's legacy `FORMCHECKBOX` fields and `__ Label` blanks are converted the same way. Radio-style groups are independent checkboxes; the mapper guarantees at most one is ticked.
- **Repeating rows:** the first data row carries `{#rows_name}` at the start of its first cell and `{/rows_name}` at the end of its last cell; the other printed blank rows are deleted. The mapper pads with blank records up to the printed count (`padRows(items, min)`; each table's `min` is recorded next to the tag in the `.tags.md`). Fixed-label tables (Summary of Findings, Water Sources, DENR Permits) are not looped — each printed row has its own tags so the legal text stays exactly as printed.
- **Free text:** plain tags; multi-line fields (remarks, observations) use docxtemplater's `linebreaks: true` so `\n` renders as a line break.
- **Photos:** the ATTACHMENTS page gets a two-per-row layout: `{#photo_rows}{#left}` … `{@photo_drawing}` … `{caption}` … `{/left}{#right}` … `{@photo_drawing}` … `{caption}` … `{/right}{/photo_rows}`, one row of the loop per pair of photos. The ATTACHMENTS heading paragraph carries `pageBreakBefore` so the photos start on their own page, after the signature block.
- **Untouched:** headers/footers, the pre-printed approver names, all legal reference text, styling.
- **Tooling:** `scripts/docx-tag.js` inserts merge tags into an EMB `.docx` from a JSON recipe (`npm run tag-templates` runs it against every template). The untagged originals live in `assets/templates/originals/`; each template's recipe (coordinates, tag names, loop minimums) lives in `assets/templates/recipes/`. Every tagged template has a sibling `assets/templates/<name>.tags.md` listing each tag, its meaning, and each loop's minimum row count.

## Data mapping

### Shared block (`mappers/common.ts`)

- **Header:** `report_control_no` ('' when null — the printed underline stays); `inspection_date` formatted `DD Month YYYY` by one `formatReportDate` helper in `src/utils/`, reused for every date on every form; '' for null/invalid.
- **General Information** from `establishmentSnapshot` (what the report saw, not the live establishment): name; address via the existing `formatEstablishmentLocation`; geo as `lat, lng` to 6 dp; nature of business; PSIC; product; year established from `operating_status_since` only when `operating_status` isn't Operational (the only signal the model has), else ''; operating hours/day, days/week, days/year; `product_lines` as a padded loop (min 3: line, ECC rate, actual rate); managing head; PCO name, accreditation no., effectivity; phone/fax; email; contact person as `Name (Position)`.
- **Purpose:** `purpose_cb_verify`, `purpose_cb_compliance`, `purpose_cb_complaints`, `purpose_cb_commitments`, `purpose_cb_others` from the booleans. Verify sub-table New/Renewal checkboxes from `verify_info_list[item_key].status`. Commitments sub-list checkboxes from `check_commitments_list`. `purpose_others` text.
- **DENR Permits:** fixed-label rows keyed by `(envi_law, permit_type)`; `permitsSnapshot` is matched to the printed labels, ECC 1/2/3 taking the first three PD 1586 entries in order. Unmatched permits go into a padded loop appended under the last printed row so nothing is dropped silently.
- **Documents reviewed:** a checkbox per printed option from `documentsReviewed[]`; an entry not in the printed list goes in the Others blank.
- **Signatures:** `sig_inspector_name`, `sig_inspector_position`, `sig_supervisor_name`, `sig_supervisor_position`, `sig_recommending_name`, `sig_recommending_position`, `sig_approver_name`, `sig_approver_position` from `SignatoryProvider`. `sig_inspectors[]` (`sig_inspector_name`, `sig_inspector_position`) loops the primary inspector plus any additional ones under "Submitted by" whose name isn't blank — min 1 row (the primary inspector always appears).
- **Photos:** `photos[]` = `{ image, caption }` ordered by `capturedAt`; caption is `Figure N: <caption>` (1-based across the report) when the inspector gave one, else just `Figure N`. A photo not on the device prints `(photo not downloaded)` in place of the drawing, under its figure caption.

### Water block (`mappers/water.ts`)

- **4A Water sources / 4B Wastewater sources:** fixed-label rows keyed by source name; a source not in the printed list goes in the "Others (specify)" row.
- **4C Quality of abstracted water:** padded loop (min = printed rows).
- **5A/5B:** checkboxes from `hasWwtp` and `wwtpType` (+ `wwtpTypeOther` text). When `hasWwtp` is false, the non-WWTP treatment systems (`nonWwtpTreatment.systems` + `other`) are written into the 5B Others text — the form has no other home for them.
- **5C WWTP detail:** `wwtpDetails` padded loop (min 3). Receiving body = `receivingBodyOfWaterOther` when set, else the classified name.
- **5D Components:** `wwtpComponents` padded loop (min 2). Per-cell checkboxes come from the treatment arrays through the existing `decodeWwtpComponent` (handles legacy comma-string rows); "Others (specify)" gets the matching `*Other` text.
- **5E Condition:** condition checkboxes (+ other text); construction Yes/No, reported Yes/No; the three text answers.
- **Sampling points:** loop (min 2) with nested `parameters` loop (min = printed rows). `samplingConducted === false` leaves both points blank. **Previous inspection:** same shape, single; blank unless `hasRecords === 'yes'`.
- **Summary of Findings:** fixed rows tagged by the `key` in `WATER_FINDINGS_CHECKLIST` (`sf_<key>_y`, `_n`, `_na`, `sf_<key>_remarks`). The stored entry is looked up by key, so reordering can't misalign a row.
- **DP conditions:** padded loop (min = printed rows). **Other observations / Remarks and recommendations:** multi-line text.

### Other report types

`air.ts`, `hazwaste.ts`, `eia.ts`, `survey.ts` return the shared block only. Their templates are tagged for the shared sections; type-specific sections stay as printed (blank) until each form exists in the app, at which point tagging + mapping that section is a bounded task against real data.

### Empty / malformed data rule

null → `''`; an unknown `YnValue` → no box ticked; a JSON row missing fields → those cells blank; an array that isn't an array → treated as empty. A mapper never throws on data. Only a missing template asset or a render failure surfaces as an error.

## UI flow

- **Untemplated types** (`hazwaste_tsd`): the card shows a "No template yet" badge and is not selectable; Select all skips it. Both hazwaste create paths currently store `report_type = 'hazardous_waste'` (see `src/constants/reportTypeDisplay.ts`), so this guard is latent until the TSD form gets its own storage key.
- **Generate** opens the signatory sheet (same style as `ReportFilterSheet`): inspector name (prefilled from the profile's `fullName`), inspector position, supervisor name, supervisor position. Values persist under `export.signatories`; the sheet's confirm is the real Generate.
- **Progress:** the selection bar becomes a progress row — "Generating 2 of 5 — <establishment>", a determinate bar, and Cancel (stops after the current report). Selection and filters are locked. Reports render sequentially to keep peak memory low.
- **Completion:** the OS share sheet opens with the `.docx` or `.zip`. Dismissing it returns to the tab with the selection intact. A toast reports skipped photos ("3 photos weren't downloaded").
- **Drafts** export as-is with the existing draft warning; no watermark.
- **Photos not on device:** `resolveLocalFileUri` is attempted per attachment with the existing network timeout; failure → placeholder, the report still renders.

## Error handling

- One report fails → recorded, the run continues, the share sheet opens with what succeeded, and the bar lists the failures with reasons ("Water Monitoring — <establishment>: template tag `wwtp_outlets` missing"). Nothing partial is ever shared.
- All fail, or the template asset can't load → error state in the bar with Retry.
- Cancel → what finished so far is offered for sharing.
- `Paths.cache/exports/` is cleared at the start of each run, never at app start.

## Out of scope

Export history, server-side rendering, a DRAFT watermark, editing signatories anywhere but the sheet, the Hazwaste TSD template, and the type-specific sections of Air / EIA / Hazwaste Generators / Survey.

## Testing

1. **Spike (first task):** a throwaway screen renders the tagged Water template on a real Android device with docxtemplater + pizzip and one embedded JPEG; open in Word/WPS. Pass = opens, tags filled, checkbox glyphs render, image visible. Decides the image approach and confirms pizzip/xmldom under Hermes.
2. **Mapper unit tests (Jest):** per mapper — full report, empty report, malformed report (missing fields, legacy comma-string components, unknown `YnValue`). Assert on `TemplateData`.
3. **Template contract test:** for every `assets/templates/*.docx`, extract the tag set from `document.xml` and diff it against the keys the mapper's full fixture produces. Any tag without data, or data without a tag, fails.
4. **Render test (Node):** render each template with its full fixture through the real docxtemplater; assert the output unzips, no `{` survives in `document.xml`, expected strings and glyphs appear.
5. **Orchestrator tests:** fake renderer + fake file system; sequencing, cancel-after-current, one-failure-continues, single-vs-zip.
6. **Tab tests:** extend the existing `ExportReportsTab` tests — untemplated type unselectable, signatory sheet on Generate, progress row, share called with the right URI.
7. **Manual QA** in `docs/qa-plan.md`: full water report, a draft, multi-select, offline with un-downloaded photos, a low-memory device.
