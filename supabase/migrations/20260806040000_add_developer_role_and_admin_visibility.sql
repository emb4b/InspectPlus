begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Adds a 'Developer' role alongside 'Inspector'/'Administrator', and gives
-- both Administrator and Developer accounts unrestricted READ visibility
-- across every province — not just their own assigned one.
--
-- This is purely additive, same approach as the jurisdiction-visibility
-- migrations before it: a new SELECT-only policy per table, OR'd in
-- alongside the existing owner/jurisdiction SELECT policies (Postgres RLS
-- combines multiple permissive policies for the same command with OR), so
-- nothing already granted is narrowed. Write access (insert/update/delete)
-- is UNCHANGED and stays owner-only for every role — this only widens what
-- can be VIEWED, not edited.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.user_accounts drop constraint user_accounts_role_check;
alter table public.user_accounts add constraint user_accounts_role_check
  check (role in ('Inspector', 'Administrator', 'Developer'));

create policy "admins and developers can read all establishments"
on public.establishments
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

create policy "admins and developers can read all inspection reports"
on public.inspection_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

create policy "admins and developers can read all purpose records"
on public.purpose_of_inspection
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

create policy "admins and developers can read all air compliance"
on public.compliance_air
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

create policy "admins and developers can read all water compliance"
on public.compliance_water
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

create policy "admins and developers can read all hazwaste compliance"
on public.compliance_hazwaste
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

create policy "admins and developers can read all eia compliance"
on public.compliance_eia
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.uid = (select auth.uid())::text
      and ua.role in ('Administrator', 'Developer')
  )
);

commit;
