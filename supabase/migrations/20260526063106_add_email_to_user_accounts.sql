-- Add email field to user_accounts
ALTER TABLE user_accounts
ADD COLUMN IF NOT EXISTS email text;

-- Public function: resolve username OR email to auth email
-- Accessible by anonymous users (needed before login)
CREATE OR REPLACE FUNCTION get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email
  FROM user_accounts
  WHERE username = p_username
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_username(text) TO anon;