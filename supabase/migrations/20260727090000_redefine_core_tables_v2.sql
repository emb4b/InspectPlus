begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Redefine user_accounts, establishments, purpose_of_inspection and
-- inspection_reports around the revised field/JSONB design.
--
-- Key relationship change: purpose_of_inspection is no longer a child of a
-- single inspection_reports row. One site visit produces one purpose row
-- (its own estab_id/inspector_uid/inspection_date) and can be shared by
-- several inspection_reports rows (one per report_type generated during
-- that visit). The FK direction is inverted accordingly:
-- inspection_reports.purpose_id -> purpose_of_inspection.purpose_id.
--
-- No production data exists yet, so this is a clean drop & recreate rather
-- than an in-place ALTER migration.
-- ─────────────────────────────────────────────────────────────────────────

-- Drop children before parents; CASCADE also drops the FK constraints that
-- survey_reports / compliance_air / compliance_water / compliance_hazwaste /
-- compliance_eia hold against these tables (those tables themselves are
-- untouched and are reconnected further down).
drop table if exists public.purpose_of_inspection cascade;
drop table if exists public.inspection_reports cascade;
drop table if exists public.establishments cascade;
drop table if exists public.user_accounts cascade;

-- ── user_accounts ───────────────────────────────────────────────────────
create table public.user_accounts (
  uid text primary key,
  first_name text not null,
  middle_name text,
  last_name text not null,
  username text not null unique,
  role text not null check (role in ('Inspector', 'Administrator')),
  region text not null,
  area_of_assignment text not null,
  email text not null unique,
  phone_number text,
  password_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login timestamptz,
  sync_status public.sync_status_enum not null default 'pending',
  device_id text not null
);

comment on column public.user_accounts.password_hash is
  'Legacy/unused — password auth is handled by Supabase Auth (auth.users), not this column.';

-- ── establishments ──────────────────────────────────────────────────────
create table public.establishments (
  estab_id text primary key,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  name text not null,
  former_name text,
  address_line text not null,
  barangay text not null,
  city text not null,
  province text not null,
  geo_lat double precision,
  geo_lng double precision,
  nature_of_business text not null,
  psic_code text,
  product text,
  year_established integer,
  operating_status text not null check (operating_status in ('Operational', 'Temporarily Close', 'Non-Operational')),
  operating_hours_day integer,
  operating_days_week integer,
  operating_days_year integer,
  product_lines jsonb,
  owner_name text not null,
  managing_head_name text not null,
  pco_name text,
  pco_accreditation_no text,
  pco_effectivity date,
  phone_fax text not null,
  email text not null,
  contact_person_name text not null,
  contact_person_position text not null,
  denr_permits jsonb,
  device_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_status public.sync_status_enum not null default 'pending',
  is_archived boolean not null default false
);

-- ── purpose_of_inspection ───────────────────────────────────────────────
-- Independent per-visit entity; hard-deleted (no deleted_at).
create table public.purpose_of_inspection (
  purpose_id text primary key,
  estab_id text not null references public.establishments(estab_id) on delete restrict,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  inspection_date date not null,
  verify_info boolean not null default false,
  verify_info_list jsonb,
  determine_compliance boolean not null default false,
  investigate_complaints boolean not null default false,
  check_commitments boolean not null default false,
  check_commitments_list jsonb,
  others text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_status public.sync_status_enum not null default 'pending',
  device_id text not null
);

-- ── inspection_reports ──────────────────────────────────────────────────
-- estab_id is a plain (non-unique) FK — one establishment can have many
-- reports. purpose_id is also non-unique — many reports from the same
-- visit can share one purpose_of_inspection row.
create table public.inspection_reports (
  report_id text primary key,
  estab_id text not null references public.establishments(estab_id) on delete restrict,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  purpose_id text not null references public.purpose_of_inspection(purpose_id) on delete restrict,
  report_type text not null check (report_type in ('air_monitoring', 'water_monitoring', 'hazardous_waste', 'eia')),
  report_control_no text,
  inspection_date date not null,
  establishment_snapshot jsonb not null,
  permits_snapshot jsonb not null,
  is_archived boolean not null default false,
  device_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_status public.sync_status_enum not null default 'pending',
  deleted_at timestamptz
);

-- ── Reconnect tables outside this revision's scope ──────────────────────
alter table public.survey_reports
  add constraint survey_reports_estab_id_fkey
  foreign key (estab_id) references public.establishments(estab_id) on delete restrict;

alter table public.survey_reports
  add constraint survey_reports_inspector_uid_fkey
  foreign key (inspector_uid) references public.user_accounts(uid) on delete restrict;

alter table public.compliance_air
  add constraint compliance_air_report_id_fkey
  foreign key (report_id) references public.inspection_reports(report_id) on delete cascade;

alter table public.compliance_water
  add constraint compliance_water_report_id_fkey
  foreign key (report_id) references public.inspection_reports(report_id) on delete cascade;

alter table public.compliance_hazwaste
  add constraint compliance_hazwaste_report_id_fkey
  foreign key (report_id) references public.inspection_reports(report_id) on delete cascade;

alter table public.compliance_eia
  add constraint compliance_eia_report_id_fkey
  foreign key (report_id) references public.inspection_reports(report_id) on delete cascade;

-- ── Indexes ──────────────────────────────────────────────────────────────
create index idx_establishments_inspector_uid on public.establishments(inspector_uid);
create index idx_establishments_sync_status on public.establishments(sync_status);

create index idx_purpose_of_inspection_estab_id on public.purpose_of_inspection(estab_id);
create index idx_purpose_of_inspection_inspector_uid on public.purpose_of_inspection(inspector_uid);
create index idx_purpose_of_inspection_sync_status on public.purpose_of_inspection(sync_status);

create index idx_inspection_reports_estab_id on public.inspection_reports(estab_id);
create index idx_inspection_reports_inspector_uid on public.inspection_reports(inspector_uid);
create index idx_inspection_reports_purpose_id on public.inspection_reports(purpose_id);
create index idx_inspection_reports_report_type on public.inspection_reports(report_type);
create index idx_inspection_reports_sync_status on public.inspection_reports(sync_status);

-- ── updated_at triggers (public.set_updated_at defined in the init migration) ──
create trigger set_updated_at_establishments
before update on public.establishments
for each row execute function public.set_updated_at();

create trigger set_updated_at_purpose_of_inspection
before update on public.purpose_of_inspection
for each row execute function public.set_updated_at();

create trigger set_updated_at_inspection_reports
before update on public.inspection_reports
for each row execute function public.set_updated_at();

-- ── RLS: re-enable and recreate policies dropped along with the tables ──
alter table public.user_accounts enable row level security;
alter table public.establishments enable row level security;
alter table public.purpose_of_inspection enable row level security;
alter table public.inspection_reports enable row level security;

create policy "users can read own account"
on public.user_accounts
for select
to authenticated
using (uid = (select auth.uid())::text);

create policy "users can update own account"
on public.user_accounts
for update
to authenticated
using (uid = (select auth.uid())::text)
with check (uid = (select auth.uid())::text);

create policy "inspectors can read own establishments"
on public.establishments
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own establishments"
on public.establishments
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own establishments"
on public.establishments
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own establishments"
on public.establishments
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

-- purpose_of_inspection now carries its own inspector_uid, so ownership no
-- longer needs to be derived through a join to inspection_reports.
create policy "inspectors can read own purpose records"
on public.purpose_of_inspection
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own purpose records"
on public.purpose_of_inspection
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own purpose records"
on public.purpose_of_inspection
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own purpose records"
on public.purpose_of_inspection
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can read own inspection reports"
on public.inspection_reports
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own inspection reports"
on public.inspection_reports
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own inspection reports"
on public.inspection_reports
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own inspection reports"
on public.inspection_reports
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

-- ── Grants ───────────────────────────────────────────────────────────────
-- pull_changes/push_changes run as SECURITY INVOKER, so the authenticated
-- role needs real table privileges for them to work; RLS above still scopes
-- which rows are visible/writable. Recreating the table dropped these grants
-- along with the old ones, so they're reapplied here — including `select`
-- on establishments, which the pre-existing grants never covered even
-- though pull_changes has always queried it.
revoke all on public.user_accounts from anon;
revoke all on public.establishments from anon;
revoke all on public.purpose_of_inspection from anon;
revoke all on public.inspection_reports from anon;

grant select, update on public.user_accounts to authenticated;
grant select, insert, update, delete on public.establishments to authenticated;
grant select, insert, update, delete on public.purpose_of_inspection to authenticated;
grant select, insert, update, delete on public.inspection_reports to authenticated;

commit;
