import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../../constants/colors';

export type HomeTab = 'create' | 'manageEstablishments' | 'manageReports' | 'export';

interface HomeTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}

const TABS: { key: HomeTab; label: string }[] = [
  { key: 'create', label: 'Create New Report' },
  { key: 'manageEstablishments', label: 'Manage\nEstablishments' },
  { key: 'manageReports', label: 'Manage Reports' },
  { key: 'export', label: 'Import/Export\nReports' },
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
            activeOpacity={0.7}>
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}>
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
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 4,
    position: 'relative',
  },
  label: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
    paddingBottom: 8,
  },
  labelActive: {
    color: '#5b4fcf',
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.textMuted,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2.5,
    backgroundColor: '#5b4fcf',
    borderRadius: 2,
  },
});
