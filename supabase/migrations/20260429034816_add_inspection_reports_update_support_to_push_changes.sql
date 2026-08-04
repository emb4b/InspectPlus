begin;

create or replace function public.push_changes(changes jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  establishment_record jsonb;
  inspection_report_record jsonb;
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

  -- Handle created inspection reports
  for inspection_report_record in
    select value
    from jsonb_array_elements(
      coalesce(changes->'inspection_reports'->'created', '[]'::jsonb)
    )
  loop
    insert into public.inspection_reports (
      report_id,
      estab_id,
      inspector_uid,
      report_type,
      report_control_number,
      inspection_date,
      snapshot,
      permits_snapshot,
      created_at,
      updated_at,
      is_archived,
      sync_status,
      device_id
    )
    values (
      inspection_report_record->>'report_id',
      inspection_report_record->>'estab_id',
      inspection_report_record->>'inspector_uid',
      inspection_report_record->>'report_type',
      inspection_report_record->>'report_control_number',
      (inspection_report_record->>'inspection_date')::date,
      coalesce(inspection_report_record->'snapshot', '{}'::jsonb),
      coalesce(inspection_report_record->'permits_snapshot', '{}'::jsonb),
      coalesce((inspection_report_record->>'created_at')::timestamptz, now()),
      coalesce((inspection_report_record->>'updated_at')::timestamptz, now()),
      coalesce((inspection_report_record->>'is_archived')::boolean, false),
      coalesce((inspection_report_record->>'sync_status')::public.sync_status_enum, 'pending'),
      inspection_report_record->>'device_id'
    )
    on conflict (report_id) do nothing;
  end loop;

  -- Handle updated inspection reports
  for inspection_report_record in
    select value
    from jsonb_array_elements(
      coalesce(changes->'inspection_reports'->'updated', '[]'::jsonb)
    )
  loop
    update public.inspection_reports
    set
      estab_id = inspection_report_record->>'estab_id',
      inspector_uid = inspection_report_record->>'inspector_uid',
      report_type = inspection_report_record->>'report_type',
      report_control_number = inspection_report_record->>'report_control_number',
      inspection_date = (inspection_report_record->>'inspection_date')::date,
      snapshot = coalesce(inspection_report_record->'snapshot', '{}'::jsonb),
      permits_snapshot = coalesce(inspection_report_record->'permits_snapshot', '{}'::jsonb),
      updated_at = coalesce((inspection_report_record->>'updated_at')::timestamptz, now()),
      is_archived = coalesce((inspection_report_record->>'is_archived')::boolean, false),
      sync_status = coalesce((inspection_report_record->>'sync_status')::public.sync_status_enum, 'pending'),
      device_id = inspection_report_record->>'device_id'
    where report_id = inspection_report_record->>'report_id';
  end loop;

  return jsonb_build_object('status', 'ok');
end;
$$;

commit;