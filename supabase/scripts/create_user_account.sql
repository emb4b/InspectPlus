-- ── Create a user account (login + profile + jurisdiction) ──────────────
--
-- Paste this into Studio → SQL Editor and save it as a snippet. To add a
-- user, edit ONLY the values in the "Fill in" block, then run the query.
-- Nothing below that block needs to change.
--
-- Creates, in one transaction:
--   1. auth.users + auth.identities   (the login — email/password)
--   2. public.user_accounts           (the profile the app syncs)
--   3. public.inspector_municipalities (one row per municipality)
-- Fails loudly (and creates nothing) if the email or username is taken,
-- or if an Inspector is given no municipalities.
--
-- The final SELECT prints the created account so you can confirm it.
-- Send the email + password to the person out-of-band.

do $$
declare
  -- ── Fill in ──────────────────────────────────────────────────────────
  v_email          text   := 'jsavenido.emb4b@outlook.com';
  v_password       text   := 'Test@1234';
  v_first_name     text   := 'Jervin Clyde';
  v_middle_name    text   := 'Sarona';            -- null if none
  v_last_name      text   := 'Avenido';
  v_username       text   := 'jsavenido';
  v_role           text   := 'Inspector';         -- Inspector | Administrator | Developer
  v_region         text   := 'Region 4B MIMAROPA';
  v_province       text   := 'Oriental Mindoro';
  v_municipalities text[] := array[               -- Inspectors only; spell exactly as on establishments
    'Calapan City',
    'Puerto Galera',
    'Pinamalayan'
  ]::text[];
  -- ─────────────────────────────────────────────────────────────────────

  v_uid uuid := gen_random_uuid();
begin
  if v_role not in ('Inspector', 'Administrator', 'Developer') then
    raise exception 'role must be Inspector, Administrator or Developer (got %)', v_role;
  end if;
  if v_role = 'Inspector' and coalesce(array_length(v_municipalities, 1), 0) = 0 then
    raise exception 'an Inspector needs at least one municipality';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(v_email)) then
    raise exception 'a login with email % already exists', v_email;
  end if;
  if exists (select 1 from public.user_accounts where lower(email) = lower(v_email)) then
    raise exception 'a user_accounts row with email % already exists', v_email;
  end if;
  if exists (select 1 from public.user_accounts where username = v_username) then
    raise exception 'username % is already taken', v_username;
  end if;

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
    v_email, crypt(v_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email),
    'email', v_uid::text, now(), now(), now()
  );

  insert into public.user_accounts (
    uid, first_name, middle_name, last_name, username, role, region,
    province, email, is_active, sync_status, device_id
  ) values (
    v_uid::text, v_first_name, nullif(v_middle_name, ''), v_last_name, v_username, v_role,
    v_region, v_province, v_email, true, 'synced', 'admin'
  );

  if v_role = 'Inspector' then
    insert into public.inspector_municipalities (inspector_uid, municipality)
    select v_uid::text, m from unnest(v_municipalities) as m;
  end if;

  raise notice 'created % (%) with uid %', v_username, v_role, v_uid;
end $$;

-- Confirmation: the account just created (most recent user_accounts row).
select
  a.uid, a.email, a.username, a.role, a.province,
  coalesce(array_agg(m.municipality order by m.municipality)
           filter (where m.municipality is not null), '{}') as municipalities,
  (u.id is not null) as has_login
from public.user_accounts a
left join auth.users u on u.id::text = a.uid
left join public.inspector_municipalities m on m.inspector_uid = a.uid
group by a.uid, a.email, a.username, a.role, a.province, a.created_at, u.id
order by a.created_at desc
limit 1;
