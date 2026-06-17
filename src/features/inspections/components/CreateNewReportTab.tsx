import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { REPORT_TYPES } from '../../../constants/reportTypes';
import { ReportTypeCard } from './ReportTypeCard';

export const CreateNewReportTab: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>SELECT INSPECTION REPORT TYPE</Text>
      <View style={styles.grid}>
        {REPORT_TYPES.map(item => (
          <View key={item.key} style={styles.gridItem}>
            <ReportTypeCard item={item} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginBottom: 14,
    fontFamily: 'monospace',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
  },
});
