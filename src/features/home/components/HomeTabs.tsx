import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';

export type HomeTab = 'manageReports' | 'manageEstablishments' | 'exportReports';

interface HomeTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}

// Creating a report is no longer a tab — it lives in the speed dial FAB, so
// it's reachable from the establishment screens too rather than only from
// here. Manage Reports leads because it's where an inspector's own work is.
const TABS: { key: HomeTab; label: string }[] = [
  { key: 'manageReports', label: 'Manage Reports' },
  { key: 'manageEstablishments', label: 'Manage\nEstablishments' },
  { key: 'exportReports', label: 'Export Inspection\nReports' },
];

export const HomeTabs: React.FC<HomeTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}>
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
    position: 'relative',
  },
  label: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '500',
    textAlign: 'center',
    paddingBottom: Spacing.sm,
  },
  labelActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.textMuted,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.sm,
    right: Spacing.sm,
    height: 2.5,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
  },
});
