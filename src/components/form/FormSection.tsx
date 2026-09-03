import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AppText } from '../AppText';

interface FormSectionProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

// Titles wrap rather than clip or scroll. Several of these are regulatory
// names that can't be paraphrased ("DENR Permits, Licenses & Clearances",
// "Compliance Checklists — DAO 2013-22"), and a headerRight button squeezes
// the longest ones — so an ellipsis loses the part that identifies which
// regulation the section is about. A marquee showed them in full but read as
// restless next to a static button, and only one section ever had it, so the
// same kind of heading truncated two different ways.
export const FormSection: React.FC<FormSectionProps> = ({ icon, title, headerRight, children }) => (
  <View style={styles.section}>
    <View style={styles.titleRow}>
      <View style={styles.titleLeft}>
        {icon && <Ionicons name={icon} size={16} color={Colors.navy} />}
        <AppText variant="multiline" text={title} style={styles.title} containerStyle={styles.titleContainer} />
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
  },
  titleContainer: {
    flexShrink: 1,
  },
});
