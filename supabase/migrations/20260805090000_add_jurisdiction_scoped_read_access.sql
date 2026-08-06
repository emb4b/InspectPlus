begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Offline access privileging: jurisdiction-scoped read access.
--
-- Today every table below only lets an inspector read their OWN rows
-- (inspector_uid = auth.uid()). This adds READ-ONLY visibility rules on
-- top of that, without touching any existing policy:
--
--   - establishments: also readable when the establishment's province
--     matches the requesting inspector's own user_accounts.area_of_assignment.
--   - inspection_reports, purpose_of_inspection, compliance_air/water/
--     hazwaste/eia: also readable when they belong to an establishment the
--     inspector can read under the rule above (i.e. same jurisdiction),
--     regardless of which inspector created them.
--
-- Write access (insert/update/delete) is UNCHANGED — every existing
-- owner-only policy stays exactly as it is. This works because Postgres
-- RLS policies for the same command are combined with OR (permissive by
-- default): adding a second SELECT policy only ever widens what's
-- readable, and no new INSERT/UPDATE/DELETE policy is added at all, so
-- "only the creator can edit" continues to hold via the pre-existing
-- owner-only write policies.
--
-- pull_changes/push_changes run as SECURITY INVOKER (see
-- 20260727090500_update_sync_rpc_for_core_tables_v2.sql), so this also
-- transparently widens what pull_changes syncs down to a device — no RPC
-- change needed.
--
-- NOTE: as of this migration, the compliance_air/water/hazwaste/eia
-- policies below were inert — `authenticated` had no table-level GRANT on
-- these four tables at all, so RLS never even got evaluated for them via a
-- normal client session (see supabase/tests/rls/graphql_table_exposure.sql
-- pre-20260806010000, which documented this as intended at the time). That
-- turned out to be a pre-existing gap, not deliberate: it also blocked
-- compliance sync entirely, even for a report's own creator, since
-- pull_changes/push_changes run as SECURITY INVOKER. Fixed in
-- 20260806010000_grant_authenticated_on_compliance_tables.sql, which the
-- policies here were already forward-compatible with.
-- ─────────────────────────────────────────────────────────────────────────

-- ── ESTABLISHMENTS ──────────────────────────────────────────────────────
create policy "inspectors can read jurisdiction establishments"
on public.establishments
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.area_of_assignment = establishments.province
  )
);

-- ── INSPECTION_REPORTS ──────────────────────────────────────────────────
create policy "inspectors can read jurisdiction inspection reports"
on public.inspection_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where e.estab_id = inspection_reports.estab_id
      and ua.area_of_assignment = e.province
  )
);

-- ── PURPOSE_OF_INSPECTION ────────────────────────────────────────────────
-- Needed alongside inspection_reports above — the report detail screen's
-- "Purpose" tab reads this table directly by purpose_id, so without this
-- an otherwise-visible report from another inspector would show an empty
-- Purpose tab.
create policy "inspectors can read jurisdiction purpose records"
on public.purpose_of_inspection
for select
to authenticated
using (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where e.estab_id = purpose_of_inspection.estab_id
      and ua.area_of_assignment = e.province
  )
);

-- ── COMPLIANCE_AIR / WATER / HAZWASTE / EIA ─────────────────────────────
-- Same rationale as purpose_of_inspection: these hold the actual filled-in
-- compliance content for a report's "Compliance" tab. Without read access
-- here, a jurisdiction-visible report from another inspector would show
-- its header but an empty compliance section.

create policy "inspectors can read jurisdiction air compliance"
on public.compliance_air
for select
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where ir.report_id = compliance_air.report_id
      and ua.area_of_assignment = e.province
  )
);

create policy "inspectors can read jurisdiction water compliance"
on public.compliance_water
for select
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where ir.report_id = compliance_water.report_id
      and ua.area_of_assignment = e.province
  )
);

create policy "inspectors can read jurisdiction hazwaste compliance"
on public.compliance_hazwaste
for select
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where ir.report_id = compliance_hazwaste.report_id
      and ua.area_of_assignment = e.province
  )
);

create policy "inspectors can read jurisdiction eia compliance"
on public.compliance_eia
for select
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where ir.report_id = compliance_eia.report_id
      and ua.area_of_assignment = e.province
  )
);

commit;
