import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { getReportUrgency } from '../../../utils/reportUrgency';
import type { AllReportItem } from '../hooks/useEstablishment';

interface ReportListCardProps {
  item: AllReportItem;
  onPress: (item: AllReportItem) => void;
}

const REPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  air_monitoring: 'partly-sunny-outline',
  water_monitoring: 'water-outline',
  hazardous_waste: 'warning-outline',
  eia: 'globe-outline',
  survey: 'leaf-outline',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ReportListCard: React.FC<ReportListCardProps> = ({ item, onPress }) => {
  const isSubmitted = item.status === 'submitted';
  const urgency = getReportUrgency(item.date, item.status);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        urgency === 'overdue' && styles.cardOverdue,
        urgency === 'due-soon' && styles.cardDueSoon,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Ionicons name={REPORT_ICONS[item.reportType] ?? 'document-outline'} size={17} color={Colors.water.text} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {item.status && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isSubmitted ? Colors.greenMuted : Colors.warning.badgeBg },
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isSubmitted ? Colors.green : Colors.warning.text },
                ]}>
                {isSubmitted ? 'Submitted' : 'Draft'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={10} color={Colors.textMuted} />
          <Text style={styles.estabName} numberOfLines={1}>{item.estabName}</Text>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
          <Text style={styles.date}>{formatDate(item.date)}</Text>
          {urgency !== 'none' && (
            <View
              style={[
                styles.urgencyBadge,
                { backgroundColor: urgency === 'overdue' ? Colors.hazwaste.badgeBg : Colors.warning.badgeBg },
              ]}>
              <Ionicons
                name="alert-circle"
                size={9}
                color={urgency === 'overdue' ? Colors.hazwaste.badgeText : Colors.warning.text}
              />
              <Text
                style={[
                  styles.urgencyBadgeText,
                  { color: urgency === 'overdue' ? Colors.hazwaste.badgeText : Colors.warning.text },
                ]}>
                {urgency === 'overdue' ? 'Overdue' : 'Due soon'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.controlNo}>{item.controlNo || 'No control number yet'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardDueSoon: {
    borderColor: Colors.warning.border,
    backgroundColor: Colors.warning.bg,
  },
  cardOverdue: {
    borderColor: Colors.hazwaste.border,
    backgroundColor: Colors.hazwaste.bg,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.water.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  estabName: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  date: {
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 20,
    marginLeft: 4,
  },
  urgencyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  controlNo: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
