# hazardous-waste-generators.docx — merge tags

Regenerate with `npm run tag-templates` from `originals/Hazardous Waste Generators.docx` + `recipes/hazwaste.json`.
Loop minimums (rows padded by the mapper): product_lines 1 · permits_extra 0 · photo_rows 0.

Tables 1–5 (General Information, Product Lines, PCO/Contact, Purpose of Inspection, DENR Permits) are
byte-identical in coordinates to Water Monitoring's, so this form's shared-block tags are tagged the
same way and mean the same thing — see `mapCommon` in `src/features/export/mappers/common.ts`. One
run-split quirk specific to this original: table 1 row 1 cell 1's label is split into a lone `"N"` run
followed by `"ame of Establishment:"` — harmless for the `cell` op (which appends after the cell's last
run regardless of how the label itself is split), just noted here since `docx-grid.js` on the untagged
original shows it.

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
| `purpose_others` | `purpose.others` (no colon before the tag — see below) |
| `permit_<row>_serial`, `permit_<row>_issued`, `permit_<row>_expiry` for row ∈ `ecc1, ecc2, ecc3, denr_registry_id, pcl_compliance_certificate, cco_registry, permit_to_transport, po_number, ecc_sanitary_landfill, discharge_permit_number` | matched from `permitsSnapshot` (rules in code) |
| `permits_extra[]` → `envi_law`, `permit_type`, `permit_serial`, `issued_date`, `expiry_date` | unmatched permits, min 0 |
| `doc_cb_record_file_folder`, `doc_cb_synology`, `doc_cb_hwms`, `doc_cb_iis_transactions`, `doc_cb_cmr_online`, `doc_cb_smr_online`, `doc_cb_pco_online`, `doc_cb_others`, `doc_others` | `compliance.documentsReviewed` |
| `other_observations`, `remarks_recommendations` | `compliance.*` (any kind but `none`) |
| `sig_inspector_name`, `sig_inspector_position`, `sig_supervisor_name`, `sig_supervisor_position` | `ctx.signatories` |
| `sig_recommending_name`, `sig_recommending_position`, `sig_approver_name`, `sig_approver_position` | `ctx.signatories`; default to `DEFAULT_APPROVERS` (what the forms printed before this was editable) |
| `photo_rows[]` → `left[]` / `right[]` → `photo_id`, `caption`, `photo_missing_text` | `bundle.photos`, two per row; `right` is `[]` for an odd last photo |

This is the one template of the four whose third "documents reviewed" checkbox reads **HWMS**, not
OPMS — tagged `doc_cb_hwms` instead of `doc_cb_opms`. `DOC_ROWS` in `common.ts` appends `['hwms', 'HWMS']`
so `doc_cb_hwms` is a key on every report type's mapped data, but only this template prints it (the
other three print `doc_cb_opms` and never `doc_cb_hwms`); the contract test's "prints every key"
direction ignores both keys for that reason.

Also unlike the other three forms, this original has no colon between the "Others (Specify)" label and
its blank in the Purpose section (`"Others (Specify) _______"`, not `"...): _______"`), so `purpose_others`
is tagged straight onto the underscore run with no leading `": "` fix needed.

## Unused checkboxes
`unused_1`/`unused_2` are the two pre-existing ☐ glyphs in table 7 row 6 ("Category: Large ☐ Small ☐"),
part of the Hazwaste-specific compliance checklist. They are always filled `UNTICKED` — see
`UNUSED_CHECKBOXES.hazardous_waste` in `src/features/export/templates/index.ts` and the spread in
`src/features/export/mappers/index.ts`.

## Untagged (pending the Hazardous Waste Generators form)
Table 6 (General Hazwaste Generator Information / Types of Hazardous Waste Generated) and tables 7–11
(the DAO 2013-22 compliance checklist across storage, packaging, labeling, transport/treatment,
emergency contingency, personnel training and manifest requirements, apart from the two `unused_*`
boxes above) are the Hazwaste-specific sections. They stay untagged and print exactly as in the
original template until the Hazardous Waste Generators inspection form exists in the app and a
dedicated `mapHazwaste` mapper is written.
