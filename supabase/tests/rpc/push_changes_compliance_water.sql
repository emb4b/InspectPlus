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
  'est-water-push-001',
  '11111111-1111-1111-1111-111111111111',
  'Water Push Plant',
  'Water Push Address',
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
  'rep-water-push-001',
  'est-water-push-001',
  '11111111-1111-1111-1111-111111111111',
  'water_monitoring',
  'CTRL-WATER-PUSH-001',
  current_date,
  '{"name":"Water Push Plant"}'::jsonb,
  '{"dp_no":"DP-PUSH-001"}'::jsonb,
  now(),
  now(),
  false,
  'pending',
  'device-a'
);

select is(
  public.push_changes(
    '{
      "compliance_water": {
        "created": [
          {
            "compliance_id": "water-push-001",
            "report_id": "rep-water-push-001",
            "has_wwtp": true,
            "wwtp_type": "Physical",
            "other_observations": "Water observation",
            "remarks_recommendations": "Water recommendation"
          }
        ],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created compliance_water rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_water
    where compliance_id = 'water-push-001'
  ),
  1,
  'push_changes inserts one compliance_water row'
);

select is(
  public.push_changes(
    '{
      "compliance_water": {
        "created": [],
        "updated": [
          {
            "compliance_id": "water-push-001",
            "report_id": "rep-water-push-001",
            "has_wwtp": false,
            "wwtp_type": "Biological",
            "other_observations": "Updated water observation",
            "remarks_recommendations": "Updated water recommendation"
          }
        ],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated compliance_water rows'
);

select is(
  (
    select remarks_recommendations
    from public.compliance_water
    where compliance_id = 'water-push-001'
  ),
  'Updated water recommendation',
  'push_changes updates an existing compliance_water row'
);

select is(
  public.push_changes(
    '{
      "compliance_water": {
        "created": [],
        "updated": [],
        "deleted": ["water-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted compliance_water rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_water
    where compliance_id = 'water-push-001'
  ),
  0,
  'push_changes deletes an existing compliance_water row'
);

select * from finish();
rollback;