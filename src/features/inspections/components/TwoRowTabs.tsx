import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';

export interface TwoRowSubTabDef {
  key: string;
  marker: string;
  label: string;
}

export interface TwoRowMainTabDef {
  key: string;
  number: string;
  label: string;
  subTabs?: TwoRowSubTabDef[];
}

interface TwoRowTabsProps {
  tabs: TwoRowMainTabDef[];
  activeMain: string;
  onMainChange: (key: string) => void;
}

// Notebook/property-sheet style menu for the report's main sections only
// (the numbers aren't shown, just the label). Tabs sit edge to edge with
// their borders collapsed like real ruled paper tabs; the active tab drops
// its bottom border and picks up a colored top edge so it reads as
// "attached" to the page below it, while resting tabs stay muted behind it.
//
// Subsections (A-E, I-V) are not separate tabs; each subsection's own
// FormSection title carries its marker prefix (e.g. "A. Water Sources")
// instead, so there's a single uniform heading per subsection.
//
// More than 4 main tabs wrap onto a second row (rather than always using
// two), so the 3-tab menu other report kinds still use keeps its original
// single-row look.
export const TwoRowTabs: React.FC<TwoRowTabsProps> = ({ tabs, activeMain, onMainChange }) => {
  const numRows = tabs.length > 4 ? 2 : 1;
  const rowSize = Math.ceil(tabs.length / numRows);
  const rows: TwoRowMainTabDef[][] = [];
  for (let i = 0; i < tabs.length; i += rowSize) {
    rows.push(tabs.slice(i, i + rowSize));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, rowIndex > 0 && styles.rowCollapsed]}>
          {row.map((tab, tabIndex) => {
            const isActive = tab.key === activeMain;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  tabIndex > 0 && styles.tabCollapsed,
                  isActive && styles.tabActive,
                ]}
                activeOpacity={0.7}
                onPress={() => onMainChange(tab.key)}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={2}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
  },
  // Collapses the horizontal border seam between row 1 and row 2, same
  // trick as the left/right seam between adjacent tabs below.
  rowCollapsed: {
    marginTop: -1,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 7,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  tabCollapsed: {
    marginLeft: -1,
  },
  tabActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderTopWidth: 3,
    borderTopColor: Colors.green,
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Colors.green,
    fontWeight: '700',
  },
});
