begin;
select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_estab_conflict@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-conflict-001', '11111111-1111-1111-1111-111111111111', 'Newest Name',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000099', 'estab-conflict@test.local', 'Contact A', 'Manager',
  now(), '2026-05-01T12:00:00Z'::timestamptz, 'pending', 'device-a'
);

-- Simulates a second device pushing an edit made before the row above was
-- ever pulled — its updated_at (2026-04-01) is older than what's already
-- stored (2026-05-01), so the last-write-wins guard must reject it and
-- push_changes must report it in conflicts.establishments, not just
-- silently drop it. See markLocalChangesAsSynced/upsertMany for why the
-- client depends on this to avoid losing the losing device's edit outright.
select public.push_changes(
  '{
    "establishments": {
      "created": [],
      "updated": [
        {
          "estab_id": "est-conflict-001",
          "inspector_uid": "11111111-1111-1111-1111-111111111111",
          "name": "Stale Name From Other Device",
          "address_line": "Address", "barangay": "Barangay A", "city": "City A",
          "province": "Occidental Mindoro",
          "nature_of_business": "Manufacturing", "operating_status": "Operational",
          "owner_name": "Owner A", "managing_head_name": "Head A",
          "phone_fax": "09170000099", "email": "estab-conflict@test.local",
          "contact_person_name": "Contact A", "contact_person_position": "Manager",
          "updated_at": "2026-04-01T12:00:00Z",
          "sync_status": "pending",
          "device_id": "device-b"
        }
      ],
      "deleted": []
    }
  }'::jsonb
) as push_result \gset

select is(
  (
    select name
    from public.establishments
    where estab_id = 'est-conflict-001'
  ),
  'Newest Name',
  'stale establishment update is ignored'
);

select is(
  :'push_result'::jsonb -> 'conflicts' -> 'establishments',
  '["est-conflict-001"]'::jsonb,
  'push_changes reports the rejected row_id in conflicts.establishments'
);

select * from finish();
rollback;
