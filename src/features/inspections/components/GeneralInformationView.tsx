import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { database, collections } from '../../../db/database';
import { FormSection, TextField, SelectField, DateField, DynamicRowTable, focusInput } from '../../../components/form';
import type { DynamicRow } from '../../../components/form';
import { SectionEditActions } from './SectionEditActions';
import { useEditableSection } from '../hooks/useEditableSection';
import { SimpleTable } from './ComplianceReadPrimitives';
import type { EstablishmentSnapshot, PermitSnapshotItem, ProductLineItem } from '../../../services/sync/syncTypes';

interface GeneralInformationViewProps {
  reportId: string;
  snapshot: EstablishmentSnapshot;
  permits: PermitSnapshotItem[];
  onSaved: () => void;
}

const OPERATING_STATUS_OPTIONS = ['Operational', 'Temporarily Close', 'Non-Operational'];

async function patchEstablishmentSnapshot(reportId: string, patch: Partial<EstablishmentSnapshot>) {
  await database.write(async () => {
    const rec = await collections.inspectionReports.find(reportId);
    await rec.update(r => {
      r.establishmentSnapshot = { ...r.establishmentSnapshot, ...patch };
      r.updatedAt = new Date().toISOString();
      r.syncState = 'pending';
    });
  });
}

async function patchPermitsSnapshot(reportId: string, permits: PermitSnapshotItem[]) {
  await database.write(async () => {
    const rec = await collections.inspectionReports.find(reportId);
    await rec.update(r => {
      r.permitsSnapshot = permits;
      r.updatedAt = new Date().toISOString();
      r.syncState = 'pending';
    });
  });
}

// ── Establishment Details ──────────────────────────────────────────────────

interface DetailsFields {
  name: string;
  formerName: string;
  addressLine: string;
  barangay: string;
  city: string;
  province: string;
  geoLat: string;
  geoLng: string;
  natureOfBusiness: string;
  psicCode: string;
  operatingStatus: string;
  operatingHoursDay: string;
  operatingDaysWeek: string;
  operatingDaysYear: string;
}

function toDetailsFields(s: EstablishmentSnapshot): DetailsFields {
  return {
    name: s.name,
    formerName: s.former_name ?? '',
    addressLine: s.address_line,
    barangay: s.barangay,
    city: s.city,
    province: s.province,
    geoLat: s.geo_lat != null ? String(s.geo_lat) : '',
    geoLng: s.geo_lng != null ? String(s.geo_lng) : '',
    natureOfBusiness: s.nature_of_business,
    psicCode: s.psic_code ?? '',
    operatingStatus: s.operating_status,
    operatingHoursDay: s.operating_hours_day != null ? String(s.operating_hours_day) : '',
    operatingDaysWeek: s.operating_days_week != null ? String(s.operating_days_week) : '',
    operatingDaysYear: s.operating_days_year != null ? String(s.operating_days_year) : '',
  };
}

function fromDetailsFields(f: DetailsFields): Partial<EstablishmentSnapshot> {
  return {
    name: f.name,
    former_name: f.formerName.trim() || null,
    address_line: f.addressLine,
    barangay: f.barangay,
    city: f.city,
    province: f.province,
    geo_lat: f.geoLat ? Number(f.geoLat) : null,
    geo_lng: f.geoLng ? Number(f.geoLng) : null,
    nature_of_business: f.natureOfBusiness,
    psic_code: f.psicCode || null,
    operating_status: f.operatingStatus,
    operating_hours_day: f.operatingHoursDay ? Number(f.operatingHoursDay) : null,
    operating_days_week: f.operatingDaysWeek ? Number(f.operatingDaysWeek) : null,
    operating_days_year: f.operatingDaysYear ? Number(f.operatingDaysYear) : null,
  };
}

// ── Key Personnel ────────────────────────────────────────────────────────

interface PersonnelFields {
  ownerName: string;
  managingHeadName: string;
  contactPersonName: string;
  contactPersonPosition: string;
  phoneFax: string;
  email: string;
}

function toPersonnelFields(s: EstablishmentSnapshot): PersonnelFields {
  return {
    ownerName: s.owner_name,
    managingHeadName: s.managing_head_name,
    contactPersonName: s.contact_person_name,
    contactPersonPosition: s.contact_person_position,
    phoneFax: s.phone_fax,
    email: s.email,
  };
}

function fromPersonnelFields(f: PersonnelFields): Partial<EstablishmentSnapshot> {
  return {
    owner_name: f.ownerName,
    managing_head_name: f.managingHeadName,
    contact_person_name: f.contactPersonName,
    contact_person_position: f.contactPersonPosition,
    phone_fax: f.phoneFax,
    email: f.email,
  };
}

// ── Pollution Control Officer ────────────────────────────────────────────

interface PcoFields {
  pcoName: string;
  pcoAccreditationNo: string;
  pcoEffectivity: string;
}

function toPcoFields(s: EstablishmentSnapshot): PcoFields {
  return {
    pcoName: s.pco_name ?? '',
    pcoAccreditationNo: s.pco_accreditation_no ?? '',
    pcoEffectivity: s.pco_effectivity ?? '',
  };
}

function fromPcoFields(f: PcoFields): Partial<EstablishmentSnapshot> {
  return {
    pco_name: f.pcoName || null,
    pco_accreditation_no: f.pcoAccreditationNo || null,
    pco_effectivity: f.pcoEffectivity || null,
  };
}

// ── Product Lines ─────────────────────────────────────────────────────────

function toProductLinesFields(s: EstablishmentSnapshot): DynamicRow[] {
  return s.product_lines.map(p => ({ ...p }));
}

function fromProductLinesFields(rows: DynamicRow[]): Partial<EstablishmentSnapshot> {
  return {
    product_lines: rows
      .filter(r => r.product_line?.trim())
      .map(r => ({
        product_line: r.product_line ?? '',
        ecc_production_rate: r.ecc_production_rate ?? '',
        actual_production_rate: r.actual_production_rate ?? '',
      })) as ProductLineItem[],
  };
}

// ── Permits ───────────────────────────────────────────────────────────────

const emptyPermit = (): PermitSnapshotItem => ({
  envi_law: '',
  permit_type: '',
  permit_serial: '',
  issued_date: '',
  expiry_date: '',
});

const ReadOnlyPermitCard: React.FC<{ permit: PermitSnapshotItem }> = ({ permit }) => (
  <View style={styles.permitCard}>
    <View style={styles.permitCardHeader}>
      <Ionicons name="document-text-outline" size={13} color={Colors.green} />
      <Text style={styles.permitCardTitle} numberOfLines={1}>
        {[permit.envi_law, permit.permit_type].filter(Boolean).join(' — ') || 'Permit'}
      </Text>
    </View>
    <View style={styles.permitRow}>
      <Text style={styles.permitLabel}>Permit / Serial No.</Text>
      <Text style={styles.permitValue} numberOfLines={1}>{permit.permit_serial || '—'}</Text>
    </View>
    <View style={styles.permitRow}>
      <Text style={styles.permitLabel}>Date Issued</Text>
      <Text style={styles.permitValue} numberOfLines={1}>{permit.issued_date || '—'}</Text>
    </View>
    <View style={styles.permitRow}>
      <Text style={styles.permitLabel}>Expiry Date</Text>
      <Text style={styles.permitValue} numberOfLines={1}>{permit.expiry_date || '—'}</Text>
    </View>
  </View>
);

const EditablePermitCard: React.FC<{
  index: number;
  permit: PermitSnapshotItem;
  onChange: (next: PermitSnapshotItem) => void;
  onRemove: () => void;
  onFocusField?: (ref: React.RefObject<TextInput | null>) => void;
}> = ({ index, permit, onChange, onRemove, onFocusField }) => {
  const enviLawRef = useRef<TextInput>(null);
  const permitTypeRef = useRef<TextInput>(null);
  const serialRef = useRef<TextInput>(null);
  const issuedRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);

  return (
    <View style={styles.editCard}>
      <View style={styles.permitCardHeader}>
        <Text style={styles.permitCardTitle}>Permit {index + 1}</Text>
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextField
          ref={enviLawRef}
          label="Environmental Law"
          value={permit.envi_law}
          onChangeText={envi_law => onChange({ ...permit, envi_law })}
          placeholder="e.g. RA 8749"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusInput(permitTypeRef.current)}
          onFocus={() => onFocusField?.(enviLawRef)}
        />
        <TextField
          ref={permitTypeRef}
          label="Permit Type"
          value={permit.permit_type}
          onChangeText={permit_type => onChange({ ...permit, permit_type })}
          placeholder="e.g. Permit to Operate"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusInput(serialRef.current)}
          onFocus={() => onFocusField?.(permitTypeRef)}
        />
      </View>
      <View style={styles.row}>
        <TextField
          ref={serialRef}
          label="Permit / Serial No."
          value={permit.permit_serial}
          onChangeText={permit_serial => onChange({ ...permit, permit_serial })}
          placeholder="Enter permit number"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusInput(issuedRef.current)}
          onFocus={() => onFocusField?.(serialRef)}
        />
      </View>
      <View style={styles.row}>
        <DateField
          ref={issuedRef}
          label="Date Issued"
          value={permit.issued_date}
          onChange={issued_date => onChange({ ...permit, issued_date })}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusInput(expiryRef.current)}
          onFocus={() => onFocusField?.(issuedRef)}
        />
        <DateField
          ref={expiryRef}
          label="Expiry Date"
          value={permit.expiry_date}
          onChange={expiry_date => onChange({ ...permit, expiry_date })}
          returnKeyType="done"
          onFocus={() => onFocusField?.(expiryRef)}
        />
      </View>
    </View>
  );
};

export const GeneralInformationView: React.FC<GeneralInformationViewProps> = ({
  reportId,
  snapshot,
  permits,
  onSaved,
}) => {
  const formerNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const barangayRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const provinceRef = useRef<TextInput>(null);
  const natureRef = useRef<TextInput>(null);
  const psicRef = useRef<TextInput>(null);
  const latRef = useRef<TextInput>(null);
  const lngRef = useRef<TextInput>(null);
  const hoursRef = useRef<TextInput>(null);
  const daysWeekRef = useRef<TextInput>(null);
  const daysYearRef = useRef<TextInput>(null);
  const ownerRef = useRef<TextInput>(null);
  const headRef = useRef<TextInput>(null);
  const contactRef = useRef<TextInput>(null);
  const contactPositionRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pcoAccredRef = useRef<TextInput>(null);

  const details = useEditableSection<DetailsFields>({
    value: toDetailsFields(snapshot),
    onSave: async fields => {
      await patchEstablishmentSnapshot(reportId, fromDetailsFields(fields));
      onSaved();
    },
  });

  const personnel = useEditableSection<PersonnelFields>({
    value: toPersonnelFields(snapshot),
    onSave: async fields => {
      await patchEstablishmentSnapshot(reportId, fromPersonnelFields(fields));
      onSaved();
    },
  });

  const pco = useEditableSection<PcoFields>({
    value: toPcoFields(snapshot),
    onSave: async fields => {
      await patchEstablishmentSnapshot(reportId, fromPcoFields(fields));
      onSaved();
    },
  });

  const productLines = useEditableSection<DynamicRow[]>({
    value: toProductLinesFields(snapshot),
    onSave: async rows => {
      await patchEstablishmentSnapshot(reportId, fromProductLinesFields(rows));
      onSaved();
    },
  });

  const permitsSection = useEditableSection<PermitSnapshotItem[]>({
    value: permits,
    onSave: async next => {
      await patchPermitsSnapshot(reportId, next);
      onSaved();
    },
  });

  const updatePermitAt = (index: number, next: PermitSnapshotItem) => {
    const rows = permitsSection.draft.slice();
    rows[index] = next;
    permitsSection.setDraft(rows);
  };
  const removePermitAt = (index: number) => {
    permitsSection.setDraft(permitsSection.draft.filter((_, i) => i !== index));
  };
  const addPermit = () => permitsSection.setDraft([...permitsSection.draft, emptyPermit()]);

  return (
    <View>
      <FormSection
        icon="business-outline"
        title="Establishment Details"
        headerRight={
          <SectionEditActions
            editing={details.editing}
            saving={details.saving}
            onStartEdit={details.startEdit}
            onCancel={details.cancel}
            onSave={details.save}
          />
        }>
        <View style={styles.row}>
          <TextField label="Establishment Name" value={details.draft.name} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, name: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(formerNameRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={formerNameRef} label="Former Establishment Name" value={details.draft.formerName} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, formerName: v }))} placeholder="—" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(addressRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={addressRef} label="Address" value={details.draft.addressLine} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, addressLine: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(barangayRef.current)} />
          <TextField ref={barangayRef} label="Barangay" value={details.draft.barangay} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, barangay: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(cityRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={cityRef} label="City / Municipality" value={details.draft.city} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, city: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(provinceRef.current)} />
          <TextField ref={provinceRef} label="Province" value={details.draft.province} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, province: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(natureRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={natureRef} label="Nature of Business" value={details.draft.natureOfBusiness} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, natureOfBusiness: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(psicRef.current)} />
          <TextField ref={psicRef} label="PSIC Code" value={details.draft.psicCode} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, psicCode: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(latRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={latRef} label="Latitude" value={details.draft.geoLat} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, geoLat: v }))} keyboardType="numeric" placeholder="e.g. 11.144" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(lngRef.current)} />
          <TextField ref={lngRef} label="Longitude" value={details.draft.geoLng} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, geoLng: v }))} keyboardType="numeric" placeholder="e.g. 119.395" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(hoursRef.current)} />
        </View>
        <View style={styles.row}>
          {details.editing ? (
            <SelectField
              label="Status of Operation"
              value={details.draft.operatingStatus}
              options={OPERATING_STATUS_OPTIONS}
              onSelect={v => details.setDraft(d => ({ ...d, operatingStatus: v }))}
            />
          ) : (
            <TextField label="Status of Operation" value={details.draft.operatingStatus} readOnly />
          )}
        </View>
        <View style={styles.row3}>
          <TextField ref={hoursRef} label="Operating Hours/Day" value={details.draft.operatingHoursDay} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, operatingHoursDay: v }))} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(daysWeekRef.current)} />
          <TextField ref={daysWeekRef} label="Operating Days/Week" value={details.draft.operatingDaysWeek} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, operatingDaysWeek: v }))} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(daysYearRef.current)} />
          <TextField ref={daysYearRef} label="Operating Days/Year" value={details.draft.operatingDaysYear} readOnly={!details.editing} onChangeText={v => details.setDraft(d => ({ ...d, operatingDaysYear: v }))} keyboardType="numeric" returnKeyType="done" />
        </View>
        {details.error && <Text style={styles.errorText}>{details.error}</Text>}
      </FormSection>

      <FormSection
        icon="person-outline"
        title="Key Personnel"
        headerRight={
          <SectionEditActions
            editing={personnel.editing}
            saving={personnel.saving}
            onStartEdit={personnel.startEdit}
            onCancel={personnel.cancel}
            onSave={personnel.save}
          />
        }>
        <View style={styles.row}>
          <TextField ref={ownerRef} label="Owner" value={personnel.draft.ownerName} readOnly={!personnel.editing} onChangeText={v => personnel.setDraft(d => ({ ...d, ownerName: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(headRef.current)} />
          <TextField ref={headRef} label="Managing Head / Plant Manager" value={personnel.draft.managingHeadName} readOnly={!personnel.editing} onChangeText={v => personnel.setDraft(d => ({ ...d, managingHeadName: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(contactRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={contactRef} label="Contact Person" value={personnel.draft.contactPersonName} readOnly={!personnel.editing} onChangeText={v => personnel.setDraft(d => ({ ...d, contactPersonName: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(contactPositionRef.current)} />
          <TextField ref={contactPositionRef} label="Contact Person Position" value={personnel.draft.contactPersonPosition} readOnly={!personnel.editing} onChangeText={v => personnel.setDraft(d => ({ ...d, contactPersonPosition: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(phoneRef.current)} />
        </View>
        <View style={styles.row}>
          <TextField ref={phoneRef} label="Phone / Fax" value={personnel.draft.phoneFax} readOnly={!personnel.editing} onChangeText={v => personnel.setDraft(d => ({ ...d, phoneFax: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(emailRef.current)} />
          <TextField ref={emailRef} label="Email Address" value={personnel.draft.email} readOnly={!personnel.editing} onChangeText={v => personnel.setDraft(d => ({ ...d, email: v }))} keyboardType="email-address" returnKeyType="done" />
        </View>
        {personnel.error && <Text style={styles.errorText}>{personnel.error}</Text>}
      </FormSection>

      <FormSection
        icon="leaf-outline"
        title="Pollution Control Officer"
        headerRight={
          <SectionEditActions
            editing={pco.editing}
            saving={pco.saving}
            onStartEdit={pco.startEdit}
            onCancel={pco.cancel}
            onSave={pco.save}
          />
        }>
        <View style={styles.row}>
          <TextField label="PCO Full Name" value={pco.draft.pcoName} readOnly={!pco.editing} onChangeText={v => pco.setDraft(d => ({ ...d, pcoName: v }))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => focusInput(pcoAccredRef.current)} />
          <TextField ref={pcoAccredRef} label="PCO Accreditation No." value={pco.draft.pcoAccreditationNo} readOnly={!pco.editing} onChangeText={v => pco.setDraft(d => ({ ...d, pcoAccreditationNo: v }))} returnKeyType="done" />
        </View>
        <View style={styles.row}>
          {pco.editing ? (
            <DateField
              label="PCO Accreditation Effectivity"
              value={pco.draft.pcoEffectivity}
              onChange={v => pco.setDraft(d => ({ ...d, pcoEffectivity: v }))}
            />
          ) : (
            <TextField label="PCO Accreditation Effectivity" value={pco.draft.pcoEffectivity || '—'} readOnly />
          )}
        </View>
        {pco.error && <Text style={styles.errorText}>{pco.error}</Text>}
      </FormSection>

      <FormSection
        icon="cube-outline"
        title="Product Lines"
        headerRight={
          <SectionEditActions
            editing={productLines.editing}
            saving={productLines.saving}
            onStartEdit={productLines.startEdit}
            onCancel={productLines.cancel}
            onSave={productLines.save}
          />
        }>
        {productLines.editing ? (
          <DynamicRowTable
            columns={[
              { key: 'product_line', label: 'Product Line', width: 160, placeholder: 'e.g. Beer Production' },
              { key: 'ecc_production_rate', label: 'Declared Rate', width: 100, type: 'number', placeholder: '0' },
              { key: 'actual_production_rate', label: 'Actual Rate', width: 100, type: 'number', placeholder: '0' },
            ]}
            rows={productLines.draft}
            onChange={rows => productLines.setDraft(rows)}
            addLabel="+ Add Product Line"
          />
        ) : (
          <SimpleTable
            columns={[
              { key: 'product_line', label: 'Product Line' },
              { key: 'ecc_production_rate', label: 'Declared Rate' },
              { key: 'actual_production_rate', label: 'Actual Rate' },
            ]}
            rows={productLines.draft}
          />
        )}
        {productLines.error && <Text style={styles.errorText}>{productLines.error}</Text>}
      </FormSection>

      <FormSection
        icon="document-outline"
        title="DENR Permits, Licenses & Clearances"
        headerRight={
          <SectionEditActions
            editing={permitsSection.editing}
            saving={permitsSection.saving}
            onStartEdit={permitsSection.startEdit}
            onCancel={permitsSection.cancel}
            onSave={permitsSection.save}
          />
        }>
        {permitsSection.draft.length === 0 && (
          <Text style={styles.emptyText}>No permits on record for this report.</Text>
        )}
        <View style={permitsSection.editing ? undefined : styles.permitList}>
          {permitsSection.draft.map((permit, i) =>
            permitsSection.editing ? (
              <EditablePermitCard
                key={i}
                index={i}
                permit={permit}
                onChange={next => updatePermitAt(i, next)}
                onRemove={() => removePermitAt(i)}
              />
            ) : (
              <ReadOnlyPermitCard key={i} permit={permit} />
            ),
          )}
        </View>
        {permitsSection.editing && (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={addPermit}>
            <Ionicons name="add" size={13} color={Colors.green} />
            <Text style={styles.addBtnText}>+ Add Permit</Text>
          </TouchableOpacity>
        )}
        {permitsSection.error && <Text style={styles.errorText}>{permitsSection.error}</Text>}
      </FormSection>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  row3: {
    flexDirection: 'row',
    gap: 14,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 11.5,
    color: Colors.conflict,
    marginTop: -4,
    marginBottom: 8,
  },
  permitList: {
    gap: 12,
  },
  permitCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  editCard: {
    backgroundColor: Colors.bgMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  permitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  permitCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  permitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  permitLabel: {
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  permitValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: Colors.greenLight,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
  },
});
