-- ── get_inspector_names ─────────────────────────────────────────────────────
-- Resolves an arbitrary set of inspector uids to display names.
--
-- user_accounts is locked down to self-only reads ("users can read own
-- account" — uid = auth.uid()), which is correct for the account's
-- sensitive columns (email, phone_number, etc.) but means an inspector
-- viewing an establishment/report assigned to a *different* inspector has
-- no way to resolve that name today; the client falls back to rendering
-- the raw uid.
--
-- This SECURITY DEFINER function bypasses that RLS policy but — unlike
-- granting broader SELECT on user_accounts — only ever returns the two
-- columns needed to display a name, for exactly the uids requested. It
-- does not allow enumerating all users.
create or replace function public.get_inspector_names(p_uids text[])
returns table (uid text, full_name text)
language sql
security definer
set search_path = public
as $$
  select
    ua.uid,
    nullif(concat_ws(' ', ua.first_name, ua.middle_name, ua.last_name), '') as full_name
  from public.user_accounts ua
  where ua.uid = any(p_uids);
$$;

revoke all on function public.get_inspector_names(text[]) from public;
revoke all on function public.get_inspector_names(text[]) from anon;
grant execute on function public.get_inspector_names(text[]) to authenticated;
