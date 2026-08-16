begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Read access to establishments/reports/compliance has been jurisdiction
-- (province) scoped since 20260805090000, but write access (INSERT/UPDATE/
-- DELETE) stayed owner-only (inspector_uid = auth.uid()), with no
-- jurisdiction equivalent. That mismatch surfaced as a hard failure once
-- push_changes's "updated" loops became upserts (20260816050000): an
-- inspector editing a colleague's establishment within their own province
-- — something the app UI already allows, since read access is
-- province-wide — now hits "new row violates row-level security policy"
-- on push instead of the silent zero-row UPDATE it used to be.
--
-- Confirmed with the app owner: write access (including delete) should be
-- scoped by the inspector's actual jurisdiction — their assigned province
-- AND one of their assigned municipalities (inspector_municipalities),
-- which an inspector can have several of within their one province. This
-- promotes inspector_municipalities from a UI-only filter (20260806030000
-- explicitly called it "not an access-control boundary") to a real write
-- boundary — a deliberate reversal of that earlier decision. Read
-- visibility stays province-wide only, unchanged.
--
-- Purely additive: a new permissive INSERT/UPDATE/DELETE policy per table,
-- OR'd alongside the existing owner-only and Developer-bypass policies
-- (same pattern as 20260808100000), so nothing already granted is
-- narrowed. Applied consistently across every table that already has
-- jurisdiction-scoped read access — not just establishments, which is the
-- one that actually broke — to close the same latent gap everywhere at
-- once rather than one table at a time as each is hit.
-- ─────────────────────────────────────────────────────────────────────────

-- ── ESTABLISHMENTS ──────────────────────────────────────────────────────

create policy "inspectors can insert jurisdiction establishments"
on public.establishments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_accounts ua
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ua.uid = (select auth.uid())::text
      and ua.province = establishments.province
      and im.municipality = establishments.city
  )
);

create policy "inspectors can update jurisdiction establishments"
on public.establishments
for update
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ua.uid = (select auth.uid())::text
      and ua.province = establishments.province
      and im.municipality = establishments.city
  )
)
with check (
  exists (
    select 1
    from public.user_accounts ua
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ua.uid = (select auth.uid())::text
      and ua.province = establishments.province
      and im.municipality = establishments.city
  )
);

-- ── INSPECTION_REPORTS ──────────────────────────────────────────────────

create policy "inspectors can insert jurisdiction inspection reports"
on public.inspection_reports
for insert
to authenticated
with check (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = inspection_reports.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can update jurisdiction inspection reports"
on public.inspection_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = inspection_reports.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
)
with check (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = inspection_reports.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

-- ── PURPOSE_OF_INSPECTION ───────────────────────────────────────────────

create policy "inspectors can insert jurisdiction purpose records"
on public.purpose_of_inspection
for insert
to authenticated
with check (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = purpose_of_inspection.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can update jurisdiction purpose records"
on public.purpose_of_inspection
for update
to authenticated
using (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = purpose_of_inspection.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
)
with check (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = purpose_of_inspection.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

-- ── COMPLIANCE_AIR / WATER / HAZWASTE / EIA ─────────────────────────────
-- Each joins through inspection_reports -> establishments, matching the
-- join shape the existing jurisdiction SELECT policies on these tables
-- already use.

create policy "inspectors can insert jurisdiction air compliance"
on public.compliance_air
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_air.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can update jurisdiction air compliance"
on public.compliance_air
for update
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_air.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_air.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can insert jurisdiction water compliance"
on public.compliance_water
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_water.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can update jurisdiction water compliance"
on public.compliance_water
for update
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_water.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_water.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can insert jurisdiction hazwaste compliance"
on public.compliance_hazwaste
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_hazwaste.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can update jurisdiction hazwaste compliance"
on public.compliance_hazwaste
for update
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_hazwaste.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_hazwaste.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can insert jurisdiction eia compliance"
on public.compliance_eia
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_eia.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can update jurisdiction eia compliance"
on public.compliance_eia
for update
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_eia.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
)
with check (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_eia.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

-- ── DELETE: same jurisdiction scoping, across all six tables ───────────
-- DELETE policies only need USING (no proposed new row to WITH CHECK).

create policy "inspectors can delete jurisdiction establishments"
on public.establishments
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ua.uid = (select auth.uid())::text
      and ua.province = establishments.province
      and im.municipality = establishments.city
  )
);

create policy "inspectors can delete jurisdiction inspection reports"
on public.inspection_reports
for delete
to authenticated
using (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = inspection_reports.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can delete jurisdiction purpose records"
on public.purpose_of_inspection
for delete
to authenticated
using (
  exists (
    select 1
    from public.establishments e
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where e.estab_id = purpose_of_inspection.estab_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can delete jurisdiction air compliance"
on public.compliance_air
for delete
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_air.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can delete jurisdiction water compliance"
on public.compliance_water
for delete
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_water.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can delete jurisdiction hazwaste compliance"
on public.compliance_hazwaste
for delete
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_hazwaste.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

create policy "inspectors can delete jurisdiction eia compliance"
on public.compliance_eia
for delete
to authenticated
using (
  exists (
    select 1
    from public.inspection_reports ir
    join public.establishments e on e.estab_id = ir.estab_id
    join public.user_accounts ua on ua.uid = (select auth.uid())::text
    join public.inspector_municipalities im on im.inspector_uid = ua.uid
    where ir.report_id = compliance_eia.report_id
      and ua.province = e.province
      and im.municipality = e.city
  )
);

commit;
