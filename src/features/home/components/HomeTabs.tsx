import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';

export type HomeTab = 'manageReports' | 'manageEstablishments' | 'exportReports';

interface HomeTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  // The pager's position as a fractional page index (0 = first tab, 1.5 =
  // halfway between the second and third). The underline is driven from
  // this rather than from activeTab so it tracks the finger mid-swipe and
  // glides when a tap scrolls the pager, instead of jumping when the page
  // finally settles.
  position: SharedValue<number>;
}

// Creating a report is no longer a tab — it lives in the speed dial FAB, so
// it's reachable from the establishment screens too rather than only from
// here. Manage Reports leads because it's where an inspector's own work is.
const TABS: { key: HomeTab; label: string }[] = [
  { key: 'manageReports', label: 'Manage Reports' },
  { key: 'manageEstablishments', label: 'Manage Establishments' },
  { key: 'exportReports', label: 'Export Inspection Reports' },
];

// The pager's page order — HomeScreen lays its pages out in this sequence,
// so a page index and a tab key convert through this one list.
export const HOME_TAB_ORDER: readonly HomeTab[] = TABS.map(t => t.key);

export const HomeTabs: React.FC<HomeTabsProps> = ({ activeTab, onTabChange, position }) => {
  // Measured once; every tab is flex: 1, so a third of the row is a tab.
  const [tabWidth, setTabWidth] = useState(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setTabWidth(e.nativeEvent.layout.width / TABS.length);
  }, []);

  // Only a transform animates, so the row never re-lays-out per frame;
  // width is static once measured.
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * tabWidth }],
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
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
          </TouchableOpacity>
        );
      })}
      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.underline, { width: tabWidth - Spacing.sm * 2 }, underlineStyle]}
        />
      )}
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
    justifyContent: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  // bodySm rather than label: these sit directly above bodySm/subheading
  // content and used to read a step lighter than everything around them.
  label: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    textAlign: 'center',
  },
  // Green, matching the inspection form's own tabs (TwoRowTabs) and the
  // header lockup — the purple that used to sit here was the only place in
  // the app that hue appeared.
  labelActive: {
    color: Colors.green,
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.sm,
    height: 2.5,
    backgroundColor: Colors.green,
    borderRadius: Radius.pill,
  },
});
