# Modern UI Harmony Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a design token foundation (spacing, type, radius, elevation, motion) with the primitives that carry it, and restructure the Home screen — replacing the "Create New Report" tab with a speed-dial FAB and adding an "Export Inspection Reports" tab shell.

**Architecture:** Static token modules under `src/design/` consumed by ordinary `StyleSheet.create` calls (no runtime theme provider, no new dependencies), plus shared primitives in `src/components/`. A Jest drift-guard test with a shrinking allowlist prevents re-drift. Home's create-flow moves from a permanent tab into a speed-dial FAB mounted in the shared chrome; a new Export tab reuses the existing report filtering via an extracted `useReportBrowser` hook.

**Tech Stack:** React Native 0.83 / Expo 55, Expo Router, TypeScript (strict), Reanimated 4, WatermelonDB, Jest + react-test-renderer.

**Spec:** `docs/superpowers/specs/2026-09-03-modern-ui-harmony-design.md`

## Global Constraints

- **Branch:** `feature/modern-ui-harmony` (already created off `develop`).
- **Commit format:** Conventional Commits. `commitlint.config.js` enforces a `scope-enum` — allowed scopes are ONLY: `auth`, `sync`, `snapshot`, `air`, `water`, `hazwaste`, `eia`, `survey`, `establishments`, `reports`, `ci`, `repo`, `db`, `supabase`, `router`. There is **no `design` or `ui` scope** — use `reports`, `establishments`, or `repo`. A disallowed scope fails the commit-msg hook.
- **Pre-commit hook runs the full Jest suite** (`.husky/pre-commit` → `npm test`). Every commit therefore requires a green suite. Allow ~60s per commit.
- **Every commit message ends with:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- **Type scale (confirmed with the user, do not renegotiate):** `body` = 14/20, absolute floor = 11. Fallback if compliance tables measurably break on-device: body 13, floor stays 11.
- **Spacing scale:** `0, 2, 4, 8, 12, 16, 24, 32, 48`. `6` is deliberately NOT on the scale — existing `6`s resolve to `4` (icon-to-text gaps) or `8` (everything else).
- **Imports:** every file this plan MODIFIES must import from `src/design/...`, never from the `src/constants/colors.ts` shim. Use relative paths (`../../design/colors`) — the codebase does not use the `@/` alias despite it being configured.
- **New files must be drift-guard clean from the start:** no raw hex literals, no numeric `fontSize:`/`borderRadius:` literals. Both come from tokens.
- **Verification commands:** `npm test`, `npm run lint` (`--max-warnings 0`), `npm run typecheck`.

---

## File Structure

**New — `src/design/` (the token layer):**
- `spacing.ts` — `Spacing` scale
- `typography.ts` — `Type` scale
- `radius.ts` — `Radius` scale
- `elevation.ts` — `Elevation` levels (iOS `shadow*` + Android `elevation` together)
- `motion.ts` — `Duration`, `Spring`, `useMotion()` reduced-motion gate
- `colors.ts` — moved from `src/constants/colors.ts`, plus `Colors.accent`
- `tokens.ts` / `index.ts` — barrels
- `driftGuard.ts` — scan logic shared by the test
- `driftGuardAllowlist.json` — generated allowlist of not-yet-migrated files
- `__tests__/driftGuard.test.ts`, `__tests__/motion.test.tsx`

**New — `src/components/` (primitives carrying the tokens):**
- `Touchable.tsx` — 48dp target enforcement + required a11y props
- `Card.tsx`, `Badge.tsx`, `Section.tsx`, `EmptyState.tsx`, `Skeleton.tsx`

**New — Home restructure:**
- `src/constants/reportTypeDisplay.ts` — single source of truth for recorded-report type display
- `src/features/home/components/Fab.tsx`, `SpeedDial.tsx`
- `src/features/home/context/FabVisibilityContext.tsx`
- `src/features/establishments/hooks/useReportBrowser.ts`
- `src/features/establishments/components/ReportFilterSheet.tsx`
- `src/features/establishments/components/ExportReportsTab.tsx`

**Modified:**
- `src/constants/colors.ts` → one-line re-export shim
- `src/constants/reportTypes.ts` → adds `dataKey` + `shortTitle` per entry
- `src/features/establishments/hooks/useEstablishment.ts` → `INSPECTION_TYPE_LABELS` derived from `REPORT_TYPE_DISPLAY`
- `src/features/establishments/components/ReportListCard.tsx` → correct per-type icon/color, selectable mode, token migration
- `src/features/establishments/components/ManageReportsTab.tsx` → consumes extracted hook + sheet, token migration
- `src/features/home/components/HomeTabs.tsx` → three tabs, `Colors.accent`
- `src/app/(app)/home.tsx` → default tab, Export tab wiring, token migration
- `src/app/(app)/_layout.tsx` → mounts `SpeedDial`, adds `FabVisibilityProvider`

**Deleted:**
- `src/features/inspections/components/CreateNewReportTab.tsx`
- `src/features/inspections/components/ReportTypeCard.tsx`

(Verified: `home.tsx` is the only consumer of `CreateNewReportTab`, and `CreateNewReportTab` is the only consumer of `ReportTypeCard`.)

---

### Task 1: Spacing, radius, and elevation tokens

**Files:**
- Create: `src/design/spacing.ts`
- Create: `src/design/radius.ts`
- Create: `src/design/elevation.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Spacing` (`none|xxs|xs|sm|md|lg|xl|xxl|xxxl` → `0|2|4|8|12|16|24|32|48`), `Radius` (`xs|sm|md|lg|xl|pill` → `4|6|8|12|16|999`), `Elevation` (`flat|raised|overlay|modal|fab`, each a style object with `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`/`elevation`).

- [ ] **Step 1: Write `src/design/spacing.ts`**

```ts
// One 4dp rhythm for every gap, pad, and margin in the app. `xxs` (2) is
// kept for the icon-to-text hairline. 6 is deliberately absent: it was the
// most common value in the pre-token codebase (121 uses) but sits off the
// rhythm — those sites resolve to `xs` (icon/text gaps) or `sm` (everything
// else) rather than earning the scale a permanent exception.
export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof Spacing;
```

- [ ] **Step 2: Write `src/design/radius.ts`**

```ts
// Six corner radii, down from the 17 distinct values in use before this.
// `pill` is deliberately far larger than any control it's applied to — RN
// clamps it to half the shorter side, which is what makes it read as a
// capsule at any height.
export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof Radius;
```

- [ ] **Step 3: Write `src/design/elevation.ts`**

```ts
// Each level emits the iOS shadow properties AND the Android elevation
// value together. React Native ignores whichever set doesn't apply to the
// running platform, so a single spread keeps the two in step — the bug this
// prevents is real: EstablishmentCard shipped `shadowOpacity: 0.04` beside
// `elevation: 1`, which do not read as the same weight on the two platforms.
interface ElevationStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const SHADOW_COLOR = '#000000';

function level(height: number, opacity: number, radius: number, elevation: number): ElevationStyle {
  return {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const Elevation = {
  flat: level(0, 0, 0, 0),
  raised: level(1, 0.08, 3, 2),
  overlay: level(3, 0.12, 8, 4),
  modal: level(6, 0.16, 16, 8),
  fab: level(4, 0.2, 10, 6),
} as const;

export type ElevationToken = keyof typeof Elevation;
```

- [ ] **Step 4: Verify types and lint pass**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/design/spacing.ts src/design/radius.ts src/design/elevation.ts
git commit -m "$(cat <<'EOF'
feat(repo): add spacing, radius, and elevation design tokens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Typography tokens

**Files:**
- Create: `src/design/typography.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Type` — a record of 8 named sizes, each `{ fontSize: number; lineHeight: number }`: `display` 24/30, `title` 20/26, `heading` 17/24, `subheading` 15/21, `body` 14/20, `bodySm` 13/18, `label` 12/16, `caption` 11/14. Also `FONT_SCALING` — the app's `allowFontScaling` policy constants, first consumed in Task 16 (the monospace control-number line opts out) and applied broadly during the later table migrations.

- [ ] **Step 1: Write `src/design/typography.ts`**

```ts
// Eight sizes, down from the 13 distinct values in use before this. Two
// things matter here and were decided deliberately:
//
//   1. `body` is 14, not the 12 the app previously used for body copy. The
//      old scale bottomed out at 7-9px, which is not legible on a phone
//      held at arm's length in daylight — the actual working condition for
//      an environmental inspector. 11 is now the absolute floor.
//   2. Every entry carries its own lineHeight. Setting fontSize without
//      lineHeight was the main source of uneven vertical rhythm between
//      screens that otherwise used the same size.
export const Type = {
  display: { fontSize: 24, lineHeight: 30 },
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 17, lineHeight: 24 },
  subheading: { fontSize: 15, lineHeight: 21 },
  body: { fontSize: 14, lineHeight: 20 },
  bodySm: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16 },
  caption: { fontSize: 11, lineHeight: 14 },
} as const;

export type TypeToken = keyof typeof Type;

// The app previously left `allowFontScaling` unset everywhere, which means
// the OS font-size setting silently resized everything — including
// fixed-width table cells that break when it does. These are the two
// deliberate positions: prose scales, tabular content does not.
export const FONT_SCALING = {
  content: true,
  tabular: false,
} as const;
```

- [ ] **Step 2: Verify types and lint pass**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/design/typography.ts
git commit -m "$(cat <<'EOF'
feat(repo): add typography scale with an 11px floor

Body copy moves from 12 to 14 and the floor rises from 7 to 11 — the old
sizes were not legible on a phone at arm's length in daylight, which is the
working condition this app is used in.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Motion tokens and the reduced-motion gate

**Files:**
- Create: `src/design/motion.ts`
- Test: `src/design/__tests__/motion.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Duration` (`fast` 100, `short` 150, `base` 200, `slow` 300), `Spring` (`press`, `sheet` — `WithSpringConfig` objects), and `useMotion(): { reduced: boolean; timing(toValue, config?): number; spring(toValue, config?): number }`. `timing`/`spring` are worklets that return the raw target when reduced motion is on, and delegate to `withTiming`/`withSpring` otherwise.

**Critical testing note for this and every later animated task:** `jest.config.js` maps `react-native-reanimated` to `react-native-reanimated/mock`, and that mock does **not** export `useReducedMotion` (its source has the line `// useReducedMotion: ADD ME IF NEEDED`). Any component calling it throws under Jest unless the test file overrides the module. The override pattern below is the one every later animated test reuses. Note also that the mock's `withTiming`/`withSpring` return `toValue` synchronously — so assertions must check *whether they were called*, not what they returned.

- [ ] **Step 1: Write the failing test at `src/design/__tests__/motion.test.tsx`**

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(),
    withTiming: jest.fn(actual.withTiming),
    withSpring: jest.fn(actual.withSpring),
  };
});

import { useReducedMotion, withTiming, withSpring } from 'react-native-reanimated';
import { useMotion } from '../motion';

type MotionResult = ReturnType<typeof useMotion>;

function Harness({ onResult }: { onResult: (r: MotionResult) => void }) {
  onResult(useMotion());
  return null;
}

function renderMotion(): MotionResult {
  let captured!: MotionResult;
  act(() => {
    TestRenderer.create(<Harness onResult={r => { captured = r; }} />);
  });
  return captured;
}

describe('useMotion', () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReset();
    (withTiming as jest.Mock).mockClear();
    (withSpring as jest.Mock).mockClear();
  });

  it('drives animations through Reanimated when motion is not reduced', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const motion = renderMotion();

    expect(motion.reduced).toBe(false);
    motion.timing(10);
    motion.spring(20);
    expect(withTiming).toHaveBeenCalledWith(10, undefined);
    expect(withSpring).toHaveBeenCalledWith(20, undefined);
  });

  it('snaps straight to the target value when reduced motion is enabled', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const motion = renderMotion();

    expect(motion.reduced).toBe(true);
    expect(motion.timing(10)).toBe(10);
    expect(motion.spring(20)).toBe(20);
    expect(withTiming).not.toHaveBeenCalled();
    expect(withSpring).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/design/__tests__/motion.test.tsx`
Expected: FAIL — `Cannot find module '../motion'`.

- [ ] **Step 3: Write `src/design/motion.ts`**

```ts
import {
  useReducedMotion,
  withSpring,
  withTiming,
  WithSpringConfig,
  WithTimingConfig,
} from 'react-native-reanimated';

export const Duration = {
  fast: 100,
  short: 150,
  base: 200,
  slow: 300,
} as const;

export const Spring = {
  press: { damping: 15, stiffness: 300, mass: 1 } as WithSpringConfig,
  sheet: { damping: 18, stiffness: 200, mass: 1 } as WithSpringConfig,
} as const;

// Every token-driven animation in the app goes through this rather than
// calling withTiming/withSpring directly, so honoring the OS "reduce motion"
// setting is the default instead of something each component has to
// remember. Under reduced motion the target value is returned as-is, which
// assigns to a shared value as an instant state change.
export function useMotion() {
  const reduced = useReducedMotion();

  const timing = (toValue: number, config?: WithTimingConfig): number => {
    'worklet';
    return reduced ? toValue : withTiming(toValue, config);
  };

  const spring = (toValue: number, config?: WithSpringConfig): number => {
    'worklet';
    return reduced ? toValue : withSpring(toValue, config);
  };

  return { reduced, timing, spring };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/design/__tests__/motion.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Verify types and lint pass**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/design/motion.ts src/design/__tests__/motion.test.tsx
git commit -m "$(cat <<'EOF'
feat(repo): add motion tokens and a reduced-motion gate

useMotion() wraps withTiming/withSpring so honoring the OS reduce-motion
setting is the default rather than per-component discipline. The app had no
reduced-motion handling at all before this.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Relocate colors and add the accent token

**Files:**
- Create: `src/design/colors.ts` (moved content)
- Create: `src/design/tokens.ts`, `src/design/index.ts`
- Modify: `src/constants/colors.ts` (becomes a shim)

**Interfaces:**
- Consumes: nothing.
- Produces: `Colors` from `src/design/colors` with one new entry, `Colors.accent = '#5b4fcf'`. `src/design/tokens.ts` re-exports `Colors`, `Spacing`, `Type`, `Radius`, `Elevation`, `Duration`, `Spring`, `useMotion`, `FONT_SCALING`.

- [ ] **Step 1: Move the colors file with git so history follows it**

```bash
git mv src/constants/colors.ts src/design/colors.ts
```

- [ ] **Step 2: Add the accent token to `src/design/colors.ts`**

Insert immediately after the `greenMuted: '#d1fae5',` line, inside the "Primary brand" block:

```ts
  // The active-tab underline color. It shipped as a bare '#5b4fcf' inside
  // HomeTabs and existed nowhere else in the palette — named here so the one
  // place it's used isn't the definition of it.
  accent: '#5b4fcf',
```

- [ ] **Step 3: Replace `src/constants/colors.ts` with a shim**

```ts
// Moved to src/design/colors.ts. This re-export keeps the ~40 files that
// haven't been migrated to the token layer working; it is deleted once the
// drift-guard allowlist is empty.
export { Colors } from '../design/colors';
```

- [ ] **Step 4: Write `src/design/tokens.ts`**

```ts
export { Colors } from './colors';
export { Spacing } from './spacing';
export { Radius } from './radius';
export { Elevation } from './elevation';
export { Type, FONT_SCALING } from './typography';
export { Duration, Spring, useMotion } from './motion';
```

- [ ] **Step 5: Write `src/design/index.ts`**

```ts
export * from './tokens';
```

- [ ] **Step 6: Verify nothing broke**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0. Every existing `import { Colors } from '.../constants/colors'` still resolves through the shim.

- [ ] **Step 7: Commit**

```bash
git add src/design/colors.ts src/design/tokens.ts src/design/index.ts src/constants/colors.ts
git commit -m "$(cat <<'EOF'
refactor(repo): move colors into the design token layer

Adds Colors.accent for the tab underline, which previously existed only as a
bare hex inside HomeTabs. constants/colors.ts stays as a re-export shim until
the remaining consumers are migrated.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Design-token drift guard

**Files:**
- Create: `src/design/driftGuard.ts`
- Create: `src/design/driftGuardAllowlist.json`
- Test: `src/design/__tests__/driftGuard.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `HEX_PATTERN`, `NUMERIC_TOKEN_PATTERN`, `SRC_ROOT`, `DESIGN_DIR`, `listTsxFiles(): string[]` (absolute paths), `findOffenders(pattern: RegExp, allow: Set<string>): string[]` (src-relative, forward-slashed).

**Why this exists:** the codebase already went through one unification pass (the one that produced `Button.tsx`), and drifted back to 45 loose hex values and 12 font sizes. Without an enforced guard this happens again.

- [ ] **Step 1: Write `src/design/driftGuard.ts`**

```ts
import * as fs from 'fs';
import * as path from 'path';

export const SRC_ROOT = path.resolve(__dirname, '..');
export const DESIGN_DIR = __dirname;

// Deliberately NOT global-flagged: `.test()` on a /g regex advances
// lastIndex between calls, which silently skips matches when the same
// pattern object is reused across many files.
export const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;
export const NUMERIC_TOKEN_PATTERN = /\b(fontSize|borderRadius)\s*:\s*[0-9]+(\.[0-9]+)?\b/;

export function listTsxFiles(dir: string = SRC_ROOT, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listTsxFiles(full, files);
    } else if (entry.isFile() && full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

export function toRelative(file: string): string {
  return path.relative(SRC_ROOT, file).split(path.sep).join('/');
}

export function findOffenders(pattern: RegExp, allow: Set<string>): string[] {
  return listTsxFiles()
    .filter(file => !file.startsWith(DESIGN_DIR))
    .map(toRelative)
    .filter(rel => !allow.has(rel))
    .filter(rel => pattern.test(fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8')));
}
```

- [ ] **Step 2: Seed the allowlist from today's violations**

Run exactly this (the regexes are byte-identical to `driftGuard.ts`):

```bash
node -e "
const fs = require('fs');
const path = require('path');
const SRC_ROOT = path.resolve('src');
const DESIGN_DIR = path.resolve('src/design');
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const NUM = /\b(fontSize|borderRadius)\s*:\s*[0-9]+(\.[0-9]+)?\b/;
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && full.endsWith('.tsx')) out.push(full);
  }
  return out;
}
const offenders = walk(SRC_ROOT, [])
  .filter(f => !f.startsWith(DESIGN_DIR))
  .filter(f => { const c = fs.readFileSync(f, 'utf8'); return HEX.test(c) || NUM.test(c); })
  .map(f => path.relative(SRC_ROOT, f).split(path.sep).join('/'))
  .sort();
fs.writeFileSync('src/design/driftGuardAllowlist.json', JSON.stringify(offenders, null, 2) + '\n');
console.log('Allowlisted', offenders.length, 'files');
"
```

Expected: prints a count (roughly 40-50 files). Inspect the JSON — it must contain existing files like `features/establishments/components/ReportListCard.tsx` and `features/home/components/HomeTabs.tsx`, and must NOT contain anything under `design/`.

- [ ] **Step 3: Write the test at `src/design/__tests__/driftGuard.test.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/design/__tests__/driftGuard.test.ts`
Expected: PASS, 2 tests. (Everything violating is allowlisted; nothing else violates.)

- [ ] **Step 5: Prove the guard actually catches drift**

```bash
printf 'const DRIFT = { fontSize: 13 };\n' > src/components/__driftprobe.tsx
npx jest src/design/__tests__/driftGuard.test.ts
```

Expected: FAIL, naming `components/__driftprobe.tsx`. Then remove the probe and confirm it passes again:

```bash
rm -f src/components/__driftprobe.tsx
npx jest src/design/__tests__/driftGuard.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/design/driftGuard.ts src/design/driftGuardAllowlist.json src/design/__tests__/driftGuard.test.ts
git commit -m "$(cat <<'EOF'
test(repo): add a design token drift guard

Fails CI on a new raw hex or numeric fontSize/borderRadius literal outside
the token layer. Ships with an allowlist of the not-yet-migrated files, which
each later sweep shrinks.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Touchable primitive

**Files:**
- Create: `src/components/Touchable.tsx`
- Test: `src/components/Touchable.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Touchable` — props are `Omit<PressableProps, 'style' | 'hitSlop'>` plus **required** `accessibilityRole: NonNullable<PressableProps['accessibilityRole']>` and **required** `accessibilityLabel: string`, plus optional `style?: StyleProp<ViewStyle>` and `minTargetSize?: number` (default 48).

**Why the a11y props are required:** the app has 138 `TouchableOpacity` call sites against 2 `accessibilityRole` and 5 `accessibilityLabel`. Non-optional props mean `tsc --noEmit` fails instead of the omission shipping silently.

- [ ] **Step 1: Write the failing test at `src/components/Touchable.test.tsx`**

```tsx
import React from 'react';
import { Pressable } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Touchable } from './Touchable';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const layout = (r: Renderer, width: number, height: number) => {
  act(() => {
    r.root.findByType(Pressable).props.onLayout({ nativeEvent: { layout: { width, height } } });
  });
};

describe('Touchable', () => {
  it('pads a small control out to a 48dp hit target', () => {
    const r = render(
      <Touchable accessibilityRole="button" accessibilityLabel="Sync now" onPress={() => {}} />,
    );

    layout(r, 24, 24);

    expect(r.root.findByType(Pressable).props.hitSlop).toEqual({
      top: 12, bottom: 12, left: 12, right: 12,
    });
  });

  it('adds no hit slop to a control that already meets the target', () => {
    const r = render(
      <Touchable accessibilityRole="button" accessibilityLabel="Sync now" onPress={() => {}} />,
    );

    layout(r, 56, 56);

    expect(r.root.findByType(Pressable).props.hitSlop).toEqual({
      top: 0, bottom: 0, left: 0, right: 0,
    });
  });

  it('forwards the accessibility contract to the underlying Pressable', () => {
    const r = render(
      <Touchable accessibilityRole="checkbox" accessibilityLabel="Select report" onPress={() => {}} />,
    );

    const pressable = r.root.findByType(Pressable);
    expect(pressable.props.accessibilityRole).toBe('checkbox');
    expect(pressable.props.accessibilityLabel).toBe('Select report');
  });

  it('still calls a caller-supplied onLayout', () => {
    const onLayout = jest.fn();
    const r = render(
      <Touchable
        accessibilityRole="button"
        accessibilityLabel="Sync now"
        onPress={() => {}}
        onLayout={onLayout}
      />,
    );

    layout(r, 24, 24);

    expect(onLayout).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/components/Touchable.test.tsx`
Expected: FAIL — `Cannot find module './Touchable'`.

- [ ] **Step 3: Write `src/components/Touchable.tsx`**

```tsx
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Android asks for 48dp of tappable area. Rather than inflating the visual
// box of small controls, the shortfall is made up invisibly with hitSlop —
// the same trick Button.tsx uses, generalized to a control of any size by
// measuring it instead of being told its height up front.
const MIN_TARGET = 48;

export interface TouchableProps extends Omit<PressableProps, 'style' | 'hitSlop'> {
  // Required, not optional: the app shipped 138 touch targets with 2
  // accessibilityRoles between them. Putting these in the type is what stops
  // that recurring.
  accessibilityRole: NonNullable<PressableProps['accessibilityRole']>;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  minTargetSize?: number;
}

const NO_SLOP = { top: 0, bottom: 0, left: 0, right: 0 };

export const Touchable: React.FC<TouchableProps> = ({
  style,
  minTargetSize = MIN_TARGET,
  onLayout,
  children,
  ...rest
}) => {
  const [hitSlop, setHitSlop] = useState(NO_SLOP);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      const vertical = Math.max(0, Math.round((minTargetSize - height) / 2));
      const horizontal = Math.max(0, Math.round((minTargetSize - width) / 2));
      setHitSlop({ top: vertical, bottom: vertical, left: horizontal, right: horizontal });
      onLayout?.(event);
    },
    [minTargetSize, onLayout],
  );

  return (
    <Pressable style={style} hitSlop={hitSlop} onLayout={handleLayout} {...rest}>
      {children}
    </Pressable>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/Touchable.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0 — the drift guard must still pass, since `Touchable.tsx` has no hex and no numeric `fontSize`/`borderRadius`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Touchable.tsx src/components/Touchable.test.tsx
git commit -m "feat(repo): add Touchable with enforced 48dp targets and a11y props

Measures its own box and makes up the shortfall to 48dp with hitSlop.
accessibilityRole and accessibilityLabel are required by the type, so a new
touch target cannot ship without them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Card primitive

**Files:**
- Create: `src/components/Card.tsx`

**Interfaces:**
- Consumes: `Colors`, `Radius`, `Spacing`, `Elevation`.
- Produces: `Card` — `ViewProps` plus `style?: StyleProp<ViewStyle>` and `padded?: boolean` (default `true`).

- [ ] **Step 1: Write `src/components/Card.tsx`**

```tsx
import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Colors } from '../design/colors';
import { Elevation } from '../design/elevation';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  // Cards that lay out their own internal padding (a list row with a
  // full-bleed leading element, say) opt out rather than fighting it.
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ style, padded = true, children, ...rest }) => (
  <View style={[styles.base, padded && styles.padded, style]} {...rest}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    ...Elevation.raised,
  },
  padded: {
    padding: Spacing.lg,
  },
});
```

- [ ] **Step 2: Verify types, lint, and the drift guard**

Run: `npm run typecheck && npm run lint && npx jest src/design/__tests__/driftGuard.test.ts`
Expected: all exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/Card.tsx
git commit -m "feat(repo): add token-driven Card primitive

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Badge primitive

**Files:**
- Create: `src/components/Badge.tsx`
- Test: `src/components/Badge.test.tsx`

**Interfaces:**
- Consumes: `Colors`, `Radius`, `Spacing`, `Type`.
- Produces: `Badge` (`{ label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle> }`) and `BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'`.

Every tone maps onto colors already in `Colors` — no new color values. `info` uses the air palette because that is the only genuinely blue badge pair in the existing set.

- [ ] **Step 1: Write the failing test at `src/components/Badge.test.tsx`**

```tsx
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Badge } from './Badge';
import { Colors } from '../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

describe('Badge', () => {
  it('renders its label', () => {
    const r = render(<Badge label="Draft" />);
    expect(r.root.findByType(Text).props.children).toBe('Draft');
  });

  it('colors the label from the requested tone', () => {
    const r = render(<Badge label="Pending sync" tone="warning" />);
    expect(flatten(r.root.findByType(Text).props.style).color).toBe(Colors.warning.text);
  });

  it('defaults to the neutral tone', () => {
    const r = render(<Badge label="+2" />);
    expect(flatten(r.root.findByType(Text).props.style).color).toBe(Colors.textSecondary);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/components/Badge.test.tsx`
Expected: FAIL — `Cannot find module './Badge'`.

- [ ] **Step 3: Write `src/components/Badge.tsx`**

```tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

// Every tone reuses a pair already present in the palette rather than
// introducing new values — these are the fills the hand-rolled chips across
// the app were already reaching for.
const TONE: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: Colors.bgLight, text: Colors.textSecondary },
  success: { bg: Colors.greenMuted, text: Colors.green },
  warning: { bg: Colors.warning.badgeBg, text: Colors.warning.text },
  danger: { bg: Colors.conflictMuted, text: Colors.conflict },
  info: { bg: Colors.air.badgeBg, text: Colors.air.badgeText },
};

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', style }) => {
  const { bg, text } = TONE[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  label: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/Badge.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Verify types, lint, and the drift guard**

Run: `npm run typecheck && npm run lint && npx jest src/design/__tests__/driftGuard.test.ts`
Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Badge.tsx src/components/Badge.test.tsx
git commit -m "feat(repo): add token-driven Badge primitive

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Section, EmptyState, and Skeleton primitives

**Files:**
- Create: `src/components/Section.tsx`
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/Skeleton.tsx`
- Test: `src/components/Skeleton.test.tsx`

**Interfaces:**
- Consumes: `Colors`, `Radius`, `Spacing`, `Type`, `Duration`, `useMotion`.
- Produces:
  - `Section` — `{ title: string; right?: React.ReactNode; children?: React.ReactNode; style?: StyleProp<ViewStyle> }`
  - `EmptyState` — `{ icon: keyof typeof Ionicons.glyphMap; message: string; action?: React.ReactNode }`
  - `Skeleton` — `{ width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }`

Grouped because they are small leaf components with no interdependencies, and Tasks 15 and 17 consume all three together.

- [ ] **Step 1: Write `src/components/Section.tsx`**

```tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../design/colors';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

interface SectionProps {
  title: string;
  // Trailing slot for a count, a "select all" action, or similar.
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Section: React.FC<SectionProps> = ({ title, right, children, style }) => (
  <View style={style}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
});
```

- [ ] **Step 2: Write `src/components/EmptyState.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, action }) => (
  <View style={styles.container}>
    {/* Decorative — the message beside it carries the meaning. */}
    <Ionicons name={icon} size={40} color={Colors.border} importantForAccessibility="no" />
    <Text style={styles.message}>{message}</Text>
    {action}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  message: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
```

- [ ] **Step 3: Write the failing test at `src/components/Skeleton.test.tsx`**

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(),
    withRepeat: jest.fn(actual.withRepeat),
  };
});

import { useReducedMotion, withRepeat } from 'react-native-reanimated';
import { Skeleton } from './Skeleton';

const render = (element: React.ReactElement) => {
  act(() => { TestRenderer.create(element); });
};

describe('Skeleton', () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReset();
    (withRepeat as jest.Mock).mockClear();
  });

  it('pulses when motion is not reduced', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    render(<Skeleton />);
    expect(withRepeat).toHaveBeenCalled();
  });

  it('renders a static placeholder under reduced motion', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    render(<Skeleton />);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx jest src/components/Skeleton.test.tsx`
Expected: FAIL — `Cannot find module './Skeleton'`.

- [ ] **Step 5: Write `src/components/Skeleton.tsx`**

```tsx
import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../design/colors';
import { Duration, useMotion } from '../design/motion';
import { Radius } from '../design/radius';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const RESTING_OPACITY = 0.4;
const PULSE_OPACITY = 0.8;
const STATIC_OPACITY = 0.5;

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  radius = Radius.sm,
  style,
}) => {
  const { reduced } = useMotion();
  const opacity = useSharedValue(RESTING_OPACITY);

  useEffect(() => {
    if (reduced) {
      // A settled value rather than a paused animation — a loading
      // placeholder that never resolves visually is worse than a static one.
      opacity.value = STATIC_OPACITY;
      return;
    }
    opacity.value = withRepeat(withTiming(PULSE_OPACITY, { duration: Duration.slow }), -1, true);
  }, [reduced, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgDisabled,
  },
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/components/Skeleton.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 7: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/Section.tsx src/components/EmptyState.tsx src/components/Skeleton.tsx src/components/Skeleton.test.tsx
git commit -m "feat(repo): add Section, EmptyState, and Skeleton primitives

Skeleton settles to a static placeholder under reduced motion rather than
pulsing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Reconcile the two report-type vocabularies

**Files:**
- Create: `src/constants/reportTypeDisplay.ts`
- Modify: `src/constants/reportTypes.ts` (add `dataKey` and `shortTitle` to the `ReportType` interface and all 6 entries)
- Modify: `src/features/establishments/hooks/useEstablishment.ts:533-539` (derive `INSPECTION_TYPE_LABELS`)
- Modify: `src/features/establishments/components/ReportListCard.tsx:23-29,145-147,287-295` (drop local `REPORT_ICONS`, use the shared map)

**Interfaces:**
- Consumes: `Colors`.
- Produces: `ReportDataKey = 'air_monitoring' | 'water_monitoring' | 'hazardous_waste' | 'eia' | 'survey'`, `ReportTypeDisplay` (`{ label, icon, bgColor, borderColor, textColor, badgeBg, badgeText }`), `REPORT_TYPE_DISPLAY: Record<ReportDataKey, ReportTypeDisplay>`. `ReportType` gains `dataKey: ReportDataKey` and `shortTitle: string`.

**The problem being fixed.** The app carries two different report-type vocabularies:

- `REPORT_TYPES` in `src/constants/reportTypes.ts` — six keys (`air`, `water`, `hazwaste_generator`, `hazwaste_tsd`, `eia`, `survey`). This is the **create-flow** vocabulary: which form to open.
- The stored `reportType` column, surfaced through `INSPECTION_TYPE_LABELS` and `ReportListCard`'s `REPORT_ICONS` — five keys (`air_monitoring`, `water_monitoring`, `hazardous_waste`, `eia`, `survey`). This is the **recorded-report** vocabulary; the two hazwaste create-flows both land in `hazardous_waste`.

They are not the same set and cannot be flattened into one — the many-to-one is legitimate. What is *not* legitimate is that they drifted independently, producing two live bugs:

1. **Swapped icons.** `REPORT_TYPES` uses `document-text-outline` for eia and `globe-outline` for survey; `REPORT_ICONS` uses `globe-outline` for eia and `leaf-outline` for survey.
2. **Every report card is water-blue.** `ReportListCard`'s `iconWrap` hardcodes `backgroundColor: Colors.water.bg` and the glyph `color={Colors.water.text}` for *all* types, so an air or hazwaste report renders with the water palette.

This task makes `REPORT_TYPE_DISPLAY` the single source of truth for the recorded-report vocabulary, and gives each create-flow entry an explicit typed link (`dataKey`) to the bucket it produces.

- [ ] **Step 1: Write `src/constants/reportTypeDisplay.ts`**

```ts
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';

// How an ALREADY-RECORDED report of a given type is labeled and colored.
// The data layer only distinguishes five types: both create-flow hazwaste
// entries (generator and TSD — see ReportTypeKey in reportTypes.ts) store
// 'hazardous_waste', because the distinction only matters while choosing
// which form to open.
//
// This is the single source of truth for that vocabulary. It exists because
// ReportListCard and reportTypes.ts previously each kept their own copy and
// drifted: eia and survey ended up with each other's icons, and every card
// rendered with a hardcoded water-blue icon regardless of its actual type.
export type ReportDataKey =
  | 'air_monitoring'
  | 'water_monitoring'
  | 'hazardous_waste'
  | 'eia'
  | 'survey';

export interface ReportTypeDisplay {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
}

export const REPORT_TYPE_DISPLAY: Record<ReportDataKey, ReportTypeDisplay> = {
  air_monitoring: {
    label: 'Air Monitoring',
    icon: 'partly-sunny-outline',
    bgColor: Colors.air.bg,
    borderColor: Colors.air.border,
    textColor: Colors.air.text,
    badgeBg: Colors.air.badgeBg,
    badgeText: Colors.air.badgeText,
  },
  water_monitoring: {
    label: 'Water Monitoring',
    icon: 'water-outline',
    bgColor: Colors.water.bg,
    borderColor: Colors.water.border,
    textColor: Colors.water.text,
    badgeBg: Colors.water.badgeBg,
    badgeText: Colors.water.badgeText,
  },
  hazardous_waste: {
    // The generator flow's icon stands for the collapsed bucket; the TSD
    // flow keeps its own lock glyph in the create dial, where the two are
    // still distinguishable.
    label: 'Hazwaste Monitoring',
    icon: 'warning-outline',
    bgColor: Colors.hazwaste.bg,
    borderColor: Colors.hazwaste.border,
    textColor: Colors.hazwaste.text,
    badgeBg: Colors.hazwaste.badgeBg,
    badgeText: Colors.hazwaste.badgeText,
  },
  eia: {
    label: 'EIA',
    icon: 'document-text-outline',
    bgColor: Colors.eia.bg,
    borderColor: Colors.eia.border,
    textColor: Colors.eia.text,
    badgeBg: Colors.eia.badgeBg,
    badgeText: Colors.eia.badgeText,
  },
  survey: {
    label: 'Survey',
    icon: 'globe-outline',
    bgColor: Colors.survey.bg,
    borderColor: Colors.survey.border,
    textColor: Colors.survey.text,
    badgeBg: Colors.survey.badgeBg,
    badgeText: Colors.survey.badgeText,
  },
};
```

- [ ] **Step 2: Add `dataKey` and `shortTitle` to `src/constants/reportTypes.ts`**

Add the import at the top, beside the existing imports:

```ts
import type { ReportDataKey } from './reportTypeDisplay';
```

Add two fields to the `ReportType` interface, immediately after `key`:

```ts
  // Which recorded-report bucket this create-flow produces. The two hazwaste
  // entries both resolve to 'hazardous_waste' — see reportTypeDisplay.ts.
  dataKey: ReportDataKey;
  // Compact label for the speed dial, where the full legal `title` does not
  // fit on a phone. The full title stays the accessibility label.
  shortTitle: string;
```

Then add both fields to each of the six entries:

| entry | `dataKey` | `shortTitle` |
|---|---|---|
| `air` | `'air_monitoring'` | `'Air quality'` |
| `water` | `'water_monitoring'` | `'Water quality'` |
| `hazwaste_generator` | `'hazardous_waste'` | `'Hazwaste generators'` |
| `hazwaste_tsd` | `'hazardous_waste'` | `'Hazwaste TSD'` |
| `eia` | `'eia'` | `'EIA'` |
| `survey` | `'survey'` | `'Site survey'` |

- [ ] **Step 3: Derive `INSPECTION_TYPE_LABELS` in `src/features/establishments/hooks/useEstablishment.ts`**

Add the import beside the other imports at the top of the file:

```ts
import { REPORT_TYPE_DISPLAY } from '../../../constants/reportTypeDisplay';
```

Replace the hand-maintained object at lines 533-539 with:

```ts
// Derived so the labels can't drift from the icons and colors beside them —
// REPORT_TYPE_DISPLAY is the source of truth. The Record<string, string>
// shape is unchanged, so existing consumers (ManageReportsTab,
// InspectionReportDetailScreen, EstablishmentDetailScreen) are unaffected.
export const INSPECTION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(REPORT_TYPE_DISPLAY).map(([key, meta]) => [key, meta.label]),
);
```

- [ ] **Step 4: Use the shared map in `src/features/establishments/components/ReportListCard.tsx`**

Delete the local `REPORT_ICONS` constant (lines 23-29), add the import, and move the `Colors` import off the shim (Global Constraints: a file this plan modifies leaves `src/constants/colors`):

```ts
import { Colors } from '../../../design/colors';
import { REPORT_TYPE_DISPLAY, ReportDataKey } from '../../../constants/reportTypeDisplay';
```

Inside the component, beside the other derived values (after the `showEdit` line), add:

```tsx
  // An unrecognized type still renders — a report written by a newer app
  // version shouldn't produce a blank row on an older one.
  const display = REPORT_TYPE_DISPLAY[item.reportType as ReportDataKey];
```

Replace the icon block (lines 145-147) with:

```tsx
            <View style={[styles.iconWrap, { backgroundColor: display?.bgColor ?? Colors.bgLight }]}>
              <Ionicons
                name={display?.icon ?? 'document-outline'}
                size={17}
                color={display?.textColor ?? Colors.textMuted}
              />
            </View>
```

And remove `backgroundColor: Colors.water.bg,` from the `iconWrap` style block, leaving its shape properties intact.

- [ ] **Step 5: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0. `ReportListCard.tsx` and the other touched files stay on the drift-guard allowlist for now — their full token migration lands in Tasks 15 and 16.

- [ ] **Step 6: Commit**

```bash
git add src/constants/reportTypeDisplay.ts src/constants/reportTypes.ts src/features/establishments/hooks/useEstablishment.ts src/features/establishments/components/ReportListCard.tsx
git commit -m "fix(reports): give recorded report types one source of truth

The create-flow vocabulary (6 keys) and the stored-report vocabulary (5
keys) had each kept their own icon/label tables and drifted: eia and survey
carried each other's icons, and every report card rendered with a hardcoded
water-blue icon regardless of type. REPORT_TYPE_DISPLAY now owns the
recorded-report side, INSPECTION_TYPE_LABELS derives from it, and each
create-flow entry declares the bucket it produces via dataKey.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Fab trigger

**Files:**
- Create: `src/features/home/components/Fab.tsx`

**Interfaces:**
- Consumes: `Touchable`, `Colors`, `Radius`, `Elevation`, `Duration`, `useMotion`.
- Produces: `Fab` (`{ open: boolean; onPress: () => void }`) and `FAB_SIZE = 56`.

- [ ] **Step 1: Write `src/features/home/components/Fab.tsx`**

```tsx
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Touchable } from '../../../components/Touchable';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Duration, useMotion } from '../../../design/motion';
import { Radius } from '../../../design/radius';

// Exported so SpeedDial can stack its rows clear of the trigger without
// duplicating the number.
export const FAB_SIZE = 56;

const ICON_SIZE = 26;
const OPEN_ROTATION = 45;

interface FabProps {
  open: boolean;
  onPress: () => void;
}

export const Fab: React.FC<FabProps> = ({ open, onPress }) => {
  const { timing } = useMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = timing(open ? OPEN_ROTATION : 0, { duration: Duration.short });
  }, [open, rotation, timing]);

  // The plus rotates into a cross rather than swapping glyphs, so the
  // control reads as one object changing state instead of two buttons.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close report type menu' : 'Create new report'}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={styles.fab}>
      <Animated.View style={iconStyle}>
        <Ionicons name="add" size={ICON_SIZE} color={Colors.textWhite} />
      </Animated.View>
    </Touchable>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.fab,
  },
});
```

- [ ] **Step 2: Verify types, lint, and the drift guard**

Run: `npm run typecheck && npm run lint && npx jest src/design/__tests__/driftGuard.test.ts`
Expected: all exit 0 — `Fab.tsx` is a new file and must be clean without an allowlist entry.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/components/Fab.tsx
git commit -m "feat(reports): add the floating action button trigger

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: SpeedDial

**Files:**
- Create: `src/features/home/components/SpeedDial.tsx`
- Test: `src/features/home/components/SpeedDial.test.tsx`

**Interfaces:**
- Consumes: `Fab`, `FAB_SIZE`, `Touchable`, `REPORT_TYPES`, `useGuardedPress`, `Colors`, `Radius`, `Spacing`, `Type`, `Duration`, `useMotion`.
- Produces: `SpeedDial` — takes no props; owns its own open state.

**Design notes that matter:**
- Six rows with long legal titles is a lot for this pattern, which is why `shortTitle` exists (Task 10). The full `title` remains the `accessibilityLabel`.
- Six rows at 48dp plus 12dp gaps, offset above the FAB, occupies roughly 430dp — it fits a phone viewport with the header visible.
- **Android hardware back must close the dial.** There is currently no `BackHandler` anywhere in this codebase; without one, back would navigate away while the dial is still mounted. `BackHandler.addEventListener` returns a subscription with `.remove()`; the handler returns `true` to consume the event.
- One `useGuardedPress` at the parent covers all six rows. That is intentional: the guard's ref is per-call-site, and since selecting any row closes the dial, blocking a second selection during the guard window is the desired behavior.

- [ ] **Step 1: Write the failing test at `src/features/home/components/SpeedDial.test.tsx`**

```tsx
import React from 'react';
import { BackHandler } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(() => false),
    withDelay: jest.fn(actual.withDelay),
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { useReducedMotion, withDelay } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SpeedDial } from './SpeedDial';
import { REPORT_TYPES } from '../../../constants/reportTypes';

type Renderer = TestRenderer.ReactTestRenderer;

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<SpeedDial />); });
  return r;
};

const byLabel = (r: Renderer, label: string) =>
  r.root.findAll(n => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function')[0];

const openDial = (r: Renderer) => {
  act(() => { byLabel(r, 'Create new report').props.onPress(); });
};

describe('SpeedDial', () => {
  beforeEach(() => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    (router.push as jest.Mock).mockClear();
    (withDelay as jest.Mock).mockClear();
  });

  it('shows no report type rows until it is opened', () => {
    const r = render();
    expect(r.root.findAll(n => n.props?.accessibilityLabel === REPORT_TYPES[0].title)).toHaveLength(0);
  });

  it('reveals a row per report type when opened', () => {
    const r = render();
    openDial(r);
    REPORT_TYPES.forEach(type => {
      expect(byLabel(r, type.title)).toBeDefined();
    });
  });

  it('labels each row with the full legal title, not the short one', () => {
    const r = render();
    openDial(r);
    const hazwasteTsd = REPORT_TYPES.find(t => t.key === 'hazwaste_tsd')!;
    expect(byLabel(r, hazwasteTsd.title)).toBeDefined();
    expect(hazwasteTsd.title).not.toBe(hazwasteTsd.shortTitle);
  });

  it('navigates to the selected report type route and closes', () => {
    const r = render();
    openDial(r);
    act(() => { byLabel(r, REPORT_TYPES[0].title).props.onPress(); });

    expect(router.push).toHaveBeenCalledWith(REPORT_TYPES[0].route);
    expect(r.root.findAll(n => n.props?.accessibilityLabel === REPORT_TYPES[0].title)).toHaveLength(0);
  });

  it('closes on Android hardware back instead of letting it navigate away', () => {
    const r = render();
    openDial(r);

    const handler = backSpy.mock.calls.at(-1)?.[1] as () => boolean;
    let consumed!: boolean;
    act(() => { consumed = handler(); });

    expect(consumed).toBe(true);
    expect(r.root.findAll(n => n.props?.accessibilityLabel === REPORT_TYPES[0].title)).toHaveLength(0);
  });

  it('skips the staggered entrance under reduced motion', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const r = render();
    openDial(r);

    expect(byLabel(r, REPORT_TYPES[0].title)).toBeDefined();
    expect(withDelay).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add a BackHandler spy to the test file**

Spy on the imported object rather than mocking `react-native/Libraries/Utilities/BackHandler` — that internal path is a private RN implementation detail that moves between versions. Add to the `describe` block, above the existing `beforeEach`:

```tsx
  let backSpy: jest.SpyInstance;

  beforeEach(() => {
    backSpy = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  });

  afterEach(() => {
    backSpy.mockRestore();
  });
```

and change the hardware-back test to read its handler from the spy:

```tsx
    const handler = backSpy.mock.calls.at(-1)?.[1] as () => boolean;
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/features/home/components/SpeedDial.test.tsx`
Expected: FAIL — `Cannot find module './SpeedDial'`.

- [ ] **Step 4: Write `src/features/home/components/SpeedDial.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Touchable } from '../../../components/Touchable';
import { REPORT_TYPES, ReportType } from '../../../constants/reportTypes';
import { Colors } from '../../../design/colors';
import { Duration, useMotion } from '../../../design/motion';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { useGuardedPress } from '../../../utils/useGuardedPress';
import { Fab, FAB_SIZE } from './Fab';

const ROW_SIZE = 48;
const STAGGER_MS = 30;
const RISE_DISTANCE = 12;
// Exits run faster than entrances — a dismissal shouldn't make the user wait
// for the same choreography they already sat through on the way in.
const CLOSE_DURATION = Math.round(Duration.short * (2 / 3));

export const SpeedDial: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { timing, reduced } = useMotion();
  const scrimOpacity = useSharedValue(0);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(current => !current), []);

  useEffect(() => {
    scrimOpacity.value = timing(open ? 1 : 0, {
      duration: open ? Duration.short : CLOSE_DURATION,
    });
  }, [open, scrimOpacity, timing]);

  // Nothing else in this app registers a back handler, so without this the
  // dial would stay open while back navigated the screen out from under it.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [open, close]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  // One guard for all six rows: its ref is per-call-site, and since any
  // selection closes the dial, swallowing a second press in the guard window
  // is what we want anyway.
  const select = useGuardedPress((route: string) => {
    close();
    router.push(route as never);
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      {open && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close report type menu"
          onPress={close}
          style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.scrim, scrimStyle]} />
        </Touchable>
      )}

      {open && (
        <View style={styles.rows} pointerEvents="box-none">
          {REPORT_TYPES.map((item, index) => (
            <DialRow
              key={item.key}
              item={item}
              index={index}
              reduced={reduced}
              onPress={() => select(item.route)}
            />
          ))}
        </View>
      )}

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Fab open={open} onPress={toggle} />
      </View>
    </View>
  );
};

interface DialRowProps {
  item: ReportType;
  index: number;
  reduced: boolean;
  onPress: () => void;
}

const DialRow: React.FC<DialRowProps> = ({ item, index, reduced, onPress }) => {
  const IconAsset = item.iconAsset;
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(index * STAGGER_MS, withTiming(1, { duration: Duration.base }));
  }, [reduced, index, progress]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_DISTANCE }],
  }));

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={[styles.pill, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}>
        <Text style={[styles.pillTitle, { color: item.textColor }]} numberOfLines={1}>
          {item.shortTitle}
        </Text>
        <Text style={styles.pillLaw} numberOfLines={1}>
          {item.law}
        </Text>
      </View>
      {/* The visible label is the short one; the accessible name is the full
          legal title, which is what a screen reader user needs. */}
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={onPress}
        style={[styles.rowButton, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}>
        {IconAsset ? (
          <IconAsset width={20} height={20} />
        ) : (
          <Ionicons
            name={item.iconName as keyof typeof Ionicons.glyphMap}
            size={20}
            color={item.textColor}
          />
        )}
      </Touchable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  fabWrap: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  rows: {
    position: 'absolute',
    right: Spacing.lg,
    // Clears the trigger and its own inset, so the first row sits above the
    // FAB rather than behind it.
    bottom: Spacing.lg + FAB_SIZE + Spacing.md,
    gap: Spacing.md,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    maxWidth: 200,
  },
  pillTitle: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
  },
  pillLaw: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  rowButton: {
    width: ROW_SIZE,
    height: ROW_SIZE,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/features/home/components/SpeedDial.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/home/components/SpeedDial.tsx src/features/home/components/SpeedDial.test.tsx
git commit -m "feat(reports): add the report type speed dial

Six staggered rows rising from the FAB, each labeled with its short title
and law reference but named by its full legal title for screen readers.
Dismisses on scrim tap, selection, or Android hardware back — the first
BackHandler registration in the app. Degrades to an instant show/hide under
reduced motion.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Mount the speed dial in the shared chrome

**Files:**
- Create: `src/features/home/context/FabVisibilityContext.tsx`
- Create: `src/features/home/fabRoute.ts`
- Modify: `src/app/(app)/_layout.tsx`
- Test: `src/features/home/fabRoute.test.ts`

**Interfaces:**
- Consumes: `SpeedDial`.
- Produces: `FabVisibilityProvider`, `useFabHidden(): boolean`, `useSetFabHidden(hidden: boolean): void`, and `isFabRoute(pathname: string): boolean` from `src/features/home/fabRoute.ts`.

`isFabRoute` lives in its own module rather than in `_layout.tsx`: importing the layout would drag expo-router's `Stack`, `SafeAreaView`, `HomeHeader`, `AuthProvider`, the Supabase client and the sync orchestrator into a unit test for one pure string predicate.

**Visibility rule (from the design):** visible on `/home` and `/establishment/[id]`; hidden on `/inspection/*`, `/survey/*`, `/report/new`, and `/establishment/edit`, where it would collide with the screen's own footer actions. A screen can also hide it imperatively via `useSetFabHidden` — Task 17 uses that for the Export tab's selection bar.

`FabVisibilityContext` deliberately mirrors the existing `ScreenFooterContext` pattern rather than inventing a new one.

- [ ] **Step 1: Write `src/features/home/context/FabVisibilityContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface FabVisibilityContextValue {
  hidden: boolean;
  setFabHidden: (hidden: boolean) => void;
}

const FabVisibilityContext = createContext<FabVisibilityContextValue | null>(null);

// Lets a screen suppress the FAB while it has overlapping UI of its own
// showing — the same hoisting problem ScreenFooterContext solves for bottom
// action bars, and deliberately shaped the same way.
export const FabVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hidden, setHidden] = useState(false);
  const value = useMemo<FabVisibilityContextValue>(
    () => ({ hidden, setFabHidden: setHidden }),
    [hidden],
  );
  return <FabVisibilityContext.Provider value={value}>{children}</FabVisibilityContext.Provider>;
};

function useFabVisibilityContext(): FabVisibilityContextValue {
  const ctx = useContext(FabVisibilityContext);
  if (!ctx) {
    throw new Error('useFabVisibilityContext must be used within a FabVisibilityProvider');
  }
  return ctx;
}

// Consumed once by AppChrome.
export function useFabHidden(): boolean {
  return useFabVisibilityContext().hidden;
}

// A screen calls this instead of reaching into the provider. The cleanup
// restores visibility on unmount, so a screen can't leave the FAB hidden
// behind it.
export function useSetFabHidden(hidden: boolean): void {
  const { setFabHidden } = useFabVisibilityContext();
  useEffect(() => {
    setFabHidden(hidden);
    return () => setFabHidden(false);
  }, [hidden, setFabHidden]);
}
```

- [ ] **Step 2: Write `src/features/home/fabRoute.ts`**

```ts
// Browsing screens get the create-report FAB; form screens don't, because it
// would sit on top of their own bottom action bars. Matched against the
// resolved path, not the route pattern — /establishment/edit is a form, every
// other /establishment/<id> is a detail screen.
//
// Its own module rather than living in the layout: this is a pure predicate,
// and importing the layout to test it would pull in the router, the auth
// provider and the sync orchestrator.
export function isFabRoute(pathname: string): boolean {
  if (pathname === '/home') return true;
  return /^\/establishment\/(?!edit$)[^/]+$/.test(pathname);
}
```

- [ ] **Step 3: Write the failing test at `src/features/home/fabRoute.test.ts`**

```ts
import { isFabRoute } from './fabRoute';

describe('isFabRoute', () => {
  it('shows the FAB on home', () => {
    expect(isFabRoute('/home')).toBe(true);
  });

  it('shows the FAB on an establishment detail screen', () => {
    expect(isFabRoute('/establishment/abc-123')).toBe(true);
  });

  it('hides the FAB on the establishment edit form', () => {
    expect(isFabRoute('/establishment/edit')).toBe(false);
  });

  it('hides the FAB on inspection and survey forms', () => {
    expect(isFabRoute('/inspection/new')).toBe(false);
    expect(isFabRoute('/inspection/abc-123')).toBe(false);
    expect(isFabRoute('/survey/new')).toBe(false);
    expect(isFabRoute('/report/new')).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npx jest src/features/home/fabRoute.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Update `src/app/(app)/_layout.tsx`**

Replace the file's contents with:

```tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../design/colors';
import { HomeHeader } from '../../features/home/components/HomeHeader';
import { HomeFooter } from '../../features/home/components/HomeFooter';
import { SpeedDial } from '../../features/home/components/SpeedDial';
import { HeaderScrollProvider, useHeaderScroll } from '../../features/home/context/HeaderScrollContext';
import { ScreenFooterProvider, useActiveScreenFooter } from '../../features/home/context/ScreenFooterContext';
import { FabVisibilityProvider, useFabHidden } from '../../features/home/context/FabVisibilityContext';
import { isFabRoute } from '../../features/home/fabRoute';

// Header/footer chrome that reacts to the active route — split out so it can
// read scroll-collapse state from the provider below.
function AppChrome() {
  const pathname = usePathname();
  const isHome = pathname === '/home';
  const { collapsed, expand } = useHeaderScroll();
  const screenFooter = useActiveScreenFooter();
  const fabHidden = useFabHidden();

  // Each screen mounts its own scroll container, so the collapsed state from
  // whatever page the user just left shouldn't carry over to the next one.
  useEffect(() => {
    expand();
  }, [pathname, expand]);

  return (
    <>
      <HomeHeader collapsed={collapsed} disableCollapse={isHome} />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </View>
      {screenFooter}
      <HomeFooter />
      {/* Last child, so its scrim and rows layer over the chrome. Unmounting
          on a route change also closes any open dial. */}
      {isFabRoute(pathname) && !fabHidden && <SpeedDial />}
    </>
  );
}

// Shared chrome for every authenticated screen — mounted once so the header
// and footer stay fixed while only this inner Stack's content transitions.
export default function AppLayout() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <HeaderScrollProvider>
        <ScreenFooterProvider>
          <FabVisibilityProvider>
            <AppChrome />
          </FabVisibilityProvider>
        </ScreenFooterProvider>
      </HeaderScrollProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
});
```

- [ ] **Step 6: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/_layout.tsx" src/features/home/fabRoute.ts src/features/home/fabRoute.test.ts src/features/home/context/FabVisibilityContext.tsx
git commit -m "feat(reports): mount the speed dial in the shared app chrome

Visible on home and establishment detail, hidden on the form screens where
it would overlap their action bars. FabVisibilityContext lets a screen
suppress it imperatively, mirroring how ScreenFooterContext already hoists
bottom bars out of the scroll container.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Restructure the Home tabs and retire the Create tab

**Files:**
- Modify: `src/features/home/components/HomeTabs.tsx` (full rewrite)
- Modify: `src/app/(app)/home.tsx`
- Delete: `src/features/inspections/components/CreateNewReportTab.tsx`
- Delete: `src/features/inspections/components/ReportTypeCard.tsx`
- Modify: `src/design/driftGuardAllowlist.json` (remove the two migrated files and the two deleted ones)
- Test: `src/features/home/components/HomeTabs.test.tsx`

**Interfaces:**
- Consumes: `Colors` (incl. `accent`), `Spacing`, `Type`, `Radius`, `EmptyState`.
- Produces: `HomeTab = 'manageReports' | 'manageEstablishments' | 'exportReports'` and `HomeTabs` (`{ activeTab: HomeTab; onTabChange: (tab: HomeTab) => void }`).

The export tab renders a placeholder in this task; Task 18 swaps in the real `ExportReportsTab` once it exists. Splitting it this way keeps both commits coherent on their own.

- [ ] **Step 1: Write the failing test at `src/features/home/components/HomeTabs.test.tsx`**

```tsx
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { HomeTabs, HomeTab } from './HomeTabs';
import { Colors } from '../../../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (active: HomeTab, onChange: (t: HomeTab) => void = () => {}) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<HomeTabs activeTab={active} onTabChange={onChange} />); });
  return r;
};

const labels = (r: Renderer) => r.root.findAllByType(Text).map(n => n.props.children);

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

describe('HomeTabs', () => {
  it('offers exactly the three post-restructure tabs', () => {
    expect(labels(render('manageReports'))).toEqual([
      'Manage Reports',
      'Manage\nEstablishments',
      'Export Inspection\nReports',
    ]);
  });

  it('no longer offers a create tab', () => {
    expect(labels(render('manageReports')).join(' ')).not.toMatch(/create/i);
  });

  it('marks the active tab with the accent color', () => {
    const r = render('manageReports');
    expect(flatten(r.root.findAllByType(Text)[0].props.style).color).toBe(Colors.accent);
  });

  it('reports the tab the user picked', () => {
    const onChange = jest.fn();
    const r = render('manageReports', onChange);
    act(() => {
      r.root.findAll(n => n.props?.accessibilityRole === 'tab')[2].props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('exportReports');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/home/components/HomeTabs.test.tsx`
Expected: FAIL — the current component still exposes the `create` tab.

- [ ] **Step 3: Rewrite `src/features/home/components/HomeTabs.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';

export type HomeTab = 'manageReports' | 'manageEstablishments' | 'exportReports';

interface HomeTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}

// Creating a report is no longer a tab — it lives in the speed dial FAB, so
// it's reachable from the establishment screens too rather than only from
// here. Manage Reports leads because it's where an inspector's own work is.
const TABS: { key: HomeTab; label: string }[] = [
  { key: 'manageReports', label: 'Manage Reports' },
  { key: 'manageEstablishments', label: 'Manage\nEstablishments' },
  { key: 'exportReports', label: 'Export Inspection\nReports' },
];

export const HomeTabs: React.FC<HomeTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}>
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
    position: 'relative',
  },
  label: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '500',
    textAlign: 'center',
    paddingBottom: Spacing.sm,
  },
  labelActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.textMuted,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.sm,
    right: Spacing.sm,
    height: 2.5,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
  },
});
```

- [ ] **Step 4: Update `src/app/(app)/home.tsx`**

Four edits:

1. Replace the `CreateNewReportTab` import with the placeholder's dependency:

```tsx
import { EmptyState } from '../../components/EmptyState';
```

2. Delete the whole commented-out `ImportExportTab` block (lines 43-52 in the current file) — export is a real tab now, so the placeholder comment is dead.

3. Change the default tab and the switch:

```tsx
  const [activeTab, setActiveTab] = useState<HomeTab>('manageReports');
```

```tsx
  const renderTab = () => {
    switch (activeTab) {
      case 'manageReports':
        return <ManageReportsTab ref={manageReportsRef} />;
      case 'manageEstablishments':
        return <ManageEstablishmentsTab ref={manageEstablishmentsRef} />;
      case 'exportReports':
        // Replaced by ExportReportsTab in the following task.
        return <EmptyState icon="download-outline" message="Export is coming next." />;
    }
  };
```

4. Update `handleRefresh` so the export tab is a no-op rather than referencing the removed `create` tab, and tokenize the styles. Replace the `styles` object with:

```tsx
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  welcomeWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  welcomeText: {
    fontSize: Type.display.fontSize,
    lineHeight: Type.display.lineHeight,
    fontWeight: '800',
    color: Colors.navy,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
```

with imports updated to:

```tsx
import { Colors } from '../../design/colors';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';
```

(The `placeholderWrap` / `placeholderTitle` / `placeholderSub` styles go with the deleted comment block.)

- [ ] **Step 5: Delete the two components that lost their consumer**

```bash
git rm src/features/inspections/components/CreateNewReportTab.tsx src/features/inspections/components/ReportTypeCard.tsx
```

- [ ] **Step 6: Shrink the drift-guard allowlist**

Remove these four entries from `src/design/driftGuardAllowlist.json`:

```
features/home/components/HomeTabs.tsx
app/(app)/home.tsx
features/inspections/components/CreateNewReportTab.tsx
features/inspections/components/ReportTypeCard.tsx
```

(The last two are gone from disk; the first two are now token-clean.)

- [ ] **Step 7: Run the tests**

Run: `npx jest src/features/home/components/HomeTabs.test.tsx src/design/__tests__/driftGuard.test.ts`
Expected: PASS — 4 tab tests, 2 drift-guard tests.

- [ ] **Step 8: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 9: Commit**

```bash
git add -A src/features/home/components/HomeTabs.tsx src/features/home/components/HomeTabs.test.tsx "src/app/(app)/home.tsx" src/design/driftGuardAllowlist.json src/features/inspections/components/
git commit -m "feat(reports): replace the Create tab with an Export tab

Creating a report moves to the speed dial FAB, so the grid of report type
cards and its card component are deleted. Home now opens on Manage Reports.
The tab underline's unowned purple becomes Colors.accent, and both files drop
off the drift-guard allowlist.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Extract the shared report browser

**Files:**
- Create: `src/features/establishments/hooks/useReportBrowser.ts`
- Create: `src/features/establishments/components/ReportFilterSheet.tsx`
- Modify: `src/features/establishments/components/ManageReportsTab.tsx` (consumes both; full token migration)
- Modify: `src/design/driftGuardAllowlist.json` (remove `features/establishments/components/ManageReportsTab.tsx`)

**Interfaces:**
- Consumes: `useAllReports`, `useEstablishmentFilterOptions`, `AllReportItem`, `ReportStatusFilter`, `ReportFilters`, `ReportSortOrder`, `INSPECTION_TYPE_LABELS`, `Section`, `EmptyState`, `SelectField`, `DateField`.
- Produces:
  - `ReportBrowserState` — `{ search, statusFilter, province, city, reportType, dateFrom, dateTo, sortOrder }`
  - `UseReportBrowserReturn` — `{ reports, loading, error, refetch, state, provinceOptions, activeFilterCount, setSearch, setStatusFilter, setProvince, setCity, setReportType, setDateFrom, setDateTo, setSortOrder, clearFilters }`
  - `useReportBrowser(): UseReportBrowserReturn`
  - `ReportFilterSheet` — `{ visible: boolean; onClose: () => void; browser: UseReportBrowserReturn; municipalities: string[] }`

**Why:** `ManageReportsTab.tsx` is 641 lines, roughly 200 of which are search, filter-sheet, and sort logic that the Export tab needs identically. Extraction is the targeted improvement this work justifies. Pagination stays with each consumer — Manage pages its results for browsing, Export shows the whole filtered set so "select all in this filter" has a defined meaning.

- [ ] **Step 1: Write `src/features/establishments/hooks/useReportBrowser.ts`**

```ts
import { useCallback, useMemo, useState } from 'react';
import {
  useAllReports,
  useEstablishmentFilterOptions,
  AllReportItem,
  ReportFilters,
  ReportSortOrder,
  ReportStatusFilter,
} from './useEstablishment';

export interface ReportBrowserState {
  search: string;
  statusFilter: ReportStatusFilter;
  province: string;
  city: string;
  reportType: string;
  dateFrom: string;
  dateTo: string;
  sortOrder: ReportSortOrder;
}

export interface UseReportBrowserReturn {
  reports: AllReportItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  state: ReportBrowserState;
  provinceOptions: string[];
  activeFilterCount: number;
  setSearch: (value: string) => void;
  setStatusFilter: (value: ReportStatusFilter) => void;
  setProvince: (value: string) => void;
  setCity: (value: string) => void;
  setReportType: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setSortOrder: (value: ReportSortOrder) => void;
  clearFilters: () => void;
}

// The search/filter/sort state and the query behind it, lifted out of
// ManageReportsTab so ExportReportsTab drives identical filtering rather
// than reimplementing it.
//
// Pagination is deliberately NOT here: Manage pages its results for
// browsing, while Export needs the whole filtered set at once so "select all
// in this filter" means something. That split stays in each consumer.
export function useReportBrowser(): UseReportBrowserReturn {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<ReportSortOrder>('newest');

  const { provinceOptions } = useEstablishmentFilterOptions();

  // Stable reference so the filter object only changes when a filter value
  // actually changes — a fresh object literal every render would re-trigger
  // useAllReports' fetch effect on a loop.
  const filters: ReportFilters = useMemo(
    () => ({ province, city, reportType, dateFrom, dateTo, sortOrder }),
    [province, city, reportType, dateFrom, dateTo, sortOrder],
  );

  // Memoized for the same reason: consumers key effects off this (resetting
  // their page to 1), and a new object each render would fire those forever.
  const state = useMemo<ReportBrowserState>(
    () => ({ search, statusFilter, province, city, reportType, dateFrom, dateTo, sortOrder }),
    [search, statusFilter, province, city, reportType, dateFrom, dateTo, sortOrder],
  );

  const { reports, loading, error, refetch } = useAllReports(search, statusFilter, filters);

  const clearFilters = useCallback(() => {
    setProvince('');
    setCity('');
    setReportType('');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
  }, []);

  const activeFilterCount = [province, city, reportType, dateFrom, dateTo].filter(Boolean).length;

  return {
    reports,
    loading,
    error,
    refetch,
    state,
    provinceOptions,
    activeFilterCount,
    setSearch,
    setStatusFilter,
    setProvince,
    setCity,
    setReportType,
    setDateFrom,
    setDateTo,
    setSortOrder,
    clearFilters,
  };
}
```

- [ ] **Step 2: Write `src/features/establishments/components/ReportFilterSheet.tsx`**

This is the existing sheet from `ManageReportsTab.tsx:336-419` verbatim in behavior, with tokens substituted and the `setPage(1)` calls dropped (pagination now belongs to the consumer, which resets on `browser.state` changing).

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal, Keyboard, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { SelectField, DateField } from '../../../components/form';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { INSPECTION_TYPE_LABELS, ReportSortOrder } from '../hooks/useEstablishment';
import { UseReportBrowserReturn } from '../hooks/useReportBrowser';

const ALL_OPTION = 'All';

const REPORT_TYPE_OPTIONS = Object.entries(INSPECTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SORT_OPTIONS: { key: ReportSortOrder; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
];

// The date fields can be typed into directly, so the numeric keypad can open
// while this sheet is up. RN's Modal doesn't resize for the keyboard on its
// own — same issue NewEstablishmentModal solved — so the bottom-anchored
// sheet shifts up manually or the keyboard covers the date row.
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ReportFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  browser: UseReportBrowserReturn;
  // The inspector's own assigned municipalities — narrows the (already
  // province-wide-visible) list further, it's not an access boundary. Passed
  // in because both consumers already hold it from useAuthContext.
  municipalities: string[];
}

export const ReportFilterSheet: React.FC<ReportFilterSheetProps> = ({
  visible,
  onClose,
  browser,
  municipalities,
}) => {
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    // keyboardHeight.value is <= 0 while shown, so negating it gives the
    // padding needed to push the flex-end-anchored sheet above the keyboard.
    paddingBottom: -keyboardHeight.value,
  }));

  const {
    state,
    provinceOptions,
    setProvince,
    setCity,
    setReportType,
    setDateFrom,
    setDateTo,
    setSortOrder,
    clearFilters,
  } = browser;

  const selectedReportTypeLabel =
    REPORT_TYPE_OPTIONS.find(o => o.value === state.reportType)?.label ?? ALL_OPTION;
  const selectedSortLabel =
    SORT_OPTIONS.find(o => o.key === state.sortOrder)?.label ?? SORT_OPTIONS[0].label;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <AnimatedTouchableOpacity
        style={[styles.overlay, overlayAnimatedStyle]}
        activeOpacity={1}
        onPress={() => {
          // With both the sheet and keyboard open, a tap outside should only
          // dismiss the keyboard — closing the sheet too would be a second,
          // unrequested action from one tap.
          if (Keyboard.isVisible()) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter reports</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters">
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <SelectField
            label="Region"
            value={state.province || ALL_OPTION}
            options={[ALL_OPTION, ...provinceOptions]}
            onSelect={v => setProvince(v === ALL_OPTION ? '' : v)}
            style={styles.filterField}
          />

          {municipalities.length > 0 && (
            <SelectField
              label="Municipality"
              value={state.city || ALL_OPTION}
              options={[ALL_OPTION, ...municipalities]}
              onSelect={v => setCity(v === ALL_OPTION ? '' : v)}
              style={styles.filterField}
            />
          )}

          <SelectField
            label="Inspection report type"
            value={selectedReportTypeLabel}
            options={[ALL_OPTION, ...REPORT_TYPE_OPTIONS.map(o => o.label)]}
            onSelect={v =>
              setReportType(
                v === ALL_OPTION ? '' : REPORT_TYPE_OPTIONS.find(o => o.label === v)?.value ?? '',
              )
            }
            style={styles.filterField}
          />

          <View style={styles.dateRow}>
            <DateField label="From" value={state.dateFrom} onChange={setDateFrom} style={styles.dateField} />
            <DateField label="To" value={state.dateTo} onChange={setDateTo} style={styles.dateField} />
          </View>

          <SelectField
            label="Sort by date"
            value={selectedSortLabel}
            options={SORT_OPTIONS.map(o => o.label)}
            onSelect={v => setSortOrder(SORT_OPTIONS.find(o => o.label === v)?.key ?? 'newest')}
            style={styles.filterField}
          />

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.75}>
            <Text style={styles.clearBtnText}>Clear all filters</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </AnimatedTouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
  },
  // SelectField's own `group` style sets flex: 1 for side-by-side form rows.
  // Stacked standalone here, that flex-basis-0 sizing collapses the field to
  // near-zero height, because this column parent only has a maxHeight cap and
  // no definite height for it to grow into. Clearing it back to Yoga's
  // content-sized default fixes the squished layout.
  filterField: {
    flex: undefined,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  // Unlike filterField, these two DO keep flex: 1 — they share a row (a
  // definite-width flex container), so it splits width 50/50 rather than
  // collapsing height.
  dateField: {
    flex: 1,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  clearBtnText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
    color: Colors.conflict,
  },
});
```

- [ ] **Step 3: Rewrite `src/features/establishments/components/ManageReportsTab.tsx` to consume both**

Keep `PAGE_SIZE`, the status chips, the pager, `handleOpen`, and `handleDelete` exactly as they behave today. The changes are: state comes from `useReportBrowser`, the inline `Modal` is replaced by `<ReportFilterSheet>`, the loading/empty states use the new primitives, and every style value becomes a token.

```tsx
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { EmptyState } from '../../../components/EmptyState';
import { Section } from '../../../components/Section';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useGuardedPress } from '../../../utils/useGuardedPress';
import { deleteInspectionReportRecord } from '../../inspections/reportPersistence';
import { AllReportItem, ReportStatusFilter, canManageAllRecords } from '../hooks/useEstablishment';
import { useReportBrowser } from '../hooks/useReportBrowser';
import { ReportFilterSheet } from './ReportFilterSheet';
import { ReportListCard } from './ReportListCard';

const PAGE_SIZE = 5;

const STATUS_FILTERS: { key: ReportStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
];

export interface ManageReportsTabHandle {
  refresh: () => Promise<void>;
}

export const ManageReportsTab = forwardRef<ManageReportsTabHandle>((_props, ref) => {
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const browser = useReportBrowser();
  const { reports, loading, error, refetch, activeFilterCount, state } = browser;

  const { municipalities, session, role } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isDeveloper = canManageAllRecords(role ?? '');

  // Any filter or search change puts the user back on page 1 — `state` is
  // memoized in useReportBrowser, so this only fires on a real change.
  useEffect(() => {
    setPage(1);
  }, [state]);

  useImperativeHandle(ref, () => ({ refresh: refetch }), [refetch]);

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const paginated = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleOpen = useGuardedPress((item: AllReportItem) => {
    if (item.kind === 'inspection') {
      router.push({ pathname: '/inspection/[id]', params: { id: item.reportId } });
    } else {
      router.push({ pathname: '/survey/[id]', params: { id: item.reportId } });
    }
  });

  // Only inspection reports are deletable here, and only by their owner or a
  // Developer account — ReportListCard already hides the button otherwise.
  const handleDelete = useCallback(
    (item: AllReportItem) => {
      if (item.kind !== 'inspection' || !(item.inspectorUid === currentUid || isDeveloper)) return;
      Alert.alert(
        'Delete report?',
        `This report for "${item.estabName}" will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteInspectionReportRecord(item.reportId);
                refetch();
              } catch (err) {
                console.error('[ManageReportsTab] Failed to delete report:', err);
                Alert.alert('Delete failed', err instanceof Error ? err.message : 'Something went wrong.');
              }
            },
          },
        ],
      );
    },
    [currentUid, isDeveloper, refetch],
  );

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.stateText}>Loading reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.conflict} />
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={refetch}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Retry loading reports">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by establishment name..."
            placeholderTextColor={Colors.textMuted}
            value={state.search}
            onChangeText={browser.setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {state.search.length > 0 && (
            <TouchableOpacity
              onPress={() => browser.setSearch('')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFiltersOpen(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Filter reports">
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? Colors.textWhite : Colors.textMuted}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => {
          const isActive = state.statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => browser.setStatusFilter(f.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Show ${f.label.toLowerCase()} reports`}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Section title="REPORTS" right={<Text style={styles.sectionCount}>{reports.length} total</Text>} />

      {paginated.length === 0 ? (
        <EmptyState
          icon="document-outline"
          message={
            state.search || state.statusFilter !== 'all' || activeFilterCount > 0
              ? 'No reports match your filters.'
              : 'No reports yet.'
          }
        />
      ) : (
        paginated.map(item => (
          <ReportListCard
            key={item.key}
            item={item}
            currentUid={currentUid}
            canManageAll={isDeveloper}
            onPress={handleOpen}
            onEdit={handleOpen}
            onDelete={handleDelete}
          />
        ))
      )}

      {totalPages > 1 && (
        <View style={styles.pager}>
          <TouchableOpacity
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Previous page">
            <View style={styles.pageArrow}>
              <Ionicons name="chevron-back" size={13} color={page === 1 ? Colors.textLight : Colors.textMuted} />
              <Text style={[styles.pageArrowText, page === 1 && styles.pageDisabled]}>Previous</Text>
            </View>
          </TouchableOpacity>

          {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPage(p)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Go to page ${p}`}>
              <View style={[styles.pageNum, p === page && styles.pageNumActive]}>
                <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {totalPages > 4 && (
            <>
              <Text style={styles.pageDots}>…</Text>
              <TouchableOpacity
                onPress={() => setPage(totalPages)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Go to page ${totalPages}`}>
                <View style={[styles.pageNum, page === totalPages && styles.pageNumActive]}>
                  <Text style={[styles.pageNumText, page === totalPages && styles.pageNumTextActive]}>
                    {totalPages}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Next page">
            <View style={styles.pageArrow}>
              <Text style={[styles.pageArrowText, page === totalPages && styles.pageDisabled]}>Next</Text>
              <Ionicons
                name="chevron-forward"
                size={13}
                color={page === totalPages ? Colors.textLight : Colors.textMuted}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <ReportFilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        browser={browser}
        municipalities={municipalities}
      />
    </View>
  );
});

ManageReportsTab.displayName = 'ManageReportsTab';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centeredState: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  stateText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  retryText: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Type.bodySm.fontSize,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.navy,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xxs,
    backgroundColor: Colors.conflict,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: Type.caption.fontSize,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bgLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterChipText: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.textWhite,
  },
  sectionCount: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textLight,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  pageArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  pageArrowText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  pageDisabled: {
    color: Colors.textLight,
  },
  pageNum: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgLight,
  },
  pageNumActive: {
    backgroundColor: Colors.navy,
  },
  pageNumText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  pageNumTextActive: {
    color: Colors.textWhite,
  },
  pageDots: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
});
```

Note the two behavior-preserving substitutions: the filter badge's `#e74c3c` becomes `Colors.conflict`, and the search/filter `#f1f5f9` becomes `Colors.bgLight` — both were loose hexes standing in for tokens that already existed.

- [ ] **Step 4: Shrink the drift-guard allowlist**

Remove `features/establishments/components/ManageReportsTab.tsx` from `src/design/driftGuardAllowlist.json`.

- [ ] **Step 5: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0, drift guard included.

- [ ] **Step 6: Manually confirm the tab still behaves**

Run the app on the connected device and check the Manage Reports tab: search filters the list, the filter sheet opens and applies region/type/date, changing a filter resets to page 1, pagination works, and delete still prompts.

```bash
npx expo run:android
```

- [ ] **Step 7: Commit**

```bash
git add src/features/establishments/hooks/useReportBrowser.ts src/features/establishments/components/ReportFilterSheet.tsx src/features/establishments/components/ManageReportsTab.tsx src/design/driftGuardAllowlist.json
git commit -m "refactor(establishments): extract the shared report browser

Search, filters, and sort move into useReportBrowser and ReportFilterSheet
so the upcoming Export tab drives identical filtering instead of
reimplementing it. ManageReportsTab drops from 641 lines and off the
drift-guard allowlist.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Selection mode on ReportListCard

**Files:**
- Modify: `src/features/establishments/components/ReportListCard.tsx` (selection mode + full token migration)
- Modify: `src/design/driftGuardAllowlist.json` (remove `features/establishments/components/ReportListCard.tsx`)
- Test: `src/features/establishments/components/ReportListCard.test.tsx`

**Interfaces:**
- Consumes: `Badge`, `REPORT_TYPE_DISPLAY`, `ReportDataKey`, `Colors`, `Radius`, `Spacing`, `Type`, `Elevation`, `AppText`, `getReportUrgency`, `confirmResolveConflict`.
- Produces: `ReportListCard` with three added optional props — `selectable?: boolean`, `selected?: boolean`, `onToggleSelect?: (item: AllReportItem) => void`. Omitting them leaves today's behavior untouched.

Selection mode suppresses the swipe actions: swipe-to-edit/delete while ticking rows for export is two conflicting gestures on one row.

- [ ] **Step 1: Write the failing test at `src/features/establishments/components/ReportListCard.test.tsx`**

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ReportListCard } from './ReportListCard';
import type { AllReportItem } from '../hooks/useEstablishment';

type Renderer = TestRenderer.ReactTestRenderer;

const ITEM: AllReportItem = {
  key: 'inspection-r1',
  kind: 'inspection',
  reportId: 'r1',
  inspectorUid: 'u1',
  estabId: 'e1',
  estabName: 'Sta. Cruz Agri-Industrial Corporation',
  estabProvince: 'Oriental Mindoro',
  estabCity: 'Calapan City',
  reportType: 'water_monitoring',
  title: 'Water Monitoring',
  date: '2026-08-01',
  controlNo: 'WQ-2026-001',
  status: 'draft',
  syncStatus: 'synced',
};

const render = (props: Partial<React.ComponentProps<typeof ReportListCard>> = {}) => {
  let r!: Renderer;
  act(() => {
    r = TestRenderer.create(
      <ReportListCard
        item={ITEM}
        currentUid="u1"
        canManageAll={false}
        onPress={props.onPress ?? (() => {})}
        onEdit={() => {}}
        onDelete={() => {}}
        {...props}
      />,
    );
  });
  return r;
};

const card = (r: Renderer) =>
  r.root.findAll(n => n.props?.accessibilityRole === 'button' || n.props?.accessibilityRole === 'checkbox')[0];

describe('ReportListCard selection mode', () => {
  it('opens the report on press when not selectable', () => {
    const onPress = jest.fn();
    const onToggleSelect = jest.fn();
    const r = render({ onPress, onToggleSelect });

    act(() => { card(r).props.onPress(); });

    expect(onPress).toHaveBeenCalledWith(ITEM);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('toggles selection instead of opening when selectable', () => {
    const onPress = jest.fn();
    const onToggleSelect = jest.fn();
    const r = render({ selectable: true, onPress, onToggleSelect });

    act(() => { card(r).props.onPress(); });

    expect(onToggleSelect).toHaveBeenCalledWith(ITEM);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes its selected state to assistive tech', () => {
    const r = render({ selectable: true, selected: true, onToggleSelect: () => {} });

    expect(card(r).props.accessibilityRole).toBe('checkbox');
    expect(card(r).props.accessibilityState).toEqual({ checked: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/establishments/components/ReportListCard.test.tsx`
Expected: FAIL — `selectable` is not a prop, so the card still calls `onPress`.

- [ ] **Step 3: Rewrite `src/features/establishments/components/ReportListCard.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { REPORT_TYPE_DISPLAY, ReportDataKey } from '../../../constants/reportTypeDisplay';
import { Colors } from '../../../design/colors';
import { Duration } from '../../../design/motion';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { FONT_SCALING, Type } from '../../../design/typography';
import { getReportUrgency } from '../../../utils/reportUrgency';
import { confirmResolveConflict } from '../../../services/sync/syncConflictResolution';
import type { AllReportItem } from '../hooks/useEstablishment';

interface ReportListCardProps {
  item: AllReportItem;
  currentUid: string;
  // Developer accounts can manage every report, not just their own — see
  // canManageAllRecords.
  canManageAll: boolean;
  onPress: (item: AllReportItem) => void;
  onEdit: (item: AllReportItem) => void;
  onDelete: (item: AllReportItem) => void;
  // Selection mode (the Export tab). Omitted everywhere else, which leaves
  // the card's original open/swipe behavior exactly as it was.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (item: AllReportItem) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Full-size action buttons revealed by swiping the card left — matches
// EstablishmentCard's swipe-actions treatment.
const ACTION_WIDTH = 72;
const OPEN_THRESHOLD_RATIO = 0.4;
const CHECKBOX_SIZE = 22;
const ICON_BOX = 38;

export const ReportListCard: React.FC<ReportListCardProps> = ({
  item,
  currentUid,
  canManageAll,
  onPress,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const isSubmitted = item.status === 'submitted';
  const urgency = getReportUrgency(item.date, item.status);
  // An unrecognized type still renders — a report written by a newer app
  // version shouldn't produce a blank row on an older one.
  const display = REPORT_TYPE_DISPLAY[item.reportType as ReportDataKey];

  // Delete is only wired up for inspection reports, and only for the
  // inspector who owns the record or a Developer account — matches the
  // "own record" / Developer-full-access delete RLS policies on the backend.
  const isOwnerOrManager = item.inspectorUid === currentUid || canManageAll;
  const showDelete = item.kind === 'inspection' && isOwnerOrManager;
  // Editing only exists for inspection reports, and only while still a draft
  // owned by this inspector, or a Developer account.
  const showEdit = item.kind === 'inspection' && !isSubmitted && isOwnerOrManager;

  const visibleActionCount = (showEdit ? 1 : 0) + (showDelete ? 1 : 0);
  const revealWidth = ACTION_WIDTH * visibleActionCount;
  const openThreshold = revealWidth * OPEN_THRESHOLD_RATIO;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const close = () => {
    translateX.value = withTiming(0, { duration: Duration.base });
  };

  const panGesture = Gesture.Pan()
    // Swiping for edit/delete and ticking rows for export are two conflicting
    // gestures on one row, so the swipe is off while selecting.
    .enabled(revealWidth > 0 && !selectable)
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      translateX.value = Math.min(0, Math.max(-revealWidth, startX.value + e.translationX));
    })
    .onEnd(() => {
      translateX.value = withTiming(translateX.value < -openThreshold ? -revealWidth : 0, {
        duration: Duration.base,
      });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleCardPress = () => {
    if (selectable) {
      onToggleSelect?.(item);
      return;
    }
    // A tap while the row is swiped open snaps it shut instead of navigating.
    if (translateX.value < -1) {
      close();
      return;
    }
    onPress(item);
  };

  const handleAction = (handler: (item: AllReportItem) => void) => {
    close();
    handler(item);
  };

  return (
    <View style={styles.rowWrap}>
      {/* Actions revealed behind the card when swiped left */}
      <View style={styles.swipeActions}>
        {showEdit && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionEdit]}
            onPress={() => handleAction(onEdit)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}>
            <Ionicons name="pencil" size={20} color={Colors.textWhite} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
        {showDelete && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={() => handleAction(onDelete)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.title}`}>
            <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Foreground card — slides left via gesture to reveal the actions */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.card,
              urgency === 'overdue' && styles.cardOverdue,
              urgency === 'due-soon' && styles.cardDueSoon,
            ]}
            onPress={handleCardPress}
            activeOpacity={0.75}
            accessibilityRole={selectable ? 'checkbox' : 'button'}
            accessibilityLabel={`${item.title} for ${item.estabName}`}
            accessibilityState={selectable ? { checked: selected } : undefined}>
            {selectable && (
              <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                {selected && <Ionicons name="checkmark" size={14} color={Colors.textWhite} />}
              </View>
            )}

            <View style={[styles.iconWrap, { backgroundColor: display?.bgColor ?? Colors.bgLight }]}>
              <Ionicons
                name={display?.icon ?? 'document-outline'}
                size={17}
                color={display?.textColor ?? Colors.textMuted}
              />
            </View>

            <View style={styles.content}>
              <View style={styles.titleRow}>
                <AppText
                  variant="marquee"
                  text={item.title}
                  style={styles.title}
                  containerStyle={styles.titleContainer}
                />
                {item.status && (
                  <Badge
                    label={isSubmitted ? 'Submitted' : 'Draft'}
                    tone={isSubmitted ? 'success' : 'warning'}
                  />
                )}
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="business-outline"
                  size={10}
                  color={Colors.textMuted}
                  style={styles.metaIcon}
                />
                <AppText
                  variant="marquee"
                  text={item.estabName}
                  style={styles.estabName}
                  containerStyle={styles.estabNameContainer}
                />
              </View>

              {item.syncStatus === 'pending' && (
                <View style={styles.syncRow}>
                  <Ionicons name="cloud-upload-outline" size={10} color={Colors.pending} />
                  <Text style={styles.syncText}>Pending sync</Text>
                </View>
              )}
              {item.syncStatus === 'conflict' && (
                <TouchableOpacity
                  style={styles.syncRow}
                  onPress={() =>
                    confirmResolveConflict(
                      item.kind === 'inspection' ? 'inspection_reports' : 'survey_reports',
                      item.reportId,
                      item.title,
                    )
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Resolve sync conflict for ${item.title}`}>
                  <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
                  <Text style={[styles.syncText, styles.syncTextConflict]}>Sync conflict</Text>
                </TouchableOpacity>
              )}

              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
                <Text style={styles.date}>{formatDate(item.date)}</Text>
                {urgency !== 'none' && (
                  <View
                    style={[
                      styles.urgencyBadge,
                      {
                        backgroundColor:
                          urgency === 'overdue' ? Colors.hazwaste.badgeBg : Colors.warning.badgeBg,
                      },
                    ]}>
                    <Ionicons
                      name="alert-circle"
                      size={9}
                      color={urgency === 'overdue' ? Colors.hazwaste.badgeText : Colors.warning.text}
                    />
                    <Text
                      style={[
                        styles.urgencyBadgeText,
                        {
                          color:
                            urgency === 'overdue' ? Colors.hazwaste.badgeText : Colors.warning.text,
                        },
                      ]}>
                      {urgency === 'overdue' ? 'Overdue' : 'Due soon'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Fixed-format monospace: OS font scaling blows it past the
                  card width, so it opts out per the FONT_SCALING policy. */}
              <Text style={styles.controlNo} allowFontScaling={FONT_SCALING.tabular}>
                {item.controlNo || 'No control number yet'}
              </Text>
            </View>

            {!selectable && <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  rowWrap: {
    marginBottom: Spacing.md,
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  actionEdit: {
    backgroundColor: Colors.navy,
  },
  actionDelete: {
    backgroundColor: Colors.conflict,
  },
  actionText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Elevation.raised,
  },
  cardDueSoon: {
    borderColor: Colors.warning.border,
    backgroundColor: Colors.warning.bg,
  },
  cardOverdue: {
    borderColor: Colors.hazwaste.border,
    backgroundColor: Colors.hazwaste.bg,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  iconWrap: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  titleContainer: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height rather than its full line-height box.
  metaIcon: {
    marginTop: 1,
  },
  estabName: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  estabNameContainer: {
    flexShrink: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  syncText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.pending,
    fontWeight: '600',
  },
  syncTextConflict: {
    color: Colors.conflict,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  date: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    marginLeft: Spacing.xs,
  },
  urgencyBadgeText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
  },
  controlNo: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textLight,
    marginTop: Spacing.xxs,
    fontFamily: 'monospace',
  },
});
```

Two things folded in deliberately: the status pill is now the `Badge` primitive (its `success`/`warning` tones are exactly the fills the hand-rolled version used), and the swipe-delete's loose `#e74c3c` becomes `Colors.conflict`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/features/establishments/components/ReportListCard.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Shrink the drift-guard allowlist**

Remove `features/establishments/components/ReportListCard.tsx` from `src/design/driftGuardAllowlist.json`.

- [ ] **Step 6: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/establishments/components/ReportListCard.tsx src/features/establishments/components/ReportListCard.test.tsx src/design/driftGuardAllowlist.json
git commit -m "feat(reports): add selection mode to the report list card

A leading checkbox and suppressed swipe actions while selecting, for the
Export tab. Also completes the card's token migration — the status pill
becomes the Badge primitive and the swipe-delete's loose hex becomes
Colors.conflict — so it drops off the drift-guard allowlist.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: ExportReportsTab

**Files:**
- Create: `src/features/establishments/components/ExportReportsTab.tsx`
- Test: `src/features/establishments/components/ExportReportsTab.test.tsx`

**Interfaces:**
- Consumes: `useReportBrowser`, `ReportFilterSheet`, `ReportListCard` (selection props), `Section`, `EmptyState`, `Skeleton`, `Badge`, `Button`, `useScreenFooter`, `useSetFabHidden`, `useAuthContext`, `canManageAllRecords`.
- Produces: `ExportReportsTab` — takes no props.

**Two architectural points that matter:**

1. **The selection bar must not be rendered inline.** This component mounts inside `HomeScreen`'s `ScrollView`, so an absolutely-positioned bar would anchor to the scrolling *content* — it would sit below the whole list and scroll away, not pin to the viewport. It registers through `useScreenFooter` instead, which hoists it to render as a sibling of the header/footer chrome. That hook takes a factory plus deps (never a bare node — a fresh node each render creates an infinite update loop; see its own doc comment). Its unmount cleanup also clears the bar when the user switches tabs.
2. **Generate is disabled on this branch.** Document generation is a separate spec and spike. The button is real UI in its disabled state with copy saying so — not a live-looking control that does nothing.

- [ ] **Step 1: Write the failing test at `src/features/establishments/components/ExportReportsTab.test.tsx`**

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { AllReportItem } from '../hooks/useEstablishment';

const REPORTS: AllReportItem[] = [
  {
    key: 'inspection-r1', kind: 'inspection', reportId: 'r1', inspectorUid: 'u1', estabId: 'e1',
    estabName: 'Alpha Corp', estabProvince: 'Oriental Mindoro', estabCity: 'Calapan City',
    reportType: 'water_monitoring', title: 'Water Monitoring', date: '2026-08-01',
    controlNo: 'WQ-1', status: 'draft', syncStatus: 'synced',
  },
  {
    key: 'inspection-r2', kind: 'inspection', reportId: 'r2', inspectorUid: 'u1', estabId: 'e2',
    estabName: 'Beta Inc', estabProvince: 'Oriental Mindoro', estabCity: 'Calapan City',
    reportType: 'air_monitoring', title: 'Air Monitoring', date: '2026-08-02',
    controlNo: 'AQ-1', status: 'submitted', syncStatus: 'synced',
  },
];

const setFabHidden = jest.fn();
let registeredFooter: React.ReactNode = null;

jest.mock('../hooks/useReportBrowser', () => ({
  useReportBrowser: () => ({
    reports: REPORTS,
    loading: false,
    error: null,
    refetch: jest.fn(),
    state: {
      search: '', statusFilter: 'all', province: '', city: '',
      reportType: '', dateFrom: '', dateTo: '', sortOrder: 'newest',
    },
    provinceOptions: [],
    activeFilterCount: 0,
    setSearch: jest.fn(),
    setStatusFilter: jest.fn(),
    setProvince: jest.fn(),
    setCity: jest.fn(),
    setReportType: jest.fn(),
    setDateFrom: jest.fn(),
    setDateTo: jest.fn(),
    setSortOrder: jest.fn(),
    clearFilters: jest.fn(),
  }),
}));

jest.mock('../../home/context/ScreenFooterContext', () => ({
  useScreenFooter: (factory: () => React.ReactNode) => { registeredFooter = factory(); },
}));

jest.mock('../../home/context/FabVisibilityContext', () => ({
  useSetFabHidden: (hidden: boolean) => { setFabHidden(hidden); },
}));

jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ municipalities: [], session: { user: { id: 'u1' } }, role: 'Inspector' }),
}));

// canManageAllRecords is the only runtime import ExportReportsTab takes from
// useEstablishment (AllReportItem is type-only). Mocked so the test doesn't
// pull WatermelonDB's adapter in through that module's import chain.
jest.mock('../hooks/useEstablishment', () => ({
  canManageAllRecords: () => false,
  INSPECTION_TYPE_LABELS: { water_monitoring: 'Water Monitoring', air_monitoring: 'Air Monitoring' },
}));

import { ExportReportsTab } from './ExportReportsTab';
import { ReportListCard } from './ReportListCard';

type Renderer = TestRenderer.ReactTestRenderer;

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<ExportReportsTab />); });
  return r;
};

const selectRow = (r: Renderer, index: number) => {
  const cards = r.root.findAllByType(ReportListCard);
  act(() => { cards[index].props.onToggleSelect(REPORTS[index]); });
};

const footerText = (): string => {
  const rendered = TestRenderer.create(<>{registeredFooter}</>);
  return JSON.stringify(rendered.toJSON());
};

describe('ExportReportsTab', () => {
  beforeEach(() => {
    setFabHidden.mockClear();
    registeredFooter = null;
  });

  it('renders every filtered report as a selectable row', () => {
    const r = render();
    const cards = r.root.findAllByType(ReportListCard);
    expect(cards).toHaveLength(2);
    expect(cards[0].props.selectable).toBe(true);
  });

  it('registers no selection bar until something is selected', () => {
    render();
    expect(registeredFooter).toBeNull();
  });

  it('reports the selected count once a row is ticked', () => {
    const r = render();
    selectRow(r, 0);
    expect(footerText()).toContain('1 selected');
  });

  it('warns that a selected draft may be incomplete', () => {
    const r = render();
    selectRow(r, 0);
    expect(footerText()).toContain('is a draft');
  });

  it('does not warn when only submitted reports are selected', () => {
    const r = render();
    selectRow(r, 1);
    expect(footerText()).not.toContain('draft');
  });

  it('hides the FAB while a selection is active', () => {
    const r = render();
    selectRow(r, 0);
    expect(setFabHidden).toHaveBeenLastCalledWith(true);
  });

  it('selects and clears every filtered report at once', () => {
    const r = render();
    act(() => {
      r.root.findAll(n => n.props?.accessibilityLabel === 'Select all reports')[0].props.onPress();
    });
    expect(footerText()).toContain('2 selected');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/establishments/components/ExportReportsTab.test.tsx`
Expected: FAIL — `Cannot find module './ExportReportsTab'`.

- [ ] **Step 3: Write `src/features/establishments/components/ExportReportsTab.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { Section } from '../../../components/Section';
import { Skeleton } from '../../../components/Skeleton';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useSetFabHidden } from '../../home/context/FabVisibilityContext';
import { useScreenFooter } from '../../home/context/ScreenFooterContext';
import { AllReportItem, canManageAllRecords } from '../hooks/useEstablishment';
import { useReportBrowser } from '../hooks/useReportBrowser';
import { ReportFilterSheet } from './ReportFilterSheet';
import { ReportListCard } from './ReportListCard';

const SKELETON_ROW_HEIGHT = 96;

export const ExportReportsTab: React.FC = () => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const browser = useReportBrowser();
  const { reports, loading, error, refetch, activeFilterCount, state } = browser;

  const { municipalities, session, role } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isDeveloper = canManageAllRecords(role ?? '');

  // Derived from the live list rather than stored alongside it, so a
  // selection can't survive a filter change that removes the report.
  const selectedItems = useMemo(
    () => reports.filter(report => selectedKeys.has(report.key)),
    [reports, selectedKeys],
  );
  const draftCount = selectedItems.filter(report => report.status === 'draft').length;
  const allSelected = reports.length > 0 && selectedItems.length === reports.length;

  // The FAB would sit on top of the selection bar. Restored automatically
  // when the selection clears or the tab unmounts.
  useSetFabHidden(selectedItems.length > 0);

  const toggleSelect = (item: AllReportItem) => {
    setSelectedKeys(previous => {
      const next = new Set(previous);
      if (next.has(item.key)) {
        next.delete(item.key);
      } else {
        next.add(item.key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(reports.map(report => report.key)));
  };

  // Registered rather than rendered inline: this component mounts inside
  // HomeScreen's ScrollView, so an absolutely-positioned bar would anchor to
  // the scrolling content and slide away instead of pinning to the viewport.
  // See useScreenFooter for why this takes a factory plus deps.
  useScreenFooter(
    () =>
      selectedItems.length > 0 ? (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedItems.length} selected</Text>
          {draftCount > 0 && (
            <View style={styles.draftWarning}>
              <Badge label={draftCount === 1 ? '1 draft' : `${draftCount} drafts`} tone="warning" />
              <Text style={styles.draftWarningText}>
                {draftCount} of {selectedItems.length} selected{' '}
                {draftCount === 1 ? 'is a draft' : 'are drafts'} and may be incomplete.
              </Text>
            </View>
          )}
          <Button label="Generate" onPress={() => {}} variant="primary" size="md" disabled fullWidth />
          <Text style={styles.comingSoon}>
            Document generation arrives in a future release.
          </Text>
        </View>
      ) : null,
    [selectedItems.length, draftCount],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton height={38} radius={Radius.pill} style={styles.skeletonRow} />
        <Skeleton height={SKELETON_ROW_HEIGHT} style={styles.skeletonRow} />
        <Skeleton height={SKELETON_ROW_HEIGHT} style={styles.skeletonRow} />
        <Skeleton height={SKELETON_ROW_HEIGHT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          message={error}
          action={<Button label="Retry" onPress={refetch} variant="outline" size="md" />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by establishment name..."
            placeholderTextColor={Colors.textMuted}
            value={state.search}
            onChangeText={browser.setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFiltersOpen(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Filter reports">
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? Colors.textWhite : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <Section
        title="SELECT REPORTS TO EXPORT"
        right={
          reports.length > 0 ? (
            <TouchableOpacity
              onPress={toggleSelectAll}
              accessibilityRole="button"
              accessibilityLabel={allSelected ? 'Clear all reports' : 'Select all reports'}>
              <Text style={styles.selectAllText}>{allSelected ? 'Clear all' : 'Select all'}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          icon="document-outline"
          message={
            state.search || activeFilterCount > 0
              ? 'No reports match your filters.'
              : 'No reports to export yet.'
          }
        />
      ) : (
        reports.map(item => (
          <ReportListCard
            key={item.key}
            item={item}
            currentUid={currentUid}
            canManageAll={isDeveloper}
            // Opening, editing, and deleting are all suppressed while
            // selecting — the row's only job here is to be picked.
            onPress={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            selectable
            selected={selectedKeys.has(item.key)}
            onToggleSelect={toggleSelect}
          />
        ))
      )}

      <ReportFilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        browser={browser}
        municipalities={municipalities}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  skeletonRow: {
    marginBottom: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Type.bodySm.fontSize,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.navy,
  },
  selectAllText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
    color: Colors.accent,
  },
  selectionBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Elevation.overlay,
  },
  selectionCount: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  draftWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  draftWarningText: {
    flex: 1,
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  comingSoon: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/features/establishments/components/ExportReportsTab.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0 — including the drift guard, since this is a new file written token-clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/establishments/components/ExportReportsTab.tsx src/features/establishments/components/ExportReportsTab.test.tsx
git commit -m "feat(reports): add the export selection UI

Filters and search reuse useReportBrowser, rows are selectable, and drafts
are includable but flagged. The selection bar registers through
useScreenFooter rather than rendering inline, so it pins to the viewport
instead of scrolling away inside Home's ScrollView. Generate is deliberately
disabled — document generation is a separate spec.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 18: Wire up the Export tab and verify on device

**Files:**
- Modify: `src/app/(app)/home.tsx` (swap the placeholder for the real tab)

**Interfaces:**
- Consumes: `ExportReportsTab`.
- Produces: nothing new.

- [ ] **Step 1: Replace the placeholder in `src/app/(app)/home.tsx`**

Swap the `EmptyState` import for the real component:

```tsx
import { ExportReportsTab } from '../../features/establishments/components/ExportReportsTab';
```

and the switch case:

```tsx
      case 'exportReports':
        return <ExportReportsTab />;
```

- [ ] **Step 2: Verify the whole suite, types, and lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 3: Confirm the drift-guard allowlist actually shrank**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('src/design/driftGuardAllowlist.json','utf8')).length, 'files still allowlisted')"
```

Expected: the count is lower than the Task 5 seed by at least five (`HomeTabs.tsx`, `home.tsx`, `ManageReportsTab.tsx`, `ReportListCard.tsx`, plus the two deleted files). None of the files created by this plan may appear in it.

- [ ] **Step 4: Run the app on the connected device**

```bash
npx expo run:android
```

Walk the golden path and confirm each:

1. Home opens on **Manage Reports**, and the tab bar shows exactly three tabs with no Create tab.
2. The FAB sits bottom-right, clear of the footer bar.
3. Tapping it fades in the scrim and staggers six rows upward; the `+` rotates to a `×`.
4. Each row's label is readable and does not wrap or clip.
5. Selecting a row navigates to that report type's flow (water opens the real form; the others open the existing placeholder screen).
6. Reopening the dial and pressing Android back closes the dial without navigating away.
7. Tapping the scrim closes it.
8. Navigating into an inspection form hides the FAB; returning to Home shows it again.
9. The Export tab lists reports, ticking rows pins the selection bar above the footer, the draft warning appears when a draft is selected, and the FAB hides while the bar is up.
10. Switching tabs clears the selection bar.

- [ ] **Step 5: Capture before/after screenshots**

The `body` 14 density question is settled here, not in review. Capture Home, the open dial, the Manage Reports list, and the Export tab:

```bash
adb shell screencap -p /sdcard/inspectplus-after-home.png && adb pull /sdcard/inspectplus-after-home.png ./
```

Repeat per screen. Compare against the same screens on `develop`. **If the compliance or report tables measurably break at body 14, apply the agreed fallback** — change `Type.body` to `{ fontSize: 13, lineHeight: 18 }` in `src/design/typography.ts`, leaving the 11px floor intact — and re-capture. Report the outcome either way.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/home.tsx"
git commit -m "feat(reports): wire the Export tab into Home

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Confirm the branch is clean and ready for review**

```bash
git status
git log --oneline develop..HEAD
```

Expected: a clean tree and roughly 18 commits. Do not merge — `superpowers:finishing-a-development-branch` covers integration, and the on-device screenshots go to the user first.

---

## Notes carried forward

- **Deferred to its own spec and spike:** on-device `.docx` generation from the six legal form templates. Blocked on the user supplying the blank templates, and on a spike proving whether an OOXML zip/template library runs under Hermes (and what its licence permits for a government deployment). Target once proven: on-device generation with a Supabase Edge Function path, one `.docx` per report, zipped for a multi-select batch.
- **Deferred to a later sweep:** the Toast/snackbar system, and token migration of the ~40 files still on the drift-guard allowlist (`Button.tsx`, `AppText.tsx`, `EstablishmentCard.tsx`, the water compliance sections, and the rest).
- **`Card.tsx` has no consumer on this branch.** It is written and token-clean, but `ReportListCard` keeps its own bespoke card styling because of the swipe-actions layering. `Card` gets adopted in the establishments sweep.
