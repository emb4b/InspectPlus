import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { FormSection, TextField } from '../../../components/form';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import type { EstablishmentDTO, PermitSnapshotItem } from '../types';

interface EstablishmentInfoSectionsProps {
  establishment: EstablishmentDTO;
  // Omitted for an establishment the current inspector doesn't own — see
  // EstablishmentHeaderCard's onEdit.
  onUpdatePermits?: () => void;
}

// denrPermits is a flat array of freeform entries — one card per entry,
// matching how the report form's General Information tab
// (GeneralInformationTab.tsx) edits this same array.
const PermitCard: React.FC<{ permit: PermitSnapshotItem }> = ({ permit }) => (
  <View style={styles.permitCard}>
    <View style={styles.permitCardHeader}>
      <Ionicons name="document-text-outline" size={13} color={Colors.green} />
      <AppText
        variant="marquee"
        text={[permit.envi_law, permit.permit_type].filter(Boolean).join(' — ') || 'Permit'}
        style={styles.permitCardTitle}
        containerStyle={styles.permitCardTitleContainer}
      />
    </View>
    <View style={styles.permitRow}>
      <Text style={styles.permitLabel}>Permit / Serial No.</Text>
      <AppText variant="marquee" text={permit.permit_serial || '—'} style={styles.permitValue} containerStyle={styles.permitValueContainer} />
    </View>
    <View style={styles.permitRow}>
      <Text style={styles.permitLabel}>Date Issued</Text>
      <AppText variant="single" text={permit.issued_date || '—'} style={styles.permitValue} containerStyle={styles.permitValueContainer} />
    </View>
    <View style={styles.permitRow}>
      <Text style={styles.permitLabel}>Expiry Date</Text>
      <AppText variant="single" text={permit.expiry_date || '—'} style={styles.permitValue} containerStyle={styles.permitValueContainer} />
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
      <FormSection icon="business-outline" title="Establishment Details">
        <View style={styles.row}>
          <TextField label="Establishment Name" value={establishment.name || '—'} readOnly />
          <TextField label="Former Establishment Name" value={establishment.formerName || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="Address" value={establishment.addressLine || '—'} readOnly />
          <TextField label="Barangay" value={establishment.barangay || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="City / Municipality" value={establishment.city || '—'} readOnly />
          <TextField label="Province" value={establishment.province || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="Nature of Business" value={establishment.natureOfBusiness || '—'} readOnly />
          <TextField label="PSIC Code" value={establishment.psicCode || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField
            label="Latitude"
            value={establishment.geoLat != null ? String(establishment.geoLat) : '—'}
            readOnly
          />
          <TextField
            label="Longitude"
            value={establishment.geoLng != null ? String(establishment.geoLng) : '—'}
            readOnly
          />
        </View>
        <View style={styles.row}>
          <TextField label="Status of Operation" value={establishment.operatingStatus || '—'} readOnly />
        </View>
        {establishment.operatingStatus !== 'Operational' ? (
          <View style={styles.row}>
            <TextField label="Closed / Non-Operational Since" value={establishment.operatingStatusSince || '—'} readOnly />
          </View>
        ) : (
          <View style={styles.row3}>
            <TextField
              label="Operating Hours/Day"
              value={establishment.operatingHoursDay != null ? String(establishment.operatingHoursDay) : '—'}
              readOnly
            />
            <TextField
              label="Operating Days/Week"
              value={establishment.operatingDaysWeek != null ? String(establishment.operatingDaysWeek) : '—'}
              readOnly
            />
            <TextField
              label="Operating Days/Year"
              value={establishment.operatingDaysYear != null ? String(establishment.operatingDaysYear) : '—'}
              readOnly
            />
          </View>
        )}
      </FormSection>

      <FormSection icon="person-outline" title="Key Personnel">
        <View style={styles.row}>
          <TextField label="Owner" value={establishment.ownerName || '—'} readOnly />
          <TextField label="Managing Head / Plant Manager" value={establishment.managingHeadName || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="Contact Person" value={establishment.contactPersonName || '—'} readOnly />
          <TextField label="Contact Person Position" value={establishment.contactPersonPosition || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="Phone / Fax" value={establishment.phoneFax || '—'} readOnly />
          <TextField label="Email Address" value={establishment.email || '—'} readOnly />
        </View>
      </FormSection>

      <FormSection icon="leaf-outline" title="Pollution Control Officer">
        <View style={styles.row}>
          <TextField label="PCO Full Name" value={establishment.pcoName || '—'} readOnly />
          <TextField label="PCO Accreditation No." value={establishment.pcoAccreditationNo || '—'} readOnly />
        </View>
        <View style={styles.row}>
          <TextField label="PCO Accreditation Effectivity" value={establishment.pcoEffectivity || '—'} readOnly />
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
                <AppText
                  variant="marquee"
                  text={line.product_line || '—'}
                  style={styles.tableCell}
                  containerStyle={styles.colProduct}
                />
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
          onUpdatePermits && (
            <Button label="Update Permits" icon="pencil" variant="outline" onPress={onUpdatePermits} />
          )
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
  row3: {
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
  permitCardTitleContainer: {
    flexShrink: 1,
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
    textAlign: 'right',
  },
  permitValueContainer: {
    flexShrink: 1,
  },
});
