begin;

-- pull_changes/push_changes run as SECURITY INVOKER (see
-- 20260727090500_update_sync_rpc_for_core_tables_v2.sql), so the
-- authenticated role needs real table privileges on the compliance_*
-- tables for those RPCs to work at all — same requirement already
-- documented and satisfied for every other synced table (see the
-- grants section of 20260727090000_redefine_core_tables_v2.sql).
--
-- 20260430024547_lock_down_graphql_table_exposure.sql revoked all
-- privileges from authenticated on every sensitive table, intending
-- access to go solely through the RPCs. Follow-up migrations re-granted
-- authenticated access for inspection_reports, purpose_of_inspection,
-- survey_reports and establishments, but compliance_air/water/hazwaste/
-- eia were missed. Since pull_changes/push_changes run as SECURITY
-- INVOKER, this meant the RPCs could never actually read or write these
-- four tables for any user, including a report's own creator — every
-- real client call failed with "permission denied for table
-- compliance_air" (or water/hazwaste/eia), even though the owner-only
-- RLS policies in 20260422085912_add_initial_rls_policies.sql were
-- already correct and ready to scope access once the grant existed.
--
-- RLS continues to govern which rows are visible/writable; this only
-- lets the authenticated role reach the tables at all.
grant select, insert, update, delete on public.compliance_air to authenticated;
grant select, insert, update, delete on public.compliance_water to authenticated;
grant select, insert, update, delete on public.compliance_hazwaste to authenticated;
grant select, insert, update, delete on public.compliance_eia to authenticated;

commit;
