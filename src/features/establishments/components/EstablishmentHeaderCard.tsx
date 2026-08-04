import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import type { EstablishmentDTO } from '../types';

interface EstablishmentHeaderCardProps {
  establishment: EstablishmentDTO;
  inspectorLabel: string;
  onAddReport: () => void;
  onEdit: () => void;
}

const StatChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statChip}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
  </View>
);

export const EstablishmentHeaderCard: React.FC<EstablishmentHeaderCardProps> = ({
  establishment,
  inspectorLabel,
  onAddReport,
  onEdit,
}) => {
  const location = [establishment.addressLine, establishment.city, establishment.province]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="business" size={19} color={Colors.green} />
        </View>
        <View style={styles.titleInfo}>
          <Text style={styles.name} numberOfLines={2}>{establishment.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={11} color={Colors.green} />
            <Text style={styles.location} numberOfLines={1}>{location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnAddReport} onPress={onAddReport} activeOpacity={0.8}>
          <Ionicons name="add" size={14} color={Colors.textWhite} />
          <Text style={styles.btnAddReportText}>Add Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnEdit} onPress={onEdit} activeOpacity={0.75}>
          <Ionicons name="pencil" size={11} color={Colors.textSecondary} />
          <Text style={styles.btnEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.statGrid}>
        <View style={styles.statRow}>
          <StatChip label="Nature" value={establishment.natureOfBusiness || '—'} />
          <StatChip label="PSIC" value={establishment.psicCode || '—'} />
          <StatChip
            label="Est."
            value={establishment.yearEstablished != null ? String(establishment.yearEstablished) : '—'}
          />
        </View>
        <View style={styles.statRow}>
          <StatChip
            label="Hrs/Day"
            value={establishment.operatingHoursDay != null ? `${establishment.operatingHoursDay} hrs` : '—'}
          />
          <StatChip
            label="Days/Wk"
            value={establishment.operatingDaysWeek != null ? `${establishment.operatingDaysWeek} days` : '—'}
          />
          <StatChip
            label="Days/Yr"
            value={establishment.operatingDaysYear != null ? `${establishment.operatingDaysYear} days` : '—'}
          />
        </View>
      </View>

      <View style={styles.inspectorPill}>
        <Ionicons name="person-circle-outline" size={14} color={Colors.survey.text} />
        <Text style={styles.inspectorText}>
          Inspector: <Text style={styles.inspectorName}>{inspectorLabel}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  location: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  btnAddReport: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.navy,
  },
  btnAddReportText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  btnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnEditText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  statGrid: {
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  inspectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.survey.bg,
    borderWidth: 1,
    borderColor: Colors.survey.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  inspectorText: {
    fontSize: 10,
    color: Colors.survey.badgeText,
  },
  inspectorName: {
    fontWeight: '700',
  },
});
