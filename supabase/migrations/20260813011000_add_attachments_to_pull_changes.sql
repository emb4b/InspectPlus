begin;

-- Add attachments to pull_changes. Full function body re-issued (this
-- codebase has no incremental ALTER FUNCTION precedent for these RPCs — see
-- 20260727090500_update_sync_rpc_for_core_tables_v2.sql, the last migration
-- to redefine pull_changes) with a new `attachments` block appended, using
-- the same soft-delete created/deleted split already used there for
-- inspection_reports/survey_reports.

create or replace function public.pull_changes(last_pulled_at bigint default 0)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  response jsonb;
begin
  response := jsonb_build_object(
    'changes', jsonb_build_object(
      'establishments', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(e))
          from public.establishments e
          where floor(extract(epoch from e.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      ),
      'purpose_of_inspection', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(p))
          from public.purpose_of_inspection p
          where floor(extract(epoch from p.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      ),
      'inspection_reports', jsonb_build_object(
        'created', coalesce((
            select jsonb_agg(to_jsonb(ir))
            from public.inspection_reports ir
            where ir.deleted_at is null
            and floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', coalesce((
            select jsonb_agg(ir.report_id)
            from public.inspection_reports ir
            where ir.deleted_at is not null
            and floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb)
        ),
      'survey_reports', jsonb_build_object(
        'created', coalesce((
            select jsonb_agg(to_jsonb(sr))
            from public.survey_reports sr
            where sr.deleted_at is null
            and floor(extract(epoch from sr.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', coalesce((
            select jsonb_agg(sr.survey_id)
            from public.survey_reports sr
            where sr.deleted_at is not null
            and floor(extract(epoch from sr.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb)
        ),
      'compliance_air', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(ca))
          from public.compliance_air ca
          join public.inspection_reports ir on ir.report_id = ca.report_id
          where floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      ),
      'compliance_water', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(cw))
          from public.compliance_water cw
          join public.inspection_reports ir on ir.report_id = cw.report_id
          where floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      ),
      'compliance_hazwaste', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(ch))
          from public.compliance_hazwaste ch
          join public.inspection_reports ir on ir.report_id = ch.report_id
          where floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      ),
      'compliance_eia', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(ce))
          from public.compliance_eia ce
          join public.inspection_reports ir on ir.report_id = ce.report_id
          where floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      ),
      'attachments', jsonb_build_object(
        'created', coalesce((
            select jsonb_agg(to_jsonb(a))
            from public.attachments a
            where a.deleted_at is null
            and floor(extract(epoch from a.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', coalesce((
            select jsonb_agg(a.attachment_id)
            from public.attachments a
            where a.deleted_at is not null
            and floor(extract(epoch from a.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb)
        )
    ),
    'timestamp', floor(extract(epoch from now()) * 1000)::bigint
  );

  return response;
end;
$$;

commit;
