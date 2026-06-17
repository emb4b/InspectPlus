UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'clydesarona24@oa.com';

INSERT INTO user_accounts (
  uid, full_name, username, email,
  role, region, area_of_assignment,
  is_active, sync_status, device_id, created_at
)
SELECT
  id,
  'Test Inspector',
  'jsavenido',
  'clydesarona24@oa.com',
  'Inspector',
  'Region 4-B',
  'Palawan',
  true,
  'synced',
  'seed',
  now()
FROM auth.users
WHERE email = 'clydesarona24@oa.com';