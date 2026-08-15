begin;

-- ─────────────────────────────────────────────────────────────────────────
-- attachments: photos an inspector captures or picks and attaches to a
-- report. References exactly one of inspection_report_id / survey_report_id
-- (two typed nullable FKs, not a parent_type/parent_id pair — every other
-- FK in this schema is a real, single-target Postgres FK, and this keeps
-- attachments' RLS policies plain EXISTS joins like everywhere else). Only
-- inspection_reports is wired into the UI so far; survey_report_id exists
-- so survey report support is a pure UI follow-up later.
--
-- storage_path stays null until the binary file finishes uploading to the
-- `attachments` Storage bucket (see create_attachments_storage_bucket.sql,
-- a later migration) — the row is only pushed through push_changes once
-- that upload succeeds (enforced client-side, see watermelonAdapter.ts's
-- getPendingRecords), so in practice storage_path is never actually null
-- for a row that reaches this table via sync.
--
-- Table grants + RLS are added in THIS SAME migration, deliberately — the
-- compliance_* tables needed two emergency follow-up migrations
-- (20260806010000, 20260806020000) after grants and RLS were split across
-- separate migrations written at different times. Don't repeat that here.
--
-- NOTE for future authors: don't `drop table ... cascade` on
-- inspection_reports or survey_reports without checking this table's RLS
-- policies first — a prior cascade drop of those tables silently dropped
-- policies on compliance_* that referenced them as a dependency (see the
-- postmortem comment in 20260806020000_restore_compliance_owner_policies.sql).
-- ─────────────────────────────────────────────────────────────────────────

create table public.attachments (
  attachment_id text primary key,
  inspection_report_id text references public.inspection_reports(report_id) on delete cascade,
  survey_report_id text references public.survey_reports(survey_id) on delete cascade,
  inspector_uid text not null references public.user_accounts(uid) on delete restrict,
  storage_path text,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  geo_lat double precision,
  geo_lng double precision,
  captured_at timestamptz not null,
  device_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  sync_status public.sync_status_enum not null default 'pending',
  constraint attachments_exactly_one_parent check (num_nonnulls(inspection_report_id, survey_report_id) = 1)
);

-- ── Indexes ──────────────────────────────────────────────────────────────
create index idx_attachments_inspection_report_id on public.attachments(inspection_report_id);
create index idx_attachments_survey_report_id on public.attachments(survey_report_id);
create index idx_attachments_inspector_uid on public.attachments(inspector_uid);
create index idx_attachments_sync_status on public.attachments(sync_status);

-- ── updated_at trigger ───────────────────────────────────────────────────
create trigger set_updated_at_attachments
before update on public.attachments
for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.attachments enable row level security;

create policy "inspectors can read own attachments"
on public.attachments
for select
to authenticated
using (inspector_uid = (select auth.uid())::text);

create policy "inspectors can insert own attachments"
on public.attachments
for insert
to authenticated
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can update own attachments"
on public.attachments
for update
to authenticated
using (inspector_uid = (select auth.uid())::text)
with check (inspector_uid = (select auth.uid())::text);

create policy "inspectors can delete own attachments"
on public.attachments
for delete
to authenticated
using (inspector_uid = (select auth.uid())::text);

-- ── Grants ───────────────────────────────────────────────────────────────
revoke all on public.attachments from anon;
grant select, insert, update, delete on public.attachments to authenticated;

commit;
