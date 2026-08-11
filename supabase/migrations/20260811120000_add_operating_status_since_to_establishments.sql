begin;

-- Add operating_status_since to establishments: the date (kept as free text
-- — mm-dd-yyyy, mm-yyyy, or just yyyy, see src/utils/flexibleDate.ts on the
-- client) an establishment became closed/non-operational. Only meaningful
-- when operating_status isn't 'Operational'.
alter table public.establishments
  add column operating_status_since text;

-- Re-declare push_changes with operating_status_since added to the
-- establishments insert/update column lists. pull_changes needs no change —
-- it uses to_jsonb(e), which already includes the new column automatically.

create or replace function public.push_changes(changes jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  establishment_record jsonb;
  purpose_record jsonb;
  inspection_report_record jsonb;
  survey_record jsonb;
  compliance_air_record jsonb;
  compliance_water_record jsonb;
  compliance_hazwaste_record jsonb;
  compliance_eia_record jsonb;
begin
  -- Handle created establishments
  for establishment_record in
    select value
    from jsonb_array_elements(coalesce(changes->'establishments'->'created', '[]'::jsonb))
  loop
    insert into public.establishments (
      estab_id, inspector_uid, name, former_name, address_line, barangay, city, province,
      geo_lat, geo_lng, nature_of_business, psic_code, product, year_established,
      operating_status, operating_hours_day, operating_days_week, operating_days_year,
      operating_status_since,
      product_lines, owner_name, managing_head_name, pco_name, pco_accreditation_no,
      pco_effectivity, phone_fax, email, contact_person_name, contact_person_position,
      denr_permits, device_id, created_at, updated_at, sync_status, is_archived
    )
    values (
      establishment_record->>'estab_id',
      establishment_record->>'inspector_uid',
      establishment_record->>'name',
      establishment_record->>'former_name',
      establishment_record->>'address_line',
      establishment_record->>'barangay',
      establishment_record->>'city',
      establishment_record->>'province',
      nullif(establishment_record->>'geo_lat', '')::double precision,
      nullif(establishment_record->>'geo_lng', '')::double precision,
      establishment_record->>'nature_of_business',
      establishment_record->>'psic_code',
      establishment_record->>'product',
      nullif(establishment_record->>'year_established', '')::integer,
      establishment_record->>'operating_status',
      nullif(establishment_record->>'operating_hours_day', '')::integer,
      nullif(establishment_record->>'operating_days_week', '')::integer,
      nullif(establishment_record->>'operating_days_year', '')::integer,
      establishment_record->>'operating_status_since',
      establishment_record->'product_lines',
      establishment_record->>'owner_name',
      establishment_record->>'managing_head_name',
      establishment_record->>'pco_name',
      establishment_record->>'pco_accreditation_no',
      nullif(establishment_record->>'pco_effectivity', '')::date,
      establishment_record->>'phone_fax',
      establishment_record->>'email',
      establishment_record->>'contact_person_name',
      establishment_record->>'contact_person_position',
      establishment_record->'denr_permits',
      establishment_record->>'device_id',
      coalesce((establishment_record->>'created_at')::timestamptz, now()),
      coalesce((establishment_record->>'updated_at')::timestamptz, now()),
      coalesce((establishment_record->>'sync_status')::public.sync_status_enum, 'pending'),
      coalesce((establishment_record->>'is_archived')::boolean, false)
    )
    on conflict (estab_id) do nothing;
  end loop;

  -- Handle updated establishments
  for establishment_record in
    select value
    from jsonb_array_elements(coalesce(changes->'establishments'->'updated', '[]'::jsonb))
  loop
    update public.establishments
    set
      inspector_uid = establishment_record->>'inspector_uid',
      name = establishment_record->>'name',
      former_name = establishment_record->>'former_name',
      address_line = establishment_record->>'address_line',
      barangay = establishment_record->>'barangay',
      city = establishment_record->>'city',
      province = establishment_record->>'province',
      geo_lat = nullif(establishment_record->>'geo_lat', '')::double precision,
      geo_lng = nullif(establishment_record->>'geo_lng', '')::double precision,
      nature_of_business = establishment_record->>'nature_of_business',
      psic_code = establishment_record->>'psic_code',
      product = establishment_record->>'product',
      year_established = nullif(establishment_record->>'year_established', '')::integer,
      operating_status = establishment_record->>'operating_status',
      operating_hours_day = nullif(establishment_record->>'operating_hours_day', '')::integer,
      operating_days_week = nullif(establishment_record->>'operating_days_week', '')::integer,
      operating_days_year = nullif(establishment_record->>'operating_days_year', '')::integer,
      operating_status_since = establishment_record->>'operating_status_since',
      product_lines = establishment_record->'product_lines',
      owner_name = establishment_record->>'owner_name',
      managing_head_name = establishment_record->>'managing_head_name',
      pco_name = establishment_record->>'pco_name',
      pco_accreditation_no = establishment_record->>'pco_accreditation_no',
      pco_effectivity = nullif(establishment_record->>'pco_effectivity', '')::date,
      phone_fax = establishment_record->>'phone_fax',
      email = establishment_record->>'email',
      contact_person_name = establishment_record->>'contact_person_name',
      contact_person_position = establishment_record->>'contact_person_position',
      denr_permits = establishment_record->'denr_permits',
      device_id = establishment_record->>'device_id',
      updated_at = coalesce((establishment_record->>'updated_at')::timestamptz, now()),
      sync_status = coalesce((establishment_record->>'sync_status')::public.sync_status_enum, 'pending'),
      is_archived = coalesce((establishment_record->>'is_archived')::boolean, false)
    where estab_id = establishment_record->>'estab_id'
      and coalesce((establishment_record->>'updated_at')::timestamptz, now()) >= updated_at;
  end loop;

  -- Handle deleted establishments
  for establishment_record in
    select value
    from jsonb_array_elements(coalesce(changes->'establishments'->'deleted', '[]'::jsonb))
  loop
    delete from public.establishments
    where estab_id = trim(both '"' from establishment_record::text);
  end loop;

  -- Handle created purpose_of_inspection (must precede inspection_reports —
  -- inspection_reports.purpose_id now references this table)
  for purpose_record in
    select value
    from jsonb_array_elements(coalesce(changes->'purpose_of_inspection'->'created', '[]'::jsonb))
  loop
    insert into public.purpose_of_inspection (
      purpose_id, estab_id, inspector_uid, inspection_date,
      verify_info, verify_info_list, determine_compliance, investigate_complaints,
      check_commitments, check_commitments_list, others,
      device_id, created_at, updated_at, sync_status
    )
    values (
      purpose_record->>'purpose_id',
      purpose_record->>'estab_id',
      purpose_record->>'inspector_uid',
      (purpose_record->>'inspection_date')::date,
      coalesce((purpose_record->>'verify_info')::boolean, false),
      purpose_record->'verify_info_list',
      coalesce((purpose_record->>'determine_compliance')::boolean, false),
      coalesce((purpose_record->>'investigate_complaints')::boolean, false),
      coalesce((purpose_record->>'check_commitments')::boolean, false),
      purpose_record->'check_commitments_list',
      purpose_record->>'others',
      purpose_record->>'device_id',
      coalesce((purpose_record->>'created_at')::timestamptz, now()),
      coalesce((purpose_record->>'updated_at')::timestamptz, now()),
      coalesce((purpose_record->>'sync_status')::public.sync_status_enum, 'pending')
    )
    on conflict (purpose_id) do nothing;
  end loop;

  -- Handle updated purpose_of_inspection
  for purpose_record in
    select value
    from jsonb_array_elements(coalesce(changes->'purpose_of_inspection'->'updated', '[]'::jsonb))
  loop
    update public.purpose_of_inspection
    set
      estab_id = purpose_record->>'estab_id',
      inspector_uid = purpose_record->>'inspector_uid',
      inspection_date = (purpose_record->>'inspection_date')::date,
      verify_info = coalesce((purpose_record->>'verify_info')::boolean, false),
      verify_info_list = purpose_record->'verify_info_list',
      determine_compliance = coalesce((purpose_record->>'determine_compliance')::boolean, false),
      investigate_complaints = coalesce((purpose_record->>'investigate_complaints')::boolean, false),
      check_commitments = coalesce((purpose_record->>'check_commitments')::boolean, false),
      check_commitments_list = purpose_record->'check_commitments_list',
      others = purpose_record->>'others',
      device_id = purpose_record->>'device_id',
      updated_at = coalesce((purpose_record->>'updated_at')::timestamptz, now()),
      sync_status = coalesce((purpose_record->>'sync_status')::public.sync_status_enum, 'pending')
    where purpose_id = purpose_record->>'purpose_id'
      and coalesce((purpose_record->>'updated_at')::timestamptz, now()) >= updated_at;
  end loop;

  -- Handle deleted purpose_of_inspection (hard delete)
  for purpose_record in
    select value
    from jsonb_array_elements(coalesce(changes->'purpose_of_inspection'->'deleted', '[]'::jsonb))
  loop
    delete from public.purpose_of_inspection
    where purpose_id = trim(both '"' from purpose_record::text);
  end loop;

  -- Handle created inspection_reports
  for inspection_report_record in
    select value
    from jsonb_array_elements(coalesce(changes->'inspection_reports'->'created', '[]'::jsonb))
  loop
    insert into public.inspection_reports (
      report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
      inspection_date, establishment_snapshot, permits_snapshot, is_archived,
      device_id, created_at, updated_at, sync_status, report_status
    )
    values (
      inspection_report_record->>'report_id',
      inspection_report_record->>'estab_id',
      inspection_report_record->>'inspector_uid',
      inspection_report_record->>'purpose_id',
      inspection_report_record->>'report_type',
      inspection_report_record->>'report_control_no',
      (inspection_report_record->>'inspection_date')::date,
      coalesce(inspection_report_record->'establishment_snapshot', '{}'::jsonb),
      coalesce(inspection_report_record->'permits_snapshot', '[]'::jsonb),
      coalesce((inspection_report_record->>'is_archived')::boolean, false),
      inspection_report_record->>'device_id',
      coalesce((inspection_report_record->>'created_at')::timestamptz, now()),
      coalesce((inspection_report_record->>'updated_at')::timestamptz, now()),
      coalesce((inspection_report_record->>'sync_status')::public.sync_status_enum, 'pending'),
      coalesce(inspection_report_record->>'report_status', 'draft')
    )
    on conflict (report_id) do nothing;
  end loop;

  -- Handle updated inspection_reports
  for inspection_report_record in
    select value
    from jsonb_array_elements(coalesce(changes->'inspection_reports'->'updated', '[]'::jsonb))
  loop
    update public.inspection_reports
    set
      estab_id = inspection_report_record->>'estab_id',
      inspector_uid = inspection_report_record->>'inspector_uid',
      purpose_id = inspection_report_record->>'purpose_id',
      report_type = inspection_report_record->>'report_type',
      report_control_no = inspection_report_record->>'report_control_no',
      inspection_date = (inspection_report_record->>'inspection_date')::date,
      establishment_snapshot = coalesce(inspection_report_record->'establishment_snapshot', '{}'::jsonb),
      permits_snapshot = coalesce(inspection_report_record->'permits_snapshot', '[]'::jsonb),
      updated_at = coalesce((inspection_report_record->>'updated_at')::timestamptz, now()),
      is_archived = coalesce((inspection_report_record->>'is_archived')::boolean, false),
      sync_status = coalesce((inspection_report_record->>'sync_status')::public.sync_status_enum, 'pending'),
      device_id = inspection_report_record->>'device_id',
      report_status = coalesce(inspection_report_record->>'report_status', 'draft')
    where report_id = inspection_report_record->>'report_id'
        and coalesce((inspection_report_record->>'updated_at')::timestamptz, now()) >= updated_at;
  end loop;

  -- Handle deleted inspection_reports (soft delete)
  for inspection_report_record in
    select value
    from jsonb_array_elements(coalesce(changes->'inspection_reports'->'deleted', '[]'::jsonb))
  loop
    update public.inspection_reports
    set
      deleted_at = now(),
      updated_at = now()
    where report_id = trim(both '"' from inspection_report_record::text);
  end loop;

  -- Handle created survey_reports
  for survey_record in
    select value
    from jsonb_array_elements(coalesce(changes->'survey_reports'->'created', '[]'::jsonb))
  loop
    insert into public.survey_reports (
      survey_id, estab_id, inspector_uid, report_control_number,
      inspection_date, project_name, reference_code, proponent_name,
      contact_person, contact_position, contact_number, email,
      project_location, geo_lat, geo_lng, area_size, purpose,
      document_type, project_status, physical_parameters,
      biological_parameters, socioeconomic_parameters, other_findings,
      remarks_recommendations, created_at, updated_at, is_archived,
      sync_status, device_id
    )
    values (
      survey_record->>'survey_id',
      survey_record->>'estab_id',
      survey_record->>'inspector_uid',
      survey_record->>'report_control_number',
      (survey_record->>'inspection_date')::date,
      survey_record->>'project_name',
      survey_record->>'reference_code',
      survey_record->>'proponent_name',
      survey_record->>'contact_person',
      survey_record->>'contact_position',
      survey_record->>'contact_number',
      survey_record->>'email',
      survey_record->>'project_location',
      nullif(survey_record->>'geo_lat', '')::double precision,
      nullif(survey_record->>'geo_lng', '')::double precision,
      nullif(survey_record->>'area_size', '')::double precision,
      survey_record->>'purpose',
      survey_record->>'document_type',
      survey_record->>'project_status',
      coalesce(survey_record->'physical_parameters', '{}'::jsonb),
      coalesce(survey_record->'biological_parameters', '{}'::jsonb),
      coalesce(survey_record->'socioeconomic_parameters', '{}'::jsonb),
      survey_record->>'other_findings',
      survey_record->>'remarks_recommendations',
      coalesce((survey_record->>'created_at')::timestamptz, now()),
      coalesce((survey_record->>'updated_at')::timestamptz, now()),
      coalesce((survey_record->>'is_archived')::boolean, false),
      coalesce((survey_record->>'sync_status')::public.sync_status_enum, 'pending'),
      survey_record->>'device_id'
    )
    on conflict (survey_id) do nothing;
  end loop;

  -- Handle updated survey_reports
  for survey_record in
    select value
    from jsonb_array_elements(coalesce(changes->'survey_reports'->'updated', '[]'::jsonb))
  loop
    update public.survey_reports
    set
      estab_id = survey_record->>'estab_id',
      inspector_uid = survey_record->>'inspector_uid',
      report_control_number = survey_record->>'report_control_number',
      inspection_date = (survey_record->>'inspection_date')::date,
      project_name = survey_record->>'project_name',
      reference_code = survey_record->>'reference_code',
      proponent_name = survey_record->>'proponent_name',
      contact_person = survey_record->>'contact_person',
      contact_position = survey_record->>'contact_position',
      contact_number = survey_record->>'contact_number',
      email = survey_record->>'email',
      project_location = survey_record->>'project_location',
      geo_lat = nullif(survey_record->>'geo_lat', '')::double precision,
      geo_lng = nullif(survey_record->>'geo_lng', '')::double precision,
      area_size = nullif(survey_record->>'area_size', '')::double precision,
      purpose = survey_record->>'purpose',
      document_type = survey_record->>'document_type',
      project_status = survey_record->>'project_status',
      physical_parameters = coalesce(survey_record->'physical_parameters', '{}'::jsonb),
      biological_parameters = coalesce(survey_record->'biological_parameters', '{}'::jsonb),
      socioeconomic_parameters = coalesce(survey_record->'socioeconomic_parameters', '{}'::jsonb),
      other_findings = survey_record->>'other_findings',
      remarks_recommendations = survey_record->>'remarks_recommendations',
      updated_at = coalesce((survey_record->>'updated_at')::timestamptz, now()),
      is_archived = coalesce((survey_record->>'is_archived')::boolean, false),
      sync_status = coalesce((survey_record->>'sync_status')::public.sync_status_enum, 'pending'),
      device_id = survey_record->>'device_id'
    where survey_id = survey_record->>'survey_id'
        and coalesce((survey_record->>'updated_at')::timestamptz, now()) >= updated_at;
  end loop;

  -- Handle deleted survey_reports (soft delete)
  for survey_record in
    select value
    from jsonb_array_elements(coalesce(changes->'survey_reports'->'deleted', '[]'::jsonb))
  loop
    update public.survey_reports
    set
      deleted_at = now(),
      updated_at = now()
    where survey_id = trim(both '"' from survey_record::text);
  end loop;

  -- Handle created compliance_air
  for compliance_air_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_air'->'created', '[]'::jsonb))
  loop
    insert into public.compliance_air (
      compliance_id, report_id, emission_sources, checklist_dao_2004_26,
      checklist_dao_2000_81, checklist_emb_mc, pto_conditions,
      other_observations, remarks_recommendations, documents_reviewed
    )
    values (
      compliance_air_record->>'compliance_id',
      compliance_air_record->>'report_id',
      coalesce(compliance_air_record->'emission_sources', '[]'::jsonb),
      coalesce(compliance_air_record->'checklist_dao_2004_26', '[]'::jsonb),
      coalesce(compliance_air_record->'checklist_dao_2000_81', '[]'::jsonb),
      coalesce(compliance_air_record->'checklist_emb_mc', '[]'::jsonb),
      coalesce(compliance_air_record->'pto_conditions', '[]'::jsonb),
      compliance_air_record->>'other_observations',
      compliance_air_record->>'remarks_recommendations',
      coalesce(compliance_air_record->'documents_reviewed', '[]'::jsonb)
    )
    on conflict (compliance_id) do nothing;
  end loop;

  -- Handle updated compliance_air
  for compliance_air_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_air'->'updated', '[]'::jsonb))
  loop
    update public.compliance_air
    set
      report_id = compliance_air_record->>'report_id',
      emission_sources = coalesce(compliance_air_record->'emission_sources', '[]'::jsonb),
      checklist_dao_2004_26 = coalesce(compliance_air_record->'checklist_dao_2004_26', '[]'::jsonb),
      checklist_dao_2000_81 = coalesce(compliance_air_record->'checklist_dao_2000_81', '[]'::jsonb),
      checklist_emb_mc = coalesce(compliance_air_record->'checklist_emb_mc', '[]'::jsonb),
      pto_conditions = coalesce(compliance_air_record->'pto_conditions', '[]'::jsonb),
      other_observations = compliance_air_record->>'other_observations',
      remarks_recommendations = compliance_air_record->>'remarks_recommendations',
      documents_reviewed = coalesce(compliance_air_record->'documents_reviewed', '[]'::jsonb)
    where compliance_id = compliance_air_record->>'compliance_id';
  end loop;

  -- Handle deleted compliance_air
  for compliance_air_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_air'->'deleted', '[]'::jsonb))
  loop
    delete from public.compliance_air
    where compliance_id = trim(both '"' from compliance_air_record::text);
  end loop;

  -- Handle created compliance_water
  for compliance_water_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_water'->'created', '[]'::jsonb))
  loop
    insert into public.compliance_water (
      compliance_id, report_id, water_sources, wastewater_sources,
      abstracted_water_quality, has_wwtp, wwtp_type, wwtp_details,
      wwtp_components, wwtp_condition, wwtp_under_construction,
      sampling_points, previous_inspection_summary, checklist_dao_2005_10,
      dp_conditions, other_observations, remarks_recommendations,
      documents_reviewed
    )
    values (
      compliance_water_record->>'compliance_id',
      compliance_water_record->>'report_id',
      coalesce(compliance_water_record->'water_sources', '[]'::jsonb),
      coalesce(compliance_water_record->'wastewater_sources', '[]'::jsonb),
      coalesce(compliance_water_record->'abstracted_water_quality', '[]'::jsonb),
      coalesce((compliance_water_record->>'has_wwtp')::boolean, false),
      compliance_water_record->>'wwtp_type',
      coalesce(compliance_water_record->'wwtp_details', '[]'::jsonb),
      coalesce(compliance_water_record->'wwtp_components', '[]'::jsonb),
      compliance_water_record->>'wwtp_condition',
      coalesce((compliance_water_record->>'wwtp_under_construction')::boolean, false),
      coalesce(compliance_water_record->'sampling_points', '[]'::jsonb),
      coalesce(compliance_water_record->'previous_inspection_summary', '{}'::jsonb),
      coalesce(compliance_water_record->'checklist_dao_2005_10', '[]'::jsonb),
      coalesce(compliance_water_record->'dp_conditions', '[]'::jsonb),
      compliance_water_record->>'other_observations',
      compliance_water_record->>'remarks_recommendations',
      coalesce(compliance_water_record->'documents_reviewed', '[]'::jsonb)
    )
    on conflict (compliance_id) do nothing;
  end loop;

  -- Handle updated compliance_water
  for compliance_water_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_water'->'updated', '[]'::jsonb))
  loop
    update public.compliance_water
    set
      report_id = compliance_water_record->>'report_id',
      water_sources = coalesce(compliance_water_record->'water_sources', '[]'::jsonb),
      wastewater_sources = coalesce(compliance_water_record->'wastewater_sources', '[]'::jsonb),
      abstracted_water_quality = coalesce(compliance_water_record->'abstracted_water_quality', '[]'::jsonb),
      has_wwtp = coalesce((compliance_water_record->>'has_wwtp')::boolean, false),
      wwtp_type = compliance_water_record->>'wwtp_type',
      wwtp_details = coalesce(compliance_water_record->'wwtp_details', '[]'::jsonb),
      wwtp_components = coalesce(compliance_water_record->'wwtp_components', '[]'::jsonb),
      wwtp_condition = compliance_water_record->>'wwtp_condition',
      wwtp_under_construction = coalesce((compliance_water_record->>'wwtp_under_construction')::boolean, false),
      sampling_points = coalesce(compliance_water_record->'sampling_points', '[]'::jsonb),
      previous_inspection_summary = coalesce(compliance_water_record->'previous_inspection_summary', '{}'::jsonb),
      checklist_dao_2005_10 = coalesce(compliance_water_record->'checklist_dao_2005_10', '[]'::jsonb),
      dp_conditions = coalesce(compliance_water_record->'dp_conditions', '[]'::jsonb),
      other_observations = compliance_water_record->>'other_observations',
      remarks_recommendations = compliance_water_record->>'remarks_recommendations',
      documents_reviewed = coalesce(compliance_water_record->'documents_reviewed', '[]'::jsonb)
    where compliance_id = compliance_water_record->>'compliance_id';
  end loop;

  -- Handle deleted compliance_water
  for compliance_water_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_water'->'deleted', '[]'::jsonb))
  loop
    delete from public.compliance_water
    where compliance_id = trim(both '"' from compliance_water_record::text);
  end loop;

  -- Handle created compliance_hazwaste
  for compliance_hazwaste_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_hazwaste'->'created', '[]'::jsonb))
  loop
    insert into public.compliance_hazwaste (
      compliance_id, report_id, hazwaste_generator_id, hazwaste_id_date_issued,
      waste_types_generated, checklist_registration, checklist_storage,
      checklist_packaging, checklist_labeling, checklist_transport,
      checklist_emergency, checklist_personnel_training, checklist_manifest_system,
      hwid_conditions, other_observations, remarks_recommendations, documents_reviewed
    )
    values (
      compliance_hazwaste_record->>'compliance_id',
      compliance_hazwaste_record->>'report_id',
      compliance_hazwaste_record->>'hazwaste_generator_id',
      nullif(compliance_hazwaste_record->>'hazwaste_id_date_issued', '')::date,
      coalesce(compliance_hazwaste_record->'waste_types_generated', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_registration', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_storage', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_packaging', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_labeling', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_transport', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_emergency', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_personnel_training', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'checklist_manifest_system', '[]'::jsonb),
      coalesce(compliance_hazwaste_record->'hwid_conditions', '[]'::jsonb),
      compliance_hazwaste_record->>'other_observations',
      compliance_hazwaste_record->>'remarks_recommendations',
      coalesce(compliance_hazwaste_record->'documents_reviewed', '[]'::jsonb)
    )
    on conflict (compliance_id) do nothing;
  end loop;

  -- Handle updated compliance_hazwaste
  for compliance_hazwaste_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_hazwaste'->'updated', '[]'::jsonb))
  loop
    update public.compliance_hazwaste
    set
      report_id = compliance_hazwaste_record->>'report_id',
      hazwaste_generator_id = compliance_hazwaste_record->>'hazwaste_generator_id',
      hazwaste_id_date_issued = nullif(compliance_hazwaste_record->>'hazwaste_id_date_issued', '')::date,
      waste_types_generated = coalesce(compliance_hazwaste_record->'waste_types_generated', '[]'::jsonb),
      checklist_registration = coalesce(compliance_hazwaste_record->'checklist_registration', '[]'::jsonb),
      checklist_storage = coalesce(compliance_hazwaste_record->'checklist_storage', '[]'::jsonb),
      checklist_packaging = coalesce(compliance_hazwaste_record->'checklist_packaging', '[]'::jsonb),
      checklist_labeling = coalesce(compliance_hazwaste_record->'checklist_labeling', '[]'::jsonb),
      checklist_transport = coalesce(compliance_hazwaste_record->'checklist_transport', '[]'::jsonb),
      checklist_emergency = coalesce(compliance_hazwaste_record->'checklist_emergency', '[]'::jsonb),
      checklist_personnel_training = coalesce(compliance_hazwaste_record->'checklist_personnel_training', '[]'::jsonb),
      checklist_manifest_system = coalesce(compliance_hazwaste_record->'checklist_manifest_system', '[]'::jsonb),
      hwid_conditions = coalesce(compliance_hazwaste_record->'hwid_conditions', '[]'::jsonb),
      other_observations = compliance_hazwaste_record->>'other_observations',
      remarks_recommendations = compliance_hazwaste_record->>'remarks_recommendations',
      documents_reviewed = coalesce(compliance_hazwaste_record->'documents_reviewed', '[]'::jsonb)
    where compliance_id = compliance_hazwaste_record->>'compliance_id';
  end loop;

  -- Handle deleted compliance_hazwaste
  for compliance_hazwaste_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_hazwaste'->'deleted', '[]'::jsonb))
  loop
    delete from public.compliance_hazwaste
    where compliance_id = trim(both '"' from compliance_hazwaste_record::text);
  end loop;

  -- Handle created compliance_eia
  for compliance_eia_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_eia'->'created', '[]'::jsonb))
  loop
    insert into public.compliance_eia (
      compliance_id, report_id, checklist_dao_2003_30, ecc_emp_conditions,
      other_observations, remarks_recommendations, documents_reviewed
    )
    values (
      compliance_eia_record->>'compliance_id',
      compliance_eia_record->>'report_id',
      coalesce(compliance_eia_record->'checklist_dao_2003_30', '[]'::jsonb),
      coalesce(compliance_eia_record->'ecc_emp_conditions', '[]'::jsonb),
      compliance_eia_record->>'other_observations',
      compliance_eia_record->>'remarks_recommendations',
      coalesce(compliance_eia_record->'documents_reviewed', '[]'::jsonb)
    )
    on conflict (compliance_id) do nothing;
  end loop;

  -- Handle updated compliance_eia
  for compliance_eia_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_eia'->'updated', '[]'::jsonb))
  loop
    update public.compliance_eia
    set
      report_id = compliance_eia_record->>'report_id',
      checklist_dao_2003_30 = coalesce(compliance_eia_record->'checklist_dao_2003_30', '[]'::jsonb),
      ecc_emp_conditions = coalesce(compliance_eia_record->'ecc_emp_conditions', '[]'::jsonb),
      other_observations = compliance_eia_record->>'other_observations',
      remarks_recommendations = compliance_eia_record->>'remarks_recommendations',
      documents_reviewed = coalesce(compliance_eia_record->'documents_reviewed', '[]'::jsonb)
    where compliance_id = compliance_eia_record->>'compliance_id';
  end loop;

  -- Handle deleted compliance_eia
  for compliance_eia_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_eia'->'deleted', '[]'::jsonb))
  loop
    delete from public.compliance_eia
    where compliance_id = trim(both '"' from compliance_eia_record::text);
  end loop;

  return jsonb_build_object('status', 'ok');
end;
$$;

commit;
