# air-monitoring.docx — merge tags

Regenerate with `npm run tag-templates` from `originals/Air Monitoring.docx` + `recipes/air.json`.
Loop minimums (rows padded by the mapper): product_lines 1 · permits_extra 0 · photo_rows 0.

Tables 1–5 (General Information, Product Lines, PCO/Contact, Purpose of Inspection, DENR Permits) are
byte-identical in coordinates to Water Monitoring's, so this form's shared-block tags are tagged the
same way and mean the same thing — see `mapCommon` in `src/features/export/mappers/common.ts`.

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
| `sig_recommending_name`, `sig_recommending_position`, `sig_approver_name`, `sig_approver_position` | `ctx.signatories`; default to `DEFAULT_APPROVERS` (what the forms printed before this was editable) |
| `sig_inspectors[]` → `sig_inspector_name`, `sig_inspector_position` | primary inspector + `additionalInspectors[]` with a non-blank name, min 1 |
| `photo_rows[]` → `left[]` / `right[]` → `photo_id`, `caption`, `photo_missing_text` | `bundle.photos`, two per row; `right` is `[]` for an odd last photo; `caption` is `Figure N` (1-based across the report), plus `: <text>` when the inspector gave one |

## Unused checkboxes
`unused_1`–`unused_4` are the four pre-existing ☐ glyphs in table 7 rows 14–15 ("Quarterly submission
of self-monitoring... Q1/Q2/Q3/Q4"), which belong to the Air-specific compliance checklist below. They
are always filled `UNTICKED` — see `UNUSED_CHECKBOXES.air_monitoring` in `src/features/export/templates/index.ts`
and the spread in `src/features/export/mappers/index.ts` — so the printed form still shows empty boxes
instead of `nullGetter` blanking them to `''`.

## Untagged (pending the Air Monitoring form)
Tables 6 (Emission Source Data Information), 7 (the DAO 2004-26 / DAO 2000-81 / EMB Memorandum Circulars
compliance checklist, apart from the four `unused_*` boxes above) and 8 (Compliance to PTO Conditions)
are the Air-specific sections. They stay untagged and print exactly as in the original template until
the Air Monitoring inspection form exists in the app and a dedicated `mapAir` mapper is written.
