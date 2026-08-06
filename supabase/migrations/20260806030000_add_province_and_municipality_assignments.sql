begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Replaces the scalar user_accounts.area_of_assignment (which the
-- 2026-08-05 jurisdiction-visibility migration matched against
-- establishments.province) with an explicit relational model:
--
--   - user_accounts.province: the inspector's ONE assigned province
--     (1:1 — a single column, same cardinality area_of_assignment already
--     had, just accurately named now that it's the sole jurisdiction key).
--   - inspector_municipalities: the specific municipalities/cities within
--     that province the inspector is responsible for (MANY per inspector —
--     a child table, since a scalar column can't hold a set of values).
--
-- Jurisdiction VISIBILITY (which establishments/reports render at all)
-- stays province-wide only, per the original design — municipality
-- assignment is read-only, client-side data used to power a narrowing
-- filter in the UI, not an additional access-control boundary. No RLS
-- policy references inspector_municipalities.
--
-- Every existing policy that reads area_of_assignment must be dropped
-- BEFORE the column itself is dropped (Postgres won't let you drop a
-- column an RLS policy's USING clause still depends on) — hence dropping
-- all seven jurisdiction policies up front, then the column, then
-- recreating each against the new column.
-- ─────────────────────────────────────────────────────────────────────────

drop policy "inspectors can read jurisdiction establishments" on public.establishments;
drop policy "inspectors can read jurisdiction inspection reports" on public.inspection_reports;
drop policy "inspectors can read jurisdiction purpose records" on public.purpose_of_inspection;
drop policy "inspectors can read jurisdiction air compliance" on public.compliance_air;
drop policy "inspectors can read jurisdiction water compliance" on public.compliance_water;
drop policy "inspectors can read jurisdiction hazwaste compliance" on public.compliance_hazwaste;
drop policy "inspectors can read jurisdiction eia compliance" on public.compliance_eia;

-- ── user_accounts: area_of_assignment -> province ───────────────────────
alter table public.user_accounts add column province text;
update public.user_accounts set province = area_of_assignment;
alter table public.user_accounts alter column province set not null;
alter table public.user_accounts drop column area_of_assignment;

-- ── INSPECTOR_MUNICIPALITIES ────────────────────────────────────────────
create table public.inspector_municipalities (
  inspector_uid text not null references public.user_accounts(uid) on delete cascade,
  municipality text not null,
  primary key (inspector_uid, municipality)
);

alter table public.inspector_municipalities enable row level security;

create policy "inspectors can read own municipality assignments"
on public.inspector_municipalities
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

revoke all on public.inspector_municipalities from anon;
grant select on public.inspector_municipalities to authenticated;

-- ── Recreate the jurisdiction SELECT policies against province ─────────

create policy "inspectors can read jurisdiction establishments"
on public.establishments
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.province = establishments.province
  )
);

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
      and ua.province = e.province
  )
);

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
      and ua.province = e.province
  )
);

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
      and ua.province = e.province
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
      and ua.province = e.province
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
      and ua.province = e.province
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
      and ua.province = e.province
  )
);

commit;
