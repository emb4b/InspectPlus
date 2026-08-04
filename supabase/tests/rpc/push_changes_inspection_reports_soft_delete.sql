begin;
select plan(3);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_ir_soft_push@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-soft-ir-001', '11111111-1111-1111-1111-111111111111', 'Soft Delete Plant',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000009', 'soft-delete-plant@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'purpose-soft-ir-001', 'est-soft-ir-001', '11111111-1111-1111-1111-111111111111',
  current_date, 'device-a'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot, created_at, updated_at,
  is_archived, sync_status, device_id
) values (
  'rep-soft-001', 'est-soft-ir-001', '11111111-1111-1111-1111-111111111111', 'purpose-soft-ir-001',
  'air_monitoring', 'CTRL-SOFT-001', current_date,
  '{"name":"Soft Delete Plant"}'::jsonb, '[]'::jsonb,
  now(), now(), false, 'pending', 'device-a'
);

select is(
  public.push_changes(
    '{
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": ["rep-soft-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'soft delete returns ok for inspection_reports'
);

select ok(
  (
    select deleted_at is not null
    from public.inspection_reports
    where report_id = 'rep-soft-001'
  ),
  'inspection_report deleted_at is set'
);

select is(
  (
    select count(*)::int
    from public.inspection_reports
    where report_id = 'rep-soft-001'
  ),
  1,
  'inspection_report row is retained after soft delete'
);

select * from finish();
rollback;
