# water-monitoring.docx — merge tags

Regenerate with `npm run tag-templates` from `originals/Water Monitoring.docx` + `recipes/water.json`.
Loop minimums (rows padded by the mapper): product_lines 1 · permits_extra 0 · abstracted_rows 5 · wwtp_outlets 3 · wwtp_components 2 · sampling_points 2 · parameters 4 · prev_parameters 4 · dp_conditions 5 · photo_rows 0.

## Shared block
| Tag | Meaning |
|---|---|
| `report_control_no` | `report.reportControlNo` |
| `inspection_date` | `formatReportDate(report.inspectionDate)` |
| `gi_establishment_name` | snapshot `name` (+ ` (formerly <former_name>)` when set) |
| `gi_address` | `formatEstablishmentLocation(snapshot)` |
| `gi_geo` | `"<lat>, <lng>"` to 6 dp, or `''` |
| `gi_nature_of_business`, `gi_psic_code` | snapshot |
| `gi_product` | product line names joined with `; ` |
| `gi_year_established` | `operating_status_since` only when `operating_status !== 'Operational'` |
| `gi_operating_hours_day`, `gi_operating_days_week`, `gi_operating_days_year` | `numberText(...)` |
| `product_lines[]` → `product_line`, `ecc_production_rate`, `actual_production_rate` | padded to `ROW_MINIMUMS.productLines` |
| `gi_managing_head`, `gi_pco_name`, `gi_pco_accreditation_no` | snapshot |
| `gi_pco_effectivity` | `formatReportDate(pco_effectivity)` |
| `gi_phone_fax`, `gi_email` | snapshot |
| `gi_contact_person` | `"<name> (<position>)"`; name alone when no position |
| `purpose_cb_verify`, `purpose_cb_compliance`, `purpose_cb_complaints`, `purpose_cb_commitments`, `purpose_cb_others` | purpose booleans; `purpose_cb_others` = `!!others.trim()` |
| `purpose_cb_<item>_new` / `purpose_cb_<item>_renewal` for item ∈ `pmpin, hazwaste_id, hazwaste_transporter, hazwaste_tsd, pto_air, discharge_permit` | `verifyInfoRows[].status` |
| `purpose_cb_industrial_ecowatch`, `purpose_cb_pepp`, `purpose_cb_pab`, `purpose_cb_commitment_others` | `commitmentRows[].checked` |
| `purpose_commitment_others` | remarks of the `others` commitment row |
| `purpose_others` | `purpose.others` |
| `permit_<row>_serial`, `permit_<row>_issued`, `permit_<row>_expiry` for row ∈ `ecc1, ecc2, ecc3, denr_registry_id, pcl_compliance_certificate, cco_registry, permit_to_transport, po_number, ecc_sanitary_landfill, discharge_permit_number` | matched from `permitsSnapshot` (rules in code) |
| `permits_extra[]` → `envi_law`, `permit_type`, `permit_serial`, `issued_date`, `expiry_date` | unmatched permits, min 0 |
| `doc_cb_record_file_folder`, `doc_cb_synology`, `doc_cb_opms`, `doc_cb_iis_transactions`, `doc_cb_cmr_online`, `doc_cb_smr_online`, `doc_cb_pco_online`, `doc_cb_others`, `doc_others` | `compliance.documentsReviewed` |
| `other_observations`, `remarks_recommendations` | `compliance.*` (any kind but `none`) |
| `sig_inspector_name`, `sig_inspector_position`, `sig_supervisor_name`, `sig_supervisor_position` | `ctx.signatories` |
| `photo_rows[]` → `left[]` / `right[]` → `photo_id`, `caption`, `photo_missing_text` | `bundle.photos`, two per row; `right` is `[]` for an odd last photo |

## Water block
| Tag | Meaning |
|---|---|
| `ws_<row>_daily`, `ws_<row>_annual`, `ws_<row>_specify`, row ∈ `surface, groundwater, utilities, desalination, recycled, others` | `waterSources[]` matched on `source_type` (normalized: `surfacewater`, `groundwater`, `waterutilities`, `desalination`, `recycled`, else others). Several rows on one source join with `; ` |
| `ww_<row>_consumed`, `ww_<row>_generated`, `ww_<row>_specify`, row ∈ `process, domestic, cooling, maintenance, storm_drain, others` | `wastewaterSources[]` on `use_type`; `specify` = `outlet_info` (+ `specify` if present) |
| `abstracted_rows[]` → `source, specify, bod_cod, tss, avfp, heavy_metal` | min `ROW_MINIMUMS.abstractedWaterQuality` |
| `cb_has_wwtp_yes`, `cb_has_wwtp_no` | `hasWwtp` |
| `cb_wwtp_type_physical`, `cb_wwtp_type_biological`, `cb_wwtp_type_chemical`, `cb_wwtp_type_others`, `wwtp_type_others` | `wwtpType`; `Combined` → others box + text `Combined`; `hasWwtp === false` → others text = `describeNonWwtpTreatment(...)` |
| `wwtp_outlets[]` → `outlet_no, wwtp_detail, date_of_installation, design_capacity, annual_maintenance_cost, outlet_location, receiving_body, flow_meter_device, flow_rate` | `wwtpDetails`, min `wwtpOutlets` |
| `wwtp_components[]` → `outlet_no, wwtp, cb_primary_screening, cb_primary_grit_removal, cb_primary_oil_water_separator, cb_primary_equalization_tank, cb_primary_others, primary_others, cb_bio_activated_sludge, cb_bio_anaerobic_digestion, cb_bio_abr, cb_bio_reed_bed, cb_bio_trickling_filter, cb_bio_oxidation_batch, cb_bio_sbr, cb_bio_others, bio_others, cb_chem_ph_adjustment, cb_chem_disinfection, cb_chem_redox, cb_chem_flocculation, cb_chem_others, chem_others, other_treatment` | `wwtpComponents` through `decodeWwtpComponent`, min `wwtpComponents` |
| `cb_wwtp_condition_properly`, `cb_wwtp_condition_inadequately`, `cb_wwtp_condition_poor`, `cb_wwtp_condition_others`, `wwtp_condition_others` | `wwtpCondition`, `wwtpConditionOther` |
| `cb_under_construction_yes/_no`, `cb_construction_reported_yes/_no`, `wwtp_construction_units`, `wwtp_construction_completion_date`, `wwtp_treatment_units_utilized` | 5E |
| `sampling_points[]` → `point_no, sampling_station, sampling_time, type_of_sample, parameters[]` → `parameter_name, value, unit, denr_standard, cb_compliant_y, cb_compliant_n, remarks` | `samplingPoints`; empty when `samplingConducted === false`; min 2 / 4 |
| `prev_date_of_sampling, prev_sampling_station, prev_sampling_time, prev_type_of_sample, prev_parameters[]` (same row keys) | `previousInspectionSummary` when `hasRecords === 'yes'` (or `null` with a date — never asked); blank otherwise; min 4 |
| `sf_<slug>_y`, `sf_<slug>_n`, `sf_<slug>_na`, `sf_<slug>_remarks`, slug = checklist key with `-` → `_` | `checklistDao200510` looked up by `key` |
| `dp_conditions[]` → `condition_no, description, cb_y, cb_n, cb_na, remarks` | `dpConditions`, min 5 |
