begin;
select plan(2);

insert into public.user_accounts (
  uid, full_name, username, password_hash, role, region, area_of_assignment, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector A',
    'inspector_a',
    'hashed',
    'Inspector',
    'Region 4-B',
    'Occidental Mindoro',
    true,
    'pending',
    'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector B',
    'inspector_b',
    'hashed',
    'Inspector',
    'Region 4-B',
    'Oriental Mindoro',
    true,
    'pending',
    'device-b'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address, province, nature_of_business, status, created_at, updated_at, sync_status, device_id
) values
  (
    'est-a',
    '11111111-1111-1111-1111-111111111111',
    'Plant A',
    'Address A',
    'Occidental Mindoro',
    'Manufacturing',
    'Active',
    now(),
    now(),
    'pending',
    'device-a'
  ),
  (
    'est-b',
    '22222222-2222-2222-2222-222222222222',
    'Plant B',
    'Address B',
    'Oriental Mindoro',
    'Processing',
    'Active',
    now(),
    now(),
    'pending',
    'device-b'
  );

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (
    select count(*)::int
    from public.establishments
    where estab_id = 'est-a'
  ),
  1,
  'user A can read their own establishment'
);

select is(
  (
    select count(*)::int
    from public.establishments
    where estab_id = 'est-b'
  ),
  0,
  'user A cannot read user B establishment'
);

select * from finish();
rollback;