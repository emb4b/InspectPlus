# Runtime-configurable urgency thresholds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let EMB change the due-soon and overdue day thresholds from the `app_config` table, without rebuilding or redistributing the app.

**Architecture:** A new `urgencyConfig` module owns a module-level in-memory snapshot of the two thresholds. It resolves, in order: values fetched from `app_config`, values cached in AsyncStorage, and the build-time `ENV` defaults. `getReportUrgency` reads the snapshot through a **synchronous** getter, so its signature and both card components are untouched. The snapshot is hydrated from AsyncStorage at startup and refreshed from `app_config` on every sync run.

**Tech Stack:** TypeScript, React Native (Expo SDK 55), Supabase via PostgREST, AsyncStorage, Jest + react-test-renderer.

**Spec:** `docs/superpowers/specs/2026-09-09-runtime-urgency-config-design.md`

## Global Constraints

- **`getReportUrgency` must stay synchronous.** It is called inline during render at `ReportListCard.tsx:61` and `EstablishmentReportsSection.tsx:49`. Its signature `(dateIso: string, status: string | null) => ReportUrgency` does not change, and neither card component is modified by this plan.
- **Fail open, always.** A config read that errors, returns nothing, or returns nonsense leaves the previously resolved values in effect. `refreshUrgencyConfig` must never reject — a sync run awaits it.
- **Validation rules for an accepted pair — all four must hold:** both values parse as finite numbers; both are integers; both are greater than zero; `overdueDays > dueSoonDays`. A pair failing any rule is discarded whole and nothing is persisted.
- **Storage key:** `inspectplus.config.urgency` (matches the `inspectplus.sync.metadata` / `inspectplus.cred.*` convention).
- **`app_config` row keys:** `due_soon_days` and `overdue_days`.
- **Do not raise `min_supported_app_version` in this work.** Per the spec, that happens later, at the moment EMB first changes a threshold.
- **Verification commands:** `npm test`, `npx tsc --noEmit`, `npx eslint src --ext .ts,.tsx --max-warnings 0`. All three must pass before any commit. Lint runs at `--max-warnings 0`, so a stray unused import fails the build.
- **Commit messages are commitlint-enforced** (`@commitlint/config-conventional` plus a `scope-enum`). The scope MUST be one of: `auth, sync, snapshot, air, water, hazwaste, eia, survey, establishments, reports, ci, repo, db, supabase, router`. A scope outside that list is rejected by the `commit-msg` hook. The `pre-commit` hook runs the full Jest suite, so every commit takes ~30s.
- **A `require()` in a test needs a disable comment**, per the existing convention: `// eslint-disable-next-line @typescript-eslint/no-require-imports -- <reason>`.

---

### Task 1: Urgency config module — storage, hydration, synchronous resolution

Builds the module and everything that does not touch the network: the in-memory snapshot, the synchronous getter, the validator, and AsyncStorage hydration.

**Files:**
- Create: `src/services/config/urgencyConfig.ts`
- Test: `src/services/config/urgencyConfig.test.ts`

**Interfaces:**
- Consumes: `ENV.dueSoonDays`, `ENV.overdueDays` from `src/core/config/env.ts`.
- Produces:
  - `interface UrgencyThresholds { dueSoonDays: number; overdueDays: number }`
  - `getUrgencyConfig(): UrgencyThresholds` — synchronous
  - `hydrateUrgencyConfig(): Promise<void>`
  - `isValidThresholds(value: UrgencyThresholds): boolean`
  - Task 2 adds `refreshUrgencyConfig` to this same module.

- [ ] **Step 1: Write the failing test**

Create `src/services/config/urgencyConfig.test.ts`:

```ts
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../../core/config/env';

// jest-expo's preset does not mock this third-party package, so it needs the
// mock the package itself ships. The `mock`-prefixed name is required for
// Jest to allow the hoisted factory to reference it.
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const STORAGE_KEY = 'inspectplus.config.urgency';

// The module holds its snapshot in module scope, so each test needs a fresh
// copy of it rather than one shared across the file.
const loadModule = () => {
  let mod!: typeof import('./urgencyConfig');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would share one snapshot across every test
    mod = require('./urgencyConfig');
  });
  return mod;
};

describe('urgencyConfig resolution', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('falls back to the build-time ENV defaults before anything is hydrated', () => {
    const { getUrgencyConfig } = loadModule();
    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });

  it('adopts a valid cached pair on hydration', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dueSoonDays: 7, overdueDays: 21 }));
    const { getUrgencyConfig, hydrateUrgencyConfig } = loadModule();

    await hydrateUrgencyConfig();

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: 7, overdueDays: 21 });
  });

  it('keeps the ENV defaults when the cached value is not valid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json');
    const { getUrgencyConfig, hydrateUrgencyConfig } = loadModule();

    await hydrateUrgencyConfig();

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });

  it('rejects a cached pair whose overdue window is not beyond the due-soon window', async () => {
    // This is the pair that matters most: overdue <= dueSoon makes the
    // 'due-soon' branch of getReportUrgency unreachable, so every flagged
    // report would jump straight to 'Overdue' with no warning state.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dueSoonDays: 30, overdueDays: 30 }));
    const { getUrgencyConfig, hydrateUrgencyConfig } = loadModule();

    await hydrateUrgencyConfig();

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });
});

describe('isValidThresholds', () => {
  const { isValidThresholds } = loadModule();

  it.each([
    ['a normal pair', { dueSoonDays: 14, overdueDays: 30 }, true],
    ['an inverted pair', { dueSoonDays: 30, overdueDays: 14 }, false],
    ['an equal pair', { dueSoonDays: 20, overdueDays: 20 }, false],
    ['a fractional due-soon window', { dueSoonDays: 14.5, overdueDays: 30 }, false],
    ['a zero due-soon window', { dueSoonDays: 0, overdueDays: 30 }, false],
    ['a negative overdue window', { dueSoonDays: 14, overdueDays: -1 }, false],
    ['a NaN value', { dueSoonDays: Number.NaN, overdueDays: 30 }, false],
    ['an infinite value', { dueSoonDays: 14, overdueDays: Number.POSITIVE_INFINITY }, false],
  ])('returns %s -> %s', (_label, pair, expected) => {
    expect(isValidThresholds(pair)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/services/config/urgencyConfig.test.ts
```

Expected: FAIL — `Cannot find module './urgencyConfig'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/services/config/urgencyConfig.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../../core/config/env';

export interface UrgencyThresholds {
  dueSoonDays: number;
  overdueDays: number;
}

const STORAGE_KEY = 'inspectplus.config.urgency';

// Null until a validated pair arrives from the cache or app_config; until
// then getUrgencyConfig resolves the build-time ENV defaults.
let snapshot: UrgencyThresholds | null = null;

// These values are operator-editable, so they are untrusted input. Rule 4 is
// the one that matters most: an inverted or equal pair makes the 'due-soon'
// branch of getReportUrgency unreachable, so a report would jump straight to
// 'Overdue' with no warning state.
export function isValidThresholds(value: UrgencyThresholds): boolean {
  const { dueSoonDays, overdueDays } = value;
  return (
    Number.isInteger(dueSoonDays) &&
    dueSoonDays > 0 &&
    Number.isInteger(overdueDays) &&
    overdueDays > 0 &&
    overdueDays > dueSoonDays
  );
}

// Synchronous by contract — getReportUrgency calls this during render, once
// per report row, so it can never await.
export function getUrgencyConfig(): UrgencyThresholds {
  return snapshot ?? { dueSoonDays: ENV.dueSoonDays, overdueDays: ENV.overdueDays };
}

function parseStored(raw: string | null): UrgencyThresholds | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const v = parsed as Record<string, unknown>;
    if (typeof v.dueSoonDays !== 'number' || typeof v.overdueDays !== 'number') return null;

    const candidate: UrgencyThresholds = {
      dueSoonDays: v.dueSoonDays,
      overdueDays: v.overdueDays,
    };
    return isValidThresholds(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

// Called once at startup, before the first report list renders, so a cold
// start offline still uses the last known operator values rather than
// briefly showing the ENV defaults and then flipping.
export async function hydrateUrgencyConfig(): Promise<void> {
  try {
    const stored = parseStored(await AsyncStorage.getItem(STORAGE_KEY));
    if (stored) snapshot = stored;
  } catch {
    // A storage read failure leaves the ENV defaults in place — never fatal.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/services/config/urgencyConfig.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Verify the whole project is still clean**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx --max-warnings 0
```

Expected: both silent (exit 0).

- [ ] **Step 6: Commit**

```bash
git add src/services/config/urgencyConfig.ts src/services/config/urgencyConfig.test.ts
git commit -m "feat(reports): add urgency threshold config module"
```

---

### Task 2: Fetch thresholds from `app_config`

Adds the network half of the module, plus the migration seeding the rows it reads.

**Files:**
- Modify: `src/services/config/urgencyConfig.ts` (append `refreshUrgencyConfig`)
- Modify: `src/services/config/urgencyConfig.test.ts` (append a describe block)
- Create: `supabase/migrations/20260909000000_seed_urgency_thresholds.sql`

**Interfaces:**
- Consumes: `isValidThresholds`, `getUrgencyConfig`, the `STORAGE_KEY` constant and the `snapshot` variable from Task 1.
- Produces: `refreshUrgencyConfig(supabase: SupabaseClient): Promise<void>` — never rejects. Task 4 calls it.

- [ ] **Step 1: Write the failing test**

Append to `src/services/config/urgencyConfig.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

// app_config is read straight through PostgREST, the same out-of-band
// pattern appVersionGate.ts uses. `.in()` is the terminal call in that
// chain, so it is what resolves.
type ConfigRow = { key: string; value: string };

function fakeSupabase(result: {
  data: ConfigRow[] | null;
  error: { message: string } | null;
}): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        in: () => Promise.resolve(result),
      }),
    }),
  } as unknown as SupabaseClient;
}

function rejectingSupabase(): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        in: () => Promise.reject(new Error('network down')),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('refreshUrgencyConfig', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('adopts a valid remote pair and caches it for the next cold start', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({
        data: [
          { key: 'due_soon_days', value: '7' },
          { key: 'overdue_days', value: '21' },
        ],
        error: null,
      }),
    );

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: 7, overdueDays: 21 });
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string)).toEqual({
      dueSoonDays: 7,
      overdueDays: 21,
    });
  });

  it('fills a key the response omits from the currently resolved value', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({ data: [{ key: 'due_soon_days', value: '9' }], error: null }),
    );

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: 9, overdueDays: ENV.overdueDays });
  });

  it('keeps the current values when the read errors', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(fakeSupabase({ data: null, error: { message: 'permission denied' } }));

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('discards an invalid pair whole rather than adopting half of it', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({
        data: [
          { key: 'due_soon_days', value: '40' },
          { key: 'overdue_days', value: '30' },
        ],
        error: null,
      }),
    );

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores a non-numeric value rather than resolving NaN thresholds', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({
        data: [
          { key: 'due_soon_days', value: 'soon' },
          { key: 'overdue_days', value: '21' },
        ],
        error: null,
      }),
    );

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: ENV.dueSoonDays, overdueDays: 21 });
  });

  // A sync run awaits this call, so a rejection here would break sync
  // entirely. This is where the spec's "a rejected refresh does not fail the
  // sync run" guarantee lives — the orchestrator relies on it rather than
  // wrapping the call in its own catch.
  it('never rejects, even when the query itself throws', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await expect(refreshUrgencyConfig(rejectingSupabase())).resolves.toBeUndefined();
    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/services/config/urgencyConfig.test.ts
```

Expected: FAIL — `refreshUrgencyConfig is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Add the import at the top of `src/services/config/urgencyConfig.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
```

Append to the same file:

```ts
const DUE_SOON_KEY = 'due_soon_days';
const OVERDUE_KEY = 'overdue_days';

interface ConfigRow {
  key: string;
  value: string;
}

function numberFromRows(rows: ConfigRow[], key: string, fallback: number): number {
  const row = rows.find(r => r.key === key);
  if (!row) return fallback;

  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Reads the operator-controlled thresholds out of app_config. Fails open in
// every direction — a network error, a missing table, an RLS denial or a
// nonsensical pair all leave the last known values in effect. It must never
// reject: runManagedSync awaits it, and a config read has no business
// failing a sync.
export async function refreshUrgencyConfig(supabase: SupabaseClient): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [DUE_SOON_KEY, OVERDUE_KEY]);

    if (error || !data) return;

    const rows = data as ConfigRow[];
    const current = getUrgencyConfig();
    const candidate: UrgencyThresholds = {
      dueSoonDays: numberFromRows(rows, DUE_SOON_KEY, current.dueSoonDays),
      overdueDays: numberFromRows(rows, OVERDUE_KEY, current.overdueDays),
    };

    if (!isValidThresholds(candidate)) return;

    snapshot = candidate;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
  } catch {
    // Fail open — same stance as assertAppVersionSupported.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/services/config/urgencyConfig.test.ts
```

Expected: PASS, 18 tests.

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/20260909000000_seed_urgency_thresholds.sql`:

```sql
-- Report urgency windows, in days since the inspection date. These were
-- compiled into the app until now; moving them here lets EMB retune a
-- filing-deadline policy without rebuilding and redistributing the app.
--
-- Seeded with the values the app already shipped with, so applying this
-- changes nothing visible. No schema or RLS change is needed: app_config
-- already carries the app_config_select_authenticated policy and the
-- table-level grant from 20260901010000.
--
-- IMPORTANT: a client older than 1.1.0 does not read these keys and keeps
-- computing 14/30 from its own bundle. When either value is changed, raise
-- min_supported_app_version to 1.1.0 in the same operation so older builds
-- are told to update instead of silently disagreeing with the office. See
-- docs/superpowers/specs/2026-09-09-runtime-urgency-config-design.md.

INSERT INTO app_config (key, value)
VALUES ('due_soon_days', '14'), ('overdue_days', '30')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 6: Verify the whole project is still clean**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx --max-warnings 0
```

Expected: both silent (exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/services/config/urgencyConfig.ts src/services/config/urgencyConfig.test.ts supabase/migrations/20260909000000_seed_urgency_thresholds.sql
git commit -m "feat(reports): read urgency thresholds from app_config"
```

---

### Task 3: Point `getReportUrgency` at the config module

**Files:**
- Modify: `src/utils/reportUrgency.ts`
- Modify: `src/utils/reportUrgency.test.ts`
- Modify: `README.md` (the "Environment variables" section)

**Interfaces:**
- Consumes: `getUrgencyConfig()` from Task 1.
- Produces: no signature change. `getReportUrgency(dateIso, status)` still returns `{ level, days }`.

- [ ] **Step 1: Update the test to mock the config module instead of ENV**

In `src/utils/reportUrgency.test.ts`, replace the existing mock block at the top:

```ts
// The thresholds now come from the config module rather than ENV directly,
// so the tests drive them through a mutable mock of that module. jest.mock
// factories may only close over out-of-scope names prefixed with `mock`.
const mockThresholds = { dueSoonDays: 14, overdueDays: 30 };
jest.mock('../services/config/urgencyConfig', () => ({
  getUrgencyConfig: () => mockThresholds,
}));
```

Replace the `beforeEach` body so it resets the new object:

```ts
  beforeEach(() => {
    mockThresholds.dueSoonDays = 14;
    mockThresholds.overdueDays = 30;
  });
```

Then update the two config-driven test bodies to assign to `mockThresholds` instead of `mockEnv`, and rename them so they name the real source:

```ts
  it('takes the due-soon threshold from runtime config, not a hard-coded 14', () => {
    mockThresholds.dueSoonDays = 5;
    // A 6-day-old draft is unflagged under the default 14 but due soon at 5.
    expect(getReportUrgency(daysAgo(6), 'draft')).toEqual({ level: 'due-soon', days: 24 });
  });

  it('takes the overdue threshold from runtime config, not a hard-coded 30', () => {
    mockThresholds.overdueDays = 20;
    // A 25-day-old draft is only due-soon under the default 30, overdue at 20.
    expect(getReportUrgency(daysAgo(25), 'draft')).toEqual({ level: 'overdue', days: 5 });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/utils/reportUrgency.test.ts
```

Expected: FAIL. `reportUrgency.ts` still reads `ENV`, which the test no longer controls, so the two threshold tests get the unchanged 14/30 defaults and their expectations miss.

- [ ] **Step 3: Write the minimal implementation**

In `src/utils/reportUrgency.ts`, replace the import:

```ts
import { getUrgencyConfig } from '../services/config/urgencyConfig';
```

and replace the destructure inside `getReportUrgency`:

```ts
  const { dueSoonDays, overdueDays } = getUrgencyConfig();
```

Update the function's doc comment to name the new source:

```ts
// Draft reports that sit too long after the inspection date risk missing
// filing deadlines. Submitted reports are already filed, so they're never
// flagged regardless of age. Both windows are operator-controlled — see
// src/services/config/urgencyConfig.ts for how they resolve.
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/utils/reportUrgency.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Update the README**

In `README.md`, under "Environment variables", replace the paragraph introducing `EXPO_PUBLIC_DUE_SOON_DAYS` / `EXPO_PUBLIC_OVERDUE_DAYS` so it no longer presents them as the production knob:

```markdown
A draft crosses into "Due in N days" at `DUE_SOON_DAYS` and into "Overdue by N days" at `OVERDUE_DAYS`, counting from its inspection date; submitted reports are never flagged. See `src/utils/reportUrgency.ts`.

**These `.env` values are build-time defaults only.** In a running app the
thresholds come from the `due_soon_days` / `overdue_days` rows in the
Supabase `app_config` table, refreshed on every sync and cached for offline
use — so EMB can retune them without a new build. The `.env` values apply
only until the first successful sync on a fresh install. See
`src/services/config/urgencyConfig.ts`.
```

- [ ] **Step 6: Run the full suite and verify the project is clean**

```bash
npm test && npx tsc --noEmit && npx eslint src --ext .ts,.tsx --max-warnings 0
```

Expected: all suites pass. The two card component suites are unaffected — `getReportUrgency` kept its signature.

- [ ] **Step 7: Commit**

```bash
git add src/utils/reportUrgency.ts src/utils/reportUrgency.test.ts README.md
git commit -m "refactor(reports): resolve urgency thresholds through runtime config"
```

---

### Task 4: Refresh the thresholds on every sync run

**Files:**
- Modify: `src/services/sync/syncOrchestrator.ts:73`
- Test: `src/services/sync/syncOrchestrator.test.ts` (create)

**Interfaces:**
- Consumes: `refreshUrgencyConfig(supabase)` from Task 2.
- Produces: nothing new. `runManagedSync(userId, options)` keeps its signature.

Note on scope: the spec's "a rejected refresh does not fail the sync run" is covered by Task 2's *never rejects* test, so the guarantee lives in one place. The orchestrator therefore awaits the call plainly, with no catch of its own, and this task asserts only the wiring.

- [ ] **Step 1: Write the failing test**

Create `src/services/sync/syncOrchestrator.test.ts`:

```ts
import { runManagedSync } from './syncOrchestrator';
import { checkOnline } from '../../utils/network';
import { assertAppVersionSupported } from './appVersionGate';
import { refreshUrgencyConfig } from '../config/urgencyConfig';
import { syncClient } from './syncClient';

// runManagedSync is pure wiring over these collaborators — every one of them
// reaches the network, the database or native storage, so they are all
// replaced here and the assertions are about call order and call count.
jest.mock('../../db/sync/watermelonAdapter', () => ({ clearSyncedRecords: jest.fn() }));
jest.mock('../../utils/network', () => ({ checkOnline: jest.fn() }));
jest.mock('../supabase/client', () => ({ supabase: { marker: 'the-client' } }));
jest.mock('./syncClient', () => ({ syncClient: { runFullSync: jest.fn() } }));
jest.mock('./syncState', () => ({
  getLastSyncedUserId: jest.fn(() => Promise.resolve(null)),
  setLastSyncedUserId: jest.fn(() => Promise.resolve()),
  resetSyncMetadata: jest.fn(() => Promise.resolve()),
}));
jest.mock('./syncEvents', () => ({ notifySyncDataChanged: jest.fn() }));
jest.mock('./appVersionGate', () => ({ assertAppVersionSupported: jest.fn(() => Promise.resolve()) }));
jest.mock('../../features/attachments/attachmentUploadQueue', () => ({
  uploadPendingAttachments: jest.fn(() => Promise.resolve()),
}));
jest.mock('../config/urgencyConfig', () => ({ refreshUrgencyConfig: jest.fn(() => Promise.resolve()) }));

const mockedCheckOnline = checkOnline as jest.Mock;
const mockedAssertVersion = assertAppVersionSupported as jest.Mock;
const mockedRefreshConfig = refreshUrgencyConfig as jest.Mock;
const mockedRunFullSync = syncClient.runFullSync as jest.Mock;

describe('runManagedSync urgency config refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCheckOnline.mockResolvedValue(true);
    mockedRunFullSync.mockResolvedValue({ pushed: false, pulled: true });
  });

  it('refreshes the thresholds with the shared client on every run', async () => {
    await runManagedSync('uid-1');

    expect(mockedRefreshConfig).toHaveBeenCalledTimes(1);
    expect(mockedRefreshConfig).toHaveBeenCalledWith({ marker: 'the-client' });
  });

  it('refreshes only after the version gate has passed', async () => {
    await runManagedSync('uid-1');

    // An unsupported build must be turned away before it acts on config it
    // may be too old to honour.
    expect(mockedAssertVersion.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRefreshConfig.mock.invocationCallOrder[0],
    );
  });

  it('refreshes before the sync itself, so the run notifies listeners with the new values', async () => {
    await runManagedSync('uid-1');

    expect(mockedRefreshConfig.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRunFullSync.mock.invocationCallOrder[0],
    );
  });

  it('does not attempt a refresh while offline', async () => {
    mockedCheckOnline.mockResolvedValue(false);

    await expect(runManagedSync('uid-1')).resolves.toBeNull();
    expect(mockedRefreshConfig).not.toHaveBeenCalled();
  });

  it('does not run when the version gate rejects', async () => {
    mockedAssertVersion.mockRejectedValueOnce(new Error('update required'));

    await expect(runManagedSync('uid-1')).rejects.toThrow('update required');
    expect(mockedRefreshConfig).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/services/sync/syncOrchestrator.test.ts
```

Expected: FAIL — `expect(jest.fn()).toHaveBeenCalledTimes(1)` receives 0 calls, because the orchestrator does not call `refreshUrgencyConfig` yet.

- [ ] **Step 3: Write the minimal implementation**

In `src/services/sync/syncOrchestrator.ts`, add the import beside the existing `appVersionGate` one:

```ts
import { refreshUrgencyConfig } from '../config/urgencyConfig';
```

and add the call immediately after the version gate at line 73:

```ts
  await assertAppVersionSupported(supabase);

  // Operator-controlled report urgency windows, read out-of-band from the
  // same app_config table. Fails open inside refreshUrgencyConfig, so it can
  // never break a sync run; the notifySyncDataChanged in the finally below
  // then re-renders any subscribed list against the refreshed values.
  await refreshUrgencyConfig(supabase);
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/services/sync/syncOrchestrator.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full suite and verify the project is clean**

```bash
npm test && npx tsc --noEmit && npx eslint src --ext .ts,.tsx --max-warnings 0
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/sync/syncOrchestrator.ts src/services/sync/syncOrchestrator.test.ts
git commit -m "feat(sync): refresh urgency thresholds on every sync run"
```

---

### Task 5: Hydrate the cached thresholds at startup

Without this, a cold start shows the `ENV` defaults until the first sync completes — and shows them indefinitely if the device is offline. This is the task that makes the cache worth having.

**Files:**
- Modify: `src/core/providers/AuthProvider.tsx` (the bootstrap effect at line 81)

**Interfaces:**
- Consumes: `hydrateUrgencyConfig()` from Task 1.
- Produces: nothing.

This task has no automated test. There is no existing `AuthProvider` test harness — the component pulls in the Supabase client, the sync orchestrator and native storage — and standing one up is a larger piece of work than the one line it would cover. `hydrateUrgencyConfig` itself is fully tested in Task 1; what is unverified here is only the call site. Its gate is review plus the manual check in Step 3.

**The effect is not async.** `useEffect(() => { ... })` at line 81 fires several independent `.then()` chains, and `setLoading(false)` is reached from three separate places (`settleOnce` at line 88, the `onAuthStateChange` listener at line 131, and the boot timeout below them). Do **not** try to `await` hydration there, and do not restructure the effect to make it awaitable — that boot sequence carries documented race conditions and a deliberate timeout. Hydration is fire-and-forget, matching the sibling cached-value loads. See the spec's "Startup hydration" section for the accepted tradeoff.

- [ ] **Step 1: Add the hydration call**

Add the import alongside the other service imports at the top of the file (after the existing `import { notifyUpdateRequired } from '../../services/sync/syncEvents';`):

```ts
import { hydrateUrgencyConfig } from '../../services/config/urgencyConfig';
```

Then add the call inside the bootstrap effect, directly after the cached-role block that ends at line 116 — so it sits with the other cached-value loads it mirrors:

```ts
    // Same as above, for the cached report-urgency thresholds: a cold start
    // (offline included) then flags reports with the last known operator
    // values rather than the build-time defaults. Fire-and-forget like its
    // siblings — the read is kicked off at boot and resolves long before any
    // report list mounts, and the next sync corrects it regardless. Never
    // throws — see urgencyConfig.ts.
    hydrateUrgencyConfig();
```

- [ ] **Step 2: Run the full suite and verify the project is clean**

```bash
npm test && npx tsc --noEmit && npx eslint src --ext .ts,.tsx --max-warnings 0
```

Expected: all suites pass, both checks silent.

- [ ] **Step 3: Manual verification on a device or simulator**

The plan's automated coverage stops at the module boundary, so confirm the wiring by hand:

1. Run the app, sign in, and let a sync complete.
2. In Supabase, set `due_soon_days` to `5` and `overdue_days` to `9`.
3. Sync again from the Home header's Sync Now. Reports aged 5–8 days should now show "Due in N days" and anything 9+ days should show "Overdue"; the corner chips change without an app restart.
4. Kill the app, put the device in airplane mode, reopen it. The chips must still reflect 5/9, not 14/30 — that is the hydration path this task added.
5. Restore `due_soon_days` to `14` and `overdue_days` to `30`.

- [ ] **Step 4: Commit**

```bash
git add src/core/providers/AuthProvider.tsx
git commit -m "feat(reports): hydrate cached urgency thresholds at startup"
```

---

## Deployment note

The migration in Task 2 must be applied before or alongside the release that ships this code. It is additive and idempotent (`ON CONFLICT DO NOTHING`), and it seeds the values the app already used, so applying it early is safe and changes nothing for clients that do not read the keys.

Per the spec, **do not** raise `min_supported_app_version` as part of this release. That happens later, in the same operation as the first real threshold change.
