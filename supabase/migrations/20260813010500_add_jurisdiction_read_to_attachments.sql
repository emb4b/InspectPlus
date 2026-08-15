begin;

-- Jurisdiction-scoped read access for attachments, same rationale and
-- pattern as 20260805090000_add_jurisdiction_scoped_read_access.sql: a
-- jurisdiction-visible report from another inspector should show its
-- attached photos too, not just its header. Write access is unchanged —
-- only the owner-only policies from create_attachments_table.sql can
-- insert/update/delete.
create policy "inspectors can read jurisdiction attachments"
on public.attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where ir.report_id = attachments.inspection_report_id
      and ua.province = e.province
  )
  or exists (
    select 1
    from public.survey_reports sr
    join public.establishments e on e.estab_id = sr.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    where sr.survey_id = attachments.survey_report_id
      and ua.province = e.province
  )
);

commit;
