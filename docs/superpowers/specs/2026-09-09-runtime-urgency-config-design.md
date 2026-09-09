# Runtime-configurable report urgency thresholds

Status: designed, not implemented. Follows `feature/due-soon-reorg`
(8302c49), which moved `DUE_SOON_DAYS` / `OVERDUE_DAYS` out of module
constants in `src/utils/reportUrgency.ts` and into `ENV`, overridable at
build time via `EXPO_PUBLIC_DUE_SOON_DAYS` / `EXPO_PUBLIC_OVERDUE_DAYS`.

## Purpose

The due-soon and overdue windows encode a filing-deadline policy that
belongs to EMB, not to the codebase. If EMB decides reports are overdue
at 21 days instead of 30, that change must reach inspectors without
building and redistributing an APK.

The `ENV` layer added in 8302c49 does not achieve this. `EXPO_PUBLIC_*`
variables are inlined into the JS bundle at build time, so a `.env` edit
only takes effect for whoever runs the next build, and reaches an
inspector only when they install it.

## The constraint

A binary already installed computes with the code it shipped with. The
1.0.3 build in the field has its thresholds compiled into its bundle and
never asks the backend about them. No server-side change reaches it:

- `app_config` — 1.0.3 does not read those keys.
- A new synced column (e.g. a per-report `due_at`) — 1.0.3 does not
  read that field, and `getReportUrgency` would ignore it.
- An over-the-air JS update — requires `expo-updates`, which was not a
  dependency when 1.0.3 was built.

So "the flag reflects the current policy" is achievable from the version
that ships this mechanism forward, never backward. Builds older than the
mechanism cannot be made correct; they can only be stopped. See
[Version-gate policy](#version-gate-policy).

This rules out the alternative of stamping a server-computed `due_at`
onto each report row: it carries a schema migration, a sync change, and
a recompute of every existing row whenever the policy moves, and it is
no more able to reach an old build than the key/value approach is.

## The synchronous-render constraint

`getReportUrgency(dateIso, status)` is called inline during render, at
`ReportListCard.tsx:61` and inside `ReportRow` in
`EstablishmentReportsSection.tsx:49`. It must stay synchronous — an
awaited storage read per row is not an option.

Therefore the thresholds live in a module-level in-memory snapshot,
hydrated once at startup and refreshed on sync. `getReportUrgency` keeps
its exact signature, and neither card component changes.

## Resolution order

| Layer | Source | Role |
|---|---|---|
| Remote | `app_config` rows `due_soon_days` / `overdue_days` | Authoritative; operator-editable via SQL |
| Cached | AsyncStorage `inspectplus.config.urgency` | Last known remote values; survives cold start and offline use |
| Built-in | `ENV.dueSoonDays` / `ENV.overdueDays` | Fallback before the first successful fetch |

The `.env` layer stops being the production knob and becomes the
developer-facing default, which is what a build-time value is suited to.
The README's environment-variable section is updated to say so.

## New module: `src/services/config/urgencyConfig.ts`

Three exports:

- `hydrateUrgencyConfig(): Promise<void>` — reads AsyncStorage into the
  in-memory snapshot. Called once during app startup.
- `getUrgencyConfig(): { dueSoonDays: number; overdueDays: number }` —
  **synchronous**. Returns the snapshot, or the `ENV` values when the
  snapshot is empty. This is what `getReportUrgency` calls in place of
  its current `const { dueSoonDays, overdueDays } = ENV`.
- `refreshUrgencyConfig(supabase): Promise<void>` — fetches both keys,
  validates, persists to AsyncStorage, updates the snapshot.

The module follows the shape already established by
`src/services/sync/syncState.ts`: a namespaced storage key, a `DEFAULT_`
constant, an explicit validator, `JSON.parse` inside `try`/`catch`, and
a fall back to defaults rather than a throw on malformed data.

### Fetch

A single PostgREST query for both keys, the same out-of-band pattern
`appVersionGate.ts:18` uses:

```ts
supabase.from('app_config').select('key, value').in('key', ['due_soon_days', 'overdue_days'])
```

### Validation

The values become operator-editable, so they are untrusted input.
Build a candidate pair from the remote rows, falling back to the current
resolved value for any key the response does not contain, then accept
the pair only if **all** of these hold:

1. Both values parse as finite numbers.
2. Both are integers (a fractional day threshold has no meaning here).
3. Both are greater than zero.
4. `overdueDays > dueSoonDays`.

Rule 4 is the one that matters most: an inverted or equal pair makes the
`due-soon` branch of `getReportUrgency` unreachable, so every flagged
report would jump straight to "Overdue" with no warning state — a silent
failure that no other rule catches.

A candidate pair failing any rule is discarded whole. The previously
resolved values stay in effect and stay cached; nothing is persisted.

### Failure behaviour

Fail open, matching `assertAppVersionSupported`'s documented stance at
`appVersionGate.ts:24-27`: a network error, a missing table, an RLS
denial, or an unparseable payload leaves the last known values in place.
A config read must never block or fail a sync run.

## Hook into the sync run

`refreshUrgencyConfig(supabase)` is called in `runManagedSync`
(`src/services/sync/syncOrchestrator.ts`), immediately after the
existing `assertAppVersionSupported(supabase)` call at line 73 — same
table, same out-of-band read, same fail-open contract, and after the
`checkOnline()` guard so it is never attempted offline.

Placing it there also solves re-rendering for free:
`notifySyncDataChanged()` at `syncOrchestrator.ts:90` runs in a
`finally`, so it fires on every completed run. Screens already subscribed
via `subscribeToSyncDataChanged` refetch and re-render after the refresh,
picking up new thresholds in the same pass. No new pub/sub channel is
needed.

## Startup hydration

`hydrateUrgencyConfig()` is awaited inside `AuthProvider`'s existing
bootstrap effect (`src/core/providers/AuthProvider.tsx:81`), which
already gates the UI behind its `loading` flag until it resolves. This
guarantees the first render of any report list sees the cached values
rather than briefly showing `ENV` defaults and then flipping.

## Migration

One migration seeding the current defaults, so deploying it changes
nothing visible:

```sql
INSERT INTO app_config (key, value)
VALUES ('due_soon_days', '14'), ('overdue_days', '30')
ON CONFLICT (key) DO NOTHING;
```

No schema change and no RLS change: `app_config` already has the
`app_config_select_authenticated` policy and the table-level grant added
by `20260901010000_grant_authenticated_select_app_config.sql`.

## Version-gate policy

The 1.0.x builds in the field cannot honour a changed threshold. The
policy is therefore:

- Ship this mechanism as **1.1.0**.
- Do **not** raise `min_supported_app_version` on release. Existing
  1.0.x builds keep working against the unchanged 14/30 and are not
  disrupted.
- The first time EMB actually changes a threshold, update
  `min_supported_app_version` to `1.1.0` **in the same operation** as
  the `app_config` value change.

From that moment, 1.0.x users hit `UpdateRequiredError`
(`appVersionGate.ts:31`) and see the existing "Update required" prompt
in `HomeHeader.tsx:64`, instead of silently showing urgency flags that
disagree with the office. A forced update is required only when one is
genuinely warranted, never merely because a new version exists.

This policy is operational, not code. It is recorded here because
nothing in the codebase enforces it.

## Testing

Unit tests, following the existing suite's conventions:

- `urgencyConfig.test.ts` — validation table: non-numeric, fractional,
  zero, negative, `overdueDays === dueSoonDays`, `overdueDays <
  dueSoonDays`, and a partial response supplying only one key. Each
  invalid case must leave the previously resolved values untouched.
  Also: a cold snapshot resolves to `ENV`; a hydrated snapshot wins over
  `ENV`; a fetch error leaves the snapshot unchanged.
- `reportUrgency.test.ts` — extend the existing mutable-mock pattern
  (currently mocking `../core/config/env`) to mock `getUrgencyConfig`
  instead, proving the thresholds now come from the config module rather
  than `ENV` directly.
- `syncOrchestrator` — the refresh runs after the version gate, and a
  rejected refresh does not fail the sync run.

The two card component suites need no changes: `getReportUrgency` keeps
its signature and both components keep calling it identically.

## Risks / open questions carried forward

- **Stale thresholds offline.** An inspector who has not synced for a
  week computes against week-old values, so two inspectors can
  transiently disagree about whether the same report is overdue. This is
  inherent to an offline-first app and is accepted: a deadline policy
  does not change weekly, and the refresh is attached to every sync run.
- **No operator UI.** Changing a threshold means running SQL against
  `app_config`, the same as raising `min_supported_app_version` today.
  Acceptable while both are rare operator actions; a small admin surface
  would be a separate piece of work.
- **The policy above is unenforced.** Nothing stops an operator changing
  `due_soon_days` without also raising `min_supported_app_version`, which
  would leave 1.0.x builds silently wrong rather than blocked.

## Companion work: `expo-updates` (separate branch)

Out of scope for this plan; recorded here because the two decisions were
taken together.

`app_config` makes the *numbers* changeable. It cannot express a change
to the *logic* — counting business days instead of calendar days,
counting from submission rather than inspection date, or exempting a
report type. Those need new code, and without `expo-updates` new code
means a new APK on every device.

The work is: add the `expo-updates` dependency, add an `updates` block
and a `runtimeVersion` policy to `app.json`, and document which changes
may ship over the air versus which require a build. The EAS `preview`
and `production` channels in `eas.json` already exist.

The same forward-only limit applies: OTA reaches only builds that shipped
with `expo-updates`, so it does nothing for 1.0.x either. It should land
soon so that the *next* policy change is covered, but it is independent
of the config work above and belongs on its own branch.
