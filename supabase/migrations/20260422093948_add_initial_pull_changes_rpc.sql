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
      )
    ),
    'timestamp', floor(extract(epoch from now()) * 1000)::bigint
  );

  return response;
end;
$$;

commit;