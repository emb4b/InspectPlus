begin;

create extension if not exists pgcrypto;

create type public.sync_status_enum as enum ('pending', 'synced', 'conflict');

-- Table: public.user_accounts --
create table public.user_accounts (
  uid text primary key,
  full_name text not null,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('Inspector', 'Administrator')),
  region text not null,
  area_of_assignment text not null,
  shift_info text,
  created_at timestamptz not null default now(),
  last_login timestamptz,
  is_active boolean not null default true,
  sync_status public.sync_status_enum not null default 'pending',
  device_id text not null
);

-- Table: public.establishments --
create table public.establishments (
  estab_id text primary key,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  name text not null,
  parent_establishment_name text,
  address text not null,
  province text not null,
  geo_lat double precision,
  geo_lng double precision,
  nature_of_business text not null,
  psic_code text,
  product text,
  year_established integer,
  status text not null check (status in ('Active', 'Inactive', 'Closed')),
  managing_head_name text,
  pco_name text,
  pco_accreditation_no text,
  pco_accreditation_effectivity date,
  contact_person_name text,
  contact_person_position text,
  phone_fax text,
  email text,
  product_lines jsonb,
  denr_permits jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_status public.sync_status_enum not null default 'pending',
  device_id text not null
);

-- Table: public.inspection_reports --
create table public.inspection_reports (
  report_id text primary key,
  estab_id text not null references public.establishments(estab_id) on delete restrict,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  report_type text not null check (report_type in ('air_monitoring', 'water_monitoring', 'hazardous_waste', 'eia')),
  report_control_number text,
  inspection_date date not null,
  snapshot jsonb not null,
  permits_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_archived boolean not null default false,
  sync_status public.sync_status_enum not null default 'pending',
  device_id text not null
);

-- Table: public.purpose_of_inspection --
create table public.purpose_of_inspection (
  purpose_id text primary key,
  report_id text not null unique references public.inspection_reports(report_id) on delete cascade,
  verify_new_application boolean,
  verify_renewal boolean,
  verify_modification boolean,
  application_type text,
  determine_compliance boolean,
  investigate_complaint boolean,
  check_voluntary_commitment boolean,
  voluntary_commitment_type text,
  others_specify text
);

-- Table: public.compliance_air --
create table public.compliance_air (
  compliance_id text primary key,
  report_id text not null unique references public.inspection_reports(report_id) on delete cascade,
  emission_sources jsonb,
  checklist_dao_2004_26 jsonb,
  checklist_dao_2000_81 jsonb,
  checklist_emb_mc jsonb,
  pto_conditions jsonb,
  other_observations text,
  remarks_recommendations text,
  documents_reviewed jsonb
);

-- Table: public.compliance_water --
create table public.compliance_water (
  compliance_id text primary key,
  report_id text not null unique references public.inspection_reports(report_id) on delete cascade,
  water_sources jsonb,
  wastewater_sources jsonb,
  abstracted_water_quality jsonb,
  has_wwtp boolean,
  wwtp_type text,
  wwtp_details jsonb,
  wwtp_components jsonb,
  wwtp_condition text,
  wwtp_under_construction boolean,
  sampling_points jsonb,
  previous_inspection_summary jsonb,
  checklist_dao_2005_10 jsonb,
  dp_conditions jsonb,
  other_observations text,
  remarks_recommendations text,
  documents_reviewed jsonb
);

-- Table: public.compliance_hazwaste --
create table public.compliance_hazwaste (
  compliance_id text primary key,
  report_id text not null unique references public.inspection_reports(report_id) on delete cascade,
  hazwaste_generator_id text,
  hazwaste_id_date_issued date,
  waste_types_generated jsonb,
  checklist_registration jsonb,
  checklist_storage jsonb,
  checklist_packaging jsonb,
  checklist_labeling jsonb,
  checklist_transport jsonb,
  checklist_emergency jsonb,
  checklist_personnel_training jsonb,
  checklist_manifest_system jsonb,
  hwid_conditions jsonb,
  other_observations text,
  remarks_recommendations text,
  documents_reviewed jsonb
);

-- Table: public.compliance_eia --
create table public.compliance_eia (
  compliance_id text primary key,
  report_id text not null unique references public.inspection_reports(report_id) on delete cascade,
  checklist_dao_2003_30 jsonb,
  ecc_emp_conditions jsonb,
  other_observations text,
  remarks_recommendations text,
  documents_reviewed jsonb
);

-- Table: public.survey_reports --
create table public.survey_reports (
  survey_id text primary key,
  estab_id text not null references public.establishments(estab_id) on delete restrict,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  report_control_number text,
  inspection_date date not null,
  project_name text not null,
  reference_code text,
  proponent_name text not null,
  contact_person text,
  contact_position text,
  contact_number text,
  email text,
  project_location text not null,
  geo_lat double precision,
  geo_lng double precision,
  area_size double precision,
  purpose text not null check (purpose in ('ECC Application', 'ECC Amendment')),
  document_type text,
  project_status text,
  physical_parameters jsonb,
  biological_parameters jsonb,
  socioeconomic_parameters jsonb,
  other_findings text,
  remarks_recommendations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_archived boolean not null default false,
  sync_status public.sync_status_enum not null default 'pending',
  device_id text not null
);

-- Indexes for performance optimization --
create index idx_establishments_inspector_uid on public.establishments(inspector_uid);
create index idx_inspection_reports_estab_id on public.inspection_reports(estab_id);
create index idx_inspection_reports_inspector_uid on public.inspection_reports(inspector_uid);
create index idx_survey_reports_estab_id on public.survey_reports(estab_id);
create index idx_survey_reports_inspector_uid on public.survey_reports(inspector_uid);
create index idx_inspection_reports_report_type on public.inspection_reports(report_type);
create index idx_establishments_sync_status on public.establishments(sync_status);
create index idx_inspection_reports_sync_status on public.inspection_reports(sync_status);
create index idx_survey_reports_sync_status on public.survey_reports(sync_status);

-- Triggers to automatically update the updated_at timestamp on modifications --
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach the trigger to the relevant tables --
create trigger set_updated_at_establishments
before update on public.establishments
for each row execute function public.set_updated_at();

create trigger set_updated_at_inspection_reports
before update on public.inspection_reports
for each row execute function public.set_updated_at();

create trigger set_updated_at_survey_reports
before update on public.survey_reports
for each row execute function public.set_updated_at();


commit;