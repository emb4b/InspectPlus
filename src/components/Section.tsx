import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../design/colors';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

interface SectionProps {
  title: string;
  // Trailing slot for a count, a "select all" action, or similar.
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Section: React.FC<SectionProps> = ({ title, right, children, style }) => (
  <View style={style}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
});
