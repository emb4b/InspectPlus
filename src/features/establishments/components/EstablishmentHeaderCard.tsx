import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { formatEstablishmentLocation } from '../../../utils/establishmentLocation';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
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

// Most of these stats (PSIC code, year, hours/days) are short by
// construction — only "Nature" (free-text business description) can
// genuinely run long, so it's the only one callers opt into marquee.
const StatChip: React.FC<{ label: string; value: string; marquee?: boolean }> = ({ label, value, marquee }) => (
  <View style={styles.statChip}>
    <Text style={styles.statLabel}>{label}</Text>
    <AppText variant={marquee ? 'marquee' : 'single'} text={value} style={styles.statValue} />
  </View>
);

export const EstablishmentHeaderCard: React.FC<EstablishmentHeaderCardProps> = ({
  establishment,
  inspectorLabel,
  onAddReport,
  onEdit,
}) => {
  const location = formatEstablishmentLocation(establishment);

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
      {/* Hidden until the title block's height is measured, so the icon
          appears at its final size instead of visibly popping from the 40
          default to the measured size once layout settles. */}
      <View style={[styles.topRow, titleBlockHeight === null && styles.topRowMeasuring]}>
        <View style={[styles.iconWrap, { width: iconSize, height: iconSize }]}>
          <Ionicons name="business" size={iconGlyphSize} color={Colors.green} />
        </View>
        <View style={styles.titleInfo}>
          <View onLayout={handleTitleBlockLayout}>
            <AppText variant="multiline" text={establishment.name} style={styles.name} />
            <View style={styles.locationRow}>
              <Ionicons name="location" size={11} color={Colors.green} style={styles.locationIcon} />
              <AppText variant="marquee" text={location} style={styles.location} containerStyle={styles.locationContainer} />
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
        <Button label="Add Report" icon="add" variant="primary" size="md" onPress={onAddReport} fullWidth />
        {/* Same variant as the Edit beside a section header — it's the same
            action, so it gets the same button. Only one filled `primary`
            button belongs on a screen (this card's Add Report is it), so
            this stays `sm` `outline` like every other section-header
            action. */}
        {onEdit && <Button label="Edit" icon="pencil" variant="outline" size="sm" onPress={onEdit} />}
      </View>

      <View style={styles.divider} />

      <View style={styles.statGrid}>
        <View style={styles.statRow}>
          <StatChip label="Nature" value={establishment.natureOfBusiness || '—'} marquee />
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
    // Radius.lg + Elevation.raised match Card.tsx / EstablishmentCard.tsx's
    // "card" surface convention rather than this card's old bespoke
    // shadow/elevation pairing.
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Elevation.raised,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    // Matches ReportListCard/EstablishmentCard's icon-to-content gap.
    gap: Spacing.md,
  },
  topRowMeasuring: {
    opacity: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  // Page-level heading, not a list-row name — sized like the other
  // sheet/section headers in this feature (ReportFilterSheet's sheetTitle,
  // ManageEstablishmentsTab's sheetTitle), not EstablishmentCard's smaller
  // list-row "name".
  name: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height instead of its full line-height box.
  locationIcon: {
    marginTop: 2,
  },
  // Matches EstablishmentCard's "location" text token choice.
  location: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
  },
  locationContainer: {
    flex: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // Matches ReportListCard/EstablishmentCard's "Pending sync" text token.
  syncText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.pending,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  statGrid: {
    gap: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  // Was 7.5 — below the 11px legibility floor. Raised to Type.caption, the
  // scale's floor.
  statLabel: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  // Was 10.5 — below the 11px legibility floor. Raised to Type.caption.
  statValue: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xxs,
  },
  inspectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    // Icon-to-text gap.
    gap: Spacing.xs,
    backgroundColor: Colors.survey.bg,
    borderWidth: 1,
    borderColor: Colors.survey.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  // Was 10 — below the 11px legibility floor. Raised to Type.caption.
  inspectorText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.survey.badgeText,
  },
  inspectorName: {
    fontWeight: '700',
  },
});
