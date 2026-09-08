# Decision: converge establishment editing on the report's granular model

Status: implemented on `feature/establishment-editing-convergence`.
`/establishment/edit`, `EditEstablishmentScreen` and `editEstablishmentForm`
are retired; `EstablishmentInfoSections` now carries four independently
editable sections (Establishment Details, Key Personnel, Pollution Control
Officer, Product Lines) via `useEditableSection` + `SectionEditActions`,
saving through the new `patchEstablishmentRecord`. DENR Permits is
unchanged — still a read-only section with a stubbed Edit action, since no
editing flow for it existed before this convergence and building one is a
separate, larger feature (permit add/remove, not just field edits).

## The inconsistency

The app has two different mental models for "edit":

- **Inspection reports** edit in place, section by section. 22 call
  sites use `useEditableSection` (`src/features/inspections/hooks/
  useEditableSection.ts`), each paired with `SectionEditActions`
  (Edit → Cancel/Save) rendered as a `FormSection`'s `headerRight`.
  Each section patches only its own slice of the record.
- **Establishments** edit on a separate screen. The header card's Edit
  and the DENR Permits section's Edit both route to
  `/establishment/edit` (`EstablishmentDetailScreen.tsx:63`), which
  renders `EditEstablishmentScreen` (708 lines) — one form, one
  `handleSave`, one `updateEstablishmentRecord({ estabId, form })`
  writing every field in a single `database.write`.

The sharp edge is not that two screens differ. It is that the
**same affordance behaves differently depending on the screen**: a
section-header "Edit" button edits in place on a report, but navigates
away on an establishment.

Note: the `feature/modern-ui-harmony` branch renamed that establishment
button from "Update Permits" to "Edit" as part of a button-consistency
pass. That improved visual consistency (and let the section heading fit
on one line) but sharpened the behavioural mismatch — the button now
looks even more like the report's in-place control while still
navigating. This was accepted deliberately on the understanding that
this convergence resolves it properly rather than papering over it with
a chevron that would immediately be thrown away.

## Decision

Converge establishments onto the report's granular, in-place model.
Decompose `EditEstablishmentScreen` into editable sections on the
establishment detail screen, and retire `/establishment/edit`.

## Why

1. **The persistence layer already supports it.**
   `resolveEstablishmentContentEdit`
   (`src/features/inspections/establishmentPersistence.ts:78`) takes
   `nextPartialFields: Partial<Record<EstablishmentContentField,
   unknown>>` and computes dirtiness per field against the
   `lastSyncedSnapshot`. It was written for partial updates. Only the
   UI sends the whole form at once. This is therefore a UI change, not
   a persistence rewrite — substantially cheaper than it appears.

2. **Offline-first favours smaller writes.** Whole-record saves mark
   more fields dirty than the user actually touched, which widens the
   conflict surface for a sync engine that already does real conflict
   resolution (`services/sync/syncConflictResolution.ts`).
   `useEditableSection`'s own doc comment states the intent: editing one
   section can never clobber an in-flight edit on another.

3. **Field safety.** Thirty-odd fields behind a single Save is a
   data-loss risk when an inspector's phone dies mid-edit outdoors. The
   report's model commits as the user goes.

4. **It removes a dishonest affordance**, rather than teaching users
   that the same button means two things.

## Constraints the implementation must respect

- **Cross-field validation.** `EditEstablishmentScreen.handleSave`
  currently validates `name`, `barangay`, `city` and `province`
  together and blocks the save if any is empty. Splitting those across
  sections would let a section save empty a required field. Keep all
  four in a single "Identity & Location" section so the validation
  stays local to one save.
- **Bulk edits must not regress badly.** Changing a full address is one
  form today. Grouping the address fields in one section (see above)
  keeps that a single edit rather than four.
- **Permits already have their own shape.** `DenrPermitsSection` /
  `DenrPermitsFormSection` already exist and already use
  `useEditableSection` on the report side — check whether the
  establishment's permits editing can reuse them directly rather than
  growing a third variant.
- Prose that refers to the editing route by name must be updated with
  it. `EditEstablishmentScreen.tsx:496` already carries one such
  reference (it was updated once during the button pass); retiring the
  route will need another pass for anything pointing at it.

## Explicitly rejected alternatives

- **Converge the other way** (reports get one edit screen): rejected. A
  report spans four tables (`inspection_reports`, the per-type
  `compliance_*` table, `attachments`, `purpose_of_inspection`), is
  filled progressively across a site visit, and has 22 independently
  editable sections. Collapsing that into a single Save would be a real
  regression in field safety.
- **Keep both, add a navigation affordance** (chevron / "Open" on the
  navigating buttons): viable and cheap, but it entrenches two models
  instead of removing one. Only worth doing if this convergence is
  abandoned.
