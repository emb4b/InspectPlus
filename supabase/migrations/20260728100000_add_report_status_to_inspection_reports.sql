begin;

-- Distinguishes a report the inspector is still filling out from one they've
-- submitted, so the "Save Draft" / "Submit Report" actions in the create-
-- report form actually mean something different at the data layer.
alter table public.inspection_reports
  add column report_status text not null default 'draft'
  check (report_status in ('draft', 'submitted'));

create index idx_inspection_reports_report_status on public.inspection_reports(report_status);

commit;
