-- password_hash is managed by Supabase Auth, not the app
ALTER TABLE user_accounts
ALTER COLUMN password_hash DROP NOT NULL;