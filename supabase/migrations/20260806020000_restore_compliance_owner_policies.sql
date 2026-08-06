begin;

-- 20260422085912_add_initial_rls_policies.sql created "inspectors can manage
-- own X compliance" (FOR ALL) policies on compliance_air/water/hazwaste/eia,
-- each keyed off an EXISTS subquery against public.inspection_reports.
--
-- 20260727090000_redefine_core_tables_v2.sql later did
-- `drop table public.inspection_reports cascade` to rebuild it. Postgres
-- treats an RLS policy's USING/WITH CHECK expression as a dependency on any
-- table it references, so that CASCADE silently dropped these four
-- policies along with the FK constraints the migration's own comment
-- called out — leaving compliance_air/water/hazwaste/eia with no
-- INSERT/UPDATE/DELETE policy at all, and no owner-based SELECT fallback.
-- (survey_reports and purpose_of_inspection were unaffected: survey_reports'
-- policies never referenced inspection_reports, and purpose_of_inspection's
-- were explicitly recreated by that same migration since the table itself
-- was dropped and rebuilt.)
--
-- This went unnoticed because every pgTAP test against these tables ran as
-- the postgres superuser, which bypasses RLS entirely. Combined with the
-- missing authenticated grant (see
-- 20260806010000_grant_authenticated_on_compliance_tables.sql), any real
-- client's push_changes call against a compliance table has had no way to
-- succeed since that migration — recreating the grant alone still leaves
-- every insert/update/delete rejected with "new row violates row-level
-- security policy".
--
-- 20260805090000_add_jurisdiction_scoped_read_access.sql later added
-- SELECT-only "inspectors can read jurisdiction X compliance" policies on
-- these same tables, which is why a bare SELECT looked partially covered;
-- it did not restore write access.

create policy "inspectors can manage own air compliance"
on public.compliance_air
for all
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_air.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_air.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

create policy "inspectors can manage own water compliance"
on public.compliance_water
for all
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_water.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_water.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

create policy "inspectors can manage own hazwaste compliance"
on public.compliance_hazwaste
for all
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_hazwaste.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_hazwaste.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

create policy "inspectors can manage own eia compliance"
on public.compliance_eia
for all
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_eia.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = compliance_eia.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

commit;
