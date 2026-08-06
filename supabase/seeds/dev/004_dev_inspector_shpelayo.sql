-- Local dev login account, seeded on every `supabase db reset`.
-- Not a real account — only ever runs against the local Supabase stack.
--
-- Email:    sherylynn_pelayo@emb.gov.ph
-- Password: Test@1234

do $$
declare
  v_uid uuid := '9800d9e6-e60f-499b-9c48-fa946707c658';
begin
  -- GoTrue scans confirmation_token/recovery_token/email_change* as Go
  -- strings, not nullable strings — NULL here breaks login with a 500
  -- ("converting NULL to string is unsupported"), so they must be ''.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid, 'authenticated', 'authenticated',
    'sherylynn_pelayo@emb.gov.ph', crypt('Test@1234', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', '', '', '', '', ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', 'sherylynn_pelayo@emb.gov.ph'),
    'email', v_uid::text, now(), now(), now()
  )
  on conflict (provider_id, provider) do nothing;

  insert into public.user_accounts (
    uid, first_name, middle_name, last_name, username, role, region,
    province, email, is_active, sync_status, device_id
  ) values (
    v_uid::text, 'Sherylynn', 'Halili', 'Pelayo', 'shpelayo', 'Inspector',
    'Region 4B MIMAROPA', 'Marinduque', 'sherylynn_pelayo@emb.gov.ph',
    true, 'synced', 'seed'
  )
  on conflict (uid) do nothing;

  insert into public.inspector_municipalities (inspector_uid, municipality) values
    (v_uid::text, 'Boac'),
    (v_uid::text, 'Gasan'),
    (v_uid::text, 'Mogpog')
  on conflict (inspector_uid, municipality) do nothing;
end $$;
