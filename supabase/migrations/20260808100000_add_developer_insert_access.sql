begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260807010000_add_developer_full_write_access.sql gave Developer accounts
-- an update/delete bypass on establishments, inspection_reports, and
-- purpose_of_inspection, but deliberately skipped INSERT — its reasoning was
-- "every insert in this app is self-owned by construction (inspector_uid is
-- always the creating user's own uid), so there's no 'create on behalf of
-- another inspector' case to unlock."
--
-- That assumption doesn't hold for a row that was created locally (offline,
-- inspector_uid stamped as the creating inspector) but never reached the
-- server before a Developer account later pushes changes from the same
-- device/session — the pending row's inspector_uid may belong to a
-- different inspector than the one currently authenticated. Without this,
-- that INSERT hits the still-owner-only "inspectors can insert own X"
-- policy, gets rejected by RLS, aborts the whole push_changes transaction
-- (push_changes runs as SECURITY INVOKER, so RLS applies to every statement
-- inside it), and silently blocks every other pending change in the same
-- batch too.
--
-- Purely additive: a new permissive policy per table, OR'd in alongside the
-- existing owner-only INSERT policy (Postgres RLS combines multiple
-- permissive policies for the same command with OR), so nothing already
-- granted is narrowed.
-- ─────────────────────────────────────────────────────────────────────────

create policy "developers can insert any establishment"
on public.establishments
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can insert any inspection report"
on public.inspection_reports
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

create policy "developers can insert any purpose record"
on public.purpose_of_inspection
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_accounts ua
    where ua.uid = (select auth.uid())::text and ua.role = 'Developer'
  )
);

commit;
