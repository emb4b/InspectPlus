begin;
select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a_poi_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_poi_rls@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector', 'B', 'inspector_b_poi_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Oriental Mindoro', 'inspector_b_poi_rls@test.local',
    true, 'pending', 'device-b'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values
  (
    'est-poi-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
    'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
    'Manufacturing', 'Operational', 'Owner A', 'Head A',
    '09170000001', 'plant-poi-a@test.local', 'Contact A', 'Manager',
    now(), now(), 'pending', 'device-a'
  ),
  (
    'est-poi-b', '22222222-2222-2222-2222-222222222222', 'Plant B',
    'Address B', 'Barangay B', 'City B', 'Oriental Mindoro',
    'Processing', 'Operational', 'Owner B', 'Head B',
    '09170000002', 'plant-poi-b@test.local', 'Contact B', 'Manager',
    now(), now(), 'pending', 'device-b'
  );

-- purpose_of_inspection now carries its own inspector_uid directly, so
-- ownership no longer needs to be derived through a join to a report.
insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, determine_compliance, device_id
) values
  ('purpose-rls-a', 'est-poi-a', '11111111-1111-1111-1111-111111111111', current_date, true, 'device-a'),
  ('purpose-rls-b', 'est-poi-b', '22222222-2222-2222-2222-222222222222', current_date, true, 'device-b');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (
    select count(*)::int
    from public.purpose_of_inspection
    where purpose_id = 'purpose-rls-a'
  ),
  1,
  'user A can read their own purpose_of_inspection row'
);

select is(
  (
    select count(*)::int
    from public.purpose_of_inspection
    where purpose_id = 'purpose-rls-b'
  ),
  0,
  'user A cannot read user B purpose_of_inspection row'
);

select * from finish();
rollback;
