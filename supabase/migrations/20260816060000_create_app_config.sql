-- app_config: small key/value table for operator-controlled runtime config.
-- First use: min_supported_app_version, the floor below which the app-side
-- sync gate blocks sync with an "update required" error. Read-only to
-- clients — raising the floor is an operator action (a follow-up migration
-- or direct SQL), never something the app writes.

CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_select_authenticated"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO app_config (key, value)
VALUES ('min_supported_app_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;
