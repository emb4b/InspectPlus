# Production Deployment (Self-Hosted Supabase)

## Status

**Not yet executed.** This is a forward-looking runbook, written while the app is still in development/testing with no VPS, no domain, and no real inspector data anywhere. Each phase below lists its prerequisites so it can be picked up independently once they exist.

## Why self-hosted, not Supabase Cloud

A Supabase Cloud project was created early on (`mqtutgjhsnchqliwltoy.supabase.co`) but never carried real data. Supabase Cloud's free tier auto-pauses a project after a period of inactivity — confirmed directly against this project (`INACTIVE` status, connection timeout on `supabase migration list`) — which is disqualifying for a system field inspectors depend on for sync. Upgrading to Cloud's paid tier was considered; self-hosting on an owned server/VPS was chosen instead, for full control over uptime and no recurring per-seat cost. The Cloud project is treated as abandoned — there is no data to migrate from it.

## Known state this plan is built on

- Local dev Postgres major version is **17** (`supabase/config.toml`) — the self-hosted stack's Postgres image must match this exactly, not just "latest 17.x".
- `supabase/migrations/` holds the full schema/RPC history (54 files as of this writing, oldest `20260422081043_init_inspect_plus_schema.sql`). None have ever been applied to a real remote Postgres — only to ephemeral local/CI Docker stacks (`.github/workflows/supabase-db.yml` resets a throwaway stack per run). **No workflow anywhere pushes migrations to a real database** — Phase 4 below closes that gap.
- The newest migration seeds `app_config.min_supported_app_version = '1.0.0'`, read by `assertAppVersionSupported` (`src/services/sync/appVersionGate.ts`) on every sync — see [`sync-contract.md`](sync-contract.md)'s Backward Compatibility Rules.
- A private `attachments` Storage bucket with path-prefix + jurisdiction RLS is provisioned by `20260813020000_create_attachments_storage_bucket.sql` — must exist with these exact policies before any device uploads a photo.
- `supabase/seeds/dev/*.sql` contains fake dev inspector accounts — **must never run against production**.
- `src/core/config/env.ts` reads `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` straight from `process.env`, no fallback. `.env`/`.env.*` are gitignored; `.env.production` is empty and untracked — no secrets live in the repo today.
- `eas.json`'s `production` profile has no `environment` key yet — a production EAS build today ships with empty Supabase URL/key. See [`ci-cd.md`](ci-cd.md) for the existing CI/build pipeline this plan builds on top of.

## Phase 0 — Prerequisites to acquire

1. **VPS.**
2. **Domain name** — any registrar with DNS A-record management is sufficient (Cloudflare Registrar, Namecheap, etc.).

Nothing below can start until both exist.

## Phase 1 — VPS provisioning & OS hardening

- **Spec:** 2 vCPU / 4 GB RAM / 80 GB SSD floor, 4 vCPU / 8 GB comfortable target. Postgres, GoTrue, PostgREST, Realtime, Storage-API, Kong, and Studio all run as containers on one box; at this scale (a handful to a few dozen field inspectors, intermittent sync) Postgres and Storage are the only components with real resource appetite.
- **OS:** Ubuntu 22.04/24.04 LTS — matches what Supabase's docker-compose reference is tested against.
- **Region:** pick a provider region physically near the Philippines (Singapore is the common APAC option across DigitalOcean/Vultr/Linode/AWS Lightsail) to minimize sync latency for field inspectors.
- **Hardening (once, on first login):**
  - Non-root sudo deploy user; SSH key-only (`PermitRootLogin no`, `PasswordAuthentication no`).
  - `ufw` allowing only `22`/`80`/`443`. Postgres's `5432` and Kong's raw port stay closed — everything public goes through the Phase 3 reverse proxy, and the Phase 4 migration pipeline reaches Postgres via SSH tunnel, not a public port.
  - `unattended-upgrades` for automatic OS security patches.
  - Docker Engine + Compose plugin from Docker's official apt repo (not the distro-bundled version).

## Phase 2 — Self-hosted Supabase stack

- **Source:** `git clone --depth 1 https://github.com/supabase/supabase`, work from `supabase/docker/` — Supabase's own documented self-hosting path.
- **Postgres version pin (critical):** run `supabase start` locally, then `docker ps --format "{{.Image}}"` to get the exact `supabase/postgres:17.x.x.xxxxxxx` tag the local CLI uses, and pin that *exact* tag in the VPS compose file. Every existing migration was only ever tested against that exact build.
- **Secrets** (must not be the repo's demo `.env.example` defaults):
  - `POSTGRES_PASSWORD` — `openssl rand -base64 32`
  - `JWT_SECRET` — `openssl rand -base64 40`+
  - `ANON_KEY` / `SERVICE_ROLE_KEY` — JWTs signed with `JWT_SECRET` via Supabase's self-hosting key-generation step
  - `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`
  - Store all of these in a password manager and as GitHub Actions secrets where CI needs them (Phase 4/5). Never commit `docker/.env`.
- **Persistent storage:** keep the compose file's bind-mounted `./volumes/` on durable SSD; layer provider block-storage snapshotting on top if available.
- **Storage backend:** start with local-disk file storage under `./volumes/storage` for go-live (fewer moving parts). Flag an S3-compatible backend (Cloudflare R2 — free egress) as the first hardening follow-up once attachment volume grows, since it decouples photo durability from one VPS disk and keeps large binaries out of the pg_dump backup path.

## Phase 3 — Domain + TLS

- **Reverse proxy: Caddy**, not nginx+certbot — automatic Let's Encrypt TLS with a ~5-line Caddyfile is the right complexity for this scale:
  ```
  api.<yourdomain> {
    reverse_proxy kong:8000
  }
  ```
- One DNS A record (`api.<yourdomain>` → VPS IP); Caddy handles the cert on first request.
- **Studio: do not expose publicly.** Keep it bound to `localhost` on the VPS, reach it via SSH tunnel (`ssh -L 3000:localhost:3000 deploy@vps`) rather than adding a public vhost.
- **iOS App Transport Security (ATS).** iOS blocks plain-HTTP and self-signed/untrusted-TLS connections by default, unlike Android which is more permissive. Caddy's automatic Let's Encrypt cert satisfies ATS out of the box — no `NSAppTransportSecurity` exceptions should ever be added to `app.json`'s iOS config to work around a broken cert; if a connection needs an ATS exception, the TLS setup is broken, not the exception's job to paper over. This makes real TLS a hard prerequisite for iOS specifically — an Android build can limp along against a misconfigured cert in a way an iOS build cannot.
- **Realtime/WebSockets:** the app has no `supabase.channel()`/`postgres_changes` subscriptions anywhere — sync is purely `pull_changes`/`push_changes` RPC calls, so WebSocket upgrade proxying through Caddy/Kong isn't functionally exercised today. Re-check only if Realtime subscriptions are ever added.

## Phase 4 — Migration deployment pipeline

New workflow: `.github/workflows/deploy-migrations.yml`.

- **Reaching Postgres without exposing it publicly:** the GitHub-hosted runner opens an SSH tunnel through the VPS (`webfactory/ssh-agent` + `ssh -L 5432:localhost:5432 deploy@<host> -N &`) using a restricted-deploy-user keypair, then runs the Supabase CLI against `postgresql://postgres:$PROD_DB_PASSWORD@127.0.0.1:5432/postgres`.
- **Trigger:** `workflow_dispatch` (manual) — migrations are infrequent and high-blast-radius. Layer a GitHub Environment named `production` with a required reviewer as a second gate, mirroring how `eas-build.yml` already gates production builds on branch. Revisit auto-triggering later once there's a track record.
- **Steps:** checkout → `supabase/setup-cli@v1` (same action `supabase-db.yml` already uses) → start tunnel → `npx supabase db push --db-url postgresql://postgres:$PROD_DB_PASSWORD@127.0.0.1:5432/postgres` (idempotent — the CLI tracks its own applied-migrations history) → `npx supabase migration list --db-url ...` logged as a verification step.
- **New secrets required:** `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_PRIVATE_KEY`, `PROD_DB_PASSWORD`.

## Phase 5 — App wiring (EAS environment variables)

Use EAS's own environment-variable system, not `.env.production` — keeps real secrets out of any file that could accidentally get committed later.

1. `eas env:set production --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://api.<yourdomain> --visibility plaintext --non-interactive`
2. `eas env:set production --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key-from-phase-2> --visibility sensitive --non-interactive`
3. Add `"environment": "production"` to `eas.json`'s `production` profile so the build pulls these automatically. Whether `preview` should point at the same instance or wait for a separate staging instance is deferred, per `ci-cd.md`'s "staging Supabase project" item.
4. Leave `.env.production` exactly as-is (empty, untracked).
5. **Platform-agnostic by construction:** EAS environment variables are project/environment-scoped, not platform-scoped — the same values feed both an Android and an iOS build off the same `production` profile.

The existing `eas-build.yml` `main`→`production` path (Android) needs no further changes to produce a binary pointed at the real backend once this is wired. An iOS `production` build isn't in that workflow yet (Apple-credential-gated, see Phase 8) but pulls the same environment values via `eas build --profile production --platform ios` once those credentials exist.

## Phase 6 — Backup & recovery

No managed daily backups when self-hosting — this has to be built explicitly.

- **Logical backups:** nightly cron/systemd-timer `pg_dump -Fc` against the Postgres container, compressed, shipped off-server immediately via `rclone` to an S3-compatible bucket (Backblaze B2 or Cloudflare R2).
- **Storage bucket data:** if using local-disk Storage, the same nightly job must also `tar`/`rsync` `./volumes/storage` off-server — attachment files are real user data, and a metadata row without its file is useless.
- **Retention:** let the destination bucket's lifecycle rules expire old backups (e.g. 30 days) rather than hand-rolling rotation.
- **Documented restore procedure:** spin up a fresh Postgres 17 (same compose service, fresh volume), `pg_restore` the dump, spot-check known tables, only then point the stack at it. Write this down now.

## Phase 7 — Monitoring / uptime

- External uptime check (UptimeRobot / Better Uptime / Healthchecks.io, free tier) polling `https://api.<yourdomain>/auth/v1/health`, alerting on downtime.
- `docker compose logs -f <service>` on the VPS is sufficient log visibility at this scale — no aggregation stack needed yet.
- Simple periodic disk-space check; revisit if/when Storage moves to S3-compatible (Phase 2 follow-up).
- Not adopting Prometheus/Grafana-class tooling yet — not justified until team/load grows.

## Phase 8 — Go-live checklist

First activation, not a data migration — but sequencing still matters.

1. VPS provisioned/hardened (Phase 1) — verify SSH key-only login, `ufw status` shows only 22/80/443.
2. Domain purchased, DNS A record resolving to the VPS.
3. Stack up via docker-compose with real generated secrets (Phase 2, not demo defaults), Caddy serving valid TLS — verify with `curl https://api.<yourdomain>/auth/v1/health`.
4. Run the Phase 4 workflow against the fresh instance — applies every migration in order; confirm via `supabase migration list` that all files show applied, none missing/out of order.
5. **Do not** run `supabase/seeds/dev/*` against production. Manually create the first real account instead: one `auth.users` row (via the Studio SSH tunnel) + a matching `public.user_accounts` row with `role = 'Administrator'` or `'Developer'`.
6. Confirm `app_config.min_supported_app_version` matches the version actually shipping for go-live; update via a follow-up SQL statement if it differs.
7. Add the Phase 4 GitHub Actions secrets and Phase 5 EAS environment variables.
8. Set `eas.json`'s `production` profile `"environment": "production"` and cut an **Android** build via the existing `main`-branch `eas-build.yml` path.
9. Cut a matching **iOS** build manually (`eas build --profile production --platform ios`) so the backend gets verified against both platforms before field rollout. Needs Apple Developer credentials for code signing — if those aren't ready, iOS verification stays blocked until they are (same as `ci-cd.md`'s "iOS builds" deferred item). App Store submission is still out of scope; reachability/TLS-compatibility testing is not the same thing and shouldn't be skipped once any signed iOS build is possible (ad-hoc, TestFlight internal testing, or `expo run:ios` against the production URL).
10. Install both builds on real devices, sign in with the manually created admin account, and run a full sync smoke test on **each platform**: `pull_changes(0)`, create a test establishment + report, push, pull again on a second session — confirms RLS, `push_changes`/`pull_changes`, attachment bucket policies, and that iOS's stricter ATS/TLS enforcement doesn't reject the connection.
11. Only after both platforms' smoke tests pass, distribute to real inspectors. If iOS credentials aren't ready yet, going live Android-only first is acceptable — just don't treat "works on Android" as proof of iOS compatibility.
12. Immediately after go-live, verify the first nightly backup (Phase 6) actually ran and produced a restorable dump before considering the environment durably live.

## Verification per phase

| Phase | Check |
|---|---|
| 1 | SSH key-only login succeeds; password/root login fails; `ufw status` shows exactly 22/80/443 |
| 2 | `docker compose ps` shows all services healthy; Postgres version matches local dev exactly |
| 3 | `curl -I https://api.<yourdomain>/auth/v1/health` returns valid TLS; Studio unreachable except via SSH tunnel |
| 4 | `deploy-migrations.yml` run completes green; `supabase migration list --db-url ...` shows every migration applied |
| 5 | `eas env:list --environment production` shows both variables; a build's bundled JS resolves the real URL (check the `[Supabase] URL:` debug log in `src/services/supabase/client.ts`) |
| 8 | End-to-end smoke test (step 10) passes on both platforms before any inspector gets the build |

## Explicitly out of scope

- Apple Developer account setup, code signing/provisioning, App Store submission — separate, already-deferred, credential-gated workstream per [`ci-cd.md`](ci-cd.md). Distinct from the backend's iOS *compatibility*, which this plan does cover (Phase 3's ATS/TLS note, Phase 5's platform-agnostic env wiring, Phase 8's dual-platform go-live verification).
- Migrating data from the abandoned Supabase Cloud project — none exists to migrate.
