-- Report urgency windows, in days since the inspection date. These were
-- compiled into the app until now; moving them here lets EMB retune a
-- filing-deadline policy without rebuilding and redistributing the app.
--
-- Seeded with the values the app already shipped with, so applying this
-- changes nothing visible. No schema or RLS change is needed: app_config
-- already carries the app_config_select_authenticated policy and the
-- table-level grant from 20260901010000.
--
-- IMPORTANT: a client older than 1.1.0 does not read these keys and keeps
-- computing 14/30 from its own bundle. When either value is changed, raise
-- min_supported_app_version to 1.1.0 in the same operation so older builds
-- are told to update instead of silently disagreeing with the office. See
-- docs/superpowers/specs/2026-09-09-runtime-urgency-config-design.md.

INSERT INTO app_config (key, value)
VALUES ('due_soon_days', '14'), ('overdue_days', '30')
ON CONFLICT (key) DO NOTHING;
