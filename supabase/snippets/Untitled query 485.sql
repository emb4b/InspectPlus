SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_accounts';