begin;
select plan(6);

insert into public.user_accounts (
  uid,
  full_name,
  username,
  password_hash,
  role,
  region,
  area_of_assignment,
  is_active,
  sync_status,
  device_id
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
  estab_id,
  inspector_uid,
  name,
  address,
  province,
  nature_of_business,
  status,
  created_at,
  updated_at,
  sync_status,
  device_id
) values (
  'est-hw-push-001',
  '11111111-1111-1111-1111-111111111111',
  'HazWaste Push Plant',
  'HazWaste Push Address',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now(),
  now(),
  'pending',
  'device-a'
);

insert into public.inspection_reports (
  report_id,
  estab_id,
  inspector_uid,
  report_type,
  report_control_number,
  inspection_date,
  snapshot,
  permits_snapshot,
  created_at,
  updated_at,
  is_archived,
  sync_status,
  device_id
) values (
  'rep-hw-push-001',
  'est-hw-push-001',
  '11111111-1111-1111-1111-111111111111',
  'hazardous_waste',
  'CTRL-HW-PUSH-001',
  current_date,
  '{"name":"HazWaste Push Plant"}'::jsonb,
  '{"hwid_no":"HWID-PUSH-001"}'::jsonb,
  now(),
  now(),
  false,
  'pending',
  'device-a'
);

select is(
  public.push_changes(
    '{
      "compliance_hazwaste": {
        "created": [
          {
            "compliance_id": "hw-push-001",
            "report_id": "rep-hw-push-001",
            "hazwaste_generator_id": "HWG-PUSH-001",
            "other_observations": "HazWaste observation",
            "remarks_recommendations": "HazWaste recommendation"
          }
        ],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created compliance_hazwaste rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_hazwaste
    where compliance_id = 'hw-push-001'
  ),
  1,
  'push_changes inserts one compliance_hazwaste row'
);

select is(
  public.push_changes(
    '{
      "compliance_hazwaste": {
        "created": [],
        "updated": [
          {
            "compliance_id": "hw-push-001",
            "report_id": "rep-hw-push-001",
            "hazwaste_generator_id": "HWG-PUSH-002",
            "other_observations": "Updated hazwaste observation",
            "remarks_recommendations": "Updated hazwaste recommendation"
          }
        ],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated compliance_hazwaste rows'
);

select is(
  (
    select remarks_recommendations
    from public.compliance_hazwaste
    where compliance_id = 'hw-push-001'
  ),
  'Updated hazwaste recommendation',
  'push_changes updates an existing compliance_hazwaste row'
);

select is(
  public.push_changes(
    '{
      "compliance_hazwaste": {
        "created": [],
        "updated": [],
        "deleted": ["hw-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted compliance_hazwaste rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_hazwaste
    where compliance_id = 'hw-push-001'
  ),
  0,
  'push_changes deletes an existing compliance_hazwaste row'
);

select * from finish();
rollback;