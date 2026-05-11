begin;
select plan(1);

insert into public.user_accounts (
  uid, full_name, username, password_hash, role, region, area_of_assignment, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector A',
  'inspector_a',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address, province, nature_of_business, status,
  created_at, updated_at, sync_status, device_id
) values (
  'est-conflict-ir-001',
  '11111111-1111-1111-1111-111111111111',
  'Conflict Plant',
  'Address',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now(),
  now(),
  'pending',
  'device-a'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, report_type, report_control_number,
  inspection_date, snapshot, permits_snapshot, created_at, updated_at,
  is_archived, sync_status, device_id
) values (
  'rep-conflict-001',
  'est-conflict-ir-001',
  '11111111-1111-1111-1111-111111111111',
  'air_monitoring',
  'CTRL-NEW',
  current_date,
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  '2026-05-01T12:00:00Z'::timestamptz,
  false,
  'pending',
  'device-a'
);

select public.push_changes(
  '{
    "inspection_reports": {
      "created": [],
      "updated": [
        {
          "report_id": "rep-conflict-001",
          "estab_id": "est-conflict-ir-001",
          "inspector_uid": "11111111-1111-1111-1111-111111111111",
          "report_type": "air_monitoring",
          "report_control_number": "CTRL-OLD",
          "inspection_date": "2026-04-29",
          "snapshot": {},
          "permits_snapshot": {},
          "updated_at": "2026-04-01T12:00:00Z",
          "is_archived": false,
          "sync_status": "pending",
          "device_id": "device-a"
        }
      ],
      "deleted": []
    }
  }'::jsonb
);

select is(
  (
    select report_control_number
    from public.inspection_reports
    where report_id = 'rep-conflict-001'
  ),
  'CTRL-NEW',
  'stale inspection_report update is ignored'
);

select * from finish();
rollback;