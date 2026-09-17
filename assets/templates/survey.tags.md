# survey.docx — merge tags

Regenerate with `npm run tag-templates` from `originals/Survey.docx` + `recipes/survey.json`.
Loop minimum: photo_rows 0.

Survey has no ☒/☐ checkbox content controls at all (`checkboxes: []` in the recipe) — every option on
this form is a legacy `__` blank typed directly into the paragraph text, so its checkbox-shaped tags
(`cb_survey_*`) are plain scalar tags the mapper fills with `TICKED`/`UNTICKED` text, the same
convention `mapCommon` uses for `purpose_cb_industrial_ecowatch` and friends on the other three forms.
Several `__` blanks share identical run text (e.g. `"__ "` appears 80 times across the whole document,
most of them in the untagged Site Validation table below), so each `replaceText` op in the recipe was
verified against `docx-runs.js`'s occurrence count, not assumed from position in the form.

## Header and model columns
| Tag | Source |
|---|---|
| `survey_report_control_no`, `survey_inspection_date` | header |
| `survey_project_name`, `survey_reference_code`, `survey_date` (= inspection date), `survey_proponent_name`, `survey_contact_person`, `survey_contact_position`, `survey_contact_number`, `survey_email`, `survey_project_location`, `survey_geo`, `survey_area_size` | model columns |

## Purpose, document type, status
| Tag | Source |
|---|---|
| `cb_survey_purpose_ecc_application`, `cb_survey_purpose_ecc_amendment` | `purpose` contains `amendment` → amendment; else contains `ecc` → application |
| `cb_survey_doc_iee`, `cb_survey_doc_eis`, `cb_survey_doc_eprmp`, `cb_survey_doc_peis`, `cb_survey_doc_permp`, `cb_survey_doc_others`, `survey_doc_others` | `documentType` normalized; unknown non-empty → others + text |
| `cb_survey_status_baseline`, `_preconstruction`, `_construction`, `_operation`, `_suspended`, `_abandoned` | `projectStatus` normalized: `baseline`; `preconstruction`; `construction` (and not pre); `operation`/`completed`; `suspended`; `abandoned` |

## Findings, signatures, photos
| Tag | Source |
|---|---|
| `survey_other_findings`, `survey_remarks_recommendations` | model |
| `sig_inspector_name`, `sig_inspector_position`, `sig_supervisor_name`, `sig_supervisor_position` | `ctx.signatories` |
| `sig_recommending_name`, `sig_recommending_position`, `sig_approver_name`, `sig_approver_position` | `ctx.signatories`; default to `DEFAULT_APPROVERS` (what the forms printed before this was editable) |
| `sig_inspectors[]` → `sig_inspector_name`, `sig_inspector_position` | primary inspector + `additionalInspectors[]` with a non-blank name, min 1; the loop repeats the printed form's two blank signature-space paragraphs above each name, not just the name/position |
| `photo_rows[]` → `left[]` / `right[]` → `photo_id`, `caption`, `photo_missing_text` | `bundle.photos`, two per row; `right` is `[]` for an odd last photo; `caption` is `Figure N` (1-based across the report), plus `: <text>` when the inspector gave one |

## Untagged (pending the Survey site-validation form)
Table 1 rows 6–27 ("Site Validation" — Physical, Biological findings: terrain, soil type, land use,
receiving water, groundwater, forest cover, affected community, livelihood, infrastructure) and row 5
("Remarks:", the Site Validation section's own remarks field, distinct from `survey_remarks_recommendations`
at row 28) stay untagged and print exactly as in the original template. `mapSurvey` only reads the
`survey_reports` columns (see `src/features/export/mappers/survey.ts`) — the site validation tables
have no backing data model yet, per Task 10's brief.

The final paragraph of the original document (immediately before `<w:sectPr>`) is wholly empty, with
no ATTACHMENTS heading at all — the recipe's `insertAfterParagraph` op uses `"find": ""`, the special
case added to `scripts/docx-tag.js` for exactly this case, and its inserted XML supplies its own
`ATTACHMENTS` heading paragraph ahead of the photo table.
