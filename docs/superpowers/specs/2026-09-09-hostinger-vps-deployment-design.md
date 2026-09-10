# Hostinger VPS Deployment — Execution Design

**Status:** Approved design, not yet executed.

**On the hostname:** this repository is public, so the VPS hostname is written
throughout as `$VPS_HOST` rather than spelled out — including inside the Caddyfile
and command blocks, where it is a placeholder to substitute, not a literal. Export
`VPS_HOST` before running anything here, and keep the real value out of this file.

**Relationship to [`production-deployment.md`](../../production-deployment.md):** that document is the
provider-agnostic runbook written before any hardware existed. This one is the
concrete execution design for the specific Hostinger box we now have. Where the
two disagree, this document wins, and every deviation is listed under
[Deviations](#deviations-from-production-deploymentmd) with its reason.

## Context

InspectPlus is an Expo/React Native app; there is no web deliverable to deploy.
What goes on the VPS is the **self-hosted Supabase stack** the app syncs against:
Postgres 17, GoTrue, PostgREST, Storage, Kong, and Studio, behind a TLS-terminating
reverse proxy.

`supabase/migrations/` holds 57 migrations that have never been applied to a real
remote database — only to ephemeral local and CI Docker stacks. The VPS therefore
gets a virgin instance built from those files in order. There is no data migration:
the abandoned Supabase Cloud project never carried real data.

## Verified facts about this box

Read from the Hostinger control panel on 2026-09-09:

| Fact | Value | Consequence |
|---|---|---|
| Plan | KVM 8 — 8 vCPU / 32 GB RAM / 400 GB disk / 32 TB bandwidth | Far exceeds the runbook's 4 vCPU / 8 GB target. Resource pressure is not a design constraint here. |
| OS | Ubuntu 24.04 LTS | Matches what Supabase's reference compose is tested against. |
| Region | Malaysia — Kuala Lumpur | Same latency class as Singapore for Philippine inspectors. Acceptable. |
| Hostname | `$VPS_HOST` | Becomes the API origin. See [Risks](#risks). |
| Disk used | 5 GB of 400 GB | Effectively a bare install. Nothing substantial is deployed. |
| CPU / memory | 0% / 4%, at 41 days uptime | Idle. Nothing is serving traffic. |
| Panel firewall rules | **0** | Hostinger's edge firewall is passing every port. `ufw` ships inactive on Ubuntu. The box is currently fully exposed. |
| SSH | `root@` with password login enabled | Highest-priority fix. Phase 1 addresses it before anything else is installed. |
| Malware scanner | Active | Hostinger's agent runs on the host. Noted in case it interferes with container filesystems. |
| Snapshots | 2 | Provider-level, weekly. Not a substitute for backups — see Phase 6. |

A full port/process audit (`ss -tulpn`, running units, `docker ps`) is still
outstanding and is the first step of Phase 1. The panel figures above make it very
likely the box is clean, but the audit governs whether we reinstall or harden in
place — we do not assume.

## Decisions taken

1. **Full official `supabase/docker` compose stack, unmodified at first.** Trimming
   Realtime and the Logflare/Vector analytics containers is attractive (the app has
   zero `supabase.channel()` subscriptions; Logflare is a known self-hosting pain
   point) but means maintaining a diff against upstream and untangling `depends_on`
   chains during a first stand-up, with no known-good baseline to compare against.
   Reach a healthy stack on the supported path first; trim afterwards if analytics
   proves noisy. The ~2 GB cost is irrelevant against 32 GB.

2. **`$VPS_HOST` as the API origin**, rather than buying a domain now.
   Unblocks go-live today. Caddy config and EAS variables are structured so that
   swapping in a real domain later is a one-line change. The cost of that deferral
   is recorded under [Risks](#risks) and is not small.

3. **Pull-based backups: the in-house Windows Server pulls from the VPS.** The
   in-house server has a public static IP, so push would also work, but pull is
   chosen because the VPS then holds no credentials to the backup store — a
   compromised VPS cannot reach, encrypt, or delete backups — and because it
   requires zero inbound ports on the in-house server.

4. **SSH allowlisted to the office static IP.** The static IP earns its keep here:
   restricting port 22 at both the Hostinger edge firewall and `ufw` removes the box
   from global SSH brute-force traffic entirely. Hostinger's browser Web console is
   the break-glass path if the office IP ever changes, which is what makes this safe.
   This decision has a consequence for the CI migration pipeline — see Phase 4.

## Phase 1 — Audit, then harden

**Step 0 — audit before touching anything.** `ss -tulpn`, `systemctl list-units
--type=service --state=running`, `docker ps -a`, `ufw status verbose`, `who`,
`last -20`. If anything unexpected is listening or installed, stop and reassess.
Default action if the box is not demonstrably clean: take a Hostinger snapshot,
then reinstall Ubuntu 24.04 from the panel for a known baseline. A reinstall costs
minutes and preserves the hostname and IP.

**Hardening, in order:**

- Set timezone to `Asia/Manila`, so cron/systemd-timer schedules and log timestamps
  line up with the inspectors' working day rather than UTC.
- Create a non-root `deploy` user with sudo. Install the admin SSH public key.
  Register the same key in the Hostinger panel (SSH key → Manage) so it survives a
  future reinstall.
- `sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`,
  `PubkeyAuthentication yes`. Keep port 22 — with key-only auth plus an IP
  allowlist, moving the port buys nothing.
- **Both firewalls, not one.** Hostinger's panel firewall is a separate edge layer
  from `ufw`; configuring only one leaves the other wide open.
  - Panel: allow `22` from the office static IP only; allow `80`/`443` from anywhere.
  - `ufw`: mirror the same rules as defense in depth.
- `unattended-upgrades` for automatic OS security patches.
- Docker Engine + Compose plugin from Docker's official apt repository, not the
  distro-bundled version.

**The Docker/ufw trap — this is the one that silently defeats the firewall.**
Docker writes its own iptables rules and bypasses `ufw` entirely: any port published
with `-p` or a compose `ports:` entry becomes reachable from the internet regardless
of what `ufw status` claims. Believing "5432 is closed because ufw says so" is how
self-hosted Postgres ends up on the public internet. Mitigation, applied in Phase 2:

- Kong publishes **no** host port at all. Caddy reaches it as `kong:8000` over the
  shared compose network.
- Postgres publishes to `127.0.0.1:5432:5432` only — loopback-bound, reachable
  solely through an SSH tunnel.
- Studio publishes to `127.0.0.1:3000:3000` only.
- Verify from a machine outside the office with `nmap`/`nc` after the stack is up.
  `ufw status` is not evidence; an external scan is.

## Phase 2 — Supabase stack

- Install root: `/opt/inspectplus/supabase`, owned by `deploy`.
- Source: `git clone --depth 1 https://github.com/supabase/supabase`, work from
  `docker/`.
- **Postgres image tag is a hard pin.** `supabase/config.toml` declares
  `major_version = 17`, and every migration has only ever run against the exact
  image the local CLI uses. Read that tag from a dev machine
  (`supabase start`, then `docker ps --format "{{.Image}}"`) and pin it verbatim —
  not `:17`, not `:latest`.
- Secrets, all freshly generated, never the repo's demo defaults: `POSTGRES_PASSWORD`,
  `JWT_SECRET`, `ANON_KEY` and `SERVICE_ROLE_KEY` (JWTs signed with `JWT_SECRET` via
  Supabase's key-generation step), `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`,
  `SECRET_KEY_BASE`, `VAULT_ENC_KEY`, `POOLER_TENANT_ID`. Store in a password
  manager. `docker/.env` is `chmod 600`, owned by `deploy`, never committed.
- URLs: `API_EXTERNAL_URL` and `SUPABASE_PUBLIC_URL` both
  `https://$VPS_HOST`.
- **`DISABLE_SIGNUP=true`.** `supabase/config.toml` has `enable_signup = true`, which
  is correct for local dev and wrong for a public production endpoint. The app never
  calls `signUp()` — accounts are created by an administrator — so leaving signup
  open would expose unauthenticated account creation for no benefit.
- Storage backend: local disk under `./volumes/storage`, 50 MiB file size limit to
  match `config.toml` and the `attachments` bucket migration. An S3-compatible
  backend stays the first post-go-live hardening candidate.

## Phase 3 — TLS

Caddy runs as a container on the same compose network:

```
$VPS_HOST {
  reverse_proxy kong:8000
}
```

- Verify `dig +short $VPS_HOST` returns the VPS IP **before** starting
  Caddy. A cert attempt against a hostname that does not resolve to this box burns
  an ACME failure for nothing.
- Studio is never given a public vhost. Reach it via
  `ssh -L 3000:localhost:3000 deploy@<vps>`.
- **iOS App Transport Security makes real TLS non-negotiable.** iOS rejects plain
  HTTP and untrusted certificates outright, where Android is more permissive. No
  `NSAppTransportSecurity` exception may ever be added to `app.json` to work around
  a broken certificate — if a connection needs an exception, the TLS setup is broken
  and that is what gets fixed.
- Realtime/WebSocket upgrade proxying is not exercised: sync is purely
  `pull_changes`/`push_changes` RPC. Revisit only if subscriptions are ever added.

## Phase 4 — Migrations

The runbook's Phase 4 puts migration deployment in GitHub Actions, reaching Postgres
through an SSH tunnel from a GitHub-hosted runner. **That conflicts with the Phase 1
decision to allowlist SSH to the office IP** — GitHub's runners have dynamic
addresses drawn from very large published ranges, and allowlisting those ranges
would undo most of the value of the allowlist.

**Resolution: run migrations from an office workstation, and defer the Actions
workflow.** Migrations here are infrequent and high-blast-radius; the runbook
already gated them behind `workflow_dispatch` plus a required reviewer, which is an
approval gate, not an automation win. A documented local command over the existing
SSH tunnel gives the same result with less machinery and no firewall compromise:

```bash
ssh -L 5432:localhost:5432 deploy@$VPS_HOST -N &
npx supabase db push --db-url postgresql://postgres:$PROD_DB_PASSWORD@127.0.0.1:5432/postgres
npx supabase migration list --db-url postgresql://postgres:$PROD_DB_PASSWORD@127.0.0.1:5432/postgres
```

`db push` is idempotent — the CLI tracks its own applied-migration history. If the
Actions pipeline is wanted later, the honest options are a self-hosted runner inside
the office network or dropping the SSH allowlist; both are decisions to take
deliberately, not by accident.

## Phase 5 — App wiring (EAS environment variables)

Use EAS's environment-variable system, not `.env.production` (which is empty,
untracked, and stays that way).

```bash
eas env:set production --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://$VPS_HOST --visibility plaintext --non-interactive
eas env:set production --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value <anon-key-from-phase-2> --visibility sensitive --non-interactive
eas env:set production --scope project --name EXPO_PUBLIC_APP_ENV \
  --value production --visibility plaintext --non-interactive
```

**The third variable is a gap in the runbook, and it is not cosmetic.**
`src/core/config/env.ts` reads `EXPO_PUBLIC_APP_ENV` and **defaults to
`'development'`** when it is unset. A production build missing it silently loads
`env.dev.ts`: `syncIntervalMs` of 30 seconds instead of 5 minutes — a tenfold
increase in sync traffic from every field device, on mobile data — and
`enableDebugLogs: true`. The build would work, which is exactly why this would go
unnoticed.

Then add `"environment": "production"` to `eas.json`'s `production` profile so
builds pull these automatically. The existing `main` → `production` Android path in
`eas-build.yml` needs no other change. EAS environment variables are
project-scoped, not platform-scoped, so the same values feed iOS builds.

**Also before distribution:** remove the debug block at the top of
`src/services/supabase/client.ts` that logs the Supabase URL and anon-key prefix.
It is explicitly marked "remove before production". The anon key is public by
design so this is not a secret leak, but the log line is useful for the Phase 8
smoke test and should be deleted immediately after it.

## Phase 6 — Backup subsystem

Self-hosted Supabase has no managed backups. Hostinger's weekly snapshot is not
sufficient on its own: a seven-day RPO on inspector data, and it dies with the
account.

**Model: the in-house Windows Server pulls. Nothing is pushed from the VPS, and no
inbound port is opened at the office.**

**On the VPS** — systemd timer at 02:00 Asia/Manila:

- `docker exec` a `pg_dump -Fc` into `/srv/backups/db/inspectplus-YYYY-MM-DD.dump`,
  owned `root:backup`, mode `640`.
- Prune local dumps older than 3 days — the VPS is a staging area, not the archive.
- A dedicated `backup` user, restricted in `sshd_config` via
  `Match User backup` → `ForceCommand internal-sftp` + `ChrootDirectory`. The chroot
  root is root-owned and contains two **read-only bind mounts**: the dump directory
  and `volumes/storage`. The backup account therefore cannot get a shell, cannot
  leave those two trees, and cannot write to either.

**On the Windows Server** — Task Scheduler at 03:00, running a PowerShell script
under a service account with "run whether user is logged on or not":

- `rclone` (single native `.exe`, speaks SFTP) with a key-authenticated remote.
  The keypair is generated on the Windows Server; only its public half goes to the
  VPS.
- `rclone copy` the dumps; `rclone sync` the attachment tree.
- **`rclone sync` mirrors deletions, which would propagate a disaster into the
  archive.** If the VPS storage tree is wiped, the next run would faithfully wipe
  the backup copy. The sync therefore runs with `--backup-dir` pointing at a dated
  attic directory, so deleted and changed files are moved aside rather than
  destroyed.
- Retention on the Windows side: 30 daily dumps, 12 monthly.
- Attachments are pulled as files, not as a nightly tarball — a metadata row without
  its file is useless, and incremental sync keeps the transfer proportional to
  what actually changed.
- **Missed-run alerting.** A scheduled task that dies quietly can go unnoticed for
  months. The script pings a Healthchecks.io check on success; the absence of a ping
  raises the alert.

**Restore drill, monthly, and written down:** fresh Postgres 17 container on a clean
volume → `pg_restore` the newest dump → spot-check known tables and row counts. A
backup that has never been restored is a hypothesis.

## Phase 7 — Monitoring

- External uptime check (UptimeRobot / Healthchecks.io free tier) polling
  `https://$VPS_HOST/auth/v1/health`.
- `docker compose logs -f <service>` is adequate log visibility at this scale.
- Periodic disk-space check — attachments are the growth vector.
- No Prometheus/Grafana. Not justified until team or load grows.

## Phase 8 — Go-live sequence

1. Phase 1 complete: key-only login verified, root and password login both refused,
   both firewalls showing only 22 (office IP) / 80 / 443, external scan confirming
   5432 and Kong are unreachable.
2. `dig` confirms `$VPS_HOST` resolves to the VPS.
3. Stack healthy with real generated secrets; `curl https://$VPS_HOST/auth/v1/health`
   returns valid TLS.
4. Apply all 57 migrations via Phase 4; `supabase migration list` shows every one
   applied, none missing or out of order.
5. **Do not run `supabase/seeds/dev/*`.** Those are fake dev inspector accounts.
   Create the first real account by hand through the Studio SSH tunnel: one
   `auth.users` row plus a matching `public.user_accounts` row with
   `role = 'Administrator'` or `'Developer'`.
6. Confirm `app_config.min_supported_app_version` (currently seeded `1.0.0`) against
   the version actually shipping — `app.json` is at `1.0.3`.
7. Set the Phase 5 EAS variables, including `EXPO_PUBLIC_APP_ENV`.
8. Set `"environment": "production"` in `eas.json` and cut an Android build via the
   existing `main`-branch path.
9. Cut a matching iOS build if Apple credentials exist. If they do not, iOS
   verification stays blocked — going live Android-only is acceptable, but "works on
   Android" is not evidence about iOS, whose ATS enforcement is stricter.
10. Full sync smoke test on each available platform: `pull_changes(0)`, create a test
    establishment and report, upload a photo, push, then pull again from a second
    session. This exercises RLS, both sync RPCs, and the `attachments` bucket
    policies together.
11. Distribute to inspectors only after the smoke test passes.
12. Verify the first nightly backup actually ran **and restored** before treating the
    environment as durably live.

## Deviations from `production-deployment.md`

| # | Runbook said | This design says | Why |
|---|---|---|---|
| 1 | Migrations deploy from GitHub Actions over SSH | Migrations run from an office workstation; Actions workflow deferred | GitHub runners' dynamic IPs are incompatible with the office-IP SSH allowlist |
| 2 | Backups to Cloudflare R2 / Backblaze B2 via `rclone` from the VPS | Backups pulled by the in-house Windows Server over SFTP | In-house server exists, is always-on with UPS and redundant disks; pull keeps backup credentials off the VPS |
| 3 | Phase 5 sets `EXPO_PUBLIC_SUPABASE_URL` and `_ANON_KEY` | Also sets `EXPO_PUBLIC_APP_ENV=production` | `env.ts` silently defaults to `development` config otherwise |
| 4 | `ufw` allowing 22/80/443 | Both Hostinger's edge firewall and `ufw`, plus loopback-binding every container port | `ufw` alone does not constrain Docker's published ports |
| 5 | Buy a domain (Phase 0 prerequisite) | Use the provider hostname `$VPS_HOST` | Unblocks go-live; cost recorded below |

## Risks

**The API origin is Hostinger's hostname, not ours.** `$VPS_HOST`
gets compiled into every build as `EXPO_PUBLIC_SUPABASE_URL`, and an installed APK
cannot be repointed without shipping a new build. Migrating off this VPS, rebuilding
it, or changing providers changes that hostname and **breaks every field device
until each one is updated**. A domain with an `api.` record makes the same event a
DNS change. Recommended as the first follow-up after go-live; the Caddyfile and EAS
variables are the only two places that change.

**Let's Encrypt rate limits on a shared parent domain.** Let's Encrypt caps
certificates per registered domain per week, determined via the Public Suffix List.
If `hstgr.cloud` is not on that list, every Hostinger customer's VPS hostname shares
one quota, and issuance may fail through no fault of ours. Whether it is listed has
not been verified and will be settled empirically at first issuance. Caddy falls
back to ZeroSSL automatically if Let's Encrypt refuses, so this is unlikely to be
fatal — but a rate-limit error at cert time means this is the cause, not a
misconfiguration, and it strengthens the case for buying a domain.

**Office IP change locks out SSH.** Mitigated by Hostinger's browser Web console as
the break-glass path, and by the panel firewall being editable without SSH access.

**Backups concentrate in one building.** The in-house server is well-protected
(UPS, redundant disks) but shares a site with the office. A fire or flood takes the
building and the only archive. Not blocking, given the VPS itself is a second
geographic copy of live data, but a small cloud tier for the `pg_dump` files only —
they are far smaller than the attachments — would close it cheaply.

## Open items

- Port/process audit output from the VPS (Phase 1 Step 0) — governs reinstall vs.
  harden in place.
- The office static IP, for both firewall allowlists.
- Windows Server specifics: OS version, target drive and free space, service account
  for the scheduled task.
- Healthchecks.io (or equivalent) account for missed-run alerting.
- Apple Developer credentials — still gating any iOS verification. Out of scope here.

## Verification

| Phase | Check |
|---|---|
| 1 | Key-only login succeeds; root and password login fail; both firewalls show only 22/80/443; **external** scan confirms 5432 and Kong unreachable |
| 2 | `docker compose ps` all healthy; Postgres image tag matches local dev exactly; `docker/.env` is 600 and contains no demo defaults |
| 3 | `curl -I https://$VPS_HOST/auth/v1/health` returns valid TLS; Studio unreachable except via tunnel |
| 4 | `supabase migration list` shows all 57 applied, in order |
| 5 | `eas env:list --environment production` shows all three variables; a build's `[Supabase] URL:` log resolves the real origin |
| 6 | A dump lands on the Windows Server unattended; a `pg_restore` of it into a clean container reproduces expected row counts |
| 8 | End-to-end smoke test passes before any inspector receives a build |

## Out of scope

- Apple Developer account, code signing, App Store submission.
- Migrating data from the abandoned Supabase Cloud project — none exists.
- A separate staging Supabase instance.
