UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'inspector@test.com';

INSERT INTO user_accounts (
  uid, full_name, username, email,
  role, region, area_of_assignment,
  is_active, sync_status, device_id, created_at
)
SELECT
  id,
  'Test Inspector',
  'inspector1',
  'inspector@test.com',
  'Inspector',
  'Region 4-B',
  'Palawan',
  true,
  'synced',
  'seed',
  now()
FROM auth.users
WHERE email = 'inspector@test.com';