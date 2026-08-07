begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260806040000_add_developer_role_and_admin_visibility.sql gave
-- Administrator and Developer accounts unrestricted READ visibility, but
-- explicitly left write access (insert/update/delete) owner-only for every
-- role — see that migration's comment and the negative assertions in
-- supabase/tests/rls/admin_developer_visibility_rls.sql.
--
-- This migration is the deliberate follow-up: Developer accounts (NOT
-- Administrator — Administrator keeps read-all/write-own, unchanged) can
-- now update and delete ANY establishment or inspection report, not just
-- their own. It also extends the same bypass to purpose_of_inspection and
-- the compliance_* tables, since editing an inspection report's Purpose or
-- Compliance sections writes to those tables too — without this, a
-- Developer editing another inspector's report would hit those tables'
-- still-owner-only policies and have the write silently dropped by RLS
-- (push_changes/pull_changes run as SECURITY INVOKER, so RLS applies to
-- every statement inside them, not just direct PostgREST calls).
--
-- Purely additive: a new permissive policy per table/command, OR'd in
-- alongside the existing owner-only policies (Postgres RLS combines
-- multiple permissive policies for the same command with OR), so nothing
-- already granted is narrowed.
--
-- No new INSERT policy on establishments/inspection_reports/
-- purpose_of_inspection: every insert in this app is self-owned by
-- construction (inspector_uid is always the creating user's own uid), so
-- there's no "create on behalf of another inspector" case to unlock — a
-- Developer creating a new establishment/report already succeeds under the
-- existing owner-insert policy, same as any other role. compliance_* rows
-- are different: their "ownership" is derived by joining to the parent
-- report's inspector_uid, which may belong to someone else once a
-- Developer is editing that other inspector's report, so those get a
-- single FOR ALL policy (covering insert too) mirroring the existing
-- "inspectors can manage own X compliance" pattern.
-- ─────────────────────────────────────────────────────────────────────────

create policy "developers can update all establishments"
on public.establishments
for update
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can delete all establishments"
on public.establishments
for delete
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can update all inspection reports"
on public.inspection_reports
for update
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can delete all inspection reports"
on public.inspection_reports
for delete
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can update all purpose records"
on public.purpose_of_inspection
for update
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can delete all purpose records"
on public.purpose_of_inspection
for delete
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can manage all air compliance"
on public.compliance_air
for all
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can manage all water compliance"
on public.compliance_water
for all
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can manage all hazwaste compliance"
on public.compliance_hazwaste
for all
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can manage all eia compliance"
on public.compliance_eia
for all
to authenticated
using (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
)
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

commit;
