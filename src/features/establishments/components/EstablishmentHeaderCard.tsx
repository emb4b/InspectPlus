import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { confirmResolveConflict } from '../../../services/sync/syncConflictResolution';
import type { EstablishmentDTO } from '../types';

interface EstablishmentHeaderCardProps {
  establishment: EstablishmentDTO;
  inspectorLabel: string;
  onAddReport: () => void;
  // Omitted for an establishment the current inspector doesn't own — it's
  // now visible to any inspector in the same jurisdiction, but only the
  // owner may edit it, so the Edit button doesn't render at all otherwise.
  onEdit?: () => void;
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

  // Icon box grows to match the combined height of the name + address (not
  // the sync row, which is conditional and would make the box size jump
  // around) — measured once on first layout and locked in, so it reads as
  // a logo spanning the title block rather than a small fixed square next
  // to two lines of wrapped text. Width tracks height 1:1 to stay square,
  // and the glyph scales with it at its original ~1:2 ratio (19/40).
  const [titleBlockHeight, setTitleBlockHeight] = useState<number | null>(null);
  const titleBlockMeasured = useRef(false);
  const handleTitleBlockLayout = (e: LayoutChangeEvent) => {
    if (titleBlockMeasured.current) return;
    titleBlockMeasured.current = true;
    setTitleBlockHeight(e.nativeEvent.layout.height);
  };
  const iconSize = titleBlockHeight ?? 40;
  const iconGlyphSize = Math.round(iconSize * 0.475);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { width: iconSize, height: iconSize }]}>
          <Ionicons name="business" size={iconGlyphSize} color={Colors.green} />
        </View>
        <View style={styles.titleInfo}>
          <View onLayout={handleTitleBlockLayout}>
            <Text style={styles.name} numberOfLines={2}>{establishment.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={11} color={Colors.green} style={styles.locationIcon} />
              <Text style={styles.location} numberOfLines={1}>{location}</Text>
            </View>
          </View>
          {establishment.syncStatus === 'pending' && (
            <View style={styles.syncRow}>
              <Ionicons name="cloud-upload-outline" size={10} color={Colors.pending} />
              <Text style={styles.syncText}>Pending sync</Text>
            </View>
          )}
          {establishment.syncStatus === 'conflict' && (
            <TouchableOpacity
              style={styles.syncRow}
              onPress={() => confirmResolveConflict('establishments', establishment.estabId, establishment.name)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
              <Text style={[styles.syncText, { color: Colors.conflict }]}>Sync conflict</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnAddReport} onPress={onAddReport} activeOpacity={0.8}>
          <Ionicons name="add" size={14} color={Colors.textWhite} />
          <Text style={styles.btnAddReportText}>Add Report</Text>
        </TouchableOpacity>
        {onEdit && (
          <TouchableOpacity style={styles.btnEdit} onPress={onEdit} activeOpacity={0.75}>
            <Ionicons name="pencil" size={11} color={Colors.textSecondary} />
            <Text style={styles.btnEditText}>Edit</Text>
          </TouchableOpacity>
        )}
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
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 3,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height instead of its full line-height box.
  locationIcon: {
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  syncText: {
    fontSize: 10,
    color: Colors.pending,
    fontWeight: '600',
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
