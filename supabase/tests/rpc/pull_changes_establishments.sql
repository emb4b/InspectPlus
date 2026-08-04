begin;

select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a_est', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_est@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000001', 'plant-a-pull@test.local', 'Contact A', 'Manager',
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-a'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'establishments'->'created'),
  1,
  'pull_changes returns one establishment row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'establishments'->'created'
  ),
  0,
  'pull_changes returns no establishment rows for current timestamp'
);

select * from finish();

rollback;
