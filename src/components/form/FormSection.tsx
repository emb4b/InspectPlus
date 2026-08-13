import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface FormSectionProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ icon, title, headerRight, children }) => (
  <View style={styles.section}>
    <View style={styles.titleRow}>
      <View style={styles.titleLeft}>
        {icon && <Ionicons name={icon} size={16} color={Colors.navy} />}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {headerRight}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
    paddingBottom: 8,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    flexShrink: 1,
  },
});
