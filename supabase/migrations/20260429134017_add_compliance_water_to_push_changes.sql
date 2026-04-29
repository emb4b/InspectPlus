begin;

create or replace function public.push_changes(changes jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  establishment_record jsonb;
  inspection_report_record jsonb;
  purpose_record jsonb;
  survey_record jsonb;
  compliance_air_record jsonb;
  compliance_water_record jsonb;
begin
  -- Handle created establishments
  for establishment_record in
    select value
    from jsonb_array_elements(coalesce(changes->'establishments'->'created', '[]'::jsonb))
  loop
    insert into public.establishments (
      estab_id, inspector_uid, name, address, province, nature_of_business,
      status, created_at, updated_at, sync_status, device_id
    )
    values (
      establishment_record->>'estab_id',
      establishment_record->>'inspector_uid',
      establishment_record->>'name',
      establishment_record->>'address',
      establishment_record->>'province',
      establishment_record->>'nature_of_business',
      establishment_record->>'status',
      coalesce((establishment_record->>'created_at')::timestamptz, now()),
      coalesce((establishment_record->>'updated_at')::timestamptz, now()),
      coalesce((establishment_record->>'sync_status')::public.sync_status_enum, 'pending'),
      establishment_record->>'device_id'
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
      address = establishment_record->>'address',
      province = establishment_record->>'province',
      nature_of_business = establishment_record->>'nature_of_business',
      status = establishment_record->>'status',
      updated_at = coalesce((establishment_record->>'updated_at')::timestamptz, now()),
      sync_status = coalesce((establishment_record->>'sync_status')::public.sync_status_enum, 'pending'),
      device_id = establishment_record->>'device_id'
    where estab_id = establishment_record->>'estab_id';
  end loop;

  -- Handle deleted establishments
  for establishment_record in
    select value
    from jsonb_array_elements(coalesce(changes->'establishments'->'deleted', '[]'::jsonb))
  loop
    delete from public.establishments
    where estab_id = trim(both '"' from establishment_record::text);
  end loop;

  -- Handle created inspection_reports
  for inspection_report_record in
    select value
    from jsonb_array_elements(coalesce(changes->'inspection_reports'->'created', '[]'::jsonb))
  loop
    insert into public.inspection_reports (
      report_id, estab_id, inspector_uid, report_type, report_control_number,
      inspection_date, snapshot, permits_snapshot, created_at, updated_at,
      is_archived, sync_status, device_id
    )
    values (
      inspection_report_record->>'report_id',
      inspection_report_record->>'estab_id',
      inspection_report_record->>'inspector_uid',
      inspection_report_record->>'report_type',
      inspection_report_record->>'report_control_number',
      (inspection_report_record->>'inspection_date')::date,
      coalesce(inspection_report_record->'snapshot', '{}'::jsonb),
      coalesce(inspection_report_record->'permits_snapshot', '{}'::jsonb),
      coalesce((inspection_report_record->>'created_at')::timestamptz, now()),
      coalesce((inspection_report_record->>'updated_at')::timestamptz, now()),
      coalesce((inspection_report_record->>'is_archived')::boolean, false),
      coalesce((inspection_report_record->>'sync_status')::public.sync_status_enum, 'pending'),
      inspection_report_record->>'device_id'
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
      report_type = inspection_report_record->>'report_type',
      report_control_number = inspection_report_record->>'report_control_number',
      inspection_date = (inspection_report_record->>'inspection_date')::date,
      snapshot = coalesce(inspection_report_record->'snapshot', '{}'::jsonb),
      permits_snapshot = coalesce(inspection_report_record->'permits_snapshot', '{}'::jsonb),
      updated_at = coalesce((inspection_report_record->>'updated_at')::timestamptz, now()),
      is_archived = coalesce((inspection_report_record->>'is_archived')::boolean, false),
      sync_status = coalesce((inspection_report_record->>'sync_status')::public.sync_status_enum, 'pending'),
      device_id = inspection_report_record->>'device_id'
    where report_id = inspection_report_record->>'report_id';
  end loop;

  -- Handle deleted inspection_reports
  for inspection_report_record in
    select value
    from jsonb_array_elements(coalesce(changes->'inspection_reports'->'deleted', '[]'::jsonb))
  loop
    delete from public.inspection_reports
    where report_id = trim(both '"' from inspection_report_record::text);
  end loop;

  -- Handle created purpose_of_inspection
  for purpose_record in
    select value
    from jsonb_array_elements(coalesce(changes->'purpose_of_inspection'->'created', '[]'::jsonb))
  loop
    insert into public.purpose_of_inspection (
      purpose_id, report_id, verify_new_application, verify_renewal,
      verify_modification, application_type, determine_compliance,
      investigate_complaint, check_voluntary_commitment,
      voluntary_commitment_type, others_specify
    )
    values (
      purpose_record->>'purpose_id',
      purpose_record->>'report_id',
      coalesce((purpose_record->>'verify_new_application')::boolean, false),
      coalesce((purpose_record->>'verify_renewal')::boolean, false),
      coalesce((purpose_record->>'verify_modification')::boolean, false),
      purpose_record->>'application_type',
      coalesce((purpose_record->>'determine_compliance')::boolean, false),
      coalesce((purpose_record->>'investigate_complaint')::boolean, false),
      coalesce((purpose_record->>'check_voluntary_commitment')::boolean, false),
      purpose_record->>'voluntary_commitment_type',
      purpose_record->>'others_specify'
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
      report_id = purpose_record->>'report_id',
      verify_new_application = coalesce((purpose_record->>'verify_new_application')::boolean, false),
      verify_renewal = coalesce((purpose_record->>'verify_renewal')::boolean, false),
      verify_modification = coalesce((purpose_record->>'verify_modification')::boolean, false),
      application_type = purpose_record->>'application_type',
      determine_compliance = coalesce((purpose_record->>'determine_compliance')::boolean, false),
      investigate_complaint = coalesce((purpose_record->>'investigate_complaint')::boolean, false),
      check_voluntary_commitment = coalesce((purpose_record->>'check_voluntary_commitment')::boolean, false),
      voluntary_commitment_type = purpose_record->>'voluntary_commitment_type',
      others_specify = purpose_record->>'others_specify'
    where purpose_id = purpose_record->>'purpose_id';
  end loop;

  -- Handle deleted purpose_of_inspection
  for purpose_record in
    select value
    from jsonb_array_elements(coalesce(changes->'purpose_of_inspection'->'deleted', '[]'::jsonb))
  loop
    delete from public.purpose_of_inspection
    where purpose_id = trim(both '"' from purpose_record::text);
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
    where survey_id = survey_record->>'survey_id';
  end loop;

  -- Handle deleted survey_reports
  for survey_record in
    select value
    from jsonb_array_elements(coalesce(changes->'survey_reports'->'deleted', '[]'::jsonb))
  loop
    delete from public.survey_reports
    where survey_id = trim(both '"' from survey_record::text);
  end loop;

  -- Handle created compliance_air
  for compliance_air_record in
    select value
    from jsonb_array_elements(coalesce(changes->'compliance_air'->'created', '[]'::jsonb))
  loop
    insert into public.compliance_air (
      compliance_id,
      report_id,
      emission_sources,
      checklist_dao_2004_26,
      checklist_dao_2000_81,
      checklist_emb_mc,
      pto_conditions,
      other_observations,
      remarks_recommendations,
      documents_reviewed
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
      compliance_id,
      report_id,
      water_sources,
      wastewater_sources,
      abstracted_water_quality,
      has_wwtp,
      wwtp_type,
      wwtp_details,
      wwtp_components,
      wwtp_condition,
      wwtp_under_construction,
      sampling_points,
      previous_inspection_summary,
      checklist_dao_2005_10,
      dp_conditions,
      other_observations,
      remarks_recommendations,
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

  return jsonb_build_object('status', 'ok');
end;
$$;

commit;