begin;

create or replace function public.push_changes(changes jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  establishment_record jsonb;
begin
  -- Handle created establishments
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

  -- Handle updated establishments
  for establishment_record in
    select value
    from jsonb_array_elements(
      coalesce(changes->'establishments'->'updated', '[]'::jsonb)
    )
  loop
    update public.establishments
    set
      inspector_uid = establishment_record->>'inspector_uid',
      name = establishment_record->>'name',
      address = establishment_record->>'address',
      province = establishment_record->>'province',
      nature_of_business = establishment_record->>'nature_of_business',
      status = establishment_record->>'status',
      updated_at = coalesce((establishment_record->>'updated_at')::timestamptz, now()),
      sync_status = coalesce((establishment_record->>'sync_status')::public.sync_status_enum, 'pending'),
      device_id = establishment_record->>'device_id'
    where estab_id = establishment_record->>'estab_id';
  end loop;

  -- Handle deleted establishments
  for establishment_record in
    select value
    from jsonb_array_elements(
      coalesce(changes->'establishments'->'deleted', '[]'::jsonb)
    )
  loop
    delete from public.establishments
    where estab_id = trim(both '"' from establishment_record::text);
  end loop;

  return jsonb_build_object('status', 'ok');
end;
$$;

commit;