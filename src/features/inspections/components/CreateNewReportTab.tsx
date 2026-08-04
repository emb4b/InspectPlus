import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { REPORT_TYPES } from '../../../constants/reportTypes';
import { ReportTypeCard } from './ReportTypeCard';

const COLUMNS = 2;

// Chunked into fixed-size rows (rather than a wrapping flex grid) so each
// row can be given equal flex and stretch to fill whatever vertical space
// the tab has, instead of the cards sizing to their content and leaving
// dead space below.
const ROWS = Array.from({ length: Math.ceil(REPORT_TYPES.length / COLUMNS) }, (_, i) =>
  REPORT_TYPES.slice(i * COLUMNS, i * COLUMNS + COLUMNS),
);

export const CreateNewReportTab: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>SELECT INSPECTION REPORT TYPE</Text>
      <View style={styles.grid}>
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(item => (
              <View key={item.key} style={styles.gridItem}>
                <ReportTypeCard item={item} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    flexDirection: 'column',
    gap: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  gridItem: {
    flex: 1,
  },
});
