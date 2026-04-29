begin;

create or replace function public.push_changes(changes jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  establishment_record jsonb;
begin
  -- Handle created establishments only
  for establishment_record in
    select value
    from jsonb_array_elements(
      coalesce(changes->'establishments'->'created', '[]'::jsonb)
    )
  loop
    insert into public.establishments (
      estab_id,
      inspector_uid,
      name,
      address,
      province,
      nature_of_business,
      status,
      created_at,
      updated_at,
      sync_status,
      device_id
    )
    values (
      establishment_record->>'estab_id',
      establishment_record->>'inspector_uid',
      establishment_record->>'name',
      establishment_record->>'address',
      establishment_record->>'province',
      establishment_record->>'nature_of_business',
      establishment_record->>'status',
      coalesce((establishment_record->>'created_at')::timestamptz, now()),
      coalesce((establishment_record->>'updated_at')::timestamptz, now()),
      coalesce((establishment_record->>'sync_status')::public.sync_status_enum, 'pending'),
      establishment_record->>'device_id'
    )
    on conflict (estab_id) do nothing;
  end loop;

  return jsonb_build_object('status', 'ok');
end;
$$;

commit;