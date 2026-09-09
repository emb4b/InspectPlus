# InspectPlus

A React Native (Expo) mobile app for environmental compliance inspectors, supporting offline-first data entry with background sync to Supabase.

## Stack

- **Expo + Expo Router** — app shell and file-based navigation (`src/app`)
- **WatermelonDB** — local offline-first database (`src/db`)
- **Supabase** — backend (Postgres, auth, RPC-based sync) — see [`supabase/`](supabase)
- **TypeScript**

## Project structure

```
src/
  app/          # Expo Router screens/routes
  features/     # Feature modules (establishments, inspections, auth, home, ...)
  components/   # Shared UI components (incl. form primitives)
  db/           # WatermelonDB schema, models, and sync helpers
  services/     # External integrations (Supabase client, sync push/pull)
  core/         # Providers, hooks, and environment config
  constants/    # App-wide constants
  types/        # Shared TypeScript types
  utils/        # Generic helpers
supabase/       # Migrations, RPCs, RLS tests, seeds
docs/           # Architecture and contract docs
```

Each feature under `src/features/<name>` groups its own `components/`, `hooks/`, and `types/` as needed — see `src/features/inspections/water` for the reference implementation of a report type.

The mobile ↔ backend sync contract (pull/push RPC shapes, conflict behavior) is documented in [`docs/sync-contract.md`](docs/sync-contract.md).

## Getting started

### Prerequisites

- Node.js >= 22.11.0
- A [React Native environment](https://reactnative.dev/docs/set-up-your-environment) set up for Android and/or iOS
- A `.env` file at the project root (see below)

### Environment variables

Create a `.env` (gitignored) with:

```
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Non-secret, per-environment config (cache durations, sync intervals, etc.) lives in `src/core/config/env.*.ts`. Any of those defaults can be overridden per install by adding its variable to `.env` — a value that isn't a number (or is left blank) is ignored in favour of the default:

```
EXPO_PUBLIC_DUE_SOON_DAYS=14
EXPO_PUBLIC_OVERDUE_DAYS=30
```

A draft crosses into "Due in N days" at `DUE_SOON_DAYS` and into "Overdue by N days" at `OVERDUE_DAYS`, counting from its inspection date; submitted reports are never flagged. See `src/utils/reportUrgency.ts`.

**These `.env` values are build-time defaults only.** In a running app the
thresholds come from the `due_soon_days` / `overdue_days` rows in the
Supabase `app_config` table, cached for offline use so EMB can retune them
without a new build. The `.env` values apply only until the first successful
sync on a fresh install. There is no periodic background sync in this app —
the refresh happens only at login and on a manual "Sync Now" tap, so a user
who stays signed in without syncing sees a changed threshold only at their
next sync. See `src/services/config/urgencyConfig.ts`.

### Install & run

```sh
npm install

npm run android   # build & run on Android
npm run ios       # build & run on iOS
npm start         # start Metro only
```

### Checks

```sh
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # jest
```

## Backend (Supabase)

Migrations, RLS policies, RPC tests, and seed data live under [`supabase/`](supabase). Use the Supabase CLI to run migrations and serve functions locally — see `supabase/config.toml`.
