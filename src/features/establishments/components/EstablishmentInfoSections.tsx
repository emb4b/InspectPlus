import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { FormSection, TextField } from '../../../components/form';
import type { EstablishmentDTO, PermitSnapshotItem } from '../types';

interface EstablishmentInfoSectionsProps {
  establishment: EstablishmentDTO;
  onUpdatePermits: () => void;
}

// denrPermits is a flat array of freeform entries — one card per entry,
// matching how the report form's General Information tab
// (GeneralInformationTab.tsx) edits this same array.
const PermitCard: React.FC<{ permit: PermitSnapshotItem }> = ({ permit }) => (
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

export const EstablishmentInfoSections: React.FC<EstablishmentInfoSectionsProps> = ({
  establishment,
  onUpdatePermits,
}) => {
  const permits = establishment.denrPermits;

  return (
    <View>
      <FormSection icon="person-outline" title="Key Personnel">
        <View style={styles.row}>
          <TextField label="Managing Head" value={establishment.managingHeadName || '—'} readOnly />
          <TextField label="PCO Name" value={establishment.pcoName || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="PCO Accreditation No." value={establishment.pcoAccreditationNo || '—'} readOnly />
          <TextField label="PCO Accreditation Effectivity" value={establishment.pcoEffectivity || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="Contact Person" value={establishment.contactPersonName || '—'} readOnly />
          <TextField label="Contact Position" value={establishment.contactPersonPosition || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="Phone/Fax" value={establishment.phoneFax || '—'} readOnly />
          <TextField label="Email" value={establishment.email || '—'} readOnly />
        </View>
      </FormSection>

      <FormSection icon="cube-outline" title="Product Lines">
        {establishment.productLines.length === 0 ? (
          <Text style={styles.emptyText}>No product lines on record.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colProduct]}>Product Line</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>Declared Rate</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>Actual Rate</Text>
            </View>
            {establishment.productLines.map((line, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colProduct]} numberOfLines={1}>
                  {line.product_line || '—'}
                </Text>
                <Text style={[styles.tableCell, styles.colRate]}>{line.ecc_production_rate || '—'}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>{line.actual_production_rate || '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </FormSection>

      <FormSection
        icon="document-outline"
        title="DENR Permits, Licenses & Clearances"
        headerRight={
          <TouchableOpacity style={styles.updateBtn} onPress={onUpdatePermits} activeOpacity={0.75}>
            <Ionicons name="pencil" size={11} color={Colors.textSecondary} />
            <Text style={styles.updateBtnText}>Update Permits</Text>
          </TouchableOpacity>
        }>
        {permits.length === 0 ? (
          <Text style={styles.emptyText}>No permits on record.</Text>
        ) : (
          <View style={styles.permitList}>
            {permits.map((permit, i) => (
              <PermitCard key={i} permit={permit} />
            ))}
          </View>
        )}
      </FormSection>
    </View>
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
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgMuted,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableCell: {
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  colProduct: {
    flex: 2,
  },
  colRate: {
    flex: 1,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  updateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  permitList: {
    gap: 12,
  },
  permitCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  permitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
