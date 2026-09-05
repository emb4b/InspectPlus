import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';
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
    // Bare 28 sat off the 4dp rhythm, equidistant between xl (24) and xxl
    // (32); resolved up to xxl since this is the block-separating margin
    // between one whole form section and the next - the biggest
    // block-separator role in this file, so it takes the larger candidate,
    // same tie-break direction as ChecklistTable's own bare-10 `wrap`.
    marginBottom: Spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Bare 7 sat off the 4dp rhythm, nearer to sm (8) than xs (4).
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    // Same bare-7 resolution as titleRow above - this is the icon-to-title
    // gap, but 7 is decisively nearer sm (8) than xs (4), not a tie, so the
    // icon/text convention doesn't override it.
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
  },
  titleContainer: {
    flexShrink: 1,
  },
});
