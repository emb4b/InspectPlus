import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import type { EstablishmentReportItem } from '../hooks/useEstablishment';

interface EstablishmentReportsSectionProps {
  reports: EstablishmentReportItem[];
  loading?: boolean;
  onAddReport: () => void;
  onOpenReport: (item: EstablishmentReportItem) => void;
  onDeleteReport: (item: EstablishmentReportItem) => void;
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

const ReportRow: React.FC<{
  item: EstablishmentReportItem;
  onOpen: () => void;
  onDelete: () => void;
}> = ({ item, onOpen, onDelete }) => (
  <TouchableOpacity style={styles.row} onPress={onOpen} activeOpacity={0.75}>
    <View style={styles.iconWrap}>
      <Ionicons name={REPORT_ICONS[item.reportType] ?? 'document-outline'} size={17} color={Colors.water.text} />
    </View>
    <View style={styles.content}>
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
        <Text style={styles.date}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.controlNo}>{item.controlNo || 'No control number yet'}</Text>
    </View>
    <View style={styles.actions}>
      <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.75}>
        <Ionicons name="trash-outline" size={12} color={Colors.textWhite} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

export const EstablishmentReportsSection: React.FC<EstablishmentReportsSectionProps> = ({
  reports,
  loading,
  onAddReport,
  onOpenReport,
  onDeleteReport,
}) => (
  <View style={styles.section}>
    <View style={styles.headerRow}>
      <View style={styles.headerTitleRow}>
        <Ionicons name="document-text-outline" size={16} color={Colors.navy} />
        <Text style={styles.headerTitle}>Inspection Reports</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={onAddReport} activeOpacity={0.8}>
        <Ionicons name="add" size={13} color={Colors.textWhite} />
        <Text style={styles.addBtnText}>Add Report</Text>
      </TouchableOpacity>
    </View>

    {loading ? (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" color={Colors.navy} />
      </View>
    ) : reports.length === 0 ? (
      <View style={styles.emptyState}>
        <Ionicons name="document-outline" size={32} color={Colors.border} />
        <Text style={styles.emptyText}>No reports filed yet for this establishment.</Text>
      </View>
    ) : (
      reports.map(item => (
        <ReportRow
          key={item.key}
          item={item}
          onOpen={() => onOpenReport(item)}
          onDelete={() => onDeleteReport(item)}
        />
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: Colors.navy,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  row: {
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
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
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
  controlNo: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
