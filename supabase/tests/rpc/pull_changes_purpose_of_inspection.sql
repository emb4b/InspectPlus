begin;

select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '33333333-3333-3333-3333-333333333333',
  'Inspector', 'C', 'inspector_c_purpose', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_c_purpose@test.local',
  true, 'pending', 'device-c'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-purpose-a', '33333333-3333-3333-3333-333333333333', 'Plant Purpose A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000003', 'plant-purpose-a@test.local', 'Contact A', 'Manager',
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-c'
);

-- purpose_of_inspection is now independent of any report — a single visit's
-- purpose row can exist (and sync) before any inspection_reports row does.
insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, determine_compliance,
  created_at, updated_at, sync_status, device_id
) values (
  'purpose-a', 'est-purpose-a', '33333333-3333-3333-3333-333333333333',
  current_date, true,
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-c'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'purpose_of_inspection'->'created'),
  1,
  'pull_changes returns one purpose_of_inspection row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'purpose_of_inspection'->'created'
  ),
  0,
  'pull_changes returns no purpose_of_inspection rows for current timestamp'
);

select * from finish();

rollback;
