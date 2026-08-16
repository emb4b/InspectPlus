begin;
select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_ir_conflict@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-conflict-ir-001', '11111111-1111-1111-1111-111111111111', 'Conflict Plant',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000008', 'conflict-plant@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'purpose-conflict-ir-001', 'est-conflict-ir-001', '11111111-1111-1111-1111-111111111111',
  current_date, 'device-a'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot, created_at, updated_at,
  is_archived, sync_status, device_id
) values (
  'rep-conflict-001', 'est-conflict-ir-001', '11111111-1111-1111-1111-111111111111', 'purpose-conflict-ir-001',
  'air_monitoring', 'CTRL-NEW', current_date,
  '{}'::jsonb, '[]'::jsonb,
  now(), '2026-05-01T12:00:00Z'::timestamptz,
  false, 'pending', 'device-a'
);

select public.push_changes(
  '{
    "purpose_of_inspection": {
      "created": [],
      "updated": [],
      "deleted": []
    },
    "inspection_reports": {
      "created": [],
      "updated": [
        {
          "report_id": "rep-conflict-001",
          "estab_id": "est-conflict-ir-001",
          "inspector_uid": "11111111-1111-1111-1111-111111111111",
          "purpose_id": "purpose-conflict-ir-001",
          "report_type": "air_monitoring",
          "report_control_no": "CTRL-OLD",
          "inspection_date": "2026-04-29",
          "establishment_snapshot": {},
          "permits_snapshot": [],
          "updated_at": "2026-04-01T12:00:00Z",
          "is_archived": false,
          "sync_status": "pending",
          "device_id": "device-a"
        }
      ],
      "deleted": []
    }
  }'::jsonb
) as push_result \gset

select is(
  (
    select report_control_no
    from public.inspection_reports
    where report_id = 'rep-conflict-001'
  ),
  'CTRL-NEW',
  'stale inspection_report update is ignored'
);

select is(
  :'push_result'::jsonb -> 'conflicts' -> 'inspection_reports',
  '["rep-conflict-001"]'::jsonb,
  'push_changes reports the rejected row_id in conflicts.inspection_reports'
);

select * from finish();
rollback;
