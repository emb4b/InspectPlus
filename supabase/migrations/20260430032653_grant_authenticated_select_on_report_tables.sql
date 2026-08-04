begin;

grant select on public.inspection_reports to authenticated;
grant select on public.purpose_of_inspection to authenticated;
grant select on public.survey_reports to authenticated;

commit;