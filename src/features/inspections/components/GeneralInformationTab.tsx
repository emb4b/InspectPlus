import React, { useRef } from 'react';
import { View, Text, Switch, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import {
  FormSection,
  TextField,
  SelectField,
  DateField,
  DynamicRowTable,
  focusInput,
} from '../../../components/form';
import { PROVINCE_OPTIONS, getCityOptions, getBarangayOptions } from '../../../constants/provinces';
import { maskFlexibleDate, isValidFlexibleDate, FLEXIBLE_DATE_HINT, FLEXIBLE_DATE_INVALID_HINT } from '../../../utils/flexibleDate';
import type { GeneralInfoFormState } from '../types';
import type { PermitSnapshotItem } from '../../../services/sync/syncTypes';

const OPERATING_STATUS_OPTIONS = ['Operational', 'Temporarily Close', 'Non-Operational'];

const emptyPermit = (): PermitSnapshotItem => ({
  envi_law: '',
  permit_type: '',
  permit_serial: '',
  issued_date: '',
  expiry_date: '',
});

interface GeneralInformationTabProps {
  value: GeneralInfoFormState;
  onChange: (value: GeneralInfoFormState) => void;
}

const PermitCard: React.FC<{
  index: number;
  permit: PermitSnapshotItem;
  onChange: (next: PermitSnapshotItem) => void;
  onRemove: () => void;
  onFocusField?: (ref: React.RefObject<TextInput | null>) => void;
}> = ({ index, permit, onChange, onRemove, onFocusField }) => {
  const enviLawRef = useRef<TextInput>(null);
  const permitTypeRef = useRef<TextInput>(null);
  const serialRef = useRef<TextInput>(null);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderText}>Permit {index + 1}</Text>
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
          textCase="upper"
          placeholder="Enter permit number"
          returnKeyType="done"
          onFocus={() => onFocusField?.(serialRef)}
        />
      </View>
      <View style={styles.row}>
        <DateField
          label="Date Issued"
          value={permit.issued_date}
          onChange={issued_date => onChange({ ...permit, issued_date })}
        />
        <DateField
          label="Expiry Date"
          value={permit.expiry_date}
          onChange={expiry_date => onChange({ ...permit, expiry_date })}
        />
      </View>
    </View>
  );
};

export const GeneralInformationTab: React.FC<GeneralInformationTabProps> = ({
  value,
  onChange,
}) => {
  // Establishment Details → Key Personnel → PCO, in visual order. The
  // Establishment Name field is read-only (pre-filled) so it's skipped —
  // it can't take focus. SelectField (Status of Operation) opens a picker
  // rather than accepting typed input, so it's skipped too; the field
  // before it hands off straight to the field after.
  const formerNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const natureRef = useRef<TextInput>(null);
  const psicRef = useRef<TextInput>(null);
  const latRef = useRef<TextInput>(null);
  const lngRef = useRef<TextInput>(null);
  const hoursRef = useRef<TextInput>(null);
  const daysWeekRef = useRef<TextInput>(null);
  const daysYearRef = useRef<TextInput>(null);
  const sinceRef = useRef<TextInput>(null);
  const ownerRef = useRef<TextInput>(null);
  const headRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactPositionRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pcoNameRef = useRef<TextInput>(null);
  const pcoAccredRef = useRef<TextInput>(null);

  const isNonOperational = value.operatingStatus !== 'Operational';

  const updatePermitAt = (index: number, next: PermitSnapshotItem) => {
    const denrPermits = value.denrPermits.slice();
    denrPermits[index] = next;
    onChange({ ...value, denrPermits });
  };

  const removePermitAt = (index: number) => {
    onChange({ ...value, denrPermits: value.denrPermits.filter((_, i) => i !== index) });
  };

  const addPermit = () => {
    onChange({ ...value, denrPermits: [...value.denrPermits, emptyPermit()] });
  };

  return (
    <View>
      <FormSection icon="business-outline" title="Establishment Details">
        <View style={styles.row}>
          <TextField
            label="Establishment Name"
            value={value.name}
            onChangeText={name => onChange({ ...value, name })}
            textCase="upper"
            required
            readOnly
            hint="Pre-filled from the establishment master record"
          />
        </View>
        <View style={styles.switchRow}>
          <Switch
            value={value.includeFormerName}
            onValueChange={includeFormerName => onChange({ ...value, includeFormerName })}
            trackColor={{ false: Colors.border, true: Colors.greenLight }}
            thumbColor={Colors.white}
          />
          <Text style={styles.switchLabel}>Include former establishment name</Text>
        </View>
        {value.includeFormerName && (
          <View style={styles.row}>
            <TextField
              ref={formerNameRef}
              label="Former Establishment Name"
              value={value.formerName}
              onChangeText={formerName => onChange({ ...value, formerName })}
              textCase="upper"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(addressRef.current)}

            />
          </View>
        )}
        <View style={styles.row}>
          <TextField
            ref={addressRef}
            label="Address"
            value={value.addressLine}
            onChangeText={addressLine => onChange({ ...value, addressLine })}
            placeholder="Street / building / lot no. (if known)"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(natureRef.current)}

          />
        </View>
        <View style={styles.row}>
          <SelectField
            label="Province"
            value={value.province}
            options={PROVINCE_OPTIONS}
            onSelect={province => onChange({ ...value, province, city: '', barangay: '' })}
            required
          />
          <SelectField
            label="City / Municipality"
            value={value.city}
            options={getCityOptions(value.province)}
            onSelect={city => onChange({ ...value, city, barangay: '' })}
            placeholder={value.province ? 'Select…' : 'Select province first'}
            disabled={!value.province}
            required
          />
        </View>
        <View style={styles.row}>
          <SelectField
            label="Barangay"
            value={value.barangay}
            options={getBarangayOptions(value.province, value.city)}
            onSelect={barangay => onChange({ ...value, barangay })}
            placeholder={value.city ? 'Select…' : 'Select city/municipality first'}
            disabled={!value.city}
            required
          />
        </View>
        <View style={styles.row}>
          <TextField
            ref={natureRef}
            label="Nature of Business"
            value={value.natureOfBusiness}
            onChangeText={natureOfBusiness => onChange({ ...value, natureOfBusiness })}
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(psicRef.current)}

          />
          <TextField
            ref={psicRef}
            label="PSIC Code"
            value={value.psicCode}
            onChangeText={psicCode => onChange({ ...value, psicCode })}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(latRef.current)}

          />
        </View>
        <View style={styles.row}>
          <TextField
            ref={latRef}
            label="Latitude"
            value={value.geoLat}
            onChangeText={geoLat => onChange({ ...value, geoLat })}
            keyboardType="numeric"
            placeholder="e.g. 11.144"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(lngRef.current)}

          />
          <TextField
            ref={lngRef}
            label="Longitude"
            value={value.geoLng}
            onChangeText={geoLng => onChange({ ...value, geoLng })}
            keyboardType="numeric"
            placeholder="e.g. 119.395"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(isNonOperational ? sinceRef.current : hoursRef.current)}

          />
        </View>
        <View style={styles.row}>
          <SelectField
            label="Status of Operation"
            value={value.operatingStatus}
            options={OPERATING_STATUS_OPTIONS}
            onSelect={operatingStatus => onChange({ ...value, operatingStatus })}
            required
          />
        </View>
        {isNonOperational ? (
          <View style={styles.row}>
            <TextField
              ref={sinceRef}
              label="Closed / Non-Operational Since"
              value={value.operatingStatusSince}
              onChangeText={raw => onChange({ ...value, operatingStatusSince: maskFlexibleDate(raw) })}
              textCase="none"
              placeholder="mm-dd-yyyy, mm-yyyy, or yyyy"
              hint={isValidFlexibleDate(value.operatingStatusSince) ? FLEXIBLE_DATE_HINT : FLEXIBLE_DATE_INVALID_HINT}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(ownerRef.current)}
            />
          </View>
        ) : (
          <View style={styles.row3}>
            <TextField
              ref={hoursRef}
              label="Operating Hours/Day"
              value={value.operatingHoursDay}
              onChangeText={operatingHoursDay => onChange({ ...value, operatingHoursDay })}
              keyboardType="numeric"
              placeholder="e.g. 8"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(daysWeekRef.current)}

            />
            <TextField
              ref={daysWeekRef}
              label="Operating Days/Week"
              value={value.operatingDaysWeek}
              onChangeText={operatingDaysWeek => onChange({ ...value, operatingDaysWeek })}
              keyboardType="numeric"
              placeholder="e.g. 5"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(daysYearRef.current)}

            />
            <TextField
              ref={daysYearRef}
              label="Operating Days/Year"
              value={value.operatingDaysYear}
              onChangeText={operatingDaysYear => onChange({ ...value, operatingDaysYear })}
              keyboardType="numeric"
              placeholder="e.g. 260"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(ownerRef.current)}

            />
          </View>
        )}
      </FormSection>

      <FormSection icon="person-outline" title="Key Personnel">
        <View style={styles.row}>
          <TextField
            ref={ownerRef}
            label="Owner"
            value={value.ownerName}
            onChangeText={ownerName => onChange({ ...value, ownerName })}
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(headRef.current)}

          />
          <TextField
            ref={headRef}
            label="Managing Head / Plant Manager"
            value={value.managingHeadName}
            onChangeText={managingHeadName => onChange({ ...value, managingHeadName })}
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(contactNameRef.current)}

          />
        </View>
        <View style={styles.row}>
          <TextField
            ref={contactNameRef}
            label="Contact Person"
            value={value.contactPersonName}
            onChangeText={contactPersonName => onChange({ ...value, contactPersonName })}
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(contactPositionRef.current)}

          />
          <TextField
            ref={contactPositionRef}
            label="Contact Person Position"
            value={value.contactPersonPosition}
            onChangeText={contactPersonPosition => onChange({ ...value, contactPersonPosition })}
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(phoneRef.current)}

          />
        </View>
        <View style={styles.row}>
          <TextField
            ref={phoneRef}
            label="Phone / Fax"
            value={value.phoneFax}
            onChangeText={phoneFax => onChange({ ...value, phoneFax })}
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(emailRef.current)}

          />
          <TextField
            ref={emailRef}
            label="Email Address"
            value={value.email}
            onChangeText={email => onChange({ ...value, email })}
            textCase="none"
            keyboardType="email-address"
            required
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(pcoNameRef.current)}

          />
        </View>
      </FormSection>

      <FormSection icon="leaf-outline" title="Pollution Control Officer">
        <View style={styles.row}>
          <TextField
            ref={pcoNameRef}
            label="PCO Full Name"
            value={value.pcoName}
            onChangeText={pcoName => onChange({ ...value, pcoName })}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusInput(pcoAccredRef.current)}

          />
          <TextField
            ref={pcoAccredRef}
            label="PCO Accreditation No."
            value={value.pcoAccreditationNo}
            onChangeText={pcoAccreditationNo => onChange({ ...value, pcoAccreditationNo })}
            returnKeyType="done"

          />
        </View>
        <View style={styles.row}>
          <DateField
            label="PCO Accreditation Effectivity"
            value={value.pcoEffectivity}
            onChange={pcoEffectivity => onChange({ ...value, pcoEffectivity })}
          />
        </View>
      </FormSection>

      <FormSection icon="cube-outline" title="Product Lines">
        <DynamicRowTable
          columns={[
            { key: 'product_line', label: 'Product Line', width: 160, placeholder: 'e.g. Beer Production' },
            { key: 'ecc_production_rate', label: 'Declared Rate', width: 100, type: 'number', placeholder: '0' },
            { key: 'actual_production_rate', label: 'Actual Rate', width: 100, type: 'number', placeholder: '0' },
          ]}
          rows={value.productLines}
          onChange={productLines => onChange({ ...value, productLines })}
          addLabel="+ Add Product Line"
        />
      </FormSection>

      <FormSection icon="document-outline" title="DENR Permits, Licenses & Clearances">
        {value.denrPermits.length === 0 && (
          <Text style={styles.emptyText}>No permits on record yet.</Text>
        )}
        {value.denrPermits.map((permit, index) => (
          <PermitCard
            key={index}
            index={index}
            permit={permit}
            onChange={next => updatePermitAt(index, next)}
            onRemove={() => removePermitAt(index)}
          />
        ))}
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={addPermit}>
          <Ionicons name="add" size={13} color={Colors.green} />
          <Text style={styles.addBtnText}>+ Add Permit</Text>
        </TouchableOpacity>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.bgMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
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
