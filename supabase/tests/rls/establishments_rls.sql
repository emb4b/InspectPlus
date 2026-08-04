begin;

select plan(6);

-- Table-privilege checks -----------------------------------------------------
-- Access should go through controlled RPC functions such as pull_changes and
-- push_changes, but since those run as SECURITY INVOKER, `authenticated`
-- also needs a real SELECT grant on establishments for the RPCs to work at
-- all (RLS below still scopes which rows come back).

select is(
  has_table_privilege('anon', 'public.establishments', 'SELECT'),
  false,
  'anon cannot directly SELECT establishments'
);

select is(
  has_table_privilege('authenticated', 'public.establishments', 'SELECT'),
  true,
  'authenticated can directly SELECT establishments subject to RLS'
);

select ok(
  has_function_privilege('authenticated', 'public.pull_changes(bigint)', 'EXECUTE'),
  'authenticated can execute pull_changes'
);

select ok(
  has_function_privilege('authenticated', 'public.push_changes(jsonb)', 'EXECUTE'),
  'authenticated can execute push_changes'
);

-- Row-level checks ------------------------------------------------------------

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a_est_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_est_rls@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector', 'B', 'inspector_b_est_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Oriental Mindoro', 'inspector_b_est_rls@test.local',
    true, 'pending', 'device-b'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values
  (
    'est-rls-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
    'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
    'Manufacturing', 'Operational', 'Owner A', 'Head A',
    '09170000001', 'plant-a@test.local', 'Contact A', 'Manager',
    now(), now(), 'pending', 'device-a'
  ),
  (
    'est-rls-b', '22222222-2222-2222-2222-222222222222', 'Plant B',
    'Address B', 'Barangay B', 'City B', 'Oriental Mindoro',
    'Processing', 'Operational', 'Owner B', 'Head B',
    '09170000002', 'plant-b@test.local', 'Contact B', 'Manager',
    now(), now(), 'pending', 'device-b'
  );

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (
    select count(*)::int
    from public.establishments
    where estab_id = 'est-rls-a'
  ),
  1,
  'user A can read their own establishment'
);

select is(
  (
    select count(*)::int
    from public.establishments
    where estab_id = 'est-rls-b'
  ),
  0,
  'user A cannot read user B establishment'
);

select * from finish();

rollback;
