# QA Plan

## Purpose

This document defines the QA approach for InspectPlus: what's covered today, the risk areas that matter most for an offline-first field-inspection app, the manual regression checklist until automation catches up, and the way-forward as the app moves toward a real production deployment.

It should be kept updated the same way `sync-contract.md` and `ci-cd.md` are — whenever sync behavior, entity coverage, or the release pipeline changes.

---

## 1. Product Risk Profile

InspectPlus is used by field inspectors (EMB — Environmental Management Bureau) to record compliance inspections, often with unreliable connectivity, and sync later. That shape drives everything else in this plan:

- **Data loss is the worst-case failure**, not a crash. An inspector who loses an inspection report has lost real fieldwork, possibly unrecoverable (they've left the site). Git history already shows several sync data-loss bugs (`8239a21` stop wiping unsynced local data on user switch, `3daaf22` don't wipe local data on Developer login, `d80a4fd` stop conflicting pushed edits from being silently discarded) — this class of bug recurs and deserves the heaviest ongoing test weight.
- **Offline is the default, not the edge case.** Every feature must be tested with network off, not just "also works offline."
- **Multi-device, multi-user conflicts are routine**, not rare: the same establishment/report can be edited on two devices before either syncs.
- **Jurisdiction-scoped access is a security boundary**, not just a UX filter — an Inspector must never read/write outside their assigned province/municipality; Administrator/Developer bypass this intentionally.
- **The backend is redefined in place with no RPC versioning** (`docs/sync-contract.md` § Backward Compatibility Rules), so an already-installed client can be several versions behind. Compatibility regressions ship silently to devices that never update immediately.

---

## 2. Current Automated Coverage (baseline)

| Layer | Tool | What it covers today |
|---|---|---|
| Unit / component | Jest (`jest-expo`) | `App.test.tsx`, `establishmentPersistence.test.ts`, water report visibility logic (`dpConditionsVisibility.test.tsx`, `wwtpVisibility.test.tsx`), `appVersionGate.test.ts`, `syncService.test.ts`, `version.test.ts`, and a newly added `auth.test.ts` |
| DB / RLS / RPC | `supabase test db` (pgTAP) | Per-entity `pull_changes`/`push_changes` tests, conflict tests for establishments/inspection_reports/survey_reports, RLS tests for jurisdiction scoping, admin/developer visibility, graphql exposure lockdown |
| Static checks | ESLint, `tsc --noEmit` | Full `src/` |
| CI gate | `ci.yml`, `supabase-db.yml` | Runs the above on every push/PR to `main`/`develop`/`feature/**`/`hotfix/**` |
| Release build | `eas-build.yml` | Android only, triggered after CI passes on `develop`/`main` |

**What's conspicuously absent:**
- No end-to-end / UI automation (no Detox, Maestro, or Playwright-for-mobile equivalent) — everything above `establishmentPersistence`/visibility-logic level is manual today.
- No automated multi-device sync simulation (two clients pushing/pulling against the same backend concurrently).
- No test coverage for `src/features/attachments/*` (upload queue, geotag stamping, orphan-storage handling) or most of `src/db/sync/*` (`applyPulledChanges.ts`, `collectPushChanges.ts`, `watermelonAdapter.ts`) beyond what `syncService.test.ts` exercises indirectly.
- No coverage metric enforced in CI (no `--coverage` threshold).

---

## 3. Manual Test Plan

Until E2E automation exists, the following is the baseline manual regression pass. Run the full pass before any `main` promotion (production EAS build) and a scoped subset for `develop` (preview build) PRs touching the relevant area.

### 3.1 Auth
- Fresh login (valid / invalid username / invalid password) — note login resolves username → email via `get_email_by_username` before Supabase Auth.
- Offline login with a previously-cached session (regression target for `758cfce` restore live session on offline account switch).
- Switching between two inspector accounts on one device — confirm the first account's unsynced local data is **not** wiped (regression target for `8239a21`, `3daaf22`).
- Developer-role login — confirm it does not wipe existing local data on that device.
- Logout, then log back in as the same user — local pending changes still present if unsynced.

### 3.2 Establishments
- Create, edit, archive an establishment while offline; confirm it queues for sync.
- Cascading address pickers (province/city/barangay) and auto-formatted text inputs behave correctly on save.
- Operating-status transitions, including the "closure/non-operational date" field.
- Inspector outside the establishment's province/municipality cannot see or edit it; Administrator/Developer can.

### 3.3 Inspection Reports (Water — the only fully implemented report type)
- Full create flow: Purpose of Inspection → General Information → water compliance sections (1–6, two-row tab menu).
- WWTP conditional sections: verify subsections B–E are correctly marked not-applicable when "has WWTP" = No (regression target for `9d99dc5`), and DP conditions / sampling-points subsections always render when applicable (`29a3463`).
- Draft vs. submitted `report_status` transitions.
- Report drift indicator when the live establishment record changes after report creation (`f582c9b`) — establishment snapshot should not silently update.
- Swipe-to-reveal delete on report tiles, collapsing header scroll behavior (no dropped frames/flicker — regression target for `e118d92`, `6cd6841`).
- Sync-status/conflict badge appears on `ReportListCard` / `InspectionReportHeader` and is tappable.

### 3.4 Attachments
- Capture via camera (geotag stamp applied, `geo_lat`/`geo_lng` populated) vs. pick from library (no geotag).
- Caption add/edit after capture.
- Upload queue behavior offline → reconnect: confirm `storage_path` only populates, and the row only pushes, after the Storage upload actually succeeds.
- Delete an attachment — confirm the DB row soft-deletes and the app doesn't attempt to also delete the Storage object (accepted v1 behavior, not a bug).
- Viewing an attachment from a second device (signed URL round trip), not a locally cached file.

### 3.5 Sync
- Manual sync with pull-only / push-only / both directions.
- Full pull from `0` (fresh device / reinstall) reconstructs establishments, reports, and compliance data correctly.
- **Conflict scenario (core regression target for `d80a4fd`/`d3b2d33`):** edit the same establishment or report on two devices while both are offline, then bring both online. Confirm:
  - the losing device's edit is flagged with a "Sync conflict" badge, not silently dropped;
  - the badge is tappable → `resolveConflictKeepLocal` re-queues the local edit and it wins the next push;
  - a subsequent pull does **not** silently overwrite a `conflict`-flagged row before the user resolves it.
- Soft-delete propagation: delete an inspection report on one device, confirm it disappears (not just archives) on a second device after pull.
- Jurisdiction write scoping: an inspector assigned to province P but not municipality M within P cannot push a create/update/delete for a record in M.
- Min-supported-version gate: simulate an app build below `app_config.min_supported_app_version` and confirm sync is blocked with a clear message, while offline app usage remains unaffected.

### 3.6 Cross-cutting
- Airplane-mode-through-a-full-session pass: every screen above should be usable offline; only sync itself should visibly require connectivity.
- Role-based visibility: Inspector vs. Administrator vs. Developer, on establishments, reports, and inspector-name lookups.
- Android device/OS matrix (see § 5) — iOS has **no builds and no manual coverage at all today**; treat any iOS-specific claim as unverified until Phase 8 of `production-deployment.md` runs.

---

## 4. Test Environments

| Environment | Backend | Used for |
|---|---|---|
| Local dev | Local Supabase CLI stack (`supabase start`) | Day-to-day development |
| CI | Ephemeral Docker Supabase stack, reset per run | `ci.yml` unit tests, `supabase-db.yml` pgTAP tests |
| "Production" today | Supabase Cloud project (`mqtutgjhsnchqliwltoy.supabase.co`), effectively abandoned (free-tier auto-pause) | Ad hoc only — not a real target |
| Manual/pre-release QA | **None dedicated** | Gap — see § 6 |

There is currently no staging environment that mirrors production for manual pre-release testing, and (per `production-deployment.md`) no real production environment has been stood up yet either — migrations have only ever run against ephemeral CI stacks. Every manual test pass today effectively runs against local dev or whatever Supabase Cloud project is reachable.

---

## 5. Device Matrix

Not formally tracked today. Recommended minimum before field rollout:
- Android: oldest supported OS version the app targets, plus current; at least one budget/low-RAM device (field inspectors are unlikely to carry flagship hardware).
- iOS: cannot be tested at all until Apple Developer credentials exist and a signed build is produced (`ci-cd.md` § "Explicitly not set up yet").

---

## 6. Release Gate

Today's gate, as implemented:
1. `ci.yml` — install, lint, typecheck, jest, commitlint (PRs).
2. `supabase-db.yml` — local Supabase stack, `supabase test db`.
3. On success on `develop`/`main`, `eas-build.yml` produces an Android `preview`/`production` build.

**What the automated gate does *not* cover:** the entire manual plan in § 3. Recommend treating § 3 as a required sign-off before promoting a `develop` build to `main`, and running the full pass (not a subset) before the first real production go-live (`production-deployment.md` Phase 8, step 10, which already specifies a two-device sync smoke test as part of go-live — QA should own executing that step, not just development).

---

## 7. Defect Management

No dedicated tracker configuration exists in the repo today (no `.github/ISSUE_TEMPLATE`, no linked project board found). Recommendation: use GitHub Issues on this repo, tagged by feature area (`sync`, `auth`, `attachments`, `establishments`, `reports`) and severity, so defect history stays next to the code and commit messages that fix them (the existing commit-message style already tags `fix(sync)`, `fix(auth)`, etc. — issues should use the same vocabulary for traceability).

---

## 8. Gaps & Near-Term Recommendations

Ordered roughly by risk:

1. **No automated conflict/multi-device sync tests at the app layer.** The backend RPC conflict tests exist (`push_changes_*_conflict.sql`), but nothing automated exercises the client-side `syncConflictResolution.ts` / `resolveConflictKeepLocal` flow end-to-end. Given this is the area with the most repeat bugs, this is the single highest-value automation gap to close.
2. **Report-type coverage gap.** `compliance_air`, `compliance_hazwaste`, and `compliance_eia` exist as synced entities and in `reportTypeMeta.ts`'s type mapping, but only `water` has a form implementation under `src/features/inspections/water`. Any QA plan for "inspection reports" beyond water is currently untestable because the UI doesn't exist yet — flag this to product/dev rather than trying to test around it.
3. **No staging environment.** Manual pre-release testing and the eventual first production deploy both currently point at the same ambiguous ground truth (local stacks + an abandoned Cloud project). Once `production-deployment.md` Phase 2 stands up self-hosted Supabase, strongly recommend a second staging instance (or at minimum a documented "point the app at a scratch Supabase project" procedure) before every migration reaches real production.
4. **iOS is entirely unverified.** Zero builds, zero manual passes. Not fixable by QA alone — blocked on Apple Developer credentials (`ci-cd.md`) — but should stay visibly flagged as "unknown," not "assumed fine because Android works."
5. **Attachments and `db/sync` internals have no unit tests.** `attachmentUploadQueue.ts`, `attachmentPersistence.ts`, `applyPulledChanges.ts`, `collectPushChanges.ts`, `watermelonAdapter.ts` are all exercised only manually today.
6. **No coverage threshold in CI.** Nothing stops coverage from silently eroding as features are added.
7. **Contract tests pinned to shipped app versions** — already identified as deferred in `ci-cd.md`, triggered once a real version has shipped through the EAS pipeline. QA should own authoring these fixtures once that trigger fires, since they're regression tests against real backward-compatibility behavior, not new-feature tests.

---

## 9. Way Forward (aligned with the project's own roadmap)

The project already has two forward-looking docs (`ci-cd.md`, `production-deployment.md`) with explicit "deferred, with a trigger to revisit" items. QA work should track those triggers rather than invent a parallel roadmap:

- **When Apple credentials land** → add iOS to the manual device matrix and to `eas-build.yml`; re-run the full § 3 pass on iOS before it's trusted equally to Android.
- **When self-hosted production (Phase 1–8 of `production-deployment.md`) is executed** → QA owns Phase 8 step 10's two-device, two-platform sync smoke test as a formal go-live gate, and should push for a staging instance (§ 8.3) ahead of that, not after.
- **When a real version has shipped** → begin the contract-tests-pinned-to-shipped-versions work called out in `ci-cd.md`; this converts "backward compatibility" from a documented discipline into an enforced regression suite.
- **Once the conflict-resolution flow stabilizes** (it's had the most churn of any area — three related commits in recent history) → this is the first and best candidate for introducing E2E automation (Detox or Maestro), specifically the two-device conflict scenario in § 3.5, since it's the hardest class of bug to catch by manual testing alone (requires two physical/virtual devices in a coordinated timing sequence) and the one with the worst failure mode (silent data loss).
- **Once `compliance_air`/`hazwaste`/`eia` get UI implementations** → extend § 3.3 and the RPC/RLS test pattern already established for water to each new report type, following the same reference structure `src/features/inspections/water` sets today.
- **Longer-term**, once the app has a larger inspector user base: revisit § 8.6 (coverage thresholds) and consider a device farm (Firebase Test Lab / BrowserStack App Automate) for the Android matrix in § 5, since manual device coverage won't scale with field rollout.
