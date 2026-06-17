SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'user_accounts'
  AND grantee = 'authenticated';