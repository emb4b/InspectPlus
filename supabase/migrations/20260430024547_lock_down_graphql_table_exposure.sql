-- Lock down direct GraphQL/REST visibility for sensitive Inspect+ tables.
-- The mobile app should sync through controlled RPC functions:
--   public.pull_changes(...)
--   public.push_changes(...)

revoke select, insert, update, delete on table public.user_accounts from anon;
revoke select, insert, update, delete on table public.establishments from anon;
revoke select, insert, update, delete on table public.inspection_reports from anon;
revoke select, insert, update, delete on table public.purpose_of_inspection from anon;
revoke select, insert, update, delete on table public.survey_reports from anon;
revoke select, insert, update, delete on table public.compliance_air from anon;
revoke select, insert, update, delete on table public.compliance_water from anon;
revoke select, insert, update, delete on table public.compliance_hazwaste from anon;
revoke select, insert, update, delete on table public.compliance_eia from anon;

revoke select, insert, update, delete on table public.user_accounts from authenticated;
revoke select, insert, update, delete on table public.establishments from authenticated;
revoke select, insert, update, delete on table public.inspection_reports from authenticated;
revoke select, insert, update, delete on table public.purpose_of_inspection from authenticated;
revoke select, insert, update, delete on table public.survey_reports from authenticated;
revoke select, insert, update, delete on table public.compliance_air from authenticated;
revoke select, insert, update, delete on table public.compliance_water from authenticated;
revoke select, insert, update, delete on table public.compliance_hazwaste from authenticated;
revoke select, insert, update, delete on table public.compliance_eia from authenticated;

-- Keep the main sync RPCs callable by signed-in users.
-- If your pull_changes/push_changes signatures differ, adjust these grants.
grant execute on function public.pull_changes(bigint) to authenticated;
grant execute on function public.push_changes(jsonb) to authenticated;