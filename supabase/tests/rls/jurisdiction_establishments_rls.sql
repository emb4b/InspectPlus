begin;
select plan(4);

-- Three inspectors: A and C share a jurisdiction (Occidental Mindoro), B is
-- in a different one (Oriental Mindoro). A owns the establishment under
-- test — C should get read-only jurisdiction access to it, B should not
-- see it at all.
insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a_jur_est', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_jur_est@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector', 'B', 'inspector_b_jur_est', 'hashed', 'Inspector',
    'Region 4-B', 'Oriental Mindoro', 'inspector_b_jur_est@test.local',
    true, 'pending', 'device-b'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Inspector', 'C', 'inspector_c_jur_est', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_c_jur_est@test.local',
    true, 'pending', 'device-c'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'jur-est-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000001', 'jur-plant-a@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

-- Inspector C: same jurisdiction as A, not the owner.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select is(
  (select count(*)::int from public.establishments where estab_id = 'jur-est-a'),
  1,
  'inspector in the same jurisdiction can read another inspector''s establishment'
);

update public.establishments set name = 'Hacked' where estab_id = 'jur-est-a';
select is(
  (select name from public.establishments where estab_id = 'jur-est-a'),
  'Plant A',
  'jurisdiction read access does not grant update rights to a non-owner'
);

delete from public.establishments where estab_id = 'jur-est-a';
select is(
  (select count(*)::int from public.establishments where estab_id = 'jur-est-a'),
  1,
  'jurisdiction read access does not grant delete rights to a non-owner'
);

-- Inspector B: different jurisdiction, not the owner.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*)::int from public.establishments where estab_id = 'jur-est-a'),
  0,
  'inspector in a different jurisdiction cannot read the establishment'
);

select * from finish();
rollback;
