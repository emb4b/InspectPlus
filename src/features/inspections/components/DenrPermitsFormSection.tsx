import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { FormSection, TextField, DateField, focusInput } from '../../../components/form';
import type { PermitSnapshotItem } from '../../../services/sync/syncTypes';

const emptyPermit = (): PermitSnapshotItem => ({
  envi_law: '',
  permit_type: '',
  permit_serial: '',
  issued_date: '',
  expiry_date: '',
});

const PermitCard: React.FC<{
  index: number;
  permit: PermitSnapshotItem;
  onChange: (next: PermitSnapshotItem) => void;
  onRemove: () => void;
}> = ({ index, permit, onChange, onRemove }) => {
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
          label="Environmental Law"
          value={permit.envi_law}
          onChangeText={envi_law => onChange({ ...permit, envi_law })}
          placeholder="e.g. RA 8749"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focusInput(permitTypeRef.current)}
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

interface DenrPermitsFormSectionProps {
  value: PermitSnapshotItem[];
  onChange: (value: PermitSnapshotItem[]) => void;
}

// The "3. Compliance Status" section's content for water reports —
// pulled out of GeneralInformationTab so it can render under its own tab
// instead of inside General Information. See waterReportTabs.ts.
export const DenrPermitsFormSection: React.FC<DenrPermitsFormSectionProps> = ({ value, onChange }) => {
  const updatePermitAt = (index: number, next: PermitSnapshotItem) => {
    const denrPermits = value.slice();
    denrPermits[index] = next;
    onChange(denrPermits);
  };

  const removePermitAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addPermit = () => {
    onChange([...value, emptyPermit()]);
  };

  return (
    <FormSection icon="document-outline" title="DENR Permits, Licenses & Clearances">
      {value.length === 0 && <Text style={styles.emptyText}>No permits on record yet.</Text>}
      {value.map((permit, index) => (
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
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
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
