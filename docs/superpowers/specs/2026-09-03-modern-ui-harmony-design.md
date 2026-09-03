# Modern UI harmony — design system foundation + Home restructure

Branch: `feature/modern-ui-harmony` (off `develop`)
Status: approved, proceeding to implementation plan

## Purpose

InspectPlus has an ad-hoc visual layer that has drifted since the last
unification pass (the one that produced `Button.tsx` / `AppText.tsx`):
12 distinct `fontSize` values (body copy sits at 12px, with real usage
down at 7–9px), 17 `borderRadius` values, spacing off a 4dp rhythm at
3/5/6/7/9/11/13/14, and 45 hardcoded hex colors across 16 files
(including a brand-less purple, `#5b4fcf`, used for the active tab
underline). 138 `TouchableOpacity`s exist against 11 `hitSlop` calls
and 2 `accessibilityRole`s. There is no spacing/type/radius/elevation/
motion scale, no `allowFontScaling` policy, and no reduce-motion
handling anywhere in the app.

This work has two parts:

1. **A design token foundation** — spacing, type, radius, elevation,
   and motion scales, plus the primitive components that carry them —
   proven end-to-end on Home and the Establishments list.
2. **A Home screen restructure** — replace the always-visible "Create
   New Report" tab with a floating action button that opens a
   speed-dial of the six report types, and add a new "Export
   Inspection Reports" tab (UI shell only; document generation is a
   separate, later effort).

Everything else in the app (the remaining ~50 components, the other
screens) is out of scope here and will be swept in follow-up
sub-projects once this foundation is proven.

**Explicitly out of scope for this branch:** the .docx generation
engine for the Export tab. Filling a legal template from database
records — six report types across two tables (`inspection_reports` +
per-type `compliance_*` tables, and the separate `survey_reports`
table), most of it JSON-in-a-string — is a distinct, larger effort
that needs its own feasibility spike (can an OOXML zip/template
library run under Hermes offline; what's the licensing story) before
it can be designed. The target, once that spike lands, is dual-mode:
on-device generation with a server-side (Supabase Edge Function)
path — offline-first is the app's premise, so on-device generation is
required, not just preferred, but the exact fallback shape depends on
the spike's findings. Output is one `.docx` per selected report,
zipped for multi-select. Templates are supplied by the user as blank
`.docx` files; merge tags are inserted during that later effort.

## Section 1 — Design token foundation

### Location

New `src/design/` module:

```
src/design/
  colors.ts       (moved from src/constants/colors.ts)
  spacing.ts
  typography.ts
  radius.ts
  elevation.ts
  motion.ts
  tokens.ts        (re-exports all of the above)
  index.ts
```

`src/constants/colors.ts` becomes a one-line re-export of
`src/design/colors.ts` so existing imports keep working during the
migration. It is deleted once every consumer has moved to
`src/design`, tracked via the drift-guard allowlist below.

### Type scale

13 sizes collapse to 8. Body moving from 12 to 14 is the largest
single legibility win (and the largest layout risk on dense screens);
the floor moves from ~7px to 11px.

| Token | Size / line-height | Replaces |
|---|---|---|
| `display` | 24 / 30 | 22 |
| `title` | 20 / 26 | 20 |
| `heading` | 17 / 24 | 15 |
| `subheading` | 15 / 21 | 14, 15 |
| `body` | 14 / 20 | 12, 12.5 |
| `bodySm` | 13 / 18 | 11, 11.5, 13 |
| `label` | 12 / 16 | 10 |
| `caption` | 11 / 14 | 7, 8, 9 |

Confirmed with the user: body = 14, floor = 11. If the compliance
tables measurably break at this size on-device, the fallback is body
13 / floor 11 (verify and adjust, not revert to the sub-11 floor).

An explicit `allowFontScaling` policy accompanies the scale: on for
prose content, capped or off for fixed-width table cells where OS
font scaling would break layout. This is a new, deliberate policy —
today the prop is unset everywhere.

### Spacing

One 4dp rhythm: `0, 2, 4, 8, 12, 16, 24, 32, 48`. `2` is kept for the
icon-to-text hairline gap; `6` (121 existing uses, the most common
off-rhythm value) is deliberately **not** admitted to the scale —
existing `6`s resolve to `4` (icon/text) or `8` (everything else) at
migration time, rather than adding a permanent exception to the
rhythm.

### Radius

17 values down to 6: `xs 4, sm 6, md 8, lg 12, xl 16, pill 999`.

### Elevation

5 named levels, each emitting both iOS `shadow*` and Android
`elevation` together so a surface can't be raised on one platform and
flat on the other (today's bug: `EstablishmentCard` sets
`shadowOpacity: 0.04` with `elevation: 1`, which do not read as the
same weight cross-platform): `flat`, `raised` (cards), `overlay`
(sheets/dials), `modal`, `fab`.

### Motion

Durations `100 / 150 / 200 / 300`; standard/decelerate/accelerate
easing curves; two spring configs (`press`, `sheet`). A shared
`animateOrSnap` helper wraps every token-driven animation and consults
Reanimated's `useReducedMotion()` (confirmed present in the installed
version), collapsing to an instant state change when reduce-motion is
on. No component calls Reanimated primitives directly for
token-governed motion — they go through this helper.

### Primitives

New shared components in `src/components/`, built on the tokens:

- **`Touchable`** — `Pressable`-based wrapper enforcing a 48dp minimum
  hit target via `hitSlop` (same formula as `Button.tsx`'s
  `hitSlopFor`), consistent press feedback, and *required*
  `accessibilityRole`/`accessibilityLabel` props (TypeScript-enforced,
  not just convention). This is the structural fix for the
  138-vs-11/2 `hitSlop`/`accessibilityRole` gap — new touch targets
  can't skip it, and it becomes the sweep target for old ones.
- **`Card`** — token-driven surface (radius `lg`, elevation `raised`,
  spacing-scale padding), replacing hand-rolled card styles like
  `EstablishmentCard`'s.
- **`Badge`** — token-driven pill (radius `pill`, `label`/`caption`
  type, spacing-scale padding), replacing the ad-hoc tag/sync-status
  chips duplicated across `EstablishmentCard`, `ReportListCard`, etc.
- **`Section`** — a titled content block (heading token + consistent
  vertical rhythm), replacing one-off `sectionLabel` styles.
- **`EmptyState`** — icon + title + optional subtitle + optional
  action, for empty lists/filters.
- **`Skeleton`** — token-driven loading placeholder, replacing bare
  `ActivityIndicator` usage where a shape-preserving placeholder reads
  better.

`Fab` and `SpeedDial` are introduced in Section 2 since they're
purpose-built for the Home restructure, but they consume these same
tokens and `Touchable`.

**Deliberately deferred:** a Toast/snackbar system. Feedback clarity
is a real priority but replacing `Alert` calls app-wide is sweep work
with no consumer on this branch; it belongs to a later feedback-focused
sub-project.

### Drift guard

A Jest test (`src/design/__tests__/driftGuard.test.ts`) that scans
`src/**/*.tsx` and fails if it finds:

- a raw hex color literal (`#[0-9a-fA-F]{3,8}`) outside `src/design/`
- a numeric `fontSize:` or `borderRadius:` literal outside
  `src/design/` and the primitives that define the scale

Ships with an explicit allowlist of not-yet-migrated files (every
`.tsx` file this branch doesn't touch). Each subsequent migration
sweep removes entries from that list; the test doesn't require the
whole app to be migrated to land.

## Section 2 — Home restructure

### Report-type vocabulary reconciliation

`src/constants/reportTypes.ts` (`REPORT_TYPES`) uses six keys:
`air | water | hazwaste_generator | hazwaste_tsd | eia | survey`.
`ReportListCard.tsx`'s `REPORT_ICONS` uses a different, five-key
vocabulary: `air_monitoring | water_monitoring | hazardous_waste | eia
| survey` (TSD collapsed into generator). The Export tab has to
group/label by report type and will hit this divergence directly, so
this branch reconciles it: `REPORT_ICONS` (or its replacement) is
keyed on the same `ReportTypeKey` union `REPORT_TYPES` already
exports, with `AllReportItem`'s type field mapped once at the data
boundary in `useEstablishment.ts` rather than re-interpreted per
consumer.

`REPORT_TYPES` gains a `shortTitle` field per entry (e.g. "Hazwaste
TSD" for "Hazardous Waste Treaters and TSD Facilities") — needed for
the speed dial's row labels; the full `title` remains the
`accessibilityLabel` and is used wherever space allows (e.g. the
Export tab's filter list).

### Tab bar

`HomeTabs` drops the `create` tab. Three tabs remain: **Manage
Reports** (new default), **Manage Establishments**, **Export
Inspection Reports**. The active-tab underline's hardcoded `#5b4fcf`
becomes `Colors.accent`, a named token, rather than staying a
file-local hex with no brand meaning.

`HomeScreen`'s `activeTab` state and `renderTab` switch update to drop
`create`/`export`-placeholder and add `exportReports`; default state
becomes `'manageReports'`.

### Floating action button + speed dial

**New components**: `src/features/home/components/Fab.tsx`,
`SpeedDial.tsx`.

- **Trigger**: circular FAB, `elevation.fab`, positioned bottom-right
  above `HomeFooter` and any active `useScreenFooter` bar.
- **Open state**: scrim fades in over `motion.duration.short` (150ms);
  six rows spring in bottom-up with a 30ms stagger, each a pill label
  (short title + law reference as secondary line) beside a 40dp
  circular icon button reusing each report type's existing SVG icon
  asset and palette (`bgColor`/`borderColor`/`textColor` from
  `REPORT_TYPES`). The FAB's `+` glyph rotates 45° into `×`.
- **Close**: scrim tap, row selection, or Android hardware back —
  requires adding `BackHandler` (not present anywhere in the codebase
  today) scoped to while the dial is open, so back doesn't fall through
  to screen navigation while it's showing.
- **Selection**: each row's press goes through `useGuardedPress` (same
  guard `ReportTypeCard` uses today) before calling
  `router.push(item.route)`, prevents a double-tap from pushing the
  route twice.
- **Reduced motion**: open/close driven entirely through the
  `motion.ts` `animateOrSnap` helper — under reduce-motion the dial
  and scrim appear/disappear without the fade/spring/stagger.
- **Accessibility**: FAB has `accessibilityRole="button"` and a label
  that changes with state ("Create new report" / "Close report type
  menu"); each row's `accessibilityLabel` is the full legal `title`,
  not the `shortTitle`.

**Visibility**: mounted in `(app)/_layout.tsx`'s `AppChrome`, gated by
a route allowlist — visible on `/home` and `/establishment/[id]`;
hidden on `/inspection/*`, `/survey/*`, `/report/new`, and
`/establishment/edit`. Additionally hidden on the Export tab whenever
its selection bar is showing, so it can't overlap a screen's own
footer actions.

### Export Inspection Reports tab (UI shell only)

**Extraction**: `ManageReportsTab.tsx` (641 lines) has its filter
sheet, search, sort, and pagination logic pulled into a
`useReportBrowser` hook and a shared `ReportFilterSheet` component
(new files under `src/features/establishments/`), consumed by both
`ManageReportsTab` and the new `ExportReportsTab`. This is scoped,
targeted refactoring justified by the new tab's direct need for the
same filtering — not a broader cleanup of that file.

**New component**: `src/features/establishments/components/
ExportReportsTab.tsx`, using `useReportBrowser` +
`ReportFilterSheet` for filtering, and a selection-mode variant of
`ReportListCard`:

- `ReportListCard` gains a `selectable` prop: renders a leading
  checkbox and suppresses its existing swipe actions while in
  selection mode (swipe-to-edit/delete doesn't make sense mid-select).
- A "select all in current filter" control above the list.
- A pinned selection bar (bottom, above the FAB's usual position — FAB
  hides while this is showing) showing the selected count and, when
  any selected report has `reportStatus === 'draft'`, a warning
  `Badge` + summary line ("3 of 8 selected are drafts and may be
  incomplete") — per the confirmed decision that drafts are
  includable but flagged, not excluded.
- A **Generate** button, rendered disabled via the standard `Button`
  component's `disabled` state, with adjacent copy stating the
  capability arrives in a future release. No file is written by this
  tab on this branch — the button is real UI, not live functionality.

### Deletions

`CreateNewReportTab.tsx` and `ReportTypeCard.tsx` lose their only
consumer and are deleted (git history retains them if a full-screen
picker variant is wanted later). `REPORT_TYPES` and the report-type
SVG assets are retained — the speed dial consumes them directly.

## Testing

- Drift-guard Jest test (fails on new raw hex / numeric font-size or
  border-radius outside `src/design/`), seeded with an allowlist
  covering every file this branch doesn't touch.
- Unit tests: `SpeedDial` open/close and reduced-motion behavior
  (mocked `useReducedMotion`), `BackHandler` dismissal, `Touchable`'s
  hit-target/accessibility enforcement, `ExportReportsTab` selection
  logic including the draft-count warning, default-tab selection.
- Existing suites (`TextField.test.tsx`, `MarqueeText.test.tsx`,
  `App.test.tsx`) continue to pass unmodified.
- Manual, on-device (the connected `adb` device): before/after
  screenshots of Home, the open speed dial, the Establishments list
  (to evaluate the `body`-14 density trade-off directly, per the
  user's confirmation to proceed on measurement), and the Export tab
  in both its default and selection-mode states.

## Risks / open questions carried forward

- **Body-14 density on dense screens** (compliance tables,
  `WaterComplianceEditSections.tsx` and similar) is unverified until
  measured on-device during implementation. Documented fallback: body
  13, same 11px floor.
- **`.docx` generation feasibility** (Hermes + OOXML zip/template
  library, licensing) is unresolved and explicitly deferred to its own
  spike/spec, not blocking this branch.
