begin;

-- Enable RLS on all public tables

alter table public.user_accounts enable row level security;
alter table public.establishments enable row level security;
alter table public.inspection_reports enable row level security;
alter table public.purpose_of_inspection enable row level security;
alter table public.compliance_air enable row level security;
alter table public.compliance_water enable row level security;
alter table public.compliance_hazwaste enable row level security;
alter table public.compliance_eia enable row level security;
alter table public.survey_reports enable row level security;

-- USER ACCOUNTS

create policy "users can read own account"
on public.user_accounts
for select
to authenticated
using (uid = (select auth.uid())::text);

create policy "users can update own account"
on public.user_accounts
for update
to authenticated
using (uid = (select auth.uid())::text)
with check (uid = (select auth.uid())::text);

-- ESTABLISHMENTS

create policy "inspectors can read own establishments"
on public.establishments
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own establishments"
on public.establishments
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own establishments"
on public.establishments
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own establishments"
on public.establishments
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

-- INSPECTION REPORTS

create policy "inspectors can read own inspection reports"
on public.inspection_reports
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own inspection reports"
on public.inspection_reports
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own inspection reports"
on public.inspection_reports
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own inspection reports"
on public.inspection_reports
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

-- SURVEY REPORTS

create policy "inspectors can read own survey reports"
on public.survey_reports
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own survey reports"
on public.survey_reports
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own survey reports"
on public.survey_reports
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own survey reports"
on public.survey_reports
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

-- PURPOSE OF INSPECTION
-- Access is based on the parent inspection report

create policy "inspectors can read own purpose records"
on public.purpose_of_inspection
for select
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = purpose_of_inspection.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

create policy "inspectors can insert own purpose records"
on public.purpose_of_inspection
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = purpose_of_inspection.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

create policy "inspectors can update own purpose records"
on public.purpose_of_inspection
for update
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = purpose_of_inspection.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = purpose_of_inspection.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

create policy "inspectors can delete own purpose records"
on public.purpose_of_inspection
for delete
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    where ir.report_id = purpose_of_inspection.report_id
      and ir.inspector_uid = (select auth.uid())::text
  )
);

-- COMPLIANCE_AIR

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

-- COMPLIANCE_WATER

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

-- COMPLIANCE_HAZWASTE

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

-- COMPLIANCE_EIA

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