begin;
select plan(3);

-- Two inspectors, each with their own municipality assignments. Assignment
-- itself is admin-managed (no insert/update/delete policy for
-- authenticated) — this only tests the self-read-only SELECT policy.
insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a_muni_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_muni_rls@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector', 'B', 'inspector_b_muni_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Oriental Mindoro', 'inspector_b_muni_rls@test.local',
    true, 'pending', 'device-b'
  );

insert into public.inspector_municipalities (inspector_uid, municipality) values
  ('11111111-1111-1111-1111-111111111111', 'Mamburao'),
  ('11111111-1111-1111-1111-111111111111', 'Sablayan'),
  ('22222222-2222-2222-2222-222222222222', 'Calapan City');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*)::int from public.inspector_municipalities where inspector_uid = '11111111-1111-1111-1111-111111111111'),
  2,
  'inspector A can read their own municipality assignments'
);

select is(
  (select count(*)::int from public.inspector_municipalities where inspector_uid = '22222222-2222-2222-2222-222222222222'),
  0,
  'inspector A cannot read inspector B''s municipality assignments'
);

-- No INSERT grant exists for authenticated (assignment is admin-managed),
-- so this must fail outright (SQLSTATE 42501 = insufficient_privilege)
-- rather than silently insert nothing. Only matching the errcode here —
-- Postgres's exact error message text isn't something to pin a test to.
select throws_ok(
  $$insert into public.inspector_municipalities (inspector_uid, municipality)
    values ('11111111-1111-1111-1111-111111111111', 'Self-inserted')$$,
  '42501'
);

select * from finish();
rollback;
