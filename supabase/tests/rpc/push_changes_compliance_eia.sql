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
  'est-eia-push-001',
  '11111111-1111-1111-1111-111111111111',
  'EIA Push Plant',
  'EIA Push Address',
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
  'rep-eia-push-001',
  'est-eia-push-001',
  '11111111-1111-1111-1111-111111111111',
  'eia',
  'CTRL-EIA-PUSH-001',
  current_date,
  '{"name":"EIA Push Plant"}'::jsonb,
  '{"ecc_no":"ECC-EIA-PUSH-001"}'::jsonb,
  now(),
  now(),
  false,
  'pending',
  'device-a'
);

select is(
  public.push_changes(
    '{
      "compliance_eia": {
        "created": [
          {
            "compliance_id": "eia-push-001",
            "report_id": "rep-eia-push-001",
            "other_observations": "EIA observation",
            "remarks_recommendations": "EIA recommendation"
          }
        ],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created compliance_eia rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_eia
    where compliance_id = 'eia-push-001'
  ),
  1,
  'push_changes inserts one compliance_eia row'
);

select is(
  public.push_changes(
    '{
      "compliance_eia": {
        "created": [],
        "updated": [
          {
            "compliance_id": "eia-push-001",
            "report_id": "rep-eia-push-001",
            "other_observations": "Updated eia observation",
            "remarks_recommendations": "Updated eia recommendation"
          }
        ],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated compliance_eia rows'
);

select is(
  (
    select remarks_recommendations
    from public.compliance_eia
    where compliance_id = 'eia-push-001'
  ),
  'Updated eia recommendation',
  'push_changes updates an existing compliance_eia row'
);

select is(
  public.push_changes(
    '{
      "compliance_eia": {
        "created": [],
        "updated": [],
        "deleted": ["eia-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted compliance_eia rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_eia
    where compliance_id = 'eia-push-001'
  ),
  0,
  'push_changes deletes an existing compliance_eia row'
);

select * from finish();
rollback;