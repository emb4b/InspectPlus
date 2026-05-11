begin;

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
      'purpose_of_inspection', jsonb_build_object(
        'created', coalesce((
          select jsonb_agg(to_jsonb(p))
          from public.purpose_of_inspection p
          join public.inspection_reports ir on ir.report_id = p.report_id
          where floor(extract(epoch from ir.updated_at) * 1000)::bigint > last_pulled_at
        ), '[]'::jsonb),
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
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
      )
    ),
    'timestamp', floor(extract(epoch from now()) * 1000)::bigint
  );

  return response;
end;
$$;

commit;