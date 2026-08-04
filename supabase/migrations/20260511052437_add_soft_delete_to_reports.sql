begin;

alter table public.inspection_reports
add column if not exists deleted_at timestamptz;

alter table public.survey_reports
add column if not exists deleted_at timestamptz;

commit;